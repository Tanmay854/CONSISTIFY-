import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, ImageIcon, Check, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TabBanner from "@/components/TabBanner";
import { shareQuote, shareQuoteToWhatsApp } from "@/lib/shareQuote";

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

const DailyQuotesFeed = () => {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bgId, setBgId] = useState<string | null>(() => {
    try { return localStorage.getItem(BG_KEY); } catch { return null; }
  });
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("quote_backgrounds").select("id,image_url,name").order("position", { ascending: true }).limit(300),
      supabase.from("daily_quotes").select("id,text,author").order("created_at", { ascending: false }).limit(300),
    ]).then(([bgRes, qRes]) => {
      if (cancelled) return;
      setBackgrounds((bgRes.data as Background[]) || []);
      setQuotes((qRes.data as Quote[]) || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const chosen = backgrounds.find((b) => b.id === bgId) ?? null;

  const choose = useCallback((id: string) => {
    setBgId(id);
    try { localStorage.setItem(BG_KEY, id); } catch { /* empty */ }
    setPicking(false);
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

  const needsPicker = picking || (!bgId && backgrounds.length > 0);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-foreground/25 border-t-foreground animate-spin" />
      </div>
    );
  }

  if (needsPicker) {
    return (
      <div className="h-[100dvh] overflow-y-auto scrollbar-hide bg-background pb-28">
        <div className="px-4 pt-20">
          <TabBanner tab="daily_quotes" className="mb-5" />
          <h2 className="text-foreground font-display text-2xl font-bold tracking-tight">Choose your wallpaper</h2>
          <p className="text-muted-foreground text-xs mt-1 mb-4">
            Every quote will flow over the photo you pick. You can change it any time.
          </p>
          {backgrounds.length === 0 ? (
            <p className="text-muted-foreground text-sm py-16 text-center">No backgrounds yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {backgrounds.map((b) => (
                <button
                  key={b.id}
                  onClick={() => choose(b.id)}
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
              onClick={() => setPicking(false)}
              className="w-full mt-5 bg-secondary text-secondary-foreground rounded-xl py-3 text-sm font-semibold"
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center px-8 text-center">
        <p className="text-muted-foreground text-sm">No quotes yet.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Static chosen wallpaper */}
      {chosen && (
        <img
          src={chosen.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/80 pointer-events-none" />

      {/* Quotes scroll over the static photo */}
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

      {/* Actions */}
      <div className="absolute bottom-24 right-4 z-30 flex flex-col gap-2.5">
        <button
          onClick={onShare}
          disabled={sharing}
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
          onClick={() => current && shareQuoteToWhatsApp(current.text, current.author)}
          aria-label="Share text on WhatsApp"
          className="w-10 h-10 rounded-full bg-secondary/85 backdrop-blur flex items-center justify-center text-foreground"
        >
          <MessageCircle size={16} />
        </button>
        <button
          onClick={() => setPicking(true)}
          aria-label="Change background"
          className="w-10 h-10 rounded-full bg-secondary/85 backdrop-blur flex items-center justify-center text-foreground"
        >
          <ImageIcon size={16} />
        </button>
      </div>
    </div>
  );
};

export default DailyQuotesFeed;
