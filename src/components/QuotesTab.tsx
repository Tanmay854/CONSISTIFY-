import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QuoteCard {
  id: string;
  title: string;
  category: string;
  image_url: string;
  is_pro: boolean;
  description: string | null;
}

const PAGE_SIZE = 4;

const AddQuoteDialog = ({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ENERGY");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!title.trim() || !imageFile) return;
    setLoading(true);

    const fileName = `${Date.now()}-${imageFile.name}`;
    const { error: uploadError } = await supabase.storage.from("quote-images").upload(fileName, imageFile);
    if (uploadError) {
      setLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("quote-images").getPublicUrl(fileName);

    await supabase.from("quotes").insert({
      title: title.trim(),
      category: category.toUpperCase(),
      image_url: urlData.publicUrl,
      is_pro: isPro,
    });

    setLoading(false);
    setTitle("");
    setImageFile(null);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-foreground font-semibold text-lg">Add Quote</h3>
          <button onClick={onClose} className="text-muted-foreground">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quote title"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary">
              {["ENERGY", "INSPIRATIONAL", "FOCUS", "MOTIVATION", "STRENGTH", "PEACE"].map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Image</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm file:bg-primary file:text-primary-foreground file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:text-xs" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={isPro} onChange={(e) => setIsPro(e.target.checked)}
              className="rounded border-border" />
            Mark as Pro
          </label>
          <button onClick={handleSubmit} disabled={loading || !title.trim() || !imageFile}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
            {loading ? "Uploading..." : "Add Quote"}
          </button>
        </div>
      </div>
    </div>
  );
};

const QuotesTab = () => {
  const [quotes, setQuotes] = useState<QuoteCard[]>([]);
  const [page, setPage] = useState(0);
  const [selectedQuote, setSelectedQuote] = useState<QuoteCard | null>(null);

  const fetchQuotes = useCallback(async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    if (data) setQuotes(data);
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const totalPages = Math.ceil(quotes.length / PAGE_SIZE);
  const currentQuotes = quotes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <div className="min-h-screen pb-24 pt-4 bg-background">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <h2 className="text-foreground font-bold text-2xl">Photos</h2>
          <p className="text-muted-foreground text-xs mt-0.5">Daily wisdom for your soul</p>
        </div>

        {/* 2x2 Photo Grid */}
        <div className="px-3">
          <div className="grid grid-cols-2 gap-2">
            {currentQuotes.map((quote, i) => (
              <div
                key={quote.id}
                className="animate-float-up relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                style={{ animationDelay: `${i * 0.08}s` }}
                onClick={() => setSelectedQuote(quote)}
              >
                <img
                  src={quote.image_url}
                  alt={quote.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {quote.is_pro && (
                  <span className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Pro
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {quotes.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-12">No photos yet</p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium disabled:opacity-30 transition-opacity"
              >
                Previous
              </button>
              <span className="text-muted-foreground text-xs tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium disabled:opacity-30 transition-opacity"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen photo viewer */}
      {selectedQuote && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col items-center justify-center"
          onClick={() => setSelectedQuote(null)}
        >
          <img
            src={selectedQuote.image_url}
            alt={selectedQuote.title}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
          <div className="mt-4 text-center px-6 max-w-md">
            <h3 className="text-foreground font-bold text-lg">{selectedQuote.title}</h3>
            <p className="text-muted-foreground text-xs mt-1 uppercase tracking-widest">{selectedQuote.category}</p>
            {selectedQuote.description && (
              <p className="text-foreground/90 text-sm mt-3 whitespace-pre-wrap">{selectedQuote.description}</p>
            )}
          </div>
        </div>
      )}

    </>
  );
};

export default QuotesTab;
