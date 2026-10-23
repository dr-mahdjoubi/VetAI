// loader.js — يعرض المحتوى المحدَّث تلقائياً داخل عناصر موجودة أصلاً في الصفحة،
// وبنفس تنسيقها الحالي (شريط الأخبار، المقالات البحثية، المقالات الجديدة). لا يضيف أقساماً ولا يغيّر التصميم.
(function () {
  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }
  function load(file) {
    return fetch('json/' + file + '?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        return (d.items || []).filter(function (i) {
          return i.status === 'approved' && i.title_ar && i.summary_ar;
        });
      })
      .catch(function () { return []; });
  }
  function card(i) {
    var src = i.source_url
      ? '<br><small><a href="' + esc(i.source_url) + '" target="_blank" rel="noopener">' + esc(i.source_name || 'المصدر') + ' ↗</a></small>'
      : '';
    return '<details class="art" data-auto="1"><summary>' + esc(i.title_ar) + '</summary><p class="muted">' + esc(i.summary_ar) + src + '</p></details>';
  }
  function findCardByHeading(text) {
    var hs = document.querySelectorAll('h3');
    for (var k = 0; k < hs.length; k++) {
      if (hs[k].textContent.indexOf(text) !== -1) return hs[k].parentNode;
    }
    return null;
  }

  function run() {
    // 1) الأخبار ← شريط الأخبار العلوي
    load('news.json').then(function (items) {
      var t = document.getElementById('tkt');
      if (!t || !items.length) return;
      var html = items.slice(0, 8).map(function (i) {
        return '<a class="mx-6" target="_blank" rel="noopener" href="' + esc(i.source_url) + '">• ' + esc(i.title_ar) + '</a>';
      }).join('');
      t.insertAdjacentHTML('afterbegin', html);
    });

    // 2) الأبحاث ← "مقالات بحثية مبسطة"
    load('research.json').then(function (items) {
      var box = document.getElementById('resArts');
      if (!box || !items.length) return;
      box.insertAdjacentHTML('afterbegin', items.slice(0, 12).map(card).join(''));
    });

    // 3) المقالات ← "مقالات بيطرية جديدة"
    load('articles.json').then(function (items) {
      var c = findCardByHeading('مقالات بيطرية جديدة');
      if (!c || !items.length) return;
      var h = c.querySelector('h3');
      h.insertAdjacentHTML('afterend', items.slice(0, 12).map(card).join(''));
    });
  }

  function loadExtra() {
    ['js/extra-articles.js', 'js/library-extra.js'].forEach(function (f) {
      var el = document.createElement('script');
      el.src = f + '?v=' + Date.now();
      document.body.appendChild(el);
    });
  }
  function start() { run(); loadExtra(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
