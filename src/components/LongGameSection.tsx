import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Play, Plus, Check, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBackHandler } from "@/lib/backHandler";
import VideoPlayer from "@/components/VideoPlayer";
import { getVideoThumbnail, getVideoThumbnailFallbacks } from "@/lib/thumbUrl";
import { getPlayableVideoUrl } from "@/lib/videoFeeds";
import { trackView } from "@/lib/trackView";
import { fetchProfiles, displayHandle } from "@/lib/uploaderProfiles";

interface Item {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  thumbnail_portrait_url: string | null;
  thumbnail_landscape_url: string | null;
  category: string;
  created_at: string;
  uploaded_by: string | null;
  is_featured: boolean | null;
  sharedBy: string;
}

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const DURATION = 420;
const FADE_IN_DELAY = 190;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const badgeFor = (iso: string) => (Date.now() - new Date(iso).getTime() < 7 * 86400000 ? "New" : "Trending");

const portraitSrc = (item: Item) =>
  item.thumbnail_portrait_url || getVideoThumbnail(item.video_url, item.thumbnail_url);
const landscapeSrc = (item: Item) =>
  item.thumbnail_landscape_url || getVideoThumbnail(item.video_url, item.thumbnail_url);

/** Shared poster visual used at every size so nothing swaps mid-morph. */
const PosterArt = memo(({
  item,
  orientation = "portrait",
  contain = false,
}: {
  item: Item;
  orientation?: "portrait" | "landscape";
  contain?: boolean;
}) => {
  const thumb = orientation === "landscape" ? landscapeSrc(item) : portraitSrc(item);
  return (
    <div className="absolute inset-0 bg-secondary">
      {thumb && (
        <img
          src={thumb}
          alt=""
          loading="eager"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Old Android WebViews sometimes drop the first still request.
            const img = e.currentTarget;
            const alt = getVideoThumbnailFallbacks(item.video_url).find((u) => u !== img.src);
            if (alt && !img.dataset.retried) {
              img.dataset.retried = "1";
              img.src = alt;
            }
          }}
          className={`absolute inset-0 w-full h-full ${contain ? "object-contain" : "object-cover"}`}
        />
      )}
    </div>
  );
});
PosterArt.displayName = "PosterArt";

const SectionRow = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="text-foreground text-base font-bold mb-3">{title}</h2>
    {children}
  </div>
);

type OpenFn = (item: Item, node: HTMLElement) => void;

const ContinueCard = memo(({ item, onOpen }: { item: Item; onOpen: OpenFn }) => (
  <div
    onClick={(e) => onOpen(item, e.currentTarget)}
    className="relative flex-shrink-0 w-[76%] max-w-[320px] aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer"
  >
    <PosterArt item={item} orientation="landscape" />
    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 to-transparent" />
    <div className="absolute left-3 bottom-3 flex items-center gap-1.5 rounded-full bg-white/90 pl-2 pr-3 py-1 backdrop-blur-sm">
      <Play size={11} className="fill-black text-black" />
      <span className="text-[11px] font-bold text-black tracking-tight">Play Now</span>
    </div>
  </div>
));
ContinueCard.displayName = "ContinueCard";


const PosterCard = memo(({ item, onOpen }: { item: Item; onOpen: OpenFn }) => (
  <div className="flex-shrink-0 w-[104px]">
    <div
      onClick={(e) => onOpen(item, e.currentTarget)}
      className="relative w-[104px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer"
    >
      <PosterArt item={item} />
    </div>
    <div className="mt-2 text-[11px] font-medium text-muted-foreground truncate text-center">{item.sharedBy}</div>
  </div>
));
PosterCard.displayName = "PosterCard";

const RankRow = memo(({ items, onOpen }: { items: Item[]; onOpen: OpenFn }) => (
  <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
    {items.map((m) => (
      <PosterCard key={m.id} item={m} onOpen={onOpen} />
    ))}
  </div>
));
RankRow.displayName = "RankRow";

