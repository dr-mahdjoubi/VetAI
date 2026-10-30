/* library-engine.js — محرك مكتبة VetAI المُعاد هيكلته (2026-10-29)
 * 1) Lazy Loading: عرض 12 عنصرًا لكل دفعة + Infinite Scroll (IntersectionObserver)
 * 2) Modular Data: manifest خفيف أولًا، وملفات كل تصنيف تُجلب عند الحاجة فقط
 * 3) Debounced Search: بحث بعد 300ms من التوقف عن الكتابة، بتطبيع عربي
 * 4) Client-side Caching: localStorage مُقيّد برقم نسخة الـ manifest
 * يعمل لأي مجموعة بنفس الشكل (الكتب الآن، والاختبارات عند توفر data/exams/manifest.json).
 * الاستخدام: VetLibrary.mount(document.getElementById('library-root'))
 */
(function () {
  'use strict';
  var PAGE = 12, DEBOUNCE = 300, LS = 'vetlib:';

  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }
  function attr(u) { return esc(u).replace(/"/g, '&quot;'); }
  function norm(s) {
    return (s || '').toLowerCase()
      .replace(/[ً-ٰٟ]/g, '')
      .replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[^؀-ۿa-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function lsGet(k, ver) {
    try { var v = JSON.parse(localStorage.getItem(LS + k) || 'null'); return v && v.v === ver ? v.d : null; }
    catch (e) { return null; }
  }
  function lsSet(k, ver, d) {
    try { localStorage.setItem(LS + k, JSON.stringify({ v: ver, d: d })); } catch (e) { /* ممتلئ: نتابع بدون كاش */ }
  }

  function mount(root, opts) {
    opts = opts || {};
    var manifestUrl = opts.manifestUrl || 'data/library/manifest.json';
    var base = manifestUrl.replace(/manifest\.json.*$/, '');
    var state = { manifest: null, cat: 'all', lang: '', q: '', shown: 0,
                  pool: [], poolComplete: false, nextFile: 0, searchIdx: null, mode: 'browse' };
    var memCache = {};

    root.innerHTML =
      '<div class="vetlib-bar">' +
        '<input type="search" class="vetlib-q" placeholder="ابحث بالعنوان…" autocomplete="off">' +
        '<select class="vetlib-lang"><option value="">كل اللغات</option>' +
        '<option value="ar">العربية</option><option value="en">English</option><option value="fr">Français</option></select>' +
      '</div>' +
      '<div class="vetlib-chips"></div>' +
      '<div class="vetlib-count"></div>' +
      '<div class="vetlib-grid"></div>' +
      '<div class="vetlib-sentinel" style="height:1px"></div>' +
      '<button type="button" class="vetlib-more" style="display:none">عرض المزيد</button>';

    var qEl = root.querySelector('.vetlib-q'), langEl = root.querySelector('.vetlib-lang'),
        chipsEl = root.querySelector('.vetlib-chips'), countEl = root.querySelector('.vetlib-count'),
        gridEl = root.querySelector('.vetlib-grid'), moreBtn = root.querySelector('.vetlib-more'),
        sentinel = root.querySelector('.vetlib-sentinel');

    function fetchJSON(url, cacheKey, ver) {
      if (memCache[cacheKey]) return Promise.resolve(memCache[cacheKey]);
      var hit = ver ? lsGet(cacheKey, ver) : null;
      if (hit) { memCache[cacheKey] = hit; return Promise.resolve(hit); }
      return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { memCache[cacheKey] = d; if (ver) lsSet(cacheKey, ver, d); return d; });
    }

    function card(it) {
      var meta = (it.catName ? ' · ' + esc(it.catName) : '') +
                 (it.lang ? ' · ' + ({ ar: 'العربية', en: 'EN', fr: 'FR' })[it.lang] || '' : '');
      if (it.desc) return '<a class="dl" target="_blank" rel="noopener" href="' + attr(it.url) + '"><b>' +
        esc(it.title) + '</b><span>' + esc(it.desc) + '</span><small>' + meta + '</small></a>';
      return '<a class="bk" target="_blank" rel="noopener" href="' + attr(it.url) + '">' +
        esc(it.title) + '<small>' + meta + '</small></a>';
    }

    function catFiles() {
      if (state.cat === 'all') {
        var all = []; state.manifest.categories.forEach(function (c) { all = all.concat(c.files); }); return all;
      }
      var c = state.manifest.categories.filter(function (x) { return x.slug === state.cat; })[0];
      return c ? c.files : [];
    }
    function catName(slug) {
      var c = state.manifest.categories.filter(function (x) { return x.slug === slug; })[0];
      return c ? c.name : slug;
    }
    function matchLang(it) { return !state.lang || it.lang === state.lang; }

    function ensurePool() {
      /* اجلب مقاطع التصنيف تباعًا حتى يتوفر ما يكفي للعرض أو تنفد الملفات */
      if (state.mode === 'search' || state.poolComplete) return Promise.resolve();
      var files = catFiles();
      if (state.nextFile >= files.length) { state.poolComplete = true; return Promise.resolve(); }
      var f = files[state.nextFile++];
      return fetchJSON(base + f, 'cat:' + f, state.manifest.version).then(function (d) {
        d.items.forEach(function (it) { it.catName = catName(it.cat); if (matchLang(it)) state.pool.push(it); });
        if (state.pool.length < state.shown + PAGE && state.nextFile < files.length) return ensurePool();
      });
    }

    function draw() {
      var list = state.mode === 'search' ? state.pool : state.pool;
      var slice = list.slice(0, state.shown);
      gridEl.innerHTML = slice.map(card).join('') ||
        '<p class="vetlib-empty">لا نتائج مطابقة — جرّب كلمة أخرى أو تصنيفًا مختلفًا.</p>';
      var total = state.mode === 'search' ? list.length :
        (state.cat === 'all' ? state.manifest.total :
          (state.manifest.categories.filter(function (x) { return x.slug === state.cat; })[0] || {}).count || list.length);
      countEl.textContent = 'عرض ' + slice.length + ' من ' + total + ' عنصرًا' +
        (state.mode === 'search' ? ' (نتائج البحث)' : '');
      moreBtn.style.display = (slice.length < list.length || !state.poolComplete) ? '' : 'none';
    }

    function loadMore() {
      state.shown += PAGE;
      ensurePool().then(draw);
    }

    function reset() {
      state.shown = PAGE; state.pool = []; state.poolComplete = false; state.nextFile = 0;
      if (state.mode === 'search') {
        var q = norm(state.q);
        state.pool = state.searchIdx.filter(function (e) {
          return norm(e.t).indexOf(q) !== -1 &&
                 (state.cat === 'all' || e.c === state.cat) && matchLang({ lang: e.l });
        }).map(function (e) { return { title: e.t, url: e.u, cat: e.c, lang: e.l, catName: catName(e.c) }; });
        state.poolComplete = true; draw();
      } else ensurePool().then(draw);
    }

    function enterSearch() {
      if (state.searchIdx) { state.mode = 'search'; reset(); return; }
      fetchJSON(base + 'search.json', 'search', state.manifest.version).then(function (idx) {
        state.searchIdx = idx; state.mode = 'search'; reset();
      });
    }

    var deb = null;
    qEl.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(function () {
        state.q = qEl.value;
        if (state.q.trim()) enterSearch();
        else { state.mode = 'browse'; reset(); }
      }, DEBOUNCE);
    });
    langEl.addEventListener('change', function () { state.lang = langEl.value; reset(); });
    chipsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) return;
      state.cat = b.getAttribute('data-cat');
      chipsEl.querySelectorAll('[data-cat]').forEach(function (x) {
        x.classList.toggle('on', x === b);
      });
      if (state.q.trim()) enterSearch(); else reset();
    });
    moreBtn.addEventListener('click', loadMore);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && (state.shown < state.pool.length || !state.poolComplete)) loadMore();
      }, { rootMargin: '400px' }).observe(sentinel);
    }

    fetchJSON(manifestUrl, 'manifest', null).then(function (m) {
      /* الـ manifest نفسه يُخزّن مؤقتًا لكن يُعاد التحقق منه في كل زيارة (4KB فقط)
         ورقم نسخته يبطل كاش بقية الملفات تلقائيًا عند أي تحديث من البوت */
      state.manifest = m; lsSet('manifest', m.version, m);
      chipsEl.innerHTML = '<button type="button" class="bk on" data-cat="all">الكل (' + m.total + ')</button>' +
        m.categories.map(function (c) {
          return '<button type="button" class="bk" data-cat="' + c.slug + '">' +
                 esc(c.name) + ' (' + c.count + ')</button>';
        }).join('');
      if (m.extras) {
        var ex = document.createElement('div'); var h = '';
        if (m.extras.journals && m.extras.journals.length) {
          h += '<h3>📰 مجلات علمية</h3>' + m.extras.journals.map(function (j) {
            return '<a class="dl" target="_blank" rel="noopener" href="' + attr(j.url) + '"><b>' +
              esc(j.title) + '</b><span>' + esc(j.desc || '') + '</span></a>';
          }).join('');
        }
        if (m.extras.communities && m.extras.communities.length) {
          h += '<h3>💬 منتديات ومجتمعات بيطرية</h3>' + m.extras.communities.map(function (g) {
            return '<h4>' + esc(g.group) + '</h4>' + (g.items || []).map(function (j) {
              return '<a class="dl" target="_blank" rel="noopener" href="' + attr(j.url) + '"><b>' +
                esc(j.title) + '</b><span>' + esc(j.desc || '') + '</span></a>';
            }).join('');
          }).join('');
        }
        ex.innerHTML = h; root.appendChild(ex);
      }
      reset();
    }).catch(function () {
      gridEl.innerHTML = '<p class="vetlib-empty">تعذّر تحميل فهرس المكتبة — تحقق من الاتصال وحاول مجددًا.</p>';
    });
  }

  window.VetLibrary = { mount: mount, PAGE: PAGE, DEBOUNCE: DEBOUNCE };
})();
