import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Star, ShoppingCart, BookOpen, Headphones, ChevronLeft, ChevronRight,
  Play, Pause, Rewind, FastForward, Type as TypeIcon, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book, QuizQuestion } from "@/lib/bookCategories";

type Mode = "overview" | "quiz" | "summary" | "audio";

const openAmazon = (url: string) => {
  try { window.open(url, "_blank", "noopener,noreferrer"); }
  catch { window.location.href = url; }
};

const Rating = ({ value }: { value: number | null }) => (
  <div className="flex items-center gap-1">
    <Star size={14} className="fill-yellow-400 text-yellow-400" />
    <span className="text-foreground text-sm font-semibold">{value ? value.toFixed(1) : "—"}</span>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex-1 text-center">
    <p className="text-foreground text-sm font-bold">{value}</p>
    <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-0.5">{label}</p>
  </div>
);

const BookDetailSheet = ({ book, onClose }: { book: Book; onClose: () => void }) => {
  const [mode, setMode] = useState<Mode>("overview");
  const [similar, setSimilar] = useState<Book[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("books").select("*")
        .neq("id", book.id).eq("category", book.category)
        .eq("is_published", true).limit(10);
      setSimilar(((data as unknown) as Book[]) ?? []);
    })();
  }, [book.id, book.category]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden animate-float-up" style={{ animationDuration: "0.25s" }}>
      <button
        onClick={mode === "overview" ? onClose : () => setMode("overview")}
        aria-label="Close"
        className="fixed top-4 right-4 z-20 w-10 h-10 rounded-full bg-secondary/80 backdrop-blur flex items-center justify-center"
      >
        <X size={20} className="text-foreground" />
      </button>

      {mode === "overview" && <Overview book={book} similar={similar} onQuiz={() => setMode("quiz")} onListen={() => setMode("audio")} />}
      {mode === "quiz" && <QuizFlow book={book} onDone={() => setMode("summary")} />}
      {mode === "summary" && <SummaryReader book={book} onBuy={() => openAmazon(book.amazon_url)} />}
      {mode === "audio" && <AudioPlayer book={book} />}
    </div>
  );
};

/* ---------------- Overview ---------------- */

