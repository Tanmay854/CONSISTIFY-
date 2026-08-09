import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import ReelsTab from "@/components/ReelsTab";
import LongGameSection from "@/components/LongGameSection";
import LiquidGlassToggle, { HomeSection } from "@/components/LiquidGlassToggle";
import { LONG_GAME_FEEDS } from "@/lib/videoFeeds";

/**
 * Home: Long Game aggregates every long-form video (legacy Calm State included);
 * Quick Clips is the immersive vertical short feed. A single floating glass
 * button (under the search icon) toggles between the two.
 */
const VideosSection = ({ muted = false, onToggleMute }: { muted?: boolean; onToggleMute?: () => void }) => {
  const [view, setView] = useState<HomeSection>("long_game");

  return (
    <div className="relative flex h-[100dvh] w-full flex-col bg-background overflow-hidden">
      <LiquidGlassToggle
        active={view}
        onToggle={setView}
        className="fixed right-4 top-16 z-50"
      />


      <div className="relative min-h-0 flex-1 overflow-hidden">
        {view === "long_game" ? (
          <LongGameSection feeds={LONG_GAME_FEEDS} heading="Long Game" topInset={0} />
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

    </div>
  );
};

export default VideosSection;
