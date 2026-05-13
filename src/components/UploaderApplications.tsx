import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Clock } from "lucide-react";

type Application = {
  id: string;
  user_id: string;
  email: string | null;
  reason: string;
  status: string;
  created_at: string;
};

const UploaderApplications = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("uploader_applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApps((data as Application[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("uploader_applications")
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    load();
  };

  const filtered = apps.filter((a) => a.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {s} {s === "pending" && apps.filter((a) => a.status === "pending").length > 0 && `(${apps.filter((a) => a.status === "pending").length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-xs text-center py-6">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-xs text-center py-6">No {filter} applications.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => (
            <div key={app.id} className="bg-secondary rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium truncate">{app.email || app.user_id.slice(0, 8)}</p>
                  <p className="text-muted-foreground text-[10px]">{new Date(app.created_at).toLocaleString()}</p>
                </div>
                {app.status === "pending" && <Clock size={14} className="text-muted-foreground shrink-0" />}
              </div>
              <p className="text-foreground/90 text-xs whitespace-pre-wrap">{app.reason}</p>
              {app.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => review(app.id, "approved")}
                    disabled={busyId === app.id}
                    className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg disabled:opacity-50"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={() => review(app.id, "rejected")}
                    disabled={busyId === app.id}
                    className="flex-1 flex items-center justify-center gap-1 bg-destructive text-destructive-foreground text-xs font-semibold py-2 rounded-lg disabled:opacity-50"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploaderApplications;
