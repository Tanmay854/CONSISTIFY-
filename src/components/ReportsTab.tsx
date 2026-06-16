import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Check, X, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  issue_description: string;
  status: string;
  created_at: string;
  user_id: string | null;
  reporter_email: string | null;
}

type Filter = "admitted" | "rejected" | "all";

interface ContentInfo { title: string; uploaderName: string; publicId: string | null; }

const ReportsTab = () => {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [contentMap, setContentMap] = useState<Record<string, ContentInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (filter === "admitted") q = q.eq("status", "admitted");
    else if (filter === "rejected") q = q.eq("status", "rejected");
    const { data } = await q;
    const rows = (data as Report[]) || [];
    setReports(rows);

    const byType: Record<"video" | "music" | "photo", string[]> = { video: [], music: [], photo: [] };
    rows.forEach((r) => {
      if (r.content_type === "video" || r.content_type === "music" || r.content_type === "photo") {
        byType[r.content_type].push(r.content_id);
      }
    });

    const tableFor = { video: "reels" as const, music: "music" as const, photo: "quotes" as const };
    const fetched: Array<{ id: string; title: string; uploaded_by: string | null; publicId: string | null }> = [];
    const uploaderIds = new Set<string>();

    await Promise.all((Object.keys(byType) as Array<keyof typeof byType>).map(async (type) => {
      const ids = byType[type];
      if (!ids.length) return;
      const selectCols = type === "music" ? "id, title, uploaded_by" : "id, title, uploaded_by, public_id";
      const { data: items } = await supabase.from(tableFor[type]).select(selectCols).in("id", ids);
      (items as any[] | null)?.forEach((it) => {
        fetched.push({ id: it.id, title: it.title ?? "(untitled)", uploaded_by: it.uploaded_by, publicId: it.public_id ?? null });
        if (it.uploaded_by) uploaderIds.add(it.uploaded_by);
      });
    }));

    const profiles: Record<string, string> = {};
    if (uploaderIds.size) {
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", Array.from(uploaderIds));
      (profs || []).forEach((p: any) => { profiles[p.user_id] = p.display_name || "Unknown"; });
    }

    const map: Record<string, ContentInfo> = {};
    fetched.forEach((f) => {
      map[f.id] = { title: f.title, uploaderName: f.uploaded_by ? (profiles[f.uploaded_by] || "Unknown") : "Unknown", publicId: f.publicId };
    });

    setContentMap(map);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const setStatus = async (id: string, status: "admitted" | "rejected") => {
    await supabase.from("reports").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    fetchReports();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    await supabase.from("reports").delete().eq("id", id);
    fetchReports();
  };

  const tabs: Filter[] = ["admitted", "rejected", "all"];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {tabs.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {f}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-muted-foreground text-xs text-center py-6">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-muted-foreground text-xs text-center py-6">No reports.</p>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="bg-secondary rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <AlertCircle size={14} className="text-destructive" />
                <span className="text-foreground text-xs font-semibold uppercase tracking-wider">{r.content_type}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  r.status === "admitted" ? "bg-primary/20 text-primary" :
                  r.status === "rejected" ? "bg-destructive/20 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>{r.status}</span>
              </div>
              <div className="flex gap-2">
                {r.status !== "admitted" && (
                  <button onClick={() => setStatus(r.id, "admitted")} className="text-primary" title="Admit"><Check size={14} /></button>
                )}
                {r.status !== "rejected" && (
                  <button onClick={() => setStatus(r.id, "rejected")} className="text-destructive" title="Reject"><X size={14} /></button>
                )}
                {isAdmin && (
                  <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 min-w-0">
                {contentMap[r.content_id]?.publicId && (
                  <span className="font-mono text-[10px] tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                    #{contentMap[r.content_id]!.publicId}
                  </span>
                )}
                <p className="text-foreground text-sm font-semibold truncate">
                  {contentMap[r.content_id]?.title ?? "(content unavailable)"}
                </p>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Uploaded by: <span className="text-foreground">{contentMap[r.content_id]?.uploaderName ?? "Unknown"}</span>
              </p>
            </div>

            <p className="text-foreground text-sm">{r.issue_description}</p>
            {r.reporter_email && <p className="text-muted-foreground text-[10px]">From: {r.reporter_email}</p>}
            <p className="text-muted-foreground text-[10px]">Content ID: {r.content_id.slice(0, 8)}… · {new Date(r.created_at).toLocaleString()}</p>
          </div>

        ))
      )}
    </div>
  );
};

export default ReportsTab;
