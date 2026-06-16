import { useState, useRef } from "react";
import { X, Upload, Link as LinkIcon } from "lucide-react";
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

type Mode = "upload" | "url";

const AddReelDialog = ({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) => {
  const [mode, setMode] = useState<Mode>("upload");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setTitle(""); setVideoUrl(""); setFile(null); setProgress(0); setError(null); setLoading(false);
  };

  const isValidUrl = (url: string): boolean => {
    try { const p = new URL(url); return p.protocol === "https:" || p.protocol === "http:"; }
    catch { return false; }
  };

  const handleUrlSubmit = async () => {
    if (!isValidUrl(videoUrl.trim())) {
      setError("Enter a valid URL"); return;
    }
    setLoading(true); setError(null);
    const { error: insErr } = await supabase.from("reels").insert({
      title: title.trim() || null, video_url: videoUrl.trim(),
    });
    setLoading(false);
    if (insErr) { setError(insErr.message); return; }
    reset(); onAdded(); onClose();
  };


  const handleFileUpload = async () => {
    if (!title.trim() || !file) { setError("Enter a title and select a video"); return; }
    setLoading(true); setError(null); setProgress(0);

    // 1. Ask edge function to create the Bunny video + signature
    const { data, error: fnErr } = await supabase.functions.invoke("bunny-create-video", {
      body: { title: title.trim() },
    });
    if (fnErr || !data?.guid) {
      setError(fnErr?.message || data?.error || "Failed to start upload");
      setLoading(false); return;
    }

    // 2. TUS upload directly to Bunny.net
    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: data.tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        // Small chunks + no resume storage so mobile WebViews don't OOM
        chunkSize: 2 * 1024 * 1024,
        parallelUploads: 1,
        storeFingerprintForResuming: false,
        removeFingerprintOnSuccess: true,
        headers: {
          AuthorizationSignature: data.signature,
          AuthorizationExpire: String(data.expire),
          VideoId: data.guid,
          LibraryId: String(data.libraryId),
        },
        metadata: { filetype: file.type, title: title.trim() },
        onError: (err) => reject(err),
        onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
        onSuccess: () => resolve(),
      });
      upload.start();
    }).catch((err) => {
      setError("Upload failed: " + (err?.message || String(err)));
    });

    if (error) { setLoading(false); return; }

    // 3. Save the playback URL and exact Bunny Stream identifiers into the reels table
    const { error: insErr } = await supabase.from("reels").insert({
      title: title.trim(),
      video_url: data.playbackUrl,
      bunny_video_guid: data.guid,
      bunny_library_id: String(data.libraryId),
    });
    setLoading(false);
    if (insErr) { setError(insErr.message); return; }
    reset(); onAdded(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-foreground font-semibold text-lg">Add Video</h3>
          <button onClick={onClose}><X size={20} className="text-muted-foreground" /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode("upload")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold ${mode==="upload" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <Upload size={14} /> Upload File
          </button>
          <button onClick={() => setMode("url")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold ${mode==="url" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <LinkIcon size={14} /> Paste URL
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rise and Grind"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
          </div>

          {mode === "url" ? (
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Video URL</label>
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube, MP4 or HLS link"
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ) : (
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Video file</label>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-xs file:font-semibold" />
              {file && <p className="text-muted-foreground text-xs mt-1.5">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
              {loading && progress > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">Uploading {progress}%</p>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}

          <button onClick={mode === "url" ? handleUrlSubmit : handleFileUpload}
            disabled={loading || !title.trim() || (mode === "url" ? !videoUrl.trim() : !file)}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
            {loading ? (mode === "upload" ? `Uploading${progress ? ` ${progress}%` : "..."}` : "Adding...") : (mode === "upload" ? "Upload Video" : "Add Video")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddReelDialog;
