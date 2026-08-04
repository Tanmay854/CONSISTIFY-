import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import ReelsTab from "@/components/ReelsTab";
import LongVideoFeed from "@/components/LongVideoFeed";
import DailyQuotesFeed from "@/components/DailyQuotesFeed";
import { VIDEO_FEEDS } from "@/lib/videoFeeds";

/**
 * The Videos destination: four horizontally swipeable feeds.
 * Long Game / Calm State are browsable lists of full-length sessions,
 * Quick Spark is the immersive vertical short feed, Daily Quotes flows
 * words over a wallpaper the user picks.
 */
const VideosSection = ({ muted = false }: { muted?: boolean }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "x",
    align: "start",
    containScroll: "trimSnaps",
    startIndex: 1, // open on Quick Spark
    duration: 22,
  });
  const [selected, setSelected] = useState(1);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  const go = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  return (
    <div className="relative h-[100dvh] w-full bg-background overflow-hidden">
      {/* Tab bar */}
      <div className="absolute top-0 left-0 right-0 z-40 pt-3.5 pb-2 pl-16 pr-3 bg-gradient-to-b from-background/85 to-transparent">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {VIDEO_FEEDS.map((f, i) => {
            const active = i === selected;
            return (
              <button
                key={f.id}
                onClick={() => go(i)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/70 text-secondary-foreground backdrop-blur"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {VIDEO_FEEDS.map((f, i) => (
            <div key={f.id} className="relative flex-[0_0_100%] min-w-0 h-full">
              {f.kind === "short" ? (
                <ReelsTab muted={muted} feed={f.id} active={i === selected} />
              ) : f.kind === "quotes" ? (
                <DailyQuotesFeed />
              ) : (
                <LongVideoFeed feed={f.id} heading={f.label} blurb={f.blurb} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideosSection;
