import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { CircleAlert, User as UserIcon } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/integrations/supabase/client";
import { trackView } from "@/lib/trackView";
import ReportDialog from "@/components/ReportDialog";
import UploaderProfileSheet from "@/components/UploaderProfileSheet";
import { fetchProfiles, getCachedProfile, type UploaderProfile } from "@/lib/uploaderProfiles";

interface QuoteRow {
  id: string;
  title: string | null;
  category: string;
  image_url: string;
  is_pro: boolean;
  description: string | null;
  set_id: string | null;
  set_position: number;
  uploaded_by: string | null;
}

interface PhotoSet {
  key: string;
  items: QuoteRow[];
}

const SinglePhoto = ({ photo }: { photo: QuoteRow }) => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
    <img
      src={photo.image_url}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
      loading="lazy"
    />
    <img
      src={photo.image_url}
      alt={photo.title || "quote"}
      className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain"
      loading="lazy"
    />
  </div>
);

const SetPage = ({ set, onReport, uploaderProfile, onOpenProfile }: { set: PhotoSet; onReport: (q: QuoteRow) => void; uploaderProfile: UploaderProfile | null; onOpenProfile: (userId: string) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracked = useRef<Set<string>>(new Set());
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  const currentPhoto = set.items[selectedIndex] ?? set.items[0];

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const id = currentPhoto?.id;
            if (id && !tracked.current.has(id)) {
              tracked.current.add(id);
              trackView("quote", id);
            }
          }
        });
      },
      { threshold: [0, 0.6, 1] }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [currentPhoto?.id]);

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-background"
    >
      <div className="absolute inset-0" ref={emblaRef}>
        <div className="flex h-full">
          {set.items.map((p) => (
            <div key={p.id} className="relative flex-[0_0_100%] h-full">
              <SinglePhoto photo={p} />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-background/30 pointer-events-none z-10" />

      <button
        onClick={() => onReport(currentPhoto)}
        className="absolute bottom-20 right-4 z-30 bg-secondary/80 rounded-full p-2 text-foreground/80 hover:text-foreground"
        aria-label="Report"
      >
        <CircleAlert size={14} />
      </button>

      {set.items.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 pointer-events-none">
          {set.items.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === selectedIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      <div className="absolute bottom-24 left-4 right-16 z-20 pointer-events-none">
        {currentPhoto.title && (
          <p className="text-white font-semibold text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
            {currentPhoto.title}
          </p>
        )}
        <p className="text-white/80 text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase tracking-widest mt-0.5">
          {currentPhoto.category}
          {set.items.length > 1 && (
            <span className="ml-2 opacity-80">{selectedIndex + 1}/{set.items.length}</span>
          )}
        </p>
        {currentPhoto.description && (
          <p className="text-white/90 text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1.5 line-clamp-3 whitespace-pre-wrap">
            {currentPhoto.description}
          </p>
        )}
      </div>
    </div>
  );
};

const PAGE_SIZE = 40;
const snapStyle: CSSProperties = { scrollSnapStop: "always" };

const groupIntoSets = (rows: QuoteRow[]): PhotoSet[] => {
  const sets: PhotoSet[] = [];
  const bySetId = new Map<string, PhotoSet>();
  for (const r of rows) {
    if (r.set_id) {
      let s = bySetId.get(r.set_id);
      if (!s) {
        s = { key: r.set_id, items: [] };
        bySetId.set(r.set_id, s);
        sets.push(s);
      }
      s.items.push(r);
    } else {
      sets.push({ key: r.id, items: [r] });
    }
  }
  // Ensure items within a set are ordered by set_position
  for (const s of sets) {
    s.items.sort((a, b) => a.set_position - b.set_position);
  }
  return sets;
};

const QuotesTab = () => {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [reportTarget, setReportTarget] = useState<QuoteRow | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from("quotes")
      .select("id,title,category,image_url,is_pro,description,set_id,set_position,uploaded_by")
      .order("created_at", { ascending: false })
      .order("set_position", { ascending: true })
      .range(from, to);
    if (data) {
      setRows((prev) => (p === 0 ? data : [...prev, ...data]));
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
  }, [hasMore, loading, fetchPage, rows.length]);

  const sets = groupIntoSets(rows);

  if (sets.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No photos yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-background overscroll-contain" style={snapStyle}>
        {sets.map((s) => (
          <SetPage key={s.key} set={s} onReport={setReportTarget} />
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
