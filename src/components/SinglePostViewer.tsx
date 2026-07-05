import { useEffect, useState } from "react";
import { X, CircleAlert } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import ReportDialog from "@/components/ReportDialog";
import { supabase } from "@/integrations/supabase/client";
import { getVideoThumbnail } from "@/lib/thumbUrl";

type ReelPost = {
  kind: "reel";
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  video_fit?: string | null;
  trim_start?: number | null;
};

type QuotePost = {
  kind: "quote";
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  category: string;
  set_id: string | null;
};

export type PostForViewer = ReelPost | QuotePost;

const getPlayableVideoUrl = (url: string): string => {
  const t = url.trim();
  const m = t.match(/^(https?:\/\/[^/]+\.b-cdn\.net)\/([0-9a-fA-F-]{36})(?:\/|$)/);
  if (m) return `${m[1]}/${m[2]}/playlist.m3u8`;
  const md = t.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-fA-F-]{36})/i);
  if (md) return `https://vz-${md[1]}.b-cdn.net/${md[2]}/playlist.m3u8`;
  return t;
};

const SinglePostViewer = ({ post, onClose }: { post: PostForViewer; onClose: () => void }) => {
  const [setImages, setSetImages] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (post.kind !== "quote") return;
    if (!post.set_id) { setSetImages([post.image_url]); return; }
    (async () => {
      const { data } = await supabase
        .from("quotes")
        .select("image_url, set_position")
        .eq("set_id", post.set_id!)
        .order("set_position", { ascending: true });
      const imgs = (data || []).map((r) => r.image_url);
      setSetImages(imgs.length > 0 ? imgs : [post.image_url]);
    })();
  }, [post]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
      >
        <X size={20} className="text-white" />
      </button>

      {post.kind === "reel" ? (
        <div
          className="w-full h-full bg-black"
          style={{
            backgroundImage: getVideoThumbnail(post.video_url) ? `url(${getVideoThumbnail(post.video_url)})` : undefined,
            backgroundSize: (post.video_fit as string) === "cover" ? "cover" : "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <VideoPlayer
            src={getPlayableVideoUrl(post.video_url)}
            poster={getVideoThumbnail(post.video_url) || undefined}
            autoPlay
            loop
            muted
            fit={((post.video_fit as string) === "cover" ? "cover" : "contain")}
            fill
          />
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center">
          {setImages && setImages.length > 0 && (
            <>
              <img
                src={setImages[idx]}
                alt={post.title || "photo"}
                className="max-w-full max-h-full object-contain"
              />
              {setImages.length > 1 && (
                <>
                  <button
                    onClick={() => setIdx((i) => Math.max(0, i - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 rounded-full w-9 h-9 text-white"
                    aria-label="Previous"
                  >‹</button>
                  <button
                    onClick={() => setIdx((i) => Math.min(setImages.length - 1, i + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 rounded-full w-9 h-9 text-white"
                    aria-label="Next"
                  >›</button>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {setImages.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Report (top of stack) */}
      <button
        onClick={() => setShowReport(true)}
        aria-label="Report"
        className="absolute bottom-20 right-4 z-30 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/80"
      >
        <CircleAlert size={13} />
      </button>

      {/* Mute (only for videos) */}
      {post.kind === "reel" && (
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute bottom-10 right-4 z-30 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
        >
          {muted ? <VolumeX size={13} className="text-white" /> : <Volume2 size={13} className="text-white" />}
        </button>
      )}

      {(post.title || post.description) && (
        <div className="absolute bottom-6 left-4 right-16 z-10 pointer-events-none">
          {post.title && (
            <p className="text-white text-sm font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
              {post.title}
            </p>
          )}
          {post.description && (
            <p className="text-white/85 text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1 line-clamp-3 whitespace-pre-wrap">
              {post.description}
            </p>
          )}
        </div>
      )}

      {showReport && (
        <ReportDialog
          open={showReport}
          onClose={() => setShowReport(false)}
          contentType={post.kind === "reel" ? "video" : "photo"}
          contentId={post.id}
          contentTitle={post.title || "Untitled"}
        />
      )}
    </div>
  );
};

export default SinglePostViewer;
