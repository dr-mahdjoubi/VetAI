#!/usr/bin/env node
/* ============================================================================
   VetAI Supervisor — Guard Probes & Self-Healing (Node >= 18, no deps)
   رفيق المشرف في سلسلة VetAI Guard (tools/site-guard.mjs):
   1) جسّات حيّة لمزودي الذكاء (Pollinations fast/full + الـ Worker مع فحص CORS
      لكل نطاق إنتاجي) بقياس زمن فعلي — لا يكتفي برمز الحالة.
   2) سلامة البيانات: عدّ الكتب في json/resources.json وكشف الروابط المكررة
      والمداخل الناقصة، وعدّ مقالات articles/manifest.json.
   3) فهرس بحث محلي مع استشفاء ذاتي: يبني فهرسًا مقلوبًا (inverted index)
      من الكتب والمقالات، ويعيد بناءه تلقائيًا إن تغيّرت مصادره أو فسد.
   Usage:
     node guard-probes.mjs [--base https://drvet.onrender.com]
                           [--min-books 197] [--out report.json]
                           [--build-index js/search-index.json]
   Exit: 0 healthy · 1 hard failure (provider down, duplicates, count drift)
   ============================================================================ */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i === -1 ? dflt : args[i + 1]; };
const BASE = opt('base', 'https://drvet.onrender.com').replace(/\/$/, '');
const MIN_BOOKS = parseInt(opt('min-books', '197'), 10);
const OUT = opt('out', null);
const INDEX_OUT = opt('build-index', null);
const UA = 'VetAI-Supervisor/1.0 (+https://drvet.onrender.com)';
const ORIGINS = ['https://drvet.onrender.com', 'https://vetai.vcom.workers.dev', 'https://dr-mahdjoubi.github.io'];

const report = { at: new Date().toISOString(), base: BASE, probes: [], integrity: {}, index: null, hard: [], warn: [] };

async function timed(fn) { const t0 = Date.now(); try { const v = await fn(); return { ms: Date.now() - t0, v }; } catch (e) { return { ms: Date.now() - t0, err: e }; } }
async function fetchTO(url, opts = {}, ms = 30000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal, headers: { 'User-Agent': UA, ...(opts.headers || {}) } }); }
  finally { clearTimeout(t); }
}

/* ---------------- 1) Provider probes ---------------- */
async function probePol(model) {
  const { ms, v, err } = await timed(() => fetchTO('https://text.pollinations.ai/openai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'أجب بكلمة واحدة: جاهز' }], temperature: 0 })
  }).then(async r => ({ status: r.status, body: await r.text() })));
  let ok = false, note = '';
  if (err) note = 'network: ' + err.message;
  else { try { const j = JSON.parse(v.body); ok = v.status === 200 && !!(j.choices && j.choices[0] && j.choices[0].message); note = ok ? 'answer received' : 'status ' + v.status; } catch { note = 'non-JSON, status ' + v.status; } }
  report.probes.push({ provider: 'pollinations/' + model, ok, ms, note });
  return ok;
}
async function probeWorker(origin) {
  const { ms, v, err } = await timed(() => fetchTO('https://vetai-chat.dr-mahdjoubi.workers.dev', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ question: 'ping', history: [], context: '' })
  }).then(async r => ({ status: r.status, acao: r.headers.get('access-control-allow-origin'), body: await r.text() })));
  if (err) { report.probes.push({ provider: 'worker', origin, ok: false, ms, note: 'network: ' + err.message }); return false; }
  const corsOk = v.acao === origin || v.acao === '*';
  report.probes.push({ provider: 'worker', origin, ok: v.status === 200, httpStatus: v.status, cors: corsOk ? 'allowed' : 'BLOCKED (ACAO=' + v.acao + ')', ms });
  return v.status === 200 && corsOk;
}

/* ---------------- 2) Data integrity ---------------- */
const normUrl = u => String(u || '').trim().toLowerCase().replace(/\/$/, '');
async function getJSON(path) { const r = await fetchTO(BASE + path, {}, 30000); if (!r.ok) throw new Error(path + ' HTTP ' + r.status); return { json: await r.json(), bytes: 0 }; }
async function checkData() {
  const res = await (await fetchTO(BASE + '/json/resources.json', {}, 30000)).text();
  const data = JSON.parse(res);
  const books = data.books || [];
  const seen = new Map(); const dups = [];
  let incomplete = 0;
  for (const b of books) {
    const u = normUrl(b.url); if (!u || !b.title || !b.desc) incomplete++;
    if (seen.has(u)) dups.push(u); else seen.set(u, 1);
  }
  report.integrity.books = { count: books.length, duplicates: dups.length, incomplete };
  if (books.length < MIN_BOOKS) report.hard.push(`books count ${books.length} < min ${MIN_BOOKS}`);
  if (dups.length) report.hard.push('duplicate book URLs: ' + dups.slice(0, 5).join(', '));
  if (incomplete) report.warn.push(incomplete + ' book entries missing title/url/desc');
  let articles = 0;
  try { const m = await getJSON('/articles/manifest.json'); articles = Object.keys(m.json).length; } catch (e) { report.warn.push('manifest: ' + e.message); }
  report.integrity.articles = { count: articles };
  return { books, articles };
}