const Overview = ({ book, similar, onQuiz, onListen }: { book: Book; similar: Book[]; onQuiz: () => void; onListen: () => void }) => {
  const [expandedPage, setExpandedPage] = useState<number | null>(null);
  const lt = book.listening_time_minutes ? `${book.listening_time_minutes} min` : "—";
  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="relative pt-14 pb-8 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40 blur-3xl"
          style={{ backgroundImage: `url(${book.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/80 to-background" />

        <div className="flex flex-col items-center gap-5">
          <div className="w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="text-center max-w-sm">
            <p className="text-primary text-[11px] uppercase tracking-[0.2em] font-semibold mb-2">{book.category}</p>
            <h1 className="text-foreground text-2xl font-extrabold leading-tight">{book.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">by {book.author}</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <Rating value={book.rating} />
              {book.public_id && <span className="text-muted-foreground text-[11px] font-mono">#{book.public_id}</span>}
            </div>
          </div>

          <div className="w-full max-w-sm flex items-stretch gap-2 mt-2 py-3 px-4 rounded-2xl bg-secondary/60 border border-border/40">
            <Stat label="Listen" value={lt} />
            <div className="w-px bg-border/60" />
            <Stat label="Pages" value={String((book.summary_pages ?? []).length || "—")} />
          </div>
        </div>
      </div>

      <div className="px-6 space-y-3">
        <button
          onClick={onQuiz}
          disabled={!book.quiz_questions?.length}
          className="w-full h-14 rounded-2xl bg-foreground text-background font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          <BookOpen size={18} /> Start Quiz
        </button>
        <button
          onClick={onListen}
          disabled={!book.audio_url}
          className="w-full h-14 rounded-2xl border border-border bg-secondary text-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          <Headphones size={18} /> Listen to Summary
        </button>
      </div>

      {(book.summary_pages ?? []).filter(Boolean).length > 0 && (
        <section className="px-6 py-5 border-t border-border/60 mt-2 space-y-2">
          <h3 className="text-foreground text-sm font-bold uppercase tracking-wider mb-3">Summary</h3>
          {(book.summary_pages ?? []).filter(Boolean).map((page, idx) => {
            const lines = page.split("\n").map((l) => l.trim()).filter(Boolean);
            const hasTitle = lines.length > 1;
            const title = hasTitle ? lines[0] : "";
            const body = hasTitle ? lines.slice(1).join("\n") : page.trim();
            const isOpen = expandedPage === idx;
            return (
              <button
                key={idx}
                onClick={() => setExpandedPage(isOpen ? null : idx)}
                className="w-full text-left rounded-2xl bg-secondary/40 border border-border/40 p-4 transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-primary text-[11px] uppercase tracking-[0.2em] font-semibold">Page {idx + 1}</p>
                    {title && <p className="text-foreground text-sm font-bold mt-1 truncate">{title}</p>}
                  </div>
                  <span className="text-muted-foreground text-lg leading-none shrink-0">{isOpen ? "−" : "+"}</span>
                </div>
                {isOpen && body && (
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line mt-3">{body}</p>
                )}
              </button>
            );
          })}
        </section>
      )}
      {book.description && (
        <Section title="About this book">
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{book.description}</p>
        </Section>
      )}
      {book.key_takeaways && (
        <Section title="Key takeaways">
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{book.key_takeaways}</p>
        </Section>
      )}
      {book.why_read && (
        <Section title="Why read this book">
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{book.why_read}</p>
        </Section>
      )}
      {similar.length > 0 && (
        <section className="pt-6">
          <h3 className="px-6 text-foreground text-sm font-bold uppercase tracking-wider mb-3">Similar books</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-6 pb-2 snap-x">
            {similar.map((b) => (
              <button key={b.id} onClick={() => (window as any).__openBook?.(b)}
                className="shrink-0 w-28 snap-start text-left active:scale-[0.97] transition-transform">
                <div className="w-28 aspect-[2/3] rounded-xl overflow-hidden bg-secondary">
                  <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <p className="text-foreground text-xs font-semibold mt-2 line-clamp-2">{b.title}</p>
                <p className="text-muted-foreground text-[10px] line-clamp-1">{b.author}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="px-6 py-5 border-t border-border/60 mt-2">
    <h3 className="text-foreground text-sm font-bold uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </section>
);

/* ---------------- Quiz ---------------- */

const QuizFlow = ({ book, onDone }: { book: Book; onDone: () => void }) => {
  const questions = book.quiz_questions ?? [];
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = questions[i];

  if (!q) {
    return (
      <div className="h-full flex items-center justify-center px-8 text-center">
        <div>
          <p className="text-foreground text-lg font-bold mb-2">No quiz available</p>
          <button onClick={onDone} className="mt-4 h-11 px-6 rounded-xl bg-foreground text-background font-semibold">Continue to summary</button>
        </div>
      </div>
    );
  }

  const next = () => {
    if (i + 1 >= questions.length) onDone();
    else { setI(i + 1); setPicked(null); }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="px-6 pt-14 pb-4">
        <p className="text-muted-foreground text-[11px] uppercase tracking-[0.2em] font-semibold">Knowledge Check</p>
        <div className="mt-3 h-1 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-foreground transition-all" style={{ width: `${((i + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="text-muted-foreground text-[11px] mt-2">Question {i + 1} of {questions.length}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        <h2 className="text-foreground text-xl font-bold leading-snug mb-6">{q.q}</h2>
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            const isPicked = picked === idx;
            const revealed = picked !== null;
            const cls = !revealed
              ? "border-border bg-secondary/40"
              : isPicked
                ? "border-foreground bg-foreground/10"
                : "border-border bg-secondary/20 opacity-60";
            return (
              <button
                key={idx}
                disabled={revealed}
                onClick={() => setPicked(idx)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${cls}`}
              >
                <span className="w-6 h-6 shrink-0 rounded-full border border-border flex items-center justify-center text-xs font-bold">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-foreground text-sm font-medium flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
        {picked !== null && (() => {
          const diff = Math.abs(picked - q.correct);
          const verdict =
            diff === 0 ? { label: "Excellent", tone: "text-emerald-400", ring: "border-emerald-500/40 bg-emerald-500/10" }
            : diff === 1 ? { label: "Good", tone: "text-sky-400", ring: "border-sky-500/40 bg-sky-500/10" }
            : diff === 2 ? { label: "Not truly correct", tone: "text-amber-400", ring: "border-amber-500/40 bg-amber-500/10" }
            : { label: "Wrong", tone: "text-red-400", ring: "border-red-500/40 bg-red-500/10" };
          const optExp = q.option_explanations?.[picked]?.trim();
          const text = optExp || q.explanation;
          return (
            <div className={`mt-5 p-4 rounded-xl border ${verdict.ring}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] mb-1.5 ${verdict.tone}`}>{verdict.label}</p>
              {text && (
                <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
              )}
            </div>
          );
        })()}
      </div>

      <div className="p-6">
        <button
          onClick={next}
          disabled={picked === null}
          className="w-full h-14 rounded-2xl bg-foreground text-background font-bold text-base disabled:opacity-30 active:scale-[0.98] transition-transform"
        >
          {i + 1 >= questions.length ? "Continue to Summary" : "Next Question"}
        </button>
      </div>
    </div>
  );
};

/* ---------------- Summary Reader ---------------- */

const SummaryReader = ({ book, onBuy }: { book: Book; onBuy: () => void }) => {
  const pages = useMemo(() => (book.summary_pages ?? []).filter(Boolean), [book.summary_pages]);
  const titles = useMemo(() => book.summary_page_titles ?? [], [book.summary_page_titles]);
  const total = pages.length;
  const [p, setP] = useState(0);
  const [size, setSize] = useState<0 | 1 | 2>(1);
  const atEnd = p >= total;
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const fontCls = size === 0 ? "text-[17px] leading-[1.75]" : size === 1 ? "text-[19px] leading-[1.8]" : "text-[22px] leading-[1.85]";

  const goPrev = () => setP((v) => Math.max(0, v - 1));
  const goNext = () => setP((v) => Math.min(total, v + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null; touchStartY.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) goNext(); else goPrev();
  };

  if (total === 0) {
    return (
      <div className="h-full flex items-center justify-center px-8 text-center">
        <div>
          <p className="text-foreground text-lg font-bold mb-2">Summary coming soon</p>
          <button onClick={onBuy} className="mt-4 h-12 px-6 rounded-xl font-bold" style={{ backgroundColor: "#1DB954", color: "#000" }}>Buy on Amazon</button>
        </div>
      </div>
    );
  }

  const currentTitle = !atEnd ? (titles[p]?.trim() || `Page ${p + 1}`) : "Complete";

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-12 pb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.22em] font-semibold">
            {atEnd ? "Complete" : `${p + 1} / ${total}`}
          </p>
          <h1 className="text-foreground text-[22px] font-extrabold leading-tight mt-1 truncate">{currentTitle}</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TypeIcon size={14} className="text-muted-foreground" />
          {[0, 1, 2].map((s) => (
            <button key={s} onClick={() => setSize(s as 0 | 1 | 2)}
              className={`w-7 h-7 rounded-full text-xs font-bold ${size === s ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
              A<span className="sr-only">size {s}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-3">
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-foreground transition-all" style={{ width: `${Math.min(100, ((p + (atEnd ? 0 : 1)) / total) * 100)}%` }} />
        </div>
      </div>

      <div
        key={p}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-y-auto px-7 pt-4 pb-8 animate-fade-in select-none"
      >
        {!atEnd ? (
          <p className={`text-foreground ${fontCls} whitespace-pre-line font-[400]`} style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {pages[p]}
          </p>
        ) : (
          <div className="text-center pt-10">
            <h2 className="text-foreground text-2xl font-extrabold">Enjoyed this summary?</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">Read the complete book for the full experience.</p>
            <div className="mt-8 w-40 aspect-[2/3] mx-auto rounded-2xl overflow-hidden shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/40 flex items-center gap-3">
        {atEnd ? (
          <button onClick={onBuy}
            className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-[0_15px_40px_-10px_rgba(29,185,84,0.6)] active:scale-[0.98]"
            style={{ backgroundColor: "#1DB954", color: "#000" }}>
            <ShoppingCart size={18} /> Buy on Amazon
          </button>
        ) : (
          <>
            <button onClick={goPrev} disabled={p === 0}
              className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center disabled:opacity-30">
              <ChevronLeft size={20} className="text-foreground" />
            </button>
            <button onClick={goNext}
              className="flex-1 h-12 rounded-full bg-foreground text-background font-semibold flex items-center justify-center gap-2">
              {p + 1 === total ? "Finish" : "Next"} <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/* ---------------- Audio Player ---------------- */

const AudioPlayer = ({ book }: { book: Book }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onMeta = () => setDur(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: book.title, artist: book.author, album: "Summary",
      artwork: [{ src: book.cover_url, sizes: "512x512", type: "image/jpeg" }],
    });
    const a = audioRef.current;
    navigator.mediaSession.setActionHandler("play", () => a?.play());
    navigator.mediaSession.setActionHandler("pause", () => a?.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => { if (a) a.currentTime = Math.max(0, a.currentTime - 15); });
    navigator.mediaSession.setActionHandler("seekforward", () => { if (a) a.currentTime = Math.min(a.duration || 0, a.currentTime + 15); });
  }, [book]);

  const toggle = async () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { await a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };
  const skip = (s: number) => { const a = audioRef.current; if (!a) return; a.currentTime = Math.max(0, Math.min((a.duration || 0), a.currentTime + s)); };
  const setSpeed = (r: number) => { setRate(r); if (audioRef.current) audioRef.current.playbackRate = r; };
  const fmt = (t: number) => { if (!isFinite(t)) return "0:00"; const m = Math.floor(t / 60); const s = Math.floor(t % 60); return `${m}:${s.toString().padStart(2, "0")}`; };

  if (!book.audio_url) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No audio available yet.</div>;
  }

  return (
    <div className="h-full flex flex-col items-center justify-between pt-16 pb-10 px-8">
      <audio ref={audioRef} src={book.audio_url} preload="metadata" />
      <div className="flex flex-col items-center">
        <p className="text-muted-foreground text-[11px] uppercase tracking-[0.2em] font-semibold">Audio Summary</p>
      </div>
      <div className="flex flex-col items-center gap-5 w-full">
        <div className="w-52 aspect-square rounded-3xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
        </div>
        <div className="text-center">
          <h2 className="text-foreground text-xl font-extrabold">{book.title}</h2>
          <p className="text-muted-foreground text-sm mt-1">{book.author}</p>
        </div>
      </div>

      <div className="w-full max-w-md">
        <input type="range" min={0} max={dur || 0} step={0.1} value={cur}
          onChange={(e) => { const v = Number(e.target.value); if (audioRef.current) audioRef.current.currentTime = v; setCur(v); }}
          className="w-full accent-foreground" />
        <div className="flex justify-between text-muted-foreground text-[11px] font-mono mt-1">
          <span>{fmt(cur)}</span><span>{fmt(dur)}</span>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6">
          <button onClick={() => skip(-15)} className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <Rewind size={20} className="text-foreground" />
          </button>
          <button onClick={toggle} className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center active:scale-95 transition-transform">
            {playing ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
          </button>
          <button onClick={() => skip(15)} className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <FastForward size={20} className="text-foreground" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {[0.75, 1, 1.25, 1.5, 2].map((r) => (
            <button key={r} onClick={() => setSpeed(r)}
              className={`px-3 h-8 rounded-full text-xs font-bold ${rate === r ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
              {r}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookDetailSheet;
