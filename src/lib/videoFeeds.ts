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

// Feeds that videos can be uploaded into.
export const UPLOAD_FEEDS = VIDEO_FEEDS.filter((f) => f.kind !== "quotes");

// Feeds shown on the Home landing screen (Daily Quotes lives in the Quotes tab).
export const HOME_FEEDS = VIDEO_FEEDS.filter((f) => f.id === "long_game" || f.id === "quick_spark");


export const feedLabel = (id: string) =>
  VIDEO_FEEDS.find((f) => f.id === id)?.label ?? "Quick Clips";


// Turn a Bunny Stream URL into a playable HLS manifest URL.
export const getPlayableVideoUrl = (url: string): string => {
  const trimmed = (url || "").trim();
  const streamCdn = trimmed.match(/^(https?:\/\/[^/]+\.b-cdn\.net)\/([0-9a-fA-F-]{36})(?:\/|$)/);
  if (streamCdn) return `${streamCdn[1]}/${streamCdn[2]}/playlist.m3u8`;
  const md = trimmed.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-fA-F-]{36})/i);
  if (md) return `https://vz-${md[1]}.b-cdn.net/${md[2]}/playlist.m3u8`;
  return trimmed;
};
