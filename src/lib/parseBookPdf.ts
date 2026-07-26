// Robust parser for varied book-summary PDFs used in bulk import.
//
// Supports TWO major PDF formats:
//
// FORMAT A (new — label-based options):
//   Book Title: <title>   Author: <author>
//   [PAGE 2]
//   Summary - Part 1: <section title>
//   <content...>
//   [PAGE 3] ... etc.
//   [PAGE 12]
//   Question 1: <topic> (Ancient Philosophy)
//   (Testing the ...)
//   <the actual question the user reads>
//   Options:
//   Excellent: <option text>
//   Good: <option text>
//   Not Truly Correct: <option text>
//   Wrong: <option text>
//   Explanation: <...>
//
// FORMAT B (legacy — "Page N:" summary + "N. question" with A. B. C. D. options
// that carry Excellent/Good/Not Truly Correct/Wrong labels).
//
// Stars, markdown emphasis, decorative dividers and emojis are stripped from
// all rendered content so summaries never show *** or **.

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.js?url";

(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;

import type { QuizQuestion } from "@/lib/bookCategories";

export type ParsedBook = {
  title: string;
  author: string;
  description: string;
  key_takeaways: string;
  why_read: string;
  summary_page_titles: string[];
  summary_pages: string[];
  quiz_questions: QuizQuestion[];
  warnings: string[];
};

export async function extractPdfText(file: ArrayBuffer): Promise<string> {
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
function scrubText(s: string): string {
  return s
    // Common emoji quality markers
    .replace(/[🟢🔵🟠🔴🟡🟣⚫⚪🟤]/g, " ")
    // Zero-width
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Non-breaking / unicode spaces
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    // Windows line endings
    .replace(/\r/g, "");
}

const LABEL_ALTERNATION = "Excellent|Good|Not\\s+Truly\\s+Correct|Wrong";
const LABEL_RE = new RegExp(`\\b(${LABEL_ALTERNATION})\\s*:\\s*`, "gi");

function normalizeLabel(raw: string): "Excellent" | "Good" | "Not Truly Correct" | "Wrong" {
  const l = raw.replace(/\s+/g, " ").toLowerCase();
  if (l === "excellent") return "Excellent";
  if (l === "good") return "Good";
  if (l === "wrong") return "Wrong";
  return "Not Truly Correct";
}

function looksLikeName(s: string): boolean {
  return /^[A-Z][A-Za-z.'’\-]+(?:\s+[A-Z][A-Za-z.'’\-]*){0,4}$/.test(s.trim());
}

export function parseBookText(raw: string): ParsedBook {
  const warnings: string[] = [];
  let text = scrubText(raw);
  // Strip markdown emphasis / heading / decorative separators globally.
  text = text
    .replace(/\*+/g, " ")               // ** ***
    .replace(/^#+\s*/gm, "")            // # headings
    .replace(/_{2,}/g, " ")             // __bold__
    .replace(/^[\s]*[-–—]{3,}[\s]*$/gm, "") // --- separator lines
    .replace(/[ \t]+/g, " ");
  // Trim per-line, collapse runs of blank lines to 1
  text = text.split("\n").map((l) => l.trim()).join("\n").replace(/\n{2,}/g, "\n\n");

  // ---------- Title & Author (label form + numbered form) ----------
  let title = "";
  let author = "";
  const bt = text.match(/Book\s*Title\s*:\s*([^\n]+?)(?=\s+Author\s*:|\n|$)/i)
    || text.match(/(?:^|\n)\s*\d+\.\s*Book\s*Title\s*\n\s*([^\n]+)/i);
  if (bt) title = bt[1].trim();
  const at = text.match(/\bAuthor\s*:\s*([^\n]+)/i)
    || text.match(/(?:^|\n)\s*\d+\.\s*Author\s*\n\s*([^\n]+)/i);
  if (at) {
    author = at[1].trim()
      .replace(/^By\s+/i, "")
      .replace(/[.,;:*]+$/, "")
      .trim();
  }

  // ---------- Meta fields: Description / Key Takeaway / Why Read ----------
  // Accepts both "Description: ..." and numbered "3. Description\n..." forms.
  const grabField = (labels: RegExp): string => {
    const m = text.match(labels);
    if (!m) return "";
    const startIdx = m.index! + m[0].length;
    const rest = text.slice(startIdx);
    const stopRe = /\n\s*(?:(?:\d+\.\s*)?(?:Description|Key\s*Takeaway[s]?|Why\s*Read[^\n]*|Book\s*Title|Author)\s*(?::|\n)|\[?\s*PAGE\s+\d|Summary\s*[-–—]\s*Part|Question\s+\d|MAIN\s+STORY|REAL[\-\s]LIFE|Page\s+\d+\s*:)/i;
    const stop = rest.search(stopRe);
    let body = (stop >= 0 ? rest.slice(0, stop) : rest);
    body = body.replace(/\s+/g, " ").trim();
    // Strip trailing bracketed word-counts / notes like "(38 words)" or "(approx 40 words)".
    body = body.replace(/\s*\([^()]{0,60}\)\s*$/g, "").trim();
    return body;
  };
  const descRe = /(?:\bDescription\s*:\s*|(?:^|\n)\s*\d+\.\s*Description\s*\n\s*)/i;
  const ktRe = /(?:\bKey\s*Takeaway[s]?\s*:\s*|(?:^|\n)\s*\d+\.\s*Key\s*Takeaway[s]?\s*\n\s*)/i;
  const wrRe = /(?:\bWhy\s*Read[^\n:]*:\s*|(?:^|\n)\s*\d+\.\s*Why\s*Read[^\n]*\n\s*)/i;
  const description = grabField(descRe);
  const key_takeaways = grabField(ktRe);
  const why_read = grabField(wrRe);

  // Fallback title (first non-decorative non-metadata line)
  if (!title) {
    const firstLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const l of firstLines.slice(0, 8)) {
      if (/^\[?PAGE\s+\d/i.test(l)) break;
      if (/^(by|book\s*title|author|summary|inspired|based on)\b/i.test(l)) continue;
      title = l.split(/\s[—–-]\s/)[0].trim();
      if (title) break;
    }
  }
  // Fallback author: "By Some Name"
  if (!author) {
    const m = text.match(/(?:^|\n)\s*By[:\s]+([A-Z][A-Za-z .'’\-]{1,60})/);
    if (m) author = m[1].trim().replace(/[.,;:]+$/, "");
  }
  if (author && !looksLikeName(author)) author = "";
  if (!title) warnings.push("Title not found");
  if (!author) warnings.push("Author not found");

  // ---------- Page markers (both [PAGE N] and "Page N: title") ----------
  type Marker = { num: number; blockStart: number; headerEnd: number; title: string };
  const markers: Marker[] = [];
  const pageRe = /(?:^|\n)\s*(?:\[\s*PAGE\s+(\d{1,2})\s*\]|Page\s+(\d{1,2})\s*[:\-–—.]\s*([^\n]*))/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pageRe.exec(text))) {
    const num = parseInt(pm[1] || pm[2], 10);
    if (!num || num < 1 || num > 40) continue;
    const headerEnd = pm.index + pm[0].length;
    let pageTitle = (pm[3] || "").trim();
    if (!pageTitle) {
      // For [PAGE N] form, next non-empty line often holds "Summary - Part X: <title>"
      const rest = text.slice(headerEnd);
      const nl = rest.match(/^\s*\n\s*([^\n]+)/);
      if (nl) {
        let t = nl[1].trim();
        t = t.replace(/^Summary\s*[-–—]\s*Part\s+\d+\s*[:\-–—]\s*/i, "");
        // If the next line itself starts a Question header, no title
        if (!/^Question\s+\d/i.test(t)) pageTitle = t;
      }
    }
    markers.push({ num, blockStart: pm.index, headerEnd, title: pageTitle });
  }

  // ---------- Locate quiz start ----------
  const questionRe = /(?:^|\n)\s*Question\s+(\d{1,3})\s*[:\.\)]/gi;
  const questionMatches: Array<{ num: number; idx: number; headerEnd: number }> = [];
  let qm: RegExpExecArray | null;
  while ((qm = questionRe.exec(text))) {
    questionMatches.push({ num: parseInt(qm[1], 10), idx: qm.index, headerEnd: qm.index + qm[0].length });
  }
  let quizStart = questionMatches.length ? questionMatches[0].idx : -1;
  // Also detect numbered questions ("1. ..." followed shortly by Excellent:/Good: labels).
  if (questionMatches.length === 0) {
    const altRe = /(?:^|\n)\s*(\d{1,3})\.\s+/g;
    let am: RegExpExecArray | null;
    while ((am = altRe.exec(text))) {
      const num = parseInt(am[1], 10);
      if (num < 1 || num > 30) continue;
      const look = text.slice(am.index, am.index + 2000);
      if (/\bExcellent\s*:/i.test(look) && /\bGood\s*:/i.test(look) && /\bWrong\s*:/i.test(look)) {
        questionMatches.push({ num, idx: am.index, headerEnd: am.index + am[0].length });
      }
    }
    quizStart = questionMatches.length ? questionMatches[0].idx : quizStart;
  }
  // Legacy fallback: explicit "Quiz" / "Multiple-Choice" heading
  if (quizStart < 0) {
    const legacyRe = /(?:^|\n)[^\n]{0,120}?(?:multiple[-\s]choice|application\s+quiz|\bquiz\b|real[\-\s]life\s+questions|\bquestions\b)[^\n]{0,120}/i;
    const lm = text.match(legacyRe);
    if (lm) quizStart = lm.index!;
  }

  // ---------- Summary pages ----------
  const pageTitles: string[] = Array.from({ length: 10 }, () => "");
  const pageContents: string[] = Array.from({ length: 10 }, () => "");
  const preQuizMarkers = markers.filter((mk) => quizStart < 0 || mk.blockStart < quizStart);
  const sections: Array<{ title: string; content: string }> = [];

  for (let i = 0; i < preQuizMarkers.length && sections.length < 10; i++) {
    const mk = preQuizMarkers[i];
    const next = preQuizMarkers[i + 1];
    const end = next ? next.blockStart : (quizStart >= 0 ? quizStart : text.length);
    let content = text.slice(mk.headerEnd, end);
    // Drop the "Summary - Part X: ..." header line (already used as title)
    content = content.replace(/^\s*Summary\s*[-–—]\s*Part\s+\d+\s*[:\-–—]\s*[^\n]*\n/i, "");
    // Skip a page whose entire body is Book Title / Author metadata
    const bare = content.replace(/\s+/g, " ").trim();
    const isMetaOnly =
      /^\s*Book\s*Title\s*:/i.test(bare) ||
      (/Description\s*:/i.test(bare) && /Key\s*Takeaway/i.test(bare) && /Why\s*Read/i.test(bare));
    if (isMetaOnly) continue;
    // Strip any leftover meta labels appearing inline (safety)
    content = content
      .replace(/\b(?:Book\s*Title|Author|Description|Key\s*Takeaway[s]?|Why\s*Read[^:]*)\s*:\s*/gi, " ")
      // Strip decorative dividers rendered as bare *** or --- lines
      .replace(/(^|\n)\s*[*_\-–—]{2,}\s*(?=\n|$)/g, "$1")
      // Strip any leftover page markers like [PAGE 9] or "Page 9:" inside content
      .replace(/\[?\s*PAGE\s+\d{1,3}\s*\]?\s*[:\-–—.]?/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!content) continue;
    sections.push({ title: mk.title, content });
  }
  for (let i = 0; i < sections.length; i++) {
    pageTitles[i] = sections[i].title;
    pageContents[i] = sections[i].content;
  }
  const missingCount = pageContents.filter((c) => !c).length;
  if (missingCount > 0) warnings.push(`${10 - missingCount} of 10 summary pages parsed`);

  // ---------- Quiz questions ----------
  const quiz: QuizQuestion[] = [];

  // Primary: label-based (Excellent/Good/Not Truly Correct/Wrong)
  if (questionMatches.length > 0) {
    for (let i = 0; i < questionMatches.length && quiz.length < 15; i++) {
      const start = questionMatches[i].headerEnd;
      const realEnd = i + 1 < questionMatches.length ? questionMatches[i + 1].idx : text.length;
      const chunk = text.slice(start, realEnd);

      const excellentIdx = chunk.search(/\bExcellent\s*:/i);
      if (excellentIdx < 0) continue;
      const optionsIdx = chunk.search(/\bOptions\s*:/i);
      const qEnd = optionsIdx >= 0 && optionsIdx < excellentIdx ? optionsIdx : excellentIdx;

      // Question text: drop optional "topic-title" line, optional "(Testing …)" subtitle,
      // and any leftover parenthetical "(Testing …)" fragments. Also strip stray [PAGE N] markers.
      let qBlock = chunk.slice(0, qEnd);
      // Only strip the first line as a topic-title when it looks like a short label
      // (numbered questions have their real question on line 1 — keep it).
      const firstLineMatch = qBlock.match(/^([^\n]*)\n/);
      if (firstLineMatch) {
        const firstLine = firstLineMatch[1].trim();
        const looksLikeTopic = firstLine.length > 0 && firstLine.length < 60 && !/[.?]$/.test(firstLine) && !/^\d+\./.test(firstLine);
        if (looksLikeTopic) qBlock = qBlock.slice(firstLineMatch[0].length);
      }
      qBlock = qBlock.replace(/^\s*\([^\n)]*\)\s*\n/, "");  // subtitle line
      qBlock = qBlock.replace(/\([^)]{0,200}\)/g, (s) => (/testing/i.test(s) ? "" : s));
      qBlock = qBlock.replace(/\[?\s*PAGE\s+\d{1,3}\s*\]?\s*[:\-–—.]?/gi, " ");
      // Drop a leading numeric prefix ("1. ", "12) ") since the question is already anchored.
      qBlock = qBlock.replace(/^\s*\d+[\.\)]\s*/, "");
      const questionText = qBlock.replace(/\s+/g, " ").trim();
      if (!questionText || questionText.length < 6) continue;

      // Find label positions in the options region
      const optChunk = chunk.slice(qEnd);
      LABEL_RE.lastIndex = 0;
      const found: Array<{ label: "Excellent" | "Good" | "Not Truly Correct" | "Wrong"; start: number; end: number }> = [];
      let om: RegExpExecArray | null;
      while ((om = LABEL_RE.exec(optChunk))) {
        found.push({ label: normalizeLabel(om[1]), start: om.index, end: om.index + om[0].length });
      }
      // Take first-of-each in encountered order
      const seen = new Set<string>();
      const picked: typeof found = [];
      for (const f of found) {
        if (!seen.has(f.label)) {
          seen.add(f.label);
          picked.push(f);
        }
        if (picked.length === 4) break;
      }
      if (picked.length < 4) continue;

      // Look for a per-question explanation line: `Why "Excellent" is best: <text>`.
      // Also matches Why Excellent is best / Why 'Excellent' is best (curly/straight quotes optional).
      const whyRe = /Why\s+["“”'‘’]?\s*Excellent\s*["“”'‘’]?\s+is\s+best\s*:\s*/i;
      const whyMatch = optChunk.match(whyRe);
      let explanation = "";
      let whyStartInOpt = -1;
      if (whyMatch && typeof whyMatch.index === "number") {
        whyStartInOpt = whyMatch.index;
        explanation = optChunk
          .slice(whyMatch.index + whyMatch[0].length)
          .replace(/\[?\s*PAGE\s+\d{1,3}\s*\]?\s*[:\-–—.]?/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      const ordered = [...picked].sort((a, b) => a.start - b.start);
      const map: Record<string, string> = {};
      for (let k = 0; k < ordered.length; k++) {
        const cur = ordered[k];
        const nx = ordered[k + 1];
        // Never let an option run past the "Why 'Excellent' is best:" line.
        const hardEnd = nx ? nx.start : (whyStartInOpt >= 0 ? whyStartInOpt : optChunk.length);
        let optText = optChunk.slice(cur.end, hardEnd);
        const expIdx = optText.search(/\bExplanation\s*:/i);
        if (expIdx >= 0) optText = optText.slice(0, expIdx);
        // Also cut if a stray "Why ... is best:" appears inside the last option.
        const whyInside = optText.search(whyRe);
        if (whyInside >= 0) optText = optText.slice(0, whyInside);
        optText = optText.replace(/\[?\s*PAGE\s+\d{1,3}\s*\]?\s*[:\-–—.]?/gi, " ");
        optText = optText.replace(/\s+/g, " ").trim().replace(/[*_]+/g, "").trim();
        optText = optText.replace(/[\s*_]+$/g, "").trim();
        map[cur.label] = optText;
      }
      const options: [string, string, string, string] = [
        map["Excellent"] || "",
        map["Good"] || "",
        map["Not Truly Correct"] || "",
        map["Wrong"] || "",
      ];
      if (options.some((o) => !o)) continue;

      quiz.push({
        q: questionText,
        options,
        correct: 0,
        explanation,
        option_explanations: ["Excellent", "Good", "Not Truly Correct", "Wrong"],
      });
    }
  }

  // Fallback: legacy A/B/C/D format
  if (quiz.length < 10 && quizStart >= 0 && questionMatches.length === 0) {
    const qSection = text.slice(quizStart).replace(/\s+/g, " ");
    const qRe = /(?:^|[\s])(\d{1,3})[\.\)]\s+/g;
    const qStarts: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = qRe.exec(qSection))) {
      const n = parseInt(m[1], 10);
      if (n < 1 || n > 30) continue;
      const look = qSection.slice(m.index, m.index + 2500);
      if (/\s[Aa][\.\)]\s/.test(look)) qStarts.push(m.index + m[0].length);
    }
    const optRe = /\s([A-D])[\.\)]\s+/g;
    for (let i = 0; i < qStarts.length && quiz.length < 15; i++) {
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
      const seen = new Set<string>();
      const four: typeof opts = [];
      for (const o of opts) {
        if (!seen.has(o.letter) && "ABCD".includes(o.letter)) { seen.add(o.letter); four.push(o); }
        if (four.length === 4) break;
      }
      if (four.length < 4) continue;
      const question = chunk.slice(0, four[0].start).trim()
        .replace(/\[?\s*PAGE\s+\d{1,3}\s*\]?\s*[:\-–—.]?/gi, " ")
        .replace(/\s+/g, " ").replace(/\?\s*$/, "?");
      const options: [string, string, string, string] = ["", "", "", ""];
      const labels: [string, string, string, string] = ["", "", "", ""];
      for (let k = 0; k < 4; k++) {
        const oo = four[k];
        const eEnd = k + 1 < four.length ? four[k + 1].start : chunk.length;
        const idx = "ABCD".indexOf(oo.letter);
        if (idx < 0) continue;
        let optText = chunk.slice(oo.end, eEnd).trim()
          .replace(/\[?\s*PAGE\s+\d{1,3}\s*\]?\s*[:\-–—.]?/gi, " ")
          .replace(/\s+/g, " ");
        const detected = /\bexcellent\b/i.test(optText) ? "Excellent"
          : /\bnot\s+truly\s+correct\b/i.test(optText) ? "Not Truly Correct"
          : /\bgood\b/i.test(optText) ? "Good"
          : /\bwrong\b/i.test(optText) ? "Wrong" : "";
        optText = optText
          .replace(/^\(?\s*(Excellent|Good|Not\s+Truly\s+Correct|Wrong)\s*\)?\s*[—\-–:=]*\s*/i, "")
          .replace(/\s*[—\-–:=]?\s*\(?\s*(Excellent|Good|Not\s+Truly\s+Correct|Wrong)\s*\)?\s*$/i, "")
          .replace(/\s*\([^()]{0,300}\)\s*$/, "")
          .trim();
        options[idx] = optText;
        labels[idx] = detected;
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

  return { title, author, description, key_takeaways, why_read, summary_page_titles: pageTitles, summary_pages: pageContents, quiz_questions: quiz, warnings };
}

export async function parseBookPdf(file: ArrayBuffer): Promise<ParsedBook> {
  const text = await extractPdfText(file);
  return parseBookText(text);
}
