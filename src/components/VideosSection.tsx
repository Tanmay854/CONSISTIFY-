import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import ReelsTab from "@/components/ReelsTab";
import LongVideoFeed from "@/components/LongVideoFeed";
import DailyQuotesFeed from "@/components/DailyQuotesFeed";
import TabBanner from "@/components/TabBanner";
import { VIDEO_FEEDS, type FeedDef, type FeedId } from "@/lib/videoFeeds";

const CategoryCard = ({ feed, onOpen }: { feed: FeedDef; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    className="relative block w-full overflow-hidden rounded-2xl bg-secondary/40 ring-1 ring-foreground/10 active:scale-[0.985] transition-transform duration-200 ease-out"
  >
    <TabBanner
      tab={feed.id}
      aspectClass="aspect-[16/9]"
      roundedClass="rounded-2xl"
      dots={false}
      overlay={false}
    />
    {/* Fallback height when the tab has no images yet */}
    <div className="aspect-[16/9] w-full [&:not(:first-child)]:hidden" style={{ display: "none" }} />
    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
    <div className="absolute inset-y-0 left-0 flex items-center pl-5 pr-24">
      <span className="text-left text-foreground font-extrabold uppercase tracking-[0.02em] text-xl leading-[1.05] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
        {feed.label}
      </span>
    </div>
  </button>
);

/**
 * The Videos destination: a Categories landing screen. Each category opens
 * full-screen — Long Game / Calm State are browsable lists of full-length
 * sessions, Quick Spark is the immersive vertical short feed, and Daily
 * Quotes flows words over a wallpaper the user picks.
 */
const VideosSection = ({ muted = false }: { muted?: boolean }) => {
  const [open, setOpen] = useState<FeedId | null>(null);
  const active = VIDEO_FEEDS.find((f) => f.id === open) ?? null;

  if (active) {
    return (
      <div className="relative h-[100dvh] w-full bg-background overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(null)}
          aria-label="Back to categories"
          className="fixed top-4 right-4 z-40 w-9 h-9 rounded-full bg-secondary/80 backdrop-blur flex items-center justify-center"
        >
          <ChevronLeft size={20} className="text-foreground" />
        </button>
        {active.kind === "short" ? (
          <ReelsTab muted={muted} feed={active.id} active />
        ) : active.kind === "quotes" ? (
          <DailyQuotesFeed />
        ) : (
          <LongVideoFeed feed={active.id} heading={active.label} blurb={active.blurb} />
        )}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-background overflow-y-auto scrollbar-hide">
      <header className="px-5 pt-16 pb-5">
        <h1 className="text-foreground font-extrabold uppercase tracking-tight text-[2rem] leading-none">
          Categories
        </h1>
        <p className="text-muted-foreground text-sm mt-2">Choose what inspires you today.</p>
      </header>

      <div className="px-4 pb-32 space-y-4">
        {VIDEO_FEEDS.map((f) => (
          <CategoryCard key={f.id} feed={f} onOpen={() => setOpen(f.id)} />
        ))}
      </div>
    </div>
  );
};

export default VideosSection;
