// section-art.js — VetAI v64: صور حيوية متناسقة في كل قسم وعنوان.
// صور محلية (webp) من معرض الموقع نفسه — بلا أي طلب خارجي.
// أبعاد ثابتة محجوزة مسبقًا (aspect-ratio) لمنع قفز التصميم،
// وتحميل كسول + فك ترميز غير متزامن لكل الصور (لا صور متحركة ولا فلاتر ثقيلة).
(function () {
  'use strict';

  var ART = {
    'view-diseases':      ['assets/unsplash/1576201836106-db1758fd1c97.webp', 'طبيب بيطري يفحص كلبًا بالسماعة'],
    'view-ai-diagnostics':['assets/commons/Close-up_of_a_veterinarian_examining_a_maltese_dog_with_a_stethoscope._51687314898.webp', 'فحص سريري دقيق بالسماعة'],
    'view-knowledge':     ['assets/unsplash/1500382017468-9049fed747ef.webp', 'مرعى ذهبي عند الغروب'],
    'view-library':       ['assets/unsplash/1450778869180-41d0601e046e.webp', 'كلب وقطة معًا في المنزل'],
    'view-exams':         ['assets/unsplash/1570824104453-508955ab713e.webp', 'جراء وقطيطات صغيرة'],
    'view-media':         ['assets/unsplash/1548199973-03cce0bbc87b.webp', 'كلبان يركضان بمرح'],
    'view-pets':          ['assets/unsplash/1507146426996-ef05306b995a.webp', 'جرو المسترد الذهبي'],
    'view-services':      ['assets/commons/Close-up_of_a_veterinarian_examining_a_maltese_dog.webp', 'فحص بيطري لكلب صغير'],
    'view-fun':           ['assets/unsplash/1543466835-00a7907e9de1.webp', 'كلب سعيد ونشيط'],
    'view-chat':          ['assets/unsplash/1514888286974-6c03e2ca1dba.webp', 'قطة هادئة تنظر باهتمام'],
    'view-about':         ['assets/commons/2016-05-02_Kundasang_-_Desa_Cattle_Dairy_Farm_01.webp', 'أبقار حلوب في مزرعة منظمة'],
    'view-thesis':        ['assets/commons/Tyto_alba_1_Luc_Viatour.webp', 'بومة الحظائر — رمز الحكمة'],
    'view-drugs':         ['assets/unsplash/1574158622682-e40e69881006.webp', 'عيون قطة عن قرب'],
    'view-ref':           ['assets/unsplash/1553284965-83fd3e82fa5a.webp', 'حصان في المرعى'],
    'view-bio':           ['assets/commons/Scarlet_macaw_Ara_macao_cyanopterus_Copan.webp', 'مكاو قرمزي — طائر كثير الأصوات'],
    'view-aim':           ['assets/unsplash/1597651482572-9957ddaacfab.webp', 'خيول سباق بكامل سرعتها'],
    'view-dxlab':         ['assets/unsplash/1472491235688-bdc81a63246e.webp', 'قطة سيامية بعينين زرقاوين'],
    'view-catalog':       ['assets/unsplash/1500595046743-cd271d694d30.webp', 'أبقار في المرعى الأخضر'],
    'view-creator':       ['assets/unsplash/1587300003388-59208cc962cb.webp', 'كلب راعٍ نشيط'],
    'view-legal':         ['assets/commons/Buchfart_Portrait_weisses_Pferd.webp', 'حصان أبيض']
  };

  var TRIO = {
    'ai-diagnostics': ['assets/commons/Close-up_of_a_veterinarian_examining_a_maltese_dog_with_a_stethoscope._51687314898.webp', 'فحص بالسماعة'],
    'diseases':       ['assets/unsplash/1576201836106-db1758fd1c97.webp', 'فحص سريري'],
    'chat':           ['assets/unsplash/1514888286974-6c03e2ca1dba.webp', 'قطة']
  };

  var QA_RULES = [
    [/كلب|كلاب|dog/i, 'assets/unsplash/1543466835-00a7907e9de1.webp', 'كلب سعيد'],
    [/قط|قطط|cat/i, 'assets/unsplash/1514888286974-6c03e2ca1dba.webp', 'قطة'],
    [/خيل|حصان|horse/i, 'assets/unsplash/1553284965-83fd3e82fa5a.webp', 'حصان'],
    [/طير|طيور|ببغا|bird/i, 'assets/commons/Scarlet_macaw_Ara_macao_cyanopterus_Copan.webp', 'ببغاء ملوّن'],
    [/بقر|ماشية|أغنام|ماعز|livestock|cattle/i, 'assets/unsplash/1500595046743-cd271d694d30.webp', 'أبقار في المرعى'],
    [/أرنب|ارانب|rabbit/i, 'assets/unsplash/1585110396000-c9ffd4e4b308.webp', 'أرنب'],
    [/دجاج|دواجن|poultry/i, 'assets/unsplash/1612170153139-6f881ff067e0.webp', 'دجاجة في العشب'],
    [/دواء|أدوية|drug/i, 'assets/unsplash/1574158622682-e40e69881006.webp', 'عيون قطة'],
    [/كتاب|مكتب|book|librar/i, 'assets/unsplash/1450778869180-41d0601e046e.webp', 'كلب وقطة'],
    [/فحص|تشخيص|مرض|عياد|clinic|diagnos/i, 'assets/unsplash/1576201836106-db1758fd1c97.webp', 'فحص سريري']
  ];
  var QA_FALLBACK = ['assets/unsplash/1548199973-03cce0bbc87b.webp', 'كلبان يلعبان'];

  function mkImg(src, alt, cls, w, h) {
    var img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.className = cls;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.setAttribute('width', w);
    img.setAttribute('height', h);
    img.draggable = false;
    return img;
  }

  function artFor(view) {
    return ART[view.id] || null;
  }

  function decorateView(view) {
    if (!view || view.id === 'view-home') return;
    var art = artFor(view);
    if (!art) return;
    if (!view.querySelector('.view-banner')) {
      var fig = document.createElement('figure');
      fig.className = 'view-banner';
      fig.appendChild(mkImg(art[0], art[1], '', 1200, 514));
      view.insertBefore(fig, view.firstChild);
    }
    var heads = view.querySelectorAll('.sh2');
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].querySelector('.sh2-art')) continue;
      heads[i].insertBefore(mkImg(art[0], '', 'sh2-art', 112, 112), heads[i].firstChild);
    }
    var h2s = view.querySelectorAll('h2');
    for (var j = 0; j < h2s.length; j++) {
      var h = h2s[j];
      if (h.id === 'vg-global-title' || h.querySelector('.h-art')) continue;
      if (h.closest('.card, .tool, button, nav, .sh2, #show45, .view-banner')) continue;
      h.insertBefore(mkImg(art[0], '', 'h-art', 88, 88), h.firstChild);
    }
  }

  function decorateHome() {
    var trio = document.getElementById('focusTrio');
    if (trio) {
      var btns = trio.querySelectorAll('[data-go]');
      for (var i = 0; i < btns.length; i++) {
        var t = TRIO[btns[i].getAttribute('data-go')];
        if (t && !btns[i].querySelector('.ft-art')) {
          btns[i].insertBefore(mkImg(t[0], t[1], 'ft-art', 92, 92), btns[i].firstChild);
        }
      }
    }
    var homeHeads = document.querySelectorAll('#view-home .sh2');
    for (var s = 0; s < homeHeads.length; s++) {
      if (homeHeads[s].querySelector('.sh2-art')) continue;
      homeHeads[s].insertBefore(mkImg(QA_FALLBACK[0], '', 'sh2-art', 112, 112), homeHeads[s].firstChild);
    }
    var cards = document.querySelectorAll('#view-home .card.qa');
    for (var j = 0; j < cards.length; j++) {
      if (cards[j].querySelector('.qa-art')) continue;
      var txt = cards[j].textContent || '';
      var pick = QA_FALLBACK;
      for (var k = 0; k < QA_RULES.length; k++) {
        if (QA_RULES[k][0].test(txt)) { pick = [QA_RULES[k][1], QA_RULES[k][2]]; break; }
      }
      cards[j].insertBefore(mkImg(pick[0], pick[1], 'qa-art', 800, 450), cards[j].firstChild);
    }
  }

  function decorateAll() {
    try {
      var views = document.querySelectorAll('section[id^="view-"]');
      for (var i = 0; i < views.length; i++) decorateView(views[i]);
      decorateHome();
    } catch (e) { /* decorative layer — never break the app */ }
  }

  function init() {
    decorateAll();
    setTimeout(decorateAll, 2500);
    if (typeof window.switchTab === 'function' && !window.switchTab.__sectionArt) {
      var orig = window.switchTab;
      var wrapped = function () {
        var r = orig.apply(this, arguments);
        setTimeout(decorateAll, 60);
        return r;
      };
      // preserve wrapper markers used by other modules
      for (var key in orig) { try { wrapped[key] = orig[key]; } catch (e) {} }
      wrapped.__sectionArt = true;
      window.switchTab = wrapped;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
