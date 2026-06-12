// Spotify catalog browser using Client Credentials flow.
// Actions: "home" (featured playlists + new releases + recommended artists + top charts)
// and "search" (query Spotify catalog).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

let cachedToken: { token: string; expiresAt: number } | null = null;

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
    console.warn(`Spotify ${path} -> ${r.status}`);
    return null;
  }
  return await r.json();
}

// Well-known artist IDs as a stable "recommended" set (avoids deprecated related-artists endpoint).
const RECOMMENDED_ARTIST_IDS = [
  "06HL4z0CvFAxyc27GXpf02", // Taylor Swift
  "1Xyo4u8uXC1ZmMpatF05PJ", // The Weeknd
  "1uNFoZAHBGtllmzznpCI3s", // Justin Bieber
  "66CXWjxzNUsdJxJ2JdwvnR", // Ariana Grande
  "3TVXtAsR1Inumwj472S9r4", // Drake
  "6eUKZXaKkcviH0Ku9w2n3V", // Ed Sheeran
  "4q3ewBCX7sLwd24euuV69X", // Bad Bunny
  "1HY2Jd0NmPuamShAr6KMms", // Lady Gaga
  "5K4W6rqBFWDnAN6FQUkS6x", // Kanye West
  "4MCBfE4596Uoi2O4DtmEMz", // Juice WRLD
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: "Spotify credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "home";
    const token = await getToken();

    if (action === "search") {
      const q = url.searchParams.get("q")?.trim();
      if (!q) {
        return new Response(JSON.stringify({ tracks: [], artists: [], playlists: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Spotify rejects `type=playlist` for many app tiers post-Nov-2024; query track+artist only.
      const data = await sp(
        `/search?q=${encodeURIComponent(q)}&type=track,artist&limit=20&market=US`,
        token,
      );
      return new Response(
        JSON.stringify({
          tracks: (data?.tracks?.items || []).filter(Boolean).map((t: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists?.map((a: any) => a.name).join(", ") || "",
            duration_ms: t.duration_ms,
            image: t.album?.images?.[0]?.url || null,
            uri: t.uri,
          })),
          artists: (data?.artists?.items || []).filter(Boolean).map((a: any) => ({
            id: a.id,
            name: a.name,
            image: a.images?.[0]?.url || null,
            uri: a.uri,
          })),
          playlists: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // home: use /search (works for all apps) since /browse/* is deprecated/restricted.
    // - new releases: tracks tagged with current year
    // - recommended artists: popular artist search
    // - featured playlists / top charts: derive from search hits
    const year = new Date().getFullYear();
    const [newReleasesRes, artistsRes, topRes] = await Promise.all([
      sp(`/search?q=${encodeURIComponent(`year:${year}`)}&type=album&limit=20&market=US`, token),
      sp(`/search?q=${encodeURIComponent("genre:pop")}&type=artist&limit=15&market=US`, token),
      sp(`/search?q=${encodeURIComponent(`year:${year}`)}&type=track&limit=20&market=US`, token),
    ]);

    // Featured "playlists": build mosaic tiles from top tracks' albums (visually similar grid)
    const tracks = (topRes?.tracks?.items || []).filter(Boolean);
    const featuredPlaylists = tracks.slice(0, 6).map((t: any) => ({
      id: t.album?.id || t.id,
      name: t.album?.name || t.name,
      image: t.album?.images?.[0]?.url || null,
      description: t.artists?.map((a: any) => a.name).join(", ") || "",
      uri: t.album?.uri || t.uri,
    }));

    const payload = {
      featuredPlaylists,
      newReleases: (newReleasesRes?.albums?.items || []).filter(Boolean).map((a: any) => ({
        id: a.id,
        name: a.name,
        artist: a.artists?.map((x: any) => x.name).join(", ") || "",
        image: a.images?.[0]?.url || null,
        uri: a.uri,
      })),
      recommendedArtists: (artistsRes?.artists?.items || [])
        .filter((a: any) => a && a.images?.length)
        .slice(0, 15)
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          image: a.images?.[0]?.url || null,
          uri: a.uri,
        })),
      topCharts: tracks.slice(0, 20).map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.map((a: any) => a.name).join(", ") || "",
        image: t.album?.images?.[0]?.url || null,
        duration_ms: t.duration_ms,
        uri: t.uri,
      })),
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
