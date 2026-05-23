import { useState, useEffect, useContext, createContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "admin" | "uploader" | "user";

const SUPER_ADMIN_EMAIL = "tanmaynimbalkar854@gmail.com";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canUpload: boolean;
  pendingApplicationMessage: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [pendingApplicationMessage, setPendingApplicationMessage] = useState<string | null>(null);

  const enforceAccess = useCallback(async (u: User) => {
    const isSuper = u.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.id);
    const rs = (roleRows || []).map(r => r.role as AppRole);
    setRoles(rs);

    // Super-admin or anyone with a role (admin/uploader) is allowed in.
    if (isSuper || rs.length > 0) {
      setPendingApplicationMessage(null);
      return;
    }

    // No role and not super-admin → not authorised. Check application for a tailored message.
    const { data: apps } = await supabase
      .from("uploader_applications")
      .select("status")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const app = apps?.[0];
    let msg = "You are not authorised to log in. Submit an uploader application and wait for admin approval.";
    if (app?.status === "pending") {
      msg = "You are not authorised yet — your application is awaiting admin approval.";
    } else if (app?.status === "rejected") {
      msg = "You are not authorised — your application was rejected by an admin.";
    }
    setPendingApplicationMessage(msg);
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => enforceAccess(session.user), 0);
      } else {
        setRoles([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) enforceAccess(session.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [enforceAccess]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setPendingApplicationMessage(null);
  };

  const isAdmin = roles.includes("admin");
  const isSuperAdmin = !!user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
  const canUpload = isAdmin || roles.includes("uploader");

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, isAdmin, isSuperAdmin, canUpload, pendingApplicationMessage, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
