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
const HOME_CACHE_KEY = "home_v3";

const CATEGORIES: { id: string; title: string; query: string }[] = [
  { id: "motivational", title: "Motivational Workout", query: "motivational workout" },
  { id: "focus", title: "Focus & Study", query: "focus study music" },
  { id: "morning", title: "Morning Energy", query: "morning energy" },
  { id: "gym", title: "Gym Workout", query: "gym workout" },
  { id: "meditation", title: "Meditation & Calm", query: "meditation calm" },
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
  const [newReleasesRes, artistsRes] = await Promise.all([
    sp(`/search?q=${encodeURIComponent(`year:${year}`)}&type=album&limit=50&market=US`, token),
    sp(`/search?q=${encodeURIComponent("genre:pop")}&type=artist&limit=50&market=US`, token),
  ]);
  return {
    categories: catResults,
    newReleases: (newReleasesRes?.albums?.items || []).filter(Boolean).map(mapAlbum),
    recommendedArtists: (artistsRes?.artists?.items || [])
      .filter((a: any) => a && a.images?.length).map(mapArtist),
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

    // action: home — DB-backed 1h cache + in-memory cache
    if (memCache && Date.now() - memCache.at < CACHE_TTL_MS) {
      return new Response(JSON.stringify(memCache.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-cache": "mem" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: row } = await admin.from("music_cache").select("payload, updated_at").eq("key", HOME_CACHE_KEY).maybeSingle();
    if (row && Date.now() - new Date(row.updated_at).getTime() < CACHE_TTL_MS) {
      memCache = { payload: row.payload, at: new Date(row.updated_at).getTime() };
      return new Response(JSON.stringify(row.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-cache": "db" },
      });
    }

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
