import { useState, useRef, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import Hls from "hls.js";
import { Play, ExternalLink, CircleAlert, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackView } from "@/lib/trackView";
import ReportDialog from "@/components/ReportDialog";
import UploaderProfileSheet from "@/components/UploaderProfileSheet";
import { fetchProfiles, getCachedProfile, type UploaderProfile } from "@/lib/uploaderProfiles";

// Attach an HLS (.m3u8) or progressive source to a <video>. Returns a cleanup fn.
// onReady fires when the stream is parsed and a play() can be attempted.
// onFail fires on a fatal error so the spinner can be cleared and UI can recover.
type NetworkInformationLike = { saveData?: boolean; effectiveType?: string };
type NavigatorWithConnection = Navigator & {
  deviceMemory?: number;
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

const attachHls = (
  video: HTMLVideoElement,
  url: string,
  startPosition = 0,
  onReady?: () => void,
  onFail?: (msg: string) => void,
): (() => void) => {
  const isHls = url.toLowerCase().includes(".m3u8");
  if (!isHls) {
    video.src = url;
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      onReady?.();
    };
    video.addEventListener("loadeddata", fire, { once: true });
    video.addEventListener("canplay", fire, { once: true });
    return () => {
      video.removeEventListener("loadeddata", fire);
      video.removeEventListener("canplay", fire);
    };
  }
  // Use native HLS only on Apple devices. Android WebView may claim native HLS
  // support but its ABR often starts blurry; hls.js lets us lock the first
  // buffered fragment to Bunny's highest rendition.
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isAppleDevice = /iPad|iPhone|iPod|Macintosh/i.test(ua);
  if (isAppleDevice && video.canPlayType("application/vnd.apple.mpegurl")) {
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      onReady?.();
    };
    video.src = url;
    video.addEventListener("loadeddata", fire, { once: true });
    video.addEventListener("canplay", fire, { once: true });
    return () => {
      video.removeEventListener("loadeddata", fire);
      video.removeEventListener("canplay", fire);
    };
  }
  if (Hls.isSupported()) {
    let retries = 0;
    let manifestCodecRetry = false;
    let retryTimer: number | null = null;
    let readyFallbackTimer: number | null = null;
    let nativeFallbackCleanup: (() => void) | null = null;
    let readyFired = false;
    const fallbackToNative = () => {
      if (nativeFallbackCleanup) return;
      try { hls.destroy(); } catch { /* empty */ }
      video.src = url;
      video.preload = "auto";
      const fire = () => fireReady();
      const fail = () => onFail?.("native hls error");
      video.addEventListener("loadeddata", fire, { once: true });
      video.addEventListener("canplay", fire, { once: true });
      video.addEventListener("error", fail, { once: true });
      try { video.load(); } catch { /* empty */ }
      nativeFallbackCleanup = () => {
        video.removeEventListener("loadeddata", fire);
        video.removeEventListener("canplay", fire);
        video.removeEventListener("error", fail);
      };
    };
    const createHls = (audio: boolean) => new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      // Let ABR pick a level the connection can actually sustain; assume a
      // modest ~3 Mbps starting estimate instead of forcing the top rendition.
      startLevel: -1,
      capLevelToPlayerSize: true,
      autoStartLoad: false,
      startFragPrefetch: true,
      abrEwmaDefaultEstimate: 3_000_000,
      maxStarvationDelay: 4,
      maxLoadingDelay: 4,
      maxBufferLength: 24,
      maxMaxBufferLength: 60,
      backBufferLength: 10,
      defaultAudioCodec: audio ? undefined : "mp4a.40.2",
    });
    let hls = createHls(false);
    const bindHls = (instance: Hls) => {
      instance.on(Hls.Events.MANIFEST_PARSED, () => {
        try { instance.startLoad(startPosition); } catch { /* empty */ }
      });

      // Show the video as soon as the first fragment of ANY quality is
      // buffered — waiting for the top rendition made slow connections
      // buffer forever.
      instance.on(Hls.Events.FRAG_BUFFERED, () => {
        fireReady();
      });

      instance.on(Hls.Events.LEVEL_LOADED, () => {
        if (!readyFired && !readyFallbackTimer) {
          readyFallbackTimer = window.setTimeout(fireReady, 1800);
        }
      });

      instance.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.details === Hls.ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR && !manifestCodecRetry) {
          manifestCodecRetry = true;
          try { instance.destroy(); } catch { /* empty */ }
          hls = createHls(true);
          bindHls(hls);
          hls.attachMedia(video);
          return;
        }
        if (data.details === Hls.ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR) {
          fallbackToNative();
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (retries < 24) {
            retries += 1;
            retryTimer = window.setTimeout(() => {
              try {
                instance.loadSource(url);
                instance.startLoad(startPosition);
              } catch { /* empty */ }
            }, Math.min(2500 * retries, 10000));
            return;
          }
          onFail?.(data.details || "network error");
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try { instance.recoverMediaError(); } catch { onFail?.(data.details || "media error"); }
        } else {
          onFail?.(data.details || "fatal hls error");
          try { instance.destroy(); } catch { /* empty */ }
        }
      });

      instance.on(Hls.Events.MEDIA_ATTACHED, () => {
        instance.loadSource(url);
        if (!readyFallbackTimer) readyFallbackTimer = window.setTimeout(fireReady, 3500);
      });
    };
    const fireReady = () => {
      if (readyFired) return;
      readyFired = true;
      onReady?.();
    };
    bindHls(hls);
    hls.attachMedia(video);
    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      
      if (readyFallbackTimer) window.clearTimeout(readyFallbackTimer);
      nativeFallbackCleanup?.();
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
  uploaded_by?: string | null;
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

