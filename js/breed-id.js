/* VetAI — معرّف فصيلة الكلب/القط من الصورة
   نموذج تصنيف صور (MobileNet / ImageNet) يعمل بالكامل داخل متصفح الزائر:
   لا تُرفع الصورة إلى أي خادم. يُحمَّل النموذج كسولًا عند أول استخدام.
   النتائج تقديرية (خاصة مع السلالات المختلطة) وتُعرض بأمانة مع نسبة الثقة. */
(function () {
  'use strict';
  var MAP = {
    'Labrador retriever': 'لابرادور ريتريفر', 'golden retriever': 'غولدن ريتريفر',
    'German shepherd': 'الراعي الألماني (جيرمن شيبرد)', 'German short-haired pointer': 'المؤشر الألماني قصير الشعر',
    'French bulldog': 'البولدوغ الفرنسي', 'bulldog': 'البولدوغ الإنجليزي', 'pug': 'البَغ',
    'beagle': 'بيغل', 'poodle': 'البودل', 'toy poodle': 'بودل لعبة', 'miniature poodle': 'بودل مصغّر', 'standard poodle': 'بودل قياسي',
    'Siberian husky': 'الهاسكي السيبيري', 'malamute': 'مالاموت ألاسكا', 'Eskimo dog': 'كلب الإسكيمو',
    'dachshund': 'داشهند (الكلب النقانقي)', 'Pembroke': 'كورغي بيمبروك', 'Cardigan': 'كورغي كارديغان',
    'Border collie': 'بوردر كولي', 'collie': 'كولي', 'Shetland sheepdog': 'كلب شيتلاند الراعي',
    'Doberman': 'دوبرمان', 'Rottweiler': 'روت وايلر', 'boxer': 'بوكسر', 'Great Dane': 'الكلب الدانماركي الضخم',
    'Chihuahua': 'تشيواوا', 'Pomeranian': 'بوميرانيان', 'Yorkshire terrier': 'يوركشاير تيرير',
    'Shih-Tzu': 'شيه تزو', 'Lhasa': 'لاسا أبسو', 'Maltese dog': 'المالطي', 'Pekinese': 'البكيني',
    'Chow': 'تشاو تشاو', 'Samoyed': 'سامويد', 'Akita': 'أكيتا', 'Shiba Inu': 'شيبا إينو',
    'cocker spaniel': 'كوكر سبانيل', 'English springer': 'سبرينغر سبانيل', 'Brittany spaniel': 'بريتاني سبانيل',
    'Dalmatian': 'الدلماسي (المرقّط)', 'Saluki': 'السلوقي العربي', 'whippet': 'ويبيت', 'greyhound': 'السلوقي الإنجليزي (غريهاوند)',
    'Afghan hound': 'الكلب الأفغاني', 'bloodhound': 'كلب الدم (بلودهاوند)', 'basset': 'باسيت هاوند',
    'Saint Bernard': 'سانت برنارد', 'Bernese mountain dog': 'كلب جبل بيرن', 'Newfoundland': 'نيوفاوندلاند',
    'Australian shepherd': 'الراعي الأسترالي', 'Australian cattle dog': 'كلب الماشية الأسترالي',
    'tabby': 'قط تابي (مخطط)', 'tiger cat': 'قط مخطط (تابي)', 'Persian cat': 'القط الفارسي (الشيرازي)',
    'Siamese cat': 'القط السيامي', 'Egyptian cat': 'القط المصري (الماو العربي)', 'lynx': 'قط بري (وشق)',
    'Angora': 'الأنجورا التركي', 'Maine Coon': 'ماين كون'
  };
  var modelPromise = null;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = src; sc.onload = res; sc.onerror = function () { rej(new Error('load')); };
      document.head.appendChild(sc);
    });
  }
  function loadModel(statusEl) {
    if (modelPromise) return modelPromise;
    statusEl.textContent = 'جارٍ تحميل نموذج الذكاء الاصطناعي (مرة واحدة فقط، بضعة ميغابايت)…';
    modelPromise = loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js')
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js'); })
      .then(function () { statusEl.textContent = 'جارٍ تجهيز النموذج…'; return window.mobilenet.load(); });
    return modelPromise;
  }
  function init() {
    var file = document.getElementById('bidFile');
    if (!file) return;
    var img = document.getElementById('bidImg');
    var status = document.getElementById('bidStatus');
    var results = document.getElementById('bidResults');
    var currentImg = null;
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var url = URL.createObjectURL(f);
      img.src = url; img.style.display = 'block';
      results.innerHTML = '';
      status.textContent = 'الصورة جاهزة — اضغط «حلّل الصورة».';
      currentImg = new Image();
      currentImg.onload = function () { status.textContent = 'الصورة جاهزة — اضغط «حلّل الصورة».'; };
      currentImg.src = url;
    });
    document.getElementById('bidGo').addEventListener('click', function () {
      if (!currentImg) { status.textContent = 'اختر صورة أولًا من فضلك.'; return; }
      loadModel(status).then(function (model) {
        status.textContent = 'جارٍ التحليل…';
        return model.classify(currentImg);
      }).then(function (preds) {
        var hits = [];
        preds.forEach(function (p) {
          var ar = MAP[p.className];
          if (ar) hits.push({ ar: ar, en: p.className, pct: Math.round(p.probability * 100) });
        });
        if (!hits.length) {
          results.innerHTML = '';
          status.textContent = 'لم يتعرف النموذج على فصيلة كلب أو قط محددة في هذه الصورة (أقرب تخمين: '
            + (preds[0] ? preds[0].className : '—') + '). جرّب صورة أوضح وأقرب للحيوان، بإضاءة جيدة وبدون زحام في الخلفية.';
          return;
        }
        status.textContent = 'أقرب الفصائل المحتملة (تقدير آلي — السلالات المختلطة قد لا تُصنَّف بدقة):';
        results.innerHTML = hits.slice(0, 3).map(function (h) {
          return '<div class="bid-hit"><strong>' + h.ar + '</strong> <span class="muted">(' + h.en + ')</span>'
            + '<span class="bid-pct">' + h.pct + '٪</span></div>';
        }).join('') + '<p class="muted" style="margin-top:8px">قارن النتيجة مع بطاقات الفصائل في هذا القسم، وللتأكد النهائي استشر طبيبك البيطري أو اختبار الحمض النووي للكلاب.</p>';
      }).catch(function () {
        status.textContent = 'تعذّر تحميل النموذج أو التحليل — تحقق من اتصالك بالإنترنت وحاول مجددًا.';
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* بحث فوري في بطاقات الفصائل */
(function () {
  'use strict';
  function initFilter() {
    var inp = document.getElementById('brdSearch');
    if (!inp) return;
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase();
      document.querySelectorAll('.brd-card').forEach(function (c) {
        c.style.display = !q || (c.getAttribute('data-t') || '').includes(q) ? '' : 'none';
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFilter);
  else initFilter();
})();
