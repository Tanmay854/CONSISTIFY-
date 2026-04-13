import { useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AddReelDialog = ({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) => {
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!title.trim() || !videoUrl.trim()) return;
    setLoading(true);
    await supabase.from("reels").insert({ title: title.trim(), video_url: videoUrl.trim() });
    setLoading(false);
    setTitle("");
    setVideoUrl("");
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-foreground font-semibold text-lg">Add Reel</h3>
          <button onClick={onClose}>
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rise and Grind"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Video URL</label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Paste YouTube or video link"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !videoUrl.trim()}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Reel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddReelDialog;
