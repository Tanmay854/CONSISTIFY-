export interface QuoteFont {
  id: string;
  label: string;
  /** CSS font-family stack (local face + graceful fallback). */
  stack: string;
  weight: number;
  /** Fonts whose glyphs are outline/decorative — keep them un-bolded, no heavy shadow. */
  decorative?: boolean;
  /** Per-font max size multiplier so wide/tall faces stay balanced. */
  maxScale?: number;
  letterSpacing?: string;
  lineHeight?: number;
}

export const QUOTE_FONTS: QuoteFont[] = [
  { id: "inter", label: "Inter", stack: "'QF Inter', Inter, sans-serif", weight: 700, lineHeight: 1.22 },
  { id: "montserrat", label: "Montserrat", stack: "'QF Montserrat', Montserrat, sans-serif", weight: 700, lineHeight: 1.24 },
  { id: "poppins", label: "Poppins", stack: "'QF Poppins', Poppins, sans-serif", weight: 700, lineHeight: 1.28 },
  { id: "playfair", label: "Playfair Display", stack: "'QF Playfair Display', 'Playfair Display', serif", weight: 700, lineHeight: 1.2 },
  { id: "dmserif", label: "DM Serif Display", stack: "'QF DM Serif Display', 'Playfair Display', serif", weight: 400, lineHeight: 1.2 },
  { id: "baskerville", label: "Libre Baskerville", stack: "'QF Libre Baskerville', Georgia, serif", weight: 700, lineHeight: 1.34, maxScale: 0.9 },
  { id: "bebas", label: "Bebas Neue", stack: "'QF Bebas Neue', Impact, sans-serif", weight: 400, lineHeight: 1.02, letterSpacing: "0.01em", maxScale: 1.25 },
  { id: "oswald", label: "Oswald", stack: "'QF Oswald', Impact, sans-serif", weight: 600, lineHeight: 1.14, maxScale: 1.12 },
  { id: "raleway", label: "Raleway", stack: "'QF Raleway', Raleway, sans-serif", weight: 700, lineHeight: 1.24 },
  { id: "cormorant", label: "Cormorant Garamond", stack: "'QF Cormorant Garamond', Garamond, serif", weight: 700, lineHeight: 1.16, maxScale: 1.15 },
  { id: "bungee", label: "Bungee Outline", stack: "'QF Bungee Outline', Impact, sans-serif", weight: 400, decorative: true, lineHeight: 1.24, maxScale: 0.8 },
  { id: "majormono", label: "Major Mono Display", stack: "'QF Major Mono Display', monospace", weight: 400, decorative: true, lineHeight: 1.3, maxScale: 0.85 },
  { id: "codystar", label: "Codystar", stack: "'QF Codystar', cursive", weight: 400, decorative: true, lineHeight: 1.24, maxScale: 1.05 },
  { id: "monoton", label: "Monoton", stack: "'QF Monoton', cursive", weight: 400, decorative: true, lineHeight: 1.3, maxScale: 0.95 },
  { id: "poiret", label: "Poiret One", stack: "'QF Poiret One', cursive", weight: 400, decorative: true, lineHeight: 1.2, maxScale: 1.05 },
  { id: "josefin", label: "Josefin Sans", stack: "'QF Josefin Sans', sans-serif", weight: 600, lineHeight: 1.2 },
  { id: "barlow", label: "Barlow Condensed", stack: "'QF Barlow Condensed', sans-serif", weight: 700, lineHeight: 1.1, maxScale: 1.25 },
];

export const DEFAULT_QUOTE_FONT_ID = "playfair";

export const findQuoteFont = (id: string | null | undefined): QuoteFont =>
  QUOTE_FONTS.find((f) => f.id === id) ?? QUOTE_FONTS.find((f) => f.id === DEFAULT_QUOTE_FONT_ID)!;

/** Ask the browser to load a face so measurement uses the real metrics. */
export const loadQuoteFont = async (font: QuoteFont): Promise<void> => {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  try {
    await fonts.load(`${font.weight} 48px ${font.stack.split(",")[0]}`);
    await fonts.ready;
  } catch {
    /* fallback face is fine */
  }
};
