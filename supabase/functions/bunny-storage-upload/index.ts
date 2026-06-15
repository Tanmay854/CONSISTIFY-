// Uploads a file (audio or image) to Bunny Storage and returns the public CDN URL.
// Client sends multipart/form-data with field "file" and optional "kind" (audio|image).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cleanHost = (value: string) => value.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const zone = Deno.env.get("BUNNY_STORAGE_ZONE_NAME");
    const password = Deno.env.get("BUNNY_STORAGE_PASSWORD");
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

    // Optional regional endpoint, e.g. "ny", "la", "sg", "se", "br", "jh", "syd"
    // Leave BUNNY_STORAGE_REGION unset for the default Falkenstein (DE) region.
    const region = (Deno.env.get("BUNNY_STORAGE_REGION") || "").trim().toLowerCase();
    const host = region ? `${region}.storage.bunnycdn.com` : `storage.bunnycdn.com`;
    const putUrl = `https://${host}/${zone}/${path}`;
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        AccessKey: password,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file.stream(),
    });

    if (!putRes.ok) {
      const t = await putRes.text();
      return new Response(JSON.stringify({ error: "Bunny upload failed", detail: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cdnUrl = `https://${cdnHost}/${path}`;
    return new Response(JSON.stringify({ url: cdnUrl, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
