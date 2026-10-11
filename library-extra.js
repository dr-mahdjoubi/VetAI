// library-extra.js — يضيف كتباً ومجلات ومنتديات بيطرية إلى تبويب «المكتبة والكتب» بنفس تنسيقه الحالي.
// القائمة كلها في ملف resources.json: تعدّله وحده لإضافة أي رابط جديد دون المساس بالكود أو التصميم.
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

  function run(d) {
    // 1) كتب ومصادر مجانية
    var bh = h3('كتب ومصادر مجانية');
    if (bh && d.books) {
      var card = bh.parentNode;
      card.insertAdjacentHTML('beforeend', d.books.filter(function (b) { return !has(card, b.url); }).map(function (b) {
        return '<a class="bk" target="_blank" rel="noopener" href="' + attr(b.url) + '">' + esc(b.title) + '</a>';
      }).join(''));
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
    fetch('resources.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(run)
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
