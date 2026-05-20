import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Send } from "lucide-react";

type AppRow = { id: string; status: string; reason: string; created_at: string };

const ApplyUploaderSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [requestedRole, setRequestedRole] = useState<"uploader" | "admin">("uploader");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<AppRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("uploader_applications")
      .select("id,status,reason,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setExisting((data as AppRow) || null));
  }, [open, user]);

  if (!open) return null;

  const submit = async () => {
    if (!user || !reason.trim()) return;
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabase.from("uploader_applications").insert({
      user_id: user.id,
      email: user.email,
      reason: reason.trim(),
      requested_role: requestedRole,
    });
    setSubmitting(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Application submitted. Admins will review it shortly.");
      setReason("");
      setExisting({ id: "", status: "pending", reason: reason.trim(), created_at: new Date().toISOString() });
    }
  };

  const canApply = !existing || existing.status === "rejected";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold text-lg">Apply as Uploader</h3>
          <button onClick={onClose}><X size={20} className="text-muted-foreground" /></button>
        </div>

        {existing && (
          <div className="mb-4 bg-secondary rounded-xl p-3">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Latest application</p>
            <p className="text-foreground text-xs">
              Status: <span className={`font-semibold capitalize ${existing.status === "approved" ? "text-primary" : existing.status === "rejected" ? "text-destructive" : "text-foreground"}`}>{existing.status}</span>
            </p>
            <p className="text-muted-foreground text-xs mt-1 line-clamp-3">{existing.reason}</p>
          </div>
        )}

        {canApply ? (
          <>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Role</label>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setRequestedRole("uploader")}
                className={`flex-1 py-2 rounded-lg text-xs font-medium ${requestedRole === "uploader" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Uploader</button>
              <button onClick={() => setRequestedRole("admin")}
                className={`flex-1 py-2 rounded-lg text-xs font-medium ${requestedRole === "admin" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Admin</button>
            </div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Why?</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="Tell admins about your content..."
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            {message && <p className="text-xs text-muted-foreground mt-2">{message}</p>}
            <button
              onClick={submit}
              disabled={submitting || !reason.trim()}
              className="mt-4 w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={14} /> {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </>
        ) : (
          <p className="text-muted-foreground text-xs text-center py-2">
            {existing?.status === "pending" ? "Your application is pending review." : "You already have uploader access."}
          </p>
        )}
      </div>
    </div>
  );
};

export default ApplyUploaderSheet;
