import { useCallback, useRef, useState } from "react";
import { Search, Star, X, Play, Video, BookOpen, Music, Lightbulb, GraduationCap } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

export type LibraryBook = {
  id: string;
  title: string;
  author: string;
  rating: number;
  category: string;
  cover: string;
  excerpt: string;
  chapter: string;
};

const BOOKS: LibraryBook[] = [
  {
    id: "1",
    title: "The Discipline Code",
    author: "Marcus Hale",
    rating: 4.8,
    category: "Discipline",
    cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80",
    excerpt:
      "Discipline is not the punishment you inflict on yourself for wanting more. It is the quiet architecture beneath every result you admire in other people.",
    chapter: "Chapter 1 of 12",
  },
  {
    id: "2",
    title: "Deep Momentum",
    author: "Ivy Sorenson",
    rating: 4.6,
    category: "Productivity",
    cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&q=80",
    excerpt:
      "Momentum is cheaper than motivation. You do not need to feel ready — you need one honest repetition, repeated until the day carries itself.",
    chapter: "Chapter 3 of 9",
  },
  {
    id: "3",
    title: "Quiet Fire",
    author: "Ada Nwosu",
    rating: 4.4,
    category: "Motivation",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80",
    excerpt:
      "The loudest ambition burns out first. Keep a quiet fire: small, sheltered, tended daily — the kind that is still lit when everyone else has gone cold.",
    chapter: "Chapter 2 of 10",
  },
  {
    id: "4",
    title: "The Long Focus",
    author: "Ren Takahashi",
    rating: 4.9,
    category: "Productivity",
    cover: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80",
    excerpt:
      "Attention is the only currency you spend that you can never earn back. Spend it the way a craftsman spends daylight — deliberately, and on one thing.",
    chapter: "Chapter 5 of 14",
  },
  {
    id: "5",
    title: "Iron Habits",
    author: "Cora Bennet",
    rating: 4.2,
    category: "Discipline",
    cover: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80",
    excerpt:
      "A habit is a decision you refuse to make twice. Build enough of them and your future stops depending on how you feel when you wake up.",
    chapter: "Chapter 1 of 8",
  },
  {
    id: "6",
    title: "Begin Again",
    author: "Silas Moreau",
    rating: 4.5,
    category: "Motivation",
    cover: "https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?w=600&q=80",
    excerpt:
      "Starting over is not failure repeating itself. It is the only skill that compounds faster than talent, and the only one nobody can take from you.",
    chapter: "Chapter 4 of 11",
  },
];

const FILTERS = ["All", "Discipline", "Motivation", "Productivity"];

/* ------------------------------------------------------------------ */
/* Timings                                                             */
/* ------------------------------------------------------------------ */

const T = {
  lift: 160,
  expand: 520,
  rotate: 420,
  contentDelay: 120,
  scrim: 250,
  readerFade: 300,
  contentSlide: 400,
};

