// Deletes a video from Bunny Stream. Requires admin or uploader role.
// Body: { videoUrl: string }  — the HLS playback URL stored in reels.video_url
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pull the Bunny Stream GUID out of HLS, player, or embed URLs.
function extractGuid(url: string): string | null {
  const m = url.match(/(?:b-cdn\.net|mediadelivery\.net)\/(?:embed\/\d+\/|play\/\d+\/)?([0-9a-fA-F-]{36})(?:\/|$)/);
  return m ? m[1] : null;
}

const cleanId = (value: unknown): string | null => {
  const text = typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
  return text && /^[0-9]+$/.test(text) ? text : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("BUNNY_STREAM_API_KEY");
    const defaultLibraryId = (Deno.env.get("BUNNY_STREAM_LIBRARY_ID") || "").replace(/\D/g, "");
    if (!apiKey || !defaultLibraryId) {
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
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    const isUploader = (roles || []).some((r: any) => r.role === "uploader");
    if (!isAdmin && !isUploader) return new Response(JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { videoUrl, videoGuid, libraryId } = await req.json().catch(() => ({}));
    if ((!videoGuid || typeof videoGuid !== "string") && (typeof videoUrl !== "string" || !videoUrl)) {
      return new Response(JSON.stringify({ error: "videoGuid or videoUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const guid = typeof videoGuid === "string" && /^[0-9a-fA-F-]{36}$/.test(videoGuid.trim())
      ? videoGuid.trim()
      : extractGuid(videoUrl);
    if (!guid) {
      // Not a Bunny Stream URL (e.g. YouTube embed) — nothing to delete in Bunny.
      return new Response(JSON.stringify({ skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ownership check: non-admin uploaders may only delete videos they own.
    if (!isAdmin) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: ownerRows } = await admin
        .from("reels")
        .select("uploaded_by, video_url")
        .or(`video_url.ilike.%${guid}%${typeof videoUrl === "string" && videoUrl ? `,video_url.eq.${videoUrl}` : ""}`)
        .limit(5);
      const matches = (ownerRows || []).filter((r: any) =>
        (typeof r.video_url === "string" && r.video_url.includes(guid))
      );
      if (matches.length === 0) {
        return new Response(JSON.stringify({ error: "Not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!matches.every((r: any) => r.uploaded_by === user.id)) {
        return new Response(JSON.stringify({ error: "Forbidden — not the owner" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const resolvedLibraryId = cleanId(libraryId) || defaultLibraryId;

    const delRes = await fetch(
      `https://video.bunnycdn.com/library/${resolvedLibraryId}/videos/${guid}`,
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
