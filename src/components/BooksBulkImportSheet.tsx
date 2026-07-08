import { useState, useRef, useCallback } from "react";
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { parseBookPdf, type ParsedBook } from "@/lib/parseBookPdf";
import { BOOK_CATEGORIES } from "@/lib/bookCategories";

type JobStatus = "pending" | "parsing" | "inserting" | "done" | "skipped" | "failed";
type Job = {
  id: string;
  filename: string;
  status: JobStatus;
  title?: string;
  author?: string;
  message?: string;
  warnings?: string[];
};

const BooksBulkImportSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(BOOK_CATEGORIES[0]);
  const [publish, setPublish] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  const total = jobs.length;
  const done = jobs.filter((j) => j.status === "done").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const skipped = jobs.filter((j) => j.status === "skipped").length;
  const progress = total ? Math.round(((done + failed + skipped) / total) * 100) : 0;

  const updateJob = (id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const collectPdfsFromFiles = useCallback(async (files: FileList): Promise<Array<{ name: string; data: ArrayBuffer }>> => {
    const out: Array<{ name: string; data: ArrayBuffer }> = [];
    for (const f of Array.from(files)) {
      const lower = f.name.toLowerCase();
      if (lower.endsWith(".pdf")) {
        out.push({ name: f.name, data: await f.arrayBuffer() });
      } else if (lower.endsWith(".zip")) {
        const zip = await JSZip.loadAsync(await f.arrayBuffer());
        const entries = Object.values(zip.files).filter(
          (e) => !e.dir && e.name.toLowerCase().endsWith(".pdf") && !e.name.startsWith("__MACOSX/")
        );
        for (const e of entries) {
          const buf = await e.async("arraybuffer");
          out.push({ name: e.name.split("/").pop() || e.name, data: buf });
        }
      }
    }
    return out;
  }, []);

  const runImport = useCallback(async (parsed: Array<{ name: string; data: ArrayBuffer }>) => {
    setRunning(true);
    cancelRef.current = false;
    const initial: Job[] = parsed.map((p, i) => ({
      id: `${i}-${p.name}`,
      filename: p.name,
      status: "pending",
    }));
    setJobs(initial);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id ?? null;

    for (let i = 0; i < parsed.length; i++) {
      if (cancelRef.current) break;
      const job = initial[i];
      setCurrent(job.filename);
      updateJob(job.id, { status: "parsing" });
      let book: ParsedBook;
      try {
        book = await parseBookPdf(parsed[i].data);
      } catch (e) {
        updateJob(job.id, { status: "failed", message: e instanceof Error ? e.message : "Parse error" });
        continue;
      }
      if (!book.title || !book.author) {
        updateJob(job.id, { status: "failed", message: `Missing ${!book.title ? "title" : "author"}`, warnings: book.warnings });
        continue;
      }
      // Dedupe on title + author (case-insensitive)
      const { data: existing, error: dupErr } = await supabase
        .from("books")
        .select("id")
        .ilike("title", book.title)
        .ilike("author", book.author)
        .limit(1);
      if (dupErr) {
        updateJob(job.id, { status: "failed", message: dupErr.message, title: book.title, author: book.author });
        continue;
      }
      if (existing && existing.length > 0) {
        updateJob(job.id, { status: "skipped", message: "Already exists", title: book.title, author: book.author });
        continue;
      }

      updateJob(job.id, { status: "inserting", title: book.title, author: book.author, warnings: book.warnings });
      const payload = {
        title: book.title,
        author: book.author,
        category,
        description: null,
        key_takeaways: null,
        why_read: null,
        cover_url: "",
        cover_url_2: null,
        amazon_url: "",
        rating: null,
        reading_time_minutes: null,
        listening_time_minutes: null,
        audio_url: null,
        summary_pages: book.summary_pages,
        summary_page_titles: book.summary_page_titles,
        quiz_questions: book.quiz_questions,
        is_published: publish,
        is_featured: false,
        is_trending: false,
        is_best_seller: false,
        is_new_release: false,
        created_by: uid,
      };
      const { error: insErr } = await supabase.from("books").insert(payload);
      if (insErr) {
        updateJob(job.id, { status: "failed", message: insErr.message });
      } else {
        updateJob(job.id, { status: "done", warnings: book.warnings });
      }
      // Yield to keep UI responsive
      await new Promise((r) => setTimeout(r, 0));
    }
    setCurrent(null);
    setRunning(false);
  }, [category, publish]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setJobs([{ id: "scan", filename: "Scanning files…", status: "parsing" }]);
    try {
      const parsed = await collectPdfsFromFiles(files);
      if (parsed.length === 0) {
        setJobs([]);
        alert("No PDF files found in your selection.");
        return;
      }
      await runImport(parsed);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to read files");
      setJobs([]);
    }
  };

  if (!open) return null;

  const statusIcon = (s: JobStatus) => {
    if (s === "done") return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (s === "skipped") return <AlertTriangle size={14} className="text-yellow-500" />;
    if (s === "failed") return <AlertTriangle size={14} className="text-destructive" />;
    if (s === "parsing" || s === "inserting") return <Loader2 size={14} className="text-primary animate-spin" />;
    return <FileText size={14} className="text-muted-foreground" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={running ? undefined : onClose}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-5 animate-float-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
            <Upload size={18} className="text-primary" /> Bulk Import Books
          </h3>
          <button onClick={onClose} disabled={running} className="disabled:opacity-40"><X size={20} className="text-muted-foreground" /></button>
        </div>

        <p className="text-muted-foreground text-xs mb-4">
          Upload one or more PDFs (or a ZIP containing PDFs). Books are created using the same fields as Manage Books.
          Description, cover, Amazon URL, audio and rating are left empty for you to fill in later.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={running}
              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50">
              {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1 block">Publish state</label>
            <select value={publish ? "1" : "0"} onChange={(e) => setPublish(e.target.value === "1")} disabled={running}
              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50">
              <option value="1">Published</option>
              <option value="0">Draft (unpublished)</option>
            </select>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf,.zip,application/zip"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={running}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
        >
          <Upload size={16} /> {running ? "Importing…" : "Select PDFs or ZIP"}
        </button>

        {total > 0 && (
          <>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{current ? `Importing: ${current}` : `${done + failed + skipped} of ${total}`}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex gap-3 mt-2 text-[11px]">
                <span className="text-emerald-500">✓ {done} imported</span>
                <span className="text-yellow-500">↷ {skipped} skipped</span>
                <span className="text-destructive">✗ {failed} failed</span>
              </div>
            </div>

            {running && (
              <button
                onClick={() => { cancelRef.current = true; }}
                className="w-full bg-secondary text-secondary-foreground rounded-lg py-2 text-xs font-medium mb-3"
              >
                Cancel remaining
              </button>
            )}

            <div className="max-h-[40vh] overflow-y-auto space-y-1.5 -mx-1 px-1">
              {jobs.map((j) => (
                <div key={j.id} className="bg-secondary rounded-lg p-2.5 flex items-start gap-2">
                  <div className="mt-0.5">{statusIcon(j.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-xs font-medium truncate">
                      {j.title ? `${j.title}${j.author ? ` — ${j.author}` : ""}` : j.filename}
                    </p>
                    <p className="text-muted-foreground text-[10px] truncate">{j.filename}</p>
                    {j.message && (
                      <p className={`text-[10px] mt-0.5 ${j.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                        {j.message}
                      </p>
                    )}
                    {j.warnings && j.warnings.length > 0 && (
                      <p className="text-yellow-500 text-[10px] mt-0.5">⚠ {j.warnings.join("; ")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BooksBulkImportSheet;
