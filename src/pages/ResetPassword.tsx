import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash; the client will trigger onAuthStateChange
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    setError(null); setMessage(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setMessage("Password updated. Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={20} className="text-primary" />
          <h1 className="text-foreground font-semibold text-lg">Reset password</h1>
        </div>
        {!ready ? (
          <p className="text-muted-foreground text-sm">Validating reset link...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">New password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
            {message && <p className="text-primary text-xs">{message}</p>}
            <button onClick={submit} disabled={loading} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
              {loading ? "Updating..." : "Update password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
