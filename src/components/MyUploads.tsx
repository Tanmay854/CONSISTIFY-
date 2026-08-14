import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Check, X, Scissors, Trash2, Film, Image as ImageIcon, ImagePlus, Search, Eye, BarChart3, Clock } from "lucide-react";
import { getVideoThumbnail } from "@/lib/thumbUrl";


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
  thumbnail_url: string | null;
  thumbnail_portrait_url: string | null;
  thumbnail_landscape_url: string | null;
  feed: string | null;
  bunny_video_guid: string | null;
  bunny_library_id: string | null;
  created_at: string;
  uploaded_by: string | null;
  trim_start: number | null;
  trim_end: number | null;
}

type Tab = "long_game" | "quick_spark";
type ThumbKind = "portrait" | "landscape";

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
  const [tab, setTab] = useState<Tab>("long_game");
  const [reels, setReels] = useState<Reel[]>([]);
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
  const thumbInput = useRef<HTMLInputElement>(null);
  const [thumbTargetId, setThumbTargetId] = useState<string | null>(null);
  const [pendingThumb, setPendingThumb] = useState<{ file: File; url: string } | null>(null);
  const [thumbKind, setThumbKind] = useState<ThumbKind>("landscape");



  const q = query.trim().toLowerCase();
  const filterFn = <T extends { title: string | null }>(items: T[], extra?: (i: T) => string) =>
    !q ? items : items.filter((i) => (i.title || "").toLowerCase().includes(q) || (extra?.(i) ?? "").toLowerCase().includes(q));


  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const base = supabase.from("reels").select("*").order("created_at", { ascending: false });
    const r = await (isAdmin ? base : base.eq("uploaded_by", user.id));
    const rows = (r.data as Reel[]) || [];
    setReels(rows);

    if (rows.length) {
      const { data: vData } = await supabase
        .from("content_views")
        .select("content_type, content_id")
        .in("content_id", rows.map((i) => i.id));
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

  const handleThumbnail = async (file: File | null) => {
    const id = thumbTargetId;
    const kind = thumbKind;
    setThumbTargetId(null);
    if (!file || !id) return;
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setBusy(false); return; }
    const form = new FormData();
    form.append("file", file);
    form.append("kind", "image");
    const res = await fetch(
      `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bunny-storage-upload`,
      { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: form },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) { alert(json.error || "Thumbnail upload failed"); setBusy(false); return; }
    const payload = kind === "portrait"
      ? { thumbnail_portrait_url: json.url as string }
      : { thumbnail_landscape_url: json.url as string, thumbnail_url: json.url as string };
    const { error } = await supabase.from("reels").update(payload).eq("id", id);
    if (error) alert(error.message);
    await fetchAll();
    setBusy(false);
  };

  // Show the picked image first so the uploader can check framing before it goes live.
  const previewThumbnail = (file: File | null) => {
    if (!file) { setThumbTargetId(null); return; }
    setPendingThumb({ file, url: URL.createObjectURL(file) });
  };

  const cancelPendingThumb = () => {
    if (pendingThumb) URL.revokeObjectURL(pendingThumb.url);
    setPendingThumb(null);
    setThumbTargetId(null);
  };

  const confirmPendingThumb = async () => {
    if (!pendingThumb) return;
    const file = pendingThumb.file;
    URL.revokeObjectURL(pendingThumb.url);
    setPendingThumb(null);
    await handleThumbnail(file);
  };

  const pickThumb = (id: string, kind: ThumbKind) => {
    setThumbTargetId(id);
    setThumbKind(kind);
    thumbInput.current?.click();
  };




  const handleDelete = async (table: "reels" | "quotes", id: string, fileUrl: string | null, bucket: string | null, bunnyRef = {}) => {
    if (!confirm("Delete this item permanently?")) return;
    setBusy(true);
    const res = await deleteContent(table, id, fileUrl, bucket, bunnyRef);
    if (!res.ok) alert(res.error || "Delete failed");
    await fetchAll();
    setBusy(false);
  };

  const isLong = (feed: string | null) => feed !== "quick_spark";
  const fReels = filterFn(reels.filter((r) => (tab === "long_game" ? isLong(r.feed) : r.feed === "quick_spark")));

  const tabs: { id: Tab; label: string; icon: typeof Film; count: number }[] = [
    { id: "long_game", label: "Long Game", icon: Film, count: reels.filter((r) => isLong(r.feed)).length },
    { id: "quick_spark", label: "Quick Clips", icon: Film, count: reels.filter((r) => r.feed === "quick_spark").length },
  ];


  return (
    <div className="px-5 py-4 space-y-3">
      <input
        ref={thumbInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { previewThumbnail(e.target.files?.[0] || null); e.target.value = ""; }}
      />

      {pendingThumb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs bg-secondary rounded-2xl p-4 space-y-3">
            <p className="text-foreground text-sm font-semibold">
              {thumbKind === "portrait" ? "Hero / portrait thumbnail" : "Landscape thumbnail"}
            </p>
            <div className={`w-full overflow-hidden rounded-xl bg-muted ${thumbKind === "portrait" ? "aspect-[2/3]" : "aspect-video"}`}>
              <img src={pendingThumb.url} alt="Thumbnail preview" className="w-full h-full object-cover" />
            </div>
            <p className="text-muted-foreground text-[11px]">
              {thumbKind === "portrait"
                ? "This is exactly how it appears in the hero banner and poster grid."
                : "This is how it appears in Continue Watching."}
            </p>
            <div className="flex gap-2">
              <button onClick={cancelPendingThumb} disabled={busy} className="flex-1 rounded-xl bg-muted text-muted-foreground text-xs font-semibold py-2.5">Cancel</button>
              <button onClick={confirmPendingThumb} disabled={busy} className="flex-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold py-2.5 disabled:opacity-50">
                {busy ? "Uploading..." : "Use this"}
              </button>
            </div>
          </div>
        </div>
      )}


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
          {(
            fReels.length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">{query ? "No matches." : "No videos yet."}</p> :
            fReels.map((reel) => {
              const ytId = getYoutubeId(reel.video_url);
              const landscape = reel.thumbnail_landscape_url || (ytId
                ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
                : getVideoThumbnail(reel.video_url, reel.thumbnail_url));
              const portrait = reel.thumbnail_portrait_url;
              const isEditing = editingId === reel.id;
              const isTrimming = trimmingId === reel.id;
              return (
                <div key={reel.id} className="bg-secondary rounded-xl p-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => pickThumb(reel.id, "landscape")}
                        title="Change landscape thumbnail"
                        className="relative w-24 h-14 rounded-lg overflow-hidden bg-muted"
                      >
                        {landscape ? <img src={landscape} alt={reel.title || "video"} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">Landscape</div>}
                        <span className="absolute bottom-0 inset-x-0 bg-background/70 text-[9px] py-0.5 text-foreground flex items-center justify-center gap-1">
                          <ImagePlus size={10} /> 16:9
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => pickThumb(reel.id, "portrait")}
                        title="Change portrait thumbnail"
                        className="relative w-24 h-[84px] rounded-lg overflow-hidden bg-muted"
                      >
                        {portrait ? <img src={portrait} alt={reel.title || "video"} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">Portrait</div>}
                        <span className="absolute bottom-0 inset-x-0 bg-background/70 text-[9px] py-0.5 text-foreground flex items-center justify-center gap-1">
                          <ImagePlus size={10} /> 2:3
                        </span>
                      </button>
                    </div>


                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="w-full bg-background text-foreground rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" autoFocus />
                          <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" rows={2} className="w-full bg-background text-foreground rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary resize-none" />
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


        </>
      )}
    </div>
  );
};

export default MyUploads;
