import { useState, useRef, useEffect, useCallback } from "react";
import { Play } from "lucide-react";
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

const ReelCard = ({ reel, isActive, index }: { reel: Reel; isActive: boolean; index: number }) => {
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
    if (isPlaying && isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, isActive, isDirectVideo]);

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
      {hasVideo && isYoutube && isActive ? (
        <iframe
          key={isPlaying ? "play" : "pause"}
          src={getEmbedUrl(reel.video_url, isPlaying)}
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

const ReelsTab = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reels, setReels] = useState<Reel[]>(defaultReels);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReels = useCallback(async () => {
    const { data } = await supabase.from("reels").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) {
      setReels(data);
    }
  }, []);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

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

        {reels.map((reel, index) => (
          <ReelCard key={reel.id} reel={reel} isActive={index === activeIndex} index={index} />
        ))}
      </div>

    </>
  );
};

export default ReelsTab;