const LongGameSection = ({
  feed = "long_game",
  feeds,
  heading = "Long Game",
  topInset = 56,
}: {
  feed?: string;
  feeds?: string[];
  heading?: string;
  topInset?: number;
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Item | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [closing, setClosing] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<Item | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const tickingRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const feedKey = (feeds ?? [feed]).join(",");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = feedKey.split(",");
      const { data } = await supabase
        .from("reels")
        .select(
          "id,title,description,video_url,thumbnail_url,thumbnail_portrait_url,thumbnail_landscape_url,category,created_at,uploaded_by,is_featured",
        )
        .in("feed", list)
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = data || [];
      const profiles = await fetchProfiles(
        Array.from(new Set(rows.map((r) => r.uploaded_by).filter(Boolean) as string[])),
      );
      if (cancelled) return;
      setItems(
        rows.map((r) => ({
          ...r,
          sharedBy: r.uploaded_by ? displayHandle(profiles.get(r.uploaded_by)) : "user",
        })) as Item[],
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [feedKey]);


  const computeTransform = (r: DOMRect) => ({
    tx: r.left,
    ty: r.top,
    sx: r.width / window.innerWidth,
    sy: r.height / window.innerHeight,
  });

  const openItem = useCallback<OpenFn>((item, node) => {
    const rect = node.getBoundingClientRect();
    rectRef.current = rect;
    setScrollY(0);
    setShowDetail(false);
    setClosing(false);
    setOpen(item);
    trackView("reel", item.id);
  }, []);

  useLayoutEffect(() => {
    if (!open || !overlayRef.current || !rectRef.current) return;
    const overlay = overlayRef.current;
    const { tx, ty, sx, sy } = computeTransform(rectRef.current);

    overlay.style.transition = "none";
    overlay.style.transformOrigin = "0 0";
    overlay.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    overlay.style.borderRadius = "20px";
    overlay.style.opacity = "1";

    void overlay.offsetHeight;

    requestAnimationFrame(() => {
      overlay.style.transition = `transform ${DURATION}ms ${EASE}, border-radius ${DURATION}ms ${EASE}`;
      overlay.style.transform = "translate(0px, 0px) scale(1, 1)";
      overlay.style.borderRadius = "0px";
    });

    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => setShowDetail(true), FADE_IN_DELAY);
    return () => clearTimeout(fadeTimerRef.current);
  }, [open]);

  const close = useCallback(() => {
    setShowDetail(false);
    setClosing(true);
    const overlay = overlayRef.current;
    if (!overlay || !rectRef.current) { setOpen(null); setClosing(false); return; }

    let done = false;
    let handler: (e: TransitionEvent) => void;
    let fallback: ReturnType<typeof setTimeout>;
    const finish = () => {
      if (done) return;
      done = true;
      overlay.removeEventListener("transitionend", handler);
      clearTimeout(fallback);
      setOpen(null);
      setClosing(false);
    };

    // Always morph back to the exact card position. While closing the overlay sits
    // below the nav bars, so a card that is clipped by them slides underneath them
    // instead of glitching on top.
    const { tx, ty, sx, sy } = computeTransform(rectRef.current);
    const fadeDuration = Math.round(DURATION * 0.3);
    const fadeDelay = DURATION - fadeDuration;
    overlay.style.willChange = "transform, opacity";
    overlay.style.transition = `transform ${DURATION}ms ${EASE}, border-radius ${DURATION}ms ${EASE}, opacity ${fadeDuration}ms ease ${fadeDelay}ms`;
    overlay.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    overlay.style.borderRadius = "20px";
    overlay.style.opacity = "0";

    handler = (e: TransitionEvent) => { if (e.propertyName === "transform") finish(); };
    overlay.addEventListener("transitionend", handler);
    fallback = setTimeout(finish, DURATION + 60);
  }, []);

  useBackHandler(!!open, close);

  const closeSearch = useCallback(() => { setSearchOpen(false); setSearchQuery(""); }, []);
  useBackHandler(searchOpen && !open, closeSearch);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      (i.title || "").toLowerCase().includes(q) ||
      (i.description || "").toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      setScrollY(top);
      tickingRef.current = false;
    });
  };

  const rows = useMemo(() => {
    const rotate = (n: number) => items.slice(n).concat(items.slice(0, n));
    return {
      continueWatching: items.slice(0, 3),
      originals: items,
      trending: [...items].reverse(),
      mostWatched: rotate(2),
      official: rotate(4),
    };
  }, [items]);

  const titleOpacity = clamp((scrollY - 170) / 60, 0, 1);
  const titleY = 8 - 8 * titleOpacity;

  const featured = useMemo(() => {
    const picked = items.filter((i) => i.is_featured);
    return (picked.length ? picked : items).slice(0, 5);
  }, [items]);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const onHeroScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setHeroIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };

  const heroStripSrc = featured.length ? portraitSrc(featured[Math.min(heroIndex, featured.length - 1)]) : null;

  return (
    <div className="relative h-full w-full bg-background text-foreground overflow-hidden">
      {/* Search is scoped to the content area below the navigation. */}
      <button
        type="button"
        aria-label="Search"
        onClick={() => setSearchOpen(true)}
        className="absolute top-safe-4 right-4 z-40 w-9 h-9 rounded-full bg-black/35 backdrop-blur-md flex items-center justify-center text-foreground"
      >
        <Search size={17} />
      </button>


      <div className="h-full overflow-y-auto scrollbar-hide overscroll-contain">


        {/* Hero carousel */}
        {featured.length > 0 && (
          <div className="relative">
            <div
              ref={heroRef}
              onScroll={onHeroScroll}
              className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            >
              {featured.map((m) => (
              <div key={m.id} className="relative flex-shrink-0 w-full h-[82vh] snap-center">
                  <PosterArt item={m} />
                  {/* Natural, image-tinted top fade — no blur bar, colour comes from the photo itself */}
                  <div
                    className="absolute inset-x-0 top-0 h-56 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.44) 18%, rgba(0,0,0,0.26) 38%, rgba(0,0,0,0.12) 60%, rgba(0,0,0,0.04) 80%, rgba(0,0,0,0) 100%)",
                    }}
                  />

                  {/* localized bottom scrim so the title/buttons float above the image while the poster stays visible most of the way down */}
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 px-5 pb-6 text-center" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}>
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full bg-black/40 text-white mb-2.5">
                      {badgeFor(m.created_at) === "New" ? "New" : "Continue Watching"}
                    </span>
                    <p className="text-[12px] font-normal text-white/90 mb-4 truncate">
                      Long Game · {m.sharedBy}
                    </p>
                    <div className="relative flex items-center justify-center">
                      <button
                        onClick={(e) => openItem(m, e.currentTarget.closest("div[class*='snap-center']") as HTMLElement)}
                        className="h-10 px-6 rounded-full bg-white text-black font-semibold text-[14px] flex items-center gap-2"
                      >
                        <Play size={15} className="fill-current" /> Play
                      </button>
                      <button
                        onClick={() => setSaved((s) => ({ ...s, [m.id]: !s[m.id] }))}
                        aria-label="Add to Watchlist"
                        className="absolute left-1/2 ml-[68px] w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
                      >
                        {saved[m.id] ? <Check size={17} /> : <Plus size={17} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {featured.length > 1 && (
              <div className="flex justify-center gap-1.5 pt-3">
                {featured.map((m, i) => (
                  <span
                    key={m.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === heroIndex ? "w-4 bg-foreground" : "w-1.5 bg-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-5 pt-6 pb-32">
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-full aspect-[16/10] rounded-2xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm py-16 text-center">Nothing here yet.</p>
          ) : (
            <>
              <SectionRow title="Continue Watching">
                <div className="flex gap-3.5 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
                  {rows.continueWatching.map((m) => (
                    <ContinueCard key={m.id} item={m} onOpen={openItem} />
                  ))}
                </div>
              </SectionRow>
              <SectionRow title="Originals"><RankRow items={rows.originals} onOpen={openItem} /></SectionRow>
              <SectionRow title="Trending"><RankRow items={rows.trending} onOpen={openItem} /></SectionRow>
              <SectionRow title="Most Watched"><RankRow items={rows.mostWatched} onOpen={openItem} /></SectionRow>
              <SectionRow title="Official"><RankRow items={rows.official} onOpen={openItem} /></SectionRow>
            </>
          )}
        </div>
      </div>


      {open && (
        <div
          ref={overlayRef}
          className="fixed top-0 left-0 w-screen h-screen bg-background overflow-hidden"
          style={{ zIndex: closing ? 30 : 50 }}
        >
          {/* Top bar — back button on the right, no blur, no share */}
          <div className="absolute top-0 left-0 right-0 z-30 h-14 flex items-center justify-end px-3 pointer-events-none"
            style={{ marginTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
            <button
              onClick={close}
              aria-label="Back"
              className="pointer-events-auto w-9 h-9 rounded-full bg-black/40 flex items-center justify-center flex-shrink-0 text-white"
            >
              <ChevronLeft size={20} />
            </button>
          </div>


          <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto scrollbar-hide">
            <div className="relative w-full h-[72vh] bg-background overflow-hidden">
              <PosterArt item={open} />
              <div className="absolute inset-x-0 -top-4 h-48 bg-gradient-to-b from-black/50 via-black/20 via-black/8 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/70 to-transparent" />
            </div>

            <div
              className="relative px-5 pb-24 pt-4"
              style={{
                opacity: showDetail ? 1 : 0,
                transform: showDetail ? "translateY(0px)" : "translateY(8px)",
                transition: showDetail
                  ? "opacity 240ms ease 150ms, transform 240ms ease 150ms"
                  : "opacity 120ms ease, transform 120ms ease",
              }}
            >
              <span className="inline-block text-[11px] font-bold uppercase tracking-[0.03em] px-2.5 py-1 rounded-md mb-3 bg-foreground/10 text-foreground">
                {badgeFor(open.created_at)}
              </span>

              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground mb-5 mt-2">

                <span>{open.sharedBy}</span>
              </div>


              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setPlaying(open)}
                  className="flex-1 h-11 rounded-full bg-foreground text-background font-semibold text-[15px] flex items-center justify-center gap-2"
                >
                  <Play size={16} className="fill-current" /> Play
                </button>
                <button
                  onClick={() => setSaved((s) => ({ ...s, [open.id]: !s[open.id] }))}
                  aria-label="Add to Watchlist"
                  className="w-11 h-11 rounded-full bg-foreground/10 flex items-center justify-center"
                >
                  {saved[open.id] ? <Check size={18} /> : <Plus size={18} />}
                </button>
              </div>

              {open.description && (
                <p className="text-sm leading-relaxed text-muted-foreground m-0 whitespace-pre-wrap">
                  {open.description}
                </p>
              )}
            </div>
          </div>

          {playing && (
            <div className="absolute inset-0 z-40 bg-black flex items-center justify-center animate-fade-in">
              <VideoPlayer
                key={playing.id}
                src={getPlayableVideoUrl(playing.video_url)}
                poster={landscapeSrc(playing) || undefined}
                autoPlay
                fill
                fit="contain"
                allowRotate
                className="h-full"
              />
              <button
                onClick={() => setPlaying(null)}
                aria-label="Close player"
                className="absolute right-3 z-10 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
                style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LongGameSection;
