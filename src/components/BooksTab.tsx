import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Search, X, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BOOK_CATEGORIES, type Book } from "@/lib/bookCategories";

import BookDetailSheet from "./BookDetailSheet";

const POPULAR = ["Discipline", "Atomic Habits", "Deep Work", "Stoicism", "Focus"];
const RECENT_KEY = "book_recent_searches";

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
  const [selected, setSelected] = useState<Book | null>(null);
  const { recent, push, clear } = useRecent();

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
    (window as any).__openBook = (b: Book) => setSelected(b);
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
          (b.public_id?.toLowerCase() === q),
      );
    }
    return list;
  }, [books, query, activeCategory]);

  const featured = books.filter((b) => b.is_featured).slice(0, 8);
  const trending = books.filter((b) => b.is_trending).slice(0, 20);
  const bestSellers = books.filter((b) => b.is_best_seller).slice(0, 20);
  const newReleases = books.filter((b) => b.is_new_release).slice(0, 20);
  const recommended = useMemo(() => {
    // Simple heuristic: highest rated recent books
    return [...books]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 20);
  }, [books]);

  const isSearching = query.trim().length > 0 || activeCategory;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl pt-4 pb-3 px-5 border-b border-border/40">
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
            placeholder="Search books, authors, or #ID"
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
          <Chip active={!activeCategory} onClick={() => setActiveCategory(null)}>All</Chip>
          {BOOK_CATEGORIES.map((c) => (
            <Chip key={c} active={activeCategory === c} onClick={() => setActiveCategory(activeCategory === c ? null : c)}>
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
        <SearchResults books={filtered} onOpen={(b) => { setSelected(b); push(query); }} />
      ) : (
        <div className="pt-5 space-y-8">
          {featured.length > 0 && <FeaturedHero books={featured} onOpen={setSelected} />}
          {recommended.length > 0 && <Row title="Recommended for you" books={recommended} onOpen={setSelected} />}
          {trending.length > 0 && <Row title="Trending" books={trending} onOpen={setSelected} />}
          {bestSellers.length > 0 && <Row title="Best sellers" books={bestSellers} onOpen={setSelected} />}
          {newReleases.length > 0 && <Row title="New releases" books={newReleases} onOpen={setSelected} />}

          {BOOK_CATEGORIES.map((cat) => {
            const list = books.filter((b) => b.category === cat).slice(0, 20);
            if (list.length === 0) return null;
            return <Row key={cat} title={cat} books={list} onOpen={setSelected} onSeeAll={() => setActiveCategory(cat)} />;
          })}
        </div>
      )}

      {selected && <BookDetailSheet book={selected} onClose={() => setSelected(null)} />}
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

const FeaturedHero = ({ books, onOpen }: { books: Book[]; onOpen: (b: Book) => void }) => {
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
            <BookCard key={b.id} book={b} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  );
};

const Row = ({
  title, books, onOpen, onSeeAll,
}: { title: string; books: Book[]; onOpen: (b: Book) => void; onSeeAll?: () => void }) => (
  <section>
    <div className="flex items-baseline justify-between px-5 mb-3">
      <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">{title}</h2>
      {onSeeAll && (
        <button onClick={onSeeAll} className="text-muted-foreground text-[11px] uppercase tracking-wider">See all</button>
      )}
    </div>
    <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-2 snap-x items-stretch">
      {books.map((b) => (
        <BookCard key={b.id} book={b} onOpen={onOpen} />
      ))}
    </div>
  </section>
);

const BookCard = ({ book, onOpen }: { book: Book; onOpen: (b: Book) => void }) => (
  <button
    onClick={() => onOpen(book)}
    className="shrink-0 w-36 snap-start text-left active:scale-[0.97] transition-transform flex flex-col h-full"
  >
    <div className="w-36 aspect-[2/3] rounded-2xl overflow-hidden bg-secondary shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)]">
      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
    </div>
    <p className="text-foreground text-xs font-semibold mt-2 line-clamp-2 leading-snug min-h-[2.2rem] flex flex-col justify-start">{book.title}</p>
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

const SearchResults = ({ books, onOpen }: { books: Book[]; onOpen: (b: Book) => void }) => (
  <div className="px-5 pt-5">
    {books.length === 0 ? (
      <div className="text-center text-muted-foreground text-sm py-16">No books found.</div>
    ) : (
      <div className="grid grid-cols-2 gap-4">
        {books.map((b) => (
          <BookCard key={b.id} book={b} onOpen={onOpen} />
        ))}
      </div>
    )}
  </div>
);

export default BooksTab;
