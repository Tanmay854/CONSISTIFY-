// Robust parser for varied book-summary PDFs used in bulk import.
// Handles:
//   - Titles with —, –, - separators (or on their own line, or wrapped across 2 lines)
//   - Author lines starting with "By ", "By:", "— <Author>", or missing entirely
//   - Page markers: "Page 1:", "Page 1 —", "Page 1 -", "Page 1." etc.
//   - Emoji-prefixed quality labels (🟢🔵🟠🔴) or plain labels
//   - Quality labels at start OR end of options, wrapped in *()*, () or bare
//   - Missing metadata (author, cover, amazon) — never blocks import

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.js?url";

(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;

import type { QuizQuestion } from "@/lib/bookCategories";

export type ParsedBook = {
  title: string;
  author: string;
  summary_page_titles: string[];
  summary_pages: string[];
  quiz_questions: QuizQuestion[];
  warnings: string[];
};

export async function extractPdfText(file: ArrayBuffer): Promise<string> {
  // Use isEvalSupported:false and disableStream/Range for maximum WebView compatibility.
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(file),
    disableStream: true,
    disableAutoFetch: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const chunks: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    // Always use getTextContent (returns a Promise) — avoids ReadableStream code paths
    // that crash in older iOS/Android WebViews.
    const tc = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    for (const item of tc.items as Array<{ str: string; transform: number[] }>) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (line.trim()) chunks.push(line);
        line = "";
      }
      line += (line && !line.endsWith(" ") && !item.str.startsWith(" ") ? " " : "") + item.str;
      lastY = y;
    }
    if (line.trim()) chunks.push(line);
    chunks.push("");
  }
  return chunks.join("\n");
}

