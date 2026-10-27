// gen-articles.mjs — يولّد صفحات HTML مستقلة قابلة للفهرسة لكل مقال في المرجع السريري.
// المصدر: مصفوفة R الأساسية وملحقاتها داخل index.html + مصفوفة EXTRA في js/extra-articles.js.
// المخرجات: articles/<slug>.html لكل مقال + articles/index.html + articles/manifest.json + sitemap.xml محدّثة.
// الروابط (slugs) ثابتة عبر manifest: لا تتغير أبدًا بعد إسنادها لعنوان ما.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const ROOT = process.cwd();
const BASE = 'https://drvet.onrender.com';
const TOPICS = ['أمراض معدية', 'الطفيليات', 'اضطرابات الأيض', 'أمراض الجهاز الهضمي', 'أمراض الضرع والتناسل', 'أمراض الجلد', 'القلب والتنفس', 'العظام والمفاصل', 'الكلى والمسالك البولية', 'الأعصاب', 'الغدد الصماء'];
const FIELDS = ['التعريف', 'المسبب', 'الأعراض', 'التشخيص', 'المبدأ العلاجي (بإشراف الطبيب البيطري)', 'نقاط مهمة', 'ملخص للمربي'];

// استخراج مصفوفة حرفية من نص: موازنة الأقواس مع احترام السلاسل النصية
function extractArray(text, startIdx) {
  let depth = 0, inStr = false, esc = false;
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return text.slice(startIdx, i + 1); }
  }
  throw new Error('unbalanced array at ' + startIdx);
}
function evalLiteral(lit) { return Function('"use strict"; return (' + lit + ')')(); }
function isArticleRow(r) {
  return Array.isArray(r) && r.length === 10 && typeof r[0] === 'string' && typeof r[2] === 'string' &&
    Number.isInteger(Number(r[9])) && Number(r[9]) >= 0 && Number(r[9]) <= 10;
}

const indexHtml = readFileSync(ROOT + '/index.html', 'utf8');
const rows = [];

// 1) المصفوفة الأساسية R
const baseAnchor = indexHtml.indexOf('(function(){const R=[');
if (baseAnchor < 0) throw new Error('base R anchor not found');
rows.push(...evalLiteral(extractArray(indexHtml, indexHtml.indexOf('[', baseAnchor))));

// 2) ملحقات var A داخل كتل __refR (بترتيب ظهورها في الملف)
let pos = 0;
while (true) {
  const k = indexHtml.indexOf('var R=window.__refR', pos);
  if (k < 0) break;
  const aIdx = indexHtml.indexOf('var A=[', k);
  if (aIdx < 0 || aIdx > k + 120) { pos = k + 10; continue; }
  const arr = evalLiteral(extractArray(indexHtml, indexHtml.indexOf('[', aIdx)));
  if (arr.length && arr.every(isArticleRow)) rows.push(...arr);
  pos = aIdx + 10;
}

// 3) مقالات EXTRA
const extraJs = readFileSync(ROOT + '/js/extra-articles.js', 'utf8');
const exAnchor = extraJs.indexOf('var EXTRA = [');
if (exAnchor < 0) throw new Error('EXTRA anchor not found');
rows.push(...evalLiteral(extractArray(extraJs, extraJs.indexOf('[', exAnchor))));

// دمج مع إزالة التكرار بالعنوان (أول ظهور يفوز — مثل سلوك الموقع)
const seen = new Set(), articles = [];
for (const r of rows) { if (!seen.has(r[0])) { seen.add(r[0]); articles.push(r); } }

// manifest ثابت للروابط
mkdirSync(ROOT + '/articles', { recursive: true });
const manifestPath = ROOT + '/articles/manifest.json';
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
let maxN = 0;
for (const s of Object.values(manifest)) { const n = parseInt(String(s).slice(1), 10); if (n > maxN) maxN = n; }
for (const r of articles) if (!manifest[r[0]]) manifest[r[0]] = 'a' + String(++maxN).padStart(3, '0');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');

const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugOf = (title) => manifest[title];
const urlOf = (title) => BASE + '/articles/' + slugOf(title) + '.html';
const today = new Date().toISOString().slice(0, 10);

const CSS = `:root{--bg:#f7f9fb;--fg:#17222b;--mut:#5a6b78;--card:#fff;--bd:#dbe3ea;--ac:#0f766e;--warn:#fff4e0;--warnbd:#e8b45c}
@media (prefers-color-scheme:dark){:root{--bg:#0f1519;--fg:#e6edf2;--mut:#98a8b4;--card:#18222a;--bd:#2a3944;--ac:#4fd1c0;--warn:#2d2410;--warnbd:#8a6a24}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;line-height:1.9}
.w{max-width:880px;margin:0 auto;padding:16px}a{color:var(--ac)}
.top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.badge{display:inline-block;background:var(--card);border:1px solid var(--bd);border-radius:999px;padding:2px 12px;font-size:.85rem;color:var(--mut);margin:2px}
h1{font-size:1.55rem;margin:.35em 0;line-height:1.5}h2{font-size:1.15rem;color:var(--ac);margin:1.4em 0 .3em}
article{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:18px 20px}
.warn{background:var(--warn);border:1px solid var(--warnbd);border-radius:12px;padding:10px 14px;margin:14px 0;font-size:.92rem}
.nav{display:flex;justify-content:space-between;gap:10px;margin:16px 0;flex-wrap:wrap}
.nav a{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:8px 14px;text-decoration:none;font-size:.92rem}
.rel a{display:inline-block;margin:3px 0}
footer{color:var(--mut);font-size:.85rem;margin:22px 0 8px;text-align:center}`;

