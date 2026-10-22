// update.js — يعمل تلقائياً داخل GitHub Actions ويحدّث news.json و articles.json و research.json
// لا يلمس تصميم الصفحة أبداً: يغيّر ملفات البيانات فقط.
const fs = require('fs');
const crypto = require('crypto');

// ===== إعدادات يمكنك تغييرها =====
// true  = ينشر المحتوى فوراً (status = approved)
// false = يحفظه pending_review ولا يظهر في الموقع حتى تغيّره أنت إلى approved
const AUTO_APPROVE = { news: true, research: true, articles: true };
const MAX_ITEMS = 40;                       // أقصى عدد عناصر يحتفظ بها كل ملف
const MAX_NEW = { news: 3, research: 2 };   // أقصى عناصر جديدة في كل تشغيل (لحماية الحصة المجانية)
const SITE = 'https://dr-mahdjoubi.github.io/VetAI/';
const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3-flash-preview'];
// ==================================

const KEY = process.env.GEMINI_KEY;
const UA = { 'User-Agent': 'Mozilla/5.0 (VetAI content bot)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const hash = s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);

function decode(t) {
  return String(t || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, '').trim();
}

function readData(file, section) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return { section, last_updated: null, items: [] }; }
}
function saveData(file, data) {
  data.last_updated = new Date().toISOString();
  data.items = data.items
    .sort((a, b) => String(b.published).localeCompare(String(a.published)))
    .slice(0, MAX_ITEMS);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
// عناصر القالب التجريبي (example.com) تُحذف تلقائياً
function clean(data) {
  data.items = (data.items || []).filter(i => i.source_url && !/example\.com/.test(i.source_url));
  return data;
}

async function get(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.text();
}

async function gemini(prompt) {
  if (!KEY) throw new Error('GEMINI_KEY غير موجود في GitHub Secrets');
  for (const model of MODELS) {
    try {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          }),
          signal: AbortSignal.timeout(60000)
        }
      );
      const d = await r.json();
      const text = d.candidates && d.candidates[0] && d.candidates[0].content &&
        d.candidates[0].content.parts.map(p => p.text || '').join('');
      if (text) return JSON.parse(text.replace(/```json|```/g, '').trim());
      console.log('  ' + model + ' لم يعطِ جواباً:', r.status, ((d.error && d.error.message) || '').slice(0, 120));
    } catch (e) { console.log('  ' + model + ' خطأ:', e.message); }
    await sleep(1500);
  }
  return null;
}

// ---------- الأخبار (Google News RSS) ----------
function parseRSS(xml) {
  const out = [];
  (xml.match(/<item>[\s\S]*?<\/item>/g) || []).forEach(it => {
    const g = tag => { const m = it.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>')); return m ? decode(m[1]) : ''; };
    let title = g('title'), source = g('source');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    out.push({ title, link: g('link'), source: source || 'Google News', date: g('pubDate') });
  });
  return out;
}

async function updateNews() {
  console.log('== الأخبار ==');
  const file = 'news.json';
  const data = clean(readData(file, 'news'));
  const have = new Set(data.items.map(i => i.id));
  const queries = ['veterinary', 'animal disease outbreak', 'avian influenza', 'livestock health', 'pet health veterinarians', 'zoonotic disease'];
  const start = new Date().getUTCHours() % queries.length;
  let added = 0;
  for (let k = 0; k < queries.length && added < MAX_NEW.news; k++) {
    const q = queries[(start + k) % queries.length];
    let items = [];
    try {
      const xml = await get('https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:3d') + '&hl=en-US&gl=US&ceid=US:en');
      items = parseRSS(xml);
    } catch (e) { console.log('  تعذّر جلب', q, e.message); continue; }
    for (const it of items) {
      if (added >= MAX_NEW.news) break;
      const id = 'n-' + hash(it.link || it.title);
      if (have.has(id) || !it.title || !it.link) continue;
      const res = await gemini(
        'أنت محرر أخبار بيطرية. لديك عنوان خبر فقط:\n"' + it.title + '"\nالمصدر: ' + it.source + '\n' +
        'أعد JSON فقط بالحقول: title_ar (ترجمة العنوان للعربية)، title_en (العنوان الإنجليزي)، ' +
        'summary_ar (جملة أو جملتان بالعربية)، summary_en (جملة أو جملتان)، category (animal-health أو livestock أو poultry أو pets أو zoonosis). ' +
        'قواعد صارمة: لا تضف أي معلومة غير موجودة في العنوان، لا تخترع أرقاماً أو أسماء، لا نصائح علاجية أو جرعات.'
      );
      if (!res || !res.title_ar || !res.summary_ar) continue;
      data.items.push({
        id, title_ar: res.title_ar, title_en: res.title_en || it.title,
        summary_ar: res.summary_ar, summary_en: res.summary_en || '',
        source_name: it.source, source_url: it.link, category: res.category || 'animal-health',
        published: it.date ? new Date(it.date).toISOString().slice(0, 10) : today(),
        status: AUTO_APPROVE.news ? 'approved' : 'pending_review'
      });
      have.add(id); added++;
      console.log('  + ' + res.title_ar);
      await sleep(2500);
    }
  }
  if (added) saveData(file, data);
  return added;
}

