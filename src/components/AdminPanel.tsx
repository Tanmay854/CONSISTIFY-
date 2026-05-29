import { useState, useCallback } from "react";
import { X, UserPlus, Shield, LayoutGrid, Inbox, Users, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminContentManager from "@/components/AdminContentManager";
import UploaderApplications from "@/components/UploaderApplications";
import MembersManager from "@/components/MembersManager";
import ReportsTab from "@/components/ReportsTab";
import AnalyticsChart from "@/components/AnalyticsChart";

type AdminTab = "roles" | "applications" | "content" | "members" | "reports" | "analytics";

const AdminPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<AdminTab>("applications");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"uploader" | "admin">("uploader");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAddRole = useCallback(async () => {
    setMessage(null);
    setLoading(true);
    try {
      if (!email.trim()) { setMessage("Enter an email address"); setLoading(false); return; }
      if (password && password.length < 6) { setMessage("Password must be at least 6 characters"); setLoading(false); return; }
      const { data, error } = await supabase.functions.invoke("admin-grant-role", {
        body: { email: email.trim(), role, password: password || undefined },
      });
      if (error) {
        setMessage(error.message);
      } else if (data?.error) {
        setMessage(data.error);
      } else {
        const created = data?.created ? " (account created)" : "";
        setMessage(`✓ Granted "${role}" role to ${email}${created}`);
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  }, [email, password, role]);

  if (!open || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
            <Shield size={18} className="text-primary" /> Admin Panel
          </h3>
          <button onClick={onClose}><X size={20} className="text-muted-foreground" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5 overflow-x-auto pb-2">
          <button onClick={() => setTab("applications")}
            className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${tab === "applications" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <Inbox size={12} /> Requests
          </button>
          <button onClick={() => { setTab("roles"); if (!isSuperAdmin) setRole("uploader"); }}
            className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${tab === "roles" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <UserPlus size={12} /> Roles
          </button>
          <button onClick={() => setTab("members")}
            className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${tab === "members" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <Users size={12} /> Team
          </button>
          <button onClick={() => setTab("content")}
            className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${tab === "content" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <LayoutGrid size={12} /> Content
          </button>
          <button onClick={() => setTab("reports")}
            className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${tab === "reports" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <AlertCircle size={12} /> Reports
          </button>
          <button onClick={() => setTab("analytics")}
            className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${tab === "analytics" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <TrendingUp size={12} /> Analytics
          </button>
        </div>

        {tab === "roles" && isSuperAdmin && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs">Grant roles to registered users by their email.</p>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">User Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com"
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Role</label>
              <div className="flex gap-2">
                <button onClick={() => setRole("uploader")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium ${role === "uploader" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Uploader</button>
                <button onClick={() => setRole("admin")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium ${role === "admin" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Admin</button>
              </div>
            </div>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <button onClick={handleAddRole} disabled={loading || !email}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <UserPlus size={16} /> {loading ? "Granting..." : "Grant Role"}
            </button>
          </div>
        )}

        {tab === "applications" && <UploaderApplications />}
        {tab === "members" && <MembersManager />}
        {tab === "content" && <AdminContentManager />}
        {tab === "reports" && <ReportsTab />}
        {tab === "analytics" && <AnalyticsChart />}
      </div>
    </div>
  );
};

export default AdminPanel;