const EASE = {
  lift: "cubic-bezier(.3,.6,.3,1)",
  expand: "cubic-bezier(.16,1.15,.3,1)",
  rotate: "cubic-bezier(.45,0,.2,1)",
};

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const BookLibrary = () => {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [openBook, setOpenBook] = useState<LibraryBook | null>(null);
  const [scrimOn, setScrimOn] = useState(false);
  const [readerOn, setReaderOn] = useState(false);
  const [contentOn, setContentOn] = useState(false);
  const [interactive, setInteractive] = useState(false);

  const isAnimating = useRef(false);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  const visible = BOOKS.filter((b) => {
    const q = query.trim().toLowerCase();
    if (filter !== "All" && b.category !== filter) return false;
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  /* --- open ------------------------------------------------------- */
  const open = useCallback(async (book: LibraryBook, el: HTMLElement) => {
    if (isAnimating.current || openBook) return;
    isAnimating.current = true;

    const rect = el.getBoundingClientRect();
    rectRef.current = rect;
    originRef.current = el;
    el.style.visibility = "hidden";

    setOpenBook(book);

    const reduced = prefersReduced();

    // Build the ghost
    const ghost = document.createElement("div");
    ghost.style.cssText = `
      position:fixed;left:${rect.left}px;top:${rect.top}px;
      width:${rect.width}px;height:${rect.height}px;
      border-radius:10px;overflow:hidden;z-index:120;
      transform-origin:left center;backface-visibility:hidden;
      will-change:left,top,width,height,transform,border-radius;
      box-shadow:0 10px 30px -12px rgba(0,0,0,.7);
      background:#1c1c1e;
    `;
    const img = document.createElement("img");
    img.src = book.cover;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;backface-visibility:hidden;";
    ghost.appendChild(img);
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    if (reduced) {
      setScrimOn(true);
      setReaderOn(true);
      setContentOn(true);
      ghost.remove();
      ghostRef.current = null;
      setInteractive(true);
      isAnimating.current = false;
      return;
    }

    // 1. Lift
    requestAnimationFrame(() => {
      setScrimOn(true);
      ghost.style.transition = `transform ${T.lift}ms ${EASE.lift}, box-shadow ${T.lift}ms ${EASE.lift}`;
      ghost.style.transform = "scale(1.035)";
      ghost.style.boxShadow = "0 40px 80px -20px rgba(0,0,0,.9)";
    });
    await wait(T.lift);

    // 2. Expand to fullscreen
    ghost.style.transition = `left ${T.expand}ms ${EASE.expand}, top ${T.expand}ms ${EASE.expand}, width ${T.expand}ms ${EASE.expand}, height ${T.expand}ms ${EASE.expand}, border-radius ${T.expand}ms ${EASE.expand}, transform ${T.expand}ms ${EASE.expand}`;
    ghost.style.left = "0px";
    ghost.style.top = "0px";
    ghost.style.width = "100vw";
    ghost.style.height = "100vh";
    ghost.style.borderRadius = "0px";
    ghost.style.transform = "scale(1)";
    await wait(T.expand);

    // 3. Page-turn reveal
    ghost.style.transition = `transform ${T.rotate}ms ${EASE.rotate}`;
    ghost.style.transform = "rotateY(-100deg)";
    setReaderOn(true);
    setTimeout(() => setContentOn(true), T.contentDelay);
    await wait(T.rotate);

    // 4. Cleanup
    ghost.remove();
    ghostRef.current = null;
    setInteractive(true);
    isAnimating.current = false;
  }, [openBook]);

  /* --- close ------------------------------------------------------ */
  const close = useCallback(async () => {
    if (isAnimating.current || !openBook) return;
    isAnimating.current = true;
    setInteractive(false);

    const rect = rectRef.current;
    const el = originRef.current;
    const reduced = prefersReduced();

    const restore = () => {
      if (el) el.style.visibility = "";
      setOpenBook(null);
      setScrimOn(false);
      setReaderOn(false);
      setContentOn(false);
      isAnimating.current = false;
    };

    if (reduced || !rect) {
      restore();
      return;
    }

    // Rebuild a fullscreen ghost, already "open"
    const ghost = document.createElement("div");
    ghost.style.cssText = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;
      border-radius:0;overflow:hidden;z-index:120;
      transform-origin:left center;backface-visibility:hidden;
      will-change:left,top,width,height,transform,border-radius;
      transform:rotateY(-100deg);
      box-shadow:0 40px 80px -20px rgba(0,0,0,.9);background:#1c1c1e;
    `;
    const img = document.createElement("img");
    img.src = openBook.cover;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;backface-visibility:hidden;";
    ghost.appendChild(img);
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    // 1. Fade out reader content
    setContentOn(false);
    await wait(T.contentDelay);
    setReaderOn(false);

    // 2. Rotate flat
    requestAnimationFrame(() => {
      ghost.style.transition = `transform ${T.rotate}ms ${EASE.rotate}`;
      ghost.style.transform = "rotateY(0deg)";
    });
    await wait(T.rotate);

    // 3. Shrink back to grid rect
    ghost.style.transition = `left ${T.expand}ms ${EASE.expand}, top ${T.expand}ms ${EASE.expand}, width ${T.expand}ms ${EASE.expand}, height ${T.expand}ms ${EASE.expand}, border-radius ${T.expand}ms ${EASE.expand}, box-shadow ${T.expand}ms ${EASE.expand}`;
    const now = el?.getBoundingClientRect() ?? rect;
    ghost.style.left = `${now.left}px`;
    ghost.style.top = `${now.top}px`;
    ghost.style.width = `${now.width}px`;
    ghost.style.height = `${now.height}px`;
    ghost.style.borderRadius = "10px";
    ghost.style.boxShadow = "0 10px 30px -12px rgba(0,0,0,.7)";
    setScrimOn(false);
    await wait(T.expand);

    // 4. Restore
    ghost.remove();
    ghostRef.current = null;
    restore();
  }, [openBook]);

  /* --- render ----------------------------------------------------- */
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[520px] pb-32">
        {/* Header */}
        <header className="sticky top-0 z-20 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-3 bg-black/70 backdrop-blur-xl">
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="text-2xl font-extrabold tracking-tight">Books</h1>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/45">Library</span>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books or authors"
              className="w-full h-11 pl-11 pr-4 rounded-2xl bg-[#1c1c1e] text-sm text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto mt-3 -mx-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === f ? "bg-white text-black" : "bg-[#2c2c2e] text-white/60"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {/* Grid */}
        <h2 className="px-5 pt-5 pb-3 text-sm font-bold uppercase tracking-wider">Featured</h2>
        <div className="grid grid-cols-2 gap-4 px-5">
          {visible.map((b) => (
            <BookCard key={b.id} book={b} onOpen={open} />
          ))}
          {visible.length === 0 && (
            <p className="col-span-2 text-center text-sm text-white/40 py-14">No books found.</p>
          )}
        </div>
      </div>

      {/* Scrim */}
      <div
        className="fixed inset-0 z-[110] bg-black"
        style={{
          opacity: scrimOn ? 1 : 0,
          transition: `opacity ${T.scrim}ms ease`,
          pointerEvents: openBook ? "auto" : "none",
        }}
        aria-hidden={!openBook}
      />

      {/* Reader */}
      {openBook && (
        <div
          className="fixed inset-0 z-[115]"
          style={{
            opacity: readerOn ? 1 : 0,
            transition: `opacity ${T.readerFade}ms ease`,
            pointerEvents: interactive ? "auto" : "none",
          }}
        >
          <Reader book={openBook} contentOn={contentOn} onClose={close} />
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-[100] border-t border-white/10"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto max-w-[520px] flex items-center justify-around h-[58px]">
          {[
            { icon: Video, label: "Videos" },
            { icon: BookOpen, label: "Books", active: true },
            { icon: Music, label: "Music" },
            { icon: Lightbulb, label: "Quotes" },
            { icon: GraduationCap, label: "Courses" },
          ].map(({ icon: Icon, label, active }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon size={20} className={active ? "text-white" : "text-white/45"} />
              <span className={`text-[10px] ${active ? "text-white" : "text-white/45"}`}>{label}</span>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const BookCard = ({
  book,
  onOpen,
}: {
  book: LibraryBook;
  onOpen: (b: LibraryBook, el: HTMLElement) => void;
}) => {
  const coverRef = useRef<HTMLDivElement>(null);
  return (
    <button
      onClick={() => coverRef.current && onOpen(book, coverRef.current)}
      className="text-left flex flex-col active:scale-[0.97] transition-transform"
      style={{ perspective: "1200px" }}
    >
      <div
        ref={coverRef}
        className="w-full aspect-[2/3] rounded-[10px] overflow-hidden bg-[#1c1c1e] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)]"
      >
        <img src={book.cover} alt={`${book.title} cover`} loading="lazy" className="w-full h-full object-cover" />
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug line-clamp-2">{book.title}</p>
      <p className="mt-1 text-[10px] text-white/45 line-clamp-1">{book.author}</p>
      <span className="mt-auto pt-1 flex items-center gap-0.5 text-[10px]">
        <Star size={10} className="fill-yellow-400 text-yellow-400" /> {book.rating.toFixed(1)}
      </span>
    </button>
  );
};

/* ------------------------------------------------------------------ */

const Reader = ({
  book,
  contentOn,
  onClose,
}: {
  book: LibraryBook;
  contentOn: boolean;
  onClose: () => void;
}) => (
  <div className="h-full w-full bg-black flex flex-col">
    <div className="flex items-center justify-between px-5 pt-6">
      <button
        onClick={onClose}
        aria-label="Close reader"
        className="w-9 h-9 rounded-full bg-[#1c1c1e] flex items-center justify-center"
      >
        <X size={16} className="text-white" />
      </button>
      <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">{book.chapter}</span>
    </div>

    <div
      className="flex-1 overflow-y-auto px-7 flex flex-col items-center justify-center text-center"
      style={{
        opacity: contentOn ? 1 : 0,
        transform: contentOn ? "translateY(0)" : "translateY(14px)",
        transition: `opacity ${T.contentSlide}ms ease, transform ${T.contentSlide}ms cubic-bezier(.22,1,.36,1)`,
        willChange: "transform, opacity",
      }}
    >
      <div className="w-32 aspect-[2/3] rounded-xl overflow-hidden shadow-[0_30px_60px_-25px_rgba(0,0,0,0.9)]">
        <img src={book.cover} alt="" className="w-full h-full object-cover" />
      </div>
      <h2 className="mt-5 text-xl font-bold">{book.title}</h2>
      <p className="mt-1 text-xs text-white/45">{book.author}</p>
      <p className="mt-6 text-[15px] leading-relaxed text-white/75 max-w-[42ch]">{book.excerpt}</p>
    </div>

    <div
      className="px-7 pt-4 pb-8 flex items-center gap-4"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
    >
      <button
        aria-label="Play audio summary"
        className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0"
      >
        <Play size={18} className="text-black fill-black ml-0.5" />
      </button>
      <div className="flex-1">
        <div className="h-1 rounded-full bg-[#2c2c2e] overflow-hidden">
          <div className="h-full w-1/3 bg-white rounded-full" />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/40 tabular-nums">
          <span>04:12</span>
          <span>12:30</span>
        </div>
      </div>
    </div>
  </div>
);

export default BookLibrary;
