/* VetAI Proactive AI Assistant — المساعد الاستباقي
   يبني واجهته بنفسه (زر عائم + لوحة) دون أي تعديل على بنية الصفحات،
   ويستعمل محرك الموقع الحالي window.VetAI_ask عند توفره،
   وإلا يبحث محليًا في فهرس المقالات (articles/manifest.json) ويعرض روابط حقيقية.
   كل البيانات الاستباقية تُبنى على الجهاز من ملفات الموقع العامة (news.json) —
   لا تُرسل أي بيانات تصفح إلى أي خادم. */
'use strict';
(function () {
  if (window.__vetaiProactiveLoaded) return;
  window.__vetaiProactiveLoaded = true;

  var WHATSAPP_URL = 'https://wa.me/14152793963';
  var NEWS_URL = 'json/news.json';
  var MANIFEST_URL = 'articles/manifest.json';
  var DISMISS_KEY = 'vetai-pa-dismissed';
  var HISTORY = [];
  var manifestCache = null;

  var EMERGENCY_WORDS = ['نزيف', 'نزف', 'تشنج', 'تشنجات', 'سم', 'تسمم', 'مبيد', 'صعوبة تنفس', 'لا يتنفس', 'اختناق', 'كسر', 'حادث', 'إغماء', 'انهيار', 'نفاخ', 'انتفاخ بطن', 'احتباس بول', 'ولادة متعسرة', 'عسر ولادة', 'ضربة شمس', 'عضة', 'لدغة', 'جروح عميقة', 'قيء دم', 'إسهال دموي'];
  var TIPS = [
    { t: 'نصيحة وقائية', b: 'التلقيح في موعده أرخص دائمًا من العلاج: راجع بطاقة تلقيح حيوانك اليوم، وأي تأخير في لقاح السعار يعرض الحيوان والأسرة للخطر.' },
    { t: 'نصيحة وقائية', b: 'ماء نظيف متجدد طوال اليوم يقي من كثير من مشاكل الكلى والمسالك، خاصة عند القطط التي تشرب قليلًا بطبيعتها.' },
    { t: 'نصيحة وقائية', b: 'افحص فم حيوانك أسبوعيًا: تراكم الجير يبدأ صامتًا وينتهي بألم والتهاب لثة ومشاكل قلب وكلى في الحالات المتقدمة.' },
    { t: 'نصيحة وقائية', b: 'في القطيع: أي حيوان يعزل نفسه عن المجموعة أو يترك العلف هو أول المرشحين للفحص — العزل المبكر يمنع انتشار العدوى.' },
    { t: 'نصيحة وقائية', b: 'احفظ أرقام الطوارئ وأقرب عيادة بيطرية في هاتفك الآن، ففي الطارئة الحقيقية لا وقت للبحث.' }
  ];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function dismissed() {
    try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch (e) { return []; }
  }
  function dismiss(id) {
    var d = dismissed();
    if (d.indexOf(id) === -1) { d.push(id); try { localStorage.setItem(DISMISS_KEY, JSON.stringify(d.slice(-30))); } catch (e) {} }
  }
  function hasEmergency(text) {
    for (var i = 0; i < EMERGENCY_WORDS.length; i++) if (text.indexOf(EMERGENCY_WORDS[i]) !== -1) return true;
    return false;
  }
  function goToView(viewId) {
    if (typeof window.switchTab === 'function') { try { window.switchTab(viewId); return true; } catch (e) {} }
    var t = document.getElementById(viewId);
    if (t) { t.scrollIntoView({ behavior: 'smooth' }); return true; }
    return false;
  }

  /* ---------- بناء الواجهة ---------- */
  var fab = el('button', 'pa-fab');
  fab.type = 'button';
  fab.setAttribute('aria-label', 'فتح المساعد الاستباقي VetAI');
  var dot = el('span', 'pa-fab-dot');
  fab.appendChild(dot);
  fab.appendChild(document.createTextNode('🤖 اسأل المساعد الذكي'));

  var panel = el('section', 'pa-panel pa-hidden');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'المساعد الاستباقي VetAI');

  var head = el('div', 'pa-head');
  var avatar = el('div', 'pa-avatar', '🩺');
  var headTxt = el('div');
  headTxt.appendChild(el('h3', null, 'المساعد الاستباقي VetAI'));
  headTxt.appendChild(el('p', null, 'يراقب الجديد ويقترح عليك الخطوة الصحيحة — اسأله أي سؤال بيطري'));
  var closeBtn = el('button', 'pa-close', '✕');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'إغلاق المساعد');
  head.appendChild(avatar); head.appendChild(headTxt); head.appendChild(closeBtn);

  var body = el('div', 'pa-body');
  var cardsBox = el('div');
  var chips = el('div', 'pa-chips');
  var chatBox = el('div');
  body.appendChild(cardsBox);
  body.appendChild(chips);
  body.appendChild(chatBox);

  var consult = el('div', 'pa-consult');
  var consultTxt = el('span', null, 'تحتاج رأيًا مباشرًا من د. محجوبي؟ الاستشارة المرئية متاحة للحالات التي لا يكفيها الجواب المكتوب.');
  var consultBtn = el('button', 'pa-card-btn pa-primary', 'احجز استشارة');
  consultBtn.type = 'button';
  consult.appendChild(consultTxt); consult.appendChild(consultBtn);

  var inputBar = el('div', 'pa-inputbar');
  var input = el('input');
  input.type = 'text';
  input.placeholder = 'اكتب سؤالك البيطري هنا…';
  input.setAttribute('aria-label', 'سؤالك البيطري');
  var sendBtn = el('button', null, 'إرسال');
  sendBtn.type = 'button';
  inputBar.appendChild(input); inputBar.appendChild(sendBtn);

  var disclaimer = el('div', 'pa-disclaimer', 'إجابات تعليمية عامة لا تغني عن فحص الطبيب البيطري؛ وفي الطوارئ اتجه فورًا إلى أقرب عيادة.');

  panel.appendChild(head); panel.appendChild(body); panel.appendChild(consult); panel.appendChild(inputBar); panel.appendChild(disclaimer);
  document.body.appendChild(fab);
  document.body.appendChild(panel);

  /* ---------- البطاقات الاستباقية ---------- */
  function addCard(id, title, text, cls, actions) {
    if (dismissed().indexOf(id) !== -1) return;
    var card = el('div', 'pa-card' + (cls ? ' ' + cls : ''));
    var close = el('button', 'pa-card-btn', 'إخفاء');
    close.type = 'button';
    close.style.cssText = 'float:left;padding:3px 10px;font-size:12px';
    close.addEventListener('click', function () { dismiss(id); card.remove(); });
    card.appendChild(close);
    card.appendChild(el('strong', null, title));
    card.appendChild(el('div', null, text));
    if (actions && actions.length) {
      var row = el('div', 'pa-card-actions');
      actions.forEach(function (a) {
        var b = el('button', 'pa-card-btn' + (a.primary ? ' pa-primary' : ''), a.label);
        b.type = 'button';
        b.addEventListener('click', a.onClick);
        row.appendChild(b);
      });
      card.appendChild(row);
    }
    cardsBox.appendChild(card);
  }

  function buildProactiveCards() {
    var title = el('div', 'pa-section-title', '✨ اقتراحات استباقية لك الآن');
    cardsBox.appendChild(title);
    var h = new Date().getHours();
    var greet = h < 12 ? 'صباح الخير' : (h < 18 ? 'نهارك سعيد' : 'مساء الخير');
    var tip = TIPS[new Date().getDate() % TIPS.length];
    addCard('tip-' + new Date().toDateString(), greet + ' — ' + tip.t, tip.b, null, [
      { label: 'تصفح المقالات السريرية', primary: true, onClick: function () { window.location.href = 'articles/'; } }
    ]);
    addCard('quiz-teaser', 'اختبر نفسك اليوم', 'تحدٍّ سريع من بنك الاختبارات الثلاثي اللغة يثبّت معلوماتك السريرية في دقائق.', null, [
      { label: 'ابدأ الاختبار', onClick: function () { closePanel(); goToView('view-exams'); } }
    ]);
    fetch(NEWS_URL, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (data) {
        var items = Array.isArray(data) ? data : (data.items || data.news || []);
        if (!items.length) return;
        var first = items[0];
        var t = first.title || first.headline || '';
        if (!t) return;
        addCard('news-' + t.slice(0, 40), '📰 جديد المنصة والقطاع', t, 'pa-alert', [
          { label: 'اقرأ المزيد داخل المنصة', onClick: function () { closePanel(); goToView('view-home'); } }
        ]);
      })
      .catch(function () { /* غياب الأخبار لا يكسر المساعد */ });
  }

  /* ---------- رقائق الإجراءات السريعة ---------- */
  [
    { label: '🚨 فرز حالة طارئة', run: function () { askAssistant('حيواني في حالة طارئة، ما أول ما أفعله الآن؟'); } },
    { label: '🔎 ابحث في المقالات', run: function () { input.value = ''; addBotMsg('اكتب اسم المرض أو العَرَض وسأبحث لك فورًا في مقالات المنصة الـ111 وأعرض روابطها المباشرة.'); input.focus(); pendingSearch = true; } },
    { label: '📚 مقالات اليوم', run: function () { window.location.href = 'articles/'; } },
    { label: '💊 دليل الأدوية', run: function () { closePanel(); goToView('view-drugs'); } }
  ].forEach(function (c) {
    var b = el('button', 'pa-chip', c.label);
    b.type = 'button';
    b.addEventListener('click', c.run);
    chips.appendChild(b);
  });

  /* ---------- المحادثة ---------- */
  var pendingSearch = false;
  function scrollChat() { body.scrollTop = body.scrollHeight; }
  function addMsg(cls, text) {
    var wrap = el('div', 'pa-msg ' + cls);
    var bubble = el('div', 'pa-bubble', text);
    wrap.appendChild(bubble);
    chatBox.appendChild(wrap);
    scrollChat();
    return bubble;
  }
  function addUserMsg(t) { return addMsg('pa-user', t); }
  function addBotMsg(t) { return addMsg('pa-bot', t); }
  function addBotLinks(intro, links) {
    var bubble = addBotMsg(intro);
    links.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.href; a.textContent = '• ' + l.title;
      a.style.display = 'block';
      bubble.appendChild(a);
    });
    scrollChat();
  }
  function showTyping() {
    var wrap = el('div', 'pa-msg pa-bot');
    var bubble = el('div', 'pa-bubble');
    var ty = el('span', 'pa-typing');
    ty.appendChild(el('span')); ty.appendChild(el('span')); ty.appendChild(el('span'));
    bubble.appendChild(ty);
    wrap.appendChild(bubble);
    chatBox.appendChild(wrap);
    scrollChat();
    return wrap;
  }

  function loadManifest() {
    if (manifestCache) return Promise.resolve(manifestCache);
    return fetch(MANIFEST_URL, { cache: 'force-cache' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (m) { manifestCache = m; return m; });
  }
  function searchArticles(q) {
    return loadManifest().then(function (m) {
      var entries = [];
      if (Array.isArray(m)) entries = m.map(function (x) { return { title: x.title || x.t || '', slug: x.slug || x.file || x.s || '' }; });
      else Object.keys(m).forEach(function (k) { entries.push({ title: k, slug: m[k] }); });
      var words = q.split(/\s+/).filter(function (w) { return w.length > 2; });
      var hits = entries.filter(function (e) {
        return words.some(function (w) { return e.title.indexOf(w) !== -1; }) || e.title.indexOf(q) !== -1;
      }).slice(0, 5);
      return hits.map(function (e) {
        var slug = String(e.slug).replace(/^articles\//, '');
        if (!/\.html$/.test(slug)) slug += '.html';
        return { title: e.title, href: 'articles/' + slug };
      });
    });
  }

  function askAssistant(q) {
    q = (q || '').trim();
    if (!q) return;
    addUserMsg(q);
    HISTORY.push({ role: 'user', content: q });

    if (hasEmergency(q)) {
      addBotMsg('🚨 هذه علامات قد تكون طارئة. تصرف الآن:\n١) أبعد مصدر الخطر فورًا (سموم/أدوية/طعام غريب) وامنع الحيوان من الأكل والشرب حتى تقييم التنفس.\n٢) لا تُعطِ أي دواء بشري أو بيطري من عندك.\n٣) اتجه فورًا إلى أقرب عيادة بيطرية أو اتصل بها أثناء الطريق، وجهّز: نوع الحيوان وعمره ووزنه التقريبي وما حدث ومتى.');
      var bubble = addBotMsg('للتواصل العاجل مع المنصة:');
      var a = document.createElement('a');
      a.href = WHATSAPP_URL; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = '💬 واتساب المنصة — رد سريع للحالات العاجلة';
      bubble.appendChild(a);
      HISTORY.push({ role: 'assistant', content: 'إرشاد طوارئ عام مع توجيه للعيادة وواتساب المنصة.' });
      return;
    }

    if (pendingSearch) {
      pendingSearch = false;
      var tw = showTyping();
      searchArticles(q).then(function (hits) {
        tw.remove();
        if (hits.length) addBotLinks('وجدت في مقالات المنصة ما يطابق بحثك — روابط مباشرة:', hits);
        else addBotMsg('لم أجد مقالًا يطابق «' + q + '» حرفيًا. جرّب كلمة أعم (مثل: سعار، بارفو، التهاب) أو اسألني السؤال كاملًا وسأجيبك مباشرة.');
      }).catch(function () {
        tw.remove();
        addBotMsg('تعذر تحميل فهرس المقالات الآن. يمكنك تصفحها كلها من صفحة المقالات داخل المنصة.');
      });
      return;
    }

    var typing = showTyping();
    if (typeof window.VetAI_ask === 'function') {
      window.VetAI_ask(q, HISTORY.slice(0, -1), '')
        .then(function (ans) {
          typing.remove();
          addBotMsg(ans);
          HISTORY.push({ role: 'assistant', content: ans });
        })
        .catch(function () {
          typing.remove();
          fallbackAnswer(q);
        });
    } else {
      typing.remove();
      fallbackAnswer(q);
    }
  }
  function fallbackAnswer(q) {
    searchArticles(q).then(function (hits) {
      if (hits.length) addBotLinks('محرك الذكاء مشغول لحظة الآن، لكن وجدت مقالات مرتبطة بسؤالك داخل المنصة:', hits);
      else addBotMsg('محرك الذكاء مشغول لحظة الآن. اكتب «ابحث في المقالات» ثم اسم المرض، أو تواصل عبر واتساب المنصة وسنرد عليك.');
    }).catch(function () {
      addBotMsg('حدثت مشكلة مؤقتة في الاتصال. حاول بعد قليل، أو تواصل عبر واتساب المنصة.');
    });
  }

  function sendCurrent() {
    var v = input.value;
    input.value = '';
    askAssistant(v);
  }
  sendBtn.addEventListener('click', sendCurrent);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendCurrent(); });
  consultBtn.addEventListener('click', function () {
    closePanel();
    if (!goToView('view-services')) window.location.href = WHATSAPP_URL;
  });

  /* ---------- فتح وإغلاق ---------- */
  var greeted = false;
  function openPanel() {
    panel.classList.remove('pa-hidden');
    fab.style.display = 'none';
    if (!greeted) {
      greeted = true;
      buildProactiveCards();
      addBotMsg('أهلًا بك في VetAI Global. أنا مساعدك الاستباقي: ألخّص لك الجديد أعلاه، وأجيب عن أسئلتك البيطرية، وأبحث لك في 111 مقالًا سريريًا. ما حالة حيوانك اليوم؟');
    }
    setTimeout(function () { input.focus(); }, 60);
  }
  function closePanel() {
    panel.classList.add('pa-hidden');
    fab.style.display = '';
  }
  fab.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.classList.contains('pa-hidden')) closePanel();
  });

  /* ظهور استباقي خفيف عند أول زيارة: نبضة على الزر دون إزعاج */
  try {
    if (!localStorage.getItem('vetai-pa-seen')) {
      localStorage.setItem('vetai-pa-seen', '1');
      setTimeout(function () { fab.style.transform = 'scale(1.07)'; setTimeout(function () { fab.style.transform = ''; }, 450); }, 2600);
    }
  } catch (e) {}
})();
