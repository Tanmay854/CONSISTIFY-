import { useState } from "react";
import { Film, Music2, Image, Upload, Check, FolderOpen, Link2, FileVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MyUploads from "@/components/MyUploads";

const CATEGORIES = ["Workout", "Study", "Motivation", "Mindfulness", "Finance", "Relationships"];

type UploadType = "video" | "music" | "photo";
type VideoSource = "url" | "file";
type MusicSource = "url" | "file";

const UploadTab = () => {
  const { canUpload, user } = useAuth();
  const [activeType, setActiveType] = useState<UploadType>("video");
  const [showMyUploads, setShowMyUploads] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Video fields
  const [videoSource, setVideoSource] = useState<VideoSource>("url");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Music fields
  const [musicSource, setMusicSource] = useState<MusicSource>("file");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [musicDuration, setMusicDuration] = useState("");
  const [musicCategory, setMusicCategory] = useState("Workout");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicFile, setMusicFile] = useState<File | null>(null);

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
    setVideoTitle(""); setVideoUrl(""); setVideoFile(null);
    setMusicTitle(""); setMusicArtist(""); setMusicDuration(""); setMusicUrl(""); setMusicFile(null);
    setPhotoTitle(""); setPhotoFile(null); setIsPro(false);
  };

  const uploadFileToBucket = async (bucket: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${user?.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
    if (uploadError) {
      setError(uploadError.message);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      if (activeType === "video") {
        if (!videoTitle.trim()) { setError("Title required"); setLoading(false); return; }
        let finalUrl = "";
        if (videoSource === "url") {
          if (!videoUrl.trim() || !isValidUrl(videoUrl.trim())) { setError("Valid URL required"); setLoading(false); return; }
          finalUrl = videoUrl.trim();
        } else {
          if (!videoFile) { setError("Select a video file"); setLoading(false); return; }
          const url = await uploadFileToBucket("videos", videoFile);
          if (!url) { setLoading(false); return; }
          finalUrl = url;
        }
        const { error: insertErr } = await supabase.from("reels").insert({ title: videoTitle.trim(), video_url: finalUrl, uploaded_by: user?.id });
        if (insertErr) { setError(insertErr.message); setLoading(false); return; }
      } else if (activeType === "music") {
        if (!musicTitle.trim() || !musicArtist.trim()) { setError("Title and artist required"); setLoading(false); return; }
        let audioUrl: string | null = null;
        if (musicSource === "url") {
          if (musicUrl.trim() && !isValidUrl(musicUrl.trim())) { setError("Invalid URL"); setLoading(false); return; }
          audioUrl = musicUrl.trim() || null;
        } else {
          if (!musicFile) { setError("Select an audio file"); setLoading(false); return; }
          audioUrl = await uploadFileToBucket("audio", musicFile);
          if (!audioUrl) { setLoading(false); return; }
        }
        const { error: insertErr } = await supabase.from("music").insert({
          title: musicTitle.trim(),
          artist: musicArtist.trim(),
          duration: musicDuration.trim() || null,
          category: musicCategory,
          audio_url: audioUrl,
          uploaded_by: user?.id,
        });
        if (insertErr) { setError(insertErr.message); setLoading(false); return; }
      } else if (activeType === "photo") {
        if (!photoTitle.trim() || !photoFile) { setError("Title and image required"); setLoading(false); return; }
        const url = await uploadFileToBucket("quote-images", photoFile);
        if (!url) { setLoading(false); return; }
        const { error: insertErr } = await supabase.from("quotes").insert({
          title: photoTitle.trim(),
          category: photoCategory.toUpperCase(),
          image_url: url,
          is_pro: isPro,
          uploaded_by: user?.id,
        });
        if (insertErr) { setError(insertErr.message); setLoading(false); return; }
      }

      setSuccess(true);
      resetFields();
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setLoading(false);
  };

  const types: { id: UploadType; label: string; icon: typeof Film }[] = [
    { id: "video", label: "Video", icon: Film },
    { id: "music", label: "Music", icon: Music2 },
    { id: "photo", label: "Photo", icon: Image },
  ];

  const SourceToggle = ({ value, onChange, options }: { value: string; onChange: (v: never) => void; options: { id: string; label: string; icon: typeof Link2 }[] }) => (
    <div className="flex gap-2 mb-3">
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Icon size={14} />
            {o.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen pb-24 pt-4 bg-background">
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-foreground font-bold text-2xl">Upload</h2>
            <p className="text-muted-foreground text-xs mt-0.5">Share content with your audience</p>
          </div>
          <button
            onClick={() => setShowMyUploads(!showMyUploads)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showMyUploads ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <FolderOpen size={14} />
            My Uploads
          </button>
        </div>
      </div>

      {!showMyUploads && (
        <>
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
                <SourceToggle
                  value={videoSource}
                  onChange={setVideoSource}
                  options={[
                    { id: "url", label: "URL / YouTube", icon: Link2 },
                    { id: "file", label: "From device", icon: FileVideo },
                  ]}
                />
                {videoSource === "url" ? (
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Paste YouTube or direct video link"
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm file:bg-primary file:text-primary-foreground file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:text-xs"
                  />
                )}
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
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <SourceToggle
                  value={musicSource}
                  onChange={setMusicSource}
                  options={[
                    { id: "file", label: "From device", icon: FileVideo },
                    { id: "url", label: "Audio URL", icon: Link2 },
                  ]}
                />
                {musicSource === "file" ? (
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm file:bg-primary file:text-primary-foreground file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:text-xs"
                  />
                ) : (
                  <input
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
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
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

            {error && <p className="text-destructive text-xs">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {success ? (<><Check size={18} />Published!</>) : loading ? "Publishing..." : (<><Upload size={16} />Publish</>)}
            </button>
          </div>
        </>
      )}

      {showMyUploads && <MyUploads />}
    </div>
  );
};

export default UploadTab;
