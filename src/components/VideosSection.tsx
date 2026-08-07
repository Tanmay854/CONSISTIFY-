import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import ReelsTab from "@/components/ReelsTab";
import LongGameSection from "@/components/LongGameSection";
import { LONG_GAME_FEEDS } from "@/lib/videoFeeds";
import homeIcon from "@/assets/home-glass-icon.png";

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
      {/* Glass mark + pill navigation */}
      <div className="absolute top-0 left-0 right-0 z-40 flex flex-col items-center pt-3 pointer-events-none">
        <img
          src={homeIcon}
          alt="App mark"
          width={816}
          height={816}
          className="w-12 h-12 object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]"
        />
        <div className="pointer-events-auto mt-2 flex items-center gap-1 p-1 rounded-full bg-foreground/[0.08] backdrop-blur-xl ring-1 ring-foreground/10">
          {TABS.map((t) => {
            const active = view === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                className={`px-4 h-9 rounded-full text-[13px] font-semibold tracking-[0.02em] transition-colors duration-200 ${
                  active
                    ? "bg-foreground text-background"
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
        <LongGameSection feeds={LONG_GAME_FEEDS} heading="Long Game" topInset={122} />
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
