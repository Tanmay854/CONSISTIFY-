import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, ImageIcon, Check, LayoutGrid, ChevronLeft, ChevronUp, Plus, Trash2, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { shareQuote } from "@/lib/shareQuote";
import { QUOTE_CATEGORIES, findCategory } from "@/lib/quoteTopics";
import FittedQuote from "@/components/FittedQuote";
import FontPicker from "@/components/FontPicker";
import { DEFAULT_QUOTE_FONT_ID, findQuoteFont } from "@/lib/quoteFonts";
import "@/styles/quoteFonts.css";
import {
  LocalWallpaper,
  MAX_LOCAL_WALLPAPERS,
  addLocalWallpapers,
  loadLocalWallpapers,
  removeLocalWallpaper,
} from "@/lib/localWallpapers";

interface Background {
  id: string;
  image_url: string;
  name: string | null;
}

interface Quote {
  id: string;
  text: string;
  author: string | null;
}

const BG_KEY = "daily_quote_bg_id";
const CAT_KEY = "daily_quote_cat";
const SUB_KEY = "daily_quote_sub";

type Step = "category" | "sub" | "wallpaper" | "feed";

/** Staggered slide-up entrance for list items. */
const stagger = (i: number) => ({
  animation: "fade-in 0.42s cubic-bezier(0.16,1,0.3,1) both",
  animationDelay: `${Math.min(i, 14) * 45}ms`,
});

