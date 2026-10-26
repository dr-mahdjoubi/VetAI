#!/usr/bin/env node
/**
 * VetAI Book Fetcher — جالب الكتب والمراجع البيطرية المفتوحة
 * يجلب أحدث الكتب والمنشورات البيطرية مفتوحة الوصول من مصادر رسمية موثوقة فقط،
 * ويضيف الجديد منها إلى json/resources.json (قسم books في مكتبة الموقع)،
 * بلا أي مكتبات خارجية (Node 18+). يعمل من GitHub Actions كل 8 ساعات أو يدويًا:
 *   node tools/fetch-books.mjs [--file json/resources.json] [--log data/fresh-log.json] [--max-new 3]
 *
 * ضوابط السلامة (بأمر المالك 2026-10-25: للمدير كل الصلاحيات لجلب الكتب والمعلومات وتجديدها):
 * - مصادر رسمية فقط: WHO IRIS، FAO Open Knowledge، NCBI Bookshelf.
 * - كل رابط يُتحقق منه فعليًا (HTTP 200، وللكتب: ظهور عنوان الكتاب في الصفحة) قبل الإضافة.
 * - منع التكرار بالرابط وبعنوان مُطبَّع؛ حدّ أقصى للإضافات في كل تشغيل.
 * - لا محتوى طبي مولّد آليًا: تُجلب كتب ومنشورات حقيقية بروابطها الرسمية فقط.
 * - كل تشغيل يُسجَّل في data/fresh-log.json (ماذا أُضيف ومن أين) لعرضه في لوحة المدير.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const FILE = opt('file', 'json/resources.json');
const LOG = opt('log', 'data/fresh-log.json');
const MAX_NEW = parseInt(opt('max-new', '3'), 10);
const UA = 'VetAI-BookFetcher/1.0 (+https://vetai.vcom.workers.dev)';
const TIMEOUT = 20000;

const norm = t => (t || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ').trim();
const clean = t => (t || '').replace(/\s+/g, ' ').trim();

async function getText(url, accept) {
  const r = await fetch(url, { headers: { 'user-agent': UA, ...(accept ? { accept } : {}) }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}
async function getJson(url) { return JSON.parse(await getText(url, 'application/json')); }

/* تحقق فعلي: 200 + (اختياريًا) ظهور مقطع من العنوان داخل الصفحة */
async function verifyUrl(url, titleFrag) {
  try {
    const html = await getText(url, 'text/html');
    if (!titleFrag) return true;
    const frag = norm(titleFrag).split(' ').filter(w => w.length > 3).slice(0, 4).join(' ');
    if (!frag) return true;
    return norm(html.slice(0, 80000)).includes(frag.split(' ')[0]) || norm(html.slice(0, 80000)).includes(frag);
  } catch { return false; }
}

/* ---------- مصدر DSpace (WHO IRIS + FAO Open Knowledge) ---------- */
async function dspaceCandidates(base, itemBase, queries) {
  const out = [];
  for (const q of queries) {
    const url = `${base}/server/api/discover/search/objects?query=${encodeURIComponent(q)}&size=6`;
    const data = await getJson(url);
    const objects = data?._embedded?.searchResult?._embedded?.objects || [];
    for (const o of objects) {
      const href = o?._links?.indexableObject?.href;
      if (!href) continue;
      try {
        const item = await getJson(href);
        const md = item.metadata || {};
        const title = clean(md['dc.title']?.[0]?.value).split(' / ')[0].trim();
        const types = (md['dc.type'] || []).map(v => v.value || '');
        const issued = clean(md['dc.date.issued']?.[0]?.value).slice(0, 10);
        if (!title || title.length < 12) continue;
        if (types.length && types.every(t => /journal/i.test(t))) continue;         // مقالات دوريات ليست كتبًا
        if (types.length && !types.some(t => /book|report|guideline|manual|publication|fact ?sheet|monograph/i.test(t))) continue;
        out.push({ title, url: `${itemBase}/items/${item.uuid}`, issued, via: base });
      } catch { /* تخطَّ العنصر التالف */ }
    }
  }
  out.sort((a, b) => (b.issued || '').localeCompare(a.issued || ''));
  return out;
}

