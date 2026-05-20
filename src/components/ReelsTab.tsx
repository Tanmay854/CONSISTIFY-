import { useState, useRef, useEffect, useCallback } from "react";
import { Play, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Reel {
  id: string;
  title: string;
  video_url: string;
  author_name: string | null;
  description: string | null;
  created_at: string;
  trim_start: number | null;
  trim_end: number | null;
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

const getYoutubeId = (url: string): string | null => {
  const ytMatch = url.match(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return ytMatch ? ytMatch[1] : null;
};

const getEmbedUrl = (url: string, playing: boolean): string | null => {
  if (!isValidUrl(url)) return null;
  const ytId = getYoutubeId(url);
  if (ytId) {
    const params = new URLSearchParams({
      autoplay: playing ? "1" : "0", mute: "0", loop: "1", playlist: ytId,
      controls: "0", modestbranding: "1", rel: "0", showinfo: "0",
    });
    return `https://www.youtube.com/embed/${ytId}?${params.toString()}`;
  }
  return url;
};

const ReelCard = ({ reel, isActive, index, muted }: { reel: Reel; isActive: boolean; index: number; muted: boolean }) => {
  const hasVideo = reel.video_url && reel.video_url.length > 0 && isValidUrl(reel.video_url);
  const ytId = hasVideo ? getYoutubeId(reel.video_url) : null;
  const isYoutube = !!ytId;
  const isDirectVideo = hasVideo && !isYoutube;
  const gradient = gradients[index % gradients.length];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showIcon, setShowIcon] = useState(false);

  useEffect(() => {
    setIsPlaying(isActive);
    if (isActive && !reel.id.startsWith("d")) {
      supabase.from("content_views").insert({ content_type: "reel", content_id: reel.id });
    }
  }, [isActive, reel.id]);

  useEffect(() => {
    if (!isDirectVideo || !videoRef.current) return;
    videoRef.current.muted = muted;
    if (isPlaying && isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, isActive, isDirectVideo, muted]);

  const togglePlay = () => {
    if (!hasVideo) return;
    setIsPlaying((p) => !p);
    setShowIcon(true);
    setTimeout(() => setShowIcon(false), 600);
  };

  const ytEmbed = (url: string, playing: boolean): string | null => {
    if (!isValidUrl(url)) return null;
    const id = getYoutubeId(url);
    if (!id) return url;
    const params = new URLSearchParams({
      autoplay: playing ? "1" : "0",
      mute: muted ? "1" : "0",
      loop: "1", playlist: id,
      controls: "0", modestbranding: "1", rel: "0", showinfo: "0",
    });
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  };

  return (
    <div
      className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden cursor-pointer"
      onClick={togglePlay}
    >
      {hasVideo && isYoutube && isActive ? (
        <iframe
          key={`${isPlaying ? "play" : "pause"}-${muted ? "m" : "u"}`}
          src={ytEmbed(reel.video_url, isPlaying) || undefined}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ border: "none", pointerEvents: "none" }}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      ) : hasVideo && isDirectVideo ? (
        <video
          ref={videoRef}
          src={reel.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay={isActive}
          loop
          playsInline
          muted={muted}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.currentTime >= 180) {
              v.currentTime = 0;
            }
          }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />
      )}

      <div className="absolute inset-0 bg-background/40 pointer-events-none" />

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

      {/* Instagram-style title at bottom-left */}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from("reels")
      .select("*")
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

  // Build interleaved feed: 1 ad after every 5 reels
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
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-20 px-4 pt-4 pb-2 bg-gradient-to-b from-background via-background/80 to-transparent">
          <h2 className="text-foreground font-semibold text-lg">Videos</h2>
        </div>

        {feed.map((item, index) =>
          item.kind === "reel" ? (
            <ReelCard key={`r-${item.data.id}`} reel={item.data} isActive={index === activeIndex} index={index} muted={muted} />
          ) : (
            <AdCard key={`a-${item.data.id}-${index}`} ad={item.data} isActive={index === activeIndex} />
          )
        )}
        {hasMore && !usingDefaults && <div ref={sentinelRef} className="h-1" />}
      </div>

    </>
  );
};

export default ReelsTab;
