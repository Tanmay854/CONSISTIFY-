// Uploads a file (audio or image) to Bunny Storage and returns the public CDN URL.
// Client sends multipart/form-data with field "file" and optional "kind" (audio|image).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cleanEnv = (value: string) => value.trim().replace(/^['"]|['"]$/g, "").trim();
const cleanHost = (value: string) => cleanEnv(value).replace(/^https?:\/\//i, "").replace(/\/+$/, "");
const cleanZone = (value: string) => cleanEnv(value)
  .replace(/^https?:\/\//i, "")
  .replace(/^(?:[a-z0-9-]+\.)?storage\.bunnycdn\.com\/?/i, "")
  .replace(/^\/+|\/+$/g, "")
  .split("/")[0];
const storageHosts = () => {
  const aliases: Record<string, string> = {
    de: "", germany: "", default: "", ny: "ny", newyork: "ny", "new-york": "ny",
    la: "la", losangeles: "la", "los-angeles": "la", sg: "sg", singapore: "sg",
    se: "se", stockholm: "se", br: "br", brazil: "br", jh: "jh", johannesburg: "jh",
    syd: "syd", sydney: "syd",
  };
  const rawRegion = cleanEnv(Deno.env.get("BUNNY_STORAGE_REGION") || "").toLowerCase();
  const region = aliases[rawRegion] ?? rawRegion.replace(/[^a-z0-9-]/g, "");
  if (region) return [`${region}.storage.bunnycdn.com`];
  return ["storage.bunnycdn.com", "ny.storage.bunnycdn.com", "la.storage.bunnycdn.com", "sg.storage.bunnycdn.com", "se.storage.bunnycdn.com", "br.storage.bunnycdn.com", "jh.storage.bunnycdn.com", "syd.storage.bunnycdn.com"];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const zone = cleanZone(Deno.env.get("BUNNY_STORAGE_ZONE_NAME") || "");
    const password = cleanEnv(Deno.env.get("BUNNY_STORAGE_PASSWORD") || "");
    const cdnHost = cleanHost(Deno.env.get("BUNNY_STORAGE_CDN_HOSTNAME") || "");
    if (!zone || !password || !cdnHost) {
      return new Response(JSON.stringify({ error: "Bunny Storage not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "uploader");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const kind = (form.get("kind")?.toString() || "file").toLowerCase();
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Size limit safety: 200 MB
    if (file.size > 200 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 200 MB)" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const folder = kind === "audio" ? "audio" : kind === "image" ? "images" : "files";
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${folder}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const attempts: Array<{ host: string; status: number; detail: string }> = [];
    for (const host of storageHosts()) {
      const putRes = await fetch(`https://${host}/${zone}/${path}`, {
        method: "PUT",
        headers: {
          AccessKey: password,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file.stream(),
      });

      if (putRes.ok) {
        const cdnUrl = `https://${cdnHost}/${path}`;
        return new Response(JSON.stringify({ url: cdnUrl, path }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      attempts.push({ host, status: putRes.status, detail: (await putRes.text()).slice(0, 200) });
    }

    return new Response(JSON.stringify({
      error: "Bunny upload failed",
      detail: "Bunny Storage rejected the upload. Check that BUNNY_STORAGE_ZONE_NAME, BUNNY_STORAGE_PASSWORD, and BUNNY_STORAGE_REGION belong to the same Bunny Storage Zone.",
      attempts,
    }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
