// Parses the standardized book summary PDF format used for bulk import.
// Accepts markdown-flavored PDFs such as:
//   # <Title> — <subtitle>
//   ### By <Author> (Summarized in 10 Pages)
//   ## Page N: <Page Title>
//   ...content...
//   Multiple-Choice Questions: ...
//   **1. Question ?**
//   A. *(Excellent)* text  B. *(Good)* ...  C. *(Not Truly Correct)* ...  D. *(Wrong)* ...

// Use the LEGACY build — the modern build breaks in iOS/Android WebViews
// (ReadableStream async-iterator differences, DOMMatrix usage, etc.).
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
try {
  (pdfjsLib as unknown as { GlobalWorkerOptions: { workerPort: Worker } }).GlobalWorkerOptions.workerPort = new PdfWorker();
} catch {
  (pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
}

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
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(file) }).promise;
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

// Strip markdown emphasis/heading marks so regexes can match content directly.
function stripMd(s: string): string {
  return s
    .replace(/\*+/g, " ")      // ** and *
    .replace(/^#+\s*/gm, "")   // leading # ## ###
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function parseBookText(raw: string): ParsedBook {
  const warnings: string[] = [];
  const norm = raw.replace(/\r/g, "").replace(/\u00A0/g, " ");
  const cleaned = norm
    .split("\n")
    .map((l) => stripMd(l))
    .filter((l) => l.length > 0)
    .join("\n");

  const lines = cleaned.split("\n");

  // Title: first non-empty line (already stripped of #), take before " — "/" – "/" - "
  let title = "";
  const first = lines[0] || "";
  title = (first.split(/\s[—–-]\s/)[0] || first).trim();
  if (!title) warnings.push("Title not found");

  // Author: any line containing "By <Name>" (case-insensitive), before parenthesis
  let author = "";
  for (const l of lines.slice(0, 20)) {
    const m = l.match(/\bBy\s+([A-Z][^()\n]{1,80}?)(?:\s*\(|$)/);
    if (m) { author = m[1].trim().replace(/[.,;:]+$/, ""); break; }
  }
  if (!author) warnings.push("Author not found");

  // Quiz boundary
  const quizIdx = cleaned.search(/Multiple[-\s]Choice Questions/i);
  const body = quizIdx >= 0 ? cleaned.slice(0, quizIdx) : cleaned;

  // Pages — accept optional leading "Page" markdown remnants
  const pageTitles = Array.from({ length: 10 }, () => "");
  const pageContents = Array.from({ length: 10 }, () => "");
  const pageRe = /(?:^|\n)\s*Page\s+(\d{1,2})\s*[:\-–—]\s*([^\n]+)/gi;
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

  // Quiz
  const quiz: QuizQuestion[] = [];
  if (quizIdx >= 0) {
    const qSection = cleaned.slice(quizIdx).replace(/\s+/g, " ");
    // Question markers: " N. " where N is 1-3 digits, followed within ~1500 chars by an A. option
    const qRe = /(?:^|\s)(\d{1,3})\.\s+/g;
    const qStarts: number[] = [];
    let qm: RegExpExecArray | null;
    while ((qm = qRe.exec(qSection))) {
      const look = qSection.slice(qm.index, qm.index + 2000);
      if (/\sA\.\s*\(?\s*(Excellent|Good|Not Truly Correct|Wrong)/i.test(look)) {
        qStarts.push(qm.index + qm[0].length);
      }
    }
    // Option marker allows optional "(" before label
    const optRe = /\s([A-D])\.\s*\(?\s*(Excellent|Good|Not Truly Correct|Wrong)\s*\)?\s*[—\-–:]*\s*/gi;
    for (let i = 0; i < qStarts.length; i++) {
      const start = qStarts[i];
      const end = i + 1 < qStarts.length ? qStarts[i + 1] : qSection.length;
      const chunk = qSection.slice(start, end);
      optRe.lastIndex = 0;
      const opts: Array<{ letter: string; label: string; start: number; end: number }> = [];
      let om: RegExpExecArray | null;
      while ((om = optRe.exec(chunk))) {
        opts.push({ letter: om[1].toUpperCase(), label: om[2], start: om.index, end: om.index + om[0].length });
      }
      if (opts.length < 4) continue;
      const question = chunk.slice(0, opts[0].start).trim().replace(/\s+/g, " ").replace(/\?\s*$/, "?");
      const options: [string, string, string, string] = ["", "", "", ""];
      const labels: [string, string, string, string] = ["", "", "", ""];
      for (let k = 0; k < 4; k++) {
        const oo = opts[k];
        const eEnd = k + 1 < opts.length ? opts[k + 1].start : chunk.length;
        const idx = "ABCD".indexOf(oo.letter);
        if (idx < 0) continue;
        options[idx] = chunk.slice(oo.end, eEnd).trim().replace(/\s+/g, " ");
        labels[idx] = oo.label;
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
