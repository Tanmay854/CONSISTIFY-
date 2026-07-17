import { useEffect, useState } from "react";
import { X, Plus, Pencil, Trash2, Upload, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BOOK_CATEGORIES, type Book, type QuizQuestion } from "@/lib/bookCategories";
import { normalizeSummaryText } from "@/lib/textNormalize";

const emptyQuestion = (): QuizQuestion => ({ q: "", options: ["", "", "", ""], correct: 0, explanation: "", option_explanations: ["", "", "", ""] });
const emptyPages = (): string[] => Array.from({ length: 10 }, () => "");
const emptyTitles = (): string[] => Array.from({ length: 10 }, () => "");
const emptyQuiz = (): QuizQuestion[] => Array.from({ length: 15 }, emptyQuestion);


type Form = {
  id?: string;
  title: string;
  author: string;
  category: string;
  description: string;
  key_takeaways: string;
  why_read: string;
  cover_url: string;
  cover_url_2: string;
  amazon_url: string;
  rating: string;
  listening_time_minutes: string;
  audio_url: string;
  summary_pages: string[];
  summary_page_titles: string[];
  quiz_questions: QuizQuestion[];
  is_published: boolean;
  is_featured: boolean;
  is_trending: boolean;
  is_best_seller: boolean;
  is_new_release: boolean;
};

const empty = (): Form => ({
  title: "", author: "", category: BOOK_CATEGORIES[0], description: "",
  key_takeaways: "", why_read: "", cover_url: "", cover_url_2: "", amazon_url: "",
  rating: "", listening_time_minutes: "", audio_url: "",
  summary_pages: emptyPages(), summary_page_titles: emptyTitles(), quiz_questions: emptyQuiz(),
  is_published: true,
  is_featured: false, is_trending: false, is_best_seller: false, is_new_release: false,
});


const BooksAdminSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [editing, setEditing] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  

  const load = async () => {
    const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    setBooks((data as unknown as Book[]) ?? []);
  };

  useEffect(() => { if (open) load(); }, [open]);

  if (!open) return null;

  const startNew = () => { setError(null); setEditing(empty()); };
  const startEdit = (b: Book) => {
    setError(null);
    const pages = Array.isArray(b.summary_pages) ? [...b.summary_pages] : [];
    while (pages.length < 10) pages.push("");
    const titles = Array.isArray(b.summary_page_titles) ? [...b.summary_page_titles] : [];
    while (titles.length < 10) titles.push("");
    const quiz = Array.isArray(b.quiz_questions) ? [...b.quiz_questions] : [];
    while (quiz.length < 15) quiz.push(emptyQuestion());
    setEditing({
      id: b.id,
      title: b.title, author: b.author, category: b.category,
      description: b.description ?? "", key_takeaways: b.key_takeaways ?? "", why_read: b.why_read ?? "",
      cover_url: b.cover_url, cover_url_2: b.cover_url_2 ?? "", amazon_url: b.amazon_url,
      rating: b.rating?.toString() ?? "",
      listening_time_minutes: b.listening_time_minutes?.toString() ?? "",
      audio_url: b.audio_url ?? "",
      summary_pages: pages.slice(0, 10),
      summary_page_titles: titles.slice(0, 10),
      quiz_questions: quiz.slice(0, 15),
      is_published: b.is_published ?? true,
      is_featured: b.is_featured, is_trending: b.is_trending,
      is_best_seller: b.is_best_seller, is_new_release: b.is_new_release,
    });
  };

  const save = async () => {
    if (!editing) return;
    setError(null);
    if (!editing.title.trim()) {
      setError("Title is required."); return;
    }
    setBusy(true);
    const payload = {
      title: editing.title.trim(),
      author: editing.author.trim(),
      category: editing.category,
      description: editing.description.trim() || null,
      key_takeaways: editing.key_takeaways.trim() || null,
      why_read: editing.why_read.trim() || null,
      cover_url: editing.cover_url.trim(),
      cover_url_2: editing.cover_url_2.trim() || null,
      amazon_url: editing.amazon_url.trim(),
      rating: editing.rating ? Number(editing.rating) : null,
      listening_time_minutes: editing.listening_time_minutes ? Number(editing.listening_time_minutes) : null,
      audio_url: editing.audio_url.trim() || null,
      summary_pages: editing.summary_pages.map(normalizeSummaryText),
      summary_page_titles: editing.summary_page_titles.map((t) => t.trim()),
      quiz_questions: editing.quiz_questions.filter((q) => q.q.trim() && q.options.every((o) => o.trim())),
      is_published: editing.is_published,
      is_featured: editing.is_featured,
      is_trending: editing.is_trending,
      is_best_seller: editing.is_best_seller,
      is_new_release: editing.is_new_release,
    };

    const { error } = editing.id
      ? await supabase.from("books").update(payload).eq("id", editing.id)
      : await supabase.from("books").insert({ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setEditing(null);
    load();
  };

  const remove = async (b: Book) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    await supabase.from("books").delete().eq("id", b.id);
    load();
  };

  const uploadCover = async (file: File, slot: 1 | 2) => {
    setUploading(true);
    setError(null);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `books/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("quote-images").upload(path, file, { upsert: false });
    if (error) { setUploading(false); setError(error.message); return; }
    const { data } = supabase.storage.from("quote-images").getPublicUrl(path);
    setEditing((f) => f ? { ...f, [slot === 1 ? "cover_url" : "cover_url_2"]: data.publicUrl } : f);
    setUploading(false);
  };

  const uploadAudio = async (file: File) => {
    setUploading(true); setError(null);
    const ext = file.name.split(".").pop() || "mp3";
    const path = `books/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("audio").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setUploading(false); setError(error.message); return; }
    const { data } = supabase.storage.from("audio").getPublicUrl(path);
    setEditing((f) => f ? { ...f, audio_url: data.publicUrl } : f);
    setUploading(false);
  };


  const setPage = (i: number, v: string) =>
    setEditing((f) => f ? { ...f, summary_pages: f.summary_pages.map((p, idx) => idx === i ? normalizeSummaryText(v) : p) } : f);

  const setPageTitle = (i: number, v: string) =>
    setEditing((f) => f ? { ...f, summary_page_titles: f.summary_page_titles.map((t, idx) => idx === i ? v : t) } : f);

  const setQ = (i: number, patch: Partial<QuizQuestion>) =>
    setEditing((f) => f ? { ...f, quiz_questions: f.quiz_questions.map((q, idx) => idx === i ? { ...q, ...patch } : q) } : f);

  const setOpt = (i: number, oi: 0|1|2|3, v: string) =>
    setEditing((f) => f ? { ...f, quiz_questions: f.quiz_questions.map((q, idx) => {
      if (idx !== i) return q;
      const options = [...q.options] as [string,string,string,string];
      options[oi] = v;
      return { ...q, options };
    }) } : f);

  const setOptExp = (i: number, oi: 0|1|2|3, v: string) =>
    setEditing((f) => f ? { ...f, quiz_questions: f.quiz_questions.map((q, idx) => {
      if (idx !== i) return q;
      const cur = (q.option_explanations ?? ["","","",""]) as [string,string,string,string];
      const arr = [...cur] as [string,string,string,string];
      arr[oi] = v;
      return { ...q, option_explanations: arr };
    }) } : f);

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur px-5 py-3 flex items-center justify-between border-b border-border">
        <button onClick={onClose} aria-label="Close"><X size={20} className="text-foreground" /></button>
        <h2 className="text-foreground font-bold">Manage Books</h2>
        <button
          onClick={startNew}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
          aria-label="Add book"
        >
          <Plus size={18} />
        </button>
      </header>

      {editing ? (
        <div className="p-5 space-y-3">
          <Row label="Title"><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls} /></Row>
          <Row label="Author"><input value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} className={inputCls} /></Row>
          <Row label="Category">
            <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputCls}>
              {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Row>

          <Row label="Cover image">
            {editing.cover_url && (
              <img src={editing.cover_url} alt="" className="w-24 aspect-[2/3] object-cover rounded-lg mb-2" />
            )}
            <div className="flex gap-2">
              <input placeholder="https://…" value={editing.cover_url} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} className={inputCls} />
              <label className="shrink-0 flex items-center gap-1 px-3 h-10 rounded-lg bg-secondary text-foreground text-sm cursor-pointer">
                <Upload size={14} />
                {uploading ? "…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0], 1)} />
              </label>
            </div>
          </Row>
          <Row label="Cover image 2 (optional)">
            {editing.cover_url_2 && (
              <img src={editing.cover_url_2} alt="" className="w-24 aspect-[2/3] object-cover rounded-lg mb-2" />
            )}
            <div className="flex gap-2">
              <input placeholder="https://…" value={editing.cover_url_2} onChange={(e) => setEditing({ ...editing, cover_url_2: e.target.value })} className={inputCls} />
              <label className="shrink-0 flex items-center gap-1 px-3 h-10 rounded-lg bg-secondary text-foreground text-sm cursor-pointer">
                <Upload size={14} />
                {uploading ? "…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0], 2)} />
              </label>
              {editing.cover_url_2 && (
                <button onClick={() => setEditing({ ...editing, cover_url_2: "" })} className="shrink-0 px-3 h-10 rounded-lg bg-secondary text-destructive text-sm">Remove</button>
              )}
            </div>
          </Row>
          <Row label="Amazon URL"><input value={editing.amazon_url} onChange={(e) => setEditing({ ...editing, amazon_url: e.target.value })} className={inputCls} placeholder="https://amzn.to/…" /></Row>
          <Row label="Rating (0-5)"><input inputMode="decimal" value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: e.target.value })} className={inputCls} /></Row>
          <Row label="Description"><textarea rows={4} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={inputCls} /></Row>
          <Row label="Key takeaways"><textarea rows={3} value={editing.key_takeaways} onChange={(e) => setEditing({ ...editing, key_takeaways: e.target.value })} className={inputCls} /></Row>
          <Row label="Why read this book"><textarea rows={3} value={editing.why_read} onChange={(e) => setEditing({ ...editing, why_read: e.target.value })} className={inputCls} /></Row>

          <Row label="Listening time (min)"><input inputMode="numeric" value={editing.listening_time_minutes} onChange={(e) => setEditing({ ...editing, listening_time_minutes: e.target.value })} className={inputCls} /></Row>

          <Row label="Audio summary">
            {editing.audio_url && (
              <audio src={editing.audio_url} controls className="w-full mb-2" />
            )}
            <div className="flex gap-2">
              <input placeholder="https://…" value={editing.audio_url} onChange={(e) => setEditing({ ...editing, audio_url: e.target.value })} className={inputCls} />
              <label className="shrink-0 flex items-center gap-1 px-3 h-10 rounded-lg bg-secondary text-foreground text-sm cursor-pointer">
                <Music size={14} />
                {uploading ? "…" : "Upload"}
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0])} />
              </label>
            </div>
          </Row>

          <div className="pt-3">
            <p className="text-foreground text-sm font-bold uppercase tracking-wider mb-2">Summary pages (10)</p>
            <div className="space-y-2">
              {editing.summary_pages.map((p, i) => (
                <div key={i} className="p-3 rounded-xl bg-secondary/40 border border-border/50 space-y-2">
                  <label className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold block">Page {i + 1} title</label>
                  <input
                    value={editing.summary_page_titles[i] ?? ""}
                    onChange={(e) => setPageTitle(i, e.target.value)}
                    className={inputCls}
                    placeholder="e.g. The One Habit That Changes Everything"
                  />
                  <textarea rows={8} value={p} onChange={(e) => setPage(i, e.target.value)} className={inputCls} placeholder="~320 words for this page…" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3">
            <p className="text-foreground text-sm font-bold uppercase tracking-wider mb-2">Quiz questions (15)</p>
            <div className="space-y-3">
              {editing.quiz_questions.map((q, i) => (
                <div key={i} className="p-3 rounded-xl bg-secondary/40 border border-border/50 space-y-2">
                  <label className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold block">Question {i + 1}</label>
                  <textarea rows={2} value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} className={inputCls} placeholder="Question…" />
                  {([0,1,2,3] as const).map((oi) => (
                    <div key={oi} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input type="radio" name={`correct-${i}`} checked={q.correct === oi} onChange={() => setQ(i, { correct: oi })} />
                        <input value={q.options[oi]} onChange={(e) => setOpt(i, oi, e.target.value)} className={inputCls} placeholder={`Option ${String.fromCharCode(65+oi)}`} />
                      </div>
                      <input
                        value={q.option_explanations?.[oi] ?? ""}
                        onChange={(e) => setOptExp(i, oi, e.target.value)}
                        className={inputCls}
                        placeholder={`Why option ${String.fromCharCode(65+oi)} — feedback shown when picked`}
                      />
                    </div>
                  ))}
                  <input value={q.explanation ?? ""} onChange={(e) => setQ(i, { explanation: e.target.value })} className={inputCls} placeholder="General explanation (fallback, optional)" />
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 px-3 py-2 mt-3 rounded-lg bg-secondary text-foreground text-sm">
            <input type="checkbox" checked={editing.is_published} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
            Published
          </label>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {(["is_featured", "is_trending", "is_best_seller", "is_new_release"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm">
                <input type="checkbox" checked={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.checked })} />
                {k.replace("is_", "").replace("_", " ")}
              </label>
            ))}
          </div>


          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-2 pt-3">
            <button onClick={() => setEditing(null)} className="flex-1 h-11 rounded-xl bg-secondary text-foreground font-semibold">Cancel</button>
            <button onClick={save} disabled={busy} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
              {busy ? "Saving…" : editing.id ? "Save" : "Add book"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5">
          {books.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No books yet. Tap + to add your first book.</div>
          ) : (
            <div className="space-y-3">
              {books.map((b) => (
                <div key={b.id} className="flex gap-3 items-center bg-card rounded-2xl p-3">
                  <img src={b.cover_url} alt="" className="w-14 aspect-[2/3] object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-semibold truncate">{b.title}</p>
                    <p className="text-muted-foreground text-xs truncate">{b.author} · {b.category}</p>
                    {b.public_id && <p className="text-muted-foreground text-[10px] font-mono mt-0.5">#{b.public_id}</p>}
                  </div>
                  <button onClick={() => startEdit(b)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><Pencil size={14} className="text-foreground" /></button>
                  <button onClick={() => remove(b)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><Trash2 size={14} className="text-destructive" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const inputCls = "w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary";
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold block mb-1">{label}</label>
    {children}
  </div>
);

export default BooksAdminSheet;
