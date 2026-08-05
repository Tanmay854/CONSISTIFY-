import { extractPdfText } from "@/lib/parseBookPdf";
import { QUOTE_CATEGORIES } from "@/lib/quoteTopics";

export interface ParsedQuote {
  text: string;
  category: string;
  subcategory: string;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const CAT_BY_LABEL = new Map(QUOTE_CATEGORIES.map((c) => [norm(c.label), c.id]));
const SUB_BY_LABEL = new Map<string, { cat: string; sub: string }>();
QUOTE_CATEGORIES.forEach((c) =>
  c.subs.forEach((s) => SUB_BY_LABEL.set(norm(s.label), { cat: c.id, sub: s.id }))
);

/**
 * Parses a topic quote PDF shaped like:
 *   1. Mental Health
 *   Stress
 *   1. <quote>
 *   2. <quote>
 *   Anxiety
 *   11. <quote> ...
 * Category/subcategory headings are matched against the known taxonomy, so
 * numbering restarts, page headers and repeated lines are all tolerated.
 */
export function parseQuoteText(raw: string): ParsedQuote[] {
  const out: ParsedQuote[] = [];
  const seen = new Set<string>();
  let cat: string | null = null;
  let sub: string | null = null;

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.replace(/[*_#]/g, "").replace(/\s+/g, " ").trim();
    if (!line) continue;

    const headingCandidate = line.replace(/^\d+[.)]\s*/, "");
    const asCat = CAT_BY_LABEL.get(norm(headingCandidate));
    if (asCat && headingCandidate.length < 45) {
      cat = asCat;
      sub = null;
      continue;
    }
    const asSub = SUB_BY_LABEL.get(norm(headingCandidate));
    if (asSub && headingCandidate.length < 45) {
      cat = asSub.cat;
      sub = asSub.sub;
      continue;
    }

    const m = line.match(/^(\d+)[.)]\s+(.{6,})$/);
    if (!m || !cat || !sub) continue;
    const text = m[2].replace(/^["“]|["”]$/g, "").trim();
    const key = `${cat}|${sub}|${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, category: cat, subcategory: sub });
  }
  return out;
}

export async function parseQuotePdf(file: File): Promise<ParsedQuote[]> {
  const buf = await file.arrayBuffer();
  const text = await extractPdfText(buf);
  return parseQuoteText(text);
}
