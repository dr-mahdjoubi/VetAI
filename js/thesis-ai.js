/* VetAI — مساعد مذكرات التخرج بالذكاء الاصطناعي (Thesis AI)
   قسم خاص في فروع المنصة: منشئ هيكل مذكرة + مساعد أكاديمي (VetAIClient.ask) + أدلة منهجية.
   يعمل محليًا بالكامل لتوليد الهيكل؛ المساعد يستخدم خط ذكاء المنصة الحالي. */
(function () {
  'use strict';
  var CSS = [
    '#view-thesis .th-wrap{max-width:980px;margin:0 auto;padding:8px 4px 24px}',
    '#view-thesis .th-hero{background:linear-gradient(135deg,#064e3b,#0f766e);border-radius:24px;padding:26px 22px;color:#ecfdf5}',
    '#view-thesis .th-hero h2{font-size:26px;font-weight:900;margin:0 0 6px}',
    '#view-thesis .th-hero p{margin:0;color:#a7f3d0;font-size:14px;line-height:1.9}',
    '#view-thesis .th-note{background:#451a03;border:1px solid #92400e;color:#fde68a;border-radius:14px;padding:12px 16px;font-size:13px;line-height:1.9;margin:14px 0}',
    '#view-thesis .th-card{background:rgba(15,23,42,.72);border:1px solid #1e293b;border-radius:20px;padding:20px;margin:16px 0}',
    '#view-thesis .th-card h3{color:#22d3ee;font-weight:900;font-size:18px;margin:0 0 12px}',
    '#view-thesis .th-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '@media(max-width:640px){#view-thesis .th-grid{grid-template-columns:1fr}}',
    '#view-thesis label{display:block;font-size:13px;color:#cbd5e1;margin-bottom:5px;font-weight:700}',
    '#view-thesis input,#view-thesis select,#view-thesis textarea{width:100%;background:#0f172a;border:1px solid #334155;border-radius:12px;padding:10px 12px;color:#f1f5f9;font-size:14px;box-sizing:border-box}',
    '#view-thesis .th-btn{display:inline-block;background:#06b6d4;color:#082f49;font-weight:900;border:0;border-radius:12px;padding:11px 22px;font-size:15px;cursor:pointer}',
    '#view-thesis .th-btn.alt{background:transparent;color:#22d3ee;border:1px solid #155e75}',
    '#view-thesis .th-out{white-space:pre-wrap;background:#020617;border:1px solid #1e293b;border-radius:14px;padding:18px;font-size:14px;line-height:2;color:#e2e8f0;max-height:560px;overflow:auto}',
    '#view-thesis .th-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}',
    '#view-thesis .th-chip{background:#164e63;color:#a5f3fc;border:1px solid #155e75;border-radius:999px;padding:6px 13px;font-size:12.5px;cursor:pointer}',
    '#view-thesis .th-answer{background:#020617;border:1px solid #134e4a;border-radius:14px;padding:16px;font-size:14px;line-height:2;color:#e2e8f0;white-space:pre-wrap}',
    '#view-thesis details{background:rgba(15,23,42,.72);border:1px solid #1e293b;border-radius:14px;padding:14px 16px;margin:10px 0}',
    '#view-thesis summary{cursor:pointer;font-weight:800;color:#e2e8f0;font-size:15px}',
    '#view-thesis details .th-body{color:#cbd5e1;font-size:13.5px;line-height:2;margin-top:8px;white-space:pre-wrap}',
    '#view-thesis .th-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}'
  ].join('\n');

  function shell() {
    return '' +
    '<div class="th-wrap">' +
      '<div class="th-hero"><h2>🎓 مذكرات التخرج — مساعدك الأكاديمي الذكي</h2>' +
      '<p>أداة مجانية لطلبة الطب البيطري: ولّد هيكل مذكرة تخرج كاملًا بصيغة الجامعات الجزائرية والمغاربية (جانب نظري + جانب تطبيقي)، واسأل المساعد الأكاديمي عن المنهجية والصياغة وتنسيق المراجع.</p></div>' +
      '<div class="th-note">⚖️ <b>أمانة علمية:</b> هذا المساعد يساعدك في الهيكلة والبحث والصياغة والمراجعة — لكن مذكرتك تكتبها أنت بنفسك، وتصرّح باستخدام الذكاء الاصطناعي وفق نظام جامعتك (نموذج تصريح جاهز في الأدلة أسفله).</div>' +

      '<div class="th-card"><h3>🏗️ 1) منشئ هيكل المذكرة</h3>' +
        '<div class="th-grid">' +
          '<div style="grid-column:1/-1"><label>موضوع المذكرة</label><input id="th-topic" placeholder="مثال: التهاب الضرع عند الأبقار الحلوب"></div>' +
          '<div><label>الدرجة العلمية</label><select id="th-degree"><option value="licence">مذكرة ليسانس / نهاية الدراسة</option><option value="master">مذكرة ماستر</option><option value="doctorat">أطروحة دكتوراه</option></select></div>' +
          '<div><label>نوع الدراسة</label><select id="th-type"><option value="field">دراسة ميدانية</option><option value="theory">دراسة نظرية (بحث مكتبي)</option><option value="exp">دراسة تجريبية / مخبرية</option><option value="case">دراسة حالة سريرية</option><option value="epi">دراسة وبائية</option></select></div>' +
          '<div><label>المجال</label><select id="th-field">' +
            '<option value="infectious">أمراض معدية</option><option value="parasitic">أمراض طفيلية</option><option value="surgery">جراحة وتخدير</option><option value="repro">توليد وتناسل</option><option value="internal">طب داخلي</option><option value="nutrition">تغذية حيوانية</option><option value="public">صحة عمومية وسلامة أغذية</option><option value="micro">أحياء دقيقة ومناعة</option><option value="patho">تشريح مرضي</option><option value="pharma">أدوية وسموم</option><option value="production">إنتاج حيواني</option><option value="general">عام / آخر</option></select></div>' +
          '<div><label>الحيوان المعني</label><select id="th-species"><option>الأبقار</option><option>الأغنام والماعز</option><option>الكلاب والقطط</option><option>الخيول</option><option>الدواجن</option><option>الأرانب</option><option>الإبل</option><option>النحل</option><option>الأسماك</option><option>عام / عدة أنواع</option></select></div>' +
        '</div>' +
        '<div class="th-row"><button class="th-btn" id="th-gen" type="button">ولّد هيكل المذكرة</button>' +
        '<button class="th-btn alt" id="th-copy" type="button">📋 نسخ الهيكل</button>' +
        '<button class="th-btn alt" id="th-print" type="button">🖨️ طباعة / حفظ PDF</button></div>' +
        '<div class="th-out" id="th-out" style="margin-top:14px">سيظهر هيكل مذكرتك هنا: عناوين مقترحة، إشكالية، فرضيات، أهداف، فصول الجانبين النظري والتطبيقي، خاتمة، وخطة زمنية.</div>' +
      '</div>' +

      '<div class="th-card"><h3>🤖 2) المساعد الأكاديمي الذكي</h3>' +
        '<p style="color:#94a3b8;font-size:13px;line-height:1.9;margin:0 0 8px">اسأل عن أي خطوة: صياغة الإشكالية، الفرضيات، منهجية الدراسة، تنسيق مرجع، التحضير للمناقشة… يجيبك ذكاء المنصة مع مراجع من محتوى VetAI.</p>' +
        '<div class="th-chips" id="th-chips"></div>' +
        '<textarea id="th-q" rows="3" placeholder="مثال: كيف أصيغ إشكالية مذكرة عن التهاب الضرع عند الأبقار؟"></textarea>' +
        '<div class="th-row"><button class="th-btn" id="th-ask" type="button">اسأل المساعد</button></div>' +
        '<div class="th-answer" id="th-answer" style="margin-top:12px;display:none"></div>' +
      '</div>' +

      '<div id="th-guides"></div>' +
    '</div>';
  }

  var THEORY = {
    infectious: ['عموميات حول المرض: التعريف والأهمية والعامل المسبب وخصائصه', 'الوبائيات: الانتشار الجغرافي وطرق الانتقال والعوامل المساعدة', 'الأعراض والتشخيص والعلاج والوقاية والمكافحة'],
    parasitic: ['عموميات حول الطفيل: التصنيف ودورة الحياة والعوائل', 'الوبائيات والأهمية الاقتصادية والصحية', 'التشخيص والعلاج واستراتيجيات المكافحة والوقاية'],
    surgery: ['المبادئ العامة للجراحة والتخدير ذات الصلة بالموضوع', 'التقنيات الجراحية والبدائل العلاجية', 'المضاعفات والرعاية والمتابعة بعد الجراحة'],
    repro: ['فيزيولوجيا التناسل عند النوع المدروس', 'الاضطرابات والمشكلات التناسلية الشائعة', 'التقنيات الحديثة: التلقيح الاصطناعي وتشخيص الحمل ونقل الأجنة'],
    internal: ['عموميات حول الجهاز أو العضو المعني: التشريح والوظيفة', 'أهم الاضطرابات وأسبابها وآليات حدوثها', 'التشخيص التفريقي والتدبير العلاجي والوقاية'],
    nutrition: ['الاحتياجات الغذائية للنوع المدروس حسب مراحل الإنتاج', 'المواد العلفية وتركيب العلائق وحسابها', 'الاضطرابات الغذائية والأيضية وسبل الوقاية منها'],
    public: ['الإطار المفاهيمي للصحة العمومية البيطرية ودور الطبيب البيطري', 'الأمراض المشتركة وسلامة الأغذية ذات الصلة بالموضوع', 'التشريعات والترصد الوبائي وخطط الاستجابة'],
    micro: ['عموميات حول العامل الممرض والاستجابة المناعية', 'طرق التشخيص المخبري الحديثة', 'اللقاحات واستراتيجيات التحصين والمكافحة'],
    patho: ['أسس التشريح المرضي وأنواع الآفات', 'الآفات الخاصة بالعضو أو الجهاز المدروس', 'الارتباط بين الموجودات التشريحية والصورة السريرية'],
    pharma: ['عموميات دوائية: الحركية والديناميكية للفئات المعنية', 'الاستعمالات السريرية والجرعات الاسترشادية وموانع الاستعمال', 'المقاومة الدوائية والسمية وفترات السحب'],
    production: ['نظم الإنتاج والإدارة في القطاع المدروس', 'التغذية والتربية والتحسين الوراثي', 'المؤشرات التقنية والاقتصادية وتقييم الأداء'],
    general: ['الإطار النظري العام للموضوع والمفاهيم الأساسية', 'عرض الدراسات السابقة ومناقشة ما توصلت إليه', 'المصطلحات والتعريفات الإجرائية للدراسة']
  };
  var PRACTICAL = {
    field: ['تقديم الدراسة: منطقة الدراسة وفترتها وخصائص العينة', 'المواد والطرق: الاستبيانات والفحوصات والأدوات المستعملة', 'عرض النتائج وتحليلها ومناقشتها في ضوء الدراسات السابقة'],
    theory: ['منهجية البحث المكتبي: قواعد البيانات ومفاتيح البحث ومعايير الانتقاء', 'تحليل الدراسات المنتقاة ومقارنتها وتصنيف نتائجها', 'مناقشة نقدية شاملة واستنتاجات وتوصيات'],
    exp: ['التصميم التجريبي: المجموعات والمتغيرات وأخلاقيات استعمال الحيوان', 'المواد والطرق المخبرية بالتفصيل القابل للتكرار', 'عرض النتائج والتحليل الإحصائي ومناقشتها'],
    case: ['تقديم الحالة: التاريخ المرضي والفحص السريري الكامل', 'الفحوصات التكميلية والتشخيص التفريقي والتشخيص النهائي', 'الخطة العلاجية والمتابعة ومناقشة الحالة مقارنة بالأدبيات'],
    epi: ['مصادر البيانات وفترة الدراسة وتعريف الحالات', 'المؤشرات الوبائية المحسوبة: الانتشار والحدوث والتوزيع', 'عرض النتائج ومناقشتها وصياغة التوصيات الوقائية']
  };
  var TYPEWORD = { field: 'ميدانية', theory: 'نظرية', exp: 'تجريبية', case: 'سريرية', epi: 'وبائية' };
  var TIMELINE = {
    licence: ['الأسبوعان 1–2: اختيار الموضوع واعتماده من المشرف وجمع المراجع', 'الأسبوعان 3–4: كتابة الجانب النظري', 'الأسبوعان 5–6: إنجاز الجانب التطبيقي وتحليل النتائج', 'الأسبوع 7: الخاتمة والمراجع والمراجعة اللغوية', 'الأسبوع 8: الطباعة والإيداع والتحضير للمناقشة'],
    master: ['الشهر 1: الموضوع والخطة وجمع المراجع', 'الشهر 2: الجانب النظري', 'الشهر 3: الجانب التطبيقي الميداني/المخبري', 'الشهر 4: التحليل الإحصائي وكتابة النتائج ومناقشتها', 'الشهر 5: المراجعة مع المشرف والتصحيحات', 'الشهر 6: الإيداع النهائي والتحضير للمناقشة'],
    doctorat: ['المرحلة 1: الإطار النظري الشامل ونشر مقال مراجعة إن أمكن', 'المرحلة 2: الدراسة الأولى (ميدانية/مخبرية) ونشر نتائجها', 'المرحلة 3: الدراسة الثانية واستكمال التجارب', 'المرحلة 4: كتابة الأطروحة ومراجعتها مع المشرف', 'المرحلة 5: المقالات العلمية المطلوبة والإيداع والمناقشة']
  };

  function buildOutline() {
    var topic = (document.getElementById('th-topic').value || '').trim() || 'موضوع المذكرة';
    var degree = document.getElementById('th-degree').value;
    var type = document.getElementById('th-type').value;
    var field = document.getElementById('th-field').value;
    var species = document.getElementById('th-species').value;
    var tw = TYPEWORD[type];
    var L = [];
    L.push('مذكرة تخرج في الطب البيطري');
    L.push('════════════════════════════');
    L.push('');
    L.push('■ عناوين مقترحة (اختر واحدًا وعدّله مع مشرفك):');
    L.push('1) ' + topic + ' لدى ' + species + ': دراسة ' + tw);
    L.push('2) مساهمة في دراسة ' + topic + ' عند ' + species);
    L.push('3) ' + topic + ' عند ' + species + ': الجوانب النظرية والتطبيقية');
    L.push('');
    L.push('■ المقدمة العامة: سياق الموضوع وأهميته العلمية والاقتصادية والصحية، ثم تقديم موجز لخطة المذكرة.');
    L.push('');
    L.push('■ الإشكالية (صياغة مقترحة — خصّصها بمعطيات منطقتك):');
    L.push('يُعدّ موضوع «' + topic + '» من القضايا المهمة في طب ' + species + ' لما له من آثار على الصحة والإنتاج. ورغم الدراسات المتوفرة، ما تزال جوانب منه غير محسومة محليًا. ومنه نطرح السؤال الرئيس: ما واقع ' + topic + ' لدى ' + species + '، وما العوامل المؤثرة فيه وسبل التحكم به؟');
    L.push('أسئلة فرعية: ما مدى انتشار/حدوث الظاهرة؟ ما عوامل الخطر المرتبطة بها؟ ما وسائل التشخيص والوقاية الأكثر ملاءمة محليًا؟');
    L.push('');
    L.push('■ الفرضيات:');
    L.push('• الفرضية العامة: توجد عوامل محددة (تربية/تغذية/وقاية) ترتبط ارتباطًا دالًا بحدوث ' + topic + ' لدى ' + species + '.');
    L.push('• فرضيات جزئية: تُصاغ لكل سؤال فرعي على حدة، بصيغة قابلة للاختبار والقياس.');
    L.push('');
    L.push('■ الأهداف: هدف عام (دراسة ' + topic + ' لدى ' + species + ' وتقييم وسائل التحكم فيه) + أهداف خاصة مرتبطة بالأسئلة الفرعية.');
    L.push('■ أهمية الدراسة ودوافع اختيار الموضوع: ذاتية (اهتمام الطالب) وموضوعية (أثر اقتصادي/صحي وفجوة معرفية محلية).');
    L.push('');
    L.push('■ الجانب النظري:');
    THEORY[field].forEach(function (c, i) { L.push('الفصل ' + (i + 1) + ': ' + c + ' — ويتفرع إلى مباحث ومطالب مرقمة.'); });
    L.push('');
    L.push('■ الجانب التطبيقي (دراسة ' + tw + '):');
    PRACTICAL[type].forEach(function (c, i) { L.push('الفصل ' + (i + 1) + ': ' + c); });
    L.push('');
    L.push('■ الخاتمة العامة: خلاصة النتائج، والإجابة عن الإشكالية والفرضيات، ثم التوصيات والآفاق.');
    L.push('■ قائمة المراجع: رتّبها أبجديًا وبصيغة موحدة (APA أو فانكوفر) — أمثلة منسقة في أدلة القسم أسفله، ومراجع مجانية في مكتبة المنصة.');
    L.push('■ الملاحق: الاستبيانات، الجداول الخام، الصور، والوثائق الرسمية.');
    L.push('');
    L.push('■ خطة زمنية مقترحة:');
    TIMELINE[degree].forEach(function (s) { L.push('• ' + s); });
    L.push('');
    L.push('— وُلّد هذا الهيكل بمساعد مذكرات VetAI. راجعه مع مشرفك وعدّله قبل الاعتماد. —');
    return L.join('\n');
  }

  var GUIDES = [
    ['📚 كيف تختار موضوع مذكرتك؟', '• ابدأ من مشكلة حقيقية لاحظتها في التدريب الميداني أو العيادة.\n• تأكد من توفر المراجع والعينات/الحالات محليًا قبل الاعتماد.\n• الموضوع الجيد: محدد (نوع حيوان + مكان + فترة)، قابل للقياس، ومفيد مهنيًا.\n• تجنب المواضيع الواسعة جدًا («أمراض الأبقار») واختر زاوية ضيقة عميقة.\n• ناقش العنوان مع مشرفك مبكرًا ولا تبدأ الكتابة قبل اعتماده كتابة.'],
    ['🔬 منهجية البحث العلمي في سطور', '• الإشكالية سؤال واحد واضح، والفرضيات إجابات مؤقتة قابلة للاختبار.\n• عرّف مجتمع الدراسة والعينة وطريقة اختيارها وأدوات جمع البيانات.\n• اذكر التحليل الإحصائي المستعمل (نسب، متوسطات، اختبارات دلالة) وبرنامجه.\n• وثّق كل معلومة بمرجعها، واكتب الطرق بصيغة تسمح لغيرك بتكرارها.\n• احترم أخلاقيات البحث: موافقات، رفق بالحيوان، وسرية بيانات المربين.'],
    ['✒️ تنسيق المراجع: APA وفانكوفر', 'مقال علمي — APA:\nBennett, R. M., & Perrett, E. (2024). Title of the article. Journal of Dairy Science, 107(3), 1500–1512.\n\nمقال علمي — Vancouver:\nBennett RM, Perrett E. Title of the article. J Dairy Sci. 2024;107(3):1500-12.\n\nكتاب — APA:\nRadostits, O. M., Gay, C. C., Hinchcliff, K. W., & Constable, P. D. (2007). Veterinary Medicine (10th ed.). Saunders Elsevier.\n\nقاعدة ذهبية: صيغة واحدة من أول مرجع إلى آخر مرجع، وكل مرجع في القائمة مذكور في المتن.'],
    ['🎤 أخطاء شائعة أمام لجنة المناقشة', '• قراءة العرض حرفيًا من الشرائح بدل الحديث الواثق الموجز.\n• ادعاء نتائج لا تدعمها بياناتك — كن صريحًا مع حدود دراستك.\n• عدم معرفة سبب اختيارك للطرق والإحصاء المستعمل.\n• إهمال التدقيق اللغوي وتنسيق المراجع — أول ما تلاحظه اللجنة.\n• حضّر إجابات عن: لماذا هذا الموضوع؟ ما الجديد في دراستك؟ ما حدودها؟'],
    ['📝 نموذج تصريح باستخدام الذكاء الاصطناعي (انسخه وعدّله)', 'أصرّح أنا الطالب(ة) …………………… أنني استعنت بأدوات الذكاء الاصطناعي (مساعد مذكرات VetAI) في: توليد الهيكل الأولي، واقتراح صياغات، وتلخيص بعض المراجع، والمراجعة اللغوية. وأن صياغة الأفكار والتحليل والنتائج والمناقشة في هذه المذكرة من عملي الشخصي، وقد تحققت من صحة كل معلومة من مصادرها الأصلية.']
  ];
  var CHIPS = ['كيف أصيغ إشكالية مذكرتي؟', 'ما الفرق بين الهدف والفرضية؟', 'نسّق لي مرجعًا بصيغة APA', 'كيف أكتب المواد والطرق لدراسة ميدانية؟', 'نصائح للتحضير لمناقشة المذكرة', 'كيف أختار عينة دراستي وحجمها؟'];

  function init() {
    var host = document.getElementById('view-thesis');
    if (!host || host.dataset.thInit) return;
    host.dataset.thInit = '1';
    var st = document.createElement('style');
    st.textContent = CSS;
    host.appendChild(st);
    var div = document.createElement('div');
    div.innerHTML = shell();
    host.appendChild(div);

    var guides = document.getElementById('th-guides');
    guides.innerHTML = '<h3 style="color:#22d3ee;font-weight:900;font-size:18px;margin:18px 0 4px">📖 3) أدلة المنهجية والتنسيق</h3>' +
      GUIDES.map(function (g) {
        return '<details><summary>' + g[0] + '</summary><div class="th-body">' + g[1] + '</div></details>';
      }).join('');

    var chips = document.getElementById('th-chips');
    chips.innerHTML = CHIPS.map(function (c) { return '<button type="button" class="th-chip">' + c + '</button>'; }).join('');
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.th-chip');
      if (b) { document.getElementById('th-q').value = b.textContent; ask(); }
    });

    document.getElementById('th-gen').addEventListener('click', function () {
      document.getElementById('th-out').textContent = buildOutline();
    });
    document.getElementById('th-copy').addEventListener('click', function () {
      var t = document.getElementById('th-out').textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(t);
    });
    document.getElementById('th-print').addEventListener('click', function () {
      var t = document.getElementById('th-out').textContent;
      var w = window.open('', '_blank');
      if (w) {
        w.document.write('<html dir="rtl" lang="ar"><head><title>هيكل مذكرة التخرج</title></head><body style="font-family:sans-serif;line-height:2;padding:24px"><pre style="white-space:pre-wrap;font-family:inherit">' +
          t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre></body></html>');
        w.document.close(); w.focus(); w.print();
      }
    });
    document.getElementById('th-ask').addEventListener('click', ask);
  }

  function ask() {
    var qEl = document.getElementById('th-q');
    var box = document.getElementById('th-answer');
    var q = (qEl.value || '').trim();
    if (!q) { box.style.display = 'block'; box.textContent = 'اكتب سؤالك أولًا، أو اضغط أحد الاقتراحات الجاهزة.'; return; }
    box.style.display = 'block';
    box.textContent = '⏳ المساعد الأكاديمي يفكر…';
    var prompt = 'أنت مساعد أكاديمي متخصص في منهجية البحث العلمي في الطب البيطري، تساعد طالبًا في إعداد مذكرة تخرج جامعية. أجب بالعربية الفصحى إجابة منظمة وعملية وقابلة للتطبيق مباشرة، مع أمثلة قصيرة عند الحاجة. سؤال الطالب: ' + q;
    if (window.VetAIClient && typeof window.VetAIClient.ask === 'function') {
      window.VetAIClient.ask(prompt, { lang: 'ar' }).then(function (res) {
        var ans = '';
        if (typeof res === 'string') ans = res;
        else if (res) ans = res.answer || res.text || res.response || '';
        if (!ans) ans = 'لم تصل إجابة واضحة — حاول إعادة صياغة السؤال.';
        box.textContent = ans;
        if (res && res.citations && window.VetAIClient.renderCitations) {
          var c = document.createElement('div');
          c.innerHTML = window.VetAIClient.renderCitations(res.citations);
          box.appendChild(c);
        }
      }).catch(function () {
        box.textContent = 'تعذّر الوصول إلى المساعد الآن. يمكنك استخدام «المساعد البيطري» في المنصة، أو إعادة المحاولة بعد قليل.';
      });
    } else {
      box.textContent = 'المساعد الذكي غير متاح في هذه اللحظة — جرّب قسم «المساعد البيطري» في المنصة.';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
