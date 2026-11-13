/* ============================================================
   VetAI v7 — حقن الصور الفوتوغرافية (STAGING — NOT deployed)
   يضيف صورة حقيقية عالية الدقة أعلى كل بطاقة أداة/عنصر، دون
   تغيير أي نص أو وظيفة أو بيانات: الإضافة عنصر <span> واحد
   في أعلى البطاقة فقط. كل الروابط مُتحقق منها (HTTP 200).
   فشل أي صورة = تُزال بهدوء وتبقى البطاقة الأصلية كما هي.
   إيقاف مؤقت: أضف ?v7photos=off إلى الرابط.
   ============================================================ */
(function () {
  'use strict';
  if (window.__v7photos) return;
  window.__v7photos = true;
  if (/[?&]v7photos=off/.test(location.search)) return;

  var U = function (id) {
    return 'assets/unsplash/' + id + '.webp';
  };

  /* أبعاد WebP المحلية الحقيقية (مقاسة بعد التحويل) — تُستخدم لسمتَي width/height */
  var DIMS = {
    '1434030216411-0b793f4b4173': [800, 534],
    '1444464666168-49d633b86797': [800, 534],
    '1456513080510-7bf3a84b82f8': [800, 602],
    '1471864190281-a93a3070b6de': [800, 534],
    '1505751172876-fa1923c5c528': [800, 534],
    '1507842217343-583bb7270b66': [800, 470],
    '1516467508483-a7212febe31a': [800, 532],
    '1531746790731-6c087fecd65a': [800, 576],
    '1532187863486-abf9dbad1b69': [800, 534],
    '1535591273668-578e31182c4f': [800, 534],
    '1541339907198-e08756dedf3f': [800, 534],
    '1548199973-03cce0bbc87b': [1280, 854],
    '1552053831-71594a27632d': [900, 1444],
    '1552728089-57bdde30beb3': [900, 1230],
    '1553284965-83fd3e82fa5a': [900, 600],
    '1562774053-701939374585': [800, 524],
    '1576201836106-db1758fd1c97': [900, 600],
    '1579154204601-01588f351e67': [800, 534],
    '1584308666744-24d5c474f2ae': [800, 560],
    '1585110396000-c9ffd4e4b308': [900, 1350]
  };

  /* --- خريطة الصور: هدف البطاقة ← صورة موثقة --- */
  var QA = { /* بطاقات الوصول السريع (.bento > .qa) حسب onclick */
    'ai-diagnostics': [U('1576201836106-db1758fd1c97'), 'جرو أثناء الفحص البيطري'],
    'chat':           [U('1531746790731-6c087fecd65a'), 'مساعد ذكاء اصطناعي'],
    'ref':            [U('1505751172876-fa1923c5c528'), 'سماعة طبية'],
    'drugs':          [U('1584308666744-24d5c474f2ae'), 'أدوية وكبسولات'],
    'dxlab':          [U('1579154204601-01588f351e67'), 'مجهر مختبر'],
    'bio':            [U('1444464666168-49d633b86797'), 'طائر يغرّد'],
    'exams':          [U('1434030216411-0b793f4b4173'), 'كتابة ملاحظات دراسية'],
    'pets':           [U('1548199973-03cce0bbc87b'), 'كلاب تلعب'],
    'library':        [U('1507842217343-583bb7270b66'), 'مكتبة كتب'],
    'knowledge':      [U('1532187863486-abf9dbad1b69'), 'مختبر أبحاث'],
    'showUni':        [U('1562774053-701939374585'), 'مبنى جامعي']
  };
  var SHOW45 = [ /* بطاقات واجهة v45 حسب الترتيب */
    [U('1552053831-71594a27632d'), 'جرو ذهبي'],
    [U('1456513080510-7bf3a84b82f8'), 'باحث يدرس الأبحاث'],
    [U('1552728089-57bdde30beb3'), 'ببغاء ملوّن'],
    [U('1471864190281-a93a3070b6de'), 'زجاجات أدوية']
  ];
  var KEYWORDS = [ /* بطاقات عامة: مطابقة بكلمات العنوان */
    [/جامع|كليّة|كلية/, U('1541339907198-e08756dedf3f'), 'حرم جامعي'],
    [/أدوية|دواء|علاج/, U('1584308666744-24d5c474f2ae'), 'أدوية'],
    [/تحاليل|مختبر|أمراض|مرض/, U('1579154204601-01588f351e67'), 'مجهر مختبر'],
    [/صوت|سمع|طيور|دواجن|ببغاء/, U('1444464666168-49d633b86797'), 'طائر'],
    [/اختبار|درس|تعلّم|تعلم|دراسة/, U('1434030216411-0b793f4b4173'), 'دراسة وملاحظات'],
    [/كتاب|مكتبة|مرجع/, U('1507842217343-583bb7270b66'), 'مكتبة'],
    [/بحث|علم|مقال/, U('1532187863486-abf9dbad1b69'), 'بحث علمي'],
    [/كلب|قط|حيوان أليف|فصيل/, U('1548199973-03cce0bbc87b'), 'كلاب'],
    [/حصان|خيل|فروسية/, U('1553284965-83fd3e82fa5a'), 'حصان'],
    [/بقر|ماشية|أغنام|ماعز|مزرعة/, U('1516467508483-a7212febe31a'), 'ماشية في المرعى'],
    [/أسماك|سمك|مائي/, U('1535591273668-578e31182c4f'), 'أسماك'],
    [/أرنب|هامستر|قوارض/, U('1585110396000-c9ffd4e4b308'), 'أرنب'],
    [/تشخيص|أعراض|عيادة|طبيب/, U('1576201836106-db1758fd1c97'), 'فحص بيطري'],
    [/ذكاء|روبوت|محادثة|مساعد/, U('1531746790731-6c087fecd65a'), 'ذكاء اصطناعي']
  ];

  function inject(el, pair, cls) {
    if (!el || !pair || el.querySelector(':scope > .v7-photo')) return false;
    var wrap = document.createElement('span');
    wrap.className = 'v7-photo';
    var img = document.createElement('img');
    img.src = pair[0];
    img.alt = pair[1] || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.title = 'الصورة: Unsplash';
    var dm = /\/([^\/]+)\.webp$/.exec(pair[0]);
    if (dm && DIMS[dm[1]]) { img.width = DIMS[dm[1]][0]; img.height = DIMS[dm[1]][1]; }
    img.onerror = function () { wrap.remove(); el.classList.remove('v7-has-photo'); };
    wrap.appendChild(img);
    wrap.title = 'الصورة: Unsplash';
    var cr = document.createElement('span');
    cr.textContent = 'الصورة: Unsplash';
    cr.setAttribute('aria-hidden', 'true');
    cr.style.cssText = 'position:absolute;bottom:4px;inset-inline-end:8px;z-index:2;font-size:10px;line-height:1;color:#e2e8f0;text-shadow:0 1px 3px rgba(2,6,23,.8);pointer-events:none';
    wrap.appendChild(cr);
    el.insertBefore(wrap, el.firstChild);
    if (cls) el.classList.add(cls);
    return true;
  }

  function byKeywords(el) {
    var text = (el.textContent || '').replace(/\s+/g, ' ');
    for (var i = 0; i < KEYWORDS.length; i++) {
      if (KEYWORDS[i][0].test(text)) return [KEYWORDS[i][1], KEYWORDS[i][2]];
    }
    return null;
  }

  function run() {
    /* 1) بطاقات الوصول السريع */
    document.querySelectorAll('.bento > .qa').forEach(function (b) {
      var oc = b.getAttribute('onclick') || '';
      var m = /switchTab\('([^']+)'\)/.exec(oc);
      var key = m ? m[1] : (/showUni\(\)/.test(oc) ? 'showUni' : null);
      if (key && QA[key]) inject(b, QA[key]);
    });
    /* 2) بطاقات واجهة v45 (قد تُبنى بعدنا — المراقب أسفل يغطيها) */
    document.querySelectorAll('#show45 [data-show45]').forEach(function (c) {
      var i = parseInt(c.getAttribute('data-show45'), 10);
      if (SHOW45[i]) inject(c, SHOW45[i]);
    });
    /* 3) بطاقات الجمهور الثلاث */
    document.querySelectorAll('.tri .aud-card').forEach(function (c) {
      inject(c, byKeywords(c));
    });
    /* 4) بطاقات الأدوات العامة في الأقسام (بكلمات العنوان فقط) */
    document.querySelectorAll('.tool').forEach(function (t) {
      if (t.closest('#show45') || t.querySelector('img')) return; /* لا ازدواج مع صور موجودة */
      var p = byKeywords(t);
      if (p) inject(t, p, 'v7-has-photo');
    });
    /* 5) زر تشغيل فيلم المنصة */
    wireFilm();
  }

  /* 5) زر التشغيل الزجاجي فوق فيلم المنصة (تعديل 2026-11-12):
     شارة تشغيل فوق الملصق تختفي عند التشغيل وتعود عند الإيقاف/الانتهاء.
     أدوات التحكم الأصلية باقية كما هي وتعمل بعد بدء التشغيل. */
  function wireFilm() {
    var film = document.querySelector('#show45 .film');
    if (!film || film.querySelector('.v7-play')) return;
    var video = film.querySelector('video');
    if (!video) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'v7-play';
    btn.setAttribute('aria-label', 'تشغيل فيلم المنصة');
    btn.innerHTML = '<span class="v7-play-badge" aria-hidden="true">▶</span>';
    btn.addEventListener('click', function () { video.play().catch(function () {}); });
    film.insertBefore(btn, film.firstChild);
    video.addEventListener('play', function () { film.classList.add('v7-playing'); });
    video.addEventListener('pause', function () { film.classList.remove('v7-playing'); });
    video.addEventListener('ended', function () { film.classList.remove('v7-playing'); });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    run();
    /* v45-showcase.js يُبني بطاقاته لاحقًا: نراقب ظهورها مرة واحدة */
    if ('MutationObserver' in window && !document.querySelector('#show45 [data-show45]')) {
      var done = false;
      var mo = new MutationObserver(function () {
        if (done) return;
        if (document.querySelector('#show45 [data-show45]')) { done = true; mo.disconnect(); run(); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 10000);
    }
  });
})();
