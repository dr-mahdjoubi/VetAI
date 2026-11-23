/* VetAI anim-governor (v57) — حاكم الأنيميشن:
   1) يعلّق كل الأنيميشنات حين يُخفى التبويب (visibilitychange → html.pg-paused).
   2) يرصد العناصر ذات الأنيميشن اللانهائي بـ IntersectionObserver ويعلّقها
      حين تخرج عن الشاشة (.anim-off)، فلا يدور المعالج لمناطق لا يراها أحد.
   3) يعيد الفحص بعد تبديل الأقسام (switchTab) وبعد حقن محتوى جديد،
      بحدّ أدنى 4 ثوانٍ بين كل فحصين، ودائمًا في وقت الخمول. */
(function () {
  'use strict';
  var root = document.documentElement;

  function onVis() { root.classList.toggle('pg-paused', !!document.hidden); }
  document.addEventListener('visibilitychange', onVis);
  onVis();

  var io = null;
  var seen = new WeakSet();
  function watch(el) {
    if (seen.has(el)) return;
    seen.add(el);
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          entries[i].target.classList.toggle('anim-off', !entries[i].isIntersecting);
        }
      }, { threshold: 0.02 });
    }
    io.observe(el);
  }

  function scan() {
    var els = document.querySelectorAll('body *');
    for (var i = 0; i < els.length; i++) {
      var cs;
      try { cs = getComputedStyle(els[i]); } catch (e) { continue; }
      var it = cs.animationIterationCount || '';
      if (it.split(',').indexOf('infinite') !== -1) watch(els[i]);
    }
  }

  var lastScan = 0, queued = false;
  function scheduleScan() {
    if (queued) return;
    queued = true;
    var run = function () {
      queued = false;
      var now = Date.now();
      if (now - lastScan < 10000) return; /* حدّ أدنى 10 ثوانٍ بين الفحوصات */
      lastScan = now;
      scan();
    };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 });
    else setTimeout(run, 900);
  }

  if (document.readyState === 'complete') { scheduleScan(); setTimeout(scheduleScan, 6500); }
  else window.addEventListener('load', function () { scheduleScan(); setTimeout(scheduleScan, 6500); });

  /* إعادة الفحص بعد تبديل الأقسام: تُحقن عناصر جديدة بأنيميشنات */
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    var orig = window.switchTab;
    if (typeof orig === 'function' && !orig.__animGov) {
      var wrapped = function () {
        var r = orig.apply(this, arguments);
        setTimeout(scheduleScan, 700);
        return r;
      };
      wrapped.__animGov = true;
      window.switchTab = wrapped;
      clearInterval(iv);
    } else if (tries > 50) {
      clearInterval(iv);
    }
  }, 200);

  /* لا MutationObserver هنا قصدًا: فحصٌ عند التحميل وبعد تبديل الأقسام يكفي،
     ومراقبة كل تغيير في DOM كانت ستكلّف أكثر مما توفّر. */
})();
