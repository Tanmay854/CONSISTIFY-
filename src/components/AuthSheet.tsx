import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { X, LogIn, UserPlus, Send } from "lucide-react";

type Step = "auth" | "apply";

const AuthSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<Step>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Application step
  const [reason, setReason] = useState("");
  const [requestedRole, setRequestedRole] = useState<"uploader" | "admin">("uploader");

  if (!open) return null;

  const reset = () => { setEmail(""); setPassword(""); setError(null); setInfo(null); setReason(""); setStep("auth"); setRequestedRole("uploader"); };
  const close = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    setError(null); setInfo(null); setLoading(true);
    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (mode === "signup") {
      // Show the apply step right after successful signup
      setStep("apply");
    } else {
      close();
    }
  };

  const handleForgot = async () => {
    setError(null); setInfo(null);
    if (!email) { setError("Enter your email first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setInfo("Password reset link sent. Check your inbox.");
  };

  const submitApplication = async () => {
    setLoading(true); setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Please sign in again."); setLoading(false); return; }
    if (!reason.trim()) { setError("Please tell us why."); setLoading(false); return; }
    const { error } = await supabase.from("uploader_applications").insert({
      user_id: user.id,
      email: user.email,
      reason: reason.trim(),
      requested_role: requestedRole,
    });
    setLoading(false);
    if (error) setError(error.message);
    else { setInfo("Application submitted. Admins will review it."); setTimeout(close, 1200); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={close}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-foreground font-semibold text-lg">
            {step === "apply" ? "Apply for upload access" : mode === "login" ? "Sign In" : "Create Account"}
          </h3>
          <button onClick={close}><X size={20} className="text-muted-foreground" /></button>
        </div>

        {step === "auth" && (
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

            {error && <p className="text-destructive text-xs">{error}</p>}
            {info && <p className="text-primary text-xs">{info}</p>}

            <button onClick={handleSubmit} disabled={loading || !email || !password}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
            </button>

            {mode === "login" && (
              <button onClick={handleForgot} className="w-full text-muted-foreground text-xs text-center py-1 hover:text-primary">
                Forgot password?
              </button>
            )}

            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setInfo(null); }}
              className="w-full text-muted-foreground text-xs text-center py-2">
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        )}

        {step === "apply" && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs">Account created. Want to upload content? Apply to become an uploader or admin — the super-admin reviews each application.</p>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Role</label>
              <div className="flex gap-2">
                <button onClick={() => setRequestedRole("uploader")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium ${requestedRole === "uploader" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Uploader</button>
                <button onClick={() => setRequestedRole("admin")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium ${requestedRole === "admin" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Admin</button>
              </div>
            </div>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">Why?</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Tell us about your content..."
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
            {info && <p className="text-primary text-xs">{info}</p>}
            <button onClick={submitApplication} disabled={loading || !reason.trim()}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <Send size={14} /> {loading ? "Submitting..." : "Submit application"}
            </button>
            <button onClick={close} className="w-full text-muted-foreground text-xs text-center py-2">Skip for now</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthSheet;
