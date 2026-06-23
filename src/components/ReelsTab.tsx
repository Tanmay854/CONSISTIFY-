import { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import { Play, ExternalLink, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackView } from "@/lib/trackView";
import ReportDialog from "@/components/ReportDialog";

// Attach an HLS (.m3u8) or progressive source to a <video>. Returns a cleanup fn.
// onReady fires when the stream is parsed and a play() can be attempted.
// onFail fires on a fatal error so the spinner can be cleared and UI can recover.
const attachHls = (
  video: HTMLVideoElement,
  url: string,
  onReady?: () => void,
  onFail?: (msg: string) => void,
): (() => void) => {
  const isHls = url.toLowerCase().includes(".m3u8");
  if (!isHls) {
    video.src = url;
    return () => {};
  }
  // Safari / iOS — native HLS
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    return () => {};
  }
  if (Hls.isSupported()) {
    let retries = 0;
    let retryTimer: number | null = null;
    const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hls.on(Hls.Events.MANIFEST_PARSED, () => { onReady?.(); });
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        if (retries < 24) {
          retries += 1;
          retryTimer = window.setTimeout(() => {
            try {
              hls.loadSource(url);
              hls.startLoad();
            } catch { /* empty */ }
          }, Math.min(2500 * retries, 10000));
          return;
        }
        onFail?.(data.details || "network error");
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        try { hls.recoverMediaError(); } catch { onFail?.(data.details || "media error"); }
      } else {
        onFail?.(data.details || "fatal hls error");
        try { hls.destroy(); } catch { /* empty */ }
      }
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      try { hls.destroy(); } catch { /* empty */ }
    };
  }
  // Last-resort: let the browser try
  video.src = url;
  return () => {};
};

const getPlayableVideoUrl = (url: string): string => {
  const trimmed = url.trim();
  const streamCdn = trimmed.match(/^(https?:\/\/[^/]+\.b-cdn\.net)\/([0-9a-fA-F-]{36})(?:\/|$)/);
  if (streamCdn) return `${streamCdn[1]}/${streamCdn[2]}/playlist.m3u8`;

  const mediaDelivery = trimmed.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-fA-F-]{36})/i);
  if (mediaDelivery) return `https://vz-${mediaDelivery[1]}.b-cdn.net/${mediaDelivery[2]}/playlist.m3u8`;

  return trimmed;
};

interface Reel {
  id: string;
  title: string | null;
  video_url: string;
  author_name: string | null;
  description: string | null;
  created_at: string;
  trim_start: number | null;
  trim_end: number | null;
  video_fit?: string | null;
  bunny_video_guid?: string | null;
  bunny_library_id?: string | null;
}



interface Ad {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  link_url: string | null;
}

type FeedItem = { kind: "reel"; data: Reel } | { kind: "ad"; data: Ad };

const defaultReels: Reel[] = [];
const defaultQuotes: Record<string, string> = {};
const ANON_REEL_HISTORY_KEY = "anon_reel_history_v1";
const REEL_HISTORY_LIMIT = 500;

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

const readAnonReelHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(ANON_REEL_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const rememberAnonReel = (id: string) => {
  try {
    const next = [id, ...readAnonReelHistory().filter((seenId) => seenId !== id)].slice(0, REEL_HISTORY_LIMIT);
    localStorage.setItem(ANON_REEL_HISTORY_KEY, JSON.stringify(next));
  } catch { /* best-effort */ }
};

const ReelCard = ({ reel, isActive, distance, index, muted, onReport }: { reel: Reel; isActive: boolean; distance: number; index: number; muted: boolean; onReport: (r: Reel) => void }) => {
  const hasVideo = reel.video_url && reel.video_url.length > 0 && isValidUrl(reel.video_url);
  const playableUrl = hasVideo ? getPlayableVideoUrl(reel.video_url) : "";
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
  const shouldMount = hasVideo && distance <= 1;
  const preload = distance === 0 ? "auto" : "metadata";

  const toggleDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfo((s) => {
      const next = !s;
      if (infoTimerRef.current) window.clearTimeout(infoTimerRef.current);
      if (next) infoTimerRef.current = window.setTimeout(() => setShowInfo(false), 5000);
      return next;
    });
  };

  useEffect(() => () => { if (infoTimerRef.current) window.clearTimeout(infoTimerRef.current); }, []);

  useEffect(() => {
    setIsPlaying(isActive);
    if (isActive && !reel.id.startsWith("d")) {
      trackView("reel", reel.id);
      rememberAnonReel(reel.id);
    }
  }, [isActive, reel.id]);

  // Attach HLS / progressive source
  useEffect(() => {
    if (!shouldMount || !videoRef.current) return;
    const v = videoRef.current;
    const cleanup = attachHls(
      v,
      playableUrl,
      () => {
        // Manifest parsed → try to start playback if this card is active
        if (isActive && isPlaying) {
          v.play().catch(() => {
            v.muted = true;
            v.play().catch(() => setIsLoading(false));
          });
        }
      },
      (msg) => {
        // Fatal HLS error — drop the spinner so the UI doesn't hang
        console.error("[ReelsTab] HLS error:", msg, playableUrl);
        setIsLoading(false);
      },
    );
    return cleanup;
  }, [shouldMount, playableUrl]);

  // Reset to trimStart only when the active card changes — NOT on every pause/play toggle.
  useEffect(() => {
    if (!shouldMount || !videoRef.current) return;
    const v = videoRef.current;
    if (isActive) {
      try { v.currentTime = trimStart; } catch { /* empty */ }
    } else {
      v.pause();
      try { v.currentTime = trimStart; } catch { /* empty */ }
    }
  }, [isActive, shouldMount, trimStart]);

  // Play/pause + mute respond to user toggles WITHOUT seeking, so resume continues from where it stopped.
  useEffect(() => {
    if (!shouldMount || !videoRef.current) return;
    const v = videoRef.current;
    v.muted = muted;
    if (!isActive) return;
    if (isPlaying) {
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => { setIsLoading(false); });
      });
    } else {
      v.pause();
    }
  }, [isPlaying, isActive, shouldMount, muted]);


  const togglePlay = () => {
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
          onError={() => setIsLoading(false)}
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

      {!reel.id.startsWith("d") && (
        <button
          onClick={(e) => { e.stopPropagation(); onReport(reel); }}
          className="absolute bottom-[72px] right-4 z-30 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white/80 hover:text-white"
          aria-label="Report"
        >
          <Flag size={14} />
        </button>
      )}

      <div className="absolute bottom-20 left-4 right-16 z-20">
        <button
          type="button"
          onClick={toggleDescription}
          className="block text-left max-w-full"
        >
          <p className="text-white/95 font-medium text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
            {reel.title}
          </p>
          {reel.author_name && reel.author_name.toLowerCase() !== "anonymous" && (
            <p className="text-white/70 text-[10px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate mt-0.5">
              {reel.author_name}
            </p>
          )}
        </button>
        {reel.description && (
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showInfo ? "max-h-48 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
            }`}
          >
            <p className="text-white/90 text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-6 whitespace-pre-wrap">
              {reel.description}
            </p>
          </div>
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
      .select("id,title,description,category,video_url,bunny_video_guid,bunny_library_id,video_fit,trim_start,trim_end,author_name,uploaded_by,created_at")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data) {
      const seen = new Set(readAnonReelHistory());
      const freshFirst = [...data].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
      if (p === 0) {
        setReels(freshFirst);
        setUsingDefaults(false);
      } else {
        setReels((prev) => {
          const existing = new Set(prev.map((r) => r.id));
          return [...prev, ...freshFirst.filter((r) => !existing.has(r.id))];
        });
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
          contentTitle={reportTarget.title || "Untitled"}
        />
      )}
    </>
  );
};

export default ReelsTab;
