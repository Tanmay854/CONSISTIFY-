// Parses the standardized book summary PDF format used for bulk import.
// Format:
//   Line 1: "<Title> — <subtitle>"
//   A line "By <Author> (Summarized in 10 Pages)"
//   Ten sections: "Page N: <Page Title>\n<content...>"
//   Then: "Multiple-Choice Questions:" and a numbered list where each option
//         is prefixed "A. (Excellent|Good|Not Truly Correct|Wrong) — ..."

import * as pdfjsLib from "pdfjs-dist";
// Load worker via Vite's ?worker (real module Worker) with ?url fallback.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
try {
  (pdfjsLib as unknown as { GlobalWorkerOptions: { workerPort: Worker } }).GlobalWorkerOptions.workerPort = new PdfWorker();
} catch {
  (pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
}

import type { QuizQuestion } from "@/lib/bookCategories";

export type ParsedBook = {
  title: string;
  author: string;
  summary_page_titles: string[]; // length 10
  summary_pages: string[];       // length 10
  quiz_questions: QuizQuestion[];
  warnings: string[];
};

export async function extractPdfText(file: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: file }).promise;
  const chunks: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    // Reconstruct approximate lines by tracking y-position of text items
    let lastY: number | null = null;
    let line = "";
    for (const item of tc.items as Array<{ str: string; transform: number[] }>) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        chunks.push(line);
        line = "";
      }
      line += (line && !line.endsWith(" ") && !item.str.startsWith(" ") ? " " : "") + item.str;
      lastY = y;
    }
    if (line) chunks.push(line);
    chunks.push(""); // page break
  }
  return chunks.join("\n");
}

export function parseBookText(raw: string): ParsedBook {
  const warnings: string[] = [];
  const norm = raw
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ");
  const lines = norm.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // Title: first non-empty line, take portion before " — " / " – " / " - " if present.
  let title = "";
  const first = lines[0] || "";
  const dashSplit = first.split(/\s[—–-]\s/);
  title = (dashSplit[0] || first).trim();
  if (!title) warnings.push("Title not found");

  // Author: line starting with "By "
  let author = "";
  const byLine = lines.find((l) => /^By\s+/i.test(l));
  if (byLine) {
    const m = byLine.match(/^By\s+(.+?)(?:\s*\(.*)?$/i);
    if (m) author = m[1].trim();
  }
  if (!author) warnings.push("Author not found");

  // Locate the quiz section boundary
  const quizIdx = norm.search(/Multiple[-\s]Choice Questions/i);
  const body = quizIdx >= 0 ? norm.slice(0, quizIdx) : norm;

  // Pages
  const pageTitles = Array.from({ length: 10 }, () => "");
  const pageContents = Array.from({ length: 10 }, () => "");
  const pageRe = /(?:^|\n)\s*Page\s+(\d{1,2})\s*[:\-–—]\s*([^\n]+)/gi;
  const markers: Array<{ num: number; title: string; contentStart: number; rawStart: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = pageRe.exec(body))) {
    markers.push({
      num: parseInt(m[1], 10),
      title: m[2].trim(),
      contentStart: m.index + m[0].length,
      rawStart: m.index,
    });
  }
  for (let i = 0; i < markers.length; i++) {
    const mk = markers[i];
    if (mk.num < 1 || mk.num > 10) continue;
    const end = i + 1 < markers.length ? markers[i + 1].rawStart : body.length;
    const content = body
      .slice(mk.contentStart, end)
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    pageTitles[mk.num - 1] = mk.title;
    pageContents[mk.num - 1] = content;
  }
  const missingPages = pageTitles.map((_, i) => i + 1).filter((n) => !pageContents[n - 1]);
  if (missingPages.length) warnings.push(`Missing pages: ${missingPages.join(", ")}`);

  // Quiz
  const quiz: QuizQuestion[] = [];
  if (quizIdx >= 0) {
    const qSection = norm.slice(quizIdx).replace(/\n+/g, " ").replace(/\s+/g, " ");
    const qRe = /(?:^|\s)(\d{1,3})\.\s+(?=[A-Z“"])/g;
    const qMarkers: Array<{ start: number }> = [];
    let qm: RegExpExecArray | null;
    while ((qm = qRe.exec(qSection))) {
      // Only accept as a question marker if an "A." option label appears within the next ~1500 chars
      const lookahead = qSection.slice(qm.index, qm.index + 1500);
      if (/\sA\.\s*\(?\s*(Excellent|Good|Not Truly Correct|Wrong)/i.test(lookahead)) {
        qMarkers.push({ start: qm.index + qm[0].length });
      }
    }
    for (let i = 0; i < qMarkers.length; i++) {
      const start = qMarkers[i].start;
      const end = i + 1 < qMarkers.length ? qMarkers[i + 1].start : qSection.length;
      const chunk = qSection.slice(start, end).trim();
      const optRe = /\s([A-D])\.\s*\(?\s*(Excellent|Good|Not Truly Correct|Wrong)\s*\)?\s*[—\-–:]*\s*/g;
      const optMatches: Array<{ letter: string; label: string; start: number; end: number }> = [];
      let om: RegExpExecArray | null;
      while ((om = optRe.exec(chunk))) {
        optMatches.push({ letter: om[1], label: om[2], start: om.index, end: om.index + om[0].length });
      }
      if (optMatches.length < 4) continue;
      const firstOpt = optMatches[0];
      const question = chunk.slice(0, firstOpt.start).trim().replace(/\s+/g, " ");
      const options: [string, string, string, string] = ["", "", "", ""];
      const labels: [string, string, string, string] = ["", "", "", ""];
      for (let k = 0; k < 4; k++) {
        const oo = optMatches[k];
        const optEnd = k + 1 < optMatches.length ? optMatches[k + 1].start : chunk.length;
        const text = chunk.slice(oo.end, optEnd).trim();
        const idx = "ABCD".indexOf(oo.letter);
        if (idx >= 0 && idx < 4) {
          options[idx] = text;
          labels[idx] = oo.label;
        }
      }
      if (options.some((o) => !o)) continue;
      const correctIdx = labels.findIndex((l) => l === "Excellent");
      quiz.push({
        q: question,
        options,
        correct: (correctIdx >= 0 ? correctIdx : 0) as 0 | 1 | 2 | 3,
        option_explanations: labels,
      });
    }
  }
  if (quiz.length < 10) warnings.push(`Only ${quiz.length} quiz questions parsed`);

  return {
    title,
    author,
    summary_page_titles: pageTitles,
    summary_pages: pageContents,
    quiz_questions: quiz,
    warnings,
  };
}

export async function parseBookPdf(file: ArrayBuffer): Promise<ParsedBook> {
  const text = await extractPdfText(file);
  return parseBookText(text);
}
