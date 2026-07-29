import fs from 'fs';
// Stub bookCategories
(globalThis as any).__stub = true;
import { parseBookText } from './src/lib/parseBookPdf.ts';
const raw = fs.readFileSync(process.argv[2],'utf8');
const r = parseBookText(raw);
console.log('title:', r.title);
console.log('author:', r.author);
console.log('desc len:', r.description.length);
console.log('KT len:', r.key_takeaways.length);
console.log('WR len:', r.why_read.length);
console.log('pages:', r.summary_pages.map((p,i)=>`${i+1}:${p.length}`).join(' '));
console.log('titles:', r.summary_page_titles);
console.log('quiz count:', r.quiz_questions.length);
for (const q of r.quiz_questions.slice(0,3)) {
  console.log('--- Q:', q.q.slice(0,120));
  q.options.forEach((o,i)=>console.log('  ',i,o.slice(0,100)));
  console.log('  exp:', (q.explanation||'').slice(0,120));
}
console.log('warnings:', r.warnings);
