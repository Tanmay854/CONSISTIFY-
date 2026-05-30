import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { X, LogIn, Send } from "lucide-react";

type Mode = "login" | "apply";

const AuthSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { signIn, signUp, pendingApplicationMessage } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const reset = () => { setEmail(""); setPassword(""); setReason(""); setError(null); setInfo(null); };
  const close = () => { reset(); onClose(); };

  const handleLogin = async () => {
    setError(null); setInfo(null); setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { setError(error); return; }
    close();
  };

  const handleForgot = async () => {
    setError(null); setInfo(null);
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setError("Enter your email above first, then tap Forgot password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setInfo("If an account exists for this email, a reset link has been sent. Check your inbox (and spam folder).");
  };

  const handleApply = async () => {
    setError(null); setInfo(null);
    if (!email || !password) { setError("Email and password required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    const words = reason.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) { setError("Please tell us why you want to be an uploader."); return; }
    if (words.length > 50) { setError(`Maximum 50 words (currently ${words.length}).`); return; }

    setLoading(true);
    const normalizedEmail = email.trim();
    const { error: signUpErr } = await signUp(normalizedEmail, password);
    let { data: { user } } = await supabase.auth.getUser();

    // If an older rejected account still exists, allow the same email to reapply
    // by signing into that account and creating a fresh pending application.
    if (signUpErr && /already|registered|exists/i.test(signUpErr)) {
      const { data, error: siErr } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (siErr) {
        setLoading(false);
        setError("This email already has an account. Use the same password or reset it, then submit the application again.");
        return;
      }
      user = data.user;
    } else if (signUpErr) {
      setLoading(false);
      setError(signUpErr);
      return;
    }

    // Get the user we just created (may need to sign in if email-confirm is on)
    if (!user) {
      const { data, error: siErr } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (siErr) {
        setLoading(false);
        setError("Account created. Please log in and resubmit your application.");
        return;
      }
      user = data.user;
    }
    if (!user) { setLoading(false); setError("Could not create account."); return; }

    const { error: appErr } = await supabase.from("uploader_applications").insert({
      user_id: user.id,
      email: user.email,
      reason: reason.trim(),
      requested_role: "uploader",
      status: "pending",
    });
    // Sign out — they can't use the app until approved
    await supabase.auth.signOut();
    setLoading(false);
    if (appErr) {
      const message = /duplicate|unique/i.test(appErr.message)
        ? "You already have a pending application. Please wait for admin approval."
        : "Account created but application failed: " + appErr.message;
      setError(message);
      return;
    }
    setInfo("Application submitted. You'll be able to log in once an admin approves it.");
    setTimeout(close, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={close}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold text-lg">
            {mode === "login" ? "Sign In" : "Become an Uploader"}
          </h3>
          <button onClick={close}><X size={20} className="text-muted-foreground" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button onClick={() => { setMode("login"); setError(null); setInfo(null); }}
            className={`py-2 rounded-lg text-xs font-semibold ${mode === "login" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            Login
          </button>
          <button onClick={() => { setMode("apply"); setError(null); setInfo(null); }}
            className={`py-2 rounded-lg text-xs font-semibold ${mode === "apply" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            Become Uploader
          </button>
        </div>

        {pendingApplicationMessage && mode === "login" && (
          <p className="text-destructive text-xs mb-3 bg-destructive/10 rounded-lg px-3 py-2">{pendingApplicationMessage}</p>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
          </div>

          {mode === "apply" && (
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">
                Why do you want to be an uploader? ({reason.trim().split(/\s+/).filter(Boolean).length}/50 words)
              </label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
                placeholder="Share your content ideas..."
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}
          {info && <p className="text-primary text-xs">{info}</p>}

          {mode === "login" ? (
            <>
              <button onClick={handleLogin} disabled={loading || !email || !password}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <LogIn size={16} /> {loading ? "Signing in..." : "Sign In"}
              </button>
              <button onClick={handleForgot} className="w-full text-muted-foreground text-xs text-center py-1 hover:text-primary">
                Forgot password?
              </button>
            </>
          ) : (
            <button onClick={handleApply} disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <Send size={16} /> {loading ? "Submitting..." : "Submit Application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthSheet;