function page(r, i) {
  const title = r[0], species = r[1], topic = TOPICS[Number(r[9])] || '';
  const desc = String(r[2]).slice(0, 155);
  const url = urlOf(title);
  const sections = FIELDS.map((h, k) => '<h2>' + esc(h) + '</h2><p>' + esc(r[2 + k]) + '</p>').join('\n');
  const prev = articles[i - 1], next = articles[i + 1];
  const rel = articles.filter((x, j) => j !== i && Number(x[9]) === Number(r[9])).slice(0, 6);
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'MedicalWebPage', name: title, description: desc, url, inLanguage: 'ar', author: { '@type': 'Person', name: 'د. محجوبي عبدالناصر' }, publisher: { '@type': 'Organization', name: 'VetAI Global' } });
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — المرجع السريري البيطري · VetAI Global</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)} — المرجع السريري البيطري">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${ld}</script>
<style>${CSS}</style>
</head>
<body>
<div class="w">
<div class="top"><a href="${BASE}/"><b>VetAI Global</b> — منصة الطب البيطري</a><a href="${BASE}/articles/">كل المقالات</a></div>
<article>
<h1>${esc(title)}</h1>
<div><span class="badge">الأنواع: ${esc(species)}</span><span class="badge">الموضوع: ${esc(topic)}</span></div>
${sections}
<div class="warn">محتوى تعليمي عام من المرجع السريري لمنصة VetAI Global بإشراف د. محجوبي عبدالناصر — لا يغني عن فحص الطبيب البيطري وتشخيصه، والعلاج يقرره الطبيب بعد المعاينة.</div>
</article>
<div class="nav">${prev ? '<a href="' + urlOf(prev[0]) + '">→ السابق: ' + esc(prev[0]) + '</a>' : '<span></span>'}${next ? '<a href="' + urlOf(next[0]) + '">التالي: ' + esc(next[0]) + ' ←</a>' : ''}</div>
${rel.length ? '<div class="rel"><h2>مقالات ذات صلة</h2>' + rel.map((x) => '<a href="' + urlOf(x[0]) + '">' + esc(x[0]) + '</a><br>').join('') + '</div>' : ''}
<footer>VetAI Global · المرجع السريري البيطري · <a href="${BASE}/">العودة إلى المنصة</a></footer>
</div>
</body>
</html>
`;
}

articles.forEach((r, i) => writeFileSync(ROOT + '/articles/' + slugOf(r[0]) + '.html', page(r, i)));

// صفحة الفهرس مجمّعة بالمواضيع
const groups = TOPICS.map((t, ti) => {
  const items = articles.filter((r) => Number(r[9]) === ti);
  if (!items.length) return '';
  return '<h2>' + esc(t) + ' (' + items.length + ')</h2>' + items.map((r) => '<p style="margin:4px 0"><a href="' + urlOf(r[0]) + '">' + esc(r[0]) + '</a> <span class="badge">' + esc(r[1]) + '</span></p>').join('');
}).join('\n');
writeFileSync(ROOT + '/articles/index.html', `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>المرجع السريري البيطري — كل المقالات · VetAI Global</title>
<meta name="description" content="فهرس مقالات المرجع السريري البيطري في منصة VetAI Global: ${articles.length} مقالًا في الأمراض المعدية والطفيليات والأيض والهضم والضرع والتناسل وغيرها، بإشراف د. محجوبي عبدالناصر.">
<link rel="canonical" href="${BASE}/articles/">
<meta property="og:type" content="website">
<meta property="og:title" content="المرجع السريري البيطري — كل المقالات">
<meta property="og:url" content="${BASE}/articles/">
<meta property="og:image" content="${BASE}/og-image.jpg">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="w">
<div class="top"><a href="${BASE}/"><b>VetAI Global</b> — منصة الطب البيطري</a></div>
<h1>المرجع السريري البيطري — كل المقالات (${articles.length})</h1>
${groups}
<footer>VetAI Global · <a href="${BASE}/">العودة إلى المنصة</a></footer>
</div>
</body>
</html>
`);

// خريطة الموقع
const urls = [
  [BASE + '/', '1.0', 'weekly'], [BASE + '/study-pets.html', '0.8', 'monthly'], [BASE + '/study-farm.html', '0.8', 'monthly'], [BASE + '/study-poultry.html', '0.8', 'monthly'],
  [BASE + '/articles/', '0.8', 'weekly'], ...articles.map((r) => [urlOf(r[0]), '0.6', 'monthly'])
];
writeFileSync(ROOT + '/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(([u, p, f]) => '  <url>\n    <loc>' + u + '</loc>\n    <lastmod>' + today + '</lastmod>\n    <changefreq>' + f + '</changefreq>\n    <priority>' + p + '</priority>\n  </url>').join('\n') + '\n</urlset>\n');

console.log('articles generated:', articles.length);
