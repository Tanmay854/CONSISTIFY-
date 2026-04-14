import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, SkipBack, Heart, Clock, Plus, LogIn, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthSheet from "./AuthSheet";
import AdminPanel from "./AdminPanel";

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

const MusicTab = () => {
  const { user, canUpload, isAdmin, signOut } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");
  const [playing, setPlaying] = useState<string | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const fetchTracks = useCallback(async () => {
    const { data } = await supabase.from("music").select("*").order("created_at", { ascending: false });
    if (data) setTracks(data);
  }, []);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  const filtered = activeCategory === "All" ? tracks : tracks.filter((t) => t.category === activeCategory);

  const toggleLike = (id: string) => {
    setLikedTracks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const playingTrack = tracks.find((t) => t.id === playing);

  return (
    <>
      <div className="min-h-screen pb-24 pt-4">
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-foreground font-semibold text-2xl">Music</h2>
            <p className="text-muted-foreground text-sm mt-1">Fuel your journey</p>
          </div>
          <div className="flex items-center gap-2">
            {user && isAdmin && (
              <button onClick={() => setShowAdmin(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <Shield size={16} className="text-primary" />
              </button>
            )}
            {user && canUpload && (
              <button onClick={() => setShowAdd(true)} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Plus size={18} className="text-primary-foreground" />
              </button>
            )}
            {user ? (
              <button onClick={signOut} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <LogOut size={16} className="text-muted-foreground" />
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <LogIn size={16} className="text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-5 py-4 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Now Playing */}
        {playing !== null && playingTrack && (
          <div className="mx-5 mb-4 p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm truncate">{playingTrack.title}</p>
                <p className="text-muted-foreground text-xs">{playingTrack.artist}</p>
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-primary rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button><SkipBack size={18} className="text-foreground" /></button>
                <button onClick={() => setPlaying(null)} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <Pause size={18} className="text-primary-foreground" />
                </button>
                <button><SkipForward size={18} className="text-foreground" /></button>
              </div>
            </div>
          </div>
        )}

        {/* Track list */}
        <div className="px-5 space-y-1">
          {filtered.map((track, i) => (
            <div key={track.id} className="animate-float-up flex items-center gap-4 p-3 rounded-xl hover:bg-card transition-colors"
              style={{ animationDelay: `${i * 0.05}s` }}>
              <button onClick={() => setPlaying(playing === track.id ? null : track.id)}
                className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                {playing === track.id ? <Pause size={16} className="text-primary" /> : <Play size={16} className="text-foreground ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{track.title}</p>
                <p className="text-muted-foreground text-xs">{track.artist}</p>
              </div>
              <div className="flex items-center gap-3">
                {track.duration && (
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Clock size={10} />{track.duration}
                  </span>
                )}
                <button onClick={() => toggleLike(track.id)}>
                  <Heart size={16} className={likedTracks.has(track.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">No tracks yet</p>
          )}
        </div>
      </div>

      <AddMusicDialog open={showAdd} onClose={() => setShowAdd(false)} onAdded={fetchTracks} />
      <AuthSheet open={showAuth} onClose={() => setShowAuth(false)} />
      <AdminPanel open={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
};

export default MusicTab;
