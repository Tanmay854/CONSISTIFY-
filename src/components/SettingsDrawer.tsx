import { useEffect, useRef, useState } from "react";
import { X, LogIn, LogOut, Shield, User, Check, Send, KeyRound, Upload, BookOpen, GraduationCap, Camera, FilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthSheet from "./AuthSheet";
import AdminPanel from "./AdminPanel";
import ApplyUploaderSheet from "./ApplyUploaderSheet";
import BooksAdminSheet from "./BooksAdminSheet";
import BooksBulkImportSheet from "./BooksBulkImportSheet";
import CoursesAdminSheet from "./CoursesAdminSheet";
import { fetchProfile, updateProfileCache, type UploaderProfile } from "@/lib/uploaderProfiles";

const CATEGORIES = ["Workout", "Study", "Motivation", "Mindfulness", "Finance", "Relationships"] as const;

const SettingsDrawer = ({ open, onClose, onOpenUpload }: { open: boolean; onClose: () => void; onOpenUpload?: () => void }) => {
  const { user, isAdmin, canUpload, signOut, loading: authLoading } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showBooksAdmin, setShowBooksAdmin] = useState(false);
  const [showBooksBulk, setShowBooksBulk] = useState(false);
  const [showCoursesAdmin, setShowCoursesAdmin] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwInfo, setPwInfo] = useState<string | null>(null);

  // Profile editor state (username / avatar / bio for uploaders + admins)
  const [profile, setProfile] = useState<UploaderProfile | null>(null);
  const [pfUsername, setPfUsername] = useState("");
  const [pfBio, setPfBio] = useState("");
  const [pfSaving, setPfSaving] = useState(false);
  const [pfMsg, setPfMsg] = useState<string | null>(null);
  const [pfErr, setPfErr] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !canUpload) { setProfile(null); return; }
    fetchProfile(user.id).then((p) => {
      if (p) {
        setProfile(p);
        setPfUsername(p.username || "");
        setPfBio(p.bio || "");
      }
    });
  }, [user, canUpload]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setPfErr(null); setPfMsg(null); setPfSaving(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("quote-images").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("quote-images").getPublicUrl(path);
      const avatar_url = pub.publicUrl;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url }).eq("user_id", user.id);
      if (dbErr) throw dbErr;
      const next = { ...(profile || { user_id: user.id, username: pfUsername, display_name: null, bio: pfBio }), avatar_url } as UploaderProfile;
      setProfile(next); updateProfileCache(next);
      setPfMsg("Photo updated.");
    } catch (e) {
      setPfErr(e instanceof Error ? e.message : "Failed to upload");
    } finally { setPfSaving(false); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const clean = pfUsername.trim().replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 24);
    if (clean.length < 2) { setPfErr("Username must be at least 2 characters (letters, digits, _ or .)"); return; }
    setPfErr(null); setPfMsg(null); setPfSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ username: clean, bio: pfBio.trim() || null })
      .eq("user_id", user.id);
    setPfSaving(false);
    if (error) {
      setPfErr(error.message.includes("profiles_username_unique") ? "That username is taken." : error.message);
      return;
    }
    setPfUsername(clean);
    const next = { ...(profile || { user_id: user.id, display_name: null, avatar_url: null }), username: clean, bio: pfBio.trim() || null } as UploaderProfile;
    setProfile(next); updateProfileCache(next);
    setPfMsg("Profile saved.");
    setTimeout(() => setPfMsg(null), 1800);
  };

  const handleChangePassword = async () => {
    setPwError(null); setPwInfo(null);
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwBusy(false);
    if (error) { setPwError(error.message); return; }
    setPwInfo("Password updated successfully.");
    setNewPw(""); setConfirmPw("");
    setTimeout(() => { setShowChangePw(false); setPwInfo(null); }, 1500);
  };


  const fetchPreferences = async () => {
    if (!user) {
      try {
        const raw = localStorage.getItem("guest_categories");
        if (raw) setSelectedCategories(JSON.parse(raw));
      } catch { }
      return;
    }
    const { data } = await supabase
      .from("user_preferences")
      .select("selected_categories")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.selected_categories) {
      setSelectedCategories(data.selected_categories);
    } else {
      try {
        const raw = localStorage.getItem("guest_categories");
        if (raw) {
          const guest = JSON.parse(raw) as string[];
          if (guest.length) {
            await supabase.from("user_preferences").insert({ user_id: user.id, selected_categories: guest });
            setSelectedCategories(guest);
          }
        }
      } catch { }
    }
  };

  const toggleCategory = async (cat: string) => {
    const updated = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];

    setSelectedCategories(updated);

    if (!user) {
      try { localStorage.setItem("guest_categories", JSON.stringify(updated)); } catch { }
      return;
    }

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
          className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-card border-r border-border animate-float-up overflow-y-auto"
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
                    {isAdmin ? "Admin" : canUpload ? "Uploader" : "Member"}
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




          {/* Public profile editor (uploaders / admins) */}
          {user && canUpload && (
            <div className="px-5 py-4 border-t border-border space-y-3">
              <p className="text-muted-foreground text-[11px] uppercase tracking-widest">Public Profile</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-1 ring-border shrink-0"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={22} className="text-muted-foreground" />
                  )}
                  <span className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1">
                    <Camera size={10} />
                  </span>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.currentTarget.value = ""; }}
                />
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Username</label>
                  <div className="flex items-center gap-1 mt-1 bg-secondary rounded-lg px-2">
                    <span className="text-muted-foreground text-sm">@</span>
                    <input
                      value={pfUsername}
                      onChange={(e) => setPfUsername(e.target.value)}
                      placeholder="username"
                      className="flex-1 bg-transparent py-2 text-sm text-foreground outline-none"
                      maxLength={24}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Bio</label>
                <textarea
                  value={pfBio}
                  onChange={(e) => setPfBio(e.target.value)}
                  rows={2}
                  maxLength={160}
                  placeholder="Short description"
                  className="w-full mt-1 bg-secondary rounded-lg p-2 text-sm text-foreground outline-none resize-none"
                />
              </div>
              {pfErr && <p className="text-destructive text-xs">{pfErr}</p>}
              {pfMsg && <p className="text-primary text-xs">{pfMsg}</p>}
              <button
                onClick={handleSaveProfile}
                disabled={pfSaving}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {pfSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          )}


          {user && canUpload && onOpenUpload && (
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={onOpenUpload}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Upload size={18} className="text-primary" />
                <span className="text-foreground text-sm font-medium">Upload Content</span>
              </button>
            </div>
          )}

          {/* Apply as uploader */}
          {user && !canUpload && (
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowApply(true)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Send size={18} className="text-primary" />
                <span className="text-foreground text-sm font-medium">Apply to be an Uploader</span>
              </button>
            </div>
          )}

          {/* Admin */}
          {user && isAdmin && (
            <div className="px-5 py-4 border-t border-border space-y-2">
              <button
                onClick={() => setShowAdmin(true)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Shield size={18} className="text-primary" />
                <span className="text-foreground text-sm font-medium">Admin Panel</span>
              </button>
              <button
                onClick={() => setShowBooksAdmin(true)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <BookOpen size={18} className="text-primary" />
                <span className="text-foreground text-sm font-medium">Manage Books</span>
              </button>
              <button
                onClick={() => setShowBooksBulk(true)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <FilePlus size={18} className="text-primary" />
                <span className="text-foreground text-sm font-medium">Bulk Import Books (PDF)</span>
              </button>
              <button
                onClick={() => setShowCoursesAdmin(true)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <GraduationCap size={18} className="text-primary" />
                <span className="text-foreground text-sm font-medium">Manage Courses</span>
              </button>
            </div>
          )}

          {/* Change password */}
          {user && (
            <div className="px-5 py-4 border-t border-border">
              {!showChangePw ? (
                <button
                  onClick={() => { setShowChangePw(true); setPwError(null); setPwInfo(null); }}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <KeyRound size={18} className="text-primary" />
                  <span className="text-foreground text-sm font-medium">Change Password</span>
                </button>
              ) : (
                <div className="space-y-3 bg-secondary/40 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-sm font-semibold">Change Password</span>
                    <button onClick={() => { setShowChangePw(false); setNewPw(""); setConfirmPw(""); setPwError(null); setPwInfo(null); }}>
                      <X size={16} className="text-muted-foreground" />
                    </button>
                  </div>
                  <input
                    type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    className="w-full bg-background text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-background text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  {pwError && <p className="text-destructive text-xs">{pwError}</p>}
                  {pwInfo && <p className="text-primary text-xs">{pwInfo}</p>}
                  <button
                    onClick={handleChangePassword}
                    disabled={pwBusy || !newPw || !confirmPw}
                    className="w-full bg-primary text-primary-foreground rounded-lg py-2 font-semibold text-sm disabled:opacity-50"
                  >
                    {pwBusy ? "Updating..." : "Update password"}
                  </button>
                </div>
              )}
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

      <AuthSheet open={showAuth} onClose={() => { setShowAuth(false); fetchPreferences(); }} />
      <AdminPanel open={showAdmin} onClose={() => setShowAdmin(false)} />
      <BooksAdminSheet open={showBooksAdmin} onClose={() => setShowBooksAdmin(false)} />
      <BooksBulkImportSheet open={showBooksBulk} onClose={() => setShowBooksBulk(false)} />
      <CoursesAdminSheet open={showCoursesAdmin} onClose={() => setShowCoursesAdmin(false)} />
      <ApplyUploaderSheet open={showApply} onClose={() => setShowApply(false)} />
    </>
  );
};

export default SettingsDrawer;
