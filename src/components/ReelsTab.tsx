import { useState, useRef } from "react";

interface Reel {
  id: number;
  title: string;
  author: string;
  quote: string;
  gradient: string;
}

const reelsData: Reel[] = [
  {
    id: 1,
    title: "Rise Above",
    author: "Marcus Aurelius",
    quote: "The happiness of your life depends upon the quality of your thoughts.",
    gradient: "from-amber-900/80 via-background to-background",
  },
  {
    id: 2,
    title: "Unstoppable",
    author: "David Goggins",
    quote: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your potential.",
    gradient: "from-orange-900/60 via-background to-background",
  },
  {
    id: 3,
    title: "Dream Big",
    author: "Steve Jobs",
    quote: "Your time is limited, so don't waste it living someone else's life.",
    gradient: "from-yellow-900/50 via-background to-background",
  },
  {
    id: 4,
    title: "Never Quit",
    author: "Muhammad Ali",
    quote: "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.'",
    gradient: "from-red-900/50 via-background to-background",
  },
  {
    id: 5,
    title: "Be Fearless",
    author: "Nelson Mandela",
    quote: "I learned that courage was not the absence of fear, but the triumph over it.",
    gradient: "from-emerald-900/50 via-background to-background",
  },
];

const ReelCard = ({ reel, isActive }: { reel: Reel; isActive: boolean }) => {
  return (
    <div className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden">
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
