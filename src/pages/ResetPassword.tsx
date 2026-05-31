import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound } from "lucide-react";

const hasRecoveryHash = () => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hash.get("type") === "recovery" && hash.has("access_token") && hash.has("refresh_token");
};

const cleanResetUrl = () => window.history.replaceState(null, "", `${window.location.origin}/reset-password`);

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const markReady = () => {
      setReady(true);
      setChecking(false);
    };

    const finishChecking = () => setChecking(false);

    // Supabase puts the recovery token in the URL hash (#access_token=...&type=recovery)
    // The client auto-processes it; we listen for the event.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) markReady();
    });

    const prepareRecovery = async () => {
      const search = new URLSearchParams(window.location.search);
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) setError(error.message);
        else markReady();
        cleanResetUrl();
        finishChecking();
        return;
      }

      // When opened from iPhone/Gmail, the auth library can take a moment to
      // process the hash. Seeing the recovery hash means this is a valid reset attempt.
      if (hasRecoveryHash()) {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (cancelled) return;
          if (error) setError(error.message);
          else markReady();
          cleanResetUrl();
          finishChecking();
          return;
        }
      }
    };

    prepareRecovery();

    // Fallback: if a session already exists (recovery hash already processed,
    // or user is logged in and wants to change password), allow the form.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) markReady();
      else finishChecking();
    });

    // Safety timeout — if nothing arrives in 4s, stop the spinner so the user sees a message
    const timer = setTimeout(() => {
      if (!cancelled) setChecking(false);
    }, 4000);

    return () => { cancelled = true; clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, []);

  const submit = async () => {
    setError(null); setMessage(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMessage("Password updated. Please sign in with your new password.");
    // Sign out so they re-authenticate with the new password
    await supabase.auth.signOut();
    setTimeout(() => navigate("/"), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={20} className="text-primary" />
          <h1 className="text-foreground font-semibold text-lg">Reset password</h1>
        </div>
        {checking ? (
          <p className="text-muted-foreground text-sm">Validating reset link...</p>
        ) : !ready ? (
          <div className="space-y-3">
            <p className="text-destructive text-sm">
              This reset link is invalid or has expired.
            </p>
            <p className="text-muted-foreground text-xs">
              Open the most recent password-reset email and tap the link again. Each link can only be used once and expires after 1 hour.
            </p>
            <button onClick={() => navigate("/")} className="w-full bg-secondary text-foreground rounded-xl py-3 font-semibold text-sm">
              Back to app
            </button>
          </div>
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
