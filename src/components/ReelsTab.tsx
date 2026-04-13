import { useState, useRef } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Play } from "lucide-react";

interface Reel {
  id: number;
  title: string;
  author: string;
  quote: string;
  likes: string;
  comments: string;
  gradient: string;
}

const reelsData: Reel[] = [
  {
    id: 1,
    title: "Rise Above",
    author: "Marcus Aurelius",
    quote: "The happiness of your life depends upon the quality of your thoughts.",
    likes: "124K",
    comments: "2.3K",
    gradient: "from-amber-900/80 via-background to-background",
  },
  {
    id: 2,
    title: "Unstoppable",
    author: "David Goggins",
    quote: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your potential.",
    likes: "89K",
    comments: "1.8K",
    gradient: "from-orange-900/60 via-background to-background",
  },
  {
    id: 3,
    title: "Dream Big",
    author: "Steve Jobs",
    quote: "Your time is limited, so don't waste it living someone else's life.",
    likes: "256K",
    comments: "5.1K",
    gradient: "from-yellow-900/50 via-background to-background",
  },
  {
    id: 4,
    title: "Never Quit",
    author: "Muhammad Ali",
    quote: "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.'",
    likes: "312K",
    comments: "7.2K",
    gradient: "from-red-900/50 via-background to-background",
  },
  {
    id: 5,
    title: "Be Fearless",
    author: "Nelson Mandela",
    quote: "I learned that courage was not the absence of fear, but the triumph over it.",
    likes: "198K",
    comments: "3.9K",
    gradient: "from-emerald-900/50 via-background to-background",
  },
];

const ReelCard = ({ reel, isActive }: { reel: Reel; isActive: boolean }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${reel.gradient}`} />
      
      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse-glow"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i * 12) % 60}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 max-w-md mx-auto text-center">
        {isActive && (
          <>
            <div className="animate-float-up" style={{ animationDelay: "0.1s" }}>
              <span className="text-xs tracking-[0.3em] uppercase text-primary font-medium">
                {reel.title}
              </span>
            </div>
            <div className="animate-float-up mt-6" style={{ animationDelay: "0.3s" }}>
              <p className="font-display text-2xl md:text-3xl leading-relaxed text-foreground font-medium">
                "{reel.quote}"
              </p>
            </div>
            <div className="animate-float-up mt-6" style={{ animationDelay: "0.5s" }}>
              <p className="text-muted-foreground text-sm">— {reel.author}</p>
            </div>
          </>
        )}
      </div>

      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20">
        <button onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-1">
          <Heart
            size={26}
            className={liked ? "fill-red-500 text-red-500" : "text-foreground"}
          />
          <span className="text-[10px] text-foreground/70">{reel.likes}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <MessageCircle size={26} className="text-foreground" />
          <span className="text-[10px] text-foreground/70">{reel.comments}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Share2 size={26} className="text-foreground" />
        </button>
        <button onClick={() => setSaved(!saved)} className="flex flex-col items-center gap-1">
          <Bookmark
            size={26}
            className={saved ? "fill-primary text-primary" : "text-foreground"}
          />
        </button>
      </div>

      {/* Bottom author bar */}
      <div className="absolute bottom-20 left-4 right-16 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary text-xs font-bold">{reel.author[0]}</span>
          </div>
          <div>
            <p className="text-foreground text-sm font-semibold">{reel.author}</p>
            <p className="text-muted-foreground text-xs">Motivational Speaker</p>
          </div>
          <button className="ml-auto border border-primary/50 text-primary text-xs px-3 py-1 rounded-lg font-medium">
            Follow
          </button>
        </div>
      </div>
    </div>
  );
};

const ReelsTab = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const height = containerRef.current.clientHeight;
      const newIndex = Math.round(scrollTop / height);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
    >
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 px-4 pt-4 pb-2 bg-gradient-to-b from-background via-background/80 to-transparent">
        <h2 className="text-foreground font-semibold text-lg">Reels</h2>
      </div>

      {reelsData.map((reel, index) => (
        <ReelCard key={reel.id} reel={reel} isActive={index === activeIndex} />
      ))}
    </div>
  );
};

export default ReelsTab;
