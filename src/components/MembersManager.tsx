import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Upload as UploadIcon, Trash2, RefreshCw } from "lucide-react";

type Staff = { user_id: string; role: "admin" | "uploader"; email: string | null; is_super?: boolean };

const MembersManager = () => {
  const { isSuperAdmin } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke("list-staff");
    if (error) setMessage(error.message);
    else setStaff(data?.staff || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (s: Staff) => {
    if (!confirm(`Remove ${s.role} role from ${s.email || s.user_id}?`)) return;
    setBusy(s.user_id + s.role);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke("admin-remove-role", { body: { user_id: s.user_id, role: s.role } });
    if (error) setMessage(error.message);
    else if (data?.error) setMessage(data.error);
    else await load();
    setBusy(null);
  };

  const admins = staff.filter((s) => s.role === "admin");
  const uploaders = staff.filter((s) => s.role === "uploader");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{admins.length}/5 admins · {uploaders.length}/200 uploaders</p>
        <button onClick={load} className="text-muted-foreground"><RefreshCw size={14} /></button>
      </div>
      {message && <p className="text-xs text-destructive">{message}</p>}

      {loading ? (
        <p className="text-muted-foreground text-xs text-center py-6">Loading...</p>
      ) : (
        <>
          <div>
            <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Shield size={12} className="text-primary" /> Admins</h4>
            <div className="space-y-2">
              {admins.map((s) => {
                const isTargetSuper = s.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
                return (
                  <div key={s.user_id + s.role} className="bg-secondary rounded-lg p-3 flex items-center gap-3">
                    <Shield size={14} className="text-primary flex-shrink-0" />
                    <p className="flex-1 text-foreground text-xs truncate">{s.email || s.user_id.slice(0, 8)}{isTargetSuper && <span className="ml-1.5 text-[10px] text-primary">(super)</span>}</p>
                    {isSuperAdmin && !isTargetSuper && (
                      <button onClick={() => remove(s)} disabled={busy === s.user_id + s.role} className="text-muted-foreground hover:text-destructive disabled:opacity-50">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {admins.length === 0 && <p className="text-muted-foreground text-xs">No admins.</p>}
            </div>
          </div>

          <div>
            <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"><UploadIcon size={12} className="text-primary" /> Uploaders</h4>
            <div className="space-y-2">
              {uploaders.map((s) => (
                <div key={s.user_id + s.role} className="bg-secondary rounded-lg p-3 flex items-center gap-3">
                  <UploadIcon size={14} className="text-primary flex-shrink-0" />
                  <p className="flex-1 text-foreground text-xs truncate">{s.email || s.user_id.slice(0, 8)}</p>
                  <button onClick={() => remove(s)} disabled={busy === s.user_id + s.role} className="text-muted-foreground hover:text-destructive disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {uploaders.length === 0 && <p className="text-muted-foreground text-xs">No uploaders.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MembersManager;
