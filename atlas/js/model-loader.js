/* ============================================================
   VetAI — محمّل نماذج ثلاثية الأبعاد المتين (Model Loader v2)
   ------------------------------------------------------------
   المشكلة الأصلية التي يصلحها (موثّقة في كود الموقع الحي):
   1) مكتبة model-viewer كانت تُحمَّل فقط عبر lazy-views.js
      وبشروط هشّة (ربط switchTab مؤقّت + مراقب ظهور يُربط مرة
      واحدة قبل بناء البطاقات) — ففي أغلب مسارات التنقّل لا تصل
      المكتبة أبداً وتبقى عناصر <model-viewer> ميتة بصمت.
   2) فشل أي CDN كان نهائياً بلا مرآة ولا إعادة ولا رسالة.
   3) مجلد النماذج المحلية assets/3d كان يُظنّ غير موجود على الخادم وقت كتابة
      هذا التشخيص؛ وهو موجود في المستودع (22 ملفًا) منذ التحقق في 12 نوفمبر 2026.
      أُبقيت سلسلة البدائل أدناه كما هي كشبكة أمان. (تصحيح تعليق فقط — بلا تغيير سلوكي.)

   هذا المحمّل:
   • يجرب 3 مصادر للمكتبة بالتسلسل مع مهلة وفحص تسجيل حقيقي.
   • يراقب DOM باستمرار: أي <model-viewer> يظهر لاحقاً (بطاقات
     تُبنى ديناميكياً) يطلق التحميل فوراً — لا يعتمد على التنقّل.
   • يبدّل مصدر أي نموذج .glb يفشل إلى مرآته، ثم إلى ملصق صورة.
   • يفحص WebGL، ويعرض التشخيص في لوحة صغيرة عند الطلب:
       Animal3D.runDiagnostics()  → تقرير كامل في وحدة التحكم
       Animal3D.mountPanel(el)    → لوحة مرئية للمستخدم
   • Fail-safe: أي خطأ داخلي لا يكسر الصفحة أبداً.
   ============================================================ */
