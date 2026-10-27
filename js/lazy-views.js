/* VetAI Lazy Views — تحميل ديناميكي للوحدات الثقيلة عند الحاجة فقط
   المشكلة التي يحلها: كانت وحدات ثقيلة (عارض النماذج ثلاثية الأبعاد الخارجي،
   التعرّف على السلالات، الابتكارات) تُحمَّل مع أول رسم للصفحة رغم أن أغلب
   الزوار لا يفتحون أقسامها أبدًا. هذا المحرك:
   1) يحمّل كل وحدة لحظة فتح قسمها أول مرة (أو عند اقتراب عنصرها من الشاشة).
   2) يجلبها استباقيًا عند تمرير المؤشر/اللمس على زر قسمها في التنقل.
   3) شبكة أمان: يحمّل وحدتي السلالات والابتكارات في وقت خمول بعد اكتمال
      تحميل النافذة حتى لا تتعطل أي تهيئة متأخرة تعتمد عليهما.
   4) يضبط أولوية صورة البطل (hero) عالية ويجعل بقية الصور كسولة فكّ الترميز. */
'use strict';
(function () {
  if (window.__vetaiLazyLoaded) return;
  window.__vetaiLazyLoaded = true;

  var loaded = {};
  var loading = {};

  function loadScript(src, isModule) {
    if (loaded[src]) return Promise.resolve();
    if (loading[src]) return loading[src];
    loading[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      if (isModule) s.type = 'module';
      s.onload = function () { loaded[src] = true; resolve(); };
      s.onerror = function () { delete loading[src]; reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
    return loading[src];
  }

  var MODULES = {
    modelViewer: {
      src: 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js',
      module: true,
      views: ['view-media']
    },
    breedId: {
      src: 'js/breed-id.js',
      module: false,
      views: ['view-pets']
    },
    innovations: {
      src: 'js/innovations.js',
      module: false,
      views: ['view-fun', 'view-aim', 'view-creator', 'view-bio', 'view-home']
    }
  };

  function loadModule(name) {
    var m = MODULES[name];
    if (!m) return Promise.resolve();
    return loadScript(m.src, m.module).catch(function () { /* فشل شبكة لا يكسر التصفح */ });
  }
  window.VetAI_lazyLoad = loadModule;

  function modulesForView(viewId) {
    var names = [];
    Object.keys(MODULES).forEach(function (name) {
      if (MODULES[name].views.indexOf(viewId) !== -1) names.push(name);
    });
    return names;
  }

  /* ربط switchTab: كل فتح لقسم يحمّل وحداته */
  function hookSwitchTab() {
    if (typeof window.switchTab !== 'function' || window.switchTab.__vetaiLazyHooked) return true;
    var original = window.switchTab;
    var wrapped = function (viewId) {
      var result = original.apply(this, arguments);
      modulesForView(viewId).forEach(loadModule);
      return result;
    };
    wrapped.__vetaiLazyHooked = true;
    window.switchTab = wrapped;
    return true;
  }
  var hookTries = 0;
  var hookTimer = setInterval(function () {
    hookTries++;
    if (hookSwitchTab() || hookTries > 60) clearInterval(hookTimer);
  }, 100);

  /* جلب استباقي عند التمرير أو اللمس على أزرار التنقل */
  function prefetchFromNavTarget(target) {
    var node = target;
    while (node && node !== document.body) {
      var branch = node.getAttribute && (node.getAttribute('data-branch') || node.getAttribute('data-view') || '');
      var href = node.getAttribute && node.getAttribute('href');
      var viewId = '';
      if (branch) viewId = 'view-' + branch;
      if (!viewId && href && href.charAt(0) === '#') viewId = href.slice(1);
      if (viewId) { modulesForView(viewId).forEach(loadModule); return; }
      node = node.parentElement;
    }
  }
  document.addEventListener('pointerover', function (e) { prefetchFromNavTarget(e.target); }, { passive: true });
  document.addEventListener('touchstart', function (e) { prefetchFromNavTarget(e.target); }, { passive: true });

  /* عارض النماذج: حمّله أيضًا إذا اقترب عنصر model-viewer من الشاشة دون فتح قسم الوسائط */
  function watchModelViewer() {
    var els = document.querySelectorAll('model-viewer');
    if (!els.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { loadModule('modelViewer'); io.disconnect(); }
      });
    }, { rootMargin: '600px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* أولوية الصور: البطل أولًا، والباقي كسول فك الترميز */
  function tuneImages() {
    var imgs = document.querySelectorAll('img');
    var fold = window.innerHeight * 1.2;
    imgs.forEach(function (img, i) {
      img.decoding = 'async';
      var top = 0;
      try { top = img.getBoundingClientRect().top + window.scrollY; } catch (e) {}
      if (i === 0) { try { img.fetchPriority = 'high'; } catch (e) {} img.loading = 'eager'; }
      else if (top > fold) img.loading = 'lazy';
    });
  }

  function onReady() {
    tuneImages();
    watchModelViewer();
    /* إن فُتحت الصفحة مباشرة على رابط قسم ثقيل (#view-media إلخ) حمّل وحداته */
    if (location.hash && location.hash.length > 1) modulesForView(location.hash.slice(1)).forEach(loadModule);
    /* شبكة الأمان في وقت الخمول */
    window.addEventListener('load', function () {
      var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 2500); };
      idle(function () { loadModule('breedId'); loadModule('innovations'); }, { timeout: 6000 });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
