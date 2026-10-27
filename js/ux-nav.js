/* VetAI UX Nav — ملاح تجربة الاستخدام للوثيقة الطويلة
   ثلاثة عناصر تعمل على أي قسم مفتوح دون أي تعديل في بنية الصفحات:
   1) شريط تقدم القراءة أعلى الشاشة.
   2) قائمة «أقسام الصفحة» تُبنى تلقائيًا من عناوين القسم الظاهر (h2/h3)
      وتنقل الزائر بسلاسة إلى أي عنوان — علاج مباشر لطول الوثيقة.
   3) زر العودة إلى الأعلى يظهر بعد التمرير. */
'use strict';
(function () {
  if (window.__vetaiUxNavLoaded) return;
  window.__vetaiUxNavLoaded = true;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var bar = el('div', 'un-progress');
  var barFill = el('div', 'un-progress-fill');
  bar.appendChild(barFill);
  document.body.appendChild(bar);

  var stack = el('div', 'un-stack');
  var topBtn = el('button', 'un-btn un-hidden', '⬆ الأعلى');
  topBtn.type = 'button';
  topBtn.setAttribute('aria-label', 'العودة إلى أعلى الصفحة');
  var menuBtn = el('button', 'un-btn', '🧭 أقسام الصفحة');
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-label', 'فتح قائمة أقسام الصفحة الحالية');
  var panel = el('div', 'un-panel un-hidden');
  panel.setAttribute('role', 'menu');
  stack.appendChild(panel);
  stack.appendChild(topBtn);
  stack.appendChild(menuBtn);
  document.body.appendChild(stack);

  /* شريط التقدم + زر الأعلى (مقيد بإطار رسم واحد لكل تمرير) */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      barFill.style.width = p + '%';
      if (h.scrollTop > 600) topBtn.classList.remove('un-hidden');
      else topBtn.classList.add('un-hidden');
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* بناء قائمة الأقسام من عناوين الواجهة الظاهرة حاليًا */
  var headingSeq = 0;
  function isShown(el) {
    if (!el || !el.getClientRects().length) return false;
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  function collectHeadings() {
    /* النطاق = أول واجهة ظاهرة فعليًا على الشاشة (لا آخر واجهة في ترتيب الصفحة) */
    var scope = null;
    document.querySelectorAll('[id^="view-"]').forEach(function (v) {
      if (!scope && isShown(v) && v.querySelectorAll('h2, h3').length) scope = v;
    });
    if (!scope) scope = document.body;
    var list = [];
    scope.querySelectorAll('h2, h3').forEach(function (hd) {
      if (!isShown(hd)) return;
      var txt = (hd.textContent || '').trim().replace(/\s+/g, ' ');
      if (txt.length < 3 || txt.length > 80) return;
      if (!hd.id) { headingSeq++; hd.id = 'un-sec-' + headingSeq; }
      list.push({ id: hd.id, text: txt, level: hd.tagName });
    });
    return list.slice(0, 24);
  }
  /* تمرير مضمون عبر كل المتصفحات: نحسب الموضع يدويًا ونمرّر نافذة الصفحة
     وأي حاوية قابلة للتمرير فوق العنوان، مع قفزة فورية احتياطية عند الحاجة */
  function scrollToHeading(t) {
    if (!t) return;
    var offset = 84;
    function attempt() {
      var r = t.getBoundingClientRect();
      var y = r.top + (window.scrollY || window.pageYOffset || 0) - offset;
      var p = t.parentElement;
      while (p && p !== document.body) {
        var cs = getComputedStyle(p);
        if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && p.scrollHeight > p.clientHeight) {
          p.scrollTop += r.top - p.getBoundingClientRect().top - offset;
          r = t.getBoundingClientRect();
          y = r.top + (window.scrollY || window.pageYOffset || 0) - offset;
        }
        p = p.parentElement;
      }
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
    attempt();
    setTimeout(function () {
      var r2 = t.getBoundingClientRect();
      if (r2.top < -40 || r2.top > window.innerHeight) {
        var y2 = r2.top + (window.scrollY || window.pageYOffset || 0) - offset;
        window.scrollTo(0, Math.max(0, y2));
      }
    }, 650);
  }
  function renderPanel() {
    panel.innerHTML = '';
    var items = collectHeadings();
    if (!items.length) {
      panel.appendChild(el('div', 'un-empty', 'لا أقسام فرعية في هذه الواجهة'));
      return;
    }
    items.forEach(function (it) {
      var b = el('button', 'un-item' + (it.level === 'H3' ? ' un-sub' : ''), it.text);
      b.type = 'button';
      b.addEventListener('click', function () {
        var t = document.getElementById(it.id);
        panel.classList.add('un-hidden');
        if (t) setTimeout(function () { scrollToHeading(t); }, 60);
      });
      panel.appendChild(b);
    });
  }
  menuBtn.addEventListener('click', function () {
    if (panel.classList.contains('un-hidden')) { renderPanel(); panel.classList.remove('un-hidden'); }
    else panel.classList.add('un-hidden');
  });
  document.addEventListener('click', function (e) {
    if (!stack.contains(e.target)) panel.classList.add('un-hidden');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') panel.classList.add('un-hidden');
  });
})();