// Detect slow / low-end devices so we can shrink the prebuffer window.
// Signals: low CPU cores, low device memory, or a Save-Data / 2g/3g network.
// Result: on slow devices we only mount current + next reel and only fully
// prebuffer the current one — keeping top quality but cutting jank.
const isSlowDevice = (() => {
  if (typeof navigator === "undefined") return false;
  try {
    const nav = navigator as NavigatorWithConnection;
    const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8;
    const mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    const saveData = !!conn?.saveData;
    const slowNet = conn?.effectiveType ? /^(slow-2g|2g|3g)$/.test(conn.effectiveType) : false;
    return cores <= 4 || mem <= 3 || saveData || slowNet;
  } catch {
    return false;
  }
})();

const ReelCard = ({ reel, isActive, distance, index, muted, onReport, uploaderProfile, onOpenProfile }: { reel: Reel; isActive: boolean; distance: number; index: number; muted: boolean; onReport: (r: Reel) => void; uploaderProfile: UploaderProfile | null; onOpenProfile: (userId: string) => void }) => {
  const hasVideo = reel.video_url && reel.video_url.length > 0 && isValidUrl(reel.video_url);
  const playableUrl = hasVideo ? getPlayableVideoUrl(reel.video_url) : "";
  const gradient = gradients[index % gradients.length];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showIcon, setShowIcon] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isQualityReady, setIsQualityReady] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const infoTimerRef = useRef<number | null>(null);
  const isActiveRef = useRef(isActive);
  const isPlayingRef = useRef(isPlaying);
  const mutedRef = useRef(muted);
  const qualityReadyRef = useRef(false);

  const trimStart = reel.trim_start ?? 0;
  const trimEnd = reel.trim_end ?? null;

  // Adaptive prebuffer: slow devices keep a tight window (current + next, only
  // current fully buffered). Capable devices keep the wider 2-neighbor window.
  const mountRadius = isSlowDevice ? 1 : 2;
  const autoPreloadRadius = isSlowDevice ? 0 : 1;
  const shouldMount = hasVideo && distance <= mountRadius;
  const preload = distance <= autoPreloadRadius ? "auto" : "metadata";
  const videoFit: CSSProperties["objectFit"] =
    reel.video_fit === "contain" || reel.video_fit === "fill" || reel.video_fit === "none" || reel.video_fit === "scale-down"
      ? reel.video_fit
      : "cover";

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

  useEffect(() => {
    isActiveRef.current = isActive;
    isPlayingRef.current = isPlaying;
    mutedRef.current = muted;
  }, [isActive, isPlaying, muted]);

  // Attach HLS / progressive source
  useEffect(() => {
    if (!shouldMount || !videoRef.current) return;
    const v = videoRef.current;
    qualityReadyRef.current = false;
    setIsQualityReady(false);
    setIsLoading(true);
    const cleanup = attachHls(
      v,
      playableUrl,
      trimStart,
      () => {
        // HLS already fired this after a top-quality fragment was buffered,
        // so start immediately instead of waiting for WebView's unreliable
        // canplaythrough event.
        qualityReadyRef.current = true;
        setIsQualityReady(true);
        setIsLoading(false);
        const tryPlay = () => {
          if (!isActiveRef.current || !isPlayingRef.current) return;
          v.muted = mutedRef.current;
          v.play().catch(() => {
            v.muted = true;
            v.play().catch(() => setIsLoading(false));
          });
        };
        tryPlay();
      },
      (msg) => {
        // Fatal HLS error — drop the spinner so the UI doesn't hang
        console.error("[ReelsTab] HLS error:", msg, playableUrl);
        setIsLoading(false);
      },
    );
    return cleanup;
  }, [shouldMount, playableUrl, trimStart]);

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
    // Always reflect the desired mute state — never let a stale forced-mute from
    // an earlier autoplay fallback survive into a user-initiated resume.
    v.muted = muted;
    if (!isActive) return;
    if (isPlaying) {
      if (!qualityReadyRef.current) {
        setIsLoading(true);
        return;
      }
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          // Re-assert mute state after play resolves; some browsers reset it.
          if (v.muted !== muted) v.muted = muted;
        }).catch(() => {
          // Only fall back to muted autoplay if the user actually wants sound off,
          // or if this is the very first playback (no user gesture yet).
          // A pause→resume click IS a user gesture, so unmuted play should succeed;
          // if it doesn't, surface the paused state instead of silently muting.
          setIsLoading(false);
        });
      }
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
      className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center overflow-hidden cursor-pointer"
      onClick={togglePlay}
    >
      {shouldMount ? (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-150 ${isActive && !isQualityReady ? "opacity-0" : "opacity-100"}`}
          style={{ objectFit: videoFit }}
          autoPlay={false}
          loop
          playsInline
          muted={muted}
          preload={preload}
          poster="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
          disablePictureInPicture
          controls={false}
          onLoadedMetadata={(e) => {
            if (trimStart > 0) e.currentTarget.currentTime = trimStart;
          }}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => { if (qualityReadyRef.current) setIsLoading(false); }}
          onCanPlay={() => { if (qualityReadyRef.current) setIsLoading(false); }}
          onLoadedData={() => { if (qualityReadyRef.current) setIsLoading(false); }}
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
          <div className="h-12 w-12 rounded-full border-2 border-foreground/25 border-t-foreground animate-spin" />
        </div>
      )}

      {hasVideo && (showIcon || !isPlaying) && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="bg-black/50 rounded-full p-6 animate-in fade-in zoom-in duration-200">
            <Play className="w-12 h-12 text-white fill-white" />
          </div>
        </div>
      )}

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
          className="absolute bottom-20 right-4 z-30 bg-secondary/80 rounded-full p-2 text-foreground/80 hover:text-foreground"
          aria-label="Report"
        >
          <CircleAlert size={14} />
        </button>
      )}

      <div className="absolute bottom-20 left-4 right-16 z-20">
        {reel.uploaded_by && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsPlaying(false); onOpenProfile(reel.uploaded_by!); }}
            className="flex items-center gap-2 mb-2"
          >
            <span className="w-7 h-7 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-1 ring-white/30 shrink-0">
              {uploaderProfile?.avatar_url ? (
                <img src={uploaderProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={14} className="text-white/80" />
              )}
            </span>
            <span className="text-white font-semibold text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
              {uploaderProfile?.username || (uploaderProfile?.display_name && !uploaderProfile.display_name.includes("@") ? uploaderProfile.display_name : "user")}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={toggleDescription}
          className="block text-left max-w-full"
        >
          <p className="text-white/95 font-medium text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
            {reel.title}
          </p>
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
const FETCH_WINDOW = 30;

const ReelsTab = ({ muted = false, feed: feedId = "quick_spark", active: paneActive = true }: { muted?: boolean; feed?: string; active?: boolean }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reels, setReels] = useState<Reel[]>(defaultReels);
  const [ads, setAds] = useState<Ad[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [usingDefaults, setUsingDefaults] = useState(true);
  const [reportTarget, setReportTarget] = useState<Reel | null>(null);
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [profilesVersion, setProfilesVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Batch-fetch uploader profiles for every loaded reel and refresh once available.
  useEffect(() => {
    const ids = Array.from(new Set(reels.map((r) => r.uploaded_by).filter((v): v is string => !!v)));
    const missing = ids.filter((id) => !getCachedProfile(id));
    if (missing.length === 0) return;
    fetchProfiles(missing).then(() => setProfilesVersion((v) => v + 1));
  }, [reels]);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + FETCH_WINDOW - 1;
    const { data } = await supabase
      .from("reels")
      .select("id,title,description,category,video_url,bunny_video_guid,bunny_library_id,video_fit,trim_start,trim_end,author_name,uploaded_by,created_at")
      .eq("feed", feedId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data) {
      const seen = new Set(readAnonReelHistory());
      const unseen = data.filter((r) => !seen.has(r.id));
      const pageData = (unseen.length > 0 ? unseen : data).slice(0, PAGE_SIZE);
      if (p === 0) {
        setReels(pageData);
        setUsingDefaults(false);
      } else {
        setReels((prev) => {
          const existing = new Set(prev.map((r) => r.id));
          return [...prev, ...pageData.filter((r) => !existing.has(r.id))];
        });
      }
      if (data.length < FETCH_WINDOW) setHasMore(false);
    }
    setLoading(false);
  }, [feedId]);

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
  // Referenced so ESLint/TS keep the setter subscription alive; state change already re-renders.
  void profilesVersion;
  reels.forEach((r, i) => {
    feed.push({ kind: "reel", data: r });
    if (ads.length > 0 && (i + 1) % 5 === 0) {
      feed.push({ kind: "ad", data: ads[adIdx % ads.length] });
      adIdx++;
    }
  });

  const lastSnapIndexRef = useRef(0);
  const snapTimerRef = useRef<number | null>(null);

  const enforceSingleSnap = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = el.clientHeight;
    const raw = el.scrollTop / h;
    const current = lastSnapIndexRef.current;
    // Clamp the jump to at most ±1 card per gesture — kills the "scrolled 2-3 at once" bug on WebView.
    let target = Math.round(raw);
    if (target > current + 1) target = current + 1;
    if (target < current - 1) target = current - 1;
    target = Math.max(0, Math.min(feed.length - 1, target));
    if (Math.abs(raw - target) > 0.02) {
      el.scrollTo({ top: target * h, behavior: "auto" });
    }
    lastSnapIndexRef.current = target;
    if (target !== activeIndex) setActiveIndex(target);
  }, [activeIndex, feed.length]);

  const handleScroll = () => {
    if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(enforceSingleSnap, 90);
  };

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onTouchEnd={() => { window.setTimeout(enforceSingleSnap, 60); }}
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-y-contain [scroll-snap-stop:always] [-webkit-overflow-scrolling:touch]"
      >



        {feed.map((item, index) =>
          item.kind === "reel" ? (
            <ReelCard
              key={`r-${item.data.id}`}
              reel={item.data}
              isActive={index === activeIndex}
              distance={Math.abs(index - activeIndex)}
              index={index}
              muted={muted}
              onReport={setReportTarget}
              uploaderProfile={item.data.uploaded_by ? getCachedProfile(item.data.uploaded_by) ?? null : null}
              onOpenProfile={setOpenProfileId}
            />
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

      {openProfileId && (
        <UploaderProfileSheet userId={openProfileId} onClose={() => setOpenProfileId(null)} />
      )}
    </>
  );
};

export default ReelsTab;
