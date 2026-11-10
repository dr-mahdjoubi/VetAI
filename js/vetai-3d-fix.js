/* ============================================================
   VetAI — رقعة إصلاح العرض ثلاثي الأبعاد (Drop-in Patch v1)
   ------------------------------------------------------------
   التشخيص (من كود الموقع الحي، نوفمبر 2026):
   المشكلة ليست في النماذج ولا في بطاقات الشبكة — بل في سلسلة
   تحميل مكتبة model-viewer داخل js/lazy-views.js:
   (1) المكتبة تُطلب فقط عند فتح قسم الوسائط عبر switchTab بعد
       نجاح «ربط» مؤقّت يتخلى بعد 6 ثوانٍ؛ أي مسار آخر لعرض
       القسم (رابط مباشر، زر data-branch، استعادة حالة) لا
       يُطلق التحميل، فتبقى عناصر <model-viewer> غير مُرقّاة:
       صناديق فارغة صامتة.
   (2) مراقب الظهور في lazy-views يُربط مرة واحدة عند
       DOMContentLoaded — قبل أن تبني الشيفرة المضمّنة بطاقات
       النماذج أصلاً — فلا يرى أي عنصر أبداً.
   (3) مصدر CDN واحد، وفشله يُبتلع بـ catch صامت: لا مرآة،
       لا إعادة، لا رسالة للمستخدم.
   (4) viewer3d.js يفترض ملفات محلية في assets/3d/ (وإضاءة
       env-sky.hdr) وهي غير موجودة على الخادم — فحوص HEAD
       تفشل كلها وطلبات 404 تتكرر (غير قاتلة لكنها ضجيج).

   ماذا تفعل هذه الرقعة (دون لمس أي تصميم أو هيكل):
   • تضمن تحميل المكتبة من 3 مصادر متسلسلة، وتتحقق من تسجيل
     العنصر فعلياً، متى ظهر أي <model-viewer> في الصفحة — عبر
     مراقب DOM دائم، لا عبر مسار التنقّل.
   • تراقب أيضاً إظهار #view-media بأي طريقة (تغيّر class)
     ورابط التجزئة، كشبكات أمان إضافية.
   • عند فشل نموذج .glb تبدّل مصدره إلى مرآة jsdelivr
     تلقائياً، وإن فشلت المرآة تستبدل العارض بملصق من صور
     الموقع المحلية مع زر إعادة محاولة.
   • تعرّض VetAI3DFix.diagnose() في وحدة التحكم للفحص.

   التركيب: انسخ هذا الملف إلى js/vetai-3d-fix.js وأضف قبل
   </body> في index.html:
     <script src="js/vetai-3d-fix.js" defer></script>
   (بعد lazy-views.js وviewer3d.js — لا تحذف أي ملف قائم.)
   ============================================================ */
