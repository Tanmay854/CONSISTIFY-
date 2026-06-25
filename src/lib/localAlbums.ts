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

// Read a File as a compressed data URL so cover images persist locally without
// blowing the ~5 MB localStorage quota (raw phone photos are often 4-12 MB).
export function fileToDataUrl(file: File, maxDim = 512, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas unsupported");
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}