/* ---------------- 3) Search index with self-healing ---------------- */
const TOK = /[^\p{L}\p{N}]+/u;
function tokenize(s) {
  return String(s || '').toLowerCase().split(TOK).filter(w => w.length >= 2 && w.length <= 40);
}
function buildIndex(books, articleEntries) {
  const docs = [];
  const inv = new Map();
  const addDoc = (title, url, kind) => {
    const id = docs.length; docs.push({ t: title, u: url, k: kind });
    const toks = new Set([...tokenize(title)]);
    for (const t of toks) { if (!inv.has(t)) inv.set(t, []); inv.get(t).push(id); }
  };
  for (const b of books) addDoc(b.title, b.url, 'book');
  for (const a of articleEntries) addDoc(a.t, a.u, 'article');
  const invObj = {}; for (const [k, v] of inv) invObj[k] = v;
  return { docs, inv: invObj, tokens: inv.size };
}
async function ensureIndex(books, articles) {
  if (!INDEX_OUT) return;
  // جلب مداخل المقالات من المانيفست: عنوان + رابط الصفحة الفعلي (articles/<slug>.html)
  let entries = [];
  try {
    const m = await getJSON('/articles/manifest.json');
    const toU = s => 'articles/' + String(s || '').replace(/^articles\//, '').replace(/\.html$/, '') + '.html';
    if (Array.isArray(m.json)) entries = m.json.map(x => ({ t: x.title || x.t || '', u: toU(x.slug || x.file || x.s) }));
    else entries = Object.keys(m.json).map(k => ({ t: k, u: toU(m.json[k]) }));
  } catch { /* books only */ }
  const raw = JSON.stringify(books) + '##' + JSON.stringify(entries);
  const srcHash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  let existing = null;
  try { existing = JSON.parse(await readFile(INDEX_OUT, 'utf8')); } catch { /* corrupt or missing → rebuild */ }
  if (existing && existing._srcHash === srcHash && existing.docs && existing.inv) {
    report.index = { path: INDEX_OUT, action: 'verified-fresh', docs: existing.docs.length, tokens: existing.tokens, srcHash };
    return;
  }
  const idx = buildIndex(books, entries);
  const payload = { _srcHash: srcHash, builtAt: new Date().toISOString(), docs: idx.docs, inv: idx.inv, tokens: idx.tokens };
  await writeFile(INDEX_OUT, JSON.stringify(payload));
  const back = JSON.parse(await readFile(INDEX_OUT, 'utf8')); // تحقق بالقراءة العكسية
  if (back.docs.length !== idx.docs.length) { report.hard.push('index round-trip mismatch'); return; }
  report.index = { path: INDEX_OUT, action: existing ? 'rebuilt (source changed or corrupt)' : 'built', docs: idx.docs.length, tokens: idx.tokens, srcHash, bytes: JSON.stringify(payload).length };
}

/* ---------------- Main ---------------- */
const fast = await probePol('openai-fast');
const full = await probePol('openai');
if (!fast && !full) report.hard.push('both Pollinations models unreachable — AI path down');
else if (!fast || !full) report.warn.push('one Pollinations model down (fast=' + fast + ', full=' + full + ')');
for (const o of ORIGINS) { const ok = await probeWorker(o); if (!ok) report.warn.push('worker not serving origin ' + o + ' (CORS or down) — fallback only'); }

const { books, articles } = await checkData().catch(e => { report.hard.push('data check failed: ' + e.message); return { books: [], articles: 0 }; });
await ensureIndex(books, articles).catch(e => report.warn.push('index: ' + e.message));

report.verdict = report.hard.length ? 'UNHEALTHY' : (report.warn.length ? 'DEGRADED' : 'HEALTHY');
const line = JSON.stringify(report, null, 1);
if (OUT) await writeFile(OUT, line);
console.log(line);
process.exit(report.hard.length ? 1 : 0);
