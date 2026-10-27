// محرك الذكاء الاصطناعي للمساعد. لا يغيّر أي تصميم، فقط يوفّر الدالة: VetAI_ask(question, history, context)
// إصلاح 2026-10-27: خدمة vetai-chat الأصلية في حساب Cloudflare آخر لا نملك تعديله، فاستُبدلت بخدمة
// بديلة في حساب المالك (vetai-chat.vcom.workers.dev) تسمح بكل نطاقات الإنتاج؛ والمسار المجاني هو الأساسي.
// إصلاح 2026-10-27: نموذج openai كان يرد في ~29 ثانية فيلامس مهلة 30 ثانية ويسقط على الهواتف.
// صار الطلب سباقًا متوازيًا بين openai-fast و openai (أول نجاح يفوز) مع جولة ثانية عند الفشل،
// لأن زمن رد الخدمة المجانية متقلب جدًا (من ثانية واحدة إلى ~30 ثانية).
var VETAI_WORKER_URL = 'https://vetai-chat.vcom.workers.dev';

(function () {
  var SYSTEM = 'أنت "بيطري-AI"، مساعد في منصة VetAI Global Intelligence للطب البيطري. ' +
    'أجب بلغة المستخدم بوضوح ودقة وباختصار منظم. إجاباتك تعليمية ولا تغني عن الطبيب البيطري. ' +
    'لا تخترع مصادر. إن لم تكن متأكداً فقل ذلك.';

  function withTimeout(p, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout')); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }

  function viaWorker(q, history, context) {
    return fetch(VETAI_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, history: history, context: context })
    }).then(function (r) { return r.json(); })
      .then(function (d) { if (!d.answer) throw new Error('no answer'); return d.answer; });
  }

  // المسار الأساسي: ذكاء مجاني بلا مفتاح، CORS مفتوح، يعمل من أي استضافة
  function viaFree(q, history, context, model) {
    var msgs = [{ role: 'system', content: SYSTEM }];
    (history || []).slice(-6).forEach(function (m) { msgs.push({ role: m.role, content: m.content }); });
    msgs.push({ role: 'user', content: context ? 'معلومات مساعدة:\n' + context + '\n\nالسؤال: ' + q : q });
    return fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || 'openai-fast', messages: msgs, temperature: 0.3 })
    }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (d) {
        var t = d.choices && d.choices[0] && d.choices[0].message.content;
        if (!t) throw new Error('no answer');
        t = String(t).split('\n').filter(function (l) { return !/pollinations/i.test(l); }).join('\n').trim();
        if (!t) throw new Error('empty');
        return t;
      });
  }

  function delay(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  // سباق متوازٍ بين النموذجين: أول إجابة ناجحة تفوز، والفشل لا يُعلن إلا بسقوط الاثنين
  function raceFree(q, history, context) {
    return new Promise(function (resolve, reject) {
      var done = false, fails = 0;
      function ok(t) { if (!done) { done = true; resolve(t); } }
      function bad() { fails++; if (fails === 2 && !done) { done = true; reject(new Error('both models failed')); } }
      withTimeout(viaFree(q, history, context, 'openai-fast'), 30000).then(ok, bad);
      withTimeout(viaFree(q, history, context, 'openai'), 45000).then(ok, bad);
    });
  }

  window.VetAI_ask = function (question, history, context) {
    history = history || []; context = context || '';
    return raceFree(question, history, context)
      .catch(function () { return delay(1500).then(function () { return raceFree(question, history, context); }); })
      .catch(function () { return withTimeout(viaWorker(question, history, context), 12000); });
  };
})();

// جسر التوافق: يجعل كل ميزات الموقع التي تستدعي claude.use('sample') تعمل عبر المحرك
(function () {
  if (window.claude && typeof window.claude.use === 'function') return; // داخل Claude: لا حاجة للجسر
  function toText(p) {
    if (typeof p === 'string') return p;
    if (Array.isArray(p)) return p.map(function (m) { return m && m.content != null ? m.content : ''; }).join('\n');
    return String(p || '');
  }
  function trim(t) {
    if (t.length <= 1900) return t;
    return t.slice(0, 700) + '\n...\n' + t.slice(-1150);
  }
  async function sample(prompt, opts) {
    var q = trim(toText(prompt));
    var text = await window.VetAI_ask(q, [], '');
    if (opts && typeof opts.onText === 'function') { try { opts.onText({ text: text }); } catch (e) {} }
    return { text: text };
  }
  window.claude = window.claude || {};
  window.claude.use = async function (name) { return name === 'sample' ? sample : null; };
})();