(function () {
  'use strict';
  if (window.Animal3D && window.Animal3D.__v2) return;

  var CDNS = [
    'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js',
    'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js',
    'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
  ];
  var LOAD_TIMEOUT = 9000;      // مهلة كل مصدر
  var MODEL_TIMEOUT = 20000;    // مهلة تحميل نموذج واحد قبل إعلان فشله
  var state = {
    libStatus: 'idle',          // idle | loading | ready | failed
    libSource: null,
    attempts: [],
    webgl: null,
    startedAt: null
  };
  var libPromise = null;
  var watched = new WeakSet();

  /* ---------- أدوات صغيرة آمنة ---------- */
  function log() { try { console.info.apply(console, ['[Animal3D]'].concat([].slice.call(arguments))); } catch (e) {} }
  function warn() { try { console.warn.apply(console, ['[Animal3D]'].concat([].slice.call(arguments))); } catch (e) {} }

  function webglSupport() {
    if (state.webgl !== null) return state.webgl;
    try {
      var c = document.createElement('canvas');
      state.webgl = !!(window.WebGLRenderingContext &&
        (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { state.webgl = false; }
    return state.webgl;
  }

  function libReady() {
    try { return !!(window.customElements && customElements.get('model-viewer')); }
    catch (e) { return false; }
  }

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var s = document.createElement('script');
      s.type = 'module';
      s.src = src;
      var timer = setTimeout(function () {
        if (done) return; done = true;
        reject(new Error('timeout ' + LOAD_TIMEOUT + 'ms'));
      }, LOAD_TIMEOUT);
      s.onload = function () {
        // سكربت module قد يُنفَّذ بعد onload بقليل — نتحقق فعلياً من التسجيل
        var tries = 0;
        (function check() {
          if (done) return;
          if (libReady()) { done = true; clearTimeout(timer); resolve(src); }
          else if (++tries > 40) { done = true; clearTimeout(timer); reject(new Error('loaded but <model-viewer> not registered')); }
          else setTimeout(check, 100);
        })();
      };
      s.onerror = function () {
        if (done) return; done = true; clearTimeout(timer);
        reject(new Error('network/script error'));
      };
      document.head.appendChild(s);
    });
  }

  /* ---------- تحميل المكتبة مع المرايا ---------- */
  function ensureLibrary() {
    if (libReady()) { state.libStatus = 'ready'; return Promise.resolve('already-registered'); }
    if (libPromise) return libPromise;
    state.libStatus = 'loading';
    state.startedAt = Date.now();
    var chain = Promise.reject(new Error('start'));
    CDNS.forEach(function (src) {
      chain = chain.catch(function (prevErr) {
        if (prevErr && prevErr.message !== 'start') {
          state.attempts.push({ src: src, note: 'trying after previous failure' });
        }
        return loadScriptOnce(src).then(function (okSrc) {
          state.libSource = okSrc;
          state.attempts.push({ src: okSrc, ok: true });
          return okSrc;
        }, function (err) {
          state.attempts.push({ src: src, ok: false, error: String(err && err.message || err) });
          throw err;
        });
      });
    });
    libPromise = chain.then(function (src) {
      state.libStatus = 'ready';
      log('المكتبة جاهزة من:', src, 'خلال', (Date.now() - state.startedAt) + 'ms');
      upgradeAll();
      return src;
    }).catch(function (err) {
      state.libStatus = 'failed';
      libPromise = null; // اسمح بإعادة المحاولة عند طلب صريح
      warn('فشلت كل مصادر المكتبة:', err && err.message);
      markAllFallback('تعذّر تحميل مكتبة العرض ثلاثي الأبعاد من كل المصادر');
      throw err;
    });
    return libPromise;
  }

  /* ---------- ترقية/مراقبة كل عارض ---------- */
  function upgradeAll() {
    document.querySelectorAll('model-viewer').forEach(watchViewer);
  }

  function watchViewer(mv) {
    if (!mv || watched.has(mv)) return;
    watched.add(mv);
    // مهلة لكل نموذج: إن لم يصل حدث load/error نعلن الفشل بهدوء ونبدّل/نلصق
    var settled = false;
    var timer = setTimeout(function () {
      if (!settled && !mv.loaded) {
        settled = true;
        handleModelError(mv, 'model timeout ' + MODEL_TIMEOUT + 'ms');
      }
    }, MODEL_TIMEOUT);
    mv.addEventListener('load', function () {
      settled = true; clearTimeout(timer);
      mv.classList.add('a3d-ok');
      var fb = mv.parentElement && mv.parentElement.querySelector('.a3d-fallback');
      if (fb) fb.remove();
    });
    mv.addEventListener('error', function (ev) {
      if (settled) return;
      settled = true; clearTimeout(timer);
      handleModelError(mv, (ev && ev.detail && ev.detail.type) || 'load error');
    });
  }

  function mirrorOf(src) {
    try {
      var map = window.ANIMAL_MODEL_MIRRORS || {};
      if (map[src]) return map[src];
      // قاعدة عامة: raw.githubusercontent ↔ jsdelivr gh
      var m = src.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
      if (m) return 'https://cdn.jsdelivr.net/gh/' + m[1] + '/' + m[2] + '@' + m[3] + '/' + m[4];
      var j = src.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/]+)@([^/]+)\/(.+)$/);
      if (j) return 'https://raw.githubusercontent.com/' + j[1] + '/' + j[2] + '/' + j[3] + '/' + j[4];
    } catch (e) {}
    return null;
  }

  function handleModelError(mv, why) {
    var src = mv.getAttribute('src') || '';
    warn('فشل نموذج:', src, '—', why);
    if (!mv.dataset.a3dMirrored) {
      var mirror = mirrorOf(src);
      if (mirror && mirror !== src) {
        mv.dataset.a3dMirrored = '1';
        log('التبديل إلى المرآة:', mirror);
        mv.setAttribute('src', mirror);
        // أعد تسليح المراقبة للمرآة
        watched.delete(mv);
        watchViewer(mv);
        return;
      }
    }
    showFallback(mv, 'تعذّر تحميل هذا النموذج ثلاثي الأبعاد');
  }

  /* ملصق بديل أنيق بدل العارض الميت — لا مربّع فارغ أبداً */
  function showFallback(mv, msg) {
    try {
      mv.classList.add('a3d-dead');
      var poster = mv.getAttribute('poster') || mv.dataset.poster || '';
      var host = mv.parentElement;
      if (!host || host.querySelector('.a3d-fallback')) return;
      var box = document.createElement('div');
      box.className = 'a3d-fallback';
      box.setAttribute('role', 'note');
      var inner = '';
      if (poster) inner += '<img src="' + poster.replace(/"/g, '&quot;') + '" alt="" loading="lazy">';
      inner += '<div class="a3d-fallback-msg">🧊 ' + msg + '</div>' +
               '<button type="button" class="a3d-retry">↻ إعادة المحاولة</button>';
      box.innerHTML = inner;
      var img = box.querySelector('img');
      if (img) img.addEventListener('error', function () { img.remove(); });
      box.querySelector('.a3d-retry').addEventListener('click', function () {
        delete mv.dataset.a3dMirrored;
        box.remove();
        mv.classList.remove('a3d-dead');
        ensureLibrary().then(function () {
          var src = mv.getAttribute('src');
          mv.removeAttribute('src');
          requestAnimationFrame(function () { mv.setAttribute('src', src); watched.delete(mv); watchViewer(mv); });
        }).catch(function () { showFallback(mv, msg); });
      });
      host.appendChild(box);
    } catch (e) {}
  }

  function markAllFallback(msg) {
    document.querySelectorAll('model-viewer').forEach(function (mv) { showFallback(mv, msg); });
  }

  /* ---------- مراقبة DOM الدائمة (إصلاح جوهري) ---------- */
  function startObserver() {
    var mo = new MutationObserver(function (muts) {
      var found = false;
      for (var i = 0; i < muts.length && !found; i++) {
        var nodes = muts[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'MODEL-VIEWER' || (n.querySelector && n.querySelector('model-viewer'))) { found = true; break; }
        }
      }
      if (found) { ensureLibrary().catch(function () {}); upgradeAll(); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  /* ---------- التشخيص ---------- */
  function runDiagnostics() {
    var viewers = [].slice.call(document.querySelectorAll('model-viewer'));
    var report = {
      when: new Date().toISOString(),
      webgl: webglSupport(),
      library: { status: state.libStatus, source: state.libSource, registered: libReady(), attempts: state.attempts },
      viewers: viewers.map(function (mv) {
        return {
          src: mv.getAttribute('src') || '(none)',
          upgraded: !!mv.shadowRoot,
          loaded: !!mv.loaded,
          dead: mv.classList.contains('a3d-dead')
        };
      }),
      hints: []
    };
    if (!report.webgl) report.hints.push('المتصفح/الجهاز لا يدعم WebGL — ستعمل الملصقات البديلة فقط.');
    if (!report.library.registered) report.hints.push('مكتبة model-viewer غير مسجّلة: تحقق من حظر CDN أو سياسة CSP، وتأكد أن التحميل لا يعتمد على مسار تنقّل واحد.');
    viewers.forEach(function (v) {
      if (v.upgraded && !v.loaded && !v.dead) report.hints.push('عارض لم يُكمل التحميل: ' + v.src + ' — افحص CORS/المسار.');
    });
    log('تقرير التشخيص:', report);
    return report;
  }

  function mountPanel(el) {
    if (!el) return;
    var r = runDiagnostics();
    var rows = [
      ['WebGL', r.webgl ? '✅ مدعوم' : '❌ غير مدعوم'],
      ['مكتبة العرض', r.library.registered ? '✅ جاهزة' : '⏳ ' + r.library.status],
      ['مصدر المكتبة', r.library.source || '—'],
      ['عدد العارضات', String(r.viewers.length)],
      ['حمّلت بنجاح', String(r.viewers.filter(function (v) { return v.loaded; }).length)],
      ['فاشلة (بملصق بديل)', String(r.viewers.filter(function (v) { return v.dead; }).length)]
    ];
    el.innerHTML = rows.map(function (row) {
      return '<div class="a3d-diag-row"><span>' + row[0] + '</span><b>' + row[1] + '</b></div>';
    }).join('') + (r.hints.length ? '<div class="a3d-diag-hints">' + r.hints.map(function (h) { return '• ' + h; }).join('<br>') + '</div>' : '');
  }

  /* ---------- أنماط الملصق والتشخيص (تُحقن مرة واحدة) ---------- */
  function injectStyles() {
    if (document.getElementById('a3d-styles')) return;
    var st = document.createElement('style');
    st.id = 'a3d-styles';
    st.textContent = [
      '.a3d-fallback{margin-top:10px;border:1px dashed rgba(148,163,184,.5);border-radius:14px;padding:10px;text-align:center;background:rgba(15,23,42,.35)}',
      '.a3d-fallback img{width:100%;max-height:220px;object-fit:cover;border-radius:10px;display:block}',
      '.a3d-fallback-msg{font-size:12px;color:#fbbf24;margin-top:8px;line-height:1.8}',
      '.a3d-retry{margin-top:6px;border:1px solid rgba(34,211,238,.6);color:#22d3ee;background:transparent;border-radius:999px;padding:4px 14px;font-size:12px;cursor:pointer}',
      '.a3d-retry:hover{background:rgba(34,211,238,.12)}',
      'model-viewer.a3d-dead{opacity:.25;pointer-events:none}',
      '.a3d-diag-row{display:flex;justify-content:space-between;gap:12px;font-size:12px;padding:5px 0;border-bottom:1px solid rgba(148,163,184,.15)}',
      '.a3d-diag-hints{font-size:11.5px;color:#fbbf24;line-height:1.9;margin-top:8px}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- الإقلاع ---------- */
  function boot() {
    injectStyles();
    startObserver();
    if (document.querySelector('model-viewer')) ensureLibrary().catch(function () {});
    // أول ظهور لأي عارض قرب الشاشة يطلق التحميل أيضاً (شبكة أمان إضافية)
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) ensureLibrary().catch(function () {});
      }, { rootMargin: '800px' });
      document.querySelectorAll('model-viewer').forEach(function (mv) { io.observe(mv); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Animal3D = {
    __v2: true,
    ensureLibrary: ensureLibrary,
    runDiagnostics: runDiagnostics,
    mountPanel: mountPanel,
    webglSupport: webglSupport,
    state: state
  };
})();
