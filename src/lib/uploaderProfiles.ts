import { supabase } from "@/integrations/supabase/client";

export interface UploaderProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const cache = new Map<string, UploaderProfile>();
const inflight = new Map<string, Promise<UploaderProfile | null>>();

export const getCachedProfile = (userId: string): UploaderProfile | undefined =>
  cache.get(userId);

export const fetchProfiles = async (userIds: string[]): Promise<Map<string, UploaderProfile>> => {
  const missing = userIds.filter((id) => id && !cache.has(id));
  if (missing.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url, bio")
      .in("user_id", missing);
    (data || []).forEach((p) => cache.set(p.user_id, p as UploaderProfile));
    // For any still missing, cache an empty stub so we don't refetch
    missing.forEach((id) => {
      if (!cache.has(id)) {
        cache.set(id, { user_id: id, username: null, display_name: null, avatar_url: null, bio: null });
      }
    });
  }
  const out = new Map<string, UploaderProfile>();
  userIds.forEach((id) => {
    const p = cache.get(id);
    if (p) out.set(id, p);
  });
  return out;
};

export const fetchProfile = async (userId: string): Promise<UploaderProfile | null> => {
  if (cache.has(userId)) return cache.get(userId)!;
  const existing = inflight.get(userId);
  if (existing) return existing;
  const p = (async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url, bio")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) cache.set(userId, data as UploaderProfile);
    return (data as UploaderProfile) || null;
  })();
  inflight.set(userId, p);
  try { return await p; } finally { inflight.delete(userId); }
};

export const updateProfileCache = (profile: UploaderProfile) => {
  cache.set(profile.user_id, profile);
};

export const displayHandle = (p: UploaderProfile | null | undefined): string =>
  p?.username || p?.display_name || "user";
