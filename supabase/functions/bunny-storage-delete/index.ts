// Deletes a file from Bunny Storage. Requires admin or uploader role.
// Body: { fileUrl: string } — the CDN URL stored in audio_url / image_url.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const zone = Deno.env.get("BUNNY_STORAGE_ZONE_NAME");
    const password = Deno.env.get("BUNNY_STORAGE_PASSWORD");
    const cdnHost = Deno.env.get("BUNNY_STORAGE_CDN_HOSTNAME");
    if (!zone || !password || !cdnHost) {
      return new Response(JSON.stringify({ error: "Bunny Storage not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "uploader");
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { fileUrl } = await req.json().catch(() => ({}));
    if (typeof fileUrl !== "string" || !fileUrl) {
      return new Response(JSON.stringify({ error: "fileUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Only delete files on our own Bunny Storage CDN — skip Supabase storage / external URLs.
    const marker = `${cdnHost}/`;
    const idx = fileUrl.indexOf(marker);
    if (idx < 0) {
      return new Response(JSON.stringify({ skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const path = fileUrl.slice(idx + marker.length).split("?")[0];

    const region = (Deno.env.get("BUNNY_STORAGE_REGION") || "").trim().toLowerCase();
    const host = region ? `${region}.storage.bunnycdn.com` : `storage.bunnycdn.com`;
    const delRes = await fetch(`https://${host}/${zone}/${path}`, {
      method: "DELETE",
      headers: { AccessKey: password },
    });
    if (!delRes.ok && delRes.status !== 404) {
      const t = await delRes.text();
      return new Response(JSON.stringify({ error: "Bunny storage delete failed", detail: t }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ deleted: true, path }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
