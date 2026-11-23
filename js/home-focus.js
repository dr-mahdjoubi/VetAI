/* VetAI home-focus (Phase 1) — تركيز الصفحة الرئيسية:
   الرئيسية تعرض فقط: البطل + شريط الطوارئ + ثلاثية التركيز (المقيّم/المرجع/المساعد)
   + بطاقات اختصار الأقسام + جديد المنصة + بطاقة الوسائط.
   بقية كتل الرئيسية تُنقَل (لا تُحذف) إلى صفحاتها الطبيعية:
   سؤال اليوم → الألعاب · المقالات المختارة → المعرفة · كتل التعريف الكبيرة ومدير
   الموقع والجامعات → عن المنصة · تعلّم وتفاعل → التعلّم والاختبارات. */
(function () {
  'use strict';
  function ready(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    var home = document.getElementById('view-home');
    if (!home) return;

    function headingOf(el) {
      var h = el.querySelector('h1,h2,h3');
      return h ? h.textContent.trim() : '';
    }
    function blockByHeading(text) {
      var kids = home.children;
      for (var i = 0; i < kids.length; i++) {
        if (headingOf(kids[i]).indexOf(text) !== -1) return kids[i];
      }
      return null;
    }
    function moveTo(el, viewId) {
      var v = document.getElementById(viewId);
      if (el && v && el.parentElement !== v) v.insertBefore(el, v.firstChild);
    }
    function movePair(headingText, viewId) {
      var head = blockByHeading(headingText);
      if (!head) return;
      var next = head.nextElementSibling;
      moveTo(head, viewId);
      /* الشقيق التالي يُنقل فقط إن كان شبكة محتوى تابعة للعنوان — لا أشرطة مستقلة */
      if (next && next.parentElement === home && next.classList && next.classList.contains('grid')) moveTo(next, viewId);
    }

    /* --- ثلاثية التركيز بعد البطل مباشرة --- */
    var hero = home.querySelector('.vg-cinematic') || home.children[1];
    if (hero && !document.getElementById('focusTrio')) {
      var trio = document.createElement('div');
      trio.id = 'focusTrio';
      trio.className = 'focus-trio';
      trio.innerHTML =
        '<button type="button" data-go="ai-diagnostics"><span class="ft-ic">🩺</span><span class="ft-t">المُقيِّم الذكي</span><span class="ft-d">فرز الأعراض ودرجة الاستعجال</span></button>' +
        '<button type="button" data-go="diseases"><span class="ft-ic">📚</span><span class="ft-t">المرجع السريري</span><span class="ft-d">600 مرض وأدوية وتحاليل</span></button>' +
        '<button type="button" data-go="chat"><span class="ft-ic">🤖</span><span class="ft-t">المساعد الذكي</span><span class="ft-d">اسأل واحصل على إجابة موثّقة</span></button>';
      trio.addEventListener('click', function (e) {
        var b = e.target.closest('[data-go]');
        if (b && typeof window.switchTab === 'function') window.switchTab(b.getAttribute('data-go'));
      });
      hero.parentElement.insertBefore(trio, hero.nextSibling);
    }

    /* --- نقل الكتل إلى صفحاتها ---
       ملاحظة: «سؤال اليوم» (#va-quiz) يبقى في الرئيسية قصدًا: منطقُه مدمج في
       سكربتات الصفحة الرئيسية (10 إشارات) ونقله يهدّد تعطيله، وهو صغير ومناسب للرئيسية. */
    movePair('مقالات مختارة', 'view-knowledge');                        /* المقالات → المعرفة */
    moveTo(document.getElementById('homeArts'), 'view-knowledge');
    movePair('من مدير الموقع الذكي', 'view-about');                     /* مدير الموقع → عن المنصة */
    movePair('رعاية بيطرية بدقة الطبيب', 'view-about');                 /* كتلة التعريف الكبيرة */
    movePair('ثلاثة مستويات، منصة واحدة', 'view-about');
    movePair('تخصصنا: صحة الحيوان في بيئتنا', 'view-about');
    movePair('الجامعات والكليات البيطرية', 'view-about');
    movePair('تعلّم وتفاعل', 'view-exams');                             /* تعلّم وتفاعل → الاختبارات */

    /* --- ترتيب الرئيسية النهائي --- */
    var order = [];
    var show = document.getElementById('show45');
    var emg = home.querySelector('.emg');
    var shortcuts = blockByHeading('أهم أقسام المنصة');
    var fresh = blockByHeading('جديد ومحدَّث');
    var trioEl = document.getElementById('focusTrio');
    if (hero) order.push(hero);
    if (emg) order.push(emg);
    if (trioEl) order.push(trioEl);
    if (shortcuts) order.push(shortcuts);
    if (show) order.push(show);
    if (fresh) order.push(fresh);
    /* إدراج الكتل المرتبة في صدارة الرئيسية بترتيبها (عكسيًا مع insertBefore) */
    for (var i = order.length - 1; i >= 0; i--) {
      if (order[i].parentElement === home) home.insertBefore(order[i], home.firstChild);
    }
  });
})();
