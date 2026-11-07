/* VetAI — Differential Diagnosis Pathways (مسارات التشخيص التفريقي)
   26 structured pathways across 7 species groups: presenting complaint →
   red flags → differentials ranked by prevalence & danger, each with the
   discriminating feature and the key confirmatory test → first steps.
   Educational reference; never replaces hands-on clinical examination.
   Data: json/differentials.json (lazy-fetched when the AI-diagnostics
   view opens). Self-mounting panel appended to view-ai-diagnostics;
   no layout/CSS changes. */
(function () {
  'use strict';
  if (window.__vetaiDifferentials) return;
  window.__vetaiDifferentials = true;

  var GROUPS = [
    { k: 'dogs', ar: 'الكلاب 🐶' }, { k: 'cats', ar: 'القطط 🐱' }, { k: 'cattle', ar: 'الأبقار 🐄' },
    { k: 'small-ruminants', ar: 'الأغنام والماعز 🐐' }, { k: 'rabbits', ar: 'الأرانب 🐰' },
    { k: 'horses', ar: 'الخيول 🐴' }, { k: 'poultry', ar: 'الدواجن 🐔' }
  ];
  var state = { data: null, sp: 'dogs', pathId: null, inited: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function viewVisible(id) {
    var s = document.getElementById(id);
    return !!s && !s.classList.contains('hidden') && s.getClientRects().length > 0;
  }

  function build() {
    var view = document.getElementById('view-ai-diagnostics');
    if (!view || document.getElementById('ddx')) return;
    var panel = document.createElement('div');
    panel.id = 'ddx';
    panel.className = 'glass-panel rounded-3xl p-6 space-y-3';
    panel.style.marginTop = '24px';
    panel.innerHTML =
      '<h3 class="font-black text-vetCyan">🧭 مسارات التشخيص التفريقي المرجعية</h3>' +
      '<p class="text-xs text-slate-400 leading-relaxed">26 مسارًا منظمًا عبر 7 مجموعات: من العلامة المقدِّمة إلى أعلام الخطر، ثم التشخيصات التفريقية مرتّبة بالانتشار والخطورة مع السمة الفاصلة والفحص المؤكِّد لكلٍّ منها، وأخيرًا خطوات العمل الأولى. مرجع تعليمي منظّم — لا يغني عن الفحص السريري المباشر.</p>' +
      '<div id="ddx-chips" class="flex flex-wrap gap-2"></div>' +
      '<div id="ddx-list" class="flex flex-wrap gap-2"></div>' +
      '<div id="ddx-detail"></div>';
    view.appendChild(panel);

    var chips = panel.querySelector('#ddx-chips');
    GROUPS.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'px-3 py-1.5 rounded-full border text-xs ' + (g.k === 'dogs' ? 'bg-vetCyan text-slate-900 font-black border-transparent' : 'border-slate-600 text-slate-300');
      b.textContent = g.ar;
      b.addEventListener('click', function () {
        state.sp = g.k; state.pathId = null;
        chips.querySelectorAll('button').forEach(function (x) { x.className = 'px-3 py-1.5 rounded-full border text-xs border-slate-600 text-slate-300'; });
        b.className = 'px-3 py-1.5 rounded-full border text-xs bg-vetCyan text-slate-900 font-black border-transparent';
        renderList(); renderDetail();
      });
      chips.appendChild(b);
    });
  }

  function pathsOf() {
    if (!state.data) return [];
    return state.data.filter(function (p) { return p.sp === state.sp; });
  }

  function renderList() {
    var box = document.getElementById('ddx-list');
    if (!box) return;
    var list = pathsOf();
    if (!state.pathId && list.length) state.pathId = list[0].id;
    box.innerHTML = '';
    list.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'px-3 py-1.5 rounded-full border text-xs ' + (p.id === state.pathId ? 'bg-vetCyan text-slate-900 font-black border-transparent' : 'border-slate-600 text-slate-300');
      b.textContent = p.complaint.ar;
      b.addEventListener('click', function () { state.pathId = p.id; renderList(); renderDetail(); });
      box.appendChild(b);
    });
  }

  function renderDetail() {
    var box = document.getElementById('ddx-detail');
    if (!box) return;
    if (!state.data) { box.innerHTML = '<p class="text-sm text-slate-400">جارٍ تحميل المسارات…</p>'; return; }
    var p = null;
    state.data.forEach(function (x) { if (x.id === state.pathId) p = x; });
    if (!p) { box.innerHTML = ''; return; }
    var flags = p.red_flags.map(function (f) { return '<p>🚩 ' + esc(f) + '</p>'; }).join('');
    var diffs = p.diffs.map(function (d, i) {
      return '<div class="rounded-2xl border border-slate-700/60 p-3" style="background:rgba(127,160,200,.05)">' +
        '<div class="flex items-start justify-between gap-2"><b class="text-sm">' + (i + 1) + '. ' + esc(d.n_ar) + '</b>' +
        (d.urg ? '<span class="px-2 py-0.5 rounded-full text-[10px] shrink-0" style="background:#3b1414;color:#ff9d9d">طارئ</span>' : '') + '</div>' +
        '<div class="text-[11px] text-slate-400" dir="ltr" style="text-align:end;font-style:italic">' + esc(d.n_en) + '</div>' +
        '<p class="text-xs text-slate-300 mt-1 leading-relaxed"><b class="text-vetCyan">لماذا يناسب؟</b> ' + esc(d.why_ar) + '</p>' +
        '<p class="text-xs text-slate-300 leading-relaxed"><b class="text-vetCyan">الفحص الفاصل:</b> ' + esc(d.test_ar) + '</p></div>';
    }).join('');
    var steps = p.steps.map(function (s, i) { return '<p>' + (i + 1) + '. ' + esc(s) + '</p>'; }).join('');
    box.innerHTML =
      '<div class="rounded-2xl p-4 mt-2" style="background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.25)">' +
      '<h4 class="font-black">' + esc(p.complaint.ar) + ' <span class="text-[11px] text-slate-400" dir="ltr">(' + esc(p.complaint.en) + ' · ' + esc(p.complaint.fr) + ')</span></h4>' +
      '<p class="text-xs text-slate-300 mt-1 leading-relaxed">' + esc(p.signalment_ar) + '</p></div>' +
      '<div class="rounded-2xl p-4 mt-3 text-sm space-y-1" style="background:#2b1010;color:#ffb4b4"><b>🚨 أعلام الخطر — تصرّف فورًا عند وجودها:</b>' + flags + '</div>' +
      '<div class="grid sm:grid-cols-2 gap-3 mt-3">' + diffs + '</div>' +
      '<div class="glass-panel rounded-2xl p-4 mt-3 text-sm text-slate-300 space-y-1"><b class="text-vetCyan">✅ خطوات العمل الأولى:</b>' + steps + '</div>';
  }

  function init() {
    if (state.inited) return;
    state.inited = true;
    build(); renderList(); renderDetail();
    fetch('json/differentials.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { state.data = (j && j.pathways) || []; renderList(); renderDetail(); })
      .catch(function () { state.data = []; renderList(); renderDetail(); });
  }

  function watch() {
    if (viewVisible('view-ai-diagnostics')) { init(); return; }
    var iv = setInterval(function () {
      if (viewVisible('view-ai-diagnostics')) { clearInterval(iv); init(); }
    }, 700);
    setTimeout(function () { clearInterval(iv); }, 10 * 60 * 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
