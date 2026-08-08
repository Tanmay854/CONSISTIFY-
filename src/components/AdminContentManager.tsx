import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Film, Image as ImageIcon, User, Search, X, Mail, Clock, Star } from "lucide-react";

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};
import { deleteContent } from "@/lib/deleteContent";

type Tab = "videos" | "photos";

interface BaseItem {
  id: string;
  public_id: string | null;
  title: string | null;
  uploaded_by: string | null;
  created_at: string;
}
interface Reel extends BaseItem { video_url: string; bunny_video_guid: string | null; bunny_library_id: string | null; feed: string | null; is_featured: boolean | null; }
interface Quote extends BaseItem { image_url: string; category: string; bunny_storage_path: string | null; }


const isYoutube = (url: string) => /youtube\.com|youtu\.be/.test(url);

const getYoutubeId = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

const getVideoThumbnail = (url: string): string | null => {
  if (!url) return null;
  const yt = getYoutubeId(url);
  if (yt) return `https://img.youtube.com/vi/${yt}/mqdefault.jpg`;
  const bunny = url.match(/^(https?:\/\/[^/]+\.b-cdn\.net)\/([0-9a-fA-F-]{36})/);
  if (bunny) return `${bunny[1]}/${bunny[2]}/thumbnail.jpg`;
  const md = url.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-fA-F-]{36})/i);
  if (md) return `https://vz-${md[1]}.b-cdn.net/${md[2]}/thumbnail.jpg`;
  return null;
};

const AdminContentManager = () => {
  const [tab, setTab] = useState<Tab>("videos");
  const [reels, setReels] = useState<Reel[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [r, q, p] = await Promise.all([
      supabase.from("reels").select("*").order("created_at", { ascending: false }),
      supabase.from("quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    const reelsData = (r.data as Reel[]) || [];
    const quotesData = (q.data as Quote[]) || [];
    setReels(reelsData);
    setQuotes(quotesData);
    const map: Record<string, string> = {};
    (p.data || []).forEach((row: { user_id: string; display_name: string | null }) => {
      map[row.user_id] = row.display_name || "Unknown";
    });
    setProfiles(map);

    const uploaderIds = Array.from(new Set(
      [...reelsData, ...quotesData].map((x) => x.uploaded_by).filter((v): v is string => !!v)
    ));
    if (uploaderIds.length) {
      const { data: emailRows } = await supabase.rpc("get_uploader_emails", { _user_ids: uploaderIds });
      const eMap: Record<string, string> = {};
      (emailRows || []).forEach((row: { user_id: string; email: string | null }) => {
        if (row.email) eMap[row.user_id] = row.email;
      });
      setEmails(eMap);
    } else {
      setEmails({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const nameFor = (uid: string | null) => uid ? (profiles[uid] || "Unknown") : "Legacy/Anonymous";
  const emailFor = (uid: string | null) => uid ? (emails[uid] || null) : null;

  const handleDelete = async (table: "reels" | "quotes", id: string, fileUrl: string | null, bucket: string | null, bunnyRef = {}) => {
    if (!confirm("Permanently delete this item?")) return;
    setBusy(true);
    const res = await deleteContent(table, id, fileUrl, bucket, bunnyRef);
    if (!res.ok) alert(res.error || "Delete failed");
    await fetchAll();
    setBusy(false);
  };

  const q = query.trim().toLowerCase();
  const matches = (title: string | null, uid: string | null, publicId: string | null) => {
    if (!q) return true;
    const t = (title || "").toLowerCase();
    const pid = (publicId || "").toLowerCase();
    return t.includes(q) || pid.includes(q) || nameFor(uid).toLowerCase().includes(q);
  };

  const fReels = useMemo(() => reels.filter((r) => matches(r.title, r.uploaded_by, r.public_id)), [reels, q, profiles]);
  const fQuotes = useMemo(() => quotes.filter((qq) => matches(qq.title, qq.uploaded_by, qq.public_id)), [quotes, q, profiles]);


  const tabs: { id: Tab; label: string; icon: typeof Film; count: number }[] = [
    { id: "videos", label: "Videos", icon: Film, count: fReels.length },
    { id: "photos", label: "Photos", icon: ImageIcon, count: fQuotes.length },
  ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ID, title or uploader..."
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

      <div className="max-h-[55vh] overflow-y-auto space-y-2 -mx-1 px-1">
        {loading ? (
          <div className="animate-pulse space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 bg-secondary rounded-lg" />)}</div>
        ) : (
          <>
            {tab === "videos" && fReels.map((r) => {
              const thumb = getVideoThumbnail(r.video_url);
              return (
              <div key={r.id} className="bg-secondary rounded-lg p-3 flex gap-3 items-start">
                <div className="w-16 h-16 rounded bg-background flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {thumb ? (
                    <img src={thumb} alt={r.title || "video"} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Film size={20} className="text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.public_id && (
                      <span className="font-mono text-[10px] tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                        #{r.public_id}
                      </span>
                    )}
                    <p className="text-foreground text-sm font-medium truncate">{r.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                  </div>
                  <p className="text-muted-foreground text-xs truncate flex items-center gap-1 mt-0.5"><User size={10} /> {nameFor(r.uploaded_by)}</p>
                  {emailFor(r.uploaded_by) && (
                    <p className="text-muted-foreground text-xs truncate flex items-center gap-1 mt-0.5"><Mail size={10} /> {emailFor(r.uploaded_by)}</p>
                  )}
                  <p className="text-muted-foreground text-xs truncate flex items-center gap-1 mt-0.5"><Clock size={10} /> {formatDateTime(r.created_at)}</p>
                </div>
                <button onClick={() => handleDelete("reels", r.id, r.video_url, isYoutube(r.video_url) ? null : "videos", { videoGuid: r.bunny_video_guid, libraryId: r.bunny_library_id })} disabled={busy} className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 size={16} /></button>
              </div>
              );
            })}
            {tab === "videos" && fReels.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">{query ? "No matches." : "No videos."}</p>}

            {tab === "photos" && fQuotes.map((qq) => (
              <div key={qq.id} className="bg-secondary rounded-lg p-3 flex gap-3 items-start">
                <img src={qq.image_url} alt={qq.title || "photo"} className="w-16 h-16 rounded object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {qq.public_id && (
                      <span className="font-mono text-[10px] tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                        #{qq.public_id}
                      </span>
                    )}
                    <p className="text-foreground text-sm font-medium truncate">{qq.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                  </div>
                  <p className="text-muted-foreground text-xs truncate flex items-center gap-1 mt-0.5"><User size={10} /> {nameFor(qq.uploaded_by)}</p>
                  {emailFor(qq.uploaded_by) && (
                    <p className="text-muted-foreground text-xs truncate flex items-center gap-1 mt-0.5"><Mail size={10} /> {emailFor(qq.uploaded_by)}</p>
                  )}
                  <p className="text-muted-foreground text-xs truncate flex items-center gap-1 mt-0.5"><Clock size={10} /> {formatDateTime(qq.created_at)}</p>
                </div>
                <button onClick={() => handleDelete("quotes", qq.id, qq.image_url, "quote-images", { storagePath: qq.bunny_storage_path })} disabled={busy} className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 size={16} /></button>
              </div>
            ))}

            {tab === "photos" && fQuotes.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">{query ? "No matches." : "No photos."}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminContentManager;