// ---------- الأبحاث (PubMed) ----------
function parsePubmed(xml) {
  return (xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || []).map(a => {
    const one = re => { const m = a.match(re); return m ? decode(m[1]) : ''; };
    const abs = (a.match(/<AbstractText[^>]*>[\s\S]*?<\/AbstractText>/g) || []).map(x => decode(x)).join(' ');
    return { pmid: one(/<PMID[^>]*>(\d+)<\/PMID>/), title: one(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/), journal: one(/<Title>([\s\S]*?)<\/Title>/), abstract: abs };
  });
}

async function updateResearch() {
  console.log('== الأبحاث ==');
  const file = 'research.json';
  const data = clean(readData(file, 'research'));
  const have = new Set(data.items.map(i => i.id));
  const terms = ['veterinary medicine', 'canine disease', 'feline disease', 'livestock infectious disease', 'zoonosis', 'antimicrobial resistance animals', 'poultry disease', 'bovine mastitis'];
  const term = terms[new Date().getUTCHours() % terms.length] + ' AND hasabstract';
  const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  let added = 0;
  try {
    const s = JSON.parse(await get(base + 'esearch.fcgi?db=pubmed&retmode=json&retmax=10&sort=date&datetype=pdat&reldate=90&term=' + encodeURIComponent(term)));
    const ids = ((s.esearchresult && s.esearchresult.idlist) || []).filter(id => !have.has('p-' + id)).slice(0, MAX_NEW.research);
    if (!ids.length) return 0;
    await sleep(500);
    const arts = parsePubmed(await get(base + 'efetch.fcgi?db=pubmed&retmode=xml&id=' + ids.join(',')));
    for (const a of arts) {
      if (!a.abstract || a.abstract.length < 200) continue;
      const res = await gemini(
        'لخّص هذا البحث العلمي بأمانة. العنوان: ' + a.title + '\nالملخص الأصلي: ' + a.abstract.slice(0, 3000) + '\n' +
        'أعد JSON فقط بالحقول: title_ar (ترجمة العنوان)، summary_ar (ثلاث جمل بالعربية تلخّص الهدف والنتيجة الرئيسية فقط)، summary_en (ثلاث جمل). ' +
        'قواعد صارمة: لا تضف أي معلومة أو رقم غير موجود في الملخص، ولا توصيات علاجية أو جرعات.'
      );
      if (!res || !res.title_ar || !res.summary_ar) continue;
      data.items.push({
        id: 'p-' + a.pmid, title_ar: res.title_ar, title_en: a.title,
        summary_ar: res.summary_ar, summary_en: res.summary_en || '',
        source_name: a.journal || 'PubMed', source_url: 'https://pubmed.ncbi.nlm.nih.gov/' + a.pmid + '/',
        category: 'research', published: today(),
        status: AUTO_APPROVE.research ? 'approved' : 'pending_review'
      });
      added++; console.log('  + ' + res.title_ar);
      await sleep(2500);
    }
  } catch (e) { console.log('  خطأ الأبحاث:', e.message); }
  if (added) saveData(file, data);
  return added;
}

