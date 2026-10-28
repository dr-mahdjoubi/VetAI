/* VetAI — Diseases Atlas by Species (موسوعة الأمراض حسب الحيوان)
   Student section: 6 species × 100 diseases, each with cause, signs,
   diagnosis, treatment and prevention. Data lives in json/diseases/*.json
   and is fetched lazily per species (weak-phone friendly). No drug doses —
   treatment is strategy + drug classes, per the platform's design rule. */
(function () {
  'use strict';

  var SPECIES = [
    { key: 'dogs',            ar: 'الكلاب',         en: 'Dogs',            icon: '🐶', file: 'json/diseases/dogs.json' },
    { key: 'cats',            ar: 'القطط',          en: 'Cats',            icon: '🐱', file: 'json/diseases/cats.json' },
    { key: 'cattle',          ar: 'الأبقار',        en: 'Cattle',          icon: '🐄', file: 'json/diseases/cattle.json' },
    { key: 'small-ruminants', ar: 'الأغنام والماعز', en: 'Sheep & Goats',   icon: '🐐', file: 'json/diseases/small-ruminants.json' },
    { key: 'rabbits',         ar: 'الأرانب',        en: 'Rabbits',         icon: '🐰', file: 'json/diseases/rabbits.json' },
    { key: 'horses',          ar: 'الخيول',         en: 'Horses',          icon: '🐴', file: 'json/diseases/horses.json' }
  ];
  var BATCH = 60;

  var cache = {};        // key -> array of diseases
  var loading = {};      // key -> Promise
  var state = {
    inited: false,
    species: 'dogs',
    query: '',
    category: 'الكل',
    zooOnly: false,
    urgOnly: false,
    shown: BATCH,
    allLoaded: false
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function speciesOf(key) {
    for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].key === key) return SPECIES[i];
    return SPECIES[0];
  }

  /* ---------------- data loading ---------------- */
  function loadSpecies(key) {
    if (cache[key]) return Promise.resolve(cache[key]);
    if (loading[key]) return loading[key];
    var sp = speciesOf(key);
    loading[key] = fetch(sp.file, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        cache[key] = Array.isArray(data) ? data : [];
        delete loading[key];
        updateTotals();
        return cache[key];
      })
      .catch(function (err) {
        delete loading[key];
        throw err;
      });
    return loading[key];
  }
  function loadAll() {
    return Promise.all(SPECIES.map(function (sp) {
      return loadSpecies(sp.key).catch(function () { return []; });
    })).then(function () { state.allLoaded = true; });
  }
  function totalCount() {
    var t = 0;
    SPECIES.forEach(function (sp) { if (cache[sp.key]) t += cache[sp.key].length; });
    return t;
  }

  /* ---------------- view skeleton ---------------- */
  function buildSkeleton() {
    var v = $('view-diseases');
    if (!v || state.inited) return;
    state.inited = true;
    v.innerHTML =
      '<div class="glass-panel rounded-3xl p-6 dz-head">' +
        '<h2 class="text-2xl font-black text-vetCyan">🦠 موسوعة الأمراض حسب الحيوان</h2>' +
        '<p class="text-sm text-slate-300 mt-2 leading-relaxed">مرجع سريع لطالب الطب البيطري: اختر الحيوان وتصفّح أمراضه مرتبة مع المسبب والعلامات والتشخيص والعلاج والوقاية. ' +
        '<b id="dz-total"></b></p>' +
        '<div class="dz-chips" id="dz-species" role="tablist" aria-label="اختيار الحيوان"></div>' +
      '</div>' +
      '<div class="glass-panel rounded-2xl p-4 dz-controls">' +
        '<input id="dz-q" type="search" inputmode="search" placeholder="🔎 ابحث باسم المرض عربيًا أو إنجليزيًا… (البحث يشمل كل الأنواع)" aria-label="بحث في الأمراض">' +
        '<div class="dz-row">' +
          '<select id="dz-cat" aria-label="التصنيف"><option value="الكل">كل التصنيفات</option></select>' +
          '<label class="dz-toggle"><input type="checkbox" id="dz-zoo"> مشتركة مع الإنسان فقط</label>' +
          '<label class="dz-toggle"><input type="checkbox" id="dz-urg"> طارئة فقط 🚨</label>' +
        '</div>' +
        '<p class="dz-count" id="dz-count" aria-live="polite"></p>' +
      '</div>' +
      '<div id="dz-grid" class="dz-grid"></div>' +
      '<div class="dz-morewrap"><button id="dz-more" class="dz-more" hidden>عرض المزيد</button></div>' +
      '<p class="dz-note">محتوى تعليمي موجّه للطلبة والمراجعة السريعة، ولا يغني عن المراجع المعتمدة والفحص السريري. خطط العلاج معروضة بفئاتها الدوائية دون جرعات — الجرعات من دليل الأدوية والمراجع المعتمدة وحسب وزن الحيوان وحالته.</p>' +
      '<div id="dz-modal" class="dz-modal" hidden><div class="dz-backdrop" data-dz-close></div>' +
        '<div class="dz-sheet" role="dialog" aria-modal="true" aria-labelledby="dz-m-title">' +
          '<button class="dz-x" data-dz-close aria-label="إغلاق">✕</button>' +
          '<div id="dz-m-body"></div>' +
        '</div></div>';

    // species chips
    var wrap = $('dz-species');
    SPECIES.forEach(function (sp) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dz-chip' + (sp.key === state.species ? ' active' : '');
      b.dataset.sp = sp.key;
      b.setAttribute('role', 'tab');
      b.innerHTML = sp.icon + ' ' + esc(sp.ar) + ' <span class="dz-chip-n" data-n="' + sp.key + '"></span>';
      b.addEventListener('click', function () { selectSpecies(sp.key); });
      wrap.appendChild(b);
    });

    // controls
    var q = $('dz-q'), timer = null;
    q.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.query = q.value.trim();
        state.shown = BATCH;
        if (state.query && !state.allLoaded) {
          setCount('جارٍ تحميل بيانات كل الأنواع للبحث الشامل…');
          loadAll().then(render).catch(render);
        } else {
          render();
        }
      }, 220);
    });
    $('dz-cat').addEventListener('change', function () {
      state.category = this.value; state.shown = BATCH; render();
    });
    $('dz-zoo').addEventListener('change', function () {
      state.zooOnly = this.checked; state.shown = BATCH; render();
    });
    $('dz-urg').addEventListener('change', function () {
      state.urgOnly = this.checked; state.shown = BATCH; render();
    });
    $('dz-more').addEventListener('click', function () {
      state.shown += BATCH; render(true);
    });
    $('dz-modal').addEventListener('click', function (e) {
      if (e.target.closest('[data-dz-close]')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });

    updateTotals();
    selectSpecies(state.species);
  }

  function updateTotals() {
    var t = $('dz-total');
    if (t && totalCount() > 0) t.textContent = 'تضم الموسوعة الآن ' + totalCount() + ' مرضًا موثقًا.';
    SPECIES.forEach(function (sp) {
      var el = document.querySelector('[data-n="' + sp.key + '"]');
      if (el && cache[sp.key]) el.textContent = '(' + cache[sp.key].length + ')';
    });
  }

  /* ---------------- selection & rendering ---------------- */
  function selectSpecies(key) {
    state.species = key;
    state.shown = BATCH;
    document.querySelectorAll('#dz-species .dz-chip').forEach(function (c) {
      c.classList.toggle('active', c.dataset.sp === key);
    });
    if (cache[key]) { render(); return; }
    setCount('جارٍ تحميل أمراض ' + speciesOf(key).ar + '…');
    $('dz-grid').innerHTML = '';
    loadSpecies(key).then(render).catch(function () {
      setCount('تعذّر تحميل البيانات. تحقق من الاتصال ثم أعد فتح القسم.');
    });
  }

  function currentList() {
    var list = [];
    if (state.query) {
      SPECIES.forEach(function (sp) {
        (cache[sp.key] || []).forEach(function (d) {
          list.push({ d: d, sp: sp.key });
        });
      });
      var ql = state.query.toLowerCase();
      list = list.filter(function (x) {
        return (x.d.n && x.d.n.indexOf(state.query) > -1) ||
               (x.d.e && x.d.e.toLowerCase().indexOf(ql) > -1) ||
               (x.d.a && x.d.a.indexOf(state.query) > -1);
      });
    } else {
      (cache[state.species] || []).forEach(function (d) {
        list.push({ d: d, sp: state.species });
      });
    }
    if (state.category !== 'الكل') {
      list = list.filter(function (x) { return x.d.c === state.category; });
    }
    if (state.zooOnly) list = list.filter(function (x) { return x.d.z === 1; });
    if (state.urgOnly) list = list.filter(function (x) { return x.d.u === 1; });
    return list;
  }

  function refreshCategories(list) {
    var sel = $('dz-cat');
    if (!sel) return;
    var cats = {};
    list.forEach(function (x) { if (x.d.c) cats[x.d.c] = 1; });
    var cur = state.category;
    var html = '<option value="الكل">كل التصنيفات</option>';
    Object.keys(cats).sort().forEach(function (c) {
      html += '<option value="' + esc(c) + '"' + (c === cur ? ' selected' : '') + '>' + esc(c) + '</option>';
    });
    if (sel.innerHTML !== html) sel.innerHTML = html;
    if (cur !== 'الكل' && !cats[cur]) { /* keep value; list already filtered */ }
  }

  function setCount(txt) { var c = $('dz-count'); if (c) c.textContent = txt; }

  function render(keepScroll) {
    var grid = $('dz-grid');
    if (!grid) return;
    // categories derive from the unfiltered-by-category base list
    var baseAll = state.query
      ? SPECIES.reduce(function (acc, sp) { return acc.concat((cache[sp.key] || []).map(function (d) { return { d: d, sp: sp.key }; })); }, [])
      : (cache[state.species] || []).map(function (d) { return { d: d, sp: state.species }; });
    refreshCategories(baseAll);

    var list = currentList();
    if (!state.query) {
      setCount('أمراض ' + speciesOf(state.species).ar + ': ' + list.length + ' مرضًا');
    } else {
      setCount('نتائج البحث عن «' + state.query + '»: ' + list.length + ' مرضًا في كل الأنواع');
    }
    var slice = list.slice(0, state.shown);
    grid.innerHTML = slice.map(function (x, i) {
      var d = x.d;
      return '<button type="button" class="dz-card" data-dz-open="' + x.sp + ':' + i + '">' +
        '<span class="dz-card-name">' + esc(d.n) + '</span>' +
        '<span class="dz-card-en" dir="ltr">' + esc(d.e) + '</span>' +
        '<span class="dz-card-tags">' +
          '<span class="dz-tag">' + esc(d.c) + '</span>' +
          (state.query ? '<span class="dz-tag sp">' + speciesOf(x.sp).icon + ' ' + esc(speciesOf(x.sp).ar) + '</span>' : '') +
          (d.z === 1 ? '<span class="dz-tag zoo">مشترك مع الإنسان</span>' : '') +
          (d.u === 1 ? '<span class="dz-tag urg">🚨 طارئ</span>' : '') +
        '</span></button>';
    }).join('');
    grid.querySelectorAll('[data-dz-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-dz-open').split(':');
        var arr = cache[parts[0]] || [];
        var item = list[Number(parts[1])];
        if (item) openModal(item.d, speciesOf(item.sp));
      });
    });
    var more = $('dz-more');
    if (more) more.hidden = list.length <= state.shown;
    if (!keepScroll) { /* keep position; view switch already scrolls top */ }
    if (list.length === 0) {
      grid.innerHTML = '<p class="dz-empty">لا توجد نتائج مطابقة. جرّب كلمة أخرى أو أعد ضبط المرشحات.</p>';
    }
  }

  /* ---------------- detail modal ---------------- */
  function openModal(d, sp) {
    var body = $('dz-m-body');
    if (!body) return;
    function row(label, text) {
      if (!text) return '';
      return '<div class="dz-m-row"><h4>' + label + '</h4><p>' + esc(text) + '</p></div>';
    }
    body.innerHTML =
      '<p class="dz-m-sp">' + sp.icon + ' ' + esc(sp.ar) + ' · ' + esc(d.c) +
        (d.z === 1 ? ' · <span class="dz-tag zoo">مشترك مع الإنسان</span>' : '') +
        (d.u === 1 ? ' · <span class="dz-tag urg">🚨 حالة طارئة غالبًا</span>' : '') + '</p>' +
      '<h3 id="dz-m-title" class="dz-m-title">' + esc(d.n) + '</h3>' +
      '<p class="dz-m-en" dir="ltr">' + esc(d.e) + '</p>' +
      row('🧫 المسبب', d.a) +
      row('🩺 العلامات السريرية', d.s) +
      row('🔬 التشخيص', d.d) +
      row('💊 العلاج', d.t) +
      row('🛡️ الوقاية والضبط', d.p) +
      '<p class="dz-note">محتوى تعليمي للطلبة؛ لا يُستخدم بديلًا عن الفحص السريري والمراجع المعتمدة. الجرعات الدوائية تُراجع في دليل الأدوية حسب الوزن والحالة.</p>';
    var m = $('dz-modal');
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    var x = m.querySelector('.dz-x'); if (x) x.focus();
  }
  function closeModal() {
    var m = $('dz-modal');
    if (m && !m.hidden) { m.hidden = true; document.body.style.overflow = ''; }
  }

  /* ---------------- entry card in the students (exams) view ---------------- */
  function mountEntry() {
    var v = $('view-exams');
    if (!v || $('dz-entry')) return;
    if (!v.children.length) return; // exams content not built yet
    var sec = document.createElement('section');
    sec.id = 'dz-entry';
    sec.className = 'glass-panel rounded-3xl p-6 dz-entry';
    sec.innerHTML =
      '<h3 class="font-black text-vetCyan dz-entry-t">🦠 موسوعة الأمراض حسب الحيوان</h3>' +
      '<p class="text-sm text-slate-300 leading-relaxed">جديد في قسم الطلبة: أمراض كل حيوان مرتبة في مكان واحد — الكلاب والقطط والأبقار والأغنام والماعز والأرانب والخيول — مع المسبب والعلامات والتشخيص والعلاج والوقاية لكل مرض.</p>' +
      '<div class="dz-entry-btns">' +
        SPECIES.map(function (sp) {
          return '<button type="button" class="dz-mini" data-dz-go="' + sp.key + '">' + sp.icon + ' ' + esc(sp.ar) + '</button>';
        }).join('') +
      '</div>' +
      '<button type="button" class="dz-open" data-dz-go="">افتح الموسوعة كاملة ←</button>';
    v.insertBefore(sec, v.firstChild);
    sec.querySelectorAll('[data-dz-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var sp = b.getAttribute('data-dz-go');
        if (window.switchTab) window.switchTab('diseases');
        buildSkeleton();
        if (sp) selectSpecies(sp);
      });
    });
  }
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    mountEntry();
    if ($('dz-entry') || tries > 40) clearInterval(iv);
  }, 800);

  /* ---------------- navigation integration ---------------- */
  // 'diseases' is not in the base switchTab hide-list, so wrap switchTab:
  // show + init our view for 'diseases', and re-hide it for every other tab.
  function wrap() {
    var orig = window.switchTab;
    if (typeof orig !== 'function' || orig.__dz) return;
    var f = function (t) {
      var r = orig.apply(this, arguments);
      var v = $('view-diseases');
      if (v) {
        if (t === 'diseases') { buildSkeleton(); v.classList.remove('hidden'); }
        else v.classList.add('hidden');
      }
      return r;
    };
    f.__dz = 1;
    window.switchTab = f;
  }
  wrap();
  window.addEventListener('load', wrap);

  window.openDiseaseAtlas = function (sp) {
    if (window.switchTab) window.switchTab('diseases');
    buildSkeleton();
    if (sp) selectSpecies(sp);
  };
})();
