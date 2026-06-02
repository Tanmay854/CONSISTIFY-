import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "anon_viewer_id";

function getAnonViewerId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable — fall back to a per-session id (won't dedupe across reloads)
    return crypto.randomUUID();
  }
}

// Per-tab in-memory cache to skip network calls for already-tracked items
const tracked = new Set<string>();

export async function trackView(
  contentType: "reel" | "music" | "quote",
  contentId: string
) {
  const cacheKey = `${contentType}:${contentId}`;
  if (tracked.has(cacheKey)) return;
  tracked.add(cacheKey);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const viewer_id = user?.id ?? getAnonViewerId();
    await supabase
      .from("content_views")
      .upsert(
        { content_type: contentType, content_id: contentId, viewer_id },
        { onConflict: "content_type,content_id,viewer_id", ignoreDuplicates: true }
      );
  } catch {
    // best-effort
  }
}
