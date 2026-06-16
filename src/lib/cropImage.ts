// Center-crop an image File to a target aspect ratio.
// Returns the original file when aspect is "original".
export type PhotoAspect = "original" | "9:16" | "1:1" | "4:5";

const ratioFor = (a: PhotoAspect): number | null => {
  if (a === "9:16") return 9 / 16;
  if (a === "1:1") return 1;
  if (a === "4:5") return 4 / 5;
  return null;
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

export async function cropImageToAspect(file: File, aspect: PhotoAspect): Promise<File> {
  const target = ratioFor(aspect);
  if (target == null) return file;

  const img = await loadImage(file);
  const srcRatio = img.width / img.height;

  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (srcRatio > target) {
    // image too wide — crop sides
    sw = Math.round(img.height * target);
    sx = Math.round((img.width - sw) / 2);
  } else if (srcRatio < target) {
    // image too tall — crop top/bottom
    sh = Math.round(img.width / target);
    sy = Math.round((img.height - sh) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const mime = file.type.startsWith("image/") ? file.type : "image/jpeg";
  const quality = mime === "image/jpeg" ? 0.92 : undefined;
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, mime, quality));
  if (!blob) return file;
  return new File([blob], file.name, { type: mime });
}
