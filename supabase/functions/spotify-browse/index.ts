// Spotify catalog fetcher (Client Credentials flow).
// Returns a list of tracks for a given mood category.
// Tracks are played in the client via Spotify Embed iframe or Web Playback SDK,
// so streams count on Spotify and royalties flow to rights holders.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");

// Mood → Spotify search seed (works for all apps, no deprecated endpoints)
const CATEGORY_QUERY: Record<string, string> = {
  All: "motivation",
  Focus: "focus deep work",
  Workout: "workout hype",
  Morning: "morning energy",
  Meditation: "meditation calm",
};

let cachedToken: { value: string; exp: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.value;
  const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cachedToken = { value: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("Spotify credentials not configured");

    const url = new URL(req.url);
    const category = url.searchParams.get("category") ?? "All";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30"), 50);

    const q = CATEGORY_QUERY[category] ?? CATEGORY_QUERY.All;
    const token = await getAppToken();

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}&market=US`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (searchRes.status === 403) {
      // Spotify blocks Client Credentials for apps whose owner account is not Premium
      // (enforced on newly-created Developer apps since late 2024). Return a graceful
      // empty state with a notice so the UI doesn't blank-screen.
      return new Response(
        JSON.stringify({
          tracks: [],
          notice:
            "Spotify requires the Developer app owner to have an active Premium subscription before tracks can be fetched. Upgrade the owner account, then retry in a few hours.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!searchRes.ok) throw new Error(`Spotify search failed: ${searchRes.status} ${await searchRes.text()}`);
    const data = await searchRes.json();

    const tracks = (data.tracks?.items ?? []).map((t: any) => ({
      id: t.id,
      uri: t.uri,
      title: t.name,
      artist: t.artists?.map((a: any) => a.name).join(", ") ?? "",
      album: t.album?.name ?? "",
      image: t.album?.images?.[0]?.url ?? null,
      preview_url: t.preview_url,
      duration_ms: t.duration_ms,
      external_url: t.external_urls?.spotify,
    }));

    return new Response(JSON.stringify({ tracks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
