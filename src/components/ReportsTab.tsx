import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  issue_description: string;
  status: string;
  created_at: string;
  user_id: string | null;
}

const ReportsTab = () => {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    setReports((data as Report[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const markReviewed = async (id: string) => {
    await supabase.from("reports").update({ status: "reviewed", reviewed_at: new Date().toISOString() }).eq("id", id);
    fetchReports();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    await supabase.from("reports").delete().eq("id", id);
    fetchReports();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "all"] as const).map((f) => (
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
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-destructive" />
                <span className="text-foreground text-xs font-semibold uppercase tracking-wider">{r.content_type}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.status === "pending" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`}>{r.status}</span>
              </div>
              <div className="flex gap-2">
                {r.status === "pending" && (
                  <button onClick={() => markReviewed(r.id)} className="text-primary" title="Mark reviewed"><Check size={14} /></button>
                )}
                {isAdmin && (
                  <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
            <p className="text-foreground text-sm">{r.issue_description}</p>
            <p className="text-muted-foreground text-[10px]">Content ID: {r.content_id.slice(0, 8)}… · {new Date(r.created_at).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default ReportsTab;
