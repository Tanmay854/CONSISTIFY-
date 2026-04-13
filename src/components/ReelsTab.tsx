import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, LogIn, Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AddReelDialog from "./AddReelDialog";
import AuthSheet from "./AuthSheet";
import AdminPanel from "./AdminPanel";

interface Reel {
  id: string;
  title: string;
  video_url: string;
  author_name: string | null;
  created_at: string;
}

const defaultReels: Reel[] = [
  { id: "d1", title: "Rise Above", video_url: "", author_name: "Marcus Aurelius", created_at: "" },
  { id: "d2", title: "Unstoppable", video_url: "", author_name: "David Goggins", created_at: "" },
  { id: "d3", title: "Dream Big", video_url: "", author_name: "Steve Jobs", created_at: "" },
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

const getEmbedUrl = (url: string) => {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0&modestbranding=1&rel=0&showinfo=0`;
  return url;
};

const ReelCard = ({ reel, isActive, index }: { reel: Reel; isActive: boolean; index: number }) => {
  const hasVideo = reel.video_url && reel.video_url.length > 0;
  const isYoutube = hasVideo && /youtube|youtu\.be/.test(reel.video_url);
  const isDirectVideo = hasVideo && !isYoutube;
  const gradient = gradients[index % gradients.length];

  return (
    <div className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden">
      {hasVideo && isYoutube && isActive ? (
        <iframe
          src={getEmbedUrl(reel.video_url)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ border: "none", pointerEvents: "none" }}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      ) : hasVideo && isDirectVideo ? (
        <video
          src={reel.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay={isActive}
          loop
          muted
          playsInline
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />
      )}

      <div className="absolute inset-0 bg-background/40" />

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
        {isActive && (
          <>
            <div className="animate-float-up" style={{ animationDelay: "0.1s" }}>
              <span className="text-xs tracking-[0.3em] uppercase text-primary font-medium">
                {reel.title}
              </span>
            </div>
            {defaultQuotes[reel.id] && (
              <div className="animate-float-up mt-6" style={{ animationDelay: "0.3s" }}>
                <p className="font-display text-2xl leading-relaxed text-foreground font-medium">
                  "{defaultQuotes[reel.id]}"
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ReelsTab = () => {
  const { user, canUpload, isAdmin, signOut } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [reels, setReels] = useState<Reel[]>(defaultReels);
  const [showAdd, setShowAdd] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
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
        <div className="fixed top-0 left-0 right-0 z-30 px-4 pt-4 pb-2 bg-gradient-to-b from-background via-background/80 to-transparent flex items-center justify-between">
          <h2 className="text-foreground font-semibold text-lg">Reels</h2>
          <div className="flex items-center gap-2">
            {user && isAdmin && (
              <button
                onClick={() => setShowAdmin(true)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <Shield size={16} className="text-primary" />
              </button>
            )}
            {user && canUpload && (
              <button
                onClick={() => setShowAdd(true)}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              >
                <Plus size={18} className="text-primary-foreground" />
              </button>
            )}
            {user ? (
              <button
                onClick={signOut}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <LogOut size={16} className="text-muted-foreground" />
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <LogIn size={16} className="text-foreground" />
              </button>
            )}
          </div>
        </div>

        {reels.map((reel, index) => (
          <ReelCard key={reel.id} reel={reel} isActive={index === activeIndex} index={index} />
        ))}
      </div>

      <AddReelDialog open={showAdd} onClose={() => setShowAdd(false)} onAdded={fetchReels} />
      <AuthSheet open={showAuth} onClose={() => setShowAuth(false)} />
      <AdminPanel open={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
};

export default ReelsTab;
