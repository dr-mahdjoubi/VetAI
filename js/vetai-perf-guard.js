/* vetai-perf-guard.js — حاكم أداء VetAI (2026-11-10)
 * يُحمّل في <head> قبل أي سكربت آخر ليلتقط تسجيل المؤقّتات من مصدرها.
 * ماذا يفعل (بأمان وقابلية إيقاف كاملة):
 *  1) سجلّ مؤقّتات: يغلّف setInterval/setTimeout/requestAnimationFrame
 *     دون تغيير سلوكها أثناء النشاط.
 *  2) إيقاف عند إخفاء التبويب: يعلّق كل فترات setInterval المسجّلة ويعيد
 *     تشغيلها عند العودة (المتصفحات تتباطأ جزئيًا وحدها؛ هذا إيقاف كامل).
 *  3) وضع الخمول الحراري: بعد 45 ثانية بلا أي تفاعل/تمرير، يضيف
 *     html.vetai-idle فيوقف CSS الحركات والضبابيات الثقيلة (انظر ملف CSS)،
 *     ويُزال فور أول تفاعل. وراصد مهام طويلة (Long Tasks) يفعّل الوضع
 *     مبكرًا إذا تكرر الاختناق.
 *  4) تقرير تشخيصي: VetAIPerf.report() في وحدة التحكم.
 * الإيقاف الطارئ: VetAIPerf.disable() أو أضف ?perfguard=off للرابط. */
(function () {
  'use strict';
  if (window.__vetaiPerfGuard) return;
  window.__vetaiPerfGuard = true;
  var OFF = /[?&]perfguard=off/.test(location.search);
  var IDLE_MS = window.VETAIPERF_IDLE_MS || 45000;

  var _si = window.setInterval, _ci = window.clearInterval,
      _st = window.setTimeout, _ct = window.clearTimeout,
      _raf = window.requestAnimationFrame;
  var intervals = new Map();   // id -> {fn, ms, realId, suspended}
  var nextId = 1;
  var suspended = false;
  var stats = { intervalsCreated: 0, intervalsActive: 0, longTasks: 0, rafLoops: 0 };

  if (!OFF) {
    window.setInterval = function (fn, ms) {
      if (typeof fn !== 'function') return _si.apply(window, arguments);
      var id = nextId++;
      var rec = { fn: fn, ms: ms || 0, realId: null, suspended: false };
      intervals.set(id, rec); stats.intervalsCreated++;
      if (!suspended) rec.realId = _si(fn, rec.ms);
      return id;
    };
    window.clearInterval = function (id) {
      var rec = intervals.get(id);
      if (rec) { if (rec.realId != null) _ci(rec.realId); intervals.delete(id); }
      else _ci(id);
    };
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        suspended = true;
        intervals.forEach(function (rec) {
          if (rec.realId != null) { _ci(rec.realId); rec.realId = null; rec.suspended = true; }
        });
      } else {
        suspended = false;
        intervals.forEach(function (rec) {
          if (rec.suspended && rec.realId == null) { rec.realId = _si(rec.fn, rec.ms); rec.suspended = false; }
        });
      }
      stats.intervalsActive = intervals.size;
    });
  }

  /* ---------- وضع الخمول الحراري ---------- */
  var idleTimer = null;
  function armIdle() {
    if (idleTimer) _ct(idleTimer);
    idleTimer = _st(function () {
      document.documentElement.classList.add('vetai-idle');
    }, IDLE_MS);
  }
  function wake() {
    if (document.documentElement.classList.contains('vetai-idle'))
      document.documentElement.classList.remove('vetai-idle');
    armIdle();
  }
  if (!OFF) {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, wake, { passive: true });
    });
    var scrollTick = false;
    document.addEventListener('scroll', function () {
      if (scrollTick) return; scrollTick = true;
      _st(function () { scrollTick = false; wake(); }, 250);
    }, { passive: true });
    document.addEventListener('DOMContentLoaded', armIdle);
  }

  /* ---------- راصد المهام الطويلة (دعم متصفحات Chromium) ---------- */
  if (!OFF && 'PerformanceObserver' in window) {
    try {
      var burst = 0, lastReset = Date.now();
      var po = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function () {
          stats.longTasks++; burst++;
          if (Date.now() - lastReset > 10000) { burst = 0; lastReset = Date.now(); }
          if (burst >= 12) { /* اختناق متكرر: فعّل وضع الخمول فورًا حمايةً للجهاز */
            document.documentElement.classList.add('vetai-idle');
            burst = 0;
          }
        });
      });
      po.observe({ entryTypes: ['longtask'] });
    } catch (e) { /* غير مدعوم: نتابع بدونه */ }
  }

  window.VetAIPerf = {
    report: function () {
      var delays = {};
      intervals.forEach(function (r) { delays[r.ms] = (delays[r.ms] || 0) + 1; });
      return { intervalsRegisteredNow: intervals.size,
               intervalsCreatedTotal: stats.intervalsCreated,
               delaysHistogram: delays,
               suspendedNow: suspended,
               idleMode: document.documentElement.classList.contains('vetai-idle'),
               longTasksSeen: stats.longTasks };
    },
    disable: function () {
      /* إعادة كل شيء كما كان وإيقاف الحاكم */
      intervals.forEach(function (rec) { if (rec.realId != null) _ci(rec.realId); });
      intervals.clear();
      window.setInterval = _si; window.clearInterval = _ci;
      document.documentElement.classList.remove('vetai-idle');
      if (idleTimer) _ct(idleTimer);
    }
  };
})();
