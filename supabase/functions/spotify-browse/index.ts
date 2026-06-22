// Spotify catalog browser with 60-minute DB cache.
// Actions:
//   home   -> 5 motivational category buckets + recommended artists + new releases
//   search -> live catalog search (tracks + artists)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const HOME_CACHE_KEY = "home_v6";

const CATEGORIES: { id: string; title: string; query: string }[] = [
  { id: "motivational", title: "Motivational Workout", query: "motivational workout" },
  { id: "focus", title: "Focus & Study", query: "focus study music" },
  { id: "morning", title: "Morning Energy", query: "morning energy" },
  { id: "gym", title: "Gym Workout", query: "gym workout" },
  { id: "meditation", title: "Meditation & Calm", query: "meditation calm" },
  { id: "hiphop", title: "Hip-Hop Hits", query: "hip hop hits" },
  { id: "running", title: "Running Beats", query: "running beats" },
  { id: "chill", title: "Chill Vibes", query: "chill vibes" },
  { id: "discipline", title: "Discipline & Grind", query: "discipline grind motivation" },
  { id: "epic", title: "Epic Cinematic", query: "epic cinematic motivation" },
];

let cachedToken: { token: string; expiresAt: number } | null = null;
let memCache: { payload: unknown; at: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.token;
}

async function sp(path: string, token: string): Promise<any | null> {
  const r = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    console.warn(`Spotify ${path} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
    return null;
  }
  return await r.json();
}

const mapTrack = (t: any) => ({
  id: t.id,
  name: t.name,
  artist: t.artists?.map((a: any) => a.name).join(", ") || "",
  duration_ms: t.duration_ms,
  image: t.album?.images?.[0]?.url || null,
  uri: t.uri,
});
const mapArtist = (a: any) => ({ id: a.id, name: a.name, image: a.images?.[0]?.url || null, uri: a.uri });
const mapAlbum = (a: any) => ({
  id: a.id, name: a.name,
  artist: a.artists?.map((x: any) => x.name).join(", ") || "",
  image: a.images?.[0]?.url || null,
  uri: a.uri,
});

async function buildHome(token: string) {
  const year = new Date().getFullYear();
  const catResults = await Promise.all(
    CATEGORIES.map((c) =>
      sp(`/search?q=${encodeURIComponent(c.query)}&type=track&limit=50&market=US`, token).then((d) => ({
        id: c.id, title: c.title,
        tracks: (d?.tracks?.items || []).filter(Boolean).map(mapTrack),
      })),
    ),
  );
  const [newReleasesA, newReleasesB, artistsPop, artistsHipHop, artistsRock] = await Promise.all([
    sp(`/search?q=${encodeURIComponent(`year:${year}`)}&type=album&limit=50&market=US`, token),
    sp(`/search?q=${encodeURIComponent(`year:${year - 1}`)}&type=album&limit=50&market=US`, token),
    sp(`/search?q=${encodeURIComponent("genre:pop")}&type=artist&limit=50&market=US`, token),
    sp(`/search?q=${encodeURIComponent("genre:hip-hop")}&type=artist&limit=50&market=US`, token),
    sp(`/search?q=${encodeURIComponent("genre:rock")}&type=artist&limit=50&market=US`, token),
  ]);
  const allAlbums = [
    ...(newReleasesA?.albums?.items || []),
    ...(newReleasesB?.albums?.items || []),
  ].filter(Boolean);
  const seenAlbums = new Set<string>();
  const newReleases = allAlbums.filter((a: any) => {
    if (!a?.id || seenAlbums.has(a.id)) return false;
    seenAlbums.add(a.id); return true;
  }).map(mapAlbum);

  const allArtists = [
    ...(artistsPop?.artists?.items || []),
    ...(artistsHipHop?.artists?.items || []),
    ...(artistsRock?.artists?.items || []),
  ].filter((a: any) => a && a.images?.length);
  const seenArtists = new Set<string>();
  const recommendedArtists = allArtists.filter((a: any) => {
    if (seenArtists.has(a.id)) return false;
    seenArtists.add(a.id); return true;
  }).map(mapArtist);

  return {
    categories: catResults,
    newReleases,
    recommendedArtists,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: "Spotify credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "home";

    if (action === "search") {
      const q = url.searchParams.get("q")?.trim();
      if (!q) {
        return new Response(JSON.stringify({ tracks: [], artists: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = await getToken();
      const data = await sp(
        `/search?q=${encodeURIComponent(q)}&type=track,artist&limit=10&market=US`, token,
      );
      return new Response(
        JSON.stringify({
          tracks: (data?.tracks?.items || []).filter(Boolean).map(mapTrack),
          artists: (data?.artists?.items || []).filter(Boolean).map(mapArtist),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // action: home — stale-while-revalidate so users never wait on Spotify.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const refresh = async () => {
      try {
        const token = await getToken();
        const payload = await buildHome(token);
        memCache = { payload, at: Date.now() };
        await admin.from("music_cache").upsert({ key: HOME_CACHE_KEY, payload, updated_at: new Date().toISOString() });
      } catch (e) {
        console.error("background refresh failed", e);
      }
    };

    // Fast path: in-memory cache (fresh)
    if (memCache && Date.now() - memCache.at < CACHE_TTL_MS) {
      return new Response(JSON.stringify(memCache.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-cache": "mem" },
      });
    }

    const { data: row } = await admin.from("music_cache").select("payload, updated_at").eq("key", HOME_CACHE_KEY).maybeSingle();
    if (row) {
      const ageMs = Date.now() - new Date(row.updated_at).getTime();
      memCache = { payload: row.payload, at: new Date(row.updated_at).getTime() };
      // Serve cached payload immediately; refresh in background if stale.
      if (ageMs >= CACHE_TTL_MS) {
        // @ts-ignore EdgeRuntime is available on Supabase edge runtime
        try { EdgeRuntime.waitUntil(refresh()); } catch { refresh(); }
      }
      return new Response(JSON.stringify(row.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-cache": ageMs >= CACHE_TTL_MS ? "stale" : "db" },
      });
    }

    // Cold cache: must build now
    const token = await getToken();
    const payload = await buildHome(token);
    memCache = { payload, at: Date.now() };
    await admin.from("music_cache").upsert({ key: HOME_CACHE_KEY, payload, updated_at: new Date().toISOString() });
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-cache": "miss" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
