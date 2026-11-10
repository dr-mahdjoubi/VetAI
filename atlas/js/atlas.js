/* ============================================================
   أطلس الحيوانات 120 — منطق التطبيق
   شبكة + بحث + فلترة + ترقيم صفحات + صفحة لكل حيوان (1..120)
   + تبويبات: نبذة / نموذج ثلاثي الأبعاد / فيديو
   ============================================================ */
(function () {
  'use strict';

  var PER_PAGE = 12; // 120 ÷ 12 = 10 صفحات مرقّمة
  var rows = window.ANIMALS_120 || [];
  var MODELS = window.ANIMAL_MODELS || {};

  var ANIMALS = rows.map(function (r) {
    return {
      id: r[0], en: r[1], ar: r[2], sci: r[3], group: r[4], emoji: r[5],
      habitat: r[6], diet: r[7], weight: r[8], life: r[9], status: r[10],
      fact: r[11], imgkw: r[12], modelKey: r[13], ytId: r[14] || null
    };
  });
  var byId = {};
  ANIMALS.forEach(function (a) { byId[a.id] = a; });

  var state = { page: 1, group: 'الكل', query: '', sort: 'id' };

  /* ---------- الصور: قائد مقال ويكيبيديا أولاً + بدائل متسلسلة ----------
     المصدر الأساسي: الصورة الرئيسية لمقال الحيوان في ويكيبيديا (بحث بالاسم
     العلمي) — صورة حقيقية موثّقة ومختارة تحريرياً لكل نوع، تُخزَّن محلياً
     بعد أول جلب. البدائل عند أي فشل: LoremFlickr ← Picsum ← لوحة رمزية. */
  function imgURL(a, w, h) {
    return 'https://loremflickr.com/' + (w || 800) + '/' + (h || 600) + '/' +
      encodeURIComponent(a.imgkw) + '?lock=' + a.id;
  }
  var wikiCache = {};
  try { wikiCache = JSON.parse(localStorage.getItem('atlas-wiki-img-v1') || '{}'); } catch (e) { wikiCache = {}; }
  function saveWikiCache() { try { localStorage.setItem('atlas-wiki-img-v1', JSON.stringify(wikiCache)); } catch (e) {} }
  function wikiImage(a) {
    if (a.id in wikiCache) return Promise.resolve(wikiCache[a.id]);
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var to = ctl ? setTimeout(function () { ctl.abort(); }, 6000) : null;
    var url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*' +
      '&prop=pageimages&piprop=thumbnail&pithumbsize=1000&generator=search&gsrnamespace=0&gsrlimit=1&gsrsearch=' +
      encodeURIComponent(a.sci + ' ' + a.en);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); }).then(function (j) {
      if (to) clearTimeout(to);
      var pages = (j && j.query && j.query.pages) ? Object.keys(j.query.pages).map(function (k) { return j.query.pages[k]; }) : [];
      var src = null;
      for (var i = 0; i < pages.length; i++) {
        if (pages[i].thumbnail && pages[i].thumbnail.source) { src = pages[i].thumbnail.source; break; }
      }
      wikiCache[a.id] = src; saveWikiCache();
      return src;
    }).catch(function () { if (to) clearTimeout(to); return null; });
  }
  function applyImg(img, a, w, h) {
    w = w || 800; h = h || 600;
    var chain = [imgURL(a, w, h), 'https://picsum.photos/seed/vetai-animal-' + a.id + '/' + w + '/' + h];
    var idx = 0;
    img.classList.add('imgload');
    img.addEventListener('load', function () { img.classList.remove('imgload'); });
    img.addEventListener('error', function () {
      idx++;
      if (idx < chain.length) img.src = chain[idx];
      else {
        var fb = document.createElement('div');
        fb.className = 'emoji-fb'; fb.textContent = a.emoji;
        img.replaceWith(fb);
      }
    });
    img.src = chain[0];
    // ترقية إلى صورة ويكيبيديا الموثّقة فور توفرها (تُفحص قبل التبديل)
    wikiImage(a).then(function (u) {
      if (!u || !img.isConnected || img.dataset.wiki === '1') return;
      var probe = new Image();
      probe.onload = function () {
        if (!img.isConnected) return;
        img.dataset.wiki = '1';
        chain.unshift(u);
        img.src = u;
      };
      probe.src = u;
    });
  }

  /* ---------- التصفية ---------- */
  function filtered() {
    var q = state.query.trim().toLowerCase();
    var out = ANIMALS.filter(function (a) {
      if (state.group !== 'الكل' && a.group !== state.group) return false;
      if (!q) return true;
      return (a.ar + ' ' + a.en + ' ' + a.sci + ' ' + a.group).toLowerCase().indexOf(q) !== -1;
    });
    if (state.sort === 'name') out.sort(function (x, y) { return x.ar.localeCompare(y.ar, 'ar'); });
    else if (state.sort === 'models') out.sort(function (x, y) { return (y.modelKey ? 1 : 0) - (x.modelKey ? 1 : 0) || x.id - y.id; });
    return out;
  }

  /* ظهور تدريجي للبطاقات عند التمرير */
  var rvIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rvIO.unobserve(e.target); } });
  }, { rootMargin: '50px' }) : null;
  function pageCount() { return Math.max(1, Math.ceil(filtered().length / PER_PAGE)); }

  /* ---------- عرض الشبكة ---------- */
  var grid = document.getElementById('grid');
  function render() {
    var list = filtered();
    var pages = pageCount();
    if (state.page > pages) state.page = pages;
    var start = (state.page - 1) * PER_PAGE;
    var slice = list.slice(start, start + PER_PAGE);
    grid.innerHTML = '';
    if (!slice.length) {
      grid.innerHTML = '<div class="empty">لا نتائج مطابقة — جرّب كلمة أخرى أو مجموعة مختلفة.</div>';
    }
    slice.forEach(function (a) {
      var card = document.createElement('article');
      card.className = 'card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', a.ar + ' — حيوان رقم ' + a.id + ' من 120');
      var ph = document.createElement('div'); ph.className = 'ph';
      var img = document.createElement('img');
      img.alt = a.ar; img.loading = 'lazy'; img.decoding = 'async';
      applyImg(img, a, 800, 600);
      ph.appendChild(img);
      var num = document.createElement('span'); num.className = 'num'; num.textContent = a.id + ' / 120';
      ph.appendChild(num);
      if (a.modelKey) {
        var b = document.createElement('span'); b.className = 'badge3d'; b.textContent = '🧊 3D';
        ph.appendChild(b);
      }
      card.appendChild(ph);
      var body = document.createElement('div'); body.className = 'body';
      body.innerHTML =
        '<h3>' + a.emoji + ' ' + esc(a.ar) + '</h3>' +
        '<div class="sci">' + esc(a.sci) + ' · ' + esc(a.en) + '</div>' +
        '<p class="fact">' + esc(a.fact) + '</p>' +
        '<div class="meta"><span class="tag">' + esc(a.group) + '</span>' +
        '<span class="tag">' + esc(a.diet) + '</span>' +
        '<span class="tag status">' + esc(a.status) + '</span></div>';
      card.appendChild(body);
      card.addEventListener('click', function () { openAnimal(a.id); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter') openAnimal(a.id); });
      card.classList.add('rv');
      grid.appendChild(card);
      if (rvIO) rvIO.observe(card); else card.classList.add('in');
    });
    renderPager(pages, list.length);
    renderStrip();
  }

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  /* ---------- الترقيم 1..10 + معلومات الصفحة ---------- */
  var pager = document.getElementById('pager');
  var pageInfo = document.getElementById('pageInfo');
  function renderPager(pages, total) {
    pager.innerHTML = '';
    function btn(label, page, opts) {
      opts = opts || {};
      var b = document.createElement('button');
      b.type = 'button'; b.innerHTML = label;
      if (opts.on) b.className = 'on';
      if (opts.disabled) b.disabled = true;
      if (opts.aria) b.setAttribute('aria-label', opts.aria);
      b.addEventListener('click', function () { goPage(page); });
      pager.appendChild(b);
    }
    btn('‹ السابق', state.page - 1, { disabled: state.page <= 1, aria: 'الصفحة السابقة' });
    for (var p = 1; p <= pages; p++) btn(String(p), p, { on: p === state.page });
    btn('التالي ›', state.page + 1, { disabled: state.page >= pages, aria: 'الصفحة التالية' });
    var from = total === 0 ? 0 : (state.page - 1) * PER_PAGE + 1;
    var to = Math.min(total, state.page * PER_PAGE);
    pageInfo.textContent = 'الصفحة ' + state.page + ' من ' + pages + ' — عرض الحيوانات ' + from + '–' + to + ' من أصل ' + total;
    var jump = document.getElementById('jumpPage');
    if (jump) {
      jump.innerHTML = '';
      for (var j = 1; j <= pages; j++) {
        var o = document.createElement('option');
        o.value = j; o.textContent = 'صفحة ' + j;
        if (j === state.page) o.selected = true;
        jump.appendChild(o);
      }
    }
  }
  function goPage(p) {
    var pages = pageCount();
    state.page = Math.min(Math.max(1, p), pages);
    render();
    document.getElementById('gridTop').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- شريط الأرقام 1..120 (صفحة لكل حيوان) ---------- */
  var strip = document.getElementById('numStrip');
  function renderStrip() {
    strip.innerHTML = '';
    ANIMALS.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = a.id;
      b.title = a.ar + (a.modelKey ? ' — له نموذج 3D' : '');
      if (a.modelKey) b.className = 'has3d';
      b.addEventListener('click', function () { openAnimal(a.id); });
      strip.appendChild(b);
    });
  }

  /* ---------- نافذة الحيوان ---------- */
  var modal = document.getElementById('modal');
  var sheet = document.getElementById('sheet');
  var current = null;

  function openAnimal(id) {
    var a = byId[id];
    if (!a) return;
    current = a;
    try { history.replaceState(null, '', '#/animal/' + id); } catch (e) {}
    sheet.innerHTML = '';
    // الصورة العلوية
    var top = document.createElement('div'); top.className = 'topimg';
    var img = document.createElement('img');
    img.alt = a.ar;
    applyImg(img, a, 1200, 640);
    top.appendChild(img);
    var x = document.createElement('button');
    x.className = 'x'; x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'إغلاق');
    x.addEventListener('click', closeAnimal);
    top.appendChild(x);
    sheet.appendChild(top);
    // المحتوى
    var inner = document.createElement('div'); inner.className = 'inner';
    inner.innerHTML =
      '<h2>' + a.emoji + ' ' + esc(a.ar) + '</h2>' +
      '<div class="sci">' + esc(a.sci) + ' · ' + esc(a.en) + ' · رقم ' + a.id + ' من 120</div>' +
      '<div class="kv">' +
        kv('المجموعة', a.group) + kv('الموطن', a.habitat) + kv('الغذاء', a.diet) +
        kv('الوزن', a.weight) + kv('متوسط العمر', a.life) + kv('حالة الحفظ', a.status) +
      '</div>' +
      '<div class="factbox">🔬 ' + esc(a.fact) + '</div>';
    // التبويبات
    var tabs = document.createElement('div'); tabs.className = 'tabs';
    var pane = document.createElement('div'); pane.className = 'tabpane';
    var defs = [
      ['about', '📖 نبذة'],
      ['d3', a.modelKey ? '🧊 نموذج 3D' : '🧊 عرض تفاعلي'],
      ['video', '🎬 فيديو']
    ];
    defs.forEach(function (d, i) {
      var t = document.createElement('button');
      t.type = 'button'; t.className = 'tab' + (i === 0 ? ' on' : ''); t.textContent = d[1];
      t.addEventListener('click', function () {
        tabs.querySelectorAll('.tab').forEach(function (z) { z.classList.toggle('on', z === t); });
        showPane(d[0], a, pane);
      });
      tabs.appendChild(t);
    });
    inner.appendChild(tabs);
    inner.appendChild(pane);
    showPane('about', a, pane);
    // التنقّل بين الحيوانات 1..120
    var nav = document.createElement('div'); nav.className = 'navrow';
    var prev = document.createElement('button');
    prev.type = 'button'; prev.textContent = '‹ السابق'; prev.disabled = a.id <= 1;
    prev.addEventListener('click', function () { openAnimal(a.id - 1); });
    var pos = document.createElement('span'); pos.className = 'pos';
    pos.textContent = 'حيوان ' + a.id + ' من 120';
    var next = document.createElement('button');
    next.type = 'button'; next.textContent = 'التالي ›'; next.disabled = a.id >= 120;
    next.addEventListener('click', function () { openAnimal(a.id + 1); });
    nav.appendChild(prev); nav.appendChild(pos); nav.appendChild(next);
    inner.appendChild(nav);
    sheet.appendChild(inner);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    sheet.scrollTop = 0;
  }
  function kv(k, v) { return '<div><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>'; }

  function showPane(kind, a, pane) {
    pane.innerHTML = '';
    if (kind === 'about') {
      var p = document.createElement('p');
      p.style.cssText = 'font-size:13.5px;color:var(--mut);line-height:2.05;margin:4px 0 0';
      p.textContent = 'يعيش ' + a.ar + ' (' + a.en + ') في ' + a.habitat +
        '، وهو من مجموعة «' + a.group + '» وغذاؤه: ' + a.diet +
        '. يتراوح وزنه حول ' + a.weight + ' ويعيش في المتوسط ' + a.life +
        '. حالة حفظه وفق القائمة الحمراء: ' + a.status + '.';
      pane.appendChild(p);
      return;
    }
    if (kind === 'video') { buildVideoPane(a, pane); return; }
    build3DPane(a, pane);
  }

  /* ---------- تبويب الفيديو ---------- */
  function buildVideoPane(a, pane) {
    var card = document.createElement('div'); card.className = 'vidcard';
    if (a.ytId) {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(a.ytId) + '?rel=0';
      f.setAttribute('allow', 'accelerometer; encrypted-media; picture-in-picture');
      f.setAttribute('allowfullscreen', '');
      f.title = 'فيديو: ' + a.ar;
      var th = document.createElement('div'); th.className = 'vthumb';
      th.appendChild(f); card.appendChild(th);
    } else {
      var th2 = document.createElement('div'); th2.className = 'vthumb';
      var img = document.createElement('img');
      img.alt = a.ar; img.loading = 'lazy';
      applyImg(img, a, 960, 540);
      var play = document.createElement('div'); play.className = 'vplay'; play.textContent = '▶';
      th2.appendChild(img); th2.appendChild(play);
      th2.addEventListener('click', function () {
        var q = encodeURIComponent(a.en + ' ' + a.sci + ' documentary video');
        window.open('https://www.youtube.com/results?search_query=' + q, '_blank', 'noopener');
      });
      card.appendChild(th2);
      var note = document.createElement('p');
      note.style.cssText = 'font-size:12px;color:var(--mut);padding:10px 14px;margin:0;line-height:1.9';
      note.textContent = 'اضغط ▶ لمشاهدة فيديوهات حقيقية عن ' + a.ar + ' على يوتيوب (بحث مباشر باسمه الإنجليزي والعلمي). لإضافة فيديو مضمّن ثابت لأي حيوان: ضع معرّفه في حقل ytId داخل ملف البيانات.';
      card.appendChild(note);
    }
    pane.appendChild(card);
  }

  /* ---------- تبويب ثلاثي الأبعاد ---------- */
  function build3DPane(a, pane) {
    if (a.modelKey && MODELS[a.modelKey]) {
      var mv = document.createElement('model-viewer');
      mv.setAttribute('src', MODELS[a.modelKey]);
      /* لا نضع poster على العارض نفسه: صورة بطيئة قد تعلّق إظهار النموذج حتى بعد
         اكتمال تحميله (صندوق فارغ). نعرض صورتنا فوقه ونخفيها عند جاهزية النموذج. */
      mv.setAttribute('loading', 'eager');
      mv.setAttribute('camera-controls', '');
      mv.setAttribute('auto-rotate', '');
      mv.setAttribute('autoplay', '');
      mv.setAttribute('shadow-intensity', '1');
      mv.setAttribute('ar', '');
      mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
      mv.setAttribute('alt', 'نموذج ثلاثي الأبعاد: ' + a.ar);
      mv.className = 'mv3d';
      var bar = document.createElement('div');
      bar.className = 'loadbar'; bar.innerHTML = '<i></i>';
      pane.appendChild(bar);
      var wrap3d = document.createElement('div');
      wrap3d.style.cssText = 'position:relative;border-radius:15px;overflow:hidden';
      var pov = document.createElement('img');
      pov.className = 'a3d-poster';
      pov.alt = '';
      applyImg(pov, a, 800, 600);
      mv.addEventListener('progress', function (e) {
        var d = e.detail && e.detail.totalProgress;
        if (typeof d === 'number') bar.firstChild.style.width = Math.round(d * 100) + '%';
      });
      mv.addEventListener('load', function () {
        bar.firstChild.style.width = '100%';
        pov.style.display = 'none';
        setTimeout(function () { if (bar.parentElement) bar.remove(); }, 500);
      });
      wrap3d.appendChild(mv);
      wrap3d.appendChild(pov);
      pane.appendChild(wrap3d);
      var hint = document.createElement('p');
      hint.style.cssText = 'font-size:11.5px;color:var(--mut);margin:8px 0 0;text-align:center';
      hint.textContent = 'اسحب للتدوير · قرّب للتكبير · على الجوال جرّب زر الواقع المعزز AR';
      pane.appendChild(hint);
      if (window.Animal3D) Animal3D.ensureLibrary().catch(function () {});
    } else {
      buildSpinBox(a, pane);
    }
  }

  /* بديل تفاعلي للحيوانات بلا نموذج GLB بعد: صورة تُدار بالسحب */
  function buildSpinBox(a, pane) {
    var box = document.createElement('div'); box.className = 'spinbox';
    var img = document.createElement('img');
    img.alt = a.ar; img.draggable = false;
    applyImg(img, a, 1000, 640);
    box.appendChild(img);
    var hint = document.createElement('div'); hint.className = 'hintline';
    hint.textContent = '↔ اسحب يميناً ويساراً لاستعراض الصورة تفاعلياً — يُضاف نموذج GLB ثلاثي الأبعاد لهذا الحيوان بسطر واحد في ملف البيانات (modelKey)';
    box.appendChild(hint);
    var offset = 0, startX = null, base = 0;
    function apply() { img.style.transform = 'scale(1.25) translateX(' + offset + 'px)'; }
    apply();
    box.addEventListener('pointerdown', function (e) { startX = e.clientX; base = offset; box.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', function (e) {
      if (startX === null) return;
      offset = Math.max(-140, Math.min(140, base + (e.clientX - startX) * 0.6));
      apply();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      box.addEventListener(ev, function () { startX = null; });
    });
    pane.appendChild(box);
  }

  function closeAnimal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    current = null;
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }
  modal.addEventListener('click', function (e) { if (e.target === modal) closeAnimal(); });
  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeAnimal();
    if (e.key === 'ArrowLeft' && current && current.id < 120) openAnimal(current.id + 1);   // RTL: اليسار = التالي
    if (e.key === 'ArrowRight' && current && current.id > 1) openAnimal(current.id - 1);
  });

  /* ---------- ربط أدوات التحكم ---------- */
  var groups = ['الكل'];
  ANIMALS.forEach(function (a) { if (groups.indexOf(a.group) === -1) groups.push(a.group); });
  var chipsBox = document.getElementById('chips');
  groups.forEach(function (g) {
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'chip' + (g === 'الكل' ? ' on' : '');
    c.textContent = g === 'الكل' ? 'الكل (120)' : g;
    c.addEventListener('click', function () {
      chipsBox.querySelectorAll('.chip').forEach(function (z) { z.classList.toggle('on', z === c); });
      state.group = g; state.page = 1; render();
    });
    chipsBox.appendChild(c);
  });
  var search = document.getElementById('search');
  var timer = null;
  search.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { state.query = search.value; state.page = 1; render(); }, 160);
  });
  document.getElementById('jumpPage').addEventListener('change', function () { goPage(parseInt(this.value, 10) || 1); });
  document.getElementById('jumpAnimalBtn').addEventListener('click', function () {
    var v = parseInt(document.getElementById('jumpAnimal').value, 10);
    if (v >= 1 && v <= 120) openAnimal(v);
  });
  var sortSel = document.getElementById('sortSel');
  if (sortSel) sortSel.addEventListener('change', function () { state.sort = this.value; state.page = 1; render(); });
  var randomBtn = document.getElementById('randomBtn');
  if (randomBtn) randomBtn.addEventListener('click', function () { openAnimal(1 + Math.floor(Math.random() * 120)); });
  var topBtn = document.getElementById('topBtn');
  if (topBtn) {
    window.addEventListener('scroll', function () {
      topBtn.classList.toggle('show', window.scrollY > 700);
    }, { passive: true });
    topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
  document.getElementById('diagBtn').addEventListener('click', function () {
    var box = document.getElementById('diagBox');
    if (window.Animal3D) Animal3D.mountPanel(box);
    else box.textContent = 'محمّل النماذج غير متاح.';
  });
  document.getElementById('statModels').textContent = ANIMALS.filter(function (a) { return a.modelKey; }).length;

  /* ---------- بطاقة «مميز اليوم» في الهيرو + أزرار الفتح السريع ---------- */
  (function heroFeatured() {
    var feat = document.getElementById('heroFeat');
    if (!feat) return;
    var withModels = ANIMALS.filter(function (a) { return a.modelKey; });
    var now = new Date();
    var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    var a = withModels[dayOfYear % withModels.length];
    var img = document.getElementById('hfImg');
    img.alt = a.ar;
    applyImg(img, a, 900, 460);
    document.getElementById('hfNum').textContent = a.id + ' / 120';
    document.getElementById('hfName').textContent = a.emoji + ' ' + a.ar;
    document.getElementById('hfSci').textContent = a.sci + ' · ' + a.en;
    document.getElementById('hfFact').textContent = a.fact;
    feat.addEventListener('click', function () { openAnimal(a.id); });
    feat.addEventListener('keydown', function (e) { if (e.key === 'Enter') openAnimal(a.id); });
  })();
  document.querySelectorAll('[data-open-animal]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = parseInt(b.getAttribute('data-open-animal'), 10);
      if (byId[id]) openAnimal(id);
    });
  });

  render();

  // فتح مباشر من رابط #/animal/رقم
  var m = (location.hash || '').match(/animal\/(\d{1,3})/);
  if (m) { var id = parseInt(m[1], 10); if (byId[id]) openAnimal(id); }
})();