// ---------- المقالات (مقال تعليمي كل يوم) ----------
const TOPICS = [
  'التهاب الضرع في الأبقار: الوقاية والعلامات', 'تلقيح الجراء: جدول عام وأسباب أهميته', 'الأمن الحيوي في مزارع الدواجن',
  'السعار: كيف ننتقل من الخوف إلى الوقاية', 'الطفيليات الداخلية عند الأغنام وكيف نحدّ منها', 'العناية بأسنان القطط والكلاب',
  'الإجهاد الحراري عند الماشية والدواجن', 'الأمراض المشتركة بين الإنسان والحيوان', 'تغذية الهريرة والجرو في السنة الأولى',
  'البروسيلا: لماذا يُعد الحليب غير المبستر خطراً', 'علامات الألم عند الحيوانات الأليفة', 'مقاومة المضادات الحيوية والاستخدام الرشيد',
  'الإسعافات الأولية للحيوانات الأليفة', 'إدارة المرعى وتناوب الرعي', 'الجلد العقدي في الأبقار', 'تغذية الأغنام في الشتاء',
  'العناية بالخيول: الحوافر والأسنان', 'مكافحة القراد والبراغيث', 'الإنفلونزا الطيرية وكيف تحمي مزرعتك',
  'الولادة الطبيعية عند الأبقار ومتى نستدعي الطبيب', 'الصحة الواحدة One Health', 'السمّيات النباتية والمنزلية للحيوانات',
  'أهمية اللبأ لحديثي الولادة', 'سمنة الحيوانات الأليفة', 'التعامل الآمن مع الحيوانات المصابة', 'الكشف المبكر عن العرج في الماشية',
  'التهابات الأذن عند الكلاب', 'تربية الأرانب: الصحة والتغذية', 'تربية النحل: الأمراض الشائعة', 'صحة الإبل: أبرز الأمراض والوقاية'
];

async function updateArticles() {
  console.log('== المقالات ==');
  const file = 'articles.json';
  const data = clean(readData(file, 'articles'));
  const id = 'a-' + today();
  if (data.items.some(i => i.id === id)) { console.log('  مقال اليوم موجود'); return 0; }
  const d = new Date(), n = Math.floor((d - new Date(d.getUTCFullYear(), 0, 0)) / 864e5);
  const topic = TOPICS[n % TOPICS.length];
  const res = await gemini(
    'اكتب مقالاً تعليمياً أصلياً للمربين وطلاب الطب البيطري عن: "' + topic + '".\n' +
    'أعد JSON فقط بالحقول: title_ar، title_en، summary_ar (نحو 130 إلى 170 كلمة بالعربية الواضحة، بفقرتين قصيرتين)، summary_en (جملتان). ' +
    'قواعد صارمة: لا جرعات دوائية ولا أسماء أدوية محددة، لا أرقام أو إحصاءات غير مؤكدة، واختم بجملة تنصح بمراجعة الطبيب البيطري عند الشك.'
  );
  if (!res || !res.title_ar || !res.summary_ar) return 0;
  data.items.push({
    id, title_ar: res.title_ar, title_en: res.title_en || topic,
    summary_ar: res.summary_ar, summary_en: res.summary_en || '',
    source_name: 'مقال تعليمي مولَّد بالذكاء الاصطناعي', source_url: SITE,
    category: 'education', published: today(),
    status: AUTO_APPROVE.articles ? 'approved' : 'pending_review'
  });
  saveData(file, data);
  console.log('  + ' + res.title_ar);
  return 1;
}

// ---------- sitemap ----------
function touchSitemap() {
  try {
    const f = 'sitemap.xml';
    let x = fs.readFileSync(f, 'utf8');
    const y = x.replace(/<lastmod>[^<]*<\/lastmod>/g, '<lastmod>' + today() + '</lastmod>');
    if (y !== x) { fs.writeFileSync(f, y, 'utf8'); console.log('تم تحديث sitemap.xml'); }
  } catch (e) { console.log('sitemap:', e.message); }
}

async function main() {
  let total = 0;
  for (const fn of [updateNews, updateResearch, updateArticles]) {
    try { total += await fn(); } catch (e) { console.log('فشل قسم:', e.message); }
  }
  if (total) touchSitemap();
  console.log('انتهى. عناصر جديدة:', total);
}

if (require.main === module) main();
else module.exports = { parseRSS, parsePubmed, decode };
