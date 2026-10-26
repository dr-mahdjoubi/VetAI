/* ============================================================
   VetAI Innovations — ابتكارات تجربة الاستخدام
   1) بحث عالمي فوري (Ctrl+K): أمراض، مقالات، فصائل، كتب، أقسام
   2) سؤال اليوم: اختبار يومي بسلسلة أيام متتالية
   3) «استمع» و«شارك» لمقالات موسوعة المواضيع
   إضافي بالكامل — لا يعدّل أي وظيفة قائمة
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function norm(t) { return (t || '').toLowerCase().replace(/[ً-ٰٟ]/g, '').replace(/إ|أ|آ/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim(); }
  function go(tab) { if (typeof switchTab === 'function') switchTab(tab); }

  /* ---------------- 1) البحث العالمي الفوري ---------------- */
  var SECTIONS = [
    ['الرئيسية', 'home'], ['المرجع السريري', 'ref'], ['موسوعة المواضيع', 'catalog'],
    ['الأدوية والعلاجات', 'drugs'], ['الأمراض والتحاليل', 'dxlab'], ['الموسوعة والعلوم', 'knowledge'],
    ['الدروس والاختبارات', 'exams'], ['المكتبة والكتب', 'library'], ['الصور والفيديوهات', 'media'],
    ['لأصحاب الكلاب والقطط والفصائل', 'pets'], ['مُقيّم الأعراض الذكي', 'ai-diagnostics'],
    ['الخدمات', 'services'], ['المساعد البيطري والمجتمع', 'chat']
  ];
  var IDX = null; // يُبنى عند أول فتح
  function buildIndex() {
    var idx = [];
    SECTIONS.forEach(function (s) { idx.push({ t: s[0], k: 'قسم', tab: s[1] }); });
    (window.__DZ || []).forEach(function (d) { idx.push({ t: d[0], k: 'مرض · ' + d[1], tab: 'catalog', q: d[0] }); });
    if (window.EXTRA) window.EXTRA.forEach(function (a) { if (a && a[0]) idx.push({ t: a[0], k: 'مقال سريري', tab: 'knowledge', gq: a[0] }); });
    $$('.brd-card h3').forEach(function (h) { idx.push({ t: h.textContent.trim(), k: 'فصيلة', tab: 'pets', bq: h.textContent.trim() }); });
    $$('#wonders article h3').forEach(function (h) { idx.push({ t: h.textContent.trim(), k: 'قصة حيوان', tab: 'library', scroll: h.closest('article') }); });
    $$('.card.game h3, .card.game .t').forEach(function (h) { var tx = h.textContent.trim(); if (tx) idx.push({ t: tx, k: 'لعبة تعليمية', tab: 'home', scroll: h.closest('.card') || h }); });
    return idx;
  }
  function loadBooks(idx) {
    fetch('json/resources.json').then(function (r) { return r.json(); }).then(function (d) {
      (d.books || []).forEach(function (b) { idx.push({ t: b.title.replace(/\s*\((WHO|FAO|NCBI)[^)]*\)\s*$/, ''), k: 'كتاب مجاني', tab: 'library' }); });
    }).catch(function () {});
  }
  var ov, inp, list, sel = 0, cur = [];
  function makeOverlay() {
    ov = document.createElement('div'); ov.id = 'va-qs'; ov.hidden = true;
    ov.innerHTML = '<div class="va-qs-back"></div><div class="va-qs-box" role="dialog" aria-label="بحث سريع في كل الموقع">' +
      '<div class="va-qs-head">🔍 <input id="va-qs-inp" type="search" placeholder="ابحث في كل الموقع: مرض، مقال، فصيلة، كتاب، لعبة..." autocomplete="off"><kbd>Esc</kbd></div>' +
      '<div id="va-qs-list"></div>' +
      '<div class="va-qs-foot">↑↓ للتنقل · Enter للفتح · يبحث في 101 مرض و111 مقالًا و24 فصيلة وكتب وألعاب الموقع</div></div>';
    document.body.appendChild(ov);
    inp = $('#va-qs-inp', ov); list = $('#va-qs-list', ov);
    $('.va-qs-back', ov).addEventListener('click', closeQS);
    inp.addEventListener('input', function () { renderQS(inp.value); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (cur[sel]) openItem(cur[sel]); }
    });
  }
  function moveSel(d) { if (!cur.length) return; sel = (sel + d + cur.length) % cur.length; $$('.va-qs-it', list).forEach(function (el, i) { el.classList.toggle('on', i === sel); }); }
  function renderQS(q) {
    var nq = norm(q); sel = 0;
    if (!nq) { list.innerHTML = '<div class="va-qs-hint">ابدأ الكتابة... جرّب: سعار، التهاب ضرع، سلوقي، أسنان، لعبة</div>'; cur = []; return; }
    var hits = IDX.filter(function (x) { return norm(x.t).indexOf(nq) > -1 || norm(x.k).indexOf(nq) > -1; });
    hits.sort(function (a, b) { var sa = norm(a.t).indexOf(nq) === 0 ? 0 : 1, sb = norm(b.t).indexOf(nq) === 0 ? 0 : 1; return sa - sb; });
    cur = hits.slice(0, 9);
    list.innerHTML = cur.length ? '' : '<div class="va-qs-hint">لا نتائج لـ«' + q.replace(/</g, '') + '» — جرّب كلمة أقصر</div>';
    cur.forEach(function (x, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'va-qs-it' + (i === 0 ? ' on' : '');
      b.innerHTML = '<span class="va-qs-t"></span><span class="va-qs-k"></span>';
      $('.va-qs-t', b).textContent = x.t; $('.va-qs-k', b).textContent = x.k;
      b.addEventListener('click', function () { openItem(x); });
      list.appendChild(b);
    });
  }
  function flash(el) { if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('va-flash'); setTimeout(function () { el.classList.remove('va-flash'); }, 2400); }
  function openItem(x) {
    closeQS(); go(x.tab);
    setTimeout(function () {
      if (x.q) { var cq = $('#cq2'); if (cq) { cq.value = x.q; cq.dispatchEvent(new Event('input', { bubbles: true })); flash($('#cl > button')); } }
      else if (x.gq) { var gs = $('#gs'); if (gs) { gs.value = x.gq; gs.dispatchEvent(new Event('input', { bubbles: true })); gs.focus(); } }
      else if (x.bq) { var bs = $('#brdSearch'); if (bs) { bs.value = x.bq; bs.dispatchEvent(new Event('input', { bubbles: true })); flash($('.brd-card')); } }
      else if (x.scroll) { flash(x.scroll); }
    }, 420);
  }
  function openQS() { if (!IDX) { IDX = buildIndex(); loadBooks(IDX); } if (!ov) makeOverlay(); ov.hidden = false; inp.value = ''; renderQS(''); setTimeout(function () { inp.focus(); }, 40); }
  function closeQS() { if (ov) ov.hidden = true; }
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); ov && !ov.hidden ? closeQS() : openQS(); }
    if (e.key === 'Escape') closeQS();
  });
  function addSearchButton() {
    var isl = $('#gnav .isl'); if (!isl || $('#va-qs-btn')) return;
    var b = document.createElement('button'); b.id = 'va-qs-btn'; b.type = 'button'; b.className = 'ic'; b.title = 'بحث سريع في كل الموقع (Ctrl+K)'; b.setAttribute('aria-label', 'بحث سريع'); b.textContent = '🔍';
    b.addEventListener('click', openQS);
    var set = $('#setbtn'); if (set) isl.insertBefore(b, set); else isl.appendChild(b);
  }

  /* ---------------- 2) سؤال اليوم ---------------- */
  var QUIZ = [
    ['ما أول ما يجب أن يتناوله المولود الجديد من أمه بعد الولادة؟', ['الحليب العادي', 'اللبأ (السرسوب)', 'الماء بالسكر', 'العشب المفروم'], 1, 'اللبأ في أول ساعات العمر ينقل الأجسام المضادة والمناعة من الأم إلى المولود.'],
    ['كم تبلغ مدة حمل الكلبة تقريبًا؟', ['30 يومًا', '63 يومًا', '90 يومًا', '114 يومًا'], 1, 'حمل الكلبة نحو 63 يومًا من التزاوج (58–68 يومًا ضمن الطبيعي).'],
    ['كم تبلغ مدة حمل البقرة تقريبًا؟', ['150 يومًا', '210 أيام', '283 يومًا', '340 يومًا'], 2, 'نحو 283 يومًا (تسعة أشهر تقريبًا) وتختلف قليلًا بحسب السلالة.'],
    ['كم تبلغ مدة حمل الفرس تقريبًا؟', ['شهران', 'خمسة أشهر', 'نحو 11 شهرًا', 'سنتان'], 2, 'نحو 340 يومًا، أي قرابة 11 شهرًا.'],
    ['كم تبلغ مدة حمل القطة تقريبًا؟', ['30 يومًا', '45 يومًا', '65 يومًا', '100 يوم'], 2, 'نحو 65 يومًا (61–69 يومًا).'],
    ['كل كم مدة يُنصح بتقليم حوافر الحصان وتحديتها؟', ['كل أسبوع', 'كل 6–8 أسابيع', 'كل 6 أشهر', 'مرة في العمر'], 1, 'الحوافر تنمو باستمرار؛ التقليم المنتظم كل 6–8 أسابيع يحفظ التوازن والمشية.'],
    ['ما الاختبار الحقلي السريع للكشف عن التهاب الضرع تحت السريري؟', ['اختبار السكر', 'اختبار كاليفورنيا CMT', 'قياس الحرارة', 'عدّ النبض'], 1, 'يخلط CMT الحليب بكاشف خاص؛ التجلّط يدل على ارتفاع الخلايا الجسدية والتهاب خفي.'],
    ['ماذا تعني القطة غالبًا حين ترفع ذيلها عموديًا مع اهتزاز خفيف؟', ['غضب شديد', 'خوف', 'تحية وود وثقة', 'ألم حاد'], 2, 'الذيل العمودي المهتز تحية سعيدة وثقة بصاحبها.'],
    ['أي طعام منزلي شائع يُعد سامًا للكلاب والقطط؟', ['الأرز المطبوخ', 'الجزر', 'الشوكولاتة', 'اليقطين'], 2, 'الثيوبرومين في الشوكولاتة سام لهما، وخطره يزيد كلما كانت داكنة.'],
    ['ما الغذاء الأساسي الذي يجب أن يتوفر للأرنب طوال اليوم؟', ['الحبوب فقط', 'التبن', 'الفاكهة', 'الخبز'], 1, 'التبن نحو 80% من غذاء الأرنب: يبلي أسنانه النامية ويحرّك جهازه الهضمي.'],
    ['كم عدد أسنان الكلب البالغ الدائمة؟', ['28', '32', '42', '48'], 2, '42 سنًا دائمة عند الكلب البالغ.'],
    ['كم عدد أسنان القط البالغ الدائمة؟', ['26', '30', '36', '44'], 1, '30 سنًا دائمة عند القط البالغ.'],
    ['ما اللقاح الذي يحمي الحيوان والإنسان معًا من مرض قاتل؟', ['لقاح السعار (داء الكلب)', 'لقاح الديدان', 'فيتامينات', 'لقاح الزكام فقط'], 0, 'السعار قاتل ومنقول للإنسان؛ تلقيح الكلاب والقطط خط الدفاع الأول.'],
    ['ما حرارة جسم الكلب الطبيعية تقريبًا؟', ['35 درجة', '36.5 درجة', '38–39.2 درجة', '41 درجة'], 2, 'المدى الطبيعي للكلب نحو 38–39.2°م؛ فوق 39.5 تستدعي الانتباه.'],
    ['ماذا يقيس «عدّ الخلايا الجسدية» في حليب الأبقار؟', ['نسبة الدهن', 'مؤشر التهاب الضرع وجودة الحليب', 'نسبة السكر', 'لون الحليب'], 1, 'ارتفاعه يشير إلى التهاب الضرع (غالبًا تحت السريري) ويؤثر في جودة الحليب وسعره.'],
    ['ما أول خطوة صحيحة عند الاشتباه بتسمّم حيوانك؟', ['إعطاؤه الحليب فورًا', 'إحداث القيء دائمًا', 'إبعاده عن المصدر والاتصال بالطبيب فورًا', 'الانتظار يومًا كاملًا'], 2, 'لا تحدث القيء إلا بأمر الطبيب؛ بعض السموم تحرق المريء عند صعودها.'],
    ['ما الصوت غير الطبيعي الذي قد يسمعه الطبيب بالسماعة في القلب؟', ['النفخة القلبية', 'الخرخرة', 'الحازوقة', 'الشخير'], 0, 'النفخة صوت إضافي قد يدل على مرض صمامات أو فتحة غير طبيعية ويستدعي فحصًا أعمق.'],
    ['أي علامة من التالية تدل على الجفاف عند الحيوان؟', ['لثة رطبة ولماعة', 'بطء رجوع ثنية الجلد وبقاءها مرفوعة', 'لعاب غزير', 'أنف بارد ورطب'], 1, 'اختبار ثنية الجلد وخيوط اللعاب اللزجة وجفاف اللثة علامات كلاسيكية للجفاف.'],
    ['ما أفضل وسيلة تعريف دائمة لحيوانك الأليف إن ضاع؟', ['طوق ملوّن', 'جرس', 'الشريحة الإلكترونية (Microchip)', 'وشم مؤقت'], 2, 'الشريحة دائمة ولا تسقط، وتقرؤها العيادات والملاجئ لإعادة الحيوان لصاحبه.'],
    ['متى يكتمل فطام الجراء غالبًا؟', ['أسبوعان', '3 أيام', '7–8 أسابيع', '6 أشهر'], 2, 'يبدأ الفطام تدريجيًا من 3–4 أسابيع ويكتمل غالبًا عند 7–8 أسابيع.'],
    ['ما المادة التي تحتاجها القطط من الغذاء الحيواني ولا تصنعها كفاية؟', ['التورين', 'فيتامين د فقط', 'الكالسيوم فقط', 'الحديد فقط'], 0, 'التورين حمض أميني أساسي للقطط؛ نقصه يضر القلب والعينين.'],
    ['كم نبضة قلب القط الطبيعية أثناء الراحة تقريبًا؟', ['40–60', '70–90', '140–220', '300'], 2, 'قلب القط أسرع من قلب الإنسان بكثير: نحو 140–220 نبضة في الدقيقة.'],
    ['لماذا تُخفى أعراض الألم عند القطط غالبًا حتى يتقدم المرض؟', ['لأنها لا تشعر بالألم', 'غريزة إخفاء الضعف عن المفترسين', 'لأنها تنام كثيرًا فقط', 'لأن أصحابها لا يلاحظون أبدًا'], 1, 'كحيوان فريسة في الطبيعة تخفي القطط ضعفها؛ تغيّر الشهية والاختباء إنذاران مبكران.'],
    ['أي سلوك عند الكلب يدل غالبًا على القلق لا «الذنب»؟', ['الأذنان للخلف والانكماش عند توبيخه', 'هز الذيل', 'اللعب', 'النوم على الظهر'], 0, 'ما يبدو «شعورًا بالذنب» هو غالبًا إشارات تهدئة وقلق من رد فعل صاحبه.']
  ];
  function todayKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function buildQuiz() {
    var home = $('#view-home'); if (!home || $('#va-quiz')) return;
    var hero = home.querySelector('.vg-global-intro');
    var card = document.createElement('div'); card.id = 'va-quiz'; card.className = 'glass-panel rounded-3xl p-6';
    var now = new Date(), tk = todayKey(now);
    var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    var item = QUIZ[doy % QUIZ.length];
    var st = null; try { st = JSON.parse(localStorage.getItem('va_dq') || 'null'); } catch (e) {}
    var answered = st && st.d === tk;
    var seed = doy % item[1].length;
    var opts = item[1].map(function (t, i) { return { t: t, ok: i === item[2] }; });
    opts = opts.slice(seed).concat(opts.slice(0, seed));
    var top = '<div class="va-qtop"><h3 class="font-black text-vetCyan">🧠 سؤال اليوم البيطري</h3>' +
      (st && st.s ? '<span class="va-qstreak">🔥 سلسلة أيام صحيحة: ' + st.s + '</span>' : '') + '</div>';
    if (answered) {
      card.innerHTML = top + '<p class="va-qq">' + item[0] + '</p><p class="va-qwhy">' +
        (st.ok ? '✓ أجبت إجابة صحيحة اليوم — عد غدًا لسؤال جديد وحافظ على سلسلتك.' : 'أجبت اليوم. الإجابة الصحيحة: «' + item[1][item[2]] + '» — ' + item[3]) + '</p>';
    } else {
      card.innerHTML = top + '<p class="va-qq">' + item[0] + '</p><div class="va-qopts">' +
        opts.map(function (o, i) { return '<button type="button" class="va-qopt" data-i="' + i + '">' + o.t + '</button>'; }).join('') +
        '</div><div class="va-qwhy" hidden></div>';
      card.addEventListener('click', function (e) {
        var b = e.target.closest('.va-qopt'); if (!b || card.dataset.done) return;
        card.dataset.done = '1';
        var o = opts[+b.dataset.i];
        $$('.va-qopt', card).forEach(function (el, i) { el.disabled = true; if (opts[i].ok) el.classList.add('ok'); });
        if (!o.ok) b.classList.add('no');
        var prev = st && st.d === todayKey(new Date(now.getTime() - 86400000)) ? (st.s || 0) : 0;
        var ns = o.ok ? prev + 1 : 0;
        try { localStorage.setItem('va_dq', JSON.stringify({ d: tk, s: ns, ok: o.ok })); } catch (e2) {}
        var why = $('.va-qwhy', card); why.hidden = false;
        why.textContent = (o.ok ? '✓ إجابة صحيحة! ' : 'الإجابة الصحيحة: «' + item[1][item[2]] + '». ') + item[3] + (o.ok && ns > 1 ? ' — سلسلتك الآن ' + ns + ' أيام متتالية.' : '');
      });
    }
    if (hero && hero.parentNode === home) home.insertBefore(card, hero.nextSibling); else home.insertBefore(card, home.firstChild);
  }

  /* ---------------- 3) استمع وشارك لمقالات الموسوعة ---------------- */
  var speaking = false;
  function injectArticleTools() {
    var p = $('#cp2'); if (!p) return;
    var pre = p.querySelector('pre'); if (!pre || p.querySelector('.va-act')) return;
    var h3 = p.querySelector('h3');
    var row = document.createElement('div'); row.className = 'va-act';
    var bT = document.createElement('button'); bT.type = 'button'; bT.textContent = '🔊 استمع للمقال';
    var bS = document.createElement('button'); bS.type = 'button'; bS.textContent = '🔗 مشاركة المقال';
    bT.addEventListener('click', function () {
      if (!('speechSynthesis' in window)) { bT.textContent = 'المتصفح لا يدعم القراءة الصوتية'; return; }
      if (speaking) { speechSynthesis.cancel(); speaking = false; bT.textContent = '🔊 استمع للمقال'; return; }
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(pre.textContent);
      u.lang = 'ar-SA'; u.rate = 0.98;
      u.onend = u.onerror = function () { speaking = false; bT.textContent = '🔊 استمع للمقال'; };
      speaking = true; bT.textContent = '⏹ إيقاف الاستماع';
      speechSynthesis.speak(u);
    });
    bS.addEventListener('click', function () {
      var data = { title: h3 ? h3.textContent : 'مقال بيطري', text: (h3 ? h3.textContent + '\n' : '') + pre.textContent.slice(0, 600), url: location.href };
      if (navigator.share) navigator.share(data).catch(function () {});
      else if (navigator.clipboard) { navigator.clipboard.writeText(data.title + '\n' + data.text); bS.textContent = '✓ نُسخ النص للمشاركة'; }
    });
    row.appendChild(bT); row.appendChild(bS); p.appendChild(row);
  }
  function watchPanel() {
    var p = $('#cp2'); if (!p) return;
    new MutationObserver(function () {
      if ('speechSynthesis' in window && speaking && !p.querySelector('pre')) { speechSynthesis.cancel(); speaking = false; }
      injectArticleTools();
    }).observe(p, { childList: true, subtree: true });
  }

  function init() { addSearchButton(); buildQuiz(); watchPanel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
