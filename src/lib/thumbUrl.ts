// Derive a still-frame thumbnail URL for a Bunny Stream video URL.
// Falls back to the video URL itself for non-Bunny sources (browser will render a poster from metadata).
const bunnyBase = (videoUrl: string): string | null => {
  const trimmed = videoUrl.trim();
  const streamCdn = trimmed.match(/^(https?:\/\/[^/]+\.b-cdn\.net)\/([0-9a-fA-F-]{36})(?:\/|$)/);
  if (streamCdn) return `${streamCdn[1]}/${streamCdn[2]}`;
  const md = trimmed.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-fA-F-]{36})/i);
  if (md) return `https://vz-${md[1]}.b-cdn.net/${md[2]}`;
  return null;
};

export const getVideoThumbnail = (videoUrl: string, customThumb?: string | null): string | null => {
  if (customThumb && customThumb.trim()) return customThumb.trim();
  if (!videoUrl) return null;
  const base = bunnyBase(videoUrl);
  return base ? `${base}/thumbnail.jpg` : null;
};

/**
 * Alternate still URLs, tried in order when the first image fails to decode.
 * Older Android WebViews occasionally drop the primary request, so a retry on
 * a second Bunny still keeps grids from rendering as black boxes.
 */
export const getVideoThumbnailFallbacks = (videoUrl: string): string[] => {
  const base = bunnyBase(videoUrl);
  if (!base) return [];
  return [`${base}/thumbnail.jpg`, `${base}/preview.webp`];
};
