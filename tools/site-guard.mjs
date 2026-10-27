#!/usr/bin/env node
/**
 * VetAI Site Guard — فاحص صحة وسلامة موقع VetAI Global
 * يعمل بلا أي مكتبات خارجية (Node 18+).
 *
 * الاستخدام:
 *   node tools/site-guard.mjs [--base https://vetai.vcom.workers.dev] [--out data/manager-report.json]
 *
 * يفحص: المرايا الحية، ملفات البيانات (JSON) وبنيتها وأعدادها، خريطة الموقع،
 * ملف تحقق Google، الروابط الداخلية في الصفحة الرئيسية، وحجم/سرعة الصفحة، ومحرك الذكاء الاصطناعي (حيًّا).
 * يكتب تقريرًا موحّدًا (manager-report.json) تقرأه لوحة المدير الخفية،
 * ويخرج برمز 1 عند وجود فشل (لتفتح GitHub Actions بلاغًا تلقائيًا).
 */
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const BASE = opt('base', 'https://vetai.vcom.workers.dev').replace(/\/$/, '');
const OUT = opt('out', 'data/manager-report.json');
const UA = 'VetAI-SiteGuard/1.0 (+https://vetai.vcom.workers.dev)';

/* القيم المرجعية المتوقعة — حدّثها عند أي نشر يغيّر المحتوى عمدًا */
const EXPECTED = {
  titlePart: 'VetAI Global',
  mediaCount: 53,
  galleryCount: 53,
  verifyBody: 'google-site-verification: googlea35966b2c860f617.html',
  sitemapMustContain: 'drvet.onrender.com',
  homeMaxKB: 1800,
  homeWarnMs: 3500,
};

const MIRRORS = [
  { name: 'Cloudflare — الرئيسي', url: 'https://vetai.vcom.workers.dev/' },
  { name: 'Render — drvet', url: 'https://drvet.onrender.com/' },
  { name: 'Vercel', url: 'https://dr-vetai.vercel.app/' },
  { name: 'GitHub Pages', url: 'https://dr-mahdjoubi.github.io/VetAI/' },
];