// Strip markdown/emoji/decorative marks so regex can match content directly.
function normalize(s: string): string {
  return s
    // Strip common quality emojis
    .replace(/[🟢🔵🟠🔴🟡🟣⚫⚪🟤]/g, " ")
    // Strip markdown emphasis and headings
    .replace(/\*+/g, " ")
    .replace(/^#+\s*/gm, "")
    // Non-breaking spaces
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Detect quality label anywhere in a chunk of text.
function detectQuality(text: string): "Excellent" | "Good" | "Not Truly Correct" | "Wrong" | null {
  if (/\bexcellent\b/i.test(text)) return "Excellent";
  if (/\bnot\s+truly\s+correct\b/i.test(text)) return "Not Truly Correct";
  if (/\bgood\b/i.test(text)) return "Good";
  if (/\bwrong\b/i.test(text)) return "Wrong";
  return null;
}

export function parseBookText(raw: string): ParsedBook {
  const warnings: string[] = [];
  const norm = raw.replace(/\r/g, "").replace(/\u00A0/g, " ");
  const lines = norm
    .split("\n")
    .map((l) => normalize(l))
    .filter((l) => l.length > 0);

  // ---------- Title ----------
  // Take first 1-3 non-decorative lines; join them if the first ends with a dash
  // (title wrapped across lines) or is short. Then split on em/en/hyphen separator.
  let title = "";
  const skipRe = /^(a\s+story|storytelling|inspired|based on|summary|by\s+)/i;
  const titleLines: string[] = [];
  for (const l of lines.slice(0, 8)) {
    if (skipRe.test(l)) break;
    if (/^page\s+\d/i.test(l)) break;
    titleLines.push(l);
    if (titleLines.length >= 2) break;
  }
  if (titleLines.length) {
    // If first line ends with dash, it's a wrapped title.
    const joined = titleLines[0].match(/[—–-]\s*$/) && titleLines[1]
      ? `${titleLines[0]} ${titleLines[1]}`
      : titleLines[0];
    title = (joined.split(/\s[—–-]\s/)[0] || joined).trim();
  }
  if (!title && lines[0]) title = lines[0];

  // ---------- Author ----------
  let author = "";
  for (const l of lines.slice(0, 25)) {
    // "By John Doe", "By: John Doe", "— John C. Maxwell"
    const m1 = l.match(/^\s*(?:by[:\s]+|—\s*|–\s*|-\s*)([A-Z][A-Za-z .'’\-]{1,60})(?:\s*[\(,]|$)/);
    if (m1) { author = m1[1].trim().replace(/[.,;:]+$/, ""); break; }
    // In-line "By John Doe"
    const m2 = l.match(/\bBy\s+([A-Z][A-Za-z .'’\-]{1,60}?)(?:\s*[\(,]|\s+—|$)/);
    if (m2) { author = m2[1].trim().replace(/[.,;:]+$/, ""); break; }
  }
  // Try to extract author from title if it contains " — " with a proper name after
  if (!author && title) {
    const first = lines[0] || "";
    const parts = first.split(/\s[—–-]\s/);
    if (parts.length >= 2 && /^[A-Z][A-Za-z .'’\-]+$/.test(parts[parts.length - 1].trim())) {
      author = parts[parts.length - 1].trim();
    }
  }
  if (!author) warnings.push("Author not found");
  if (!title) warnings.push("Title not found");

  // Rejoin cleaned text for downstream regex
  const cleaned = lines.join("\n");

  // ---------- Quiz boundary ----------
  const quizMatch = cleaned.match(/(?:^|\n)[^\n]{0,80}?(?:multiple[-\s]choice|daily[-\s]life\s+quiz|quiz|questions?)[^\n]{0,80}/i);
  // Find real quiz start = where first "1." followed by A) appears
  const firstQAt = cleaned.search(/(?:^|\n)\s*1[\.\)]\s+[^\n]{0,300}\n?[^\n]{0,300}[AaＡ][\.\)]/);
  const quizIdx = firstQAt >= 0 ? firstQAt : (quizMatch ? quizMatch.index! : -1);
  const body = quizIdx >= 0 ? cleaned.slice(0, quizIdx) : cleaned;

  // ---------- Pages ----------
  const pageTitles = Array.from({ length: 10 }, () => "");
  const pageContents = Array.from({ length: 10 }, () => "");
  // Accept ":", "—", "–", "-", "." after page number
  const pageRe = /(?:^|\n)\s*Page\s+(\d{1,2})\s*[:\-–—.]\s*([^\n]+)/gi;
  const markers: Array<{ num: number; title: string; contentStart: number; rawStart: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = pageRe.exec(body))) {
    markers.push({ num: parseInt(m[1], 10), title: m[2].trim(), contentStart: m.index + m[0].length, rawStart: m.index });
  }
  for (let i = 0; i < markers.length; i++) {
    const mk = markers[i];
    if (mk.num < 1 || mk.num > 10) continue;
    const end = i + 1 < markers.length ? markers[i + 1].rawStart : body.length;
    const content = body.slice(mk.contentStart, end).replace(/\s+/g, " ").trim();
    pageTitles[mk.num - 1] = mk.title;
    pageContents[mk.num - 1] = content;
  }
  const missing = pageTitles.map((_, i) => i + 1).filter((n) => !pageContents[n - 1]);
  if (missing.length) warnings.push(`Missing pages: ${missing.join(", ")}`);

  // ---------- Quiz questions ----------
  const quiz: QuizQuestion[] = [];
  if (quizIdx >= 0) {
    const qSection = cleaned.slice(quizIdx).replace(/\s+/g, " ");
    // Question markers: " N. " or " N) " (1-3 digits) whose next ~2000 chars contain option A
    const qRe = /(?:^|[\s])(\d{1,3})[\.\)]\s+/g;
    const qStarts: number[] = [];
    let qm: RegExpExecArray | null;
    while ((qm = qRe.exec(qSection))) {
      const n = parseInt(qm[1], 10);
      if (n < 1 || n > 30) continue;
      const look = qSection.slice(qm.index, qm.index + 2500);
      if (/\s[Aa][\.\)]\s/.test(look)) {
        qStarts.push(qm.index + qm[0].length);
      }
    }
    // Option marker: " A. " or " A) " optionally followed by "(Excellent)"/"Excellent" label
    const optRe = /\s([A-D])[\.\)]\s+/g;
    for (let i = 0; i < qStarts.length; i++) {
      const start = qStarts[i];
      const end = i + 1 < qStarts.length ? qStarts[i + 1] : qSection.length;
      const chunk = qSection.slice(start, end);
      optRe.lastIndex = 0;
      const opts: Array<{ letter: string; start: number; end: number }> = [];
      let om: RegExpExecArray | null;
      while ((om = optRe.exec(chunk))) {
        opts.push({ letter: om[1].toUpperCase(), start: om.index, end: om.index + om[0].length });
      }
      if (opts.length < 4) continue;
      // Keep first ABCD occurrences in order
      const seen = new Set<string>();
      const four: typeof opts = [];
      for (const o of opts) {
        if (!seen.has(o.letter) && "ABCD".includes(o.letter)) {
          seen.add(o.letter);
          four.push(o);
          if (four.length === 4) break;
        }
      }
      if (four.length < 4) continue;

      const question = chunk.slice(0, four[0].start).trim().replace(/\s+/g, " ").replace(/\?\s*$/, "?");
      const options: [string, string, string, string] = ["", "", "", ""];
      const labels: [string, string, string, string] = ["", "", "", ""];
      for (let k = 0; k < 4; k++) {
        const oo = four[k];
        const eEnd = k + 1 < four.length ? four[k + 1].start : chunk.length;
        const idx = "ABCD".indexOf(oo.letter);
        if (idx < 0) continue;
        let optText = chunk.slice(oo.end, eEnd).trim().replace(/\s+/g, " ");
        // Strip surrounding parens/dashes around a quality tag at either end
        optText = optText.replace(/^\(?\s*(Excellent|Good|Not Truly Correct|Wrong)\s*\)?\s*[—\-–:]*\s*/i, (_m, tag) => {
          return `__Q:${tag}__ `;
        });
        // Detect quality label in-place (start or end)
        const q = detectQuality(optText);
        // Remove marker tag we injected
        optText = optText.replace(/__Q:[^_]+__\s*/, "").trim();
        // Trailing "(Excellent)" style
        optText = optText.replace(/\s*\(?\s*(Excellent|Good|Not Truly Correct|Wrong)\s*\)?\s*$/i, "").trim();
        options[idx] = optText;
        labels[idx] = q || "";
      }
      if (options.some((o) => !o)) continue;
      const correctIdx = labels.findIndex((l) => /excellent/i.test(l));
      quiz.push({
        q: question,
        options,
        correct: (correctIdx >= 0 ? correctIdx : 0) as 0 | 1 | 2 | 3,
        option_explanations: labels,
      });
    }
  }
  if (quiz.length < 10) warnings.push(`Only ${quiz.length} quiz questions parsed`);

  return { title, author, summary_page_titles: pageTitles, summary_pages: pageContents, quiz_questions: quiz, warnings };
}

export async function parseBookPdf(file: ArrayBuffer): Promise<ParsedBook> {
  const text = await extractPdfText(file);
  return parseBookText(text);
}
