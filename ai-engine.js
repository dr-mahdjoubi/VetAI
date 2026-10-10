// محرك الذكاء الاصطناعي للمساعد. لا يغيّر أي تصميم، فقط يوفّر الدالة: VetAI_ask(question, history, context)
// ضع رابط الـ Worker هنا بعد إنشائه (يبدأ بـ https:// وينتهي بـ workers.dev)
var VETAI_WORKER_URL = '';

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

  // بديل احتياطي مجاني بدون مفتاح (قد تتغير شروطه من مزوّده)
  function viaFree(q, history, context) {
    var msgs = [{ role: 'system', content: SYSTEM }];
    (history || []).slice(-6).forEach(function (m) { msgs.push({ role: m.role, content: m.content }); });
    msgs.push({ role: 'user', content: context ? 'معلومات مساعدة:\n' + context + '\n\nالسؤال: ' + q : q });
    return fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: msgs })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        var t = d.choices && d.choices[0] && d.choices[0].message.content;
        if (!t) throw new Error('no answer');
        return t;
      });
  }

  window.VetAI_ask = function (question, history, context) {
    history = history || []; context = context || '';
    var first = VETAI_WORKER_URL ? viaWorker : viaFree;
    var second = VETAI_WORKER_URL ? viaFree : null;
    return withTimeout(first(question, history, context), 25000).catch(function (e) {
      if (second) return withTimeout(second(question, history, context), 25000);
      throw e;
    });
  };
})();
