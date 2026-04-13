import { useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Heart, Clock } from "lucide-react";

interface Track {
  id: number;
  title: string;
  artist: string;
  duration: string;
  category: string;
}

const tracks: Track[] = [
  { id: 1, title: "Rise and Grind", artist: "Motivational Beats", duration: "3:45", category: "Focus" },
  { id: 2, title: "Unstoppable Energy", artist: "Epic Sounds", duration: "4:12", category: "Workout" },
  { id: 3, title: "Morning Warrior", artist: "Ambient Rise", duration: "5:30", category: "Morning" },
  { id: 4, title: "Conquer the Day", artist: "Power Tracks", duration: "3:58", category: "Focus" },
  { id: 5, title: "Limitless Mind", artist: "Deep Focus", duration: "6:15", category: "Meditation" },
  { id: 6, title: "Champion's Walk", artist: "Motivational Beats", duration: "4:02", category: "Workout" },
  { id: 7, title: "Inner Peace", artist: "Calm Waves", duration: "7:20", category: "Meditation" },
  { id: 8, title: "Fire Within", artist: "Epic Sounds", duration: "3:33", category: "Focus" },
];

const categories = ["All", "Focus", "Workout", "Morning", "Meditation"];

const MusicTab = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [playing, setPlaying] = useState<number | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<number>>(new Set());

  const filtered = activeCategory === "All" ? tracks : tracks.filter((t) => t.category === activeCategory);

  const toggleLike = (id: number) => {
    setLikedTracks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen pb-24 pt-4">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-foreground font-semibold text-2xl">Music</h2>
        <p className="text-muted-foreground text-sm mt-1">Fuel your journey</p>
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-5 py-4 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Now Playing (if any) */}
      {playing !== null && (
        <div className="mx-5 mb-4 p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-sm truncate">
                {tracks.find((t) => t.id === playing)?.title}
              </p>
              <p className="text-muted-foreground text-xs">
                {tracks.find((t) => t.id === playing)?.artist}
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-primary rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button>
                <SkipBack size={18} className="text-foreground" />
              </button>
              <button
                onClick={() => setPlaying(null)}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center"
              >
                <Pause size={18} className="text-primary-foreground" />
              </button>
              <button>
                <SkipForward size={18} className="text-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track list */}
      <div className="px-5 space-y-1">
        {filtered.map((track, i) => (
          <div
            key={track.id}
            className="animate-float-up flex items-center gap-4 p-3 rounded-xl hover:bg-card transition-colors"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <button
              onClick={() => setPlaying(playing === track.id ? null : track.id)}
              className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0"
            >
              {playing === track.id ? (
                <Pause size={16} className="text-primary" />
              ) : (
                <Play size={16} className="text-foreground ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-medium truncate">{track.title}</p>
              <p className="text-muted-foreground text-xs">{track.artist}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Clock size={10} />
                {track.duration}
              </span>
              <button onClick={() => toggleLike(track.id)}>
                <Heart
                  size={16}
                  className={likedTracks.has(track.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MusicTab;
