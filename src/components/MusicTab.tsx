import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, X, Music2, Play, Plus, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { openSpotify } from "@/lib/spotifyLink";
import { useAuth } from "@/hooks/useAuth";
import { beginSpotifyLogin, callSpotifyUser } from "@/lib/spotifyConnect";
import MyAlbumsSheet from "./MyAlbumsSheet";
import { toast } from "@/hooks/use-toast";

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const SPOTIFY_GREEN = "#1DB954";

interface ArtistItem { id: string; name: string; image: string | null; uri: string; }
interface AlbumItem { id: string; name: string; artist: string; image: string | null; uri: string; }
interface TrackItem { id: string; name: string; artist: string; image: string | null; duration_ms?: number; uri: string; }
interface CategoryBucket { id: string; title: string; tracks: TrackItem[]; }
interface PlaylistItem { id: string; name: string; image: string | null; uri: string; tracks?: number; }

interface HomeData {
  categories: CategoryBucket[];
  newReleases: AlbumItem[];
  recommendedArtists: ArtistItem[];
}

interface SearchData { tracks: TrackItem[]; artists: ArtistItem[]; }

interface MyAlbum { id: string; name: string; cover_url: string | null; }

const fmtDur = (ms?: number) => {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const gradientFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 60 + (h % 90)) % 360;
  return `linear-gradient(135deg, hsl(${a} 80% 45%), hsl(${b} 75% 30%))`;
};

const SpotifyBadge = () => (
  <span className="inline-flex items-center gap-1.5 text-[10px] text-white/70">
    <svg viewBox="0 0 24 24" width="12" height="12" fill={SPOTIFY_GREEN}>
      <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .25c-2.8-1.7-6.3-2-10.5-1.1a.75.75 0 1 1-.3-1.5c4.5-1 8.4-.6 11.5 1.3.4.3.5.7.3 1.1Zm1.5-3.3a.94.94 0 0 1-1.3.3c-3.2-2-8.1-2.6-11.9-1.4a.94.94 0 1 1-.55-1.8c4.3-1.3 9.7-.7 13.4 1.6.4.3.6.8.3 1.3Zm.1-3.4c-3.8-2.3-10.2-2.5-13.9-1.4a1.12 1.12 0 1 1-.65-2.15c4.2-1.3 11.2-1 15.6 1.6a1.13 1.13 0 1 1-1.15 1.95Z"/>
    </svg>
    Powered by Spotify
  </span>
);

const MusicTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [home, setHome] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchData | null>(null);

  // Custom albums
  const [myAlbums, setMyAlbums] = useState<MyAlbum[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<MyAlbum | null>(null);

  // Spotify connection
  const [connected, setConnected] = useState(false);
  const [spotifyName, setSpotifyName] = useState<string | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<PlaylistItem[]>([]);
  const [likedSongs, setLikedSongs] = useState<TrackItem[]>([]);

  const callFn = useCallback(async (params: Record<string, string>) => {
    const url = new URL(
      `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/spotify-browse`,
    );
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(url.toString(), {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (!res.ok) throw new Error(`Spotify request failed (${res.status})`);
    return await res.json();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const d = await callFn({ action: "home" });
        // Shuffle each mount so recommendations rotate on every visit.
        const shuffled: HomeData = {
          categories: (d.categories || []).map((c: CategoryBucket) => ({
            ...c, tracks: shuffle(c.tracks || []).slice(0, 12),
          })),
          newReleases: shuffle((d.newReleases || []) as AlbumItem[]).slice(0, 12),
          recommendedArtists: shuffle((d.recommendedArtists || []) as ArtistItem[]).slice(0, 12),
        };
        setHome(shuffled);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [callFn]);

  // Load my albums
  const loadAlbums = useCallback(async () => {
    if (!user) { setMyAlbums([]); return; }
    const { data } = await supabase.from("user_albums")
      .select("id,name,cover_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setMyAlbums((data || []) as MyAlbum[]);
  }, [user]);
  useEffect(() => { loadAlbums(); }, [loadAlbums]);

  // Load Spotify connection status + content
  const loadSpotify = useCallback(async () => {
    if (!user) { setConnected(false); return; }
    const { data } = await supabase.from("spotify_connections")
      .select("display_name").eq("user_id", user.id).maybeSingle();
    if (!data) { setConnected(false); return; }
    setConnected(true);
    setSpotifyName(data.display_name);
    try {
      const [pl, lk] = await Promise.all([
        callSpotifyUser("me-playlists"),
        callSpotifyUser("me-liked"),
      ]);
      setUserPlaylists(pl.items || []);
      setLikedSongs(lk.items || []);
    } catch (e) {
      console.warn("Spotify user content failed", e);
    }
  }, [user]);
  useEffect(() => { loadSpotify(); }, [loadSpotify]);

  const disconnectSpotify = async () => {
    try {
      await callSpotifyUser("disconnect", { method: "POST" });
      setConnected(false); setSpotifyName(null);
      setUserPlaylists([]); setLikedSongs([]);
      toast({ title: "Spotify disconnected" });
    } catch (e) {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    }
  };

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults(null); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await callFn({ action: "search", q });
        setResults(d);
      } catch {
        setResults({ tracks: [], artists: [] });
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, callFn]);

  return (
    <div className="min-h-screen pb-28 pt-4" style={{ backgroundColor: "#000", color: "#fff" }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <h2 className="font-bold text-2xl text-white">Music</h2>
        <SpotifyBadge />
      </div>

      {/* Connect Spotify — available to every user; guests are routed to sign in */}
      <div className="px-5 pt-3">
        {user && connected ? (
          <div className="flex items-center justify-between bg-white/5 rounded-full px-4 py-2">
            <span className="text-xs text-white/80">
              Connected{spotifyName ? ` as ${spotifyName}` : ""}
            </span>
            <button onClick={disconnectSpotify} className="text-white/50 hover:text-white" aria-label="Disconnect">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (!user) {
                toast({ title: "Sign in to connect Spotify" });
                navigate("/auth");
                return;
              }
              beginSpotifyLogin();
            }}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-black"
            style={{ backgroundColor: SPOTIFY_GREEN }}
          >
            Connect Spotify
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-5 pt-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists"
            className="w-full bg-white/10 text-white rounded-full pl-10 pr-9 py-2.5 text-sm placeholder:text-white/50 outline-none focus:ring-1"
            style={{ boxShadow: query ? `0 0 0 1px ${SPOTIFY_GREEN}` : undefined }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {query.trim() && (
        <div className="px-5 mt-4 space-y-5">
          {searching && <p className="text-white/50 text-xs text-center py-4">Searching…</p>}
          {!searching && results && (
            <>
              {results.tracks.length === 0 && results.artists.length === 0 && (
                <p className="text-white/50 text-sm text-center py-8">No results</p>
              )}
              {results.tracks.length > 0 && (
                <Section title="Songs">
                  <div className="space-y-0.5">
                    {results.tracks.map((t) => <TrackRow key={t.id} track={t} />)}
                  </div>
                </Section>
              )}
              {results.artists.length > 0 && (
                <Section title="Artists">
                  <HScroll>{results.artists.map((a) => <ArtistTile key={a.id} artist={a} />)}</HScroll>
                </Section>
              )}
            </>
          )}
        </div>
      )}

      {!query.trim() && (
        <div className="mt-5 space-y-7">
          {/* My Albums — available to every user; guests are routed to sign in */}
          <Section title="My Albums">
            <HScroll>
              <button
                onClick={() => {
                  if (!user) {
                    toast({ title: "Sign in to create albums" });
                    navigate("/auth");
                    return;
                  }
                  setEditingAlbum(null);
                  setSheetOpen(true);
                }}
                className="w-28 flex-shrink-0 flex flex-col items-center justify-center active:scale-95 transition-transform"
              >
                <div
                  className="w-28 h-28 rounded-md flex items-center justify-center border-2 border-dashed border-white/20"
                  style={{ color: SPOTIFY_GREEN }}
                >
                  <Plus size={28} />
                </div>
                <p className="text-white text-xs font-semibold mt-2 text-center">New album</p>
              </button>
              {myAlbums.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setEditingAlbum(a); setSheetOpen(true); }}
                  className="w-28 flex-shrink-0 text-left active:scale-95 transition-transform"
                >
                  <div className="w-28 h-28 rounded-md overflow-hidden bg-white/10 shadow-lg">
                    {a.cover_url
                      ? <img src={a.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center"><Music2 size={28} className="text-white/40" /></div>}
                  </div>
                  <p className="text-white text-xs font-semibold mt-2 truncate">{a.name}</p>
                </button>
              ))}
            </HScroll>
          </Section>

          {/* Your Playlists (when connected) */}
          {connected && userPlaylists.length > 0 && (
            <Section title="Your Playlists">
              <HScroll>
                {userPlaylists.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openSpotify(p.uri)}
                    className="w-36 flex-shrink-0 text-left active:scale-95 transition-transform"
                  >
                    <div className="w-36 h-36 rounded-md overflow-hidden bg-white/10 shadow-lg">
                      {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <p className="text-white text-xs font-semibold mt-2 truncate">{p.name}</p>
                    {p.tracks ? <p className="text-white/60 text-[11px]">{p.tracks} tracks</p> : null}
                  </button>
                ))}
              </HScroll>
            </Section>
          )}

          {/* Liked Songs (when connected) */}
          {connected && likedSongs.length > 0 && (
            <Section title="Liked Songs">
              <div className="px-3 space-y-0.5">
                {likedSongs.slice(0, 20).map((t, i) => <TrackRow key={t.id} track={t} index={i + 1} />)}
              </div>
            </Section>
          )}

          {loading && (
            <div className="px-5 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-lg bg-white/5 animate-pulse" />)}
            </div>
          )}
          {error && <p className="px-5 text-white/60 text-sm">{error}</p>}

          {home && (
            <>
              {/* Motivational categories */}
              {home.categories.map((cat) => (
                cat.tracks.length > 0 && (
                  <Section key={cat.id} title={cat.title}>
                    <HScroll>
                      {cat.tracks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => openSpotify(t.uri)}
                          className="w-36 flex-shrink-0 text-left active:scale-95 transition-transform"
                        >
                          <div className="w-36 h-36 rounded-md overflow-hidden bg-white/10 shadow-lg">
                            {t.image && <img src={t.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                          </div>
                          <p className="text-white text-xs font-semibold mt-2 truncate">{t.name}</p>
                          <p className="text-white/60 text-[11px] truncate">{t.artist}</p>
                        </button>
                      ))}
                    </HScroll>
                  </Section>
                )
              ))}

              {home.recommendedArtists.length > 0 && (
                <Section title="Recommended Artists">
                  <HScroll>{home.recommendedArtists.map((a) => <ArtistTile key={a.id} artist={a} />)}</HScroll>
                </Section>
              )}

              {home.newReleases.length > 0 && (
                <Section title="New Releases">
                  <HScroll>
                    {home.newReleases.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => openSpotify(a.uri)}
                        className="w-36 flex-shrink-0 text-left active:scale-95 transition-transform"
                      >
                        <div className="w-36 h-36 rounded-md overflow-hidden bg-white/10 shadow-lg">
                          {a.image && <img src={a.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                        </div>
                        <p className="text-white text-xs font-semibold mt-2 truncate">{a.name}</p>
                        <p className="text-white/60 text-[11px] truncate">{a.artist}</p>
                      </button>
                    ))}
                  </HScroll>
                </Section>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <SpotifyBadge />
      </div>

      <MyAlbumsSheet
        open={sheetOpen}
        album={editingAlbum}
        onClose={() => setSheetOpen(false)}
        onAlbumChanged={loadAlbums}
      />
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h3 className="text-white font-bold text-lg mb-2.5 px-5">{title}</h3>
    {children}
  </section>
);

const HScroll = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-1">{children}</div>
);

const ArtistTile = ({ artist }: { artist: ArtistItem }) => (
  <button
    onClick={() => openSpotify(artist.uri)}
    className="w-28 flex-shrink-0 text-left active:scale-95 transition-transform"
  >
    <div className="w-28 h-28 rounded-full overflow-hidden shadow-xl" style={{ background: gradientFor(artist.id) }}>
      {artist.image && <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" loading="lazy" />}
    </div>
    <p className="text-white text-xs font-semibold mt-2 text-center truncate">{artist.name}</p>
  </button>
);

const TrackRow = ({ track, index }: { track: TrackItem; index?: number }) => (
  <button
    onClick={() => openSpotify(track.uri)}
    className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5 active:bg-white/10 transition-colors text-left"
  >
    {index !== undefined && (
      <span className="w-5 text-center text-white/50 text-xs font-semibold">{index}</span>
    )}
    <div className="w-11 h-11 rounded bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
      {track.image
        ? <img src={track.image} alt="" className="w-full h-full object-cover" loading="lazy" />
        : <Music2 size={16} className="text-white/40" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white text-sm font-medium truncate">{track.name}</p>
      <p className="text-white/60 text-xs truncate">{track.artist}</p>
    </div>
    {track.duration_ms ? (
      <span className="text-white/50 text-xs tabular-nums">{fmtDur(track.duration_ms)}</span>
    ) : (
      <Play size={14} fill={SPOTIFY_GREEN} style={{ color: SPOTIFY_GREEN }} />
    )}
  </button>
);

export default MusicTab;
