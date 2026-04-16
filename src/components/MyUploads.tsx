import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Check, X, Scissors, ChevronDown, ChevronUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Reel {
  id: string;
  title: string;
  video_url: string;
  author_name: string | null;
  created_at: string;
  uploaded_by: string | null;
  trim_start: number | null;
  trim_end: number | null;
}

const getYoutubeId = (url: string): string | null => {
  const m = url.match(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
};

const VideoTrimmer = ({ reel, onSave }: { reel: Reel; onSave: (start: number, end: number) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytId = getYoutubeId(reel.video_url);
  const [duration, setDuration] = useState(60);
  const [range, setRange] = useState<[number, number]>([reel.trim_start ?? 0, reel.trim_end ?? 60]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setRange([reel.trim_start ?? 0, reel.trim_end ?? dur]);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mt-3 space-y-3">
      {!ytId && (
        <video
          ref={videoRef}
          src={reel.video_url}
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full rounded-lg aspect-video bg-secondary"
          controls
        />
      )}
      {ytId && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-secondary">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?start=${Math.floor(range[0])}&end=${Math.floor(range[1])}`}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Start: {formatTime(range[0])}</span>
          <span>End: {formatTime(range[1])}</span>
        </div>
        <Slider
          min={0}
          max={duration}
          step={0.5}
          value={range}
          onValueChange={(v) => setRange(v as [number, number])}
          className="w-full"
        />
      </div>

      <button
        onClick={() => onSave(range[0], range[1])}
        className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Check size={16} />
        Save Trim
      </button>
    </div>
  );
};

const MyUploads = () => {
  const { user, isAdmin } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [trimmingId, setTrimmingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMyReels = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("reels").select("*").order("created_at", { ascending: false });
    if (!isAdmin) {
      query = query.eq("uploaded_by", user.id);
    }
    const { data } = await query;
    setReels((data as Reel[]) || []);
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    fetchMyReels();
  }, [fetchMyReels]);

  const handleSaveTitle = async (id: string) => {
    if (!editTitle.trim()) return;
    setSaving(true);
    await supabase.from("reels").update({ title: editTitle.trim() }).eq("id", id);
    setEditingId(null);
    await fetchMyReels();
    setSaving(false);
  };

  const handleSaveTrim = async (id: string, start: number, end: number) => {
    setSaving(true);
    await supabase.from("reels").update({ trim_start: start, trim_end: end }).eq("id", id);
    setTrimmingId(null);
    await fetchMyReels();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="px-5 py-8">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-secondary rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-muted-foreground text-sm">No uploaded videos yet.</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <h3 className="text-foreground font-semibold text-lg">My Videos</h3>
      {reels.map((reel) => {
        const ytId = getYoutubeId(reel.video_url);
        const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;
        const isEditing = editingId === reel.id;
        const isTrimming = trimmingId === reel.id;

        return (
          <div key={reel.id} className="bg-secondary rounded-xl p-3">
            <div className="flex gap-3">
              {/* Thumbnail */}
              <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {thumb ? (
                  <img src={thumb} alt={reel.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    Video
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex gap-2 items-center">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 bg-background text-foreground rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveTitle(reel.id)}
                      disabled={saving}
                      className="text-primary"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-muted-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-foreground text-sm font-medium truncate">{reel.title}</p>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(reel.id); setEditTitle(reel.title); }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setTrimmingId(isTrimming ? null : reel.id)}
                        className={`transition-colors ${isTrimming ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                      >
                        <Scissors size={14} />
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-muted-foreground text-xs mt-0.5">
                  {new Date(reel.created_at).toLocaleDateString()}
                </p>
                {reel.trim_start != null && reel.trim_end != null && (
                  <p className="text-primary/70 text-xs mt-0.5">
                    Trimmed: {Math.floor(reel.trim_start / 60)}:{String(Math.floor(reel.trim_start % 60)).padStart(2, "0")} — {Math.floor(reel.trim_end / 60)}:{String(Math.floor(reel.trim_end % 60)).padStart(2, "0")}
                  </p>
                )}
              </div>
            </div>

            {/* Trim panel */}
            {isTrimming && (
              <VideoTrimmer
                reel={reel}
                onSave={(start, end) => handleSaveTrim(reel.id, start, end)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MyUploads;
