// Public Spotify OAuth helper — does NOT require a signed-in Supabase user.
// Anonymous users connect their personal Spotify account; tokens are returned
// to the browser which stores them in localStorage.
//
// Actions (?action=...):
//   exchange  POST { code, code_verifier, redirect_uri }
//   refresh   POST { refresh_token }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
  return j as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "exchange" && req.method === "POST") {
      const { code, code_verifier, redirect_uri } = await req.json();
      if (!code || !code_verifier || !redirect_uri) {
        return json({ error: "missing fields" }, 400);
      }
      const tok = await tokenRequest(new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id: CLIENT_ID,
        code_verifier,
      }));
      // Fetch profile name (best-effort)
      let display_name: string | null = null;
      try {
        const meRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${tok.access_token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          display_name = me?.display_name || me?.id || null;
        }
      } catch (_e) { /* ignore */ }
      return json({
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        expires_in: tok.expires_in,
        scope: tok.scope,
        display_name,
      });
    }

    if (action === "refresh" && req.method === "POST") {
      const { refresh_token } = await req.json();
      if (!refresh_token) return json({ error: "missing refresh_token" }, 400);
      const tok = await tokenRequest(new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }));
      return json({
        access_token: tok.access_token,
        refresh_token: tok.refresh_token || refresh_token,
        expires_in: tok.expires_in,
        scope: tok.scope,
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
