#!/usr/bin/env node
/**
 * VetAI News Refresher — محرّك تحديث شريط الأخبار
 * يقرأ خلاصات RSS بيطرية موثوقة، ويضيف الجديد إلى json/news.json بنفس بنية الموقع،
 * بلا أي مكتبات خارجية (Node 18+). يعمل من GitHub Actions أو يدويًا:
 *   node tools/refresh-news.mjs [--file json/news.json] [--max-new 5]
 *
 * ملاحظة تصميم: العناوين المجلوبة من الخلاصات إنجليزية (title_en) — يبقى تلخيصها
 * العربي مهمة مراجعة بشرية/وكيل، ولا تُختلق ترجمات آليًا هنا.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const FILE = opt('file', 'json/news.json');
const MAX_NEW = parseInt(opt('max-new', '5'), 10);
const MAX_TOTAL = 30;
const UA = 'VetAI-NewsRefresher/1.0 (+https://vetai.vcom.workers.dev)';

/* خلاصات مرشحة — تُتخطى أي خلاصة لا تستجيب أو لا تصلح، دون فشل التشغيل */
const FEEDS = [
  { name: 'Google News — Veterinary', url: 'https://news.google.com/rss/search?q=veterinary+medicine+OR+%22animal+health%22+when:7d&hl=en-US&gl=US&ceid=US:en', category: 'news' },
  { name: 'ScienceDaily — Veterinary Medicine', url: 'https://www.sciencedaily.com/rss/plants_animals/veterinary_medicine.xml', category: 'science' },
  { name: 'Google News — Animal Disease Outbreak', url: 'https://news.google.com/rss/search?q=%22animal+disease%22+outbreak+when:7d&hl=en-US&gl=US&ceid=US:en', category: 'alert' },
];

const dec = s => (s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

function parseRss(xml, feed) {
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const b = m[1];
    const pick = tag => { const x = b.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)</${tag}>`)); return x ? dec(x[1]) : ''; };
    const title = pick('title');
    const link = pick('link');
    const pub = pick('pubDate');
    const srcM = b.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    if (!title || !link) continue;
    const d = pub ? new Date(pub) : new Date();
    out.push({
      title,
      link,
      date: isNaN(d) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10),
      source: srcM ? dec(srcM[1]) : feed.name,
      desc: pick('description').slice(0, 280),
      category: feed.category,
    });
  }
  return out;
}

if (!existsSync(FILE)) { console.error(`الملف غير موجود: ${FILE}`); process.exit(1); }
const doc = JSON.parse(readFileSync(FILE, 'utf8'));
doc.items = Array.isArray(doc.items) ? doc.items : [];
const known = new Set(doc.items.map(i => i.source_url));
const fresh = [];
for (const feed of FEEDS) {
  try {
    const r = await fetch(feed.url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) { console.log(`تخطٍّ (${feed.name}): HTTP ${r.status}`); continue; }
    const items = parseRss(await r.text(), feed);
    let added = 0;
    for (const it of items) {
      if (known.has(it.link) || fresh.some(f => f.link === it.link)) continue;
      fresh.push(it); known.add(it.link); added++;
      if (fresh.length >= MAX_NEW) break;
    }
    console.log(`${feed.name}: ${items.length} عنصرًا، أُضيف ${added}`);
  } catch (e) { console.log(`تخطٍّ (${feed.name}): ${e.message}`); }
  if (fresh.length >= MAX_NEW) break;
}

if (!fresh.length) { console.log('لا أخبار جديدة — الملف لم يتغيّر.'); process.exit(0); }
const stamp = new Date().toISOString().slice(0, 10);
const newItems = fresh.map((it, i) => ({
  id: `${stamp}-auto-${String(i + 1).padStart(3, '0')}`,
  title_ar: '',
  title_en: it.title,
  summary_ar: '',
  summary_en: it.desc,
  source_name: it.source,
  source_url: it.link,
  category: it.category,
  published: it.date,
  status: 'approved',
}));
doc.items = [...newItems, ...doc.items].slice(0, MAX_TOTAL);
doc.last_updated = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
writeFileSync(FILE, JSON.stringify(doc, null, 2) + '\n');
console.log(`أُضيف ${newItems.length} خبرًا جديدًا إلى ${FILE} (المجموع الآن ${doc.items.length}).`);
