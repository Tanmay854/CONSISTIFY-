import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Server configuration missing" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id).in("role", ["admin", "super_admin"]);
    if (!roles?.length) return json({ error: "Forbidden" }, 403);

    const { data: removed, error: removedError } = await admin
      .from("removed_staff_accounts")
      .select("id, old_user_id, email, former_role, removed_at, removed_by")
      .order("removed_at", { ascending: false });
    if (removedError) return json({ error: removedError.message }, 500);

    const oldUserIds = (removed ?? []).map((row) => row.old_user_id);
    const { data: heldVideos, error: videosError } = oldUserIds.length
      ? await admin
          .from("reels")
          .select("id, public_id, title, feed, thumbnail_url, thumbnail_portrait_url, thumbnail_landscape_url, uploaded_by, held_at")
          .in("uploaded_by", oldUserIds)
          .eq("is_on_hold", true)
          .in("feed", ["long_game", "calm_state", "quick_spark"])
          .order("held_at", { ascending: false })
      : { data: [], error: null };
    if (videosError) return json({ error: videosError.message }, 500);

    const videosByUser = new Map<string, typeof heldVideos>();
    for (const video of heldVideos ?? []) {
      if (!video.uploaded_by) continue;
      const list = videosByUser.get(video.uploaded_by) ?? [];
      list.push(video);
      videosByUser.set(video.uploaded_by, list);
    }

    return json({
      removed_users: (removed ?? []).map((row) => ({
        ...row,
        videos: videosByUser.get(row.old_user_id) ?? [],
      })),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});