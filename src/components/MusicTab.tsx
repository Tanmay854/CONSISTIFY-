import { useEffect, useState, useCallback } from "react";
import { Play, Music2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  beginSpotifyLogin,
  completeSpotifyLoginIfPresent,
  hasSpotifyConnection,
  spotifyLogout,
  getSpotifyAccessToken,
} from "@/lib/spotifyAuth";
import SpotifyEmbed from "@/components/SpotifyEmbed";
import { trackView } from "@/lib/trackView";

interface SpotifyTrack {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  image: string | null;
  preview_url: string | null;
  duration_ms: number;
  external_url: string;
}

const categories = ["All", "Focus", "Workout", "Morning", "Meditation"];

const MusicTab = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Complete OAuth redirect if returning from Spotify
  useEffect(() => {
    (async () => {
      const ok = await completeSpotifyLoginIfPresent();
      if (ok) setConnected(true);
      else setConnected(hasSpotifyConnection());
    })();
  }, []);

  const fetchTracks = useCallback(async (category: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("spotify-browse", {
      method: "GET",
      body: undefined,
      headers: undefined,
      // supabase-js doesn't pass query params on invoke; use direct fetch instead
    } as any);
    // fallback: direct fetch with query
    try {
      const url = `https://kvaqlehxmaynwvlpowpa.functions.supabase.co/spotify-browse?category=${encodeURIComponent(category)}&limit=30`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load tracks");
      setTracks(json.tracks || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTracks(activeCategory); }, [activeCategory, fetchTracks]);

  const handlePlay = async (track: SpotifyTrack) => {
    setPlayingId(track.id);
    trackView("music", track.id);

    // Premium in-app playback via Web API (requires connection + active device)
    if (connected) {
      const token = await getSpotifyAccessToken();
      if (token) {
        await fetch("https://api.spotify.com/v1/me/player/play", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ uris: [track.uri] }),
        }).catch(() => {});
      }
    }
  };

  const handleConnect = async () => {
    if (connected) {
      spotifyLogout();
      setConnected(false);
    } else {
      await beginSpotifyLogin();
    }
  };

  return (
    <>
      <div className="min-h-screen pb-40 pt-4">
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-end justify-between">
          <div>
            <h2 className="text-foreground font-bold text-2xl">Music</h2>
            <p className="text-muted-foreground text-xs mt-0.5">Powered by Spotify</p>
          </div>
          <button
            onClick={handleConnect}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${
              connected
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {connected ? "Spotify Connected" : "Connect Spotify"}
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/80 text-secondary-foreground hover:bg-secondary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Track list */}
        <div className="px-4 mt-2 space-y-0.5">
          {loading && (
            <p className="text-muted-foreground text-xs text-center py-8">Loading recommendations…</p>
          )}
          {error && (
            <p className="text-destructive text-xs text-center py-8">{error}</p>
          )}
          {!loading && !error && tracks.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-12">No tracks found</p>
          )}

          {tracks.map((track, i) => {
            const isActive = playingId === track.id;
            return (
              <div
                key={track.id}
                className={`animate-float-up flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer group ${
                  isActive ? "bg-secondary/80" : "hover:bg-secondary/50"
                }`}
                style={{ animationDelay: `${Math.min(i, 10) * 0.03}s` }}
                onClick={() => handlePlay(track)}
              >
                {/* Album art */}
                <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0 shadow-lg bg-secondary flex items-center justify-center">
                  {track.image ? (
                    <img src={track.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Music2 size={18} className="text-foreground/60" />
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                    {track.title}
                  </p>
                  <p className="text-muted-foreground text-xs truncate">{track.artist}</p>
                </div>

                {/* Open in Spotify */}
                <a
                  href={track.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  aria-label="Open in Spotify"
                >
                  <ExternalLink size={14} />
                </a>
                <Play size={16} className={isActive ? "text-primary" : "text-muted-foreground"} fill="currentColor" />
              </div>
            );
          })}
        </div>

        <p className="text-muted-foreground text-[10px] text-center px-6 mt-6 leading-relaxed">
          Playback is provided by Spotify. Streams count toward artist royalties.
          {!connected && " Sign in with Spotify Premium for full-length in-app playback."}
        </p>
      </div>

      {/* Default player: Spotify Embed (legal, 30s preview without login, full track if signed into Spotify) */}
      {!connected && <SpotifyEmbed trackId={playingId} onClose={() => setPlayingId(null)} />}

      {/* Connected Premium: minimal status bar (playback runs on Spotify device) */}
      {connected && playingId && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-2">
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-lg mx-1 p-3 flex items-center gap-3 shadow-2xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-foreground text-xs flex-1">Playing on Spotify</p>
            <button onClick={() => setPlayingId(null)} className="text-muted-foreground text-xs">Hide</button>
          </div>
        </div>
      )}
    </>
  );
};

export default MusicTab;
