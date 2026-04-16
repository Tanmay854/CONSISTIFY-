import { useState } from "react";
import { Film, Music2, Image, Upload, Check, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MyUploads from "@/components/MyUploads";

const CATEGORIES = ["Workout", "Study", "Motivation", "Mindfulness", "Finance", "Relationships"];

type UploadType = "video" | "music" | "photo";

const UploadTab = () => {
  const { canUpload, user } = useAuth();
  const [activeType, setActiveType] = useState<UploadType>("video");
  const [showMyUploads, setShowMyUploads] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Video fields
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // Music fields
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [musicDuration, setMusicDuration] = useState("");
  const [musicCategory, setMusicCategory] = useState("Workout");

  // Photo fields
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoCategory, setPhotoCategory] = useState("Motivation");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isPro, setIsPro] = useState(false);

  if (!canUpload) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <p className="text-muted-foreground text-sm">You don't have upload access.</p>
      </div>
    );
  }

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  const resetFields = () => {
    setVideoTitle(""); setVideoUrl("");
    setMusicTitle(""); setMusicArtist(""); setMusicDuration("");
    setPhotoTitle(""); setPhotoFile(null); setIsPro(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      if (activeType === "video") {
        if (!videoTitle.trim() || !videoUrl.trim() || !isValidUrl(videoUrl.trim())) {
          setLoading(false);
          return;
        }
        await supabase.from("reels").insert({ title: videoTitle.trim(), video_url: videoUrl.trim() });
      } else if (activeType === "music") {
        if (!musicTitle.trim() || !musicArtist.trim()) {
          setLoading(false);
          return;
        }
        await supabase.from("music").insert({
          title: musicTitle.trim(),
          artist: musicArtist.trim(),
          duration: musicDuration.trim() || null,
          category: musicCategory,
        });
      } else if (activeType === "photo") {
        if (!photoTitle.trim() || !photoFile) {
          setLoading(false);
          return;
        }
        const fileName = `${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from("quote-images").upload(fileName, photoFile);
        if (uploadError) {
          setLoading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("quote-images").getPublicUrl(fileName);
        await supabase.from("quotes").insert({
          title: photoTitle.trim(),
          category: photoCategory.toUpperCase(),
          image_url: urlData.publicUrl,
          is_pro: isPro,
        });
      }

      setSuccess(true);
      resetFields();
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const types: { id: UploadType; label: string; icon: typeof Film }[] = [
    { id: "video", label: "Video", icon: Film },
    { id: "music", label: "Music", icon: Music2 },
    { id: "photo", label: "Photo", icon: Image },
  ];

  return (
    <div className="min-h-screen pb-24 pt-4 bg-background">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-foreground font-bold text-2xl">Upload</h2>
        <p className="text-muted-foreground text-xs mt-0.5">Share content with your audience</p>
      </div>

      {/* Type selector */}
      <div className="flex gap-2 px-5 py-3">
        {types.map((t) => {
          const Icon = t.icon;
          const isActive = activeType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveType(t.id)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 ${
                isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div className="px-5 mt-4 space-y-4">
        {activeType === "video" && (
          <>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Title</label>
              <input
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. Rise and Grind"
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Video URL</label>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube or direct video link"
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </>
        )}

        {activeType === "music" && (
          <>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Title</label>
              <input
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
                placeholder="Track title"
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Artist</label>
              <input
                value={musicArtist}
                onChange={(e) => setMusicArtist(e.target.value)}
                placeholder="Artist name"
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Duration</label>
                <input
                  value={musicDuration}
                  onChange={(e) => setMusicDuration(e.target.value)}
                  placeholder="3:45"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Category</label>
                <select
                  value={musicCategory}
                  onChange={(e) => setMusicCategory(e.target.value)}
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {activeType === "photo" && (
          <>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Title</label>
              <input
                value={photoTitle}
                onChange={(e) => setPhotoTitle(e.target.value)}
                placeholder="Quote title"
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Category</label>
              <select
                value={photoCategory}
                onChange={(e) => setPhotoCategory(e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm file:bg-primary file:text-primary-foreground file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isPro}
                onChange={(e) => setIsPro(e.target.checked)}
                className="rounded border-border"
              />
              Mark as Pro
            </label>
          </>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {success ? (
            <>
              <Check size={18} />
              Published!
            </>
          ) : loading ? (
            "Publishing..."
          ) : (
            <>
              <Upload size={16} />
              Publish
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadTab;
