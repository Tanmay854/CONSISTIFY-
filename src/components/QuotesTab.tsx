import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QuoteCard {
  id: string;
  title: string;
  category: string;
  image_url: string;
  is_pro: boolean;
  description: string | null;
}

const PhotoCard = ({ quote }: { quote: QuoteCard }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6 && !tracked.current) {
            tracked.current = true;
            supabase.from("content_views").insert({ content_type: "quote", content_id: quote.id });
          }
        });
      },
      { threshold: [0, 0.6, 1] }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [quote.id]);

  return (
    <div
      ref={ref}
      className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden"
    >
      <img
        src={quote.image_url}
        alt={quote.title}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-background/40 pointer-events-none" />

      {quote.is_pro && (
        <span className="absolute top-16 right-4 bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider z-10">
          Pro
        </span>
      )}

      <div className="absolute bottom-24 left-4 right-16 z-20 pointer-events-none">
        <p className="text-white font-semibold text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
          {quote.title}
        </p>
        <p className="text-white/80 text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase tracking-widest mt-0.5">
          {quote.category}
        </p>
        {quote.description && (
          <p className="text-white/90 text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1.5 line-clamp-3 whitespace-pre-wrap">
            {quote.description}
          </p>
        )}
      </div>
    </div>
  );
};

const PAGE_SIZE = 8;

const QuotesTab = () => {
  const [quotes, setQuotes] = useState<QuoteCard[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data) {
      setQuotes((prev) => (p === 0 ? data : [...prev, ...data]));
      if (data.length < PAGE_SIZE) setHasMore(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPage(0); }, [fetchPage]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((p) => {
          const next = p + 1;
          fetchPage(next);
          return next;
        });
      }
    }, { rootMargin: "400px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, fetchPage, quotes.length]);

  if (quotes.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No photos yet</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-background">
      <div className="fixed top-0 left-0 right-0 z-20 px-4 pt-4 pb-2 bg-gradient-to-b from-background via-background/80 to-transparent">
        <h2 className="text-foreground font-semibold text-lg">Photos</h2>
      </div>
      {quotes.map((quote) => (
        <PhotoCard key={quote.id} quote={quote} />
      ))}
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </div>
  );
};

export default QuotesTab;
