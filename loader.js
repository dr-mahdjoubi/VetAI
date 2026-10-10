// يقرأ ملفات JSON ويعرض العناصر المعتمدة فقط داخل حاويات موجودة أصلاً في الصفحة.
// غيّر قيم id أدناه لتطابق معرّفات الحاويات في موقعك. إن لم توجد الحاوية لا يحدث شيء.
(function () {
  var sections = [
    { file: 'news.json',     id: 'news-list' },
    { file: 'articles.json', id: 'articles-list' },
    { file: 'research.json', id: 'research-list' }
  ];
  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }
  sections.forEach(function (s) {
    var box = document.getElementById(s.id);
    if (!box) return;
    fetch(s.file)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var items = d.items.filter(function (i) { return i.status === 'approved'; });
        if (!items.length) return; // يبقى المحتوى الحالي كما هو
        box.innerHTML = items.map(function (i) {
          return '<div><h3>' + esc(i.title_ar) + '</h3><p>' + esc(i.summary_ar) +
                 '</p><small><a href="' + esc(i.source_url) + '" target="_blank" rel="noopener">' +
                 esc(i.source_name) + '</a></small></div>';
        }).join('');
      })
      .catch(function () {});
  });
})();
