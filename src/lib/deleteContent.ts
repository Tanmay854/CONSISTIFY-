// Single helper to delete a content row + its remote file (Bunny Stream / Storage / Supabase Storage).
import { supabase } from "@/integrations/supabase/client";

type Table = "reels" | "music" | "quotes";

const isBunnyStream = (url: string) => /\.b-cdn\.net\/[0-9a-f-]{36}\/playlist\.m3u8/i.test(url);
const isYoutube = (url: string) => /youtube\.com|youtu\.be/.test(url);

const supabaseStoragePath = (url: string, bucket: string): string | null => {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
};

export async function deleteContent(
  table: Table,
  id: string,
  fileUrl: string | null,
  bucket: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (fileUrl) {
      if (table === "reels" && isBunnyStream(fileUrl)) {
        // Bunny Stream video — DELETE via edge function (server holds Stream API key).
        await supabase.functions.invoke("bunny-delete-video", { body: { videoUrl: fileUrl } });
      } else if (!isYoutube(fileUrl) && fileUrl.includes(".b-cdn.net/")) {
        // Bunny Storage file (audio / image).
        await supabase.functions.invoke("bunny-storage-delete", { body: { fileUrl } });
      } else if (bucket) {
        // Legacy Supabase Storage file.
        const path = supabaseStoragePath(fileUrl, bucket);
        if (path) await supabase.storage.from(bucket).remove([path]);
      }
    }
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
