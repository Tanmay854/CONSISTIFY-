import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import ReelsTab from "@/components/ReelsTab";
import LongGameSection from "@/components/LongGameSection";
import { LONG_GAME_FEEDS } from "@/lib/videoFeeds";

type HomeView = "long_game" | "quick_spark";

const TABS: { id: HomeView; label: string }[] = [
  { id: "long_game", label: "Long Game" },
  { id: "quick_spark", label: "Quick Clips" },
];

/**
 * Home: a glass app mark and a centered pill switcher at the top.
 * Long Game aggregates every long-form video (legacy Calm State included);
 * Quick Clips is the immersive vertical short feed.
 */
const VideosSection = ({ muted = false, onToggleMute }: { muted?: boolean; onToggleMute?: () => void }) => {
  const [view, setView] = useState<HomeView>("long_game");

  return (
    <div className="relative h-[100dvh] w-full bg-background overflow-hidden">
      {/* Pill navigation */}
      <div className="absolute top-0 left-0 right-0 z-40 flex justify-center pt-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-[hsl(var(--foreground)/0.07)] backdrop-blur-xl ring-1 ring-foreground/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          {TABS.map((t) => {
            const active = view === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                className={`px-3.5 h-8 rounded-full text-[11px] font-black uppercase tracking-[0.12em] font-['Montserrat',sans-serif] transition-all duration-300 ${
                  active
                    ? "bg-[hsl(var(--foreground)/0.10)] text-foreground drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]"
                    : "text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>


      {view === "long_game" ? (
        <LongGameSection feeds={LONG_GAME_FEEDS} heading="Long Game" topInset={82} />
      ) : (
        <>
          <ReelsTab muted={muted} feed="quick_spark" active />
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              aria-label={muted ? "Unmute video" : "Mute video"}
              className="fixed bottom-32 right-4 z-40 w-7 h-7 rounded-full bg-secondary/80 flex items-center justify-center"
            >
              {muted ? <VolumeX size={13} className="text-foreground" /> : <Volume2 size={13} className="text-foreground" />}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default VideosSection;
