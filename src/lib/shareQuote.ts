/**
 * Renders a quote over its background photo into a 1080x1920 PNG and hands it
 * to the native share sheet (Instagram / WhatsApp / anything installed).
 * Falls back to a download + WhatsApp text link when file sharing isn't available.
 */

const W = 1080;
const H = 1920;

const loadImage = async (url: string): Promise<HTMLImageElement | null> => {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = objUrl;
    });
    URL.revokeObjectURL(objUrl);
    return img;
  } catch {
    return null;
  }
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
};

export const renderQuoteImage = async (
  quote: string,
  author: string | null,
  backgroundUrl: string | null,
): Promise<Blob | null> => {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  if (backgroundUrl) {
    const img = await loadImage(backgroundUrl);
    if (img) {
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
  }

  // Readability scrim
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const maxWidth = W - 160;
  let fontSize = 78;
  let lines: string[] = [];
  do {
    ctx.font = `600 ${fontSize}px "Playfair Display", Georgia, serif`;
    lines = wrapText(ctx, `“${quote}”`, maxWidth);
    if (lines.length * fontSize * 1.35 <= H * 0.6) break;
    fontSize -= 4;
  } while (fontSize > 34);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 18;
  const lineHeight = fontSize * 1.35;
  let y = H / 2 - (lines.length - 1) * lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += lineHeight;
  }

  if (author) {
    ctx.font = `400 40px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(`— ${author}`, W / 2, y + 40);
  }

  ctx.shadowBlur = 0;

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });

/** Native (Capacitor) share: write the PNG to cache, then open the OS share sheet. */
const shareNative = async (blob: Blob, text: string): Promise<boolean> => {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return false;

    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");

    const path = `quote-${Date.now()}.png`;
    const data = await blobToBase64(blob);
    await Filesystem.writeFile({ path, data, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });

    await Share.share({ text, files: [uri], dialogTitle: "Share quote" });
    return true;
  } catch {
    return false;
  }
};

export const shareQuote = async (
  quote: string,
  author: string | null,
  backgroundUrl: string | null,
): Promise<"shared" | "downloaded" | "failed"> => {
  const blob = await renderQuoteImage(quote, author, backgroundUrl);
  if (!blob) return "failed";
  const file = new File([blob], "quote.png", { type: "image/png" });
  const text = author ? `"${quote}" — ${author}` : `"${quote}"`;

  // Android/iOS WebView has no navigator.share and ignores <a download>, so the
  // native share sheet has to go through Capacitor first.
  if (await shareNative(blob, text)) return "shared";

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch {
      return "failed";
    }
  }

  if (nav.share) {
    try {
      await nav.share({ text });
      return "shared";
    } catch {
      return "failed";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quote.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
};


export const shareQuoteToWhatsApp = (quote: string, author: string | null) => {
  const text = author ? `"${quote}" — ${author}` : `"${quote}"`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
};
