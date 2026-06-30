import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { CircleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackView } from "@/lib/trackView";
import ReportDialog from "@/components/ReportDialog";

interface QuoteCard {
  id: string;
  title: string | null;
  category: string;
  image_url: string;
  is_pro: boolean;
  description: string | null;
}


const PhotoCard = ({ quote, onReport }: { quote: QuoteCard; onReport: (q: QuoteCard) => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6 && !tracked.current) {
            tracked.current = true;
            trackView("quote", quote.id);
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
      className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center overflow-hidden"
    >
      <img
        src={quote.image_url}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
        loading="lazy"
      />
      <img
        src={quote.image_url}
        alt={quote.title || "quote"}
        className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-background/40 pointer-events-none" />

      <button
        onClick={() => onReport(quote)}
        className="absolute bottom-[72px] right-4 z-30 bg-secondary/80 rounded-full p-2 text-foreground/80 hover:text-foreground"
        aria-label="Report"
      >
        <CircleAlert size={14} />
      </button>

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
const snapStyle: CSSProperties = { scrollSnapStop: "always" };

const QuotesTab = () => {
  const [quotes, setQuotes] = useState<QuoteCard[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [reportTarget, setReportTarget] = useState<QuoteCard | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from("quotes")
      .select("id,title,category,image_url,is_pro,description")
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
    <>
      <div className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-background overscroll-contain" style={snapStyle}>
        {quotes.map((quote) => (
          <PhotoCard key={quote.id} quote={quote} onReport={setReportTarget} />
        ))}
        {hasMore && <div ref={sentinelRef} className="h-1" />}
      </div>
      {reportTarget && (
        <ReportDialog
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          contentType="photo"
          contentId={reportTarget.id}
          contentTitle={reportTarget.title || "Untitled"}
        />
      )}
    </>
  );
};

export default QuotesTab;
