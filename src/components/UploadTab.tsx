import { UPLOAD_FEEDS } from "@/lib/videoFeeds";
import { useEffect, useMemo, useState } from "react";
import { Film, Upload, Check, FolderOpen, Link2, FileVideo, Megaphone } from "lucide-react";
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MyUploads from "@/components/MyUploads";
import { cropImageToAspect, type PhotoAspect } from "@/lib/cropImage";


const CATEGORIES = ["Workout", "Study", "Motivation", "Mindfulness", "Finance", "Relationships"];

type UploadType = "video" | "photo" | "ad";
type AdSource = "url" | "file";

const UploadTab = () => {
  const { canUpload, isAdmin, user } = useAuth();
  const [activeType, setActiveType] = useState<UploadType>("video");
  const [showMyUploads, setShowMyUploads] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Video fields
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoCategory, setVideoCategory] = useState("Motivation");
  const [videoFeed, setVideoFeed] = useState<string>("quick_spark");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const thumbPreviewUrl = useMemo(() => (thumbFile ? URL.createObjectURL(thumbFile) : null), [thumbFile]);
  useEffect(() => () => { if (thumbPreviewUrl) URL.revokeObjectURL(thumbPreviewUrl); }, [thumbPreviewUrl]);
  const [videoFit, setVideoFit] = useState<"cover" | "contain" | "fill">("cover");

  // Only build a preview URL for files that can be decoded in the WebView without
  // crashing. Modern phones handle ~200 MB H.264 fine; very large files still skip preview.
  const PREVIEW_MAX_BYTES = 200 * 1024 * 1024; // 200 MB
  const canPreviewVideo = !!videoFile && videoFile.size <= PREVIEW_MAX_BYTES;
  const videoPreviewUrl = useMemo(() => (canPreviewVideo ? URL.createObjectURL(videoFile!) : null), [videoFile, canPreviewVideo]);
  useEffect(() => () => { if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); }, [videoPreviewUrl]);


  // (Music uploads removed — Music tab is now powered by Spotify.)


  // Photo fields (supports up to 20 in a set)
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDescription, setPhotoDescription] = useState("");
  const [photoCategory, setPhotoCategory] = useState("Motivation");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoAspect, setPhotoAspect] = useState<PhotoAspect>("original");
  const photoPreviewUrls = useMemo(() => photoFiles.map((f) => URL.createObjectURL(f)), [photoFiles]);
  useEffect(() => () => { photoPreviewUrls.forEach((u) => URL.revokeObjectURL(u)); }, [photoPreviewUrls]);
  const aspectClass: Record<PhotoAspect, string> = {
    original: "aspect-[3/4]",
    "9:16": "aspect-[9/16]",
    "1:1": "aspect-square",
    "4:5": "aspect-[4/5]",
  };


  // Ad fields
  const [adTitle, setAdTitle] = useState("");
  const [adPlacement, setAdPlacement] = useState<"reels" | "music">("reels");
  const [adLink, setAdLink] = useState("");
  const [adSource, setAdSource] = useState<AdSource>("file");
  const [adUrl, setAdUrl] = useState("");
  const [adFile, setAdFile] = useState<File | null>(null);

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
    setVideoTitle(""); setVideoDescription(""); setVideoFile(null); setThumbFile(null);
    setPhotoTitle(""); setPhotoDescription(""); setPhotoFiles([]);
    setAdTitle(""); setAdLink(""); setAdUrl(""); setAdFile(null);
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

  // Music + photos go to Bunny Storage via the edge function (scales to 20+ TB).
  const uploadToBunny = async (file: File, kind: "audio" | "image"): Promise<{ url: string; path: string | null } | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Sign in required"); return null; }
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const res = await fetch(
      `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bunny-storage-upload`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      setError(json.detail ? `${json.error || "Upload failed"}: ${json.detail}` : json.error || "Upload failed");
      return null;
    }
    return { url: json.url as string, path: typeof json.path === "string" ? json.path : null };
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      if (activeType === "video") {
        if (!videoFile) { setError("Select a video file from your device"); setLoading(false); return; }

        // Only probe duration for smaller files. Decoding a large local video in the
        // Android WebView for a duration check can OOM-crash the app.
        if (videoFile.size <= PREVIEW_MAX_BYTES) {
          const duration = await new Promise<number>((resolve) => {
            const v = document.createElement("video");
            v.preload = "metadata";
            v.onloadedmetadata = () => resolve(v.duration);
            v.onerror = () => resolve(0);
            v.src = URL.createObjectURL(videoFile);
          });
          const maxSeconds = videoFeed === "quick_spark" ? 180 : 2700;
          if (duration > maxSeconds) {
            setError(`Video must be ${maxSeconds / 60} minutes or less (yours is ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")})`);
            setLoading(false);
            return;
          }
        }

        // 1. Ask edge function for a Bunny TUS upload ticket
        setUploadProgress(0);
        const fallbackTitle = videoFile.name.replace(/\.[^.]+$/, "") || "Untitled";
        const titleForBunny = videoTitle.trim() || fallbackTitle;
        const { data: ticket, error: fnErr } = await supabase.functions.invoke("bunny-create-video", {
          body: { title: titleForBunny },
        });
        if (fnErr || !ticket?.guid) {
          setError(fnErr?.message || ticket?.error || "Failed to start upload");
          setLoading(false); return;
        }

        // 2. Direct TUS upload to Bunny.net (no Supabase storage)
        const uploadErr = await new Promise<string | null>((resolve) => {
          const upload = new tus.Upload(videoFile, {
            endpoint: ticket.tusEndpoint,
            // Stream the whole file over a single connection: no per-chunk
            // round-trips, which is what actually caps throughput on slower
            // (~9 Mbps) home connections. Retries resume from Bunny's offset.
            chunkSize: Infinity,
            retryDelays: [0, 1000, 3000, 5000, 10000, 20000, 30000],
            storeFingerprintForResuming: false,
            removeFingerprintOnSuccess: true,
            headers: {
              AuthorizationSignature: ticket.signature,
              AuthorizationExpire: String(ticket.expire),
              VideoId: ticket.guid,
              LibraryId: String(ticket.libraryId),
            },
            metadata: { filetype: videoFile.type, title: titleForBunny },
            onError: (err) => resolve(err?.message || String(err)),
            onProgress: (sent, total) => setUploadProgress(Math.round((sent / total) * 100)),
            onSuccess: () => resolve(null),
          });
          upload.start();
        });
        if (uploadErr) { setError("Upload failed: " + uploadErr); setLoading(false); return; }

        // 2b. Optional custom thumbnail (Long Game / Calm State)
        let customThumb: string | null = null;
        if (thumbFile) {
          const up = await uploadToBunny(thumbFile, "image");
          if (up) customThumb = up.url;
        }

        // 3. Save Bunny playback URL and exact Stream identifiers into reels
        const { error: insertErr } = await supabase.from("reels").insert({ title: videoTitle.trim() || null, description: videoDescription.trim() || null, video_url: ticket.playbackUrl, thumbnail_url: customThumb, bunny_video_guid: ticket.guid, bunny_library_id: String(ticket.libraryId), category: videoCategory, feed: videoFeed, video_fit: videoFit, uploaded_by: user?.id });
        if (insertErr) { setError(insertErr.message); setLoading(false); return; }


      } else if (activeType === "photo") {
        if (photoFiles.length === 0) { setError("Select at least one image"); setLoading(false); return; }
        if (photoFiles.length > 20) { setError("Maximum 20 photos per set"); setLoading(false); return; }
        const setId = photoFiles.length > 1 ? crypto.randomUUID() : null;
        const rows: Array<{ title: string | null; description: string | null; category: string; image_url: string; bunny_storage_path: string | null; is_pro: boolean; uploaded_by: string | undefined; set_id: string | null; set_position: number }> = [];
        for (let i = 0; i < photoFiles.length; i++) {
          let fileToUpload = photoFiles[i];
          try {
            fileToUpload = await cropImageToAspect(photoFiles[i], photoAspect);
          } catch { /* keep original */ }
          const uploaded = await uploadToBunny(fileToUpload, "image");
          if (!uploaded) { setLoading(false); return; }
          rows.push({
            title: photoTitle.trim() || null,
            description: photoDescription.trim() || null,
            category: photoCategory.toUpperCase(),
            image_url: uploaded.url,
            bunny_storage_path: uploaded.path,
            is_pro: false,
            uploaded_by: user?.id,
            set_id: setId,
            set_position: i,
          });
          setUploadProgress(Math.round(((i + 1) / photoFiles.length) * 100));
        }
        const { error: insertErr } = await supabase.from("quotes").insert(rows);
        if (insertErr) { setError(insertErr.message); setLoading(false); return; }
      } else if (activeType === "ad") {
        if (!adTitle.trim()) { setError("Ad title required"); setLoading(false); return; }
        let mediaUrl = "";
        let mediaType = adPlacement === "music" ? "audio" : "video";
        if (adSource === "url") {
          if (!adUrl.trim() || !isValidUrl(adUrl.trim())) { setError("Valid media URL required"); setLoading(false); return; }
          mediaUrl = adUrl.trim();
          if (adPlacement === "reels" && /\.(jpg|jpeg|png|webp|gif)$/i.test(mediaUrl)) mediaType = "image";
        } else {
          if (!adFile) { setError("Select a file"); setLoading(false); return; }
          const bucket = adPlacement === "music" ? "audio" : "videos";
          const url = await uploadFileToBucket(bucket, adFile);
          if (!url) { setLoading(false); return; }
          mediaUrl = url;
          if (adFile.type.startsWith("image/")) mediaType = "image";
          else if (adFile.type.startsWith("audio/")) mediaType = "audio";
          else mediaType = "video";
        }
        if (adLink.trim() && !isValidUrl(adLink.trim())) { setError("Invalid click-through URL"); setLoading(false); return; }
        const { error: insertErr } = await supabase.from("ads").insert({
          title: adTitle.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
          link_url: adLink.trim() || null,
          placement: adPlacement,
          active: true,
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
    ...(isAdmin ? [{ id: "ad" as UploadType, label: "Ad", icon: Megaphone }] : []),
  ];


  const SourceToggle = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { id: string; label: string; icon: typeof Link2 }[] }) => (
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
                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Title <span className="text-muted-foreground/60 normal-case">(optional)</span></label>
                  <input
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="e.g. Rise and Grind"
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Description</label>
                  <textarea
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Write a caption..."
                    rows={3}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Feed</label>
                  <div className="flex gap-2">
                    {UPLOAD_FEEDS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setVideoFeed(f.id)}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-semibold ${
                          videoFeed === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-[10px] mt-1">
                    Quick Clips is the short vertical feed. Long Game and Calm State hold full sessions up to 45 minutes (both appear under Long Game).
                  </p>
                </div>
                <div>

                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">{`Video file (from device, max ${videoFeed === "quick_spark" ? "3" : "45"} min)`}</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm file:bg-primary file:text-primary-foreground file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:text-xs"
                  />
                  {videoFile && <p className="text-muted-foreground text-[10px] mt-1">{videoFile.name}</p>}
                </div>

                {videoFeed !== "quick_spark" && (
                  <div>
                    <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Thumbnail <span className="text-muted-foreground/60 normal-case">(optional, 16:9)</span></label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
                      className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm file:bg-primary file:text-primary-foreground file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:text-xs"
                    />
                    {thumbPreviewUrl && (
                      <img src={thumbPreviewUrl} alt="Thumbnail preview" className="mt-2 w-40 aspect-video object-cover rounded-lg" />
                    )}
                  </div>
                )}



                {videoFile && (
                  <div>
                    <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Display mode</label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {([
                        { id: "cover", label: "Crop", hint: "Fill, trim edges" },
                        { id: "contain", label: "Fit", hint: "Full video, black bars" },
                        { id: "fill", label: "Expand", hint: "Stretch to fill" },
                      ] as const).map((m) => {
                        const active = videoFit === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setVideoFit(m.id)}
                            className={`py-2 rounded-lg text-[11px] font-semibold transition-all ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                          >
                            <div>{m.label}</div>
                            <div className="text-[9px] font-normal opacity-70">{m.hint}</div>
                          </button>
                        );
                      })}
                    </div>
                    {videoPreviewUrl ? (
                      <div className="relative w-full aspect-[9/16] max-h-72 bg-black rounded-xl overflow-hidden mx-auto">
                        <video
                          key={videoPreviewUrl + videoFit}
                          src={videoPreviewUrl}
                          className="absolute inset-0 w-full h-full"
                          style={{ objectFit: videoFit }}
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      </div>
                    ) : (
                      <div className="w-full p-4 rounded-xl bg-secondary text-muted-foreground text-[11px] text-center">
                        Preview hidden for large files to keep the app stable. Upload will work normally.
                      </div>
                    )}
                    <p className="text-muted-foreground text-[10px] mt-1.5 text-center">Viewers will see the video in this mode.</p>
                  </div>
                )}
              </>
            )}

            {activeType === "photo" && (
              <>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Title <span className="text-muted-foreground/60 normal-case">(optional)</span></label>
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
                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Description</label>
                  <textarea
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value)}
                    placeholder="Write a caption..."
                    rows={3}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Images (up to 20 — swipe carousel)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).slice(0, 20);
                      setPhotoFiles(files);
                    }}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm file:bg-primary file:text-primary-foreground file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:text-xs"
                  />
                  {photoFiles.length > 0 && (
                    <p className="text-muted-foreground text-[10px] mt-1">{photoFiles.length} photo{photoFiles.length > 1 ? "s" : ""} selected{photoFiles.length > 1 ? " (will be shown as a swipeable set)" : ""}</p>
                  )}
                </div>

                {photoFiles.length > 0 && (
                  <div>
                    <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Aspect ratio</label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {([
                        { id: "original", label: "Original" },
                        { id: "9:16", label: "9:16" },
                        { id: "1:1", label: "1:1" },
                        { id: "4:5", label: "4:5" },
                      ] as const).map((m) => {
                        const active = photoAspect === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPhotoAspect(m.id)}
                            className={`py-2 rounded-lg text-[11px] font-semibold transition-all ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {photoPreviewUrls.map((u, i) => (
                        <div key={i} className={`relative shrink-0 w-24 ${aspectClass[photoAspect]} bg-black rounded-lg overflow-hidden group`}>
                          <img src={u} alt={`preview ${i + 1}`} className="absolute inset-0 w-full h-full" style={{ objectFit: photoAspect === "original" ? "contain" : "cover" }} />
                          <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-semibold rounded px-1.5 py-0.5">{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => setPhotoFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            aria-label="Remove"
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[11px] flex items-center justify-center"
                          >×</button>
                          <div className="absolute bottom-1 left-1 right-1 flex gap-1 justify-between">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => setPhotoFiles((prev) => {
                                if (i === 0) return prev;
                                const next = [...prev];
                                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                return next;
                              })}
                              aria-label="Move left"
                              className="flex-1 h-5 rounded bg-black/70 text-white text-[11px] disabled:opacity-30"
                            >‹</button>
                            <button
                              type="button"
                              disabled={i === photoPreviewUrls.length - 1}
                              onClick={() => setPhotoFiles((prev) => {
                                if (i === prev.length - 1) return prev;
                                const next = [...prev];
                                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                                return next;
                              })}
                              aria-label="Move right"
                              className="flex-1 h-5 rounded bg-black/70 text-white text-[11px] disabled:opacity-30"
                            >›</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-[10px] mt-1.5 text-center">Reorder with ‹ ›, remove with ×. Each image is center-cropped to this ratio.</p>
                  </div>
                )}
              </>
            )}


            {activeType === "ad" && (
              <>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Ad Title / Sponsor</label>
                  <input
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="e.g. Sponsored by Acme"
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Placement</label>
                  <div className="flex gap-2">
                    {(["reels", "music"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAdPlacement(p)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize ${adPlacement === p ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                      >
                        {p === "reels" ? "Videos feed" : "Music"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Click-through URL (optional)</label>
                  <input
                    value={adLink}
                    onChange={(e) => setAdLink(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <SourceToggle
                  value={adSource}
                  onChange={(v) => setAdSource(v as AdSource)}
                  options={[
                    { id: "file", label: "From device", icon: FileVideo },
                    { id: "url", label: "Media URL", icon: Link2 },
                  ]}
                />
                {adSource === "file" ? (
                  <input
                    type="file"
                    accept={adPlacement === "music" ? "audio/*" : "video/*,image/*"}
                    onChange={(e) => setAdFile(e.target.files?.[0] || null)}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm file:bg-primary file:text-primary-foreground file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:text-xs"
                  />
                ) : (
                  <input
                    value={adUrl}
                    onChange={(e) => setAdUrl(e.target.value)}
                    placeholder={adPlacement === "music" ? "https://example.com/ad.mp3" : "https://example.com/ad.mp4 or .jpg"}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
                <p className="text-muted-foreground text-[11px]">
                  {adPlacement === "reels"
                    ? "Shown as a sponsored card in the Videos feed."
                    : "Plays as a short interstitial between music tracks."}
                </p>
              </>
            )}

            {error && <p className="text-destructive text-xs">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {success ? (<><Check size={18} />Published!</>) : loading ? (activeType === "video" && uploadProgress > 0 ? `Uploading ${uploadProgress}%` : "Publishing...") : (<><Upload size={16} />Publish</>)}
            </button>
          </div>
        </>
      )}

      {showMyUploads && <MyUploads />}
    </div>
  );
};

export default UploadTab;
