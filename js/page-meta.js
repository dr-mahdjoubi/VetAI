/* VetAI page-meta (Phase 1+6) — لكل صفحة عنوان ووصف مستقلان:
   يغلّف switchTab (الأخير في السلسلة) فيحدّث document.title ووصف الصفحة
   وcanonical عند كل تنقّل، فتظهر الأقسام كصفحات مستقلة للمستخدم ومحركات البحث. */
(function () {
  'use strict';
  var META = {
    'home':          ['VetAI Global | منصة الطب البيطري الذكية', 'منصة بيطرية عربية مجانية: مُقيِّم أعراض ذكي، مرجع سريري بـ600 مرض، مكتبة واختبارات بالعربية والإنجليزية والفرنسية.'],
    'ai-diagnostics':['المُقيِّم الذكي | VetAI Global', 'قيّم أعراض حيوانك بخطوات موجّهة واحصل على درجة الاستعجال والتوجيه الصحيح، مع تنبيهات العلامات الخطرة أولًا.'],
    'diseases':      ['أطلس الأمراض | VetAI Global', '600 مرض بيطري مصنّف حسب النوع: الأسباب والعلامات والتشخيص واستراتيجية العلاج والوقاية.'],
    'drugs':         ['دليل الأدوية البيطرية | VetAI Global', 'دليل أدوية ولقاحات بيطرية منظم للمختصين، بالجرعات ومواعيد السحب وموانع الاستعمال.'],
    'knowledge':     ['المعرفة والمقالات | VetAI Global', 'مقالات بيطرية سريرية موثّقة وأبحاث حديثة في الطب البيطري.'],
    'library':       ['المكتبة البيطرية | VetAI Global', 'أكثر من 1,500 كتاب ومرجع بيطري بروابط قانونية، مع أبحاث ومجلات ومجتمعات مهنية.'],
    'exams':         ['التعلّم والاختبارات | VetAI Global', 'اختبارات بيطرية سريعة ومُدرَّجة في 28 مادة بثلاث لغات، مع مذكرات التخرج للطلاب.'],
    'thesis':        ['مذكرات التخرج | VetAI Global', 'مساعد أكاديمي ذكي لطلاب الطب البيطري: هيكلة المذكرة والمنهجية والمراجع وخطوات المناقشة.'],
    'pets':          ['السلالات | VetAI Global', 'بطاقات سلالات الكلاب والقطط مع التعرّف على السلالة من صورة على جهازك.'],
    'media':         ['الوسائط والنماذج ثلاثية الأبعاد | VetAI Global', 'صور وفيديوهات بيطرية ونماذج حيوانات ثلاثية الأبعاد تفاعلية.'],
    'services':      ['الخدمات والاستشارات | VetAI Global', 'استشارات بيطرية تعليمية وخدمات المنصة للمربين والطلاب والمختصين.'],
    'fun':           ['الألعاب والتفاعل | VetAI Global', 'ألعاب بيطرية تعليمية وقصص وتحديات لطيفة لكل محبي الحيوانات.'],
    'chat':          ['المساعد الذكي | VetAI Global', 'اسأل مساعد VetAI الذكي واحصل على إجابات موثّقة من محتوى المنصة المراجع.'],
    'ref':           ['المرجع السريع | VetAI Global', 'مرجع سريري سريع: تحاليل وقيم طبيعية وجداول عملية للطبيب البيطري.'],
    'bio':           ['المختبر الصوتي | VetAI Global', 'مختبر منطق الصوتيات الحيوية: قياس ترددات أصوات الحيوانات على جهازك ومقارنتها بأنماط الأدبيات.'],
    'aim':           ['هدف المنصة | VetAI Global', 'لماذا بُنيت VetAI Global ورؤيتها لخدمة الطب البيطري العربي.'],
    'dxlab':         ['مختبر التشخيص | VetAI Global', 'أدوات تشخيص مساعدة ومسارات تفريقية مرتبة حسب الأدلة.'],
    'catalog':       ['فهرس المواضيع | VetAI Global', 'فهرس شامل بمواضيع المنصة البيطرية مصنّفة ومهيكلة.'],
    'creator':       ['منشئ المحتوى | VetAI Global', 'أدوات إنشاء المحتوى البيطري للمنصة.'],
    'about':         ['عن المنصة والتواصل | VetAI Global', 'تعرّف على VetAI Global ومؤسسها د. محجوبي عبدالناصر وطرق التواصل.'],
    'legal':         ['الخصوصية والشروط | VetAI Global', 'سياسة الخصوصية وشروط استخدام منصة VetAI Global.']
  };
  function apply(view) {
    var m = META[view];
    if (!m) return;
    document.title = m[0];
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', m[1]);
    var og = document.querySelector('meta[property="og:title"]');
    if (og) og.setAttribute('content', m[0]);
    var od = document.querySelector('meta[property="og:description"]');
    if (od) od.setAttribute('content', m[1]);
  }
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    var orig = window.switchTab;
    if (typeof orig === 'function' && !orig.__pageMeta) {
      var wrapped = function (view) {
        var r = orig.apply(this, arguments);
        apply(view);
        return r;
      };
      wrapped.__pageMeta = true;
      /* الحفاظ على علامات الأغلفة السابقة حتى لا تُعاد التغطية */
      ['__dz', '__vx', '__vetaiLazyHooked', '__animGov'].forEach(function (k) { if (orig[k]) wrapped[k] = orig[k]; });
      window.switchTab = wrapped;
      clearInterval(iv);
    } else if (tries > 60) clearInterval(iv);
  }, 150);
  /* الصفحة الأولى من الرابط العميق */
  window.addEventListener('load', function () {
    var h = (location.hash || '').replace('#/', '').replace('#', '');
    if (META[h]) apply(h); else apply('home');
  });
})();
