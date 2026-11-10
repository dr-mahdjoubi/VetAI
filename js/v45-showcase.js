/* VetAI v45 — Front showcase: everything new, organized at the front of the home view.
   Self-mounting section inserted as the FIRST block of #view-home: a headline
   strip for the v45 engines with live-verifiable platform numbers, each card
   navigating to its real section. Navigation uses the site's own controls
   when present (elements pointing at the target view), with a scroll
   fallback; it never invents routes.                                     */
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
  function go(viewId) {
    const target = document.getElementById(viewId);
    if (!target) return;
    const ctl = document.querySelector('[data-view="' + viewId + '"],[data-target="' + viewId + '"],a[href="#' + viewId + '"]');
    if (ctl) { ctl.click(); setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 120); }
    else target.scrollIntoView({ behavior: 'smooth' });
  }
  function mount() {
    const home = document.getElementById('view-home');
    if (!home || document.getElementById('show45')) return;
    const sec = document.createElement('section');
    sec.id = 'show45';
    sec.setAttribute('dir', 'rtl');
    sec.innerHTML =
      '<style>' +
      '#show45{margin:0 0 18px;padding:20px 16px;border-radius:16px;background:linear-gradient(135deg,#0b3d2e,#0e5a3c 55%,#0a4a5e);color:#fff;font-family:inherit}' +
      '#show45 h2{margin:0 0 6px;font-size:1.45em;color:#fff}#show45 .sub{color:#eafff3!important;opacity:1;margin:0 0 14px}' +
      '#show45 .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}' +
      '#show45 .card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:12px;text-align:right;color:#fff;cursor:pointer;width:100%}' +
      '#show45 .card:hover{background:rgba(255,255,255,.16)}#show45 .ic{font-size:1.7em}' +
      '#show45 .card b{display:block;margin:6px 0 4px;font-size:1.05em;color:#fff}#show45 .card span{font-size:.9em;color:#f2fff7!important;opacity:1;line-height:1.5;display:block}' +
      '#show45 .stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}' +
      '#show45 .stat{background:rgba(0,0,0,.25);border-radius:999px;padding:5px 12px;font-size:.88em}' +
      '#show45 .stat b{font-size:1.05em;color:#ffd166}' +
      '#show45 .film{margin:0 0 14px}#show45 .film video{width:100%;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:#000;display:block}' +
      '#show45 .filmcap{margin:8px 2px 0;color:#ffe9a8!important;font-size:.95em}' +
      '</style>' +
      '<h2>✨ جديد المنصة — v45: ذكاء بيطري من الطراز العالمي</h2>' +
      '<p class="sub">أربعة محركات جديدة تعمل الآن على المنصة، مبنية بأدلة قابلة للتدقيق وحدود علمية صريحة:</p>' +
      '<div class="film"><video controls preload="none" playsinline poster="assets/promo/poster.jpg"><source src="assets/promo/vetai-film.mp4" type="video/mp4"></video>' +
      '<p class="filmcap">🎬 فيلم المنصة الرسمي — جولة كاملة في فيتاي غلوبال بصوتٍ يشرح كل شيء، مع مؤسسها د. محجوبي عبدالناصر</p></div>' +
      '<div class="grid">' + CARDS.map((c, i) =>
        '<button type="button" class="card" data-show45="' + i + '"><span class="ic">' + c.icon + '</span><b>' + c.title + '</b><span>' + c.desc + '</span></button>').join('') + '</div>' +
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
