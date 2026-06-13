// Spotify user-OAuth helper.
// Actions (POST JSON body, except where noted):
//   exchange      { code, code_verifier, redirect_uri }       -> stores tokens, returns { connected: true, display_name }
//   disconnect    {}                                          -> removes tokens
//   me-playlists  GET                                          -> { items: [...] }
//   me-liked      GET                                          -> { items: [tracks...] }
// Requires Authorization: Bearer <supabase user jwt>
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await client.auth.getUser();
  return data.user;
}

async function tokenRequest(body: URLSearchParams) {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
    },
    body,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.error || `Token error ${r.status}`);
  return j as { access_token: string; refresh_token?: string; expires_in: number; scope: string };
}

async function getValidAccessToken(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: row, error } = await admin.from("spotify_connections")
    .select("*").eq("user_id", userId).maybeSingle();
  if (error || !row) return null;
  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt > Date.now() + 30_000) return row.access_token as string;
  // Refresh
  const refreshed = await tokenRequest(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
  }));
  const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await admin.from("spotify_connections").update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || row.refresh_token,
    expires_at: newExpires,
    scope: refreshed.scope || row.scope,
  }).eq("user_id", userId);
  return refreshed.access_token;
}

async function sp(path: string, token: string) {
  const r = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    console.warn(`Spotify ${path} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
    return null;
  }
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "exchange" && req.method === "POST") {
      const { code, code_verifier, redirect_uri } = await req.json();
      if (!code || !code_verifier || !redirect_uri) return json({ error: "missing fields" }, 400);
      const tok = await tokenRequest(new URLSearchParams({
        grant_type: "authorization_code",
        code, redirect_uri, client_id: CLIENT_ID, code_verifier,
      }));
      const me = await sp("/me", tok.access_token);
      const expires_at = new Date(Date.now() + tok.expires_in * 1000).toISOString();
      await admin.from("spotify_connections").upsert({
        user_id: user.id,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token!,
        expires_at, scope: tok.scope || "",
        spotify_user_id: me?.id || null,
        display_name: me?.display_name || null,
      });
      return json({ connected: true, display_name: me?.display_name || null });
    }

    if (action === "disconnect" && req.method === "POST") {
      await admin.from("spotify_connections").delete().eq("user_id", user.id);
      return json({ connected: false });
    }

    if (action === "me-playlists") {
      const token = await getValidAccessToken(admin, user.id);
      if (!token) return json({ error: "not connected" }, 400);
      const data = await sp("/me/playlists?limit=50", token);
      return json({
        items: (data?.items || []).filter(Boolean).map((p: any) => ({
          id: p.id, name: p.name,
          image: p.images?.[0]?.url || null,
          uri: p.uri,
          tracks: p.tracks?.total ?? 0,
        })),
      });
    }

    if (action === "me-liked") {
      const token = await getValidAccessToken(admin, user.id);
      if (!token) return json({ error: "not connected" }, 400);
      const data = await sp("/me/tracks?limit=50", token);
      return json({
        items: (data?.items || []).filter((x: any) => x?.track).map((x: any) => {
          const t = x.track;
          return {
            id: t.id, name: t.name,
            artist: t.artists?.map((a: any) => a.name).join(", ") || "",
            image: t.album?.images?.[0]?.url || null,
            duration_ms: t.duration_ms, uri: t.uri,
          };
        }),
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
