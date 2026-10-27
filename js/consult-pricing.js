/* VetAI Consult Pricing — بطاقات أسعار الاستشارات داخل قسم الخدمات (view-services)
   منطق الدفع بلا خادم: كل باقة إما مربوطة برابط دفع Stripe Payment Link
   (يضعه المالك في CONFIG.stripeLinks بعد إنشاء الروابط في لوحة Stripe)
   أو تُحجز عبر واتساب المنصة برسالة مهيأة باسم الباقة — المساران حقيقيان ويعملان اليوم،
   ويتحول زر الباقة تلقائيًا إلى «ادفع واحجز عبر Stripe» لحظة وضع رابطها. */
'use strict';
(function () {
  if (window.__vetaiConsultPricingLoaded) return;
  window.__vetaiConsultPricingLoaded = true;

  var CONFIG = {
    /* ضع هنا روابط Stripe Payment Links بعد إنشائها (اتركها فارغة لاستعمال حجز واتساب) */
    stripeLinks: {
      written: '',
      video: '',
      followup: ''
    },
    whatsappNumber: '14152793963',
    currencyNote: 'الأسعار بالدولار الأمريكي — تدفع بأي بطاقة دولية عبر Stripe عند التفعيل'
  };

  var TIERS = [
    {
      id: 'written',
      name: 'استشارة مكتوبة',
      price: 15,
      unit: 'للحالة الواحدة',
      features: [
        'أرسل وصف الحالة والصور عبر واتساب أو النموذج',
        'رأي بيطري مكتوب مفصل من د. محجوبي خلال 24 ساعة',
        'خطة متابعة منزلية واضحة ومتى يجب التوجه لعيادة',
        'سؤال متابعة واحد مجانًا خلال 48 ساعة'
      ],
      cta: 'احجز الاستشارة المكتوبة'
    },
    {
      id: 'video',
      name: 'استشارة مرئية مباشرة',
      price: 35,
      unit: '30 دقيقة فيديو',
      featured: true,
      features: [
        'مكالمة فيديو مباشرة مع د. محجوبي في موعد محجوز',
        'معاينة بصرية للحيوان وتقييم إرشادي فوري للحالة أمامك',
        'مناقشة التشخيصات المحتملة وخطة العمل خطوة بخطوة',
        'ملخص مكتوب بعد المكالمة + تسجيل أهم التوصيات'
      ],
      cta: 'احجز الاستشارة المرئية'
    },
    {
      id: 'followup',
      name: 'باقة متابعة شهرية',
      price: 79,
      unit: '30 يومًا',
      features: [
        'للحالات المزمنة وما بعد الجراحة',
        'مكالمتان مرئيتان (30 دقيقة) خلال الشهر',
        'رسائل متابعة مكتوبة بلا حد خلال الشهر',
        'مراجعة التحاليل والتقارير ورفعها أولًا بأول'
      ],
      cta: 'اشترك في باقة المتابعة'
    }
  ];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function bookingUrl(tier) {
    var link = CONFIG.stripeLinks[tier.id];
    if (link && /^https:\/\/buy\.stripe\.com\//.test(link)) return { url: link, via: 'stripe' };
    var msg = 'مرحبًا د. محجوبي، أريد حجز: ' + tier.name + ' (' + tier.price + '$ — ' + tier.unit + ') عبر منصة VetAI. اسمي: … وحالة الحيوان باختصار: …';
    return { url: 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(msg), via: 'whatsapp' };
  }

  function buildCard(tier) {
    var card = el('div', 'cp-card' + (tier.featured ? ' cp-featured' : ''));
    if (tier.featured) card.appendChild(el('div', 'cp-badge', 'الأكثر طلبًا'));
    card.appendChild(el('h3', 'cp-name', tier.name));
    var price = el('div', 'cp-price');
    price.appendChild(el('span', 'cp-amount', '$' + tier.price));
    price.appendChild(el('span', 'cp-unit', tier.unit));
    card.appendChild(price);
    var ul = el('ul', 'cp-features');
    tier.features.forEach(function (f) { ul.appendChild(el('li', null, '✓ ' + f)); });
    card.appendChild(ul);
    var target = bookingUrl(tier);
    var btn = el('a', 'cp-btn', tier.cta + (target.via === 'stripe' ? ' — ادفع عبر Stripe' : ''));
    btn.href = target.url;
    btn.target = '_blank';
    btn.rel = 'noopener';
    card.appendChild(btn);
    card.appendChild(el('p', 'cp-via', target.via === 'stripe'
      ? 'دفع آمن عبر Stripe — يُؤكَّد موعدك فور إتمام الدفع'
      : 'الحجز والدفع حاليًا عبر واتساب المنصة — رد شخصي لتأكيد الموعد'));
    return card;
  }

  function inject() {
    var host = document.getElementById('view-services');
    if (!host || document.getElementById('consultPricing')) return;
    var section = el('section', 'cp-wrap');
    section.id = 'consultPricing';
    section.appendChild(el('h2', 'cp-title', '💎 الاستشارات البيطرية المدفوعة — مع د. محجوبي شخصيًا'));
    section.appendChild(el('p', 'cp-sub',
      'كل محتوى المنصة التعليمي مجاني وسيبقى مجانيًا. د. محجوبي طبيب بيطري مرخّص لمزاولة المهنة في الجزائر: الاستشارة السريرية الكاملة موجهة للحالات داخل الجزائر، وللمقيمين في أي بلد آخر تكون الجلسة إرشادًا تعليميًا عامًا يساعدك على فهم حالة حيوانك والتعامل الصحيح مع طبيبك المحلي المرخّص. اختر الباقة وسيُفتح لك مسار الحجز فورًا.'));
    var grid = el('div', 'cp-grid');
    TIERS.forEach(function (t) { grid.appendChild(buildCard(t)); });
    section.appendChild(grid);
    section.appendChild(el('p', 'cp-note', CONFIG.currencyNote + ' · يقدّم هذه الخدمة طبيب بيطري مرخّص في الجزائر فقط: داخل الجزائر استشارة مهنية ضمن نطاق ترخيصه، وخارجها إرشاد تعليمي عام لا يُعد تشخيصًا ولا وصفة علاجية ولا يُنشئ علاقة طبيب–عميل–مريض (VCPR)، ولا يغني أبدًا عن طبيبك المحلي المرخّص والفحص الحضوري عند الحاجة.'));
    host.appendChild(section);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
