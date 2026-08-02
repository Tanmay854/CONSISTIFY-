import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  X, Star, ShoppingCart, BookOpen, Headphones, ChevronLeft, ChevronRight,
  Play, Pause, Rewind, FastForward, Type as TypeIcon, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Book, QuizQuestion } from "@/lib/bookCategories";
import { normalizeSummaryText } from "@/lib/textNormalize";

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

const MORPH_MS = 280;
const MORPH_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const CONTENT_MS = 220;
const CONTENT_DELAY = 110;
const FADE_MS = 150;

type Rect = { top: number; left: number; width: number; height: number };
export type OpenOrigin = { card: Rect; cover: Rect };

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

const BookDetailSheet = ({ book, onClose, origin }: { book: Book; onClose: () => void; origin?: OpenOrigin | null }) => {
  const [mode, setMode] = useState<Mode>("overview");
  const [summaryStart, setSummaryStart] = useState(0);
  const [similar, setSimilar] = useState<Book[]>([]);
  const overviewScrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollY = useRef(0);
  const closingRef = useRef(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const reduced = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canMorph = !!origin && !reduced;

  // "start" = mapped onto the card, "open" = identity (full layout), "done" = morph layer idle
  const [phase, setPhase] = useState<"start" | "open" | "done">(canMorph ? "start" : "done");
  const [contentIn, setContentIn] = useState(!canMorph);
  const [coverTarget, setCoverTarget] = useState<Rect | null>(null);

  const measureCover = () => {
    const el = rootRef.current?.querySelector("[data-book-cover]");
    if (el) setCoverTarget(rectOf(el));
    return !!el;
  };

  // Measure the final cover position before the browser paints the first frame.
  useLayoutEffect(() => {
    if (!canMorph) return;
    measureCover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canMorph) { setContentIn(true); return; }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setPhase("open");
        setContentIn(true);
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (canMorph && measureCover()) {
      setContentIn(false);            // content fades out immediately
      setPhase("open");               // re-show morph layer at identity
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase("start")));
    } else {
      setContentIn(false);
      setTimeout(onClose, FADE_MS);
    }
  };

  // Drive phase completion off the real transition, never a guessed timeout.
  const onSheetTransitionEnd = (e: React.TransitionEvent) => {
    if (e.target !== sheetRef.current || e.propertyName !== "transform") return;
    if (closingRef.current) onClose();
    else setPhase("done");
  };

  // Defer network + heavy paint work until the morph has finished (keeps it 90fps).
  const [settled, setSettled] = useState(!canMorph);
  useEffect(() => {
    if (phase === "done") setSettled(true);
  }, [phase]);

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("books").select("*")
        .neq("id", book.id).eq("category", book.category)
        .eq("is_published", true).limit(10);
      if (!cancelled) setSimilar(((data as unknown) as Book[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [book.id, book.category, settled]);


  // Restore overview scroll when returning from summary/quiz/audio
  useEffect(() => {
    if (mode === "overview" && overviewScrollRef.current) {
      overviewScrollRef.current.scrollTop = savedScrollY.current;
    }
  }, [mode]);

  const openSummaryAt = (idx: number) => {
    if (overviewScrollRef.current) savedScrollY.current = overviewScrollRef.current.scrollTop;
    setSummaryStart(idx);
    setMode("summary");
  };
  const goMode = (m: Mode) => {
    if (overviewScrollRef.current) savedScrollY.current = overviewScrollRef.current.scrollTop;
    setMode(m);
  };

  const morphing = canMorph && phase !== "done";
  const atCard = phase === "start";
  const cardRect = origin?.card;
  const coverFrom = origin?.cover;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1;

  const morphTransition = `transform ${MORPH_MS}ms ${MORPH_EASE}, opacity ${MORPH_MS}ms ${MORPH_EASE}, border-radius ${MORPH_MS}ms ${MORPH_EASE}`;

  // Sheet lives at its final full-screen layout; an initial transform maps it onto the card.
  const sheetTransform = atCard && cardRect
    ? `translate3d(${cardRect.left}px, ${cardRect.top}px, 0) scale(${cardRect.width / vw}, ${cardRect.height / vh})`
    : "none";

  // Cover lives at its final rect; an initial transform maps it onto the card's cover.
  const coverTransform = atCard && coverFrom && coverTarget
    ? `translate3d(${coverFrom.left - coverTarget.left}px, ${coverFrom.top - coverTarget.top}px, 0) scale(${coverFrom.width / coverTarget.width})`
    : "none";

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 bg-background overflow-hidden"
      style={{
        height: "100dvh",
        opacity: canMorph ? 1 : contentIn ? 1 : 0,
        transition: canMorph ? undefined : `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      {/* Morph layer: sheet background tinted with this book's cover, + cover artwork */}
      {morphing && (
        <>
          <div
            aria-hidden
            ref={sheetRef}
            onTransitionEnd={onSheetTransitionEnd}
            style={{
              position: "fixed",
              top: 0, left: 0, width: `${vw}px`, height: `${vh}px`,
              transformOrigin: "top left",
              transform: sheetTransform,
              borderRadius: atCard ? "16px" : "0px",
              transition: morphTransition,
              overflow: "hidden",
              willChange: "transform",
              zIndex: 30,
              backgroundColor: "hsl(var(--background))",
            }}
          >
            {/* No blur filter here: filters force an expensive repaint every frame. */}
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background/90 to-background" />

          </div>
          <img
            aria-hidden
            src={book.cover_url}
            alt=""
            style={{
              position: "fixed",
              top: coverTarget ? `${coverTarget.top}px` : 0,
              left: coverTarget ? `${coverTarget.left}px` : 0,
              width: coverTarget ? `${coverTarget.width}px` : 0,
              height: coverTarget ? `${coverTarget.height}px` : 0,
              transformOrigin: "top left",
              transform: coverTransform,
              transition: morphTransition,
              borderRadius: "16px",
              overflow: "hidden",
              objectFit: "cover",
              willChange: "transform",
              zIndex: 31,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.9)",
            }}
          />
        </>
      )}


      <div
        style={{
          height: "100%",
          opacity: contentIn ? 1 : 0,
          transform: contentIn ? "translateY(0)" : "translateY(10px)",
          transition: canMorph
            ? `opacity ${CONTENT_MS}ms ease-out ${contentIn ? CONTENT_DELAY : 0}ms, transform ${CONTENT_MS}ms ease-out ${contentIn ? CONTENT_DELAY : 0}ms`
            : undefined,
          willChange: "opacity, transform",
        }}
      >
        <button
          onClick={mode === "overview" ? requestClose : () => setMode("overview")}
          aria-label="Close"
          className="fixed top-4 right-4 z-20 w-10 h-10 rounded-full bg-secondary/80 backdrop-blur flex items-center justify-center"
        >
          <X size={20} className="text-foreground" />
        </button>

        {mode === "overview" && <Overview scrollRef={overviewScrollRef} book={book} similar={similar} onQuiz={() => goMode("quiz")} onListen={() => goMode("audio")} onOpenPage={openSummaryAt} onBuy={() => openAmazon(book.amazon_url)} />}
        {mode === "quiz" && <QuizFlow book={book} onDone={() => openSummaryAt(0)} />}
        {mode === "summary" && <SummaryReader book={book} startPage={summaryStart} onBuy={() => openAmazon(book.amazon_url)} />}
        {mode === "audio" && <AudioPlayer book={book} />}
      </div>
    </div>
  );
};

/* ---------------- Overview ---------------- */

const Overview = ({ book, similar, onQuiz, onListen, onOpenPage, onBuy, scrollRef }: { book: Book; similar: Book[]; onQuiz: () => void; onListen: () => void; onOpenPage: (idx: number) => void; onBuy: () => void; scrollRef: React.MutableRefObject<HTMLDivElement | null> }) => {
  const { user } = useAuth();
  const lt = book.listening_time_minutes ? `${book.listening_time_minutes} min` : "—";
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto pb-24">
      <div className="relative pt-14 pb-8 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40 blur-3xl"
          style={{ backgroundImage: `url(${book.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/80 to-background" />

        <div className="flex flex-col items-center gap-5">
          <div data-book-cover className="w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="text-center max-w-sm">
            <p className="text-primary text-[11px] uppercase tracking-[0.2em] font-semibold mb-2">{book.category}</p>
            <h1 className="text-foreground text-2xl font-extrabold leading-tight">{book.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">by {book.author}</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <Rating value={book.rating} />
              {user && book.public_id && <span className="text-muted-foreground text-[11px] font-mono">#{book.public_id}</span>}
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
          onClick={onBuy}
          disabled={!book.amazon_url}
          className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-[0_15px_40px_-10px_rgba(29,185,84,0.6)] active:scale-[0.98] transition-transform disabled:opacity-40"
          style={{ backgroundColor: "#1DB954", color: "#000" }}
        >
          <ShoppingCart size={18} /> Buy on Amazon
        </button>
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
          className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
          style={{ backgroundColor: "#facc15", color: "#000" }}
        >
          <Headphones size={18} /> Listen to Summary
        </button>
      </div>

      {(book.summary_pages ?? []).filter(Boolean).length > 0 && (
        <section className="px-6 py-5 border-t border-border/60 mt-2 space-y-2">
          <h3 className="text-foreground text-sm font-bold uppercase tracking-wider mb-3">Summary</h3>
          {(book.summary_pages ?? []).filter(Boolean).map((_, idx) => {
            const title = (book.summary_page_titles?.[idx] ?? "").trim();
            return (
              <button
                key={idx}
                onClick={() => onOpenPage(idx)}
                className="w-full text-left rounded-2xl bg-secondary/40 border border-border/40 p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-primary text-[11px] uppercase tracking-[0.2em] font-semibold">Page {idx + 1}</p>
                  <p className="text-foreground text-[15px] font-bold mt-1 break-words">{title || `Page ${idx + 1}`}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
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
  // Randomize the option order for each question (stable per question per session)
  const order = useMemo(() => {
    const n = q?.options?.length ?? 0;
    const arr = Array.from({ length: n }, (_, k) => k);
    for (let k = arr.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [arr[k], arr[j]] = [arr[j], arr[k]];
    }
    return arr;
  }, [q]);


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
          {order.map((origIdx, pos) => {
            const opt = q.options[origIdx];
            const isPicked = picked === origIdx;
            const revealed = picked !== null;
            const cls = !revealed
              ? "border-border bg-secondary/40"
              : isPicked
                ? "border-foreground bg-foreground/10"
                : "border-border bg-secondary/20 opacity-60";
            return (
              <button
                key={origIdx}
                disabled={revealed}
                onClick={() => setPicked(origIdx)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${cls}`}
              >
                <span className="w-6 h-6 shrink-0 rounded-full border border-border flex items-center justify-center text-xs font-bold">
                  {String.fromCharCode(65 + pos)}
                </span>
                <span className="text-foreground text-sm font-medium flex-1">{opt}</span>
              </button>
            );
          })}

        </div>
        {picked !== null && (() => {
          const rawLabel = (q.option_explanations?.[picked] || "").trim();
          const normalized = rawLabel.toLowerCase();
          let label: "Excellent" | "Good" | "Not Truly Correct" | "Wrong";
          if (/excellent/.test(normalized)) label = "Excellent";
          else if (/not\s*truly/.test(normalized)) label = "Not Truly Correct";
          else if (/good/.test(normalized)) label = "Good";
          else if (/wrong/.test(normalized)) label = "Wrong";
          else label = picked === q.correct ? "Excellent" : "Wrong";
          const style =
            label === "Excellent" || label === "Good"
              ? { tone: "text-emerald-400", ring: "border-emerald-500/40 bg-emerald-500/10" }
              : label === "Not Truly Correct"
                ? { tone: "text-yellow-400", ring: "border-yellow-500/40 bg-yellow-500/10" }
                : { tone: "text-red-400", ring: "border-red-500/40 bg-red-500/10" };
          return (
            <div className={`mt-5 p-4 rounded-xl border ${style.ring}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${style.tone}`}>{label}</p>
              {q.explanation && (
                <p className="mt-2 text-sm text-foreground/85 leading-relaxed">{q.explanation}</p>
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

const SummaryReader = ({ book, onBuy, startPage = 0 }: { book: Book; onBuy: () => void; startPage?: number }) => {
  const pages = useMemo(() => (book.summary_pages ?? []).map(normalizeSummaryText).filter(Boolean), [book.summary_pages]);
  const titles = useMemo(() => book.summary_page_titles ?? [], [book.summary_page_titles]);
  const total = pages.length;
  const [p, setP] = useState(Math.min(Math.max(0, startPage), Math.max(0, total - 1)));
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
      <div className="px-6 pt-14 pb-2 pr-16 flex items-start justify-between gap-3">
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
          <p
            className={`text-foreground ${fontCls} font-[400]`}
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", whiteSpace: "normal", wordSpacing: "normal", letterSpacing: 0, textAlign: "left" }}
          >
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
  const [buffered, setBuffered] = useState(0);
  const [rate, setRate] = useState(1);
  const [loading, setLoading] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => { if (!scrubbing) setCur(a.currentTime); };
    const onMeta = () => setDur(a.duration || 0);
    const onEnd = () => setPlaying(false);
    const onWait = () => setLoading(true);
    const onCan = () => setLoading(false);
    const onProg = () => { if (a.buffered.length) setBuffered(a.buffered.end(a.buffered.length - 1)); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("waiting", onWait);
    a.addEventListener("canplay", onCan);
    a.addEventListener("playing", onCan);
    a.addEventListener("progress", onProg);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("waiting", onWait);
      a.removeEventListener("canplay", onCan);
      a.removeEventListener("playing", onCan);
      a.removeEventListener("progress", onProg);
    };
  }, [scrubbing]);

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
    try {
      navigator.mediaSession.setActionHandler("seekto", (d: any) => { if (a && typeof d.seekTime === "number") a.currentTime = d.seekTime; });
    } catch { /* empty */ }
  }, [book]);

  const toggle = async () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { await a.play().catch(() => {}); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };
  const skip = (s: number) => { const a = audioRef.current; if (!a) return; a.currentTime = Math.max(0, Math.min((a.duration || 0), a.currentTime + s)); };
  const setSpeed = (r: number) => { setRate(r); if (audioRef.current) audioRef.current.playbackRate = r; };
  const fmt = (t: number) => { if (!isFinite(t)) return "0:00"; const m = Math.floor(t / 60); const s = Math.floor(t % 60); return `${m}:${s.toString().padStart(2, "0")}`; };

  const onBarPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = pct * (dur || 0);
    setCur(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  if (!book.audio_url) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No audio available yet.</div>;
  }

  const pct = dur ? (cur / dur) * 100 : 0;
  const bpct = dur ? (buffered / dur) * 100 : 0;

  return (
    <div className="h-full flex flex-col relative overflow-y-auto bg-background">
      {/* Subtle cover backdrop */}
      <div className="absolute inset-x-0 top-0 h-2/3 -z-10 opacity-25 blur-3xl"
        style={{ backgroundImage: `url(${book.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/80 via-background/90 to-background" />

      <audio ref={audioRef} src={book.audio_url} preload="metadata" />

      <div className="pt-5 pb-3 px-6 shrink-0 text-center">
        <p className="text-muted-foreground text-[11px] uppercase tracking-[0.2em] font-semibold">Audio Summary</p>
      </div>


      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6 py-4 shrink-0">
        <div className={`w-44 aspect-[2/3] rounded-2xl overflow-hidden bg-secondary shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] transition-transform duration-500 ${playing ? "scale-100" : "scale-[0.97]"}`}>
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
        </div>
        <div className="text-center max-w-xs">
          <h2 className="text-foreground text-xl font-extrabold leading-tight">{book.title}</h2>
          <p className="text-muted-foreground text-sm mt-1">by {book.author}</p>
        </div>
      </div>

      <div className="px-6 w-full max-w-md mx-auto shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>

        {/* Scrub bar */}
        <div
          className="relative h-6 flex items-center touch-none cursor-pointer"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            setScrubbing(true);
            onBarPointer(e);
          }}
          onPointerMove={(e) => { if (scrubbing) onBarPointer(e); }}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
        >
          <div className="relative w-full h-1 rounded-full bg-foreground/20 overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-foreground/35" style={{ width: `${bpct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-foreground" style={{ width: `${pct}%` }} />
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-foreground shadow"
            style={{ left: `calc(${pct}% - 7px)` }} />
        </div>
        <div className="flex justify-between text-muted-foreground text-[11px] font-mono mt-1.5 tabular-nums">
          <span>{fmt(cur)}</span><span>-{fmt(Math.max(0, (dur || 0) - cur))}</span>
        </div>

        <div className="flex items-center justify-center gap-8 mt-6">
          <button onClick={() => skip(-15)} aria-label="Back 15s"
            className="w-12 h-12 rounded-full bg-secondary/70 backdrop-blur flex items-center justify-center active:scale-95 transition-transform">
            <Rewind size={20} className="text-foreground" />
          </button>
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"}
            className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center active:scale-95 transition-transform shadow-[0_15px_35px_-10px_rgba(255,255,255,0.35)]">
            {loading ? (
              <span className="h-6 w-6 rounded-full border-2 border-background/30 border-t-background animate-spin" />
            ) : playing ? <Pause size={26} className="fill-background" /> : <Play size={26} className="fill-background ml-0.5" />}
          </button>
          <button onClick={() => skip(15)} aria-label="Forward 15s"
            className="w-12 h-12 rounded-full bg-secondary/70 backdrop-blur flex items-center justify-center active:scale-95 transition-transform">
            <FastForward size={20} className="text-foreground" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {[0.75, 1, 1.25, 1.5, 2].map((r) => (
            <button key={r} onClick={() => setSpeed(r)}
              className={`px-3 h-8 rounded-full text-xs font-bold transition-colors ${rate === r ? "bg-foreground text-background" : "bg-secondary/70 text-muted-foreground"}`}>
              {r}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};


export default BookDetailSheet;
