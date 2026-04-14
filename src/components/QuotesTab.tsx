import { useState, useEffect, useCallback } from "react";
import { Plus, LogIn, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthSheet from "./AuthSheet";
import AdminPanel from "./AdminPanel";

interface QuoteCard {
  id: string;
  title: string;
  category: string;
  image_url: string;
  is_pro: boolean;
}

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

const QuoteGridCard = ({ quote }: { quote: QuoteCard }) => (
  <div className="relative rounded-2xl overflow-hidden aspect-[4/5]">
    <img src={quote.image_url} alt={quote.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-background/30" />
    <div className="absolute top-3 left-3 flex items-center gap-2">
      {quote.is_pro && (
        <span className="bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Pro</span>
      )}
    </div>
    <div className="absolute bottom-4 left-0 right-0 text-center px-3">
      <p className="text-foreground/70 text-[10px] tracking-[0.2em] uppercase font-medium">{quote.category}</p>
      <h3 className="text-foreground font-bold text-base mt-1 leading-tight">{quote.title}</h3>
      <div className="w-6 h-[2px] bg-foreground/30 mx-auto mt-2 rounded-full" />
    </div>
  </div>
);

const QuotesTab = () => {
  const { user, canUpload, isAdmin, signOut } = useAuth();
  const [quotes, setQuotes] = useState<QuoteCard[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const fetchQuotes = useCallback(async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    if (data) setQuotes(data);
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  return (
    <>
      <div className="min-h-screen pb-24 pt-4 bg-background">
        {/* Header */}
        <div className="px-4 pt-4 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-foreground font-semibold text-2xl">Quotes</h2>
            <p className="text-muted-foreground text-sm mt-1">Daily wisdom for your soul</p>
          </div>
          <div className="flex items-center gap-2">
            {user && isAdmin && (
              <button onClick={() => setShowAdmin(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <Shield size={16} className="text-primary" />
              </button>
            )}
            {user && canUpload && (
              <button onClick={() => setShowAdd(true)} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Plus size={18} className="text-primary-foreground" />
              </button>
            )}
            {user ? (
              <button onClick={signOut} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <LogOut size={16} className="text-muted-foreground" />
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <LogIn size={16} className="text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="px-3 grid grid-cols-2 gap-3">
          {quotes.map((quote, i) => (
            <div key={quote.id} className="animate-float-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <QuoteGridCard quote={quote} />
            </div>
          ))}
          {quotes.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8 col-span-2">No quotes yet</p>
          )}
        </div>
      </div>

      <AddQuoteDialog open={showAdd} onClose={() => setShowAdd(false)} onAdded={fetchQuotes} />
      <AuthSheet open={showAuth} onClose={() => setShowAuth(false)} />
      <AdminPanel open={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
};

export default QuotesTab;
