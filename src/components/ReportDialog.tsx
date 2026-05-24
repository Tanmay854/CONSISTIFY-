import { useState } from "react";
import { X, Send, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  contentType: "video" | "music" | "photo";
  contentId: string;
  contentTitle: string;
}

const ReportDialog = ({ open, onClose, contentType, contentId, contentTitle }: ReportDialogProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const wordCount = issue.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const maxWords = 50;
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !isValidEmail(email)) { setError("Please enter a valid email"); return; }
    if (!issue.trim()) { setError("Please describe the issue"); return; }
    if (wordCount > maxWords) { setError(`Description must be ${maxWords} words or less (currently ${wordCount})`); return; }

    setLoading(true);
    try {
      const { error: insertError } = await supabase.from("reports").insert({
        user_id: user?.id || null,
        content_type: contentType,
        content_id: contentId,
        issue_description: issue.trim(),
        reporter_email: email.trim(),
      });
      if (insertError) {
        setError(insertError.message);
      } else {
        setSuccess(true);
        setTimeout(() => { onClose(); setIssue(""); setSuccess(false); }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-destructive" />
            <h3 className="text-foreground font-semibold text-lg">Report Issue</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <p className="text-muted-foreground text-sm mb-4">
          <span className="font-medium text-foreground">{contentTitle}</span> ({contentType})
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-2 block">Your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-secondary text-foreground rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-2 block">
              What's the issue? ({wordCount}/{maxWords})
            </label>
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="Describe the problem (max 50 words)..."
              rows={4}
              className="w-full bg-secondary text-foreground rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            {wordCount > maxWords && <p className="text-destructive text-xs mt-1">Description too long</p>}
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}
          {success && <p className="text-primary text-xs">✓ Report submitted successfully</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !issue.trim() || wordCount > maxWords || !email.trim()}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={14} />
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDialog;
