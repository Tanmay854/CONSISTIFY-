import { useState, useEffect, useCallback } from "react";
import { X, LogIn, LogOut, Shield, User, Check, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthSheet from "./AuthSheet";
import AdminPanel from "./AdminPanel";
import ApplyUploaderSheet from "./ApplyUploaderSheet";

const CATEGORIES = ["Workout", "Study", "Motivation", "Mindfulness", "Finance", "Relationships"] as const;

const SettingsDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user, isAdmin, canUpload, signOut, loading: authLoading } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_preferences")
      .select("selected_categories")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.selected_categories) {
      setSelectedCategories(data.selected_categories);
    }
  }, [user]);

  useEffect(() => {
    if (open && user) fetchPreferences();
  }, [open, user, fetchPreferences]);

  const toggleCategory = async (cat: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const updated = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];

    setSelectedCategories(updated);
    setSaving(true);

    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_preferences")
        .update({ selected_categories: updated })
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("user_preferences")
        .insert({ user_id: user.id, selected_categories: updated });
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onClose}>
        <div
          className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-card border-l border-border animate-float-up overflow-y-auto"
          style={{ animationDuration: "0.3s" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-border">
            <h2 className="text-foreground font-bold text-lg">Settings</h2>
            <button onClick={onClose}>
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* User info */}
          <div className="px-5 py-4 border-b border-border">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{user.email}</p>
                  <p className="text-muted-foreground text-xs">
                    {isAdmin ? "Admin" : "Member"}
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="w-full flex items-center gap-3 py-2"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <LogIn size={18} className="text-foreground" />
                </div>
                <span className="text-foreground text-sm font-medium">Sign in to save preferences</span>
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="px-5 py-5">
            <h3 className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-3">
              Your Interests
            </h3>
            <p className="text-muted-foreground text-xs mb-4">
              Select categories to personalize your feed
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`relative px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {cat}
                    {isSelected && (
                      <Check size={14} className="absolute top-1.5 right-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
            {saving && (
              <p className="text-muted-foreground text-[10px] mt-2 text-center">Saving...</p>
            )}
          </div>

          {/* Admin */}
          {user && isAdmin && (
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowAdmin(true)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Shield size={18} className="text-primary" />
                <span className="text-foreground text-sm font-medium">Admin Panel</span>
              </button>
            </div>
          )}

          {/* Sign out */}
          {user && (
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={async () => { await signOut(); onClose(); }}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <LogOut size={18} className="text-muted-foreground" />
                <span className="text-foreground text-sm font-medium">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <AuthSheet open={showAuth} onClose={() => setShowAuth(false)} />
      <AdminPanel open={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
};

export default SettingsDrawer;
