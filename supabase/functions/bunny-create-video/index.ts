// Creates a Bunny Stream video object and returns a TUS upload signature.
// The signature lets the client upload the file directly to Bunny.net via tus-js-client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const cleanHost = (value: string) => value.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("BUNNY_STREAM_API_KEY");
    const libraryId = (Deno.env.get("BUNNY_STREAM_LIBRARY_ID") || "").replace(/\D/g, "");
    const cdnHost = cleanHost(Deno.env.get("BUNNY_STREAM_CDN_HOSTNAME") || "");
    if (!apiKey || !libraryId || !cdnHost) {
      return new Response(JSON.stringify({ error: "Bunny.net not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: require admin or uploader
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "uploader");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const title = (body.title || "Untitled").toString().slice(0, 200);

    // 1. Create the video object in Bunny Stream
    const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: "POST",
      headers: { AccessKey: apiKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!createRes.ok) {
      const t = await createRes.text();
      return new Response(JSON.stringify({ error: "Bunny create failed", detail: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const created = await createRes.json();
    const guid = created.guid;

    // 2. Build a TUS signature valid for 24h
    const expire = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    const signature = await sha256Hex(`${libraryId}${apiKey}${expire}${guid}`);

    const playbackUrl = `https://${cdnHost}/${guid}/playlist.m3u8`;
    const thumbnailUrl = `https://${cdnHost}/${guid}/thumbnail.jpg`;

    return new Response(JSON.stringify({
      guid,
      libraryId,
      expire,
      signature,
      tusEndpoint: "https://video.bunnycdn.com/tusupload",
      playbackUrl,
      thumbnailUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