(function () {
  'use strict';
  if (window.VetAI3DFix) return;

  var CDNS = [
    'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js',
    'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js',
    'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
  ];
  var TIMEOUT = 9000;
  var POSTERS = { // صور محلية قائمة على الموقع نفسه (assets/animals/)
    horse: 'assets/animals/horse.webp', dog: 'assets/animals/dog.webp',
    cow: 'assets/animals/cow.webp', sheep: 'assets/animals/sheep.webp',
    hen: 'assets/animals/hen.webp', cat: 'assets/animals/cat.webp'
  };
  var state = { status: 'idle', source: null, failures: [] };
  var promise = null, watched = new WeakSet();

  function registered() {
    try { return !!(window.customElements && customElements.get('model-viewer')); } catch (e) { return false; }
  }
  function loadFrom(src) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var s = document.createElement('script');
      s.type = 'module'; s.src = src;
      var t = setTimeout(function () { if (!done) { done = true; reject(new Error('timeout')); } }, TIMEOUT);
      s.onload = function () {
        var n = 0;
        (function chk() {
          if (done) return;
          if (registered()) { done = true; clearTimeout(t); resolve(src); }
          else if (++n > 40) { done = true; clearTimeout(t); reject(new Error('not registered')); }
          else setTimeout(chk, 100);
        })();
      };
      s.onerror = function () { if (!done) { done = true; clearTimeout(t); reject(new Error('script error')); } };
      document.head.appendChild(s);
    });
  }
  function ensure() {
    if (registered()) { state.status = 'ready'; return Promise.resolve('registered'); }
    if (promise) return promise;
    state.status = 'loading';
    var chain = Promise.reject(new Error('go'));
    CDNS.forEach(function (src) {
      chain = chain.catch(function () {
        return loadFrom(src).then(function (ok) {
          state.source = ok; return ok;
        }, function (err) {
          state.failures.push(src + ' → ' + err.message);
          throw err;
        });
      });
    });
    promise = chain.then(function (src) {
      state.status = 'ready';
      try { console.info('[VetAI3DFix] مكتبة العرض جاهزة من:', src); } catch (e) {}
      document.querySelectorAll('model-viewer').forEach(watch);
      return src;
    }).catch(function (err) {
      state.status = 'failed'; promise = null;
      try { console.warn('[VetAI3DFix] فشلت كل مصادر المكتبة', state.failures); } catch (e) {}
      document.querySelectorAll('model-viewer').forEach(function (mv) { posterFallback(mv, 'تعذّر تحميل مكتبة العرض ثلاثي الأبعاد'); });
      throw err;
    });
    return promise;
  }

  function mirrorOf(src) {
    var m = src.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
    if (m) return 'https://cdn.jsdelivr.net/gh/' + m[1] + '/' + m[2] + '@' + m[3] + '/' + m[4];
    if (src.indexOf('https://threejs.org/examples/models/') === 0) {
      return 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/' + src.split('/examples/models/')[1];
    }
    return null;
  }
  function posterFor(mv) {
    var src = mv.getAttribute('src') || '';
    for (var k in POSTERS) { if (src.toLowerCase().indexOf(k) !== -1) return POSTERS[k]; }
    return mv.getAttribute('poster') || '';
  }
  function posterFallback(mv, msg) {
    try {
      if (mv.dataset.v3fixDead) return;
      mv.dataset.v3fixDead = '1';
      var host = mv.parentElement; if (!host) return;
      var box = document.createElement('div');
      box.style.cssText = 'margin-top:10px;border:1px dashed rgba(148,163,184,.5);border-radius:14px;padding:10px;text-align:center';
      var poster = posterFor(mv);
      box.innerHTML =
        (poster ? '<img src="' + poster + '" alt="" loading="lazy" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;display:block">' : '') +
        '<div style="font-size:12px;color:#fbbf24;margin-top:8px">🧊 ' + msg + '</div>' +
        '<button type="button" style="margin-top:6px;border:1px solid rgba(34,211,238,.6);color:#22d3ee;background:transparent;border-radius:999px;padding:4px 14px;font-size:12px;cursor:pointer">↻ إعادة المحاولة</button>';
      var img = box.querySelector('img');
      if (img) img.addEventListener('error', function () { img.remove(); });
      box.querySelector('button').addEventListener('click', function () {
        delete mv.dataset.v3fixDead; delete mv.dataset.v3fixMirror;
        box.remove();
        ensure().then(function () {
          var src = mv.getAttribute('src');
          mv.removeAttribute('src');
          requestAnimationFrame(function () { mv.setAttribute('src', src); watched.delete(mv); watch(mv); });
        }).catch(function () { posterFallback(mv, msg); });
      });
      host.appendChild(box);
      mv.style.opacity = '.25'; mv.style.pointerEvents = 'none';
    } catch (e) {}
  }
  function watch(mv) {
    if (!mv || watched.has(mv)) return;
    watched.add(mv);
    mv.addEventListener('error', function () {
      var src = mv.getAttribute('src') || '';
      if (!mv.dataset.v3fixMirror) {
        var mir = mirrorOf(src);
        if (mir) { mv.dataset.v3fixMirror = '1'; mv.setAttribute('src', mir); return; }
      }
      posterFallback(mv, 'تعذّر تحميل هذا النموذج من مصدريه');
    });
    // env-sky.hdr مفقود على الخادم: أزل الإشارة إليه حتى لا تتراكم 404
    if ((mv.getAttribute('environment-image') || '').indexOf('env-sky.hdr') !== -1) {
      mv.removeAttribute('environment-image');
    }
  }

  /* مراقب دائم: أي عارض يظهر في أي وقت يطلق التحميل والمراقبة */
  function observeDom() {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var nodes = muts[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'MODEL-VIEWER') { ensure().catch(function () {}); watch(n); }
          else if (n.querySelectorAll) n.querySelectorAll('model-viewer').forEach(function (mv) { ensure().catch(function () {}); watch(mv); });
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  /* شبكة أمان: إظهار قسم الوسائط بأي مسار */
  function observeMediaView() {
    var s = document.getElementById('view-media');
    if (!s) return;
    var mo = new MutationObserver(function () {
      if (!s.classList.contains('hidden') && s.getClientRects().length) ensure().catch(function () {});
    });
    mo.observe(s, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  function boot() {
    observeDom();
    observeMediaView();
    document.querySelectorAll('model-viewer').forEach(watch);
    if (document.querySelector('model-viewer')) ensure().catch(function () {});
    window.addEventListener('hashchange', function () {
      if ((location.hash || '').indexOf('media') !== -1) ensure().catch(function () {});
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.VetAI3DFix = {
    ensure: ensure,
    state: state,
    diagnose: function () {
      var out = {
        webgl: (function () { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })(),
        libraryRegistered: registered(),
        status: state.status,
        source: state.source,
        failures: state.failures,
        viewers: [].map.call(document.querySelectorAll('model-viewer'), function (mv) {
          return { src: mv.getAttribute('src'), upgraded: !!mv.shadowRoot, loaded: !!mv.loaded };
        })
      };
      try { console.info('[VetAI3DFix] تشخيص:', out); } catch (e) {}
      return out;
    }
  };
})();
