// Spotify Authorization Code with PKCE — runs entirely client-side.
// No client secret needed. Tokens stored in localStorage.
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "spotify_token";
const VERIFIER_KEY = "spotify_pkce_verifier";
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

interface StoredToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  client_id: string;
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

function randomString(len = 64) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base64url(bytes).slice(0, len);
}

export async function getClientId(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("spotify-config");
  if (error || !data?.clientId) throw new Error("Spotify client ID unavailable");
  return data.clientId as string;
}

export async function beginSpotifyLogin() {
  const clientId = await getClientId();
  const verifier = randomString(64);
  const challenge = base64url(await sha256(verifier));
  localStorage.setItem(VERIFIER_KEY, verifier);
  const redirectUri = window.location.origin + "/";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state: "spotify_connect",
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function completeSpotifyLoginIfPresent(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || state !== "spotify_connect") return false;

  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) return false;
  const clientId = await getClientId();
  const redirectUri = window.location.origin + "/";

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  localStorage.removeItem(VERIFIER_KEY);
  // Clean URL
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());
  if (!res.ok) return false;
  const json = await res.json();
  storeToken({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
    client_id: clientId,
  });
  return true;
}

function storeToken(t: StoredToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

function readToken(): StoredToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function spotifyLogout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasSpotifyConnection() {
  return !!readToken();
}

export async function getSpotifyAccessToken(): Promise<string | null> {
  const t = readToken();
  if (!t) return null;
  if (t.expires_at > Date.now() + 30_000) return t.access_token;
  // refresh
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: t.refresh_token,
    client_id: t.client_id,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) { spotifyLogout(); return null; }
  const json = await res.json();
  const next: StoredToken = {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? t.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
    client_id: t.client_id,
  };
  storeToken(next);
  return next.access_token;
}
