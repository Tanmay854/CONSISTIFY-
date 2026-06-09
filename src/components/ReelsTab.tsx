import { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import { Play, ExternalLink, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackView } from "@/lib/trackView";
import ReportDialog from "@/components/ReportDialog";

const attachHls = (video: HTMLVideoElement, url: string): (() => void) => {
  if (!url.toLowerCase().includes(".m3u8")) {
    video.src = url;
    return () => {};
  }
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    return () => {};
  }
  if (Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true });
    hls.loadSource(url);
    hls.attachMedia(video);
    return () => hls.destroy();
  }
  video.src = url;
  return () => {};
};

interface Reel {
  id: string;
  title: string;
  video_url: string;
  author_name: string | null;
  description: string | null;
  created_at: string;
  trim_start: number | null;
  trim_end: number | null;
  video_fit?: string | null;
}


interface Ad {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  link_url: string | null;
}

type FeedItem = { kind: "reel"; data: Reel } | { kind: "ad"; data: Ad };

const defaultReels: Reel[] = [
  { id: "d1", title: "Rise Above", video_url: "", author_name: "Marcus Aurelius", description: null, created_at: "", trim_start: null, trim_end: null },
  { id: "d2", title: "Unstoppable", video_url: "", author_name: "David Goggins", description: null, created_at: "", trim_start: null, trim_end: null },
  { id: "d3", title: "Dream Big", video_url: "", author_name: "Steve Jobs", description: null, created_at: "", trim_start: null, trim_end: null },
];

const defaultQuotes: Record<string, string> = {
  d1: "The happiness of your life depends upon the quality of your thoughts.",
  d2: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your potential.",
  d3: "Your time is limited, so don't waste it living someone else's life.",
};

