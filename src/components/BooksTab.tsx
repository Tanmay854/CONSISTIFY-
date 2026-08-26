import { useEffect, useMemo, useState, useCallback, useRef, useId } from "react";
import { Search, X, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BOOK_CATEGORIES, type Book } from "@/lib/bookCategories";
import { sharedCoverUrl } from "@/lib/coverUrl";

import BookDetailSheet from "./BookDetailSheet";

type OpenHandler = (b: Book, coverLayoutId: string, el: HTMLElement) => void;
type SelectedBook = { book: Book; coverLayoutId: string; originEl: HTMLElement };

const POPULAR = ["Discipline", "Atomic Habits", "Deep Work", "Stoicism", "Focus"];
const RECENT_KEY = "book_recent_searches";
const HIDDEN_CATEGORIES = new Set(["Fitness", "Psychology"]);
const VISIBLE_CATEGORIES = BOOK_CATEGORIES.filter((c) => !HIDDEN_CATEGORIES.has(c));

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};


const useRecent = () => {
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  const push = (q: string) => {
    const t = q.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* empty */ }
  };
  const clear = () => { setRecent([]); try { localStorage.removeItem(RECENT_KEY); } catch { /* empty */ } };
  return { recent, push, clear };
};

const BooksTab = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selected, setSelected] = useState<SelectedBook | null>(null);
  const [staticDismiss, setStaticDismiss] = useState(false);
  const { recent, push, clear } = useRecent();
  const canSearchById = false;

  const [requestClose, setRequestClose] = useState(false);

  const openBook = useCallback((b: Book, coverLayoutId: string, el: HTMLElement) => {
    setRequestClose(false);
    setStaticDismiss(false);
    setSelected({ book: b, coverLayoutId, originEl: el });
  }, []);
  const closeBook = useCallback(() => {
    setRequestClose(true);
  }, []);
  const completeClose = useCallback(() => {
    setSelected(null);
    setRequestClose(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("books")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(1000);
    setBooks((data as unknown as Book[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (window as any).__openBook = (b: Book) => setSelected({ book: b, coverLayoutId: `similar-book-cover-${b.id}`, originEl: document.body });
    return () => { delete (window as any).__openBook; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = books;
    if (activeCategory) list = list.filter((b) => b.category === activeCategory);
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          (canSearchById && b.public_id?.toLowerCase() === q),
      );
    }
    return list;
  }, [books, query, activeCategory, canSearchById]);

  // Reshuffle the ordering of every row every 5 minutes
  const [shuffleTick, setShuffleTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setShuffleTick((t) => t + 1), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  const featured = useMemo(() => shuffle(books.filter((b) => b.is_featured)).slice(0, 8), [books, shuffleTick]);
  const trending = useMemo(() => shuffle(books.filter((b) => b.is_trending)).slice(0, 20), [books, shuffleTick]);
  const bestSellers = useMemo(() => shuffle(books.filter((b) => b.is_best_seller)).slice(0, 20), [books, shuffleTick]);
  const newReleases = useMemo(() => shuffle(books.filter((b) => b.is_new_release)).slice(0, 20), [books, shuffleTick]);
  const recommended = useMemo(() => shuffle(books).slice(0, 20), [books, shuffleTick]);

  // Category rows: shuffled once per books/tick change, never on unrelated re-renders
  // (e.g. opening or closing a book detail sheet).
  const categoryRows = useMemo(
    () =>
      VISIBLE_CATEGORIES.map((cat) => ({
        cat,
        list: shuffle(books.filter((b) => b.category === cat)).slice(0, 20),
      })).filter((r) => r.list.length > 0),
    [books, shuffleTick],
  );
  /* eslint-enable react-hooks/exhaustive-deps */



  const isSearching = query.trim().length > 0 || activeCategory;

  const scrollListTop = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <div
      ref={listRef}
      className="h-[100dvh] overflow-y-auto overscroll-contain scrollbar-hide bg-background pb-24"
    >

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 px-5 border-b border-border/40">
        <div className="flex items-baseline justify-between mb-3 pl-11">
          <h1 className="text-foreground text-2xl font-extrabold tracking-tight">Books</h1>
          <span className="text-muted-foreground text-[11px] uppercase tracking-[0.2em]">Library</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder={canSearchById ? "Search books, authors, or #ID" : "Search books or authors"}
            className="w-full h-11 pl-11 pr-10 rounded-2xl bg-secondary/70 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/60"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center"
              aria-label="Clear"
            >
              <X size={12} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 mt-3">
          <Chip active={!activeCategory} onClick={() => { setActiveCategory(null); scrollListTop(); }}>All</Chip>
          {VISIBLE_CATEGORIES.map((c) => (
            <Chip key={c} active={activeCategory === c} onClick={() => { setActiveCategory(activeCategory === c ? null : c); scrollListTop(); }}>
              {c}
            </Chip>
          ))}
        </div>
      </header>

      {/* Search suggestions panel */}
      {searchFocused && !query && (
        <div className="px-5 pt-4">
          {recent.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Recent</h4>
                <button onClick={clear} className="text-muted-foreground text-[11px]">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={r} onMouseDown={() => setQuery(r)} className="px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs">{r}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold mb-2">Popular</h4>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((r) => (
                <button key={r} onMouseDown={() => { setQuery(r); push(r); }} className="px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs">{r}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Search className="text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold">The library is being curated.</p>
          <p className="text-muted-foreground text-sm mt-1">New books will appear here soon.</p>
        </div>
      ) : isSearching ? (
        <SearchResults books={filtered} sharedCoverVisible={!staticDismiss} onOpen={(b, coverLayoutId, el) => { openBook(b, coverLayoutId, el); push(query); }} />
      ) : (
        <div className="pt-5 space-y-8">
          {featured.length > 0 && <FeaturedHero books={featured} onOpen={openBook} sharedCoverVisible={!staticDismiss} />}
          {recommended.length > 0 && <Row title="Recommended for you" books={recommended} onOpen={openBook} sharedCoverVisible={!staticDismiss} />}
          {trending.length > 0 && <Row title="Trending" books={trending} onOpen={openBook} sharedCoverVisible={!staticDismiss} />}
          {bestSellers.length > 0 && <Row title="Best sellers" books={bestSellers} onOpen={openBook} sharedCoverVisible={!staticDismiss} />}
          {newReleases.length > 0 && <Row title="New releases" books={newReleases} onOpen={openBook} sharedCoverVisible={!staticDismiss} />}

          {categoryRows.map(({ cat, list }) => (
            <Row key={cat} title={cat} books={list} onOpen={openBook} onSeeAll={() => setActiveCategory(cat)} sharedCoverVisible={!staticDismiss} />
          ))}


        </div>
      )}

      {/* The grid stays mounted the whole time the sheet is open, so closing
          reveals it again with no black flash. */}
      <AnimatePresence>
        {selected && (
          <BookDetailSheet
            key={`${selected.book.id}-${selected.coverLayoutId}`}
            book={selected.book}
            coverLayoutId={selected.coverLayoutId}
            originEl={selected.originEl}
            requestClose={requestClose}
            onCloseComplete={completeClose}
            onDismissStart={() => setStaticDismiss(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold transition-colors ${
      active ? "bg-primary text-primary-foreground" : "bg-secondary/70 text-muted-foreground hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const FeaturedHero = ({ books, onOpen, sharedCoverVisible }: { books: Book[]; onOpen: OpenHandler; sharedCoverVisible: boolean }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideWidthRef = useRef(0);
  const isSlidingRef = useRef(false);
  

  const stopAndSync = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track || !isSlidingRef.current) return;

    const style = window.getComputedStyle(track).transform;
    let currentX = 0;
    if (style && style !== 'none') {
      const match = style.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,([^,]+)/);
      if (match) currentX = Math.abs(parseFloat(match[1]));
    }

    track.style.transition = 'none';
    track.style.transform = 'translate3d(0, 0, 0)';
    track.style.willChange = '';
    el.scrollLeft = Math.round(currentX);
    // Clear inline transform after committing scrollLeft to avoid any flash
    requestAnimationFrame(() => {
      if (trackRef.current) trackRef.current.style.transform = '';
    });
    isSlidingRef.current = false;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track || books.length <= 1) return;

    const firstCard = track.firstElementChild as HTMLElement | null;
    const gap = 16;
    const slideWidth = firstCard ? firstCard.offsetWidth + gap : el.clientWidth * 0.78 + gap;
    slideWidthRef.current = slideWidth;

    const duration = slideWidth / 0.015; // ms

    // Reset scroll and transform in one frame to avoid initial jump
    el.scrollLeft = 0;
    track.style.transition = 'none';
    track.style.transform = 'translate3d(0, 0, 0)';
    track.style.willChange = 'transform';

    // Force layout so the starting transform is committed
    void track.offsetWidth;

    let started = false;
    const startId = requestAnimationFrame(() => {
      if (!trackRef.current) return;
      isSlidingRef.current = true;
      started = true;
      trackRef.current.style.transition = `transform ${duration}ms linear`;
      trackRef.current.style.transform = `translate3d(-${slideWidth}px, 0, 0)`;
    });

    const onTransitionEnd = () => {
      if (!isSlidingRef.current) return;
      track.style.transition = 'none';
      el.scrollLeft = slideWidth;
      track.style.transform = 'translate3d(0, 0, 0)';
      track.style.willChange = '';
      requestAnimationFrame(() => {
        if (trackRef.current) trackRef.current.style.transform = '';
      });
      isSlidingRef.current = false;
    };

    track.addEventListener('transitionend', onTransitionEnd);

    // Stop animation on ANY page scroll (vertical) or interaction outside the carousel
    const onWindowScroll = () => stopAndSync();
    window.addEventListener('scroll', onWindowScroll, { passive: true, capture: true });

    return () => {
      cancelAnimationFrame(startId);
      track.removeEventListener('transitionend', onTransitionEnd);
      window.removeEventListener('scroll', onWindowScroll, { capture: true } as any);
      track.style.transition = 'none';
      track.style.transform = '';
      track.style.willChange = '';
      isSlidingRef.current = false;
      void started;
    };
  }, [books.length, stopAndSync]);

  return (
    <section>
      <h2 className="px-5 text-foreground text-sm font-bold uppercase tracking-wider mb-3">Featured</h2>
      <div
        ref={scrollRef}
        onPointerDown={stopAndSync}
        onWheel={stopAndSync}
        onTouchStart={stopAndSync}
        className="overflow-x-auto scrollbar-hide px-5 pb-2"
      >
        <div ref={trackRef} className="flex gap-4 items-stretch">
          {books.map((b) => (
            <BookCard key={b.id} book={b} onOpen={onOpen} sharedCoverVisible={sharedCoverVisible} />
          ))}
        </div>
      </div>
    </section>
  );
};

const Row = ({
  title, books, onOpen, onSeeAll, sharedCoverVisible,
}: { title: string; books: Book[]; onOpen: OpenHandler; onSeeAll?: () => void; sharedCoverVisible: boolean }) => (
  <section>
    <div className="flex items-baseline justify-between px-5 mb-3">
      <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">{title}</h2>
      {onSeeAll && (
        <button onClick={onSeeAll} className="text-muted-foreground text-[11px] uppercase tracking-wider">See all</button>
      )}
    </div>
    <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-2 snap-x items-stretch">
      {books.map((b) => (
        <BookCard key={b.id} book={b} onOpen={onOpen} sharedCoverVisible={sharedCoverVisible} />
      ))}
    </div>
  </section>
);

const BookCard = ({ book, onOpen, sharedCoverVisible = true }: { book: Book; onOpen: OpenHandler; sharedCoverVisible?: boolean }) => {
  const instanceId = useId();
  const coverLayoutId = `book-cover-${book.id}-${instanceId}`;
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
  <button
    ref={buttonRef}
    onClick={() => onOpen(book, coverLayoutId, buttonRef.current!)}
    className="shrink-0 w-36 snap-start text-left active:scale-[0.97] transition-transform flex flex-col h-full"
  >
    <div data-cover-id={coverLayoutId} className="relative w-36 aspect-[2/3] overflow-hidden rounded-2xl bg-secondary shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)]">
      {/* This base image never participates in layout projection, so it remains
          fixed when a scrolled detail page dismisses downward. */}
      <img src={sharedCoverUrl(book.cover_url)} alt={book.title} className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" />
      <motion.div
        layoutId={coverLayoutId}
        transition={{ type: "spring", stiffness: 300, damping: 34, mass: 0.8 }}
        style={{ borderRadius: 16, display: sharedCoverVisible ? "block" : "none" }}
        className="absolute inset-0 overflow-hidden bg-secondary"
      >
        <img src={sharedCoverUrl(book.cover_url)} alt="" aria-hidden="true" className="w-full h-full object-cover" loading="eager" decoding="async" />
      </motion.div>
    </div>
    <p className="text-foreground text-xs font-semibold mt-2 line-clamp-2 leading-snug">{book.title}</p>
    <p className="text-muted-foreground text-[10px] mt-1 line-clamp-1 min-h-[0.9rem]">{book.author}</p>
    <div className="flex items-center gap-2 mt-auto pt-1">
      {book.rating != null && (
        <span className="flex items-center gap-0.5 text-[10px] text-foreground">
          <Star size={10} className="fill-yellow-400 text-yellow-400" /> {book.rating.toFixed(1)}
        </span>
      )}
    </div>
  </button>
  );
};


const SearchResults = ({ books, onOpen, sharedCoverVisible = true }: { books: Book[]; onOpen: OpenHandler; sharedCoverVisible?: boolean }) => (
  <div className="px-5 pt-5">
    {books.length === 0 ? (
      <div className="text-center text-muted-foreground text-sm py-16">No books found.</div>
    ) : (
      <div className="grid grid-cols-2 gap-4">
        {books.map((b) => (
          <BookCard key={b.id} book={b} onOpen={onOpen} sharedCoverVisible={sharedCoverVisible} />
        ))}
      </div>
    )}
  </div>
);

export default BooksTab;
