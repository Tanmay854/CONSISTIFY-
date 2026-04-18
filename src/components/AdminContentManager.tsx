import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Film, Music2, Image as ImageIcon, User, Search, X } from "lucide-react";

type Tab = "videos" | "music" | "photos";

interface BaseItem {
  id: string;
  title: string;
  uploaded_by: string | null;
  created_at: string;
}
interface Reel extends BaseItem { video_url: string; }
interface Music extends BaseItem { artist: string; category: string; audio_url: string | null; }
interface Quote extends BaseItem { image_url: string; category: string; }

const extractStoragePath = (url: string, bucket: string): string | null => {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
};

const isYoutube = (url: string) => /youtube\.com|youtu\.be/.test(url);

const AdminContentManager = () => {
  const [tab, setTab] = useState<Tab>("videos");
  const [reels, setReels] = useState<Reel[]>([]);
  const [music, setMusic] = useState<Music[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [r, m, q, p] = await Promise.all([
      supabase.from("reels").select("*").order("created_at", { ascending: false }),
      supabase.from("music").select("*").order("created_at", { ascending: false }),
      supabase.from("quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    setReels((r.data as Reel[]) || []);
    setMusic((m.data as Music[]) || []);
    setQuotes((q.data as Quote[]) || []);
    const map: Record<string, string> = {};
    (p.data || []).forEach((row: { user_id: string; display_name: string | null }) => {
      map[row.user_id] = row.display_name || "Unknown";
    });
    setProfiles(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const nameFor = (uid: string | null) => uid ? (profiles[uid] || "Unknown") : "Legacy/Anonymous";

  const handleDelete = async (table: "reels" | "music" | "quotes", id: string, fileUrl: string | null, bucket: string | null) => {
    if (!confirm("Permanently delete this item?")) return;
    setBusy(true);
    if (fileUrl && bucket) {
      const path = extractStoragePath(fileUrl, bucket);
      if (path) await supabase.storage.from(bucket).remove([path]);
    }
    await supabase.from(table).delete().eq("id", id);
    await fetchAll();
    setBusy(false);
  };

  const q = query.trim().toLowerCase();
  const matches = (title: string, uid: string | null, extra = "") =>
    !q || title.toLowerCase().includes(q) || nameFor(uid).toLowerCase().includes(q) || extra.toLowerCase().includes(q);

  const fReels = useMemo(() => reels.filter((r) => matches(r.title, r.uploaded_by)), [reels, q, profiles]);
  const fMusic = useMemo(() => music.filter((m) => matches(m.title, m.uploaded_by, m.artist)), [music, q, profiles]);
  const fQuotes = useMemo(() => quotes.filter((qq) => matches(qq.title, qq.uploaded_by)), [quotes, q, profiles]);

  const tabs: { id: Tab; label: string; icon: typeof Film; count: number }[] = [
    { id: "videos", label: "Videos", icon: Film, count: fReels.length },
    { id: "music", label: "Music", icon: Music2, count: fMusic.length },
    { id: "photos", label: "Photos", icon: ImageIcon, count: fQuotes.length },
  ];

  return (
    <div className="space-y-3">
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

      <div className="max-h-[55vh] overflow-y-auto space-y-2 -mx-1 px-1">
        {loading ? (
          <div className="animate-pulse space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 bg-secondary rounded-lg" />)}</div>
        ) : (
          <>
            {tab === "videos" && reels.map((r) => (
              <div key={r.id} className="bg-secondary rounded-lg p-3 flex gap-3 items-center">
                <Film size={18} className="text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{r.title}</p>
                  <p className="text-muted-foreground text-xs truncate flex items-center gap-1"><User size={10} /> {nameFor(r.uploaded_by)}</p>
                </div>
                <button onClick={() => handleDelete("reels", r.id, r.video_url, isYoutube(r.video_url) ? null : "videos")} disabled={busy} className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 size={16} /></button>
              </div>
            ))}
            {tab === "videos" && reels.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No videos.</p>}

            {tab === "music" && music.map((m) => (
              <div key={m.id} className="bg-secondary rounded-lg p-3 flex gap-3 items-center">
                <Music2 size={18} className="text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{m.title} <span className="text-muted-foreground font-normal">· {m.artist}</span></p>
                  <p className="text-muted-foreground text-xs truncate flex items-center gap-1"><User size={10} /> {nameFor(m.uploaded_by)}</p>
                </div>
                <button onClick={() => handleDelete("music", m.id, m.audio_url, "audio")} disabled={busy} className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 size={16} /></button>
              </div>
            ))}
            {tab === "music" && music.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No music.</p>}

            {tab === "photos" && quotes.map((q) => (
              <div key={q.id} className="bg-secondary rounded-lg p-3 flex gap-3 items-center">
                <img src={q.image_url} alt={q.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{q.title}</p>
                  <p className="text-muted-foreground text-xs truncate flex items-center gap-1"><User size={10} /> {nameFor(q.uploaded_by)}</p>
                </div>
                <button onClick={() => handleDelete("quotes", q.id, q.image_url, "quote-images")} disabled={busy} className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 size={16} /></button>
              </div>
            ))}
            {tab === "photos" && quotes.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No photos.</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminContentManager;
