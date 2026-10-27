// library-extra.js — يضيف كتباً ومجلات ومنتديات بيطرية إلى تبويب «المكتبة والكتب» بنفس تنسيقه الحالي.
// القائمة كلها في ملف resources.json: تعدّله وحده لإضافة أي رابط جديد دون المساس بالكود أو التصميم.
// ترقية 2026-10-27 (كتالوج 987): بحث فوري + مرشحات (المنتقاة/الموسّع/اللغة) + عرض تدريجي بدفعات 60
// كي لا تُرسم مئات البطاقات دفعة واحدة على الهواتف الضعيفة.
(function () {
  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }
  function attr(u) { return esc(u).replace(/"/g, '&quot;'); }
  function h3(text) {
    var hs = document.querySelectorAll('h3');
    for (var k = 0; k < hs.length; k++) if (hs[k].textContent.indexOf(text) !== -1) return hs[k];
    return null;
  }
  function has(root, url) {
    var a = root.querySelectorAll('a[href]');
    for (var k = 0; k < a.length; k++) if (a[k].getAttribute('href') === url) return true;
    return false;
  }
  function dl(i) {
    return '<a class="dl" target="_blank" rel="noopener" href="' + attr(i.url) + '"><b>' + esc(i.title) + '</b><span>' + esc(i.desc || '') + '</span></a>';
  }
  function bk(b) {
    return '<a class="bk" target="_blank" rel="noopener" href="' + attr(b.url) + '">' + esc(b.title) + '</a>';
  }

  /* ------- قسم الكتب: بحث ومرشحات وعرض تدريجي ------- */
  var BATCH = 60;
  function isBulk(b) { return (b.desc || '').indexOf('الكتالوج الموسّع') !== -1; }
  function langOf(b) {
    var d = b.desc || '';
    if (d.indexOf('بالفرنسية') !== -1) return 'fr';
    if (d.indexOf('بالإنجليزية') !== -1) return 'en';
    if (d.indexOf('بالعربية') !== -1) return 'ar';
    return '';
  }
  function renderBooks(card, bh, books) {
    var state = { q: '', f: 'all', shown: BATCH };
    var chips = [['all', '📚 الكل'], ['curated', '⭐ المنتقاة يدويًا'], ['bulk', '🗂️ الكتالوج الموسّع'], ['fr', '🇫🇷 بالفرنسية'], ['en', '🇬🇧 بالإنجليزية']];
    bh.insertAdjacentHTML('afterend',
      '<div id="libx-controls" style="margin:10px 0 4px">' +
      '<input id="libx-q" type="search" placeholder="🔎 ابحث في الكتالوج: عنوان، موضوع، جامعة، مؤلف…" ' +
      'style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(127,180,200,.35);background:rgba(255,255,255,.05);color:inherit;font:inherit">' +
      '<div id="libx-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' +
      chips.map(function (c) { return '<button type="button" class="bk" data-f="' + c[0] + '" style="cursor:pointer">' + c[1] + '</button>'; }).join('') +
      '</div><p id="libx-count" class="small" style="margin:8px 0 0"></p></div>');
    card.insertAdjacentHTML('beforeend', '<div id="libx-list"></div>' +
      '<div style="text-align:center"><button type="button" id="libx-more" class="bk" style="display:none;margin:12px auto 4px;cursor:pointer">⬇ عرض المزيد</button></div>');
    var listEl = card.querySelector('#libx-list'), countEl = card.querySelector('#libx-count'),
        moreBtn = card.querySelector('#libx-more'), qEl = card.querySelector('#libx-q');
    function filtered() {
      var q = state.q.trim().toLowerCase();
      return books.filter(function (b) {
        if (state.f === 'curated' && isBulk(b)) return false;
        if (state.f === 'bulk' && !isBulk(b)) return false;
        if ((state.f === 'fr' || state.f === 'en') && langOf(b) !== state.f) return false;
        if (q && (b.title + ' ' + (b.desc || '')).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
    }
    function draw() {
      var f = filtered();
      listEl.innerHTML = f.slice(0, state.shown).map(bk).join('');
      countEl.textContent = 'الكتالوج: ' + f.length + ' مرجعًا' + (f.length !== books.length ? ' (من أصل ' + books.length + ')' : '') + ' — تُعرض على دفعات';
      moreBtn.style.display = state.shown < f.length ? '' : 'none';
      var btns = card.querySelectorAll('#libx-chips [data-f]');
      for (var i = 0; i < btns.length; i++) {
        var on = btns[i].getAttribute('data-f') === state.f;
        btns[i].style.background = on ? 'rgba(45,212,191,.28)' : '';
        btns[i].style.fontWeight = on ? '700' : '';
      }
    }
    var deb = null;
    qEl.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(function () { state.q = qEl.value; state.shown = BATCH; draw(); }, 180);
    });
    card.querySelector('#libx-chips').addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-f]') : null;
      if (!t) return;
      state.f = t.getAttribute('data-f'); state.shown = BATCH; draw();
    });
    moreBtn.addEventListener('click', function () { state.shown += BATCH; draw(); });
    draw();
  }

  function run(d) {
    // 1) كتب ومصادر مجانية — بعرض متحكم به (بحث/مرشحات/دفعات)
    var bh = h3('كتب ومصادر مجانية');
    if (bh && d.books) {
      var card = bh.parentNode;
      var fresh = d.books.filter(function (b) { return b.url && !has(card, b.url); });
      if (fresh.length) renderBooks(card, bh, fresh);
    }
    // 2) مجلات علمية (قبل عنوان الجرائد)
    var nh = h3('جرائد وأخبار بيطرية');
    if (nh && d.journals) {
      var tool = nh.parentNode;
      nh.insertAdjacentHTML('beforebegin', d.journals.filter(function (j) { return !has(tool, j.url); }).map(dl).join(''));
    }
    // 3) منتديات ومجتمعات (بطاقة جديدة بنفس نمط البطاقات)
    var jh = h3('مجلات علمية') || nh;
    if (jh && d.communities && !document.getElementById('xtra-communities')) {
      var host = jh.parentNode;
      var html = '<div class="tool" id="xtra-communities" style="margin-top:14px"><h3>💬 منتديات ومجتمعات بيطرية</h3>' +
        '<p class="small">روابط خارجية لمواقع ومجتمعات بيطرية؛ ما يُكتب في المنتديات المفتوحة للاستئناس فقط ولا يغني عن الطبيب البيطري، فتحقق دائمًا من المصدر.</p>' +
        d.communities.map(function (g) {
          return '<h3 style="margin-top:12px">' + esc(g.group) + '</h3>' + g.items.map(dl).join('');
        }).join('') + '</div>';
      host.insertAdjacentHTML('afterend', html);
    }
  }

  function go() {
    fetch('json/resources.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(run)
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
