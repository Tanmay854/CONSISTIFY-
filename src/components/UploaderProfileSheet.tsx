import { useEffect, useState } from "react";
import { X, Play, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, type UploaderProfile } from "@/lib/uploaderProfiles";
import { getVideoThumbnail } from "@/lib/thumbUrl";
import SinglePostViewer, { type PostForViewer } from "@/components/SinglePostViewer";

type ReelRow = {
  id: string; title: string | null; description: string | null;
  video_url: string; video_fit: string | null; trim_start: number | null;
};

type QuoteRow = {
  id: string; title: string | null; description: string | null;
  image_url: string; category: string; set_id: string | null; set_position: number;
};

type Tab = "reels" | "quotes";

const UploaderProfileSheet = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
  const [profile, setProfile] = useState<UploaderProfile | null>(null);
  const [reels, setReels] = useState<ReelRow[]>([]);
  const [quoteSets, setQuoteSets] = useState<QuoteRow[]>([]); // one representative per set
  const [tab, setTab] = useState<Tab>("reels");
  const [viewing, setViewing] = useState<PostForViewer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [p, r, q] = await Promise.all([
        fetchProfile(userId),
        supabase.from("reels")
          .select("id,title,description,video_url,video_fit,trim_start")
          .eq("uploaded_by", userId)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase.from("quotes")
          .select("id,title,description,image_url,category,set_id,set_position,created_at")
          .eq("uploaded_by", userId)
          .order("created_at", { ascending: false })
          .order("set_position", { ascending: true })
          .limit(120),
      ]);
      if (cancelled) return;
      setProfile(p);
      setReels((r.data as ReelRow[]) || []);
      // Collapse quote-sets to their first item as the grid thumbnail
      const seen = new Set<string>();
      const collapsed: QuoteRow[] = [];
      for (const row of ((q.data as (QuoteRow & { created_at: string })[]) || [])) {
        const key = row.set_id || row.id;
        if (seen.has(key)) continue;
        seen.add(key);
        collapsed.push(row);
      }
      setQuoteSets(collapsed);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handle = profile?.username || profile?.display_name || "user";
  const totalPosts = reels.length + quoteSets.length;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-background flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-foreground font-semibold text-sm truncate">@{handle}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center">
            <X size={20} className="text-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Bio card */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0 ring-2 ring-primary/30">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={32} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-foreground text-base font-bold">{totalPosts}</p>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Posts</p>
                </div>
                <div>
                  <p className="text-foreground text-base font-bold">{reels.length}</p>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Reels</p>
                </div>
                <div>
                  <p className="text-foreground text-base font-bold">{quoteSets.length}</p>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Photos</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-foreground text-sm font-semibold">
                {profile?.display_name || handle}
              </p>
              {profile?.bio && (
                <p className="text-foreground/80 text-sm mt-1 whitespace-pre-wrap">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 border-t border-b border-border">
            {(["reels", "quotes"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  tab === t ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
                }`}
              >
                {t === "reels" ? "Videos" : "Photos"}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
          ) : tab === "reels" ? (
            reels.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">No videos yet</div>
            ) : (
              <div className="grid grid-cols-3 gap-[2px]">
                {reels.map((r) => {
                  const thumb = getVideoThumbnail(r.video_url);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setViewing({
                        kind: "reel", id: r.id, title: r.title, description: r.description,
                        video_url: r.video_url, video_fit: r.video_fit, trim_start: r.trim_start,
                      })}
                      className="relative aspect-[9/16] bg-secondary overflow-hidden"
                    >
                      {thumb ? (
                        <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-background">
                          <Play size={20} className="text-foreground/70 fill-foreground/70" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-1">
                        <Play size={10} className="text-white fill-white" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            quoteSets.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">No photos yet</div>
            ) : (
              <div className="grid grid-cols-3 gap-[2px]">
                {quoteSets.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setViewing({
                      kind: "quote", id: q.id, title: q.title, description: q.description,
                      image_url: q.image_url, category: q.category, set_id: q.set_id,
                    })}
                    className="relative aspect-square bg-secondary overflow-hidden"
                  >
                    <img src={q.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    {q.set_id && (
                      <div className="absolute top-1 right-1 bg-black/60 rounded px-1 text-[9px] text-white font-semibold">SET</div>
                    )}
                  </button>
                ))}
              </div>
            )
          )}
          <div className="h-10" />
        </div>
      </div>

      {viewing && <SinglePostViewer post={viewing} onClose={() => setViewing(null)} />}
    </>
  );
};

export default UploaderProfileSheet;
