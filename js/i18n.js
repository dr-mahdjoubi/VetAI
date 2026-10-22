/* VetAI i18n engine — ar / en / fr. Instant, no reload, observer-based. */
(function () {
  'use strict';
  var LANGS = { ar: { dir: 'rtl', loc: 'ar-DZ' }, en: { dir: 'ltr', loc: 'en' }, fr: { dir: 'ltr', loc: 'fr' } };
  var AR = /[\u0600-\u06FF]/, SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)$/;
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var root = document.documentElement;
  var lang = 'ar', DICT = { en: {}, fr: {} }, MT = { en: {}, fr: {} };
  var tracked = new Set(), queue = {}, qTimer = 0, mtDown = 0, selfMut = false, saveT = 0;
  var obs, dirty = new Set(), flushT = 0;

  /* ---------- core dictionary: Arabic source -> translation ---------- */
  function add(l, o) { for (var k in o) DICT[l][k.trim()] = o[k]; }
  add('en', {
    'خدمة العملاء': 'Customer service', 'منصة حية': 'Live platform', 'ابدأ الآن': 'Start now', 'مريح': 'Comfort', 'داكن': 'Dark', 'فاتح': 'Light', 'مهني': 'Pro', 'جمهور': 'Public',
    'في مكان واحد': 'in one place', 'كل ما يحتاجه الطبيب والمربّي': 'Everything veterinarians and animal keepers need', 'ابحث': 'Search',
    '🏠 الرئيسية': '🏠 Home', '📖 مرجع': '📖 Reference', '🎓 تعلّم': '🎓 Learn', '🛠️ أدوات': '🛠️ Tools', '💬 مجتمع': '💬 Community', '🎮 ألعاب': '🎮 Games', 'ℹ️ عنّا': 'ℹ️ About',
    'مُقيِّم الأعراض الذكي': 'Smart symptom checker', 'اسأل بيطري-AI': 'Ask Vet-AI', 'المرجع السريري': 'Clinical reference', 'الحرارة': 'Temperature', 'النبض': 'Pulse', 'التنفس': 'Breathing',
    'عاجل': 'Urgent', 'حالة طارئة؟': 'Emergency?', 'اتصال بالدكتور': 'Call the doctor', 'واتساب': 'WhatsApp', 'لمن صُمّمت؟': 'Who is it for?', 'للمربي': 'For keepers', 'لطالب الطب البيطري': 'For veterinary students', 'للباحث والطبيب': 'For researchers & clinicians',
    'الوصول السريع': 'Quick access', 'الأدوية والعلاجات': 'Drugs & treatments', 'الأمراض والتحاليل': 'Diseases & tests', 'الدروس والاختبارات': 'Lessons & quizzes', 'المكتبة والكتب': 'Library & books', 'الموسوعة والعلوم': 'Encyclopedia & sciences', 'دليل الجامعات البيطرية': 'Veterinary universities guide',
    'محتوى حي': 'Live content', 'جديد ومحدَّث': 'New & updated', 'جديد اليوم': 'New today', 'الحيوان:': 'Animal:', 'التخصص:': 'Specialty:', 'الكل': 'All', '🐕🐈 كلاب وقطط': '🐕🐈 Dogs & cats', '🐄🐑 مجترّات': '🐄🐑 Ruminants', '🐔 دواجن': '🐔 Poultry', '🐎 خيول': '🐎 Horses',
    'بحوث': 'Research', 'تنبيهات وبائية': 'Epidemic alerts', 'تحديثات': 'Updates', 'أدوية': 'Drugs', 'نصائح': 'Tips', 'موضوع اليوم': 'Topic of the day', 'نصيحة اليوم': 'Tip of the day', 'اسأل المساعد': 'Ask the assistant', 'اقرأ المزيد': 'Read more', 'اقرأ': 'Read', 'مقالات مختارة': 'Featured articles',
    'مجتمع': 'Community', 'ألعاب الحيوانات': 'Animal games', 'لماذا تثق بالمنصة؟': 'Why trust the platform?', 'مجانية وبلا إعلانات': 'Free and ad-free', 'النوع الحيواني:': 'Animal type:', 'وصف الأعراض:': 'Symptoms:', 'قيّم الحالة': 'Assess case', 'نتيجة التقييم': 'Assessment result', 'بانتظار الإدخال': 'Waiting for input',
    'كلب': 'Dog', 'قط': 'Cat', 'بقرة': 'Cow', 'غنم/ماعز': 'Sheep/Goat', 'دجاج': 'Chicken', 'أنشئ الجدول': 'Create schedule', 'احسب': 'Calculate', 'احسب العمر': 'Calculate age', '📅 عمر الحيوان': '📅 Animal age', '💧 احتياج الماء اليومي': '💧 Daily water need', '💉 مولّد جدول التلقيح': '💉 Vaccination schedule',
    'استشارات بيطرية': 'Veterinary consultations', 'اطلب استشارة': 'Request a consultation', 'البحث العلمي': 'Scientific research', 'الأبحاث': 'Research', 'تعليم بيطري': 'Veterinary education', 'ابدأ التعلم': 'Start learning', 'قاعدة المعرفة': 'Knowledge base', 'بحث المعرفة': 'Search knowledge', 'المجتمع': 'Community',
    'المساعد البيطري الذكي': 'Smart veterinary assistant', 'إرسال': 'Send', 'الدكتور محجوبي عبدالناصر': 'Dr. Mahjoubi Abdennacer', 'د. محجوبي عبدالناصر': 'Dr. Mahjoubi Abdennacer', 'مؤسس وباحث': 'Founder & researcher', 'التواصل والخدمات': 'Contact & services', '💬 واتساب الخدمة': '💬 WhatsApp service', 'تنس، الشلف، الجزائر': 'Ténès, Chlef, Algeria'
  });
  add('fr', {
    'خدمة العملاء': 'Service client', 'منصة حية': 'Plateforme vivante', 'ابدأ الآن': 'Commencer', 'مريح': 'Confort', 'داكن': 'Sombre', 'فاتح': 'Clair', 'مهني': 'Pro', 'جمهور': 'Public',
    'في مكان واحد': 'en un seul endroit', 'كل ما يحتاجه الطبيب والمربّي': 'Tout ce dont vétérinaires et éleveurs ont besoin', 'ابحث': 'Rechercher',
    '🏠 الرئيسية': '🏠 Accueil', '📖 مرجع': '📖 Référence', '🎓 تعلّم': '🎓 Apprendre', '🛠️ أدوات': '🛠️ Outils', '💬 مجتمع': '💬 Communauté', '🎮 ألعاب': '🎮 Jeux', 'ℹ️ عنّا': 'ℹ️ À propos',
    'مُقيِّم الأعراض الذكي': 'Évaluateur intelligent de symptômes', 'اسأل بيطري-AI': 'Demander à Vet-AI', 'المرجع السريري': 'Référence clinique', 'الحرارة': 'Température', 'النبض': 'Pouls', 'التنفس': 'Respiration',
    'عاجل': 'Urgent', 'حالة طارئة؟': 'Urgence ?', 'اتصال بالدكتور': 'Appeler le docteur', 'واتساب': 'WhatsApp', 'لمن صُمّمت؟': 'Pour qui ?', 'للمربي': 'Pour les éleveurs', 'لطالب الطب البيطري': 'Pour les étudiants en médecine vétérinaire', 'للباحث والطبيب': 'Pour chercheurs et cliniciens',
    'الوصول السريع': 'Accès rapide', 'الأدوية والعلاجات': 'Médicaments et traitements', 'الأمراض والتحاليل': 'Maladies et analyses', 'الدروس والاختبارات': 'Cours et quiz', 'المكتبة والكتب': 'Bibliothèque et livres', 'الموسوعة والعلوم': 'Encyclopédie et sciences', 'دليل الجامعات البيطرية': 'Guide des universités vétérinaires',
    'محتوى حي': 'Contenu vivant', 'جديد ومحدَّث': 'Nouveau et mis à jour', 'جديد اليوم': 'Nouveau aujourd’hui', 'الحيوان:': 'Animal :', 'التخصص:': 'Spécialité :', 'الكل': 'Tout', '🐕🐈 كلاب وقطط': '🐕🐈 Chiens et chats', '🐄🐑 مجترّات': '🐄🐑 Ruminants', '🐔 دواجن': '🐔 Volailles', '🐎 خيول': '🐎 Chevaux',
    'بحوث': 'Recherches', 'تنبيهات وبائية': 'Alertes épidémiques', 'تحديثات': 'Mises à jour', 'أدوية': 'Médicaments', 'نصائح': 'Conseils', 'موضوع اليوم': 'Sujet du jour', 'نصيحة اليوم': 'Conseil du jour', 'اسأل المساعد': 'Demander à l’assistant', 'اقرأ المزيد': 'Lire la suite', 'اقرأ': 'Lire', 'مقالات مختارة': 'Articles choisis',
    'مجتمع': 'Communauté', 'ألعاب الحيوانات': 'Jeux d’animaux', 'لماذا تثق بالمنصة؟': 'Pourquoi faire confiance à la plateforme ?', 'مجانية وبلا إعلانات': 'Gratuite et sans publicité', 'النوع الحيواني:': 'Espèce :', 'وصف الأعراض:': 'Symptômes :', 'قيّم الحالة': 'Évaluer le cas', 'نتيجة التقييم': 'Résultat de l’évaluation', 'بانتظار الإدخال': 'En attente de saisie',
    'كلب': 'Chien', 'قط': 'Chat', 'بقرة': 'Vache', 'غنم/ماعز': 'Mouton/Chèvre', 'دجاج': 'Poulet', 'أنشئ الجدول': 'Créer le calendrier', 'احسب': 'Calculer', 'احسب العمر': 'Calculer l’âge', '📅 عمر الحيوان': '📅 Âge de l’animal', '💧 احتياج الماء اليومي': '💧 Besoin en eau quotidien', '💉 مولّد جدول التلقيح': '💉 Calendrier de vaccination',
    'استشارات بيطرية': 'Consultations vétérinaires', 'اطلب استشارة': 'Demander une consultation', 'البحث العلمي': 'Recherche scientifique', 'الأبحاث': 'Recherches', 'تعليم بيطري': 'Enseignement vétérinaire', 'ابدأ التعلم': 'Commencer à apprendre', 'قاعدة المعرفة': 'Base de connaissances', 'بحث المعرفة': 'Rechercher', 'المجتمع': 'Communauté',
    'المساعد البيطري الذكي': 'Assistant vétérinaire intelligent', 'إرسال': 'Envoyer', 'الدكتور محجوبي عبدالناصر': 'Dr Mahjoubi Abdennacer', 'د. محجوبي عبدالناصر': 'Dr Mahjoubi Abdennacer', 'مؤسس وباحث': 'Fondateur et chercheur', 'التواصل والخدمات': 'Contact et services', '💬 واتساب الخدمة': '💬 WhatsApp service', 'تنس، الشلف، الجزائر': 'Ténès, Chlef, Algérie'
  });

  /* ---------- storage ---------- */
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function loadMT() { ['en', 'fr'].forEach(function (l) { try { MT[l] = JSON.parse(ls('i18n_mt_' + l) || '{}'); } catch (e) { MT[l] = {}; } }); }
  function saveMT() { clearTimeout(saveT); saveT = setTimeout(function () { ls('i18n_mt_' + lang, JSON.stringify(MT[lang])); }, 800); }

  /* ---------- translation lookup ---------- */
  function lookup(key) { return DICT[lang][key] || MT[lang][key] || null; }
  function tr(src) {
    if (lang === 'ar' || !AR.test(src)) return src;
    var key = src.trim(), r = lookup(key);
    if (r) return src.replace(key, function () { return r; });
    if (!queue[key]) { queue[key] = 1; schedule(); }
    return src;
  }

  /* ---------- machine-translation fallback (MyMemory, cached, throttled) ---------- */
  function schedule() { clearTimeout(qTimer); qTimer = setTimeout(drain, 350); }
  function pieces(t) {
    if (t.length <= 450) return [t];
    var out = [], cur = '';
    t.split(/(?<=[.؟!؛\n])/).forEach(function (s) { if ((cur + s).length > 450) { if (cur) out.push(cur); cur = s; } else cur += s; });
    if (cur) out.push(cur); return out;
  }
  function mtOne(txt, l) {
    return fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(txt) + '&langpair=ar|' + l)
      .then(function (r) { return r.json(); })
      .then(function (j) { var t = j && j.responseData && j.responseData.translatedText; if (!t || /MYMEMORY WARNING|QUERY LENGTH/i.test(t)) throw 0; return t; });
  }
  function drain() {
    if (Date.now() < mtDown || lang === 'ar') return;
    var l = lang, keys = Object.keys(queue).slice(0, 6);
    if (!keys.length) return;
    keys.forEach(function (k) { delete queue[k]; });
    Promise.all(keys.map(function (k) {
      return Promise.all(pieces(k).map(function (p) { return mtOne(p, l); }))
        .then(function (a) { MT[l][k] = a.join(' '); }, function () { throw k; });
    })).then(function () { saveMT(); if (l === lang) refresh(); next(); }, function () { mtDown = Date.now() + 60000; keys.forEach(function (k) { queue[k] = 1; }); setTimeout(next, 61000); });
  }
  function next() { if (Object.keys(queue).length) setTimeout(drain, 250); }

  /* ---------- DOM processing ---------- */
  function rec(map, k) { return map.get(k) || (map.set(k, {}), map.get(k)); }
  var TXT = new WeakMap(), ATT = new WeakMap();
  function doText(n) {
    var r = TXT.get(n), v = n.nodeValue;
    if (r && r.out === v) { if (lang === 'ar') { n.nodeValue = r.src; TXT.delete(n); } else { var o = tr(r.src); if (o !== v) { n.nodeValue = o; r.out = o; } } return; }
    if (lang === 'ar' || !AR.test(v)) { if (r) TXT.delete(n); return; }
    r = { src: v, out: tr(v) }; TXT.set(n, r); tracked.add(n); if (r.out !== v) n.nodeValue = r.out;
  }
  function doAttr(el, a) {
    var m = rec(ATT, el), r = m[a], v = el.getAttribute(a); if (v == null) return;
    if (r && r.out === v) { var o = lang === 'ar' ? r.src : tr(r.src); if (o !== v) { el.setAttribute(a, o); r.out = o; } return; }
    if (lang === 'ar' || !AR.test(v)) return;
    m[a] = { src: v, out: tr(v) }; tracked.add(el); if (m[a].out !== v) el.setAttribute(a, m[a].out);
  }
  function doEl(el) { for (var i = 0; i < ATTRS.length; i++) if (el.hasAttribute(ATTRS[i])) doAttr(el, ATTRS[i]); }
  function scan(node) {
    if (node.nodeType === 3) { if (!SKIP.test(node.parentNode && node.parentNode.nodeName)) doText(node); return; }
    if (node.nodeType !== 1 || SKIP.test(node.nodeName)) return;
    doEl(node);
    var w = document.createTreeWalker(node, 5, { acceptNode: function (n) { return n.nodeType === 1 ? (SKIP.test(n.nodeName) ? 2 : 1) : 1; } }), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  function refresh() {
    selfMut = true;
    tracked.forEach(function (x) {
      if (!x.isConnected) { tracked.delete(x); return; }
      if (x.nodeType === 3) doText(x); else ATTRS.forEach(function (a) { if (ATT.get(x) && ATT.get(x)[a]) doAttr(x, a); });
      if (lang === 'ar' && x.nodeType === 3 && !TXT.has(x)) tracked.delete(x);
    });
    selfMut = false; if (obs) obs.takeRecords();
  }
  function flush() {
    flushT = 0; var list = Array.from(dirty); dirty.clear(); selfMut = true;
    list.forEach(function (n) { if (n.isConnected) scan(n); });
    selfMut = false; obs.takeRecords();
  }
  function observe() {
    if (obs) return;
    obs = new MutationObserver(function (ms) {
      if (selfMut || lang === 'ar') return;
      ms.forEach(function (m) {
        if (m.type === 'childList') m.addedNodes.forEach(function (n) { dirty.add(n); });
        else dirty.add(m.target);
      });
      if (!flushT) flushT = requestAnimationFrame(flush);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /* ---------- language switch ---------- */
  function setLang(l) {
    if (!LANGS[l]) l = 'ar';
    lang = l; ls('lang', l);
    root.lang = l; root.dir = LANGS[l].dir; root.setAttribute('data-lang', l);
    document.querySelectorAll('#lsel,#lang').forEach(function (s) { if (s.value !== l) s.value = l; });
    var t = document.documentElement.getAttribute('data-title-ar') || (document.documentElement.setAttribute('data-title-ar', document.title), document.title);
    document.title = l === 'ar' ? t : (DICT[l].__title || t);
    selfMut = true;
    if (l === 'ar') { refresh(); tracked.clear(); } else { loadMT(); observe(); scan(document.body); refresh(); }
    selfMut = false; if (obs) obs.takeRecords();
    window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: l } }));
  }
  function aiSuffix() { return lang === 'ar' ? '' : '\n\n[Answer language: ' + (lang === 'en' ? 'English' : 'French') + '. Write the entire reply in this language, keep medical terms in standard Latin form.]'; }
  function init() {
    loadMT();
    document.querySelectorAll('#lsel,#lang').forEach(function (s) { s.onchange = function (e) { setLang(e.target.value); }; });
    setLang(ls('lang') || 'ar');
  }
  DICT.en.__title = 'VetAI Global × Dr. Mahjoubi | Unified Veterinary Platform';
  DICT.fr.__title = 'VetAI Global × Dr Mahjoubi | Plateforme vétérinaire unifiée';

  window.I18N = {
    setLang: setLang, add: add, aiSuffix: aiSuffix,
    get lang() { return lang; },
    t: function (s) { return lang === 'ar' ? s : (lookup(String(s).trim()) || s); },
    load: function (l, url) { return fetch(url).then(function (r) { return r.json(); }).then(function (o) { add(l, o); if (l === lang) refresh(); }); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  /* ---------- LTR mirror of Tailwind physical utilities (generated, no layout drift) ---------- */
  var st = document.createElement('style'), css = [], S = [0, .5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12];
  S.forEach(function (n) {
    var c = String(n).replace('.', '\\.'), v = n * .25 + 'rem';
    [['ml', 'mr', 'margin'], ['pl', 'pr', 'padding']].forEach(function (p) {
      css.push('html[dir=ltr] .' + p[0] + '-' + c + '{' + p[2] + '-left:0!important;' + p[2] + '-right:' + v + '!important}');
      css.push('html[dir=ltr] .' + p[1] + '-' + c + '{' + p[2] + '-right:0!important;' + p[2] + '-left:' + v + '!important}');
    });
    css.push('html[dir=ltr] .left-' + c + '{left:auto!important;right:' + v + '!important}');
    css.push('html[dir=ltr] .right-' + c + '{right:auto!important;left:' + v + '!important}');
    css.push('html[dir=ltr] .space-x-' + c + '>:not([hidden])~:not([hidden]){margin-right:0!important;margin-left:' + v + '!important}');
  });
  st.id = 'i18n-mirror'; st.textContent = css.join('\n'); document.head.appendChild(st);
})();
