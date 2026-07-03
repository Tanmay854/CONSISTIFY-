import { useEffect, useState } from "react";
import { X, Star, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/lib/bookCategories";

const openAmazonCart = (url: string) => {
  // Append Amazon "add to cart" query params when possible.
  // Amazon supports ?AddToCart=1 on product URLs via /gp/aws/cart/add.html but the
  // simplest reliable approach is to just open the product page — Amazon shows an
  // Add to Cart button prominently. We keep the affiliate link untouched.
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = url;
  }
};

const Rating = ({ value }: { value: number | null }) => {
  const r = value ?? 0;
  return (
    <div className="flex items-center gap-1">
      <Star size={14} className="fill-yellow-400 text-yellow-400" />
      <span className="text-foreground text-sm font-semibold">{r ? r.toFixed(1) : "—"}</span>
    </div>
  );
};

const BookDetailSheet = ({ book, onClose }: { book: Book; onClose: () => void }) => {
  const [similar, setSimilar] = useState<Book[]>([]);
  const [category, setCategory] = useState<Book[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: sim }, { data: cat }] = await Promise.all([
        supabase
          .from("books")
          .select("*")
          .neq("id", book.id)
          .eq("category", book.category)
          .limit(10),
        supabase
          .from("books")
          .select("*")
          .neq("id", book.id)
          .eq("category", book.category)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setSimilar((sim as Book[]) ?? []);
      setCategory((cat as Book[]) ?? []);
    })();
  }, [book.id, book.category]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-float-up" style={{ animationDuration: "0.25s" }}>
      <button
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-secondary/80 backdrop-blur flex items-center justify-center"
      >
        <X size={20} className="text-foreground" />
      </button>

      {/* Hero */}
      <div className="relative pt-14 pb-8 px-6 overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-40 blur-3xl"
          style={{
            backgroundImage: `url(${book.cover_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/80 to-background" />

        <div className="flex flex-col items-center gap-5">
          <div className="w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
          {book.cover_url_2 && (
            <div className="w-40 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)] -mt-2">
              <img src={book.cover_url_2} alt={`${book.title} alternate cover`} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="text-center max-w-sm">
            <p className="text-primary text-[11px] uppercase tracking-[0.2em] font-semibold mb-2">{book.category}</p>
            <h1 className="text-foreground text-2xl font-extrabold leading-tight">{book.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">by {book.author}</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <Rating value={book.rating} />
              {book.public_id && (
                <span className="text-muted-foreground text-[11px] font-mono">#{book.public_id}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buy button */}
      <div className="px-6 pb-6">
        <button
          onClick={() => openAmazonCart(book.amazon_url)}
          className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-[0_15px_40px_-10px_rgba(29,185,84,0.6)] active:scale-[0.98] transition-transform"
          style={{ backgroundColor: "#1DB954", color: "#000" }}
        >
          <ShoppingCart size={18} /> Add to Cart
        </button>
      </div>

      {/* Description */}
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
        <RowSection title="Similar books" books={similar} onOpen={(b) => (window as any).__openBook?.(b)} />
      )}
      {category.length > 0 && (
        <RowSection title={`More in ${book.category}`} books={category} onOpen={(b) => (window as any).__openBook?.(b)} />
      )}

      <div className="h-24" />
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="px-6 py-5 border-t border-border/60">
    <h3 className="text-foreground text-sm font-bold uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </section>
);

const RowSection = ({ title, books, onOpen }: { title: string; books: Book[]; onOpen: (b: Book) => void }) => (
  <section className="pt-6">
    <h3 className="px-6 text-foreground text-sm font-bold uppercase tracking-wider mb-3">{title}</h3>
    <div className="flex gap-3 overflow-x-auto scrollbar-hide px-6 pb-2 snap-x">
      {books.map((b) => (
        <button
          key={b.id}
          onClick={() => onOpen(b)}
          className="shrink-0 w-28 snap-start text-left active:scale-[0.97] transition-transform"
        >
          <div className="w-28 aspect-[2/3] rounded-xl overflow-hidden bg-secondary">
            <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <p className="text-foreground text-xs font-semibold mt-2 line-clamp-2">{b.title}</p>
          <p className="text-muted-foreground text-[10px] line-clamp-1">{b.author}</p>
        </button>
      ))}
    </div>
  </section>
);

export default BookDetailSheet;
