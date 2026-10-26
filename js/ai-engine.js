// محرك الذكاء الاصطناعي للمساعد. لا يغيّر أي تصميم، فقط يوفّر الدالة: VetAI_ask(question, history, context)
// إصلاح 2026-10-26: الـ Worker (vetai-chat) يحصر CORS في نطاق github.io القديم فيُحجب من النطاق الرسمي،
// فصار المسار المجاني (pollinations) هو الأساسي — يعمل من أي نطاق وبلا مفتاح — والـ Worker احتياطيًا أخيرًا.
var VETAI_WORKER_URL = 'https://vetai-chat.dr-mahdjoubi.workers.dev';

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
  function viaFree(q, history, context) {
    var msgs = [{ role: 'system', content: SYSTEM }];
    (history || []).slice(-6).forEach(function (m) { msgs.push({ role: m.role, content: m.content }); });
    msgs.push({ role: 'user', content: context ? 'معلومات مساعدة:\n' + context + '\n\nالسؤال: ' + q : q });
    return fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: msgs, temperature: 0.3 })
    }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (d) {
        var t = d.choices && d.choices[0] && d.choices[0].message.content;
        if (!t) throw new Error('no answer');
        t = String(t).split('\n').filter(function (l) { return !/pollinations/i.test(l); }).join('\n').trim();
        if (!t) throw new Error('empty');
        return t;
      });
  }

  window.VetAI_ask = function (question, history, context) {
    history = history || []; context = context || '';
    return withTimeout(viaFree(question, history, context), 30000)
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
