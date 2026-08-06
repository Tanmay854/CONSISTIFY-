import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VideoPlayer from "@/components/VideoPlayer";
import TabBanner from "@/components/TabBanner";
import { getVideoThumbnail } from "@/lib/thumbUrl";
import { getPlayableVideoUrl } from "@/lib/videoFeeds";
import { trackView } from "@/lib/trackView";

interface LongVideo {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  created_at: string;
}


const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "Today";
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${d >= 14 ? "s" : ""} ago`;
  if (d < 365) return `${Math.floor(d / 30)} month${d >= 60 ? "s" : ""} ago`;
  return `${Math.floor(d / 365)} year${d >= 730 ? "s" : ""} ago`;
};

/** YouTube-style card: full-width 16:9 thumbnail, title below, meta line. */
const VideoCard = ({ v, onOpen, compact = false }: { v: LongVideo; onOpen: () => void; compact?: boolean }) => {
  const thumb = getVideoThumbnail(v.video_url, v.thumbnail_url);
  if (compact) {
    return (
      <button onClick={onOpen} className="w-full flex gap-2.5 text-left active:opacity-70 transition-opacity">
        <div className="w-40 aspect-video rounded-lg overflow-hidden bg-secondary flex-shrink-0">
          {thumb && <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-foreground text-[13px] font-medium leading-snug line-clamp-2">{v.title || "Untitled"}</p>
          <p className="text-muted-foreground text-[11px] mt-1 truncate">{v.category} · {timeAgo(v.created_at)}</p>
        </div>
      </button>
    );
  }
  return (
    <button onClick={onOpen} className="w-full text-left active:opacity-70 transition-opacity">
      <div className="w-full aspect-video overflow-hidden bg-secondary sm:rounded-xl">
        {thumb && <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-foreground text-[15px] font-medium leading-snug line-clamp-2">{v.title || "Untitled"}</p>
        <p className="text-muted-foreground text-xs mt-1 truncate">{v.category} · {timeAgo(v.created_at)}</p>
      </div>
    </button>
  );
};

const LongVideoFeed = ({ feed, heading, blurb }: { feed: string; heading: string; blurb: string }) => {
  const [videos, setVideos] = useState<LongVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<LongVideo | null>(null);
  const [descOpen, setDescOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("reels")
      .select("id,title,description,video_url,thumbnail_url,category,created_at")
      .eq("feed", feed)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (cancelled) return;
        setVideos((data as LongVideo[]) || []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [feed]);

  const open = useCallback((v: LongVideo) => {
    setActive(v);
    setDescOpen(false);
    trackView("reel", v.id);
  }, []);

  const upNext = useMemo(
    () => (active ? videos.filter((v) => v.id !== active.id) : []),
    [videos, active],
  );

  return (
    <div className="h-[100dvh] overflow-y-auto scrollbar-hide overscroll-contain bg-background pb-28">
      <div className="pt-16">
        <div className="px-4">
          <TabBanner tab={feed} className="mb-4" />
          <h2 className="text-foreground font-brand text-lg">{heading}</h2>
          <p className="text-muted-foreground text-xs mt-1 mb-3">{blurb}</p>
        </div>

        {loading ? (
          <div className="space-y-5 px-0">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="w-full aspect-video bg-secondary animate-pulse" />
                <div className="h-3 w-2/3 bg-secondary animate-pulse mx-3 mt-3 rounded" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <p className="text-muted-foreground text-sm py-16 text-center">Nothing here yet.</p>
        ) : (
          <div className="space-y-4">
            {videos.map((v) => (
              <VideoCard key={v.id} v={v} onOpen={() => open(v)} />
            ))}
          </div>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
          {/* Player pinned at top, YouTube watch-page style */}
          <div className="relative w-full aspect-video bg-black flex-shrink-0">
            <VideoPlayer
              key={active.id}
              src={getPlayableVideoUrl(active.video_url)}
              poster={getVideoThumbnail(active.video_url, active.thumbnail_url) || undefined}
              autoPlay
              fill
              fit="contain"
              allowRotate
              className="h-full"
            />

            <button
              onClick={() => setActive(null)}
              aria-label="Close player"
              className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Metadata + up next */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            <div className="px-4 pt-3">
              <h1 className="text-foreground text-base font-semibold leading-snug">{active.title || "Untitled"}</h1>

              <p className="text-muted-foreground text-xs mt-1">{active.category} · {timeAgo(active.created_at)}</p>

              {active.description && (
                <button
                  onClick={() => setDescOpen((d) => !d)}
                  className="mt-3 w-full text-left bg-secondary/60 rounded-xl p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-muted-foreground text-xs whitespace-pre-wrap ${descOpen ? "" : "line-clamp-2"}`}>
                      {active.description}
                    </p>
                    {descOpen ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
                  </div>
                </button>
              )}
            </div>

            {upNext.length > 0 && (
              <div className="mt-5 px-4 pb-24 space-y-3.5">
                <p className="text-foreground text-sm font-semibold">Up next</p>
                {upNext.map((v) => (
                  <VideoCard key={v.id} v={v} compact onOpen={() => open(v)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LongVideoFeed;
