/**
 * Personal wallpapers for the Quotes tab.
 *
 * Anonymous users can add up to 5 of their own portrait photos. They live in
 * localStorage on the device only, so they are never shown to anyone else.
 */
export interface LocalWallpaper {
  id: string;
  image_url: string;
  name: string | null;
}

const KEY = "my_quote_wallpapers";
export const MAX_LOCAL_WALLPAPERS = 5;

export const loadLocalWallpapers = (): LocalWallpaper[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LocalWallpaper[]) : [];
  } catch {
    return [];
  }
};

const save = (list: LocalWallpaper[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota — ignore */
  }
};

export const removeLocalWallpaper = (id: string): LocalWallpaper[] => {
  const next = loadLocalWallpapers().filter((w) => w.id !== id);
  save(next);
  return next;
};

/** Downscale to a portrait 9:16 frame so photos stay small and consistent. */
const toPortraitDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const W = 810;
      const H = 1440;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("no canvas")); return; }
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });

/** Adds files (respecting the 5 photo cap) and returns the new list. */
export const addLocalWallpapers = async (files: File[]): Promise<LocalWallpaper[]> => {
  const current = loadLocalWallpapers();
  const room = MAX_LOCAL_WALLPAPERS - current.length;
  if (room <= 0) return current;
  const next = [...current];
  for (const file of files.slice(0, room)) {
    try {
      next.push({
        id: `local-${crypto.randomUUID()}`,
        image_url: await toPortraitDataUrl(file),
        name: file.name,
      });
    } catch {
      /* skip unreadable file */
    }
  }
  save(next);
  return next;
};
