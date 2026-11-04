/* VetAI — Graded Exams (الاختبارات المتدرجة): 100 NEW questions per subject,
   ordered easy → hardest in 5 levels × 20, in AR/EN/FR following the exam
   language chosen in the exams view. Data: json/exams100-<lang>.json,
   fetched lazily only when a graded exam is started. The classic 20-question
   quick quizzes are untouched. */
(function () {
  'use strict';

  var LEVELS = {
    ar: ['المستوى 1 — سهل 🌱', 'المستوى 2 — متوسط 🌿', 'المستوى 3 — متقدم 🌳', 'المستوى 4 — صعب 🔥', 'المستوى 5 — خبير 🏆'],
    en: ['Level 1 — Easy 🌱', 'Level 2 — Medium 🌿', 'Level 3 — Advanced 🌳', 'Level 4 — Hard 🔥', 'Level 5 — Expert 🏆'],
    fr: ['Niveau 1 — Facile 🌱', 'Niveau 2 — Moyen 🌿', 'Niveau 3 — Avancé 🌳', 'Niveau 4 — Difficile 🔥', 'Niveau 5 — Expert 🏆']
  };
  var STR = {
    ar: { title: '📈 الاختبارات المتدرجة الشاملة — 100 سؤال لكل مادة',
      desc: 'بنوك جديدة كليًا مرتبة من السهل إلى الأصعب: خمسة مستويات × 20 سؤالًا في كل مادة، بلغة الاختبار المختارة أعلاه. الأسئلة هنا منفصلة عن الاختبارات السريعة (20 سؤالًا) ولا تكررها.',
      start: 'ابدأ الاختبار المتدرج (100 سؤال)', loading: 'جارٍ تحميل الأسئلة…',
      fail: 'تعذّر تحميل الأسئلة. تحقق من الاتصال وحاول مجددًا.',
      score: 'النتيجة:', best: 'أفضل نتيجة سابقة:', again: 'إعادة الاختبار',
      answered: 'أُجيب عن', of: 'من', per: 'نتيجة كل مستوى:' },
    en: { title: '📈 Full Graded Exams — 100 Questions per Subject',
      desc: 'Brand-new banks ordered from easy to hardest: five levels × 20 questions in every subject, in the exam language selected above. These questions are separate from — and do not repeat — the quick 20-question quizzes.',
      start: 'Start the graded exam (100 questions)', loading: 'Loading questions…',
      fail: 'Could not load the questions. Check your connection and try again.',
      score: 'Score:', best: 'Previous best:', again: 'Retake exam',
      answered: 'Answered', of: 'of', per: 'Score per level:' },
    fr: { title: '📈 Examens progressifs complets — 100 questions par matière',
      desc: 'Des banques entièrement nouvelles, classées du plus facile au plus difficile : cinq niveaux × 20 questions par matière, dans la langue d’examen choisie ci-dessus. Ces questions sont distinctes des quiz rapides (20 questions) et ne les répètent pas.',
      start: 'Commencer l’examen progressif (100 questions)', loading: 'Chargement des questions…',
      fail: 'Impossible de charger les questions. Vérifiez la connexion et réessayez.',
      score: 'Note :', best: 'Meilleur résultat précédent :', again: 'Refaire l’examen',
      answered: 'Répondu à', of: 'sur', per: 'Note par niveau :' }
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function lang() {
    try { return localStorage.getItem('exlang') || 'ar'; } catch (e) { return 'ar'; }
  }
  function S() { return STR[lang()] || STR.ar; }
  function subjectsFor(l) {
    // NOTE: index.html declares EX as a top-level const (lexical global), so
    // window.EX is undefined for Arabic — read the binding directly.
    var D = null;
    if (l === 'en') D = window.EXEN || (typeof EXEN !== 'undefined' ? EXEN : null);
    else if (l === 'fr') D = window.EXFR || (typeof EXFR !== 'undefined' ? EXFR : null);
    else D = (typeof EX !== 'undefined' ? EX : null) || window.EX || null;
    if (D && D.length) return D;
    return (typeof EX !== 'undefined' ? EX : null) || window.EX || [];
  }
  function shuffle(a) {
    return a.map(function (x) { return [Math.random(), x]; })
            .sort(function (p, q) { return p[0] - q[0]; })
            .map(function (p) { return p[1]; });
  }

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.xg-level{position:sticky;top:0;z-index:5;background:#0e7490;color:#fff;font-weight:900;' +
    'border-radius:12px;padding:10px 14px;margin:22px 0 6px;font-size:1rem}' +
    '.xg-prog{height:10px;background:#1e293b;border-radius:999px;overflow:hidden;margin-top:10px}' +
    '.xg-prog>i{display:block;height:100%;width:0;background:#22d3ee;transition:width .3s}' +
    '.xg-meta{color:#94a3b8;font-size:.82rem;margin-top:6px}' +
    '.xg-perlevel{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}' +
    '.xg-perlevel span{border:1px solid #334155;border-radius:999px;padding:4px 10px;font-size:.8rem;color:#cbd5e1}' +
    '#xg-subj{background:#0b1220;border:1px solid #334155;border-radius:12px;color:#f1f5f9;padding:11px;font-size:.95rem;min-height:48px;max-width:100%}' +
    '.xg-start{background:#22d3ee;color:#0b1220;font-weight:900;border:0;border-radius:14px;padding:12px 22px;cursor:pointer;min-height:48px;font-size:.95rem;margin-top:10px}';
  document.head.appendChild(css);

  /* ---------- panel ---------- */
  var bankCache = {};   // lang -> {idx: [100 questions]}
  var running = null;   // {idx, lang, ok, n, perLevel:[ok,count]}

  function fillSubjects() {
    var sel = $('xg-subj');
    if (!sel) return;
    var l = lang();
    var D = subjectsFor(l);
    var cur = sel.value;
    sel.innerHTML = D.map(function (s, i) {
      return '<option value="' + i + '">' + esc(s[0]) + '</option>';
    }).join('');
    if (cur !== '' && Number(cur) < D.length) sel.value = cur;
    showBest();
  }
  function bestMap() {
    try { return JSON.parse(localStorage.getItem('exg100') || '{}'); } catch (e) { return {}; }
  }
  function showBest() {
    var el = $('xg-best'), sel = $('xg-subj');
    if (!el || !sel) return;
    var arName = (window.EX && window.EX[Number(sel.value)]) ? window.EX[Number(sel.value)][0] : '';
    var b = bestMap()[arName];
    el.textContent = b != null ? S().best + ' ' + b + '%' : '';
  }

  function mountPanel() {
    var v = $('view-exams');
    if (!v || $('xg-panel') || !v.children.length) return;
    var sec = document.createElement('section');
    sec.id = 'xg-panel';
    sec.className = 'glass-panel rounded-3xl p-6';
    sec.innerHTML =
      '<h3 class="font-black text-vetCyan" id="xg-title" style="font-size:1.15rem"></h3>' +
      '<p class="text-sm text-slate-300 leading-relaxed mt-1" id="xg-desc"></p>' +
      '<div class="mt-3 flex flex-wrap items-center gap-2">' +
        '<select id="xg-subj" aria-label="المادة"></select>' +
        '<span class="xg-meta" id="xg-best"></span>' +
      '</div>' +
      '<button type="button" class="xg-start" id="xg-start"></button>' +
      '<div class="xg-prog" id="xg-progwrap" hidden><i id="xg-prog"></i></div>' +
      '<p class="xg-meta" id="xg-status" aria-live="polite"></p>' +
      '<div id="xg-body" class="mt-2"></div>';
    var anchor = $('dz-entry');
    if (anchor && anchor.parentNode === v) anchor.insertAdjacentElement('afterend', sec);
    else v.insertBefore(sec, v.children[1] || null);
    localize();
    fillSubjects();
    $('xg-start').addEventListener('click', startExam);
    $('xg-subj').addEventListener('change', showBest);
  }
  function localize() {
    var s = S();
    if ($('xg-title')) $('xg-title').textContent = s.title;
    if ($('xg-desc')) $('xg-desc').textContent = s.desc;
    if ($('xg-start')) $('xg-start').textContent = s.start;
  }

  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    mountPanel();
    if ($('xg-panel') || tries > 40) clearInterval(iv);
  }, 800);

  // keep subject names + labels in sync when the exam language changes
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#exlang [data-xl]');
    if (!b) return;
    setTimeout(function () { localize(); fillSubjects(); }, 350);
  });

  /* ---------- data ---------- */
  function loadBank(l) {
    if (bankCache[l]) return Promise.resolve(bankCache[l]);
    return fetch('json/exams100-' + l + '.json', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) { bankCache[l] = data; return data; });
  }

  /* ---------- exam runner ---------- */
  function startExam() {
    var l = lang(), s = S();
    var idx = Number(($('xg-subj') || {}).value || 0);
    var body = $('xg-body'), status = $('xg-status');
    body.innerHTML = '';
    status.textContent = s.loading;
    loadBank(l).then(function (bank) {
      var qs = bank[String(idx)] || bank[idx];
      if (!qs || !qs.length) throw new Error('empty');
      renderExam(idx, l, qs);
    }).catch(function () {
      status.textContent = s.fail;
    });
  }

  function renderExam(idx, l, qs) {
    var s = S();
    var D = subjectsFor(l);
    var title = (D[idx] && D[idx][0]) || '';
    var arD = subjectsFor('ar');
    var arName = (arD[idx] && arD[idx][0]) ? arD[idx][0] : title;
    running = { idx: idx, lang: l, ok: 0, n: 0, per: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] };
    var body = $('xg-body');
    body.dir = l === 'ar' ? 'rtl' : 'ltr';
    var html = '<h3 class="text-xl font-black">' + esc(title) + ' — ' + qs.length + '</h3>';
    for (var b = 0; b < 5; b++) {
      html += '<div class="xg-level">' + esc((LEVELS[l] || LEVELS.ar)[b]) + '</div>';
      for (var k = 0; k < 20; k++) {
        var gi = b * 20 + k;
        var q = qs[gi];
        if (!q) continue;
        var opts = shuffle(q[1].map(function (o, j) { return [o, j === 0]; }));
        html += '<div class="mt-4"><p class="font-bold text-sm">' + (gi + 1) + ') ' + esc(q[0]) + '</p>' +
          '<div data-xq="' + gi + '" data-lvl="' + b + '">' +
          opts.map(function (a) {
            return '<button type="button" class="ex-opt" data-r="' + (a[1] ? 1 : 0) + '">' + esc(a[0]) + '</button>';
          }).join('') + '</div></div>';
      }
    }
    html += '<div id="xg-result" class="mt-4 font-black text-vetCyan"></div>';
    body.innerHTML = html;
    $('xg-progwrap').hidden = false;
    $('xg-prog').style.width = '0%';
    $('xg-status').textContent = s.answered + ' 0 ' + s.of + ' ' + qs.length;
    body.onclick = function (e) {
      var btn = e.target.closest('.ex-opt');
      if (!btn || btn.parentNode.dataset.done || !running) return;
      btn.parentNode.dataset.done = 1;
      var lvl = Number(btn.parentNode.dataset.lvl || 0);
      running.n++;
      running.per[lvl][1]++;
      if (btn.dataset.r === '1') {
        running.ok++; running.per[lvl][0]++;
        btn.classList.add('ok');
      } else {
        btn.classList.add('no');
        var right = btn.parentNode.querySelector('[data-r="1"]');
        if (right) right.classList.add('ok');
      }
      $('xg-prog').style.width = Math.round(running.n / qs.length * 100) + '%';
      $('xg-status').textContent = s.answered + ' ' + running.n + ' ' + s.of + ' ' + qs.length;
      if (running.n === qs.length) finishExam(arName, qs.length);
    };
    body.scrollIntoView({ behavior: 'smooth' });
  }

  function finishExam(arName, total) {
    var s = S();
    var pct = Math.round(running.ok / total * 100);
    var verdict = pct === 100 ? '🏆' : pct >= 60 ? '👏' : '📚';
    var per = running.per.map(function (p, i) {
      return '<span>' + esc((LEVELS[running.lang] || LEVELS.ar)[i].split('—')[1].trim()) + ': ' + p[0] + '/' + p[1] + '</span>';
    }).join('');
    $('xg-result').innerHTML =
      s.score + ' ' + running.ok + ' / ' + total + ' (' + pct + '%) ' + verdict +
      '<div class="xg-perlevel">' + per + '</div>' +
      '<button type="button" class="xg-start" id="xg-again">' + s.again + '</button>';
    try {
      var m = bestMap();
      if (pct > (m[arName] || 0)) {
        m[arName] = pct;
        localStorage.setItem('exg100', JSON.stringify(m));
      }
    } catch (e) {}
    showBest();
    var again = $('xg-again');
    if (again) again.addEventListener('click', startExam);
    running = null;
  }
})();