const checks = [];
const changes = [];
function add(id, label, status, detail) {
  checks.push({ id, label, status, detail });
  console.log(`${status === 'ok' ? '✅' : status === 'warn' ? '⚠️' : '❌'} ${label} — ${detail}`);
}
async function get(url, { timeout = 20000 } = {}) {
  const t0 = Date.now();
  const r = await fetch(url, {
    headers: { 'user-agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeout),
  });
  const body = await r.text();
  return { status: r.status, body, ms: Date.now() - t0 };
}

/* ---------- 1) المرايا الحية ---------- */
for (const m of MIRRORS) {
  try {
    const { status, body, ms } = await get(m.url);
    const okTitle = body.includes(EXPECTED.titlePart);
    if (status === 200 && okTitle) add('mirror', `مرآة ${m.name}`, 'ok', `HTTP ${status} · ${ms}ms · العنوان سليم`);
    else add('mirror', `مرآة ${m.name}`, 'fail', `HTTP ${status} · العنوان ${okTitle ? 'سليم' : 'غير متوقع'}`);
  } catch (e) {
    add('mirror', `مرآة ${m.name}`, 'fail', `تعذّر الوصول: ${e.message}`);
  }
}

/* ---------- 2) ملفات البيانات ---------- */
const counts = {};
async function jsonCheck(path, label, pick) {
  try {
    const { status, body } = await get(BASE + path);
    if (status !== 200) return add('data', label, 'fail', `HTTP ${status}`);
    let data;
    try { data = JSON.parse(body); } catch { return add('data', label, 'fail', 'JSON غير صالح'); }
    const { count, note } = pick(data);
    counts[label] = count;
    add('data', label, 'ok', note);
  } catch (e) { add('data', label, 'fail', e.message); }
}
await jsonCheck('/data/media.json', 'فيديوهات الوسائط', d => {
  const items = Array.isArray(d) ? d : d.videos || d.items || [];
  if (items.length !== EXPECTED.mediaCount) changes.push(`عدد الفيديوهات تغيّر: ${EXPECTED.mediaCount} ← ${items.length} (تحقق إن كان مقصودًا)`);
  return { count: items.length, note: `${items.length} عنصرًا` };
});
await jsonCheck('/data/gallery.json', 'صور المعرض', d => {
  const items = Array.isArray(d) ? d : d.photos || d.items || [];
  if (items.length !== EXPECTED.galleryCount) changes.push(`عدد الصور تغيّر: ${EXPECTED.galleryCount} ← ${items.length} (تحقق إن كان مقصودًا)`);
  return { count: items.length, note: `${items.length} عنصرًا` };
});
await jsonCheck('/data/species.json', 'بيانات الأنواع', d => {
  const sp = d.species || [];
  const withSound = sp.filter(s => s.sound).length;
  return { count: sp.length, note: `${sp.length} أنواع · ${withSound} بأصوات` };
});
await jsonCheck('/json/news.json', 'شريط الأخبار', d => {
  const items = d.items || [];
  const bad = items.filter(i => !i.title_ar && !i.title_en || !i.source_url).length;
  return { count: items.length, note: `${items.length} خبرًا · آخر تحديث ${d.last_updated || '؟'}${bad ? ` · ⚠️ ${bad} بعناوين/روابط ناقصة` : ''}` };
});

/* ---------- 3) ملف تحقق Google ---------- */
try {
  const { status, body } = await get(BASE + '/googlea35966b2c860f617.html');
  if (status === 200 && body.trim() === EXPECTED.verifyBody) add('verify', 'ملف تحقق Search Console', 'ok', 'موجود وبالمحتوى الصحيح — لا تحذفه أبدًا');
  else add('verify', 'ملف تحقق Search Console', 'fail', `HTTP ${status} أو محتوى مختلف — الملكية المثبتة في خطر`);
} catch (e) { add('verify', 'ملف تحقق Search Console', 'fail', e.message); }

/* ---------- 4) خريطة الموقع ---------- */
try {
  const { status, body } = await get(BASE + '/sitemap.xml');
  const ok = status === 200 && body.includes('<urlset') && body.includes(EXPECTED.sitemapMustContain);
  add('sitemap', 'خريطة الموقع', ok ? 'ok' : 'fail', ok ? 'صالحة وتشير إلى النطاق الحالي' : `HTTP ${status} أو محتوى غير متوقع`);
} catch (e) { add('sitemap', 'خريطة الموقع', 'fail', e.message); }

/* ---------- 5) الصفحة الرئيسية: الحجم والسرعة والروابط الداخلية ---------- */
let home = null;
try {
  home = await get(BASE + '/');
  const kb = Math.round(Buffer.byteLength(home.body) / 1024);
  const st = home.ms > EXPECTED.homeWarnMs ? 'warn' : 'ok';
  add('perf', 'أداء الصفحة الرئيسية', kb > EXPECTED.homeMaxKB ? 'warn' : st,
    `${kb}KB · ${home.ms}ms${kb > EXPECTED.homeMaxKB ? ' · الحجم فوق الحد المرجعي' : ''}`);
} catch (e) { add('perf', 'أداء الصفحة الرئيسية', 'fail', e.message); }

if (home) {
  const refs = new Set();
  for (const m of home.body.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const u = m[1];
    if (/^(https?:)?\/\//.test(u) || /^(mailto|tel|data|javascript):/.test(u)) continue;
    refs.add(u.split('?')[0]);
  }
  const list = [...refs].slice(0, 60);
  const broken = [];
  for (const rel of list) {
    try {
      const r = await fetch(new URL(rel, BASE + '/'), {
        method: 'GET', headers: { 'user-agent': UA }, redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
      if (r.status >= 400) broken.push(`${rel} (${r.status})`);
    } catch { broken.push(`${rel} (تعذّر)`); }
  }
  if (broken.length === 0) add('links', 'الروابط الداخلية', 'ok', `فُحص ${list.length} مرجعًا داخليًا — لا كسور`);
  else add('links', 'الروابط الداخلية', 'fail', `مكسورة: ${broken.join(' · ')}`);
}


/* ---------- 6) محرك الذكاء الاصطناعي: التوجيه حي + إجابة فعلية ---------- */
try {
  const eng = await get(BASE + '/js/ai-engine.js');
  const routingOk = eng.status === 200 && eng.body.includes('viaFree') && eng.body.includes('withTimeout(viaFree(question');
  if (!routingOk) add('ai', 'محرك الذكاء — ملف التوجيه', 'fail', `HTTP ${eng.status} أو ترتيب المسارات تغيّر (المجاني أولًا مطلوب)`);
  else {
    let okProbe = false, lastStatus = 0, tries = 0;
    while (!okProbe && tries < 2) {
      tries++;
      try {
        const r = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'user-agent': UA },
          body: JSON.stringify({ model: 'openai', messages: [{ role: 'user', content: 'أجب بكلمة واحدة: ما عاصمة الجزائر؟' }], temperature: 0.2 }),
          signal: AbortSignal.timeout(45000),
        });
        lastStatus = r.status;
        const j = await r.json().catch(() => null);
        const txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        okProbe = r.ok && !!txt && !!String(txt).trim();
      } catch (e) { lastStatus = 0; }
      if (!okProbe && tries < 2) await new Promise(res => setTimeout(res, 8000));
    }
    if (okProbe) add('ai', 'محرك الذكاء — إجابة حية', 'ok', `المسار المجاني يجيب فعليًا (بعد ${tries} محاولة)`);
    else add('ai', 'محرك الذكاء — إجابة حية', 'fail', `المسار المجاني لا يجيب بعد محاولتين (آخر HTTP ${lastStatus}) — ميزات الذكاء ستسقط إلى المراجع`);
  }
} catch (e) { add('ai', 'محرك الذكاء — إجابة حية', 'fail', e.message); }
try {
  const r = await fetch('https://vetai-chat.dr-mahdjoubi.workers.dev/', { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) });
  const acao = r.headers.get('access-control-allow-origin') || '';
  if (acao === '*' || acao.includes('vetai.vcom.workers.dev')) add('ai', 'الوسيط الاحتياطي vetai-chat', 'ok', `CORS يسمح بالنطاق الرسمي (${acao})`);
  else add('ai', 'الوسيط الاحتياطي vetai-chat', 'warn', `CORS مقصور على «${acao || 'لا شيء'}» — الاحتياطي لا يعمل من النطاق الرسمي (غير حرج: لم يعد الأساسي)`);
} catch (e) { add('ai', 'الوسيط الاحتياطي vetai-chat', 'warn', `تعذّر فحصه: ${e.message}`); }

/* ---------- التقرير ---------- */
const fails = checks.filter(c => c.status === 'fail').length;
const warns = checks.filter(c => c.status === 'warn').length;
const report = {
  generatedAt: new Date().toISOString(),
  generator: 'tools/site-guard.mjs',
  base: BASE,
  overall: fails ? 'fail' : warns || changes.length ? 'warn' : 'ok',
  counts,
  changes,
  checks,
};
writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(`\nالتقرير كُتب إلى ${OUT} — الحالة العامة: ${report.overall} (${checks.length} فحصًا، ${fails} فشل، ${warns} تنبيه)`);
process.exit(fails ? 1 : 0);
