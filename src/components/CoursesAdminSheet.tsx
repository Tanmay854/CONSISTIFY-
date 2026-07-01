import { useEffect, useState } from "react";
import { X, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_CATEGORIES, COURSE_LEVELS, type Course } from "@/lib/courseCategories";

type Form = {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  instructor: string;
  category: string;
  cover_image: string;
  hero_image: string;
  hero_video_url: string;
  duration: string;
  lessons_count: string;
  level: string;
  rating: string;
  affiliate_link: string;
  what_youll_learn: string;
  curriculum: string;
  requirements: string;
  featured: boolean;
  trending: boolean;
  is_new_release: boolean;
  is_best_seller: boolean;
  published: boolean;
};

const empty = (): Form => ({
  title: "", subtitle: "", description: "", instructor: "",
  category: COURSE_CATEGORIES[0],
  cover_image: "", hero_image: "", hero_video_url: "",
  duration: "", lessons_count: "", level: COURSE_LEVELS[0],
  rating: "", affiliate_link: "",
  what_youll_learn: "", curriculum: "", requirements: "",
  featured: false, trending: false, is_new_release: false, is_best_seller: false, published: true,
});

const CoursesAdminSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [editing, setEditing] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<null | "cover" | "video">(null);
  const [error, setError] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<number>(0);

  const load = async () => {
    const { data } = await supabase.from("courses" as never).select("*").order("created_at", { ascending: false });
    setCourses(((data as unknown) as Course[]) ?? []);
  };

  useEffect(() => { if (open) load(); }, [open]);

  if (!open) return null;

  const startNew = () => { setError(null); setEditing(empty()); };
  const startEdit = (c: Course) => {
    setError(null);
    setEditing({
      id: c.id,
      title: c.title, subtitle: c.subtitle ?? "", description: c.description ?? "",
      instructor: c.instructor, category: c.category,
      cover_image: c.cover_image, hero_image: c.hero_image ?? "", hero_video_url: c.hero_video_url ?? "",
      duration: c.duration ?? "", lessons_count: c.lessons_count?.toString() ?? "",
      level: c.level ?? COURSE_LEVELS[0], rating: c.rating?.toString() ?? "",
      affiliate_link: c.affiliate_link,
      what_youll_learn: c.what_youll_learn ?? "", curriculum: c.curriculum ?? "", requirements: c.requirements ?? "",
      featured: c.featured, trending: c.trending, is_new_release: c.is_new_release, is_best_seller: c.is_best_seller,
      published: c.published,
    });
  };

  const save = async () => {
    if (!editing) return;
    setError(null);
    if (!editing.title.trim() || !editing.instructor.trim() || !editing.cover_image.trim() || !editing.affiliate_link.trim()) {
      setError("Title, instructor, cover image, and affiliate link are required."); return;
    }
    setBusy(true);
    const payload = {
      title: editing.title.trim(),
      subtitle: editing.subtitle.trim() || null,
      description: editing.description.trim() || null,
      instructor: editing.instructor.trim(),
      category: editing.category,
      cover_image: editing.cover_image.trim(),
      hero_image: editing.hero_image.trim() || null,
      duration: editing.duration.trim() || null,
      lessons_count: editing.lessons_count ? Number(editing.lessons_count) : 0,
      level: editing.level,
      rating: editing.rating ? Number(editing.rating) : null,
      affiliate_link: editing.affiliate_link.trim(),
      what_youll_learn: editing.what_youll_learn.trim() || null,
      curriculum: editing.curriculum.trim() || null,
      requirements: editing.requirements.trim() || null,
      featured: editing.featured,
      trending: editing.trending,
      is_new_release: editing.is_new_release,
      is_best_seller: editing.is_best_seller,
      published: editing.published,
    };
    const { error } = editing.id
      ? await supabase.from("courses" as never).update(payload as never).eq("id", editing.id)
      : await supabase.from("courses" as never).insert({ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id } as never);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setEditing(null);
    load();
  };

  const remove = async (c: Course) => {
    if (!confirm(`Delete "${c.title}"?`)) return;
    await supabase.from("courses" as never).delete().eq("id", c.id);
    load();
  };

  const uploadImage = async (file: File, slot: "cover" | "hero") => {
    setUploading(slot);
    setError(null);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `courses/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("quote-images").upload(path, file, { upsert: false });
    if (error) { setUploading(null); setError(error.message); return; }
    const { data } = supabase.storage.from("quote-images").getPublicUrl(path);
    setEditing((f) => f ? { ...f, [slot === "cover" ? "cover_image" : "hero_image"]: data.publicUrl } : f);
    setUploading(null);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur px-5 py-3 flex items-center justify-between border-b border-border">
        <button onClick={onClose} aria-label="Close"><X size={20} className="text-foreground" /></button>
        <h2 className="text-foreground font-bold">Manage Courses</h2>
        <button onClick={startNew} className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center" aria-label="Add course">
          <Plus size={18} />
        </button>
      </header>

      {editing ? (
        <div className="p-5 space-y-3">
          <Row label="Title"><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls} /></Row>
          <Row label="Subtitle"><input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} className={inputCls} /></Row>
          <Row label="Instructor"><input value={editing.instructor} onChange={(e) => setEditing({ ...editing, instructor: e.target.value })} className={inputCls} /></Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Category">
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputCls}>
                {COURSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Row>
            <Row label="Level">
              <select value={editing.level} onChange={(e) => setEditing({ ...editing, level: e.target.value })} className={inputCls}>
                {COURSE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Row>
          </div>

          <Row label="Cover image (16:9)">
            {editing.cover_image && <img src={editing.cover_image} alt="" className="w-40 aspect-video object-cover rounded-lg mb-2" />}
            <div className="flex gap-2">
              <input placeholder="https://…" value={editing.cover_image} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} className={inputCls} />
              <label className="shrink-0 flex items-center gap-1 px-3 h-10 rounded-lg bg-secondary text-foreground text-sm cursor-pointer">
                <Upload size={14} />{uploading === "cover" ? "…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "cover")} />
              </label>
            </div>
          </Row>

          <Row label="Hero banner (optional, wide)">
            {editing.hero_image && <img src={editing.hero_image} alt="" className="w-full aspect-[16/9] object-cover rounded-lg mb-2" />}
            <div className="flex gap-2">
              <input placeholder="https://…" value={editing.hero_image} onChange={(e) => setEditing({ ...editing, hero_image: e.target.value })} className={inputCls} />
              <label className="shrink-0 flex items-center gap-1 px-3 h-10 rounded-lg bg-secondary text-foreground text-sm cursor-pointer">
                <Upload size={14} />{uploading === "hero" ? "…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "hero")} />
              </label>
            </div>
          </Row>

          <Row label="Affiliate link"><input value={editing.affiliate_link} onChange={(e) => setEditing({ ...editing, affiliate_link: e.target.value })} className={inputCls} placeholder="https://…" /></Row>

          <div className="grid grid-cols-3 gap-3">
            <Row label="Duration"><input value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} className={inputCls} placeholder="6h 30m" /></Row>
            <Row label="Lessons"><input inputMode="numeric" value={editing.lessons_count} onChange={(e) => setEditing({ ...editing, lessons_count: e.target.value })} className={inputCls} /></Row>
            <Row label="Rating"><input inputMode="decimal" value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: e.target.value })} className={inputCls} placeholder="4.8" /></Row>
          </div>

          <Row label="Description"><textarea rows={4} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={inputCls} /></Row>
          <Row label="What you'll learn (one per line)"><textarea rows={4} value={editing.what_youll_learn} onChange={(e) => setEditing({ ...editing, what_youll_learn: e.target.value })} className={inputCls} /></Row>
          <Row label="Curriculum (one lesson per line)"><textarea rows={5} value={editing.curriculum} onChange={(e) => setEditing({ ...editing, curriculum: e.target.value })} className={inputCls} /></Row>
          <Row label="Requirements (one per line)"><textarea rows={3} value={editing.requirements} onChange={(e) => setEditing({ ...editing, requirements: e.target.value })} className={inputCls} /></Row>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {(["featured", "trending", "is_new_release", "is_best_seller", "published"] as const).map((k) => (
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
              {busy ? "Saving…" : editing.id ? "Save" : "Add course"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5">
          {courses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No courses yet. Tap + to add your first course.</div>
          ) : (
            <div className="space-y-3">
              {courses.map((c) => (
                <div key={c.id} className="flex gap-3 items-center bg-card rounded-2xl p-3">
                  <img src={c.cover_image} alt="" className="w-20 aspect-video object-cover rounded-lg bg-neutral-900" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-semibold truncate">{c.title}</p>
                    <p className="text-muted-foreground text-xs truncate">{c.instructor} · {c.category}</p>
                    <p className="text-muted-foreground text-[10px] mt-0.5">
                      {c.published ? "Published" : "Unpublished"}{c.featured ? " · Featured" : ""}
                    </p>
                  </div>
                  <button onClick={() => startEdit(c)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><Pencil size={14} className="text-foreground" /></button>
                  <button onClick={() => remove(c)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><Trash2 size={14} className="text-destructive" /></button>
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

export default CoursesAdminSheet;
