import { useEffect, useMemo, useRef, useState } from "react";
import { X, Play, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, type UploaderProfile } from "@/lib/uploaderProfiles";
import { getVideoThumbnail } from "@/lib/thumbUrl";
import SinglePostViewer, { type PostForViewer } from "@/components/SinglePostViewer";

type ReelRow = {
  id: string; title: string | null; description: string | null;
  video_url: string; video_fit: string | null; trim_start: number | null;
  trim_end: number | null; feed: string; thumbnail_portrait_url: string | null;
  thumbnail_url: string | null;
};

type Tab = "reels" | "quotes";

// Videos shorter than this (in seconds) always belong to Quick Clips.
const QUICK_CLIP_MAX_SECONDS = 180;


// Height reserved for the bottom navigation bar — the sheet and backdrop
// stop above this so the nav remains fully sharp and visible.
const NAV_H = 64;

const UploaderProfileSheet = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
  const [profile, setProfile] = useState<UploaderProfile | null>(null);
  const [reels, setReels] = useState<ReelRow[]>([]);
  const [tab, setTab] = useState<Tab>("reels");
  const [viewing, setViewing] = useState<PostForViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  // Swipe-down to dismiss
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setMounted(false);
    window.setTimeout(onClose, 240);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [p, r] = await Promise.all([
        fetchProfile(userId),
        supabase.from("reels")
          .select("id,title,description,video_url,video_fit,trim_start,trim_end,feed,thumbnail_portrait_url,thumbnail_url")
          .eq("uploaded_by", userId)
          .order("created_at", { ascending: false })
          .limit(120),
      ]);
      if (cancelled) return;
      setProfile(p);
      setReels((r.data as ReelRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // A video is a Quick Clip when it was posted to the quick clips feed OR its
  // trimmed length is under 3 minutes.
  const { longGame, quickClips } = useMemo(() => {
    const long: ReelRow[] = [];
    const quick: ReelRow[] = [];
    for (const r of reels) {
      const start = r.trim_start ?? 0;
      const end = r.trim_end ?? null;
      const seconds = end != null ? end - start : null;
      const isQuick = r.feed === "quick_spark" || (seconds != null && seconds < QUICK_CLIP_MAX_SECONDS);
      (isQuick ? quick : long).push(r);
    }
    return { longGame: long, quickClips: quick };
  }, [reels]);

  const safeName = (v: string | null | undefined) => (v && !v.includes("@") ? v : null);
  const handle = profile?.username || safeName(profile?.display_name) || "user";
  const totalPosts = reels.length;


  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 120) { handleClose(); }
    setDragY(0);
    startY.current = null;
  };

  return (
    <>
      {/* Backdrop: covers everything ABOVE the bottom nav so the nav stays sharp */}
      <div
        className="fixed left-0 right-0 top-0 z-[55]"
        style={{ bottom: NAV_H }}
      >
        {/* Blurred glass layer — subtle Apple-style */}
        <div
          onClick={handleClose}
          className="absolute inset-0 transition-all duration-[280ms] ease-out"
          style={{
            backdropFilter: mounted ? "blur(14px) saturate(140%)" : "blur(0px)",
            WebkitBackdropFilter: mounted ? "blur(14px) saturate(140%)" : "blur(0px)",
            backgroundColor: mounted ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0)",
          }}
        />

        {/* Floating sheet */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="absolute left-0 right-0 bottom-0 mx-4 sm:mx-5 flex flex-col overflow-hidden"
          style={{
            top: 28,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            backgroundColor: "#000000",
            boxShadow: "0 -30px 80px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.06) inset",
            transform: `translateY(${mounted ? dragY : 800}px)`,
            transition: closing
              ? "transform 240ms cubic-bezier(0.32, 0.72, 0, 1)"
              : (dragY === 0
                ? "transform 480ms cubic-bezier(0.22, 1.2, 0.36, 1)"
                : "none"),
            willChange: "transform",
          }}
        >
          {/* Grab handle + close */}
          <div className="relative pt-3">
            <div className="mx-auto h-1 w-10 rounded-full bg-white/25" />
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute top-2.5 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-white/8 hover:bg-white/15 transition-colors"
            >
              <X size={16} className="text-white/90" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Profile section */}
            <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-white/5 overflow-hidden flex items-center justify-center ring-1 ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={36} className="text-white/50" />
                )}
              </div>
              <p className="mt-4 text-white text-[17px] font-semibold tracking-tight">{handle}</p>
              {profile?.bio && (
                <p className="mt-2 max-w-[80%] text-white/60 text-[13px] leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}

              {/* Stats */}
              <div className="mt-6 w-full max-w-xs grid grid-cols-3">
                {[
                  { label: "Posts", value: totalPosts },
                  { label: "Long Game", value: reels.length },
                  { label: "Quick Clips", value: quoteSets.length },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center">
                    <span className="text-white text-lg font-semibold tabular-nums">{s.value}</span>
                    <span className="mt-0.5 text-white/45 text-[10px] uppercase tracking-[0.14em]">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="relative mx-6 grid grid-cols-2">
              {(["reels", "quotes"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-3 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                    tab === t ? "text-white" : "text-white/40"
                  }`}
                >
                  {t === "reels" ? "Long Game" : "Quick Clips"}
                </button>
              ))}
              {/* Base line */}
              <div className="absolute left-0 right-0 bottom-0 h-px bg-white/8" />
              {/* Active indicator */}
              <div
                className="absolute bottom-0 h-[2px] rounded-full bg-[hsl(142,71%,45%)] transition-transform duration-300 ease-out"
                style={{
                  width: "50%",
                  transform: `translateX(${tab === "reels" ? "0%" : "100%"})`,
                }}
              />
            </div>

            {/* Grid */}
            <div className="px-4 pt-4 pb-8">
              {loading ? (
                <div className="p-10 text-center text-white/50 text-sm">Loading…</div>
              ) : tab === "reels" ? (
                reels.length === 0 ? (
                  <div className="p-10 text-center text-white/50 text-sm">No long game videos yet</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {reels.map((r) => {
                      const thumb = getVideoThumbnail(r.video_url);
                      return (
                        <button
                          key={r.id}
                          onClick={() => setViewing({
                            kind: "reel", id: r.id, title: r.title, description: r.description,
                            video_url: r.video_url, video_fit: r.video_fit, trim_start: r.trim_start,
                          })}
                          className="relative aspect-[9/16] bg-white/5 overflow-hidden rounded-2xl active:scale-[0.98] transition-transform"
                        >
                          {thumb ? (
                            <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                              <Play size={22} className="text-white/70 fill-white/70" />
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 bg-black/55 backdrop-blur rounded-full p-1.5">
                            <Play size={11} className="text-white fill-white" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                quoteSets.length === 0 ? (
                  <div className="p-10 text-center text-white/50 text-sm">No quick clips yet</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {quoteSets.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => setViewing({
                          kind: "quote", id: q.id, title: q.title, description: q.description,
                          image_url: q.image_url, category: q.category, set_id: q.set_id,
                        })}
                        className="relative aspect-square bg-white/5 overflow-hidden rounded-2xl active:scale-[0.98] transition-transform"
                      >
                        <img src={q.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        {q.set_id && (
                          <div className="absolute top-2 right-2 bg-black/55 backdrop-blur rounded-md px-1.5 py-0.5 text-[9px] text-white font-semibold tracking-wide">SET</div>
                        )}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {viewing && <SinglePostViewer post={viewing} onClose={() => setViewing(null)} />}
    </>
  );
};

export default UploaderProfileSheet;
