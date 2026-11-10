/* VetAI v45 — Front showcase (FIXED 2026-11-10)
 * إصلاحان جوهريان عن النسخة السابقة:
 * 1) التنقّل: النسخة القديمة كانت تبحث عن عناصر تحكّم بسمات [data-view]/[data-target]
 *    وهي سمات غير موجودة أصلًا في الصفحة (التنقّل الحقيقي عبر switchTab)، فكانت
 *    البطاقات الأربع ميتة تمامًا عند النقر. هذه النسخة تنادي switchTab مباشرة.
 * 2) التصميم: بطاقات زجاجية بأسلوب iOS (ضبابية مضبوطة، زوايا 24px، شارة أيقونة
 *    دائرية، حركة ضغط ناعمة) مع احترام prefers-reduced-motion وتقليل الضبابية
 *    على الشاشات الصغيرة لحماية المعالج.
 * Self-mounting: تُدرج القسم في أول #view-home كما كانت النسخة السابقة تمامًا. */
'use strict';
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const CARDS = [
    { icon: '🩺', title: 'محرك التوجيه التشخيصي', view: 'view-ai-diagnostics',
      desc: 'أدخل الأعراض فيرتّب الاحتمالات من أطلس 600 مرض و26 مسارًا تفريقيًا — مع أسباب كل ترتيب وبوابة طوارئ فورية.' },
    { icon: '📡', title: 'رادار الأبحاث VTRI', view: 'view-library',
      desc: 'جاهزية الأبحاث بمؤشر المؤسس المنشور (15 نقطة + علم الأداء الواقعي) وإشارات أدلة باقتباسات حرفية من كل بحث.' },
    { icon: '🔬', title: 'مختبر الصوتيات الحيوية', view: 'view-ai-diagnostics',
      desc: 'حلّل صوت حيوانك على جهازك بالكامل وقارنه بمديات الأدبيات العلمية — قياسات رقمية صادقة، بلا ادعاءات.' },
    { icon: '🛡️', title: 'مشرف الجودة العلمية', view: 'view-library',
      desc: 'تدقيق دائم للمحتوى: اكتمال 99.5% وصفر جرعات خارج دليل الأدوية الاحترافي — اقتراحات فقط، لا نشر تلقائي.' }
  ];
  const STATS = [
    ['600', 'مرض في الأطلس'], ['123', 'مقالًا سريريًا'], ['3,360', 'سؤال اختبار لكل لغة'],
    ['1,000', 'رابط كتاب ومجلة'], ['37', 'دواء بمعيار موحّد'], ['26', 'مسارًا تفريقيًا']
  ];

  /* التنقّل الصحيح: switchTab هو آلية المنصة الوحيدة (أزرارها كلها
     onclick="switchTab('name')"). عند غيابه نبحث عن زر يحمل نفس النداء،
     وكملاذ أخير نُظهر القسم يدويًا ونمرّر إليه. */
  function go(viewId) {
    const name = String(viewId || '').replace(/^view-/, '');
    const target = document.getElementById(viewId);
    try {
      if (typeof window.switchTab === 'function') {
        window.switchTab(name);
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        return;
      }
    } catch (e) { /* نكمل إلى البدائل */ }
    const ctl = document.querySelector('[onclick*="switchTab(\'' + name + '\')"]');
    if (ctl) { ctl.click(); return; }
    if (target) {
      document.querySelectorAll('section[id^="view-"]').forEach(s => { if (s !== target) s.classList.add('hidden'); });
      target.classList.remove('hidden');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const CSS = `
#show45{margin:0 0 18px;padding:22px 18px;border-radius:28px;color:#fff;font-family:inherit;
  background:linear-gradient(135deg,#0b3d2e,#0e5a3c 55%,#0a4a5e);
  box-shadow:0 18px 40px -18px rgba(4,40,28,.55)}
#show45 h2{margin:0 0 6px;font-size:1.45em;color:#fff;letter-spacing:-.01em}
#show45 .sub{color:#eafff3!important;opacity:1;margin:0 0 16px;line-height:1.7}
#show45 .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:12px}
#show45 .card{position:relative;z-index:1;display:block;width:100%;text-align:right;color:#fff;cursor:pointer;
  padding:18px 16px 16px;border-radius:24px;
  background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.28);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 24px -14px rgba(0,0,0,.45);
  -webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%);
  transition:transform .18s ease,background .18s ease,box-shadow .18s ease;
  touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#show45 .card:hover{background:rgba(255,255,255,.17)}
#show45 .card:active{transform:scale(.97);background:rgba(255,255,255,.20)}
#show45 .card:focus-visible{outline:3px solid #ffd166;outline-offset:2px}
#show45 .ic{display:grid;place-items:center;width:52px;height:52px;border-radius:999px;font-size:1.55em;
  background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.4);margin-bottom:10px}
#show45 .card b{display:block;margin:0 0 5px;font-size:1.08em;color:#fff;line-height:1.5}
#show45 .card span.desc{font-size:.9em;color:#f2fff7!important;opacity:1;line-height:1.65;display:block}
#show45 .stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
#show45 .stat{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 12px;font-size:.88em}
#show45 .stat b{font-size:1.05em;color:#ffd166}
#show45 .film{margin:0 0 16px}
#show45 .film video{width:100%;border-radius:20px;border:1px solid rgba(255,255,255,.25);background:#000;display:block}
#show45 .filmcap{margin:8px 2px 0;color:#ffe9a8!important;font-size:.95em}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  #show45 .card{background:rgba(255,255,255,.16)}
}
@media (max-width:480px){
  #show45{padding:18px 14px;border-radius:24px}
  #show45 .card{-webkit-backdrop-filter:blur(10px) saturate(140%);backdrop-filter:blur(10px) saturate(140%)}
}
@media (prefers-reduced-motion:reduce){
  #show45 .card{transition:none}
  #show45 .card:active{transform:none}
}`;

  function mount() {
    const home = document.getElementById('view-home');
    if (!home || document.getElementById('show45')) return;
    const sec = document.createElement('section');
    sec.id = 'show45';
    sec.setAttribute('dir', 'rtl');
    sec.innerHTML =
      '<style>' + CSS + '</style>' +
      '<h2>✨ جديد المنصة — v45: ذكاء بيطري من الطراز العالمي</h2>' +
      '<p class="sub">أربعة محركات جديدة تعمل الآن على المنصة، مبنية بأدلة قابلة للتدقيق وحدود علمية صريحة:</p>' +
      '<div class="film"><video controls preload="none" playsinline poster="assets/promo/poster.jpg"><source src="assets/promo/vetai-film.mp4" type="video/mp4"></video>' +
      '<p class="filmcap">🎬 فيلم المنصة الرسمي — جولة كاملة في فيتاي غلوبال بصوتٍ يشرح كل شيء، مع مؤسسها د. محجوبي عبدالناصر</p></div>' +
      '<div class="grid">' + CARDS.map((c, i) =>
        '<button type="button" class="card" data-show45="' + i + '"><span class="ic" aria-hidden="true">' + c.icon +
        '</span><b>' + c.title + '</b><span class="desc">' + c.desc + '</span></button>').join('') + '</div>' +
      '<div class="stats">' + STATS.map(s => '<span class="stat"><b>' + s[0] + '</b> ' + s[1] + '</span>').join('') + '</div>';
    home.insertBefore(sec, home.firstChild);
    sec.addEventListener('click', e => {
      const btn = e.target.closest('[data-show45]');
      if (btn) go(CARDS[Number(btn.getAttribute('data-show45'))].view);
    });
  }
  window.VetAI_Showcase = { go };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
}
