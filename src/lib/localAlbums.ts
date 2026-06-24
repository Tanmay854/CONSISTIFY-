// Local-device album storage so any visitor (no sign-in required) can create albums.
// Data lives in localStorage and never leaves the device.

export interface LocalAlbum {
  id: string;
  name: string;
  cover_url: string | null;
  created_at: number;
}

export interface LocalAlbumTrack {
  id: string;
  album_id: string;
  spotify_track_id: string;
  name: string;
  artist: string;
  image: string | null;
  uri: string;
  position: number;
}

const ALBUMS_KEY = "local_albums_v1";
const TRACKS_KEY = "local_album_tracks_v1";

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};

export function listAlbums(): LocalAlbum[] {
  return readJSON<LocalAlbum[]>(ALBUMS_KEY, []).sort((a, b) => b.created_at - a.created_at);
}

export function createAlbum(name: string, cover_url: string | null): LocalAlbum {
  const album: LocalAlbum = { id: uid(), name, cover_url, created_at: Date.now() };
  const all = readJSON<LocalAlbum[]>(ALBUMS_KEY, []);
  all.push(album);
  writeJSON(ALBUMS_KEY, all);
  return album;
}

export function updateAlbum(id: string, patch: Partial<Pick<LocalAlbum, "name" | "cover_url">>): void {
  const all = readJSON<LocalAlbum[]>(ALBUMS_KEY, []);
  const i = all.findIndex((a) => a.id === id);
  if (i === -1) return;
  all[i] = { ...all[i], ...patch };
  writeJSON(ALBUMS_KEY, all);
}

export function deleteAlbum(id: string): void {
  writeJSON(ALBUMS_KEY, readJSON<LocalAlbum[]>(ALBUMS_KEY, []).filter((a) => a.id !== id));
  writeJSON(TRACKS_KEY, readJSON<LocalAlbumTrack[]>(TRACKS_KEY, []).filter((t) => t.album_id !== id));
}

export function listTracks(album_id: string): LocalAlbumTrack[] {
  return readJSON<LocalAlbumTrack[]>(TRACKS_KEY, [])
    .filter((t) => t.album_id === album_id)
    .sort((a, b) => a.position - b.position);
}

export function addTrack(album_id: string, t: Omit<LocalAlbumTrack, "id" | "album_id" | "position">): LocalAlbumTrack | null {
  const all = readJSON<LocalAlbumTrack[]>(TRACKS_KEY, []);
  if (all.some((x) => x.album_id === album_id && x.spotify_track_id === t.spotify_track_id)) return null;
  const position = all.filter((x) => x.album_id === album_id).length;
  const track: LocalAlbumTrack = { ...t, id: uid(), album_id, position };
  all.push(track);
  writeJSON(TRACKS_KEY, all);
  return track;
}

export function removeTrack(id: string): void {
  writeJSON(TRACKS_KEY, readJSON<LocalAlbumTrack[]>(TRACKS_KEY, []).filter((t) => t.id !== id));
}

// Read a File as a data URL so cover images persist locally without uploads.
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
