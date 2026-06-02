import { supabase } from "@/integrations/supabase/client";

export async function trackView(
  contentType: "reel" | "music" | "quote",
  contentId: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const viewer_id = user?.id ?? null;
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