const DailyQuotesFeed = () => {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [myWallpapers, setMyWallpapers] = useState<LocalWallpaper[]>(() => loadLocalWallpapers());
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bgId, setBgId] = useState<string | null>(() => {
    try { return localStorage.getItem(BG_KEY); } catch { return null; }
  });
  const [cat, setCat] = useState<string | null>(() => {
    try { return localStorage.getItem(CAT_KEY); } catch { return null; }
  });
  const [sub, setSub] = useState<string | null>(() => {
    try { return localStorage.getItem(SUB_KEY); } catch { return null; }
  });
  const [step, setStep] = useState<Step>(() => {
    try {
      return localStorage.getItem(SUB_KEY) ? "feed" : "category";
    } catch { return "category"; }
  });
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("quote_backgrounds")
      .select("id,image_url,name")
      .order("position", { ascending: true })
      .limit(400)
      .then(({ data }) => {
        if (cancelled) return;
        setBackgrounds((data as Background[]) || []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cat || !sub) return;
    let cancelled = false;
    setQuotesLoading(true);
    supabase
      .from("daily_quotes")
      .select("id,text,author")
      .eq("category", cat)
      .eq("subcategory", sub)
      .order("created_at", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return;
        setQuotes((data as Quote[]) || []);
        setActiveIndex(0);
        scrollRef.current?.scrollTo({ top: 0 });
        setQuotesLoading(false);
      });
    return () => { cancelled = true; };
  }, [cat, sub]);

  const allWallpapers: Background[] = [...myWallpapers, ...backgrounds];
  const chosen = allWallpapers.find((b) => b.id === bgId) ?? null;
  const category = findCategory(cat);

  const chooseBg = useCallback((id: string) => {
    setBgId(id);
    try { localStorage.setItem(BG_KEY, id); } catch { /* empty */ }
    setStep("feed");
  }, []);

  const chooseCat = useCallback((id: string) => {
    setCat(id);
    try { localStorage.setItem(CAT_KEY, id); } catch { /* empty */ }
    setStep("sub");
  }, []);

  const chooseSub = useCallback((id: string) => {
    setSub(id);
    try { localStorage.setItem(SUB_KEY, id); } catch { /* empty */ }
    setStep(bgId ? "feed" : "wallpaper");
  }, [bgId]);

  const onUpload = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const next = await addLocalWallpapers(Array.from(files));
    setMyWallpapers(next);
    setUploading(false);
  }, []);

  const onRemoveMine = useCallback((id: string) => {
    setMyWallpapers(removeLocalWallpaper(id));
    setBgId((prev) => {
      if (prev !== id) return prev;
      try { localStorage.removeItem(BG_KEY); } catch { /* empty */ }
      return null;
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex((prev) => (prev === idx ? prev : idx));
  }, []);

  const current = quotes[activeIndex] ?? quotes[0] ?? null;

  const onShare = useCallback(async () => {
    if (!current || sharing) return;
    setSharing(true);
    await shareQuote(current.text, current.author, chosen?.image_url ?? null);
    setSharing(false);
  }, [current, chosen, sharing]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-foreground/25 border-t-foreground animate-spin" />
      </div>
    );
  }

  if (step === "category") {
    return (
      <div className="h-[100dvh] overflow-y-auto scrollbar-hide bg-background pb-28 font-sans">
        <div className="px-4 pt-20">
          <h2 className="text-foreground text-2xl font-bold tracking-tight" style={stagger(0)}>What's on your mind?</h2>
          <p className="text-muted-foreground text-xs mt-1 mb-4" style={stagger(1)}>Pick a topic to get quotes that fit.</p>
          <div className="space-y-2">
            {QUOTE_CATEGORIES.map((c, i) => (
              <button
                key={c.id}
                onClick={() => chooseCat(c.id)}
                style={stagger(i + 2)}
                className="w-full text-left bg-secondary text-secondary-foreground rounded-xl px-4 py-3.5 text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "sub" && category) {
    return (
      <div className="h-[100dvh] overflow-y-auto scrollbar-hide bg-background pb-28 font-sans">
        <div className="px-4 pt-20">
          <button
            onClick={() => setStep("category")}
            className="flex items-center gap-1 text-muted-foreground text-xs mb-3"
          >
            <ChevronLeft size={14} /> Topics
          </button>
          <h2 className="text-foreground text-2xl font-bold tracking-tight" style={stagger(0)}>{category.label}</h2>
          <p className="text-muted-foreground text-xs mt-1 mb-4" style={stagger(1)}>Choose what you're dealing with.</p>
          <div className="space-y-2">
            {category.subs.map((s, i) => (
              <button
                key={s.id}
                onClick={() => chooseSub(s.id)}
                style={stagger(i + 2)}
                className="w-full text-left bg-secondary text-secondary-foreground rounded-xl px-4 py-3.5 text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "wallpaper") {
    return (
      <div className="h-[100dvh] overflow-y-auto scrollbar-hide bg-background pb-28 font-sans">
        <div className="px-4 pt-20">
          <h2 className="text-foreground text-2xl font-bold tracking-tight">Choose your wallpaper</h2>
          <p className="text-muted-foreground text-xs mt-1 mb-4">
            Every quote will flow over the photo you pick. You can change it any time.
          </p>

          <div className="flex items-baseline justify-between mb-2">
            <p className="text-foreground text-sm font-semibold">Your photos</p>
            <p className="text-muted-foreground text-[11px]">{myWallpapers.length}/{MAX_LOCAL_WALLPAPERS} · only you can see these</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {myWallpapers.map((b) => (
              <div key={b.id} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-secondary">
                <button onClick={() => chooseBg(b.id)} className="absolute inset-0">
                  <img src={b.image_url} alt={b.name || ""} className="w-full h-full object-cover" />
                  {b.id === bgId && (
                    <span className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Check size={22} className="text-foreground" />
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onRemoveMine(b.id)}
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-1 text-destructive"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {myWallpapers.length < MAX_LOCAL_WALLPAPERS && (
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="aspect-[9/16] rounded-xl bg-secondary flex flex-col items-center justify-center gap-1 text-muted-foreground disabled:opacity-50"
              >
                <Plus size={18} />
                <span className="text-[10px] font-semibold">{uploading ? "Adding..." : "Add photo"}</span>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }}
          />

          <p className="text-foreground text-sm font-semibold mb-2">Gallery</p>
          {backgrounds.length === 0 ? (
            <p className="text-muted-foreground text-sm py-10 text-center">No backgrounds yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {backgrounds.map((b) => (
                <button
                  key={b.id}
                  onClick={() => chooseBg(b.id)}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-secondary active:scale-95 transition-transform"
                >
                  <img src={b.image_url} alt={b.name || ""} loading="lazy" className="w-full h-full object-cover" />
                  {b.id === bgId && (
                    <span className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Check size={22} className="text-foreground" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {bgId && (
            <button
              onClick={() => setStep("feed")}
              className="w-full mt-5 bg-secondary text-secondary-foreground rounded-xl py-3 text-sm font-semibold"
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {chosen && (
        <img src={chosen.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/80 pointer-events-none" />

      {quotesLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-9 w-9 rounded-full border-2 border-foreground/25 border-t-foreground animate-spin" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center gap-4">
          <p className="text-muted-foreground text-sm">No quotes in this topic yet.</p>
          <button
            onClick={() => setStep("category")}
            className="bg-secondary text-secondary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            Pick another topic
          </button>
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-contain [scroll-snap-stop:always]"
        >
          {quotes.map((q, i) => (
            <div key={q.id} className="h-[100dvh] w-full snap-start snap-always flex items-center justify-center px-9">
              <div className={i === activeIndex ? "animate-fade-in" : ""}>
                <p className="font-display text-[1.7rem] leading-snug text-center text-foreground font-semibold drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]">
                  “{q.text}”
                </p>
                {q.author && (
                  <p className="mt-4 text-center text-xs uppercase tracking-[0.22em] text-foreground/75">
                    {q.author}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible actions */}
      <div className="absolute bottom-24 right-4 z-30 flex flex-col items-center gap-2.5">
        <div
          className="flex flex-col items-center gap-2.5 origin-bottom transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            opacity: actionsOpen ? 1 : 0,
            transform: actionsOpen ? "translateY(0) scale(1)" : "translateY(14px) scale(0.85)",
            pointerEvents: actionsOpen ? "auto" : "none",
          }}
        >
          <button
            onClick={onShare}
            disabled={sharing || !current}
            aria-label="Share quote"
            className="w-10 h-10 rounded-full bg-secondary/85 backdrop-blur flex items-center justify-center text-foreground disabled:opacity-50"
          >
            {sharing ? (
              <span className="h-4 w-4 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
            ) : (
              <Share2 size={16} />
            )}
          </button>
          <button
            onClick={() => setStep("wallpaper")}
            aria-label="Change background"
            className="w-10 h-10 rounded-full bg-secondary/85 backdrop-blur flex items-center justify-center text-foreground"
          >
            <ImageIcon size={16} />
          </button>
          <button
            onClick={() => setStep("category")}
            aria-label="Change topic"
            className="w-10 h-10 rounded-full bg-secondary/85 backdrop-blur flex items-center justify-center text-foreground"
          >
            <LayoutGrid size={16} />
          </button>
        </div>

        <button
          onClick={() => setActionsOpen((v) => !v)}
          aria-label={actionsOpen ? "Hide actions" : "Show actions"}
          aria-expanded={actionsOpen}
          className="w-9 h-9 rounded-full bg-secondary/85 backdrop-blur flex items-center justify-center text-foreground"
        >
          <ChevronUp
            size={16}
            className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: actionsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </div>
    </div>
  );
};

export default DailyQuotesFeed;
