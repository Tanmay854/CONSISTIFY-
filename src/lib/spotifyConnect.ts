// Spotify Authorization Code with PKCE — fully client-side, no Supabase auth required.
// Tokens are stored in localStorage so ANY visitor (signed in or not) can connect
// their personal Spotify account.

const CLIENT_ID_STORAGE = "spotify_client_id";
const VERIFIER_KEY = "spotify_pkce_verifier";
const STATE_KEY = "spotify_oauth_state";
const TOKENS_KEY = "spotify_tokens_v1";
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FUNCTIONS_BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
const PUBLIC_CONFIG_FN_URL = `${FUNCTIONS_BASE_URL}/spotify-public-config`;
const AUTH_FN_URL = `${FUNCTIONS_BASE_URL}/spotify-auth`;

// Spotify client IDs are public by design. This fallback keeps anonymous OAuth
// working even if the public-config function is temporarily unreachable.
const PUBLIC_SPOTIFY_CLIENT_ID_FALLBACK = "0f776876d140467a82a1c3e03ea46200";

export const SPOTIFY_REDIRECT_PATH = "/spotify-callback";
export const SPOTIFY_SCOPES = "playlist-read-private playlist-read-collaborative user-library-read";

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  scope?: string;
  display_name?: string | null;
}

export function getStoredTokens(): SpotifyTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
}

function setStoredTokens(t: SpotifyTokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
}

function setOAuthValue(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
  try { sessionStorage.setItem(key, value); } catch { /* mobile browsers can block sessionStorage during redirects */ }
}

function getOAuthValue(key: string): string | null {
  let value: string | null = null;
  try { value = localStorage.getItem(key); } catch { /* ignore */ }
  if (value) return value;
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function removeOAuthValue(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}

export function clearStoredTokens() {
  localStorage.removeItem(TOKENS_KEY);
}

export function isSpotifyConnected(): boolean {
  return !!getStoredTokens();
}

// Spotify CLIENT_ID is *public* — safe in browser. Surface it once from an edge function and cache it.
async function getClientId(): Promise<string> {
  const cached = sessionStorage.getItem(CLIENT_ID_STORAGE);
  if (cached) return cached;
  try {
    const res = await fetch(PUBLIC_CONFIG_FN_URL, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.client_id) {
      sessionStorage.setItem(CLIENT_ID_STORAGE, data.client_id);
      return data.client_id;
    }
  } catch (e) {
    console.warn("Spotify public config unavailable", e);
  }
  sessionStorage.setItem(CLIENT_ID_STORAGE, PUBLIC_SPOTIFY_CLIENT_ID_FALLBACK);
  return PUBLIC_SPOTIFY_CLIENT_ID_FALLBACK;
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
  setOAuthValue(VERIFIER_KEY, verifier);
  setOAuthValue(STATE_KEY, state);
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
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

export async function completeSpotifyLogin(search: string) {
  const params = new URLSearchParams(search);
  const errParam = params.get("error");
  if (errParam) throw new Error(`Spotify denied access: ${errParam}`);
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = getOAuthValue(STATE_KEY);
  const verifier = getOAuthValue(VERIFIER_KEY);
  if (!code || !state || state !== expectedState || !verifier) {
    throw new Error("Invalid Spotify callback (state mismatch). Please try connecting again.");
  }
  removeOAuthValue(STATE_KEY);
  removeOAuthValue(VERIFIER_KEY);
  const redirect_uri = window.location.origin + SPOTIFY_REDIRECT_PATH;

  const url = new URL(AUTH_FN_URL);
  url.searchParams.set("action", "exchange");
  const r = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j?.error || `Exchange failed (${r.status})`);

  const tokens: SpotifyTokens = {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (j.expires_in - 30) * 1000,
    scope: j.scope,
    display_name: j.display_name || null,
  };
  setStoredTokens(tokens);
  return tokens;
}

async function refreshAccessToken(): Promise<SpotifyTokens | null> {
  const cur = getStoredTokens();
  if (!cur?.refresh_token) return null;
  const url = new URL(AUTH_FN_URL);
  url.searchParams.set("action", "refresh");
  const r = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ refresh_token: cur.refresh_token }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    // Refresh failed → force re-auth.
    clearStoredTokens();
    return null;
  }
  const next: SpotifyTokens = {
    access_token: j.access_token,
    refresh_token: j.refresh_token || cur.refresh_token,
    expires_at: Date.now() + (j.expires_in - 30) * 1000,
    scope: j.scope || cur.scope,
    display_name: cur.display_name,
  };
  setStoredTokens(next);
  return next;
}

export async function getValidAccessToken(): Promise<string | null> {
  const cur = getStoredTokens();
  if (!cur) return null;
  if (cur.expires_at > Date.now()) return cur.access_token;
  const next = await refreshAccessToken();
  return next?.access_token || null;
}

// Direct Spotify Web API call from the browser, transparently refreshing tokens.
export async function spotifyApi<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  let token = await getValidAccessToken();
  if (!token) throw new Error("not connected");
  let r = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (r.status === 401) {
    const next = await refreshAccessToken();
    if (!next) throw new Error("not connected");
    token = next.access_token;
    r = await fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
    });
  }
  if (!r.ok) throw new Error(`Spotify ${path} failed (${r.status})`);
  return await r.json() as T;
}

export async function disconnectSpotify() {
  clearStoredTokens();
}
