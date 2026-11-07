/* VetAI — Drug Guide, Standard Schema Edition (دليل الأدوية بالصيغة القياسية)
   Takes over the Algeria formulary container (#dzFormulary in view-drugs)
   and re-renders it from json/drugs-pro.json with the full professional
   schema per entry: active ingredient, brand names, drug class, species,
   indications, dosage by species, contraindications, withdrawal times.
   Reference doses live ONLY in this professional guide — never in disease
   articles or consultations (platform design rule). Same container, same
   dzf-* classes (styled by the existing #dzf-css); no layout changes. */
(function () {
  'use strict';
  if (window.__vetaiDrugsPro) return;
  window.__vetaiDrugsPro = true;

  var CATS = [
    { k: 'all', ar: 'الكل' }, { k: 'abx', ar: 'مضادات حيوية' }, { k: 'par', ar: 'مضادات طفيليات' },
    { k: 'nsaid', ar: 'مضادات التهاب ومسكّنات' }, { k: 'vit', ar: 'فيتامينات ومحاليل دعم' },
    { k: 'vac', ar: 'لقاحات' }, { k: 'hor', ar: 'هرمونات تكاثر' }
  ];
  var state = { data: null, cat: 'all', q: '', done: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function viewVisible(id) {
    var s = document.getElementById(id);
    return !!s && !s.classList.contains('hidden') && s.getClientRects().length > 0;
  }

  function takeover() {
    if (state.done) return;
    var view = document.getElementById('view-drugs');
    if (!view) return;
    state.done = true;
    var mine = document.createElement('div');
    mine.className = 'card'; mine.id = 'dzFormulary'; mine.style.gridColumn = '1/-1';
    mine.innerHTML =
      '<div class="sh2"><span class="eb">المرجع الطبي · السوق الجزائري · الصيغة القياسية</span><h2>💊 دليل الأدوية والعلاجات البيطرية في الجزائر</h2></div>' +
      '<p class="dzf-intro">دليل مهني منظّم بالصيغة القياسية العالمية: المادة الفعّالة، الأسماء التجارية الشائعة محليًا، الفئة الدوائية، الأنواع، دواعي الاستخدام، الجرعات المرجعية حسب النوع، <b>موانع الاستعمال</b>، وفترات السحب — لكل دواء بطاقة كاملة قابلة للبحث.</p>' +
      '<div class="dzf-tools"><input id="dzf-q" type="search" autocomplete="off" placeholder="ابحث باسم الدواء العلمي أو التجاري أو دواعي الاستخدام…"><div class="dzf-chips" id="dzfp-chips"></div></div>' +
      '<p class="dzf-count" id="dzfp-count"></p>' +
      '<div class="dzf-grid" id="dzfp-grid"></div>' +
      '<p class="dzf-note">⚠️ <b>تنبيه مهني:</b> الجرعات قيم مرجعية استرشادية من المراجع البيطرية المعتمدة (Plumb\'s Veterinary Drug Handbook · Merck Veterinary Manual · نشرات المنتجات المسجّلة) — لا تُغني عن نشرة المنتج المُستخدم فعليًا وقرار الطبيب البيطري المعالج، وتختلف بتركيز المستحضر والتشريعات المحلية.</p>';
    var old = document.getElementById('dzFormulary');
    if (old) old.replaceWith(mine); else view.insertAdjacentElement('afterbegin', mine);

    var chips = mine.querySelector('#dzfp-chips');
    CATS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'dzf-chip' + (c.k === 'all' ? ' on' : '');
      b.textContent = c.ar;
      b.addEventListener('click', function () {
        state.cat = c.k;
        chips.querySelectorAll('.dzf-chip').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on'); render();
      });
      chips.appendChild(b);
    });
    mine.querySelector('#dzf-q').addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
    render();
    fetch('json/drugs-pro.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { state.data = (j && j.drugs) || []; render(); })
      .catch(function () { state.data = []; render(); });
  }

  function render() {
    var grid = document.getElementById('dzfp-grid');
    var count = document.getElementById('dzfp-count');
    if (!grid) return;
    if (!state.data) { grid.innerHTML = '<p class="text-sm">جارٍ تحميل الدليل القياسي…</p>'; return; }
    var list = state.data.filter(function (d) {
      if (state.cat !== 'all' && d.category !== state.cat) return false;
      if (state.q) {
        var hay = (d.name_ar + ' ' + d.active_ingredient + ' ' + d.brand_names.join(' ') + ' ' + d.indications_ar + ' ' + d.drug_class_en).toLowerCase();
        if (hay.indexOf(state.q) === -1) return false;
      }
      return true;
    });
    count.textContent = 'عرض ' + list.length + ' من أصل ' + state.data.length + ' دواءً ولقاحًا';
    grid.innerHTML = list.map(function (d) {
      var doses = d.dosage.map(function (x) {
        return '<div><span class="dzf-sp">' + esc(x.species) + '</span>' + esc(x.dose_ar) + '</div>';
      }).join('');
      return '<div class="dzf-card">' +
        '<h3>' + esc(d.name_ar) + '</h3>' +
        '<div class="dzf-lat">' + esc(d.active_ingredient) + '</div>' +
        '<span class="dzf-badge">' + esc(d.drug_class_ar) + ' · ' + esc(d.drug_class_en) + '</span>' +
        '<div class="dzf-row"><b>الأسماء التجارية:</b> ' + esc(d.brand_names.join(' · ')) + '</div>' +
        '<div class="dzf-row"><b>الأنواع:</b> ' + esc(d.species.join('، ')) + '</div>' +
        '<div class="dzf-row"><b>دواعي الاستخدام:</b> ' + esc(d.indications_ar) + '</div>' +
        '<div class="dzf-dose">' + doses + '</div>' +
        '<div class="dzf-warn">⛔ <b>موانع وتحذيرات:</b> ' + esc(d.contraindications_ar) + '</div>' +
        '<div class="dzf-row">⏳ <b>فترة السحب والسلامة:</b> ' + esc(d.withdrawal_ar) + '</div>' +
        '<div class="dzf-row" style="color:var(--mut);font-size:.72rem">المصدر: ' + esc(d.source) + '</div>' +
        '</div>';
    }).join('') || '<p class="text-sm">لا نتائج مطابقة — جرّب كلمة أخرى.</p>';
  }

  function watch() {
    if (viewVisible('view-drugs')) { takeover(); return; }
    var iv = setInterval(function () {
      if (viewVisible('view-drugs')) { clearInterval(iv); takeover(); }
    }, 700);
    setTimeout(function () { clearInterval(iv); }, 10 * 60 * 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
