// Serve resized/compressed cover images via Supabase Storage's image
// transformation endpoint instead of the raw full-resolution originals.
// Falls back to the original URL for non-Supabase-storage sources.
export const getCoverUrl = (url: string | null | undefined, width: number, quality = 72): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed.includes("/storage/v1/object/public/")) return trimmed;
  const rendered = trimmed.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const sep = rendered.includes("?") ? "&" : "?";
  return `${rendered}${sep}width=${width}&quality=${quality}&resize=contain`;
};

export const THUMB_WIDTH = 300;
export const DETAIL_WIDTH = 800;
