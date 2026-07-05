import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Check, X, Scissors, Trash2, Film, Image as ImageIcon, Search, Eye, BarChart3, Clock } from "lucide-react";

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};
import { Slider } from "@/components/ui/slider";
import StatsChart from "@/components/StatsChart";
import { deleteContent } from "@/lib/deleteContent";

const CATEGORIES = ["Workout", "Study", "Motivation", "Mindfulness", "Finance", "Relationships"];

interface Reel {
  id: string;
  public_id: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  video_url: string;
  bunny_video_guid: string | null;
  bunny_library_id: string | null;
  created_at: string;
  uploaded_by: string | null;
  trim_start: number | null;
  trim_end: number | null;
}
interface Quote {
  id: string;
  public_id: string | null;
  title: string | null;
  description: string | null;
  category: string;
  image_url: string;
  bunny_storage_path: string | null;
  created_at: string;
  uploaded_by: string | null;
}


type Tab = "videos" | "photos";

const getYoutubeId = (url: string): string | null => {
  const m = url.match(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
};

const VideoTrimmer = ({ reel, onSave }: { reel: Reel; onSave: (start: number, end: number) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytId = getYoutubeId(reel.video_url);
  const [duration, setDuration] = useState(60);
  const [range, setRange] = useState<[number, number]>([reel.trim_start ?? 0, reel.trim_end ?? 60]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setRange([reel.trim_start ?? 0, reel.trim_end ?? dur]);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="mt-3 space-y-3">
      {!ytId && <video ref={videoRef} src={reel.video_url} onLoadedMetadata={handleLoadedMetadata} className="w-full rounded-lg aspect-video bg-secondary" controls />}
      {ytId && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-secondary">
          <iframe src={`https://www.youtube.com/embed/${ytId}?start=${Math.floor(range[0])}&end=${Math.floor(range[1])}`} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
        </div>
      )}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Start: {formatTime(range[0])}</span>
          <span>End: {formatTime(range[1])}</span>
        </div>
        <Slider min={0} max={duration} step={0.5} value={range} onValueChange={(v) => setRange(v as [number, number])} className="w-full" />
      </div>
      <button onClick={() => onSave(range[0], range[1])} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
        <Check size={16} /> Save Trim
      </button>
    </div>
  );
};

const MyUploads = () => {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("videos");
  const [reels, setReels] = useState<Reel[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [trimmingId, setTrimmingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [views, setViews] = useState<Record<string, number>>({});
  const [statsOpen, setStatsOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filterFn = <T extends { title: string | null }>(items: T[], extra?: (i: T) => string) =>
    !q ? items : items.filter((i) => (i.title || "").toLowerCase().includes(q) || (extra?.(i) ?? "").toLowerCase().includes(q));


  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const filterOwn = (q: ReturnType<typeof supabase.from>) => isAdmin ? q : q.eq("uploaded_by", user.id);
    const [r, q] = await Promise.all([
      filterOwn(supabase.from("reels").select("*").order("created_at", { ascending: false })),
      filterOwn(supabase.from("quotes").select("*").order("created_at", { ascending: false })),
    ]);
    setReels((r.data as Reel[]) || []);
    setQuotes((q.data as Quote[]) || []);

    const ids = [
      ...((r.data as Reel[]) || []).map((x) => ({ t: "reel", id: x.id })),
      ...((q.data as Quote[]) || []).map((x) => ({ t: "quote", id: x.id })),
    ];
    if (ids.length) {
      const { data: vData } = await supabase
        .from("content_views")
        .select("content_type, content_id")
        .in("content_id", ids.map((i) => i.id));
      const counts: Record<string, number> = {};
      (vData || []).forEach((v) => {
        const key = `${v.content_type}:${v.content_id}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      setViews(counts);
    } else {
      setViews({});
    }
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const startEdit = (item: { id: string; title: string | null; description: string | null; category: string | null }) => {
    setEditingId(item.id);
    setEditTitle(item.title || "");
    setEditDescription(item.description || "");
    setEditCategory(item.category || "");
  };

  const handleSaveEdit = async (table: "reels" | "quotes", id: string) => {
    if (!editTitle.trim()) return;
    setBusy(true);
    const payload: { title: string; description: string | null; category?: string } = {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    };
    if (editCategory) payload.category = table === "quotes" ? editCategory.toUpperCase() : editCategory;
    await supabase.from(table).update(payload).eq("id", id);
    setEditingId(null);
    await fetchAll();
    setBusy(false);
  };

  const handleSaveTrim = async (id: string, start: number, end: number) => {
    setBusy(true);
    await supabase.from("reels").update({ trim_start: start, trim_end: end }).eq("id", id);
    setTrimmingId(null);
    await fetchAll();
    setBusy(false);
  };

  const handleDelete = async (table: "reels" | "quotes", id: string, fileUrl: string | null, bucket: string | null, bunnyRef = {}) => {
    if (!confirm("Delete this item permanently?")) return;
    setBusy(true);
    const res = await deleteContent(table, id, fileUrl, bucket, bunnyRef);
    if (!res.ok) alert(res.error || "Delete failed");
    await fetchAll();
    setBusy(false);
  };

  const fReels = filterFn(reels);
  const fQuotes = filterFn(quotes, (q) => q.category);

  const tabs: { id: Tab; label: string; icon: typeof Film; count: number }[] = [
    { id: "videos", label: "Videos", icon: Film, count: fReels.length },
    { id: "photos", label: "Photos", icon: ImageIcon, count: fQuotes.length },
  ];

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your uploads..."
          className="w-full bg-secondary text-foreground rounded-lg pl-9 pr-9 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              <Icon size={14} /> {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-secondary rounded-xl" />)}</div>
      ) : (
        <>
          {tab === "videos" && (
            fReels.length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">{query ? "No matches." : "No videos yet."}</p> :
            fReels.map((reel) => {
              const ytId = getYoutubeId(reel.video_url);
              const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;
              const isEditing = editingId === reel.id;
              const isTrimming = trimmingId === reel.id;
              return (
                <div key={reel.id} className="bg-secondary rounded-xl p-3">
                  <div className="flex gap-3">
                    <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {thumb ? <img src={thumb} alt={reel.title || "video"} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Video</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="w-full bg-background text-foreground rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" autoFocus />
                          <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" rows={2} className="w-full bg-background text-foreground rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary resize-none" />
                          <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-background text-foreground rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary">
                            <option value="">Select category</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground flex items-center gap-1"><X size={13} /> Cancel</button>
                            <button onClick={() => handleSaveEdit("reels", reel.id)} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground flex items-center gap-1"><Check size={13} /> Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-2">
                            {reel.public_id && <span className="font-mono text-[10px] tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded flex-shrink-0">#{reel.public_id}</span>}
                            <p className="text-foreground text-sm font-medium truncate">{reel.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => startEdit(reel)} className="text-muted-foreground hover:text-primary"><Pencil size={14} /></button>
                            <button onClick={() => setTrimmingId(isTrimming ? null : reel.id)} className={isTrimming ? "text-primary" : "text-muted-foreground hover:text-primary"}><Scissors size={14} /></button>
                            <button onClick={() => setStatsOpen(statsOpen === `reel:${reel.id}` ? null : `reel:${reel.id}`)} className={statsOpen === `reel:${reel.id}` ? "text-primary" : "text-muted-foreground hover:text-primary"}><BarChart3 size={14} /></button>
                            <button onClick={() => handleDelete("reels", reel.id, reel.video_url, ytId ? null : "videos", { videoGuid: reel.bunny_video_guid, libraryId: reel.bunny_library_id })} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )}
                      <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><Clock size={11} /> {formatDateTime(reel.created_at)}</span>
                        <span className="flex items-center gap-1"><Eye size={11} /> {views[`reel:${reel.id}`] || 0}</span>
                      </p>
                    </div>
                  </div>
                  {isTrimming && <VideoTrimmer reel={reel} onSave={(s, e) => handleSaveTrim(reel.id, s, e)} />}
                  {statsOpen === `reel:${reel.id}` && <StatsChart contentType="reel" contentId={reel.id} />}
                </div>
              );
            })
          )}

          {tab === "photos" && (
            fQuotes.length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">{query ? "No matches." : "No photos yet."}</p> :
            fQuotes.map((q) => {
              const isEditing = editingId === q.id;
              return (
                <div key={q.id} className="bg-secondary rounded-xl p-3">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img src={q.image_url} alt={q.title || "photo"} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="flex-1 bg-background text-foreground rounded-lg px-2 py-1 text-sm" autoFocus />
                          <button onClick={() => handleSaveTitle("quotes", q.id)} disabled={busy} className="text-primary"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {q.public_id && <span className="font-mono text-[10px] tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded flex-shrink-0">#{q.public_id}</span>}
                              <p className="text-foreground text-sm font-medium truncate">{q.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                            </div>

                            <p className="text-muted-foreground text-xs truncate flex items-center gap-2 flex-wrap">
                              <span>{q.category}</span>
                              <span className="flex items-center gap-1"><Clock size={11} /> {formatDateTime(q.created_at)}</span>
                              <span className="flex items-center gap-1"><Eye size={11} /> {views[`quote:${q.id}`] || 0}</span>
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => { setEditingId(q.id); setEditTitle(q.title || ""); }} className="text-muted-foreground hover:text-primary"><Pencil size={14} /></button>
                            <button onClick={() => setStatsOpen(statsOpen === `quote:${q.id}` ? null : `quote:${q.id}`)} className={statsOpen === `quote:${q.id}` ? "text-primary" : "text-muted-foreground hover:text-primary"}><BarChart3 size={14} /></button>
                            <button onClick={() => handleDelete("quotes", q.id, q.image_url, "quote-images", { storagePath: q.bunny_storage_path })} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {statsOpen === `quote:${q.id}` && <StatsChart contentType="quote" contentId={q.id} />}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
};

export default MyUploads;
