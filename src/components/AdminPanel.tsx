import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { X, UserPlus, Shield, LayoutGrid, Inbox } from "lucide-react";
import AdminContentManager from "@/components/AdminContentManager";
import UploaderApplications from "@/components/UploaderApplications";

type AdminTab = "roles" | "applications" | "content";

const AdminPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<AdminTab>("roles");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"uploader" | "admin">("uploader");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open || !isAdmin) return null;

  const handleAddRole = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setMessage("You must be logged in."); setLoading(false); return; }

      const response = await supabase.functions.invoke("admin-grant-role", { body: { email, role } });
      if (response.error) setMessage(response.error.message || "Failed to grant role.");
      else if (response.data?.error) setMessage(response.data.error);
      else { setMessage(`Granted "${role}" role to ${email}`); setEmail(""); }
    } catch {
      setMessage("An error occurred.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
            <Shield size={18} className="text-primary" /> Admin Panel
          </h3>
          <button onClick={onClose}><X size={20} className="text-muted-foreground" /></button>
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab("roles")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold ${tab === "roles" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <UserPlus size={14} /> Roles
          </button>
          <button onClick={() => setTab("applications")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold ${tab === "applications" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <Inbox size={14} /> Apps
          </button>
          <button onClick={() => setTab("content")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold ${tab === "content" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <LayoutGrid size={14} /> Content
          </button>
        </div>

        {tab === "roles" && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs">Grant upload access to registered users by their email.</p>
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

        {tab === "content" && <AdminContentManager />}
      </div>
    </div>
  );
};

export default AdminPanel;