const gradients = [
  "from-amber-900/80 via-background to-background",
  "from-orange-900/60 via-background to-background",
  "from-yellow-900/50 via-background to-background",
  "from-red-900/50 via-background to-background",
  "from-emerald-900/50 via-background to-background",
];

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const ReelCard = ({ reel, isActive, distance, index, muted, onReport }: { reel: Reel; isActive: boolean; distance: number; index: number; muted: boolean; onReport: (r: Reel) => void }) => {
  const hasVideo = reel.video_url && reel.video_url.length > 0 && isValidUrl(reel.video_url);
  const gradient = gradients[index % gradients.length];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showIcon, setShowIcon] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const infoTimerRef = useRef<number | null>(null);

  const trimStart = reel.trim_start ?? 0;
  const trimEnd = reel.trim_end ?? null;

  // Preload a wider window so swipes feel instant like Instagram.
  const shouldMount = hasVideo && distance <= 2;
  const preload = distance <= 1 ? "auto" : "metadata";

  const revealInfo = () => {
    setShowInfo(true);
    if (infoTimerRef.current) window.clearTimeout(infoTimerRef.current);
    infoTimerRef.current = window.setTimeout(() => setShowInfo(false), 3500);
  };

  useEffect(() => () => { if (infoTimerRef.current) window.clearTimeout(infoTimerRef.current); }, []);

  useEffect(() => {
    setIsPlaying(isActive);
    if (isActive && !reel.id.startsWith("d")) {
      trackView("reel", reel.id);
    }
  }, [isActive, reel.id]);

  // Attach HLS once per mounted card; never tear down on swipe between neighbors.
  useEffect(() => {
    if (!shouldMount || !videoRef.current) return;
    const cleanup = attachHls(videoRef.current, reel.video_url);
    return cleanup;
  }, [shouldMount, reel.video_url]);

  useEffect(() => {
    if (!shouldMount || !videoRef.current) return;
    const v = videoRef.current;
    v.muted = muted;
    if (isActive) {
      try { v.currentTime = trimStart; } catch { /* empty */ }
      if (isPlaying) v.play().catch(() => {});
      else v.pause();
    } else {
      v.pause();
      try { v.currentTime = trimStart; } catch { /* empty */ }
    }
  }, [isPlaying, isActive, shouldMount, muted, trimStart]);

  const togglePlay = () => {
    revealInfo();
    if (!hasVideo) return;
    setIsPlaying((p) => !p);
    setShowIcon(true);
    setTimeout(() => setShowIcon(false), 600);
  };

  return (
    <div
      className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden cursor-pointer"
      onClick={togglePlay}
    >
      {shouldMount ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: (reel.video_fit as any) || "cover" }}
          autoPlay={isActive}
          loop
          playsInline
          muted={muted}
          preload={preload}
          onLoadedMetadata={(e) => {
            if (trimStart > 0) e.currentTarget.currentTime = trimStart;
          }}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          onLoadedData={() => setIsLoading(false)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            const end = trimEnd ?? Math.min(v.duration || 180, 180);
            if (v.currentTime >= end) {
              v.currentTime = trimStart;
              if (isPlaying) v.play().catch(() => {});
            }
          }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />
      )}


      <div className="absolute inset-0 bg-background/40 pointer-events-none" />

      {hasVideo && isActive && isLoading && !showIcon && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}

      {hasVideo && (showIcon || !isPlaying) && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="bg-black/50 rounded-full p-6 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <Play className="w-12 h-12 text-white fill-white" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse-glow"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i * 12) % 60}%`, animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </div>

      <div className="relative z-10 px-8 max-w-md mx-auto text-center">
        {isActive && defaultQuotes[reel.id] && (
          <div className="animate-float-up" style={{ animationDelay: "0.3s" }}>
            <p className="font-display text-2xl leading-relaxed text-foreground font-medium">
              "{defaultQuotes[reel.id]}"
            </p>
          </div>
        )}
      </div>

      {/* Report button */}
      {!reel.id.startsWith("d") && (
        <button
          onClick={(e) => { e.stopPropagation(); onReport(reel); }}
          className="absolute bottom-[72px] right-4 z-30 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white/80 hover:text-white"
          aria-label="Report"
        >
          <Flag size={14} />
        </button>
      )}

      <div className="absolute bottom-24 left-4 right-16 z-20 pointer-events-none">
        <p className="text-white font-semibold text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
          {reel.title}
        </p>
        {reel.author_name && (
          <p className="text-white/80 text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate mt-0.5">
            {reel.author_name}
          </p>
        )}
        {reel.description && (
          <p className="text-white/90 text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1.5 line-clamp-3 whitespace-pre-wrap">
            {reel.description}
          </p>
        )}
      </div>
    </div>
  );
};

const AdCard = ({ ad, isActive }: { ad: Ad; isActive: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [isActive]);
  const isVideo = ad.media_type === "video";
  return (
    <div className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden bg-black">
      {isVideo ? (
        <video ref={videoRef} src={ad.media_url} className="absolute inset-0 w-full h-full object-cover" loop playsInline muted={!isActive} />
      ) : (
        <img src={ad.media_url} alt={ad.title} className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      <div className="absolute top-16 left-4 z-20 bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
        Sponsored
      </div>
      <div className="absolute bottom-24 left-4 right-4 z-20 space-y-3">
        <p className="text-white font-semibold text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{ad.title}</p>
        {ad.link_url && (
          <a
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold"
          >
            Learn more <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
};

const PAGE_SIZE = 5;

const ReelsTab = ({ muted = false }: { muted?: boolean }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reels, setReels] = useState<Reel[]>(defaultReels);
  const [ads, setAds] = useState<Ad[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [usingDefaults, setUsingDefaults] = useState(true);
  const [reportTarget, setReportTarget] = useState<Reel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from("reels")
      .select("id,title,description,category,video_url,video_fit,trim_start,trim_end,author_name,uploaded_by,created_at")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data) {
      if (p === 0) {
        if (data.length > 0) {
          setReels(data);
          setUsingDefaults(false);
        }
      } else {
        setReels((prev) => [...prev, ...data]);
      }
      if (data.length < PAGE_SIZE) setHasMore(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPage(0);
    supabase.from("ads").select("id,title,media_url,media_type,link_url")
      .eq("placement", "reels").eq("active", true)
      .then(({ data }) => { if (data) setAds(data as Ad[]); });
  }, [fetchPage]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || usingDefaults) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((p) => {
          const next = p + 1;
          fetchPage(next);
          return next;
        });
      }
    }, { root: containerRef.current, rootMargin: "600px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, fetchPage, reels.length, usingDefaults]);

  const feed: FeedItem[] = [];
  let adIdx = 0;
  reels.forEach((r, i) => {
    feed.push({ kind: "reel", data: r });
    if (ads.length > 0 && (i + 1) % 5 === 0) {
      feed.push({ kind: "ad", data: ads[adIdx % ads.length] });
      adIdx++;
    }
  });

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const height = containerRef.current.clientHeight;
      const newIndex = Math.round(scrollTop / height);
      if (newIndex !== activeIndex) setActiveIndex(newIndex);
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        <div className="fixed top-0 left-0 right-0 z-20 px-4 pt-4 pb-2 bg-gradient-to-b from-background via-background/80 to-transparent">
          <h2 className="text-foreground font-semibold text-lg">Videos</h2>
        </div>

        {feed.map((item, index) =>
          item.kind === "reel" ? (
            <ReelCard key={`r-${item.data.id}`} reel={item.data} isActive={index === activeIndex} distance={Math.abs(index - activeIndex)} index={index} muted={muted} onReport={setReportTarget} />
          ) : (
            <AdCard key={`a-${item.data.id}-${index}`} ad={item.data} isActive={index === activeIndex} />
          )
        )}
        {hasMore && !usingDefaults && <div ref={sentinelRef} className="h-1" />}
      </div>

      {reportTarget && (
        <ReportDialog
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          contentType="video"
          contentId={reportTarget.id}
          contentTitle={reportTarget.title}
        />
      )}
    </>
  );
};

export default ReelsTab;
