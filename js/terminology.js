/* VetAI — Standard Terminology Layer (قاعدة المصطلحات القياسية)
   All 600 atlas diseases as structured terms: Arabic + English names,
   species, category, zoonotic/emergency flags, and the nearest official
   MeSH (NLM) descriptor where one is verified. Unmapped terms are shown
   honestly as "pending verification" — no code is ever invented.
   Data: json/terminology.json (lazy-fetched when the exams view opens).
   Self-mounting panel appended to view-exams; no layout/CSS changes. */
(function () {
  'use strict';
  if (window.__vetaiTerminology) return;
  window.__vetaiTerminology = true;

  var BATCH = 60;
  var SPECIES = [
    { k: 'all', ar: 'كل الأنواع' },
    { k: 'dogs', ar: 'الكلاب 🐶' }, { k: 'cats', ar: 'القطط 🐱' },
    { k: 'cattle', ar: 'الأبقار 🐄' }, { k: 'small-ruminants', ar: 'الأغنام والماعز 🐐' },
    { k: 'rabbits', ar: 'الأرانب 🐰' }, { k: 'horses', ar: 'الخيول 🐴' }
  ];
  var state = { data: null, sp: 'all', q: '', meshOnly: false, shown: BATCH, inited: false };

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
    var view = document.getElementById('view-exams');
    if (!view || document.getElementById('termx')) return;
    var panel = document.createElement('div');
    panel.id = 'termx';
    panel.className = 'glass-panel rounded-3xl p-6 space-y-3';
    panel.innerHTML =
      '<h3 class="font-black text-vetCyan">🗂️ قاعدة المصطلحات القياسية (MeSH)</h3>' +
      '<p class="text-xs text-slate-400 leading-relaxed">كل أمراض الأطلس الـ600 كمصطلحات منظمة: الاسم بالعربية والإنجليزية، النوع، التصنيف، وعلمَا الاشتراك والطوارئ — مع أقرب واصف رسمي في نظام <bdi>MeSH</bdi> التابع للمكتبة الوطنية الأمريكية للطب حيثما وُثّق. المصطلحات بلا واصف موثّق بعد تظهر بصراحة «قيد التوثيق» — لا تُنسب رموز غير مؤكدة أبدًا، وحقل <bdi>SNOMED CT</bdi> محجوز للتوسّع المرخّص.</p>' +
      '<input id="termx-q" type="search" autocomplete="off" placeholder="🔎 ابحث بمصطلح عربي أو إنجليزي: سعار، Rabies، التهاب ضرع…" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm">' +
      '<div id="termx-chips" class="flex flex-wrap gap-2"></div>' +
      '<label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"><input type="checkbox" id="termx-mesh" class="accent-cyan-400"> الموثّقة في MeSH فقط</label>' +
      '<p id="termx-count" class="text-[11px] text-slate-500"></p>' +
      '<div id="termx-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>' +
      '<button id="termx-more" class="px-4 py-2 rounded-xl border border-slate-600 text-sm" style="display:none">عرض المزيد</button>';
    view.appendChild(panel);

    var chips = panel.querySelector('#termx-chips');
    SPECIES.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'px-3 py-1.5 rounded-full border text-xs ' + (s.k === 'all' ? 'bg-vetCyan text-slate-900 font-black border-transparent' : 'border-slate-600 text-slate-300');
      b.textContent = s.ar;
      b.addEventListener('click', function () {
        state.sp = s.k; state.shown = BATCH;
        chips.querySelectorAll('button').forEach(function (x) { x.className = 'px-3 py-1.5 rounded-full border text-xs border-slate-600 text-slate-300'; });
        b.className = 'px-3 py-1.5 rounded-full border text-xs bg-vetCyan text-slate-900 font-black border-transparent';
        render();
      });
      chips.appendChild(b);
    });
    panel.querySelector('#termx-q').addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); state.shown = BATCH; render(); });
    panel.querySelector('#termx-mesh').addEventListener('change', function (e) { state.meshOnly = e.target.checked; state.shown = BATCH; render(); });
    panel.querySelector('#termx-more').addEventListener('click', function () { state.shown += BATCH; render(); });
  }

  function filtered() {
    if (!state.data) return [];
    return state.data.filter(function (t) {
      if (state.sp !== 'all' && t.sp !== state.sp) return false;
      if (state.meshOnly && !t.mesh) return false;
      if (state.q) {
        var hay = (t.ar + ' ' + t.en + ' ' + (t.mesh || '') + ' ' + t.cat).toLowerCase();
        if (hay.indexOf(state.q) === -1) return false;
      }
      return true;
    });
  }

  function render() {
    var grid = document.getElementById('termx-grid');
    var count = document.getElementById('termx-count');
    var more = document.getElementById('termx-more');
    if (!grid) return;
    if (!state.data) { grid.innerHTML = '<p class="text-sm text-slate-400">جارٍ تحميل قاعدة المصطلحات…</p>'; return; }
    var list = filtered();
    var slice = list.slice(0, state.shown);
    count.textContent = 'عرض ' + slice.length + ' من أصل ' + list.length + ' مصطلحًا (الإجمالي 600)';
    more.style.display = list.length > state.shown ? '' : 'none';
    grid.innerHTML = slice.map(function (t) {
      var badges =
        '<span class="px-2 py-0.5 rounded-full border border-slate-600 text-[10px]">' + esc(t.sp_ar) + '</span>' +
        '<span class="px-2 py-0.5 rounded-full border border-slate-600 text-[10px]">' + esc(t.cat) + '</span>' +
        (t.zoo ? '<span class="px-2 py-0.5 rounded-full text-[10px]" style="background:#3b2f10;color:#ffd97a">🦠 مشترك</span>' : '') +
        (t.urg ? '<span class="px-2 py-0.5 rounded-full text-[10px]" style="background:#3b1414;color:#ff9d9d">🚨 طارئ</span>' : '');
      var mesh = t.mesh
        ? '<p class="text-[11px] mt-2" style="color:#7ee2a8">🏷️ MeSH: <bdi class="font-bold">' + esc(t.mesh) + '</bdi></p>'
        : '<p class="text-[11px] mt-2 text-slate-500">🏷️ MeSH/SNOMED: قيد التوثيق المرجعي</p>';
      return '<div class="rounded-2xl border border-slate-700/60 p-3" style="background:rgba(127,160,200,.05)">' +
        '<div class="font-black text-sm">' + esc(t.ar) + '</div>' +
        '<div class="text-[11px] text-slate-400" dir="ltr" style="text-align:end;font-style:italic">' + esc(t.en) + '</div>' +
        '<div class="flex flex-wrap gap-1 mt-2">' + badges + '</div>' + mesh + '</div>';
    }).join('') || '<p class="text-sm text-slate-400">لا نتائج مطابقة — جرّب مصطلحًا آخر.</p>';
  }

  function init() {
    if (state.inited) return;
    state.inited = true;
    build(); render();
    fetch('json/terminology.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { state.data = (j && j.terms) || []; render(); })
      .catch(function () { state.data = []; render(); });
  }

  function watch() {
    if (viewVisible('view-exams')) { init(); return; }
    var iv = setInterval(function () {
      if (viewVisible('view-exams')) { clearInterval(iv); init(); }
    }, 700);
    setTimeout(function () { clearInterval(iv); }, 10 * 60 * 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
