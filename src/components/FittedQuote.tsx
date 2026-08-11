import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QuoteFont, loadQuoteFont } from "@/lib/quoteFonts";

interface Props {
  text: string;
  author?: string | null;
  font: QuoteFont;
  /** Only measure when this card is the active one (perf). */
  active?: boolean;
  /** User font-size preference, 0.7 - 1.3 (1 = auto fit). */
  scale?: number;
}

const MIN_SIZE = 12;
const MAX_SIZE = 44;
/** Never let the quote block fill the whole safe area. */
const FILL = 0.72;

/**
 * Renders a quote that always fits inside its (invisible) safe area.
 * Binary-searches the largest font size whose rendered block fits both
 * the available width and height, measured with the real selected face.
 */
const FittedQuote = ({ text, author, font, active = true, scale = 1 }: Props) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<number | null>(null);
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFontReady(false);
    loadQuoteFont(font).then(() => { if (!cancelled) setFontReady(true); });
    return () => { cancelled = true; };
  }, [font]);

  useLayoutEffect(() => {
    if (!active) return;
    const box = boxRef.current;
    const probe = measureRef.current;
    if (!box || !probe) return;

    let frame = 0;
    const fit = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w < 20 || h < 20) return;

      probe.style.width = `${w}px`;
      probe.style.fontFamily = font.stack;
      probe.style.fontWeight = String(font.weight);
      probe.style.lineHeight = String(font.lineHeight ?? 1.22);
      probe.style.letterSpacing = font.letterSpacing ?? "normal";

      const avail = h - (author ? 34 : 0);
      const budget = Math.min(avail, avail * FILL * scale);
      const cap = Math.min(MAX_SIZE * (font.maxScale ?? 1) * scale, avail * 0.22 * scale);
      let lo = MIN_SIZE;
      let hi = Math.max(MIN_SIZE, cap);
      let best = MIN_SIZE;

      const fits = (px: number) => {
        probe.style.fontSize = `${px}px`;
        return probe.scrollHeight <= budget && probe.scrollWidth <= w + 1;
      };

      if (fits(hi)) {
        best = hi;
      } else {
        for (let i = 0; i < 16 && hi - lo > 0.4; i++) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) { lo = mid; best = mid; } else { hi = mid; }
        }
      }
      setSize(Math.floor(best * 10) / 10);
    };

    frame = requestAnimationFrame(fit);
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    ro.observe(box);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [text, author, font, active, fontReady, scale]);

  const authorSize = size ? Math.max(10, Math.min(15, size * 0.3)) : 12;

  return (
    <div ref={boxRef} className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Invisible measuring probe — never painted */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
          whiteSpace: "pre-wrap",
          overflowWrap: "normal",
          wordBreak: "keep-all",
          hyphens: "none",
          textAlign: "center",
          textWrap: "balance",
        } as React.CSSProperties}
      >
        {`“${text}”`}
      </div>

      <p
        style={{
          fontFamily: font.stack,
          fontWeight: font.weight,
          fontSize: size ? `${size}px` : undefined,
          lineHeight: font.lineHeight ?? 1.22,
          letterSpacing: font.letterSpacing ?? "normal",
          opacity: size ? 1 : 0,
          textWrap: "balance",
          overflowWrap: "normal",
          wordBreak: "keep-all",
          hyphens: "none",
          transition: "font-size 180ms cubic-bezier(0.16,1,0.3,1), opacity 160ms ease-out",
          textShadow: font.decorative
            ? "0 2px 12px rgba(0,0,0,0.6)"
            : "0 2px 10px rgba(0,0,0,0.75)",
        } as React.CSSProperties}
        className="text-center text-foreground w-full"
      >
        {`“${text}”`}
      </p>

      {author && (
        <p
          className="mt-4 text-center uppercase tracking-[0.22em] text-foreground/75"
          style={{ fontSize: `${authorSize}px`, opacity: size ? 1 : 0 }}
        >
          {author}
        </p>
      )}
    </div>
  );
};

export default FittedQuote;
