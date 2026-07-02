// Derive a still-frame thumbnail URL for a Bunny Stream video URL.
// Falls back to the video URL itself for non-Bunny sources (browser will render a poster from metadata).
export const getVideoThumbnail = (videoUrl: string): string | null => {
  if (!videoUrl) return null;
  const trimmed = videoUrl.trim();
  const streamCdn = trimmed.match(/^(https?:\/\/[^/]+\.b-cdn\.net)\/([0-9a-fA-F-]{36})(?:\/|$)/);
  if (streamCdn) return `${streamCdn[1]}/${streamCdn[2]}/thumbnail.jpg`;
  const md = trimmed.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-fA-F-]{36})/i);
  if (md) return `https://vz-${md[1]}.b-cdn.net/${md[2]}/thumbnail.jpg`;
  return null;
};