/* ---------- مصدر NCBI Bookshelf ---------- */
async function ncbiCandidates() {
  const term = encodeURIComponent('(veterinary OR "animal health" OR zoonoses) AND book');
  const s = await getJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=books&term=${term}&retmax=40&retmode=json&sort=date`);
  const ids = s?.esearchresult?.idlist || [];
  if (!ids.length) return [];
  const sum = await getJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=books&id=${ids.join(',')}&retmode=json`);
  const byBook = new Map();
  for (const id of ids) {
    const rec = sum?.result?.[id];
    if (!rec || !rec.bookaccessionid) continue;
    if (byBook.has(rec.bookaccessionid)) continue;
    const m = (rec.bookinfo || '').match(/type="book"[^>]*>[\s\S]*?<Title>([\s\S]*?)<\/Title>/);
    const title = clean(m ? m[1] : '');
    if (!title || title.length < 12) continue;
    byBook.set(rec.bookaccessionid, {
      title,
      url: `https://www.ncbi.nlm.nih.gov/books/${rec.bookaccessionid}/`,
      issued: clean(rec.pubdate).slice(0, 4),
      via: 'ncbi',
    });
  }
  return [...byBook.values()];
}

const SOURCES = [
  { name: 'WHO IRIS', tag: 'WHO', run: () => dspaceCandidates('https://iris.who.int', 'https://iris.who.int', ['veterinary', 'animal health', 'zoonoses', 'rabies']) },
  { name: 'FAO Open Knowledge', tag: 'FAO', run: () => dspaceCandidates('https://openknowledge.fao.org', 'https://openknowledge.fao.org', ['animal health', 'veterinary', 'livestock disease']) },
  { name: 'NCBI Bookshelf', tag: 'NCBI Bookshelf', run: ncbiCandidates },
];

/* ---------- التشغيل ---------- */
if (!existsSync(FILE)) { console.error(`الملف غير موجود: ${FILE}`); process.exit(1); }
const doc = JSON.parse(readFileSync(FILE, 'utf8'));
doc.books = Array.isArray(doc.books) ? doc.books : [];
const knownUrls = new Set(doc.books.map(b => b.url));
const knownTitles = new Set(doc.books.map(b => norm(b.title)));

const run = { at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), added: [], sources: {} };
let remaining = MAX_NEW;
for (const src of SOURCES) {
  if (remaining <= 0) break;
  const stat = { found: 0, added: 0 };
  try {
    const cands = await src.run();
    stat.found = cands.length;
    for (const c of cands) {
      if (remaining <= 0) break;
      if (knownUrls.has(c.url) || knownTitles.has(norm(c.title))) continue;
      if (!(await verifyUrl(c.url, c.title))) { console.log(`تخطٍّ (تحقق فاشل): ${c.url}`); continue; }
      const entry = { title: `${c.title} (${src.tag})`, url: c.url };
      doc.books.push(entry);
      knownUrls.add(c.url); knownTitles.add(norm(c.title));
      run.added.push({ title: entry.title, url: c.url, source: src.name });
      stat.added++; remaining--;
      console.log(`أُضيف [${src.name}]: ${entry.title}`);
    }
  } catch (e) {
    stat.error = e.message;
    console.log(`تخطٍّ (${src.name}): ${e.message}`);
  }
  run.sources[src.name] = stat;
}

if (run.added.length) writeFileSync(FILE, JSON.stringify(doc, null, 2) + '\n');

/* سجلّ التجديد — تقرأه لوحة المدير */
let log = { runs: [] };
if (existsSync(LOG)) { try { log = JSON.parse(readFileSync(LOG, 'utf8')); } catch { log = { runs: [] }; } }
log.runs = Array.isArray(log.runs) ? log.runs : [];
log.runs.unshift(run);
log.runs = log.runs.slice(0, 30);
log.last_run = run.at;
log.total_books = doc.books.length;
writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');

console.log(run.added.length ? `تم: ${run.added.length} كتاب/مرجع جديد (مجموع المكتبة الآن ${doc.books.length}).` : 'لا كتب جديدة هذا التشغيل — الملف لم يتغيّر.');
