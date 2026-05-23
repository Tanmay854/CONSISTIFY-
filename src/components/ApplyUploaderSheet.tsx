import { useState } from "react";
import { X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ApplyUploaderSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open || !user) return null;

  const wordCount = reason.trim().split(/\s+/).filter(w => w.length > 0).length;
  const maxWords = 50;

  const handleSubmit = async () => {
    setError(null);

    if (!reason.trim()) {
      setError("Please tell us why you want to become an uploader");
      return;
    }

    if (wordCount > maxWords) {
      setError(`Description must be ${maxWords} words or less (currently ${wordCount})`);
      return;
    }

    setLoading(true);

    try {
      // Check if application already exists
      const { data: existing } = await supabase
        .from("uploader_applications")
        .select("id")
        .eq("user_id", user.id);

      if (existing && existing.length > 0) {
        setError("You already have a pending application");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("uploader_applications").insert({
        user_id: user.id,
        email: user.email,
        reason: reason.trim(),
        status: "pending",
      });

      if (insertError) {
        setError(insertError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setReason("");
          setSuccess(false);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-float-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-foreground font-semibold text-lg">Become an Uploader</h3>
          <button onClick={onClose}><X size={20} className="text-muted-foreground" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground text-sm mb-3">Tell us why you want to become an uploader. Admins will review your application.</p>
          </div>

          <div>
            <label className="text-muted-foreground text-xs uppercase tracking-wider mb-2 block">
              Why do you want to upload? ({wordCount}/{maxWords} words)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Share your content ideas and vision..."
              rows={5}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            {wordCount > maxWords && (
              <p className="text-destructive text-xs mt-1">Description too long by {wordCount - maxWords} word(s)</p>
            )}
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}
          {success && <p className="text-primary text-xs">✓ Application submitted! Admins will review it soon.</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim() || wordCount > maxWords}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={16} />
            {loading ? "Submitting..." : "Submit Application"}
          </button>

          <button
            onClick={onClose}
            className="w-full text-muted-foreground text-xs text-center py-2 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplyUploaderSheet;
