import { useEffect, useState } from "react";
import { Play, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SpotifyEmbed from "@/components/SpotifyEmbed";
import { trackView } from "@/lib/trackView";

interface MusicRow {
  id: string;
  title: string;
  artist: string;
  category: string;
  image_url: string | null;
  spotify_id: string | null;
}

const categories = ["All", "Focus", "Workout", "Morning", "Meditation"];

const MusicTab = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [tracks, setTracks] = useState<MusicRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("music")
        .select("id,title,artist,category,image_url,spotify_id")
        .not("spotify_id", "is", null)
        .order("created_at", { ascending: false });
      setTracks((data as MusicRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = activeCategory === "All"
    ? tracks
    : tracks.filter((t) => t.category === activeCategory);

  const handlePlay = (track: MusicRow) => {
    if (!track.spotify_id) return;
    setPlayingId(track.spotify_id);
    setExpanded(true);
    trackView("music", track.id);
  };

  return (
    <>
      <div className="min-h-screen pb-40 pt-4">
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-foreground font-bold text-2xl">Music</h2>
          <p className="text-muted-foreground text-xs mt-0.5">Powered by Spotify</p>
        </div>

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

        <div className="px-4 mt-2 space-y-0.5">
          {loading && (
            <p className="text-muted-foreground text-xs text-center py-8">Loading…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-12">No tracks yet</p>
          )}

          {filtered.map((track, i) => {
            const isActive = playingId === track.spotify_id;
            return (
              <div
                key={track.id}
                className={`animate-float-up flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer group ${
                  isActive ? "bg-secondary/80" : "hover:bg-secondary/50"
                }`}
                style={{ animationDelay: `${Math.min(i, 10) * 0.03}s` }}
                onClick={() => handlePlay(track)}
              >
                <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0 shadow-lg bg-secondary flex items-center justify-center">
                  {track.image_url ? (
                    <img src={track.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Music2 size={18} className="text-foreground/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                    {track.title}
                  </p>
                  <p className="text-muted-foreground text-xs truncate">{track.artist}</p>
                </div>
                <Play size={16} className={isActive ? "text-primary" : "text-muted-foreground"} fill="currentColor" />
              </div>
            );
          })}
        </div>

        <p className="text-muted-foreground text-[10px] text-center px-6 mt-6 leading-relaxed">
          Playback is provided by Spotify. Free accounts get 30-second previews;
          Spotify Premium users get full-length playback. Streams count toward artist royalties.
        </p>
      </div>

      {/* Player: tap the bar to expand/collapse */}
      {playingId && (
        <div onClick={() => setExpanded((e) => !e)}>
          <SpotifyEmbed
            trackId={playingId}
            expanded={expanded}
            onClose={() => { setPlayingId(null); setExpanded(false); }}
          />
        </div>
      )}
    </>
  );
};

export default MusicTab;
