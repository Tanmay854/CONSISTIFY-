export type FeedId = "long_game" | "quick_spark" | "calm_state" | "daily_quotes";

export interface FeedDef {
  id: FeedId;
  label: string;
  kind: "long" | "short" | "quotes";
  blurb: string;
}

// Order matters — this drives the order in the Home pill navigation.
export const VIDEO_FEEDS: FeedDef[] = [
  { id: "long_game", label: "Long Game", kind: "long", blurb: "Deep motivation sessions" },
  { id: "quick_spark", label: "Quick Clips", kind: "short", blurb: "Short hits of fire" },
  { id: "calm_state", label: "Calm State", kind: "long", blurb: "Slow down and reset" },
  { id: "daily_quotes", label: "Daily Quotes", kind: "quotes", blurb: "One wallpaper, endless words" },
];

// Long Game now aggregates every long-form video (legacy Calm State included).
export const LONG_GAME_FEEDS: FeedId[] = ["long_game", "calm_state"];

// Feeds that videos can be uploaded into (Calm State is legacy — no new uploads).
export const UPLOAD_FEEDS = VIDEO_FEEDS.filter((f) => f.id === "long_game" || f.id === "quick_spark");


// Feeds shown on the Home landing screen (Daily Quotes lives in the Quotes tab).
export const HOME_FEEDS = VIDEO_FEEDS.filter((f) => f.id === "long_game" || f.id === "quick_spark");


export const feedLabel = (id: string) =>
  VIDEO_FEEDS.find((f) => f.id === id)?.label ?? "Quick Clips";


/** `https://vz-123.b-cdn.net/<guid>` for any Bunny Stream URL, else null. */
export const getBunnyBase = (url: string): string | null => {
  const trimmed = (url || "").trim();
  const streamCdn = trimmed.match(/^(https?:\/\/[^/]+\.b-cdn\.net)\/([0-9a-fA-F-]{36})(?:\/|$)/);
  if (streamCdn) return `${streamCdn[1]}/${streamCdn[2]}`;
  const md = trimmed.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-fA-F-]{36})/i);
  if (md) return `https://vz-${md[1]}.b-cdn.net/${md[2]}`;
  return null;
};

// Turn a Bunny Stream URL into a playable HLS manifest URL.
export const getPlayableVideoUrl = (url: string): string => {
  const base = getBunnyBase(url);
  return base ? `${base}/playlist.m3u8` : (url || "").trim();
};

/**
 * Progressive MP4 renditions to fall back to when HLS playback is impossible —
 * older Android WebViews have no usable MSE, so hls.js cannot run there.
 */
export const getMp4Fallbacks = (url: string): string[] => {
  const base = getBunnyBase(url);
  if (!base) return [];
  return [`${base}/play_720p.mp4`, `${base}/play_480p.mp4`, `${base}/play_360p.mp4`, `${base}/original`];
};
