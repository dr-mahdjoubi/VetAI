/* ============================================================================
   VetAI Dual-Agent Engine — Manager & Supervisor
   ----------------------------------------------------------------------------
   طبقة حوكمة فوق محرك المساعد (js/ai-engine.js) لا تغيّر أي تصميم ولا أي واجهة:
   - الـ Manager (مسار الطلب): كاش LRU، دمج الطلبات المتماثلة (coalescing)،
     طابور بتزامن محدود، سباق مُتحوَّط (hedging) بين المزودين، مهلات تكيّفية.
   - الـ Supervisor (خارج المسار): قواطع دوائر (circuit breakers) لكل مزود،
     قياس زمن حيّ (p50/p95)، جسّات استشفاء ذاتي (probes)، وضع متدهور برفض سريع
     يحوّل الواجهة فورًا إلى فهرس المقالات المحلي بدل انتظار ~100 ثانية.
   التحميل: بعد js/ai-engine.js مباشرة. عند غياب ai-engine يعمل مستقلًا.
   ============================================================================ */
(function () {
  'use strict';
  if (window.VetAI_supervisor) return; // حارس التحميل المزدوج

  var CONFIG = {
    cache: { maxEntries: 60, ttlMs: 10 * 60 * 1000, staleIfErrorMs: 24 * 60 * 60 * 1000 },
    queue: { maxConcurrent: 2, maxQueue: 8, queueTimeoutMs: 90000 },
    breaker: { failThreshold: 3, windowSize: 24, minSamples: 6, errorRateOpen: 0.5, halfOpenAfterMs: 20000 },
    probe: { everyMs: 45000 },
    adaptive: { minTimeoutMs: 8000, factor: 1.6 },
    hedge: { maxDelayMs: 6000, ratio: 0.45 }
  };

  var SYSTEM = 'أنت "بيطري-AI"، مساعد في منصة VetAI Global Intelligence للطب البيطري. ' +
    'أجب بلغة المستخدم بوضوح ودقة وباختصار منظم. إجاباتك تعليمية ولا تغني عن الطبيب البيطري. ' +
    'لا تخترع مصادر. إن لم تكن متأكداً فقل ذلك.';

  var WORKER_URL = 'https://vetai-chat.vcom.workers.dev';
  var POL_URL = 'https://text.pollinations.ai/openai';

  function now() { return Date.now(); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function errWith(code, msg) { var e = new Error(msg || code); e.code = code; return e; }

  function withTimeout(p, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(errWith('timeout', 'timeout after ' + ms + 'ms')); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }

  /* ---------------- حالة المزودين وإحصاءاتهم ---------------- */
  function Provider(id, capMs, call) {
    this.id = id; this.capMs = capMs; this.call = call;
    this.state = 'closed';           // closed | open | half-open
    this.openedAt = 0; this.probeInFlight = false;
    this.consecutiveFails = 0;
    this.ring = [];                  // [{ok, ms}] آخر windowSize نتيجة
  }
  Provider.prototype.record = function (ok, ms) {
    this.ring.push({ ok: ok, ms: ms });
    if (this.ring.length > CONFIG.breaker.windowSize) this.ring.shift();
    if (ok) { this.consecutiveFails = 0; if (this.state === 'half-open') this.state = 'closed'; }
    else {
      this.consecutiveFails++;
      if (this.state === 'half-open') { this.state = 'open'; this.openedAt = now(); }
      else if (this.consecutiveFails >= CONFIG.breaker.failThreshold) { this.state = 'open'; this.openedAt = now(); }
      else if (this.ring.length >= CONFIG.breaker.minSamples) {
        var bad = 0; for (var i = 0; i < this.ring.length; i++) if (!this.ring[i].ok) bad++;
        if (bad / this.ring.length > CONFIG.breaker.errorRateOpen) { this.state = 'open'; this.openedAt = now(); }
      }
    }
    this.probeInFlight = false;
  };
  Provider.prototype.latencies = function () {
    var a = []; for (var i = 0; i < this.ring.length; i++) if (this.ring[i].ok) a.push(this.ring[i].ms);
    return a.sort(function (x, y) { return x - y; });
  };
  Provider.prototype.pct = function (p) {
    var a = this.latencies(); if (!a.length) return 0;
    return a[Math.min(a.length - 1, Math.floor(p * a.length))];
  };
  Provider.prototype.errRate = function () {
    if (!this.ring.length) return 0;
    var bad = 0; for (var i = 0; i < this.ring.length; i++) if (!this.ring[i].ok) bad++;
    return bad / this.ring.length;
  };
  Provider.prototype.timeout = function () {
    var p95 = this.pct(0.95);
    if (!p95) return this.capMs;
    return clamp(Math.round(p95 * CONFIG.adaptive.factor), CONFIG.adaptive.minTimeoutMs, this.capMs);
  };

  /* ---------------- نداءات المزودين الخام ---------------- */
  function cleanPolText(t) {
    t = String(t == null ? '' : t).split('\n').filter(function (l) { return !/pollinations/i.test(l); }).join('\n').trim();
    if (!t) throw errWith('empty', 'empty answer');
    return t;
  }
  function polCall(model) {
    return function (q, history, context) {
      var msgs = [{ role: 'system', content: SYSTEM }];
      (history || []).slice(-6).forEach(function (m) { msgs.push({ role: m.role, content: m.content }); });
      msgs.push({ role: 'user', content: context ? 'معلومات مساعدة:\n' + context + '\n\nالسؤال: ' + q : q });
      return fetch(POL_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model, messages: msgs, temperature: 0.3 })
      }).then(function (r) {
        if (!r.ok) throw errWith('http_' + r.status, 'pollinations http ' + r.status);
        return r.json();
      }).then(function (d) {
        var t = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (!t) throw errWith('no_answer', 'no answer');
        return cleanPolText(t);
      });
    };
  }
  function workerCall(q, history, context) {
    return fetch(WORKER_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, history: history || [], context: context || '' })
    }).then(function (r) { return r.json(); })
      .then(function (d) { if (!d.answer) throw errWith('no_answer', 'worker no answer'); return String(d.answer); });
  }

  var providers = [
    new Provider('pol-fast', 30000, polCall('openai-fast')),
    new Provider('pol-full', 45000, polCall('openai')),
    new Provider('worker', 12000, workerCall)
  ];
  function providerById(id) { for (var i = 0; i < providers.length; i++) if (providers[i].id === id) return providers[i]; return null; }

  /* ---------------- الـ Supervisor: التوجيه والاستشفاء ---------------- */
  var Supervisor = {
    degraded: false,
    // قائمة المزودين الصالحة الآن مرتبة: المغلق أولًا (بأقل p50)، ثم نصف المفتوح المستحق للجسّ
    ordered: function () {
      var t = now(), closed = [], half = [];
      for (var i = 0; i < providers.length; i++) {
        var p = providers[i];
        if (p.state === 'closed') closed.push(p);
        else if (!p.probeInFlight && t - p.openedAt >= CONFIG.breaker.halfOpenAfterMs) { p.state = 'half-open'; half.push(p); }
      }
      // بلا عيّنات بعد: يبقى ترتيب التصريح (الأسرع أولًا)؛ وبعد القياس يتصدّر الأقل p50
      closed.sort(function (a, b) {
        var ka = a.ring.length ? a.pct(0.5) : Number.MAX_SAFE_INTEGER;
        var kb = b.ring.length ? b.pct(0.5) : Number.MAX_SAFE_INTEGER;
        return ka - kb;
      });
      var list = closed.concat(half);
      this.degraded = list.length === 0;
      return list;
    },
    // جسّ استشفائي: مزود مفتوح واحد كل دورة، وبنداء خام خارج الطابور والكاش
    probeTick: function () {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      for (var i = 0; i < providers.length; i++) {
        var p = providers[i];
        if (p.state !== 'closed' && !p.probeInFlight) {
          p.probeInFlight = true;
          var t0 = now();
          withTimeout(p.call('أجب بكلمة واحدة: جاهز', [], ''), p.capMs).then(function () {
            p.record(true, now() - t0); p.state = 'closed';
          }, function () { p.record(false, now() - t0); });
          return; // مزود واحد لكل دورة كي لا نُغرق خدمة مجانية
        }
      }
    }
  };
  var probeTimer = setInterval(function () { Supervisor.probeTick(); }, CONFIG.probe.everyMs);
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', function () { Supervisor.probeTick(); });
    window.addEventListener('offline', function () { Supervisor.degraded = true; });
  }

  /* ---------------- كاش LRU محدود + سجلّ المحفوظة ---------------- */
  var cache = new Map();
  function cacheGet(key) {
    var e = cache.get(key); if (!e) return null;
    if (now() - e.ts > CONFIG.cache.staleIfErrorMs) { cache.delete(key); return null; }
    cache.delete(key); cache.set(key, e); // LRU: إعادة الإدراج تجعله الأحدث
    return e;
  }
  function cacheSet(key, text) {
    cache.set(key, { text: text, ts: now() });
    while (cache.size > CONFIG.cache.maxEntries) cache.delete(cache.keys().next().value);
  }
  function hashKey(q, history) {
    var s = String(q || '').toLowerCase().replace(/\s+/g, ' ').trim();
    var tail = (history || []).slice(-2).map(function (m) { return m.role + ':' + String(m.content || '').slice(0, 80); }).join('|');
    var h = 5381, full = s + '##' + tail;
    for (var i = 0; i < full.length; i++) h = ((h << 5) + h + full.charCodeAt(i)) | 0;
    return 'k' + (h >>> 0).toString(36) + ':' + s.length;
  }

  /* ---------------- الـ Manager: الطابور والدمج والسباق ---------------- */
  var totals = { asked: 0, cacheHits: 0, staleServed: 0, coalesced: 0, served: 0, failed: 0, fastRejected: 0, queued: 0 };
  var inflight = new Map();   // key -> Promise (دمج الطلبات المتماثلة)
  var active = 0; var queue = [];

  function attempt(p, q, history, context) {
    var t0 = now();
    return withTimeout(p.call(q, history, context), p.timeout()).then(function (text) {
      p.record(true, now() - t0); return text;
    }, function (e) { p.record(false, now() - t0); throw e; });
  }

  // سباق مُتحوَّط: يبدأ بالأفضل، ويُطلق التالي عند فشله فورًا أو بعد مهلة تحوّط
  function runProviders(q, history, context, ordered) {
    return new Promise(function (resolve, reject) {
      var settled = false, started = 0, failed = 0, timers = [];
      function cleanup() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); }
      function win(text) { if (!settled) { settled = true; cleanup(); resolve(text); } }
      function fail(e) {
        if (settled) return;
        failed++;
        if (started < ordered.length) launch();
        else if (failed >= started) { cleanup(); reject(e); }
      }
      function launch() {
        if (settled || started >= ordered.length) return;
        var p = ordered[started++];
        if (p.state === 'half-open') p.probeInFlight = true;
        attempt(p, q, history, context).then(win, fail);
        if (started < ordered.length) {
          var d = Math.min(CONFIG.hedge.maxDelayMs, Math.round(p.timeout() * CONFIG.hedge.ratio));
          timers.push(setTimeout(function () { launch(); }, d));
        }
      }
      launch();
    });
  }

  function route(q, history, context, key) {
    var ordered = Supervisor.ordered();
    if (!ordered.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      var stale0 = cacheGet(key);
      if (stale0) { totals.staleServed++; return Promise.resolve(stale0.text); }
      totals.fastRejected++;
      return Promise.reject(errWith('ai_unavailable', 'all providers down — degraded mode'));
    }
    return runProviders(q, history, context, ordered).then(function (text) {
      cacheSet(key, text); totals.served++; return text;
    }, function (e) {
      var stale = cacheGet(key);
      if (stale && now() - stale.ts <= CONFIG.cache.staleIfErrorMs) { totals.staleServed++; return stale.text; }
      totals.failed++; throw e;
    });
  }

  function pump() {
    while (active < CONFIG.queue.maxConcurrent && queue.length) {
      var job = queue.shift(); active++;
      job.run().then(function (v) { active--; job.resolve(v); pump(); },
                     function (e) { active--; job.reject(e); pump(); });
    }
  }
  function enqueue(runFn) {
    return new Promise(function (resolve, reject) {
      if (queue.length >= CONFIG.queue.maxQueue) { reject(errWith('queue_full', 'queue full')); return; }
      var job = { run: runFn, resolve: resolve, reject: reject };
      var to = setTimeout(function () {
        var i = queue.indexOf(job);
        if (i !== -1) { queue.splice(i, 1); reject(errWith('queue_timeout', 'queue timeout')); }
      }, CONFIG.queue.queueTimeoutMs);
      job.resolve = function (v) { clearTimeout(to); resolve(v); };
      job.reject = function (e) { clearTimeout(to); reject(e); };
      queue.push(job); totals.queued++; pump();
    });
  }

  function managedAsk(q, history, context) {
    totals.asked++;
    history = history || []; context = context || '';
    var key = hashKey(q, history);
    var hit = cacheGet(key);
    if (hit && now() - hit.ts <= CONFIG.cache.ttlMs) { totals.cacheHits++; return Promise.resolve(hit.text); }
    if (inflight.has(key)) { totals.coalesced++; return inflight.get(key); }
    var p = enqueue(function () { return route(q, history, context, key); });
    inflight.set(key, p);
    p.then(function () { inflight.delete(key); }, function () { inflight.delete(key); });
    return p;
  }

  function status() {
    return {
      version: '1.0.0',
      degraded: Supervisor.degraded,
      online: (typeof navigator !== 'undefined') ? navigator.onLine !== false : true,
      providers: providers.map(function (p) {
        return {
          id: p.id, state: p.state, samples: p.ring.length,
          errRate: Math.round(p.errRate() * 100) / 100,
          p50ms: p.pct(0.5), p95ms: p.pct(0.95), timeoutMs: p.timeout(),
          consecutiveFails: p.consecutiveFails
        };
      }),
      cache: { entries: cache.size, max: CONFIG.cache.maxEntries },
      queue: { active: active, waiting: queue.length },
      totals: totals
    };
  }
  function resetAll() {
    providers.forEach(function (p) { p.state = 'closed'; p.consecutiveFails = 0; p.ring = []; p.probeInFlight = false; });
    Supervisor.degraded = false;
  }

  /* ---------------- التثبيت ---------------- */
  var legacyAsk = (typeof window.VetAI_ask === 'function') ? window.VetAI_ask : null;
  if (typeof fetch === 'function') {
    window.VetAI_ask = managedAsk;         // الـ Manager يأخذ مسار الطلب
  }
  window.VetAI_supervisor = {
    version: '1.0.0', status: status, reset: resetAll, config: CONFIG,
    legacy: legacyAsk, providers: providerById
  };
})();
