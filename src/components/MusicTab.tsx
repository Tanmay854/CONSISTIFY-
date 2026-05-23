import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, SkipForward, SkipBack, Heart, Shuffle, Repeat, Volume2, ChevronDown, Music2, Flag } from "lucide-react";
import ReportDialog from "@/components/ReportDialog";
import { supabase } from "@/integrations/supabase/client";

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string | null;
  category: string;
  audio_url: string | null;
}

const categories = ["All", "Focus", "Workout", "Morning", "Meditation"];

const AddMusicDialog = ({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) => {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [duration, setDuration] = useState("");
  const [category, setCategory] = useState("Focus");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!title.trim() || !artist.trim()) return;
    setLoading(true);
    await supabase.from("music").insert({
      title: title.trim(),
      artist: artist.trim(),
      duration: duration.trim() || null,
      category,
    });
    setLoading(false);
    setTitle("");
    setArtist("");
    setDuration("");
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-foreground font-semibold text-lg">Add Track</h3>
          <button onClick={onClose} className="text-muted-foreground">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Artist</label>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Duration</label>
              <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="3:45"
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex-1">
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary">
                {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={loading || !title.trim() || !artist.trim()}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
            {loading ? "Adding..." : "Add Track"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Generate a consistent color from track id for album art placeholder
const getTrackColor = (id: string) => {
  const colors = [
    "from-emerald-600 to-emerald-900",
    "from-violet-600 to-violet-900",
    "from-rose-600 to-rose-900",
    "from-amber-600 to-amber-900",
    "from-cyan-600 to-cyan-900",
    "from-fuchsia-600 to-fuchsia-900",
    "from-blue-600 to-blue-900",
    "from-orange-600 to-orange-900",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const MusicTab = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [playing, setPlaying] = useState<string | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [tracks, setTracks] = useState<Track[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [reportTrack, setReportTrack] = useState<Track | null>(null);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoadingMore(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from("music")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data) {
      setTracks((prev) => (p === 0 ? data : [...prev, ...data]));
      if (data.length < PAGE_SIZE) setHasMore(false);
    }
    setLoadingMore(false);
  }, []);

  const fetchTracks = useCallback(async () => {
    setHasMore(true);
    setPage(0);
    await fetchPage(0);
  }, [fetchPage]);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((p) => {
          const next = p + 1;
          fetchPage(next);
          return next;
        });
      }
    }, { rootMargin: "300px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, fetchPage, tracks.length]);

  const filtered = activeCategory === "All" ? tracks : tracks.filter((t) => t.category === activeCategory);

  const toggleLike = (id: string) => {
    setLikedTracks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const playingTrack = tracks.find((t) => t.id === playing);
  const playingIndex = playing ? tracks.findIndex(t => t.id === playing) : -1;

  const playNext = useCallback(() => {
    if (playingIndex >= 0 && playingIndex < filtered.length - 1) {
      setPlaying(filtered[playingIndex + 1].id);
      setIsPaused(false);
    }
  }, [playingIndex, filtered]);
  const playPrev = () => {
    if (playingIndex > 0) {
      setPlaying(filtered[playingIndex - 1].id);
      setIsPaused(false);
    }
  };

  // Play / pause audio when track changes
  const trackedListens = useRef<Set<string>>(new Set());
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingTrack?.audio_url) {
      if (audio.src !== playingTrack.audio_url) {
        audio.src = playingTrack.audio_url;
      }
      if (!isPaused) {
        audio.play().catch(() => {});
        if (!trackedListens.current.has(playingTrack.id)) {
          trackedListens.current.add(playingTrack.id);
          supabase.from("content_views").insert({ content_type: "music", content_id: playingTrack.id });
        }
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
      audio.removeAttribute("src");
    }
  }, [playingTrack, isPaused]);

  const togglePlayPause = () => setIsPaused((p) => !p);
  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <>
      <div className="min-h-screen pb-40 pt-4">
        {/* Header */}
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-foreground font-bold text-2xl">Music</h2>
          <p className="text-muted-foreground text-xs mt-0.5">Fuel your journey</p>
        </div>

        {/* Category chips - Spotify style */}
        <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/80 text-secondary-foreground hover:bg-secondary"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Track list - Spotify style */}
        <div className="px-4 mt-2 space-y-0.5">
          {filtered.map((track, i) => {
            const isActive = playing === track.id;
            return (
              <div
                key={track.id}
                className={`animate-float-up flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer group ${
                  isActive ? "bg-secondary/80" : "hover:bg-secondary/50"
                }`}
                style={{ animationDelay: `${i * 0.03}s` }}
                onClick={() => setPlaying(isActive ? null : track.id)}
              >
                {/* Album art placeholder */}
                <div className={`w-11 h-11 rounded-md bg-gradient-to-br ${getTrackColor(track.id)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  {isActive ? (
                    <div className="flex items-end gap-[2px] h-4">
                      <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '60%' }} />
                      <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.2s' }} />
                      <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.4s' }} />
                    </div>
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

                {/* Like & duration */}
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); toggleLike(track.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart size={15} className={likedTracks.has(track.id) ? "fill-primary text-primary opacity-100" : "text-muted-foreground"} />
                  </button>
                  {likedTracks.has(track.id) && (
                    <Heart size={15} className="fill-primary text-primary group-hover:hidden" />
                  )}
                  {track.duration && (
                    <span className="text-muted-foreground text-[11px] tabular-nums">{track.duration}</span>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !loadingMore && (
            <p className="text-muted-foreground text-sm text-center py-12">No tracks yet</p>
          )}
          {hasMore && <div ref={sentinelRef} className="h-8" />}
          {loadingMore && (
            <p className="text-muted-foreground text-xs text-center py-4">Loading…</p>
          )}
        </div>
      </div>

      {/* Spotify-style bottom player */}
      {playing !== null && playingTrack && (
        <>
          {/* Expanded player */}
          {expanded && (
            <div className="fixed inset-0 z-40 bg-gradient-to-b from-secondary to-background flex flex-col">
              <div className="px-5 pt-12 pb-4 flex items-center justify-between">
                <button onClick={() => setExpanded(false)}>
                  <ChevronDown size={24} className="text-foreground" />
                </button>
                <p className="text-foreground text-xs font-semibold uppercase tracking-wider">Now Playing</p>
                <div className="w-6" />
              </div>

              <div className="flex-1 flex flex-col items-center justify-center px-8">
                {/* Large album art */}
                <div className={`w-64 h-64 rounded-lg bg-gradient-to-br ${getTrackColor(playingTrack.id)} flex items-center justify-center shadow-2xl mb-10`}>
                  <Music2 size={64} className="text-foreground/40" />
                </div>

                {/* Track info */}
                <div className="w-full flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-foreground font-bold text-xl truncate">{playingTrack.title}</h3>
                    <p className="text-muted-foreground text-sm">{playingTrack.artist}</p>
                  </div>
                  <button onClick={() => toggleLike(playingTrack.id)}>
                    <Heart size={22} className={likedTracks.has(playingTrack.id) ? "fill-primary text-primary" : "text-muted-foreground"} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full mt-6">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }} />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-muted-foreground text-[10px]">{formatTime(progress)}</span>
                    <span className="text-muted-foreground text-[10px]">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between w-full mt-4 px-4">
                  <Shuffle size={18} className="text-muted-foreground" />
                  <button onClick={playPrev}><SkipBack size={28} className="text-foreground" fill="hsl(0 0% 95%)" /></button>
                  <button onClick={togglePlayPause}
                    className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    {isPaused ? <Play size={28} className="text-primary-foreground ml-1" fill="currentColor" /> : <Pause size={28} className="text-primary-foreground" fill="currentColor" />}
                  </button>
                  <button onClick={playNext}><SkipForward size={28} className="text-foreground" fill="hsl(0 0% 95%)" /></button>
                  <Repeat size={18} className="text-muted-foreground" />
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 mt-8 w-full px-8">
                  <Volume2 size={14} className="text-muted-foreground" />
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-muted-foreground rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mini player bar */}
          {!expanded && (
            <div className="fixed bottom-20 left-0 right-0 z-30 px-2">
              <div
                className="bg-card/95 backdrop-blur-xl border border-border rounded-lg mx-1 p-2.5 flex items-center gap-3 shadow-2xl cursor-pointer"
                onClick={() => setExpanded(true)}
              >
                <div className={`w-10 h-10 rounded bg-gradient-to-br ${getTrackColor(playingTrack.id)} flex items-center justify-center flex-shrink-0`}>
                  <div className="flex items-end gap-[2px] h-3">
                    <div className="w-[2px] bg-primary rounded-full animate-pulse" style={{ height: '50%' }} />
                    <div className="w-[2px] bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.2s' }} />
                    <div className="w-[2px] bg-primary rounded-full animate-pulse" style={{ height: '70%', animationDelay: '0.4s' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-semibold truncate">{playingTrack.title}</p>
                  <p className="text-muted-foreground text-[11px] truncate">{playingTrack.artist}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleLike(playingTrack.id); }}>
                    <Heart size={18} className={likedTracks.has(playingTrack.id) ? "fill-primary text-primary" : "text-muted-foreground"} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                    className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                    {isPaused ? <Play size={16} className="text-primary-foreground ml-0.5" fill="currentColor" /> : <Pause size={16} className="text-primary-foreground" fill="currentColor" />}
                  </button>
                </div>
              </div>
              {/* Progress line */}
              <div className="mx-3 h-[2px] bg-muted rounded-full overflow-hidden mt-0">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={playNext}
      />

      {playingTrack && (
        <button
          onClick={() => setReportTrack(playingTrack)}
          className="fixed bottom-44 right-3 z-40 bg-black/60 backdrop-blur-sm rounded-full p-2 text-white/80 hover:text-white"
          aria-label="Report track"
        >
          <Flag size={14} />
        </button>
      )}
      {reportTrack && (
        <ReportDialog
          open={!!reportTrack}
          onClose={() => setReportTrack(null)}
          contentType="music"
          contentId={reportTrack.id}
          contentTitle={reportTrack.title}
        />
      )}
    </>
  );
};

export default MusicTab;
