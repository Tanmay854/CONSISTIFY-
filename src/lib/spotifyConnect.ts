// Spotify Authorization Code with PKCE — browser side.
import { supabase } from "@/integrations/supabase/client";

const CLIENT_ID_STORAGE = "spotify_client_id";
const VERIFIER_KEY = "spotify_pkce_verifier";
const STATE_KEY = "spotify_oauth_state";

export const SPOTIFY_REDIRECT_PATH = "/spotify-callback";
export const SPOTIFY_SCOPES = "playlist-read-private playlist-read-collaborative user-library-read";

// Spotify CLIENT_ID is *public* — safe in browser. We surface it from an edge function once and cache it.
async function getClientId(): Promise<string> {
  const cached = sessionStorage.getItem(CLIENT_ID_STORAGE);
  if (cached) return cached;
  const { data, error } = await supabase.functions.invoke("spotify-public-config");
  if (error || !data?.client_id) throw new Error("Spotify not configured");
  sessionStorage.setItem(CLIENT_ID_STORAGE, data.client_id);
  return data.client_id;
}

function base64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string) {
  return base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
}

function randomString(len: number) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return base64url(arr.buffer);
}

export async function beginSpotifyLogin() {
  const clientId = await getClientId();
  const verifier = randomString(64);
  const challenge = await sha256(verifier);
  const state = randomString(16);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  const redirect_uri = window.location.origin + SPOTIFY_REDIRECT_PATH;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri,
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function completeSpotifyLogin(search: string) {
  const params = new URLSearchParams(search);
  const errParam = params.get("error");
  if (errParam) throw new Error(`Spotify denied access: ${errParam}`);
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!code || !state || state !== expectedState || !verifier) {
    throw new Error("Invalid Spotify callback (state mismatch). Please try connecting again.");
  }
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  const redirect_uri = window.location.origin + SPOTIFY_REDIRECT_PATH;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be signed in to connect Spotify.");
  const url = new URL(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/spotify-user`);
  url.searchParams.set("action", "exchange");
  const r = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Exchange failed (${r.status})`);
  return j;
}


export async function callSpotifyUser(action: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = new URL(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/spotify-user`);
  url.searchParams.set("action", action);
  const r = await fetch(url.toString(), {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
  if (!r.ok) throw new Error(`Spotify request failed (${r.status})`);
  return await r.json();
}
