// Deletes a video from Bunny Stream. Requires admin or uploader role.
// Body: { videoUrl: string }  — the HLS playback URL stored in reels.video_url
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pull the Bunny Stream GUID out of an HLS URL like
// https://vz-xxxx.b-cdn.net/<guid>/playlist.m3u8
function extractGuid(url: string): string | null {
  const m = url.match(/b-cdn\.net\/([0-9a-fA-F-]{36})\//);
  return m ? m[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("BUNNY_STREAM_API_KEY");
    const libraryId = Deno.env.get("BUNNY_STREAM_LIBRARY_ID");
    if (!apiKey || !libraryId) {
      return new Response(JSON.stringify({ error: "Bunny.net not configured" }),
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

    const { videoUrl } = await req.json().catch(() => ({}));
    if (typeof videoUrl !== "string" || !videoUrl) {
      return new Response(JSON.stringify({ error: "videoUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const guid = extractGuid(videoUrl);
    if (!guid) {
      // Not a Bunny Stream URL (e.g. YouTube embed) — nothing to delete in Bunny.
      return new Response(JSON.stringify({ skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const delRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`,
      { method: "DELETE", headers: { AccessKey: apiKey, accept: "application/json" } },
    );
    // 200 = deleted, 404 = already gone (treat as success)
    if (!delRes.ok && delRes.status !== 404) {
      const t = await delRes.text();
      return new Response(JSON.stringify({ error: "Bunny delete failed", detail: t }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ deleted: true, guid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
