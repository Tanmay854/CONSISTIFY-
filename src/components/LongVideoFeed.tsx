import { useCallback, useEffect, useState } from "react";
import { X, Play, Clock } from "lucide-react";
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
  category: string;
  created_at: string;
}

const LongVideoFeed = ({ feed, heading, blurb }: { feed: string; heading: string; blurb: string }) => {
  const [videos, setVideos] = useState<LongVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<LongVideo | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("reels")
      .select("id,title,description,video_url,category,created_at")
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
    trackView("reel", v.id);
  }, []);

  return (
    <div className="h-[100dvh] overflow-y-auto scrollbar-hide overscroll-contain bg-background pb-28">
      <div className="px-4 pt-20">
        <TabBanner tab={feed} className="mb-5" />

        <h2 className="text-foreground font-display text-2xl font-bold tracking-tight">{heading}</h2>
        <p className="text-muted-foreground text-xs mt-1 mb-4">{blurb}</p>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <p className="text-muted-foreground text-sm py-16 text-center">Nothing here yet.</p>
        ) : (
          <div className="space-y-3">
            {videos.map((v) => {
              const thumb = getVideoThumbnail(v.video_url);
              return (
                <button
                  key={v.id}
                  onClick={() => open(v)}
                  className="w-full flex gap-3 items-center text-left bg-card border border-border rounded-2xl p-2.5 active:scale-[0.985] transition-transform"
                >
                  <div className="relative w-28 h-[4.5rem] rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                    {thumb ? (
                      <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : null}
                    <span className="absolute inset-0 flex items-center justify-center bg-background/25">
                      <Play size={18} className="text-foreground fill-foreground" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-semibold truncate">
                      {v.title || "Untitled"}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-2">
                      {v.description || v.category}
                    </p>
                    <span className="text-muted-foreground text-[10px] mt-1 inline-flex items-center gap-1">
                      <Clock size={10} /> Full session
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-foreground text-sm font-semibold truncate pr-3">{active.title || "Untitled"}</p>
            <button onClick={() => setActive(null)} aria-label="Close player" className="text-muted-foreground">
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <VideoPlayer
              src={getPlayableVideoUrl(active.video_url)}
              poster={getVideoThumbnail(active.video_url) || undefined}
              autoPlay
              fill
              fit="contain"
              className="h-full"
            />
          </div>
          {active.description && (
            <div className="max-h-40 overflow-y-auto px-4 py-4">
              <p className="text-muted-foreground text-xs whitespace-pre-wrap">{active.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LongVideoFeed;
