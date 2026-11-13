/* ============================================================
   VetAI v40 — 3D Overdrive Enhancer
   يرقّي عارضات النماذج ثلاثية الأبعاد القائمة دون تغيير أي هيكل
   أو ألوان أو خطوط: نماذج محلية مضغوطة، واقع معزز AR، نقاط
   تعليمية تشريحية، رقائق حركات، إضاءة بيئية، وأصوات موثّقة.
   Fail-safe: أي خطأ يترك الوحدة الأصلية تعمل كما هي.
   ============================================================ */
(function () {
  'use strict';
  var BASE = 'assets/3d/';
  var ENV = BASE + 'env-sky.hdr';

  /* ---------- خريطة المصادر البعيدة -> ملفات محلية مضغوطة ---------- */
  var LOCAL = {
    'threejs.org/examples/models/gltf/Horse.glb': 'horse',
    'KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb': 'fox',
    'threejs.org/examples/models/gltf/Parrot.glb': 'parrot',
    'threejs.org/examples/models/gltf/Flamingo.glb': 'flamingo',
    'threejs.org/examples/models/gltf/Stork.glb': 'stork',
    'KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb': 'duck',
    'animals_pack/ShibaInu.glb': 'dog',
    'animals_pack/Cow.glb': 'cow',
    'cute_fish_pack/Goldfish.glb': 'goldfish',
    '67f5e3fe-37ee-4c86-95c8-d269d8c9f8ba.glb': 'cat',
    'd42145b6-ae20-48cd-ba36-63b03f901c32.glb': 'sheep',
    '9ba093a4-6525-4f3b-927d-98dca72e1e40.glb': 'hen',
    '8a01980e-f9cd-47c2-97b0-bad9b131ef6f.glb': 'rabbit'
  };
  /* مفتاح المسرح (حسب اسم الملف المحلي) */
  var THEATER_KEY = { dog: 'dog', cat: 'cat', horse: 'horse', cow: 'cow', sheep: 'sheep', hen: 'hen', rabbit: 'exotic', goldfish: 'fish' };

  /* ---------- الأصوات الموثّقة (ويكيميديا كومنز) ---------- */
  var SOUND = {
    horse: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Wiehern.ogg',
    duck: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Pekin_duck_%26_mallard.ogg',
    wolf: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Wolf_howls.ogg'
  };
  var SOUND_LABEL = { horse: 'اسمع صهيل الحصان', duck: 'اسمع صوت البط', wolf: 'اسمع عواء الذئب' };

  /* ---------- النقاط التعليمية: [الموقع, الاتجاه, العنوان, المعلومة] ---------- */
  var HOT = {
    horse: [
      ['0 168 118', '0 0.3 1', 'الأسنان والفم', 'تُقدَّر أعمار الخيول من أسنانها؛ والفحص السنوي للفم يكشف الأنياب الذئبية وحواف الأسنان الحادة التي تجرح الخدّ وتعيق اللجام.'],
      ['27 108 28', '1 0 0.2', 'القلب', 'نبض الحصان في الراحة ٢٨–٤٤ نبضة/دقيقة؛ يُسمع القلب خلف المرفق الأيسر مباشرة، وأي لغط أو عدم انتظام يستدعي فحصًا بيطريًا.'],
      ['14 10 92', '0.3 -0.3 1', 'الحافر', 'حرارة الحافر الزائدة أو نبض رقمي قوي علامتان مبكرتان لالتهاب الصفائح (اللامينيتس) — حالة مؤلمة تستدعي التدخل الفوري.'],
      ['0 140 -165', '0 0.4 -1', 'الكفل والذيل', 'الذيل يطرد الذباب ويحمي المنطقة الخلفية؛ وفركه المستمر بالجدران قد يدل على ديدان دبوسية أو حساسية جلدية.']
    ],
    fox: [
      ['0 68 40', '0 0.4 1', 'السمع الحاد', 'يلتقط الثعلب أصواتًا خافتة جدًا تحت الثلج والتراب؛ أذناه الكبيرتان تعملان كهوائيين يحددان موقع الفريسة قبل الانقضاض عليها بقفزة قوسية دقيقة.'],
      ['0 47 14', '0.5 0 0.8', 'تنبيه صحي: السعار', 'الثعالب من أهم ناقلي داء السعار في الطبيعة؛ لا تقترب من ثعلب بري يبدو أليفًا أو مترنحًا، وأبلغ الجهات البيطرية — فالوقاية خير من علاج مستحيل بعد ظهور الأعراض.'],
      ['0 30 -63', '0 0.2 -1', 'الذيل الكثيف', 'ذيل الثعلب الطويل الكثيف يوازنه في الجري والقفز، ويلفّه حول جسمه وأنفه في الشتاء كغطاء دافئ أثناء النوم.']
    ],
    parrot: [
      ['0 9 21', '0 0.3 1', 'المنقار', 'منقار الببغاء ينمو باستمرار ويُصقل بالاحتكاك والأكل؛ النمو الزائد أو التشقق قد يدل على مرض في الكبد أو نقص تغذية ويحتاج عناية بيطرية حذرة.'],
      ['30 6 -4', '1 0.3 0', 'الجناح والريش', 'نتف الريش عند الببغاوات الأليفة غالبًا علامة ملل أو توتر أو مرض جلدي، وليس «مزاجًا سيئًا»؛ راقب البيئة والغذاء وراجع الطبيب إن استمر.'],
      ['0 -4 -68', '0 0 -1', 'الذيل الطويل', 'ريش الذيل الطويل يوازن الببغاء في الطيران والجلوس؛ وانكسار ريشة دموية نازفة يستدعي إمساك الطائر بهدوء ومراجعة الطبيب.']
    ],
    flamingo: [
      ['0 9 95', '0 0.3 1', 'منقار الترشيح', 'يأكل الفلامنغو ورأسه مقلوب: منقاره المصمم كمنخل يرشّح الطحالب والقشريات الصغيرة من الماء، ولسانه الكبير يعمل كمضخة.'],
      ['0 -6 55', '0.4 0 0.8', 'الرقبة الطويلة', 'رقبة الفلامنغو تحمل فقرات عديدة تمنحها مرونة فائقة للبحث في الماء؛ وخمول الرقبة وتدلّيها علامة ضعف تستدعي الانتباه.'],
      ['0 -66 -52', '0 -0.3 -1', '«الركبة» هي كاحل', 'ما يبدو كركبة تنحني للخلف هو في الحقيقة مفصل الكاحل؛ ركبة الفلامنغو الحقيقية مخفية داخل الجسم قرب البطن.']
    ],
    stork: [
      ['0 19 84', '0 0.3 1', 'طقطقة المنقار', 'اللقلق شبه أبكم: لا يُصدر أغاني، بل يتواصل بطقطقة منقاره السريعة، وتزداد عند العش في التحية وطلب الطعام.'],
      ['62 14 2', '1 0.2 0', 'جناحان للتحليق', 'باع جناحي اللقلق الأبيض يقارب المترين؛ يعبر بهما من أوروبا إلى إفريقيا معتمدًا على التيارات الحارة الصاعدة دون رفرفة تُذكر.'],
      ['0 -3 -70', '0 0 -1', 'تبريد بالساقين', 'في الحر يفرز اللقلق فضلاته على ساقيه؛ تبخّرها يبرّد الدم المار فيهما — خدعة تبريد طبيعية تبيّض لون الساقين.']
    ],
    duck: [
      ['0 1.52 -0.48', '0 0.3 -1', 'منقار بمصافٍ', 'على جانبي منقار البط صفائح دقيقة (لاميلات) ترشّح الطعام من الماء، وطرف المنقار غني بنهايات لمسية تجعله «يدًا» حساسة للبحث في الطين.'],
      ['0.3 0.85 -0.12', '1 0 0', 'الصدر وحالة الجسم', 'حالة البط الصحية تُقرأ من عظمة الصدر: بروزها الحاد يعني هزالًا؛ والبط السليم نشيط بعيون صافية وريش مرتب مقاوم للماء.'],
      ['0.18 0.07 -0.02', '0.4 -0.6 0.6', 'التهاب باطن القدم', '«بامبل فوت» التهاب بكتيري في باطن القدم شائع عند البط المربّى على أرضيات صلبة أو متسخة؛ العرج أو تورّم القدم علامة تستدعي العلاج المبكر.']
    ],
    wolf: [
      ['0 2.2 2.05', '0 0.3 1', 'أنياب وشمّ خارق', 'حاسة شم الذئب أقوى من شمّنا بنحو مئة مرة، وفكّاه يولّدان ضغط عضّ هائلًا؛ الذئب هو السلف البري الذي انحدرت منه كل سلالات الكلاب.'],
      ['0.3 1.25 0.55', '1 0 0.2', 'قلب عدّاء', 'الذئاب عدّاءة مسافات: تقطع عشرات الكيلومترات يوميًا خلف الفرائس؛ قلبها ورئتاها مهيّأة لتحمّل طويل يشبه كلاب الزلاقات.'],
      ['0 1.55 -2.75', '0 0.3 -1', 'ذيل بلا انحناءة', 'ذيل الذئب مستقيم دائمًا ولا ينحني فوق ظهره كذيل الكلب — علامة فارقة بينهما، ولغة جسد كاملة داخل القطيع.']
    ],
    husky: [
      ['0.32 3.06 1.82', '0.4 0.5 0.7', 'أذنان مثلثتان', 'أذنا الهاسكي المنتصبتان المثلثتان مغلّفتان بفراء كثيف يحميهما من الصقيع؛ راقب حكّ الأذن المستمر فهو أول علامات التهابها.'],
      ['0.36 1.95 -0.35', '1 0.3 0', 'معطف مزدوج لا يُحلق', 'للهاسكي طبقتان: سفلية عازلة وعليا واقية؛ حلق المعطف صيفًا يضرّه لأنه يفقد عزله من الحر والبرد معًا ويعرّضه لحروق الشمس.'],
      ['0.3 0.24 1.05', '0.4 -0.4 0.8', 'أقدام الثلج', 'أقدام الهاسكي واسعة مفرّشة كأحذية الثلج توزّع الوزن على الجليد، وأوعيتها مرتبة لتبقى دافئة دون تجمّد في أبرد الظروف.']
    ],
    deer: [
      ['0.5 4.18 1.66', '0.5 0.6 0.4', 'قرون تتجدد كل عام', 'قرون الأيل عظم حيّ ينمو مغطّى بـ«المخمل» الغني بالدم، ثم يسقط ويتجدد سنويًا — من أسرع الأنسجة نموًا عند الثدييات.'],
      ['0 3.86 1.92', '0 0.3 1', 'أسنان تحكي العمر', 'يُقدَّر عمر الأيائل والغزلان من تآكل أضراسها؛ وكمجترّات تعتمد على ميكروبات الكرش لهضم الألياف الخشنة.'],
      ['0.42 1.65 0.15', '1 0 0', 'كرش بأربع حجرات', 'معدة الأيل أربع حجرات: يجترّ طعامه مرتين ليستخرج أقصى طاقة من الأعشاب الفقيرة — نظام هضم لا تملكه إلا المجترات.']
    ],
    shark: [
      ['0 0.55 2.05', '0 0.3 1', 'أسنان لا تنفد', 'أسنان القرش تتجدد طوال حياته في صفوف متعاقبة: تسقط سنّ فتتقدّم أخرى مكانها، وقد يبدّل آلاف الأسنان في عمره.'],
      ['1.15 0.25 1.15', '1 0 0.2', 'خياشيم خمسة', 'يتنفس القرش بخمسة شقوق خيشومية في كل جانب؛ وكثير من أنواعه يجب أن يسبح باستمرار ليمرّر الماء المؤكسج عبر خياشيمه.'],
      ['0 2.35 -0.35', '0 1 -0.2', 'الزعنفة الظهرية', 'شكل الزعنفة الظهرية كبصمة الإصبع: يستخدمه الباحثون للتعرّف على أفراد القروش ومتابعتهم سنوات دون لمسهم.']
    ],
    clownfish: [
      ['0.85 0.5 1.5', '0.7 0.3 0.6', 'بيت داخل شقائق النعمان', 'تعيش سمكة المهرّج داخل مجسّات شقائق النعمان اللاسعة محميّة بطبقة مخاطية خاصة — صداقة تبادل منفعة من أشهر قصص البحر.'],
      ['1.25 0.3 -0.35', '1 0 0', 'مجتمع يتبدّل جنسه', 'في مجموعة المهرّج، الأنثى هي الأكبر والأقوى؛ فإذا غابت تحوّل أكبر ذكر إلى أنثى — تبدّل جنسي متسلسل نادر في عالم الأسماك.'],
      ['0.65 -0.1 -2.85', '0.4 0 -1', 'ذيل للمناورة', 'سباحة المهرّج قصيرة متقطعة بين الشعاب؛ ذيله وزعانفه الصدرية مصمّمة للمناورة الدقيقة لا للسرعة في المياه المفتوحة.']
    ],
    trex: [
      ['0 14.3 12.3', '0 0.3 1', 'أقوى عضّة برية', 'فكّ التيرانوصور من أقوى ما عرفته اليابسة: قوة عضّ تُقدَّر بعدة أطنان، وأسنان سميكة بحجم الموز تسحق العظام لا تقطعها فقط.'],
      ['1.95 8.4 4.9', '1 0 0.3', 'ذراعان صغيرتان', 'رغم جمجمته العملاقة، ذراعا التيرانوصور بطول ذراع إنسان تقريبًا وبإصبعين فقط — وما تزال وظيفتهما الدقيقة لغزًا علميًا.'],
      ['1.5 6.8 -11.5', '0.3 0.3 -1', 'ذيل الموازنة', 'ذيله العضلي الثقيل وازن رأسه الضخم فوق وركيه، وجعله عدّاءً رشيقًا نسبة إلى وحش يزن نحو ثمانية أطنان.']
    ],
    triceratops: [
      ['0 7.6 5.7', '0 0.5 0.8', 'الدرع العظمي (الهدبة)', 'الهدبة العظيمة خلف رأسه درع ولوحة عرض معًا: للحماية من أنياب المفترسين، وربما للتباهي وجذب الشريك وتنظيم حرارة الجسم.'],
      ['0 5.5 7.55', '0 0.2 1', 'ثلاثة قرون', 'قرنان طويلان فوق العينين وقرن قصير على الأنف — ومنه جاء اسمه «الوجه ذو القرون الثلاثة»؛ وكانت أسلحته في وجه التيرانوصور نفسه.'],
      ['0 4.65 7.7', '0 -0.1 1', 'منقار ببغائي', 'فمه ينتهي بمنقار عظمي ضيق كمنقار الببغاء، يقتطع به النباتات القاسية ثم تطحنها بطاريات أسنان متجددة في فكيه.']
    ],
    barramundi: [
      ['0.06 0.19 0.245', '0.8 0.3 0.5', 'عين وبصر', 'الباراموندي (قاروص آسيا) مفترس بصري يصطاد عند الشفق؛ وفي الاستزراع تُقرأ عكارة الماء أو إجهاده أولًا من شهيته وحركته قرب السطح.'],
      ['0.07 0.13 0.15', '1 0 0.2', 'خياشيم: مرآة الماء', 'صحة الخياشيم تعكس جودة الماء مباشرة: احمرارها أو مخاطها الزائد إنذار مبكر بنقص الأكسجين أو الأمونيا — أساس الطب الوقائي في استزراع الأسماك.'],
      ['0.07 0.12 -0.04', '1 0 0', 'الخط الجانبي', 'على خاصرته خط جانبي حسّاس يلتقط اهتزازات الماء وضغطه — «حاسة سادسة» يرصد بها الفريسة والخطر في الماء العكر.']
    ],
    dog: [
      ['0.31 2.99 1.9', '0.4 0.5 0.7', 'الأذنان: أول محطات الفحص', 'التهاب الأذن من أكثر مشكلات الكلاب شيوعًا؛ رائحة كريهة أو حكّ مستمر أو إفراز داكن يعني أن الوقت حان لفحص القناة السمعية.'],
      ['-0.08 2.52 2.26', '0 0.3 1', 'الأسنان واللثة', 'أمراض اللثة تصيب أغلب الكلاب بعد عمر ثلاث سنوات؛ رائحة الفم الكريهة وجير الأسنان الأصفر علامتان لا تنتظرهما.'],
      ['0.42 1.3 0.5', '1 0 0.2', 'القلب والصدر', 'نبض الكلب في الراحة ٦٠–١٤٠ حسب الحجم؛ وأفضل مكان لجسّه شريان الفخذ من الداخل، والسعال الليلي عند الكلاب المسنّة قد يكون قلبيًا.'],
      ['0.33 0.2 1.05', '0.3 -0.5 0.8', 'المخالب والأقدام', 'أظافر طويلة ملتوية تغيّر مشية الكلب وتؤلم مفاصله؛ وبين الأصابع تختبئ القرادات وبذور الأعشاب المسببة للخراجات.']
    ],
    cat: [
      ['0 0.88 0.82', '0 0.4 1', 'الشوارب: رادار القط', 'شوارب القط أعضاء لمس فائقة الحساسية ترسم له خريطة للفراغات في الظلام؛ لا تقصّها أبدًا، وسقوطها الطبيعي يتجدد.'],
      ['0 2.25 -0.88', '0 0.6 -0.6', 'لغة الذيل المرفوع', 'ذيل مرفوع عموديًا = تحية ودودة؛ ذيل منتفخ مع ظهر مقوّس = خوف ودفاع؛ وارتعاش طرف الذيل أثناء التحديق = تركيز الصيّاد.'],
      ['0.26 0.1 0.24', '0.5 -0.4 0.6', 'مخالب قابلة للانكماش', 'مخالب القط تنسحب داخل غمد جلدي فتبقى حادة؛ خدش الأثاث سلوك طبيعي لشحذها وتحديد المنطقة — وفّر عمود خدش بدل العقاب.']
    ],
    cow: [
      ['0 3.92 4.25', '0 0.3 1', 'الرأس والأسنان', 'تُقدَّر أعمار الأبقار من قواطعها الدائمة؛ وقرنا البقرة عظم حيّ مغطّى بقرن — إزالتهما عند العجول الصغيرة أرحم وأسهل من البالغات.'],
      ['0.98 2.7 -0.35', '1 0 0', 'الكرش: مصنع التخمير', 'الكرش في الجهة اليسرى: حجرة تخمير هائلة تعج بالميكروبات التي تهضم الألياف؛ توقّف حركته المنتظمة علامة مرض مهمة.'],
      ['0.35 1.05 -1.65', '0.5 -0.3 -0.6', 'الضرع والتهاب الحلمات', 'التهاب الضرع أكثر أمراض الألبان كلفة؛ حلمة متورمة أو حليب متخثّر يعني فحصًا فوريًا، وغمس الحلمات بعد الحلابة وقاية ذهبية.'],
      ['0 4.08 -2.5', '0 0.4 -1', 'الذيل', 'ذيل البقرة مروحة ذباب دائمة؛ كسره أو تورّمه مؤلم ويؤثر في راحتها وإنتاجها، واهتزازه العصبي المستمر قد ينذر بالألم.']
    ],
    sheep: [
      ['0.32 1.48 -0.05', '1 0.4 0', 'الصوف والجزّ السنوي', 'صوف الغنم ينمو بلا توقف ويُجزّ سنويًا؛ تأخير الجزّ يعرّضها لضربة الحر وذبابة الصوف التي تضع بيوضها في الصوف المتّسخ.'],
      ['0 1.02 1.15', '0 0.3 1', '«فم مكسور» والشيخوخة', 'يُعمَّر الغنم بأسنانه: من «فم كامل» إلى «فم مكسور» حين تتساقط القواطع؛ والأسنان السيئة أول أسباب هزال النعاج المسنّة.'],
      ['0.24 0.12 0.43', '0.4 -0.5 0.7', 'تعفّن القدم', 'العرج عند الغنم غالبًا من القدم: تعفّن بكتيري يزدهر في المراعي الرطبة؛ رفع القدم وفحص ما بين الظلفين أول خطوة دائمًا.']
    ],
    hen: [
      ['0 1.23 -0.02', '0 0.8 0.3', 'العُرف: مقياس صحة', 'عرف أحمر قائم ممتلئ = دجاجة سليمة؛ عرف شاحب منكمش قد يعني أنيميا وطفيليات، وأزرق مائل للبنفسجي ينذر بمشكلة تنفسية.'],
      ['0.16 0.6 0.22', '1 0 0.3', 'وضع البيض', 'الدجاجة الواضعة تضع بيضة كل ٢٥–٢٦ ساعة تقريبًا؛ توقّف الوضع المفاجئ مع خمول يستدعي فحص احتباس البيضة — حالة طارئة حقيقية.'],
      ['0.11 0.06 -0.08', '0.4 -0.6 0.4', 'قشرية الساق', 'حراشف ساق مرتفعة سميكة عند الدجاج تعني غالبًا عثّة الساق القشرية؛ علاجها مبكرًا أسهل بكثير من مراحلها المتقدمة.']
    ],
    exotic: [
      ['0.035 0.3 0.14', '0.3 0.8 0.4', 'أذنا الأرنب: منظّم حرارة', 'أذنا الأرنب الطويلتان مليئتان بالأوعية وتبدّدان حرارة جسمه؛ وداخلهما أول مكان يفحصه الطبيب بحثًا عن عثّة الأذن والقشور.'],
      ['0 0.1 0.28', '0 0.2 1', 'أسنان لا تتوقف عن النمو', 'قواطع الأرنب تنمو طوال حياته ويبليها مضغ التبن الخشن؛ نقص التبن يعني أسنانًا زائدة وجروح فم — التبن أساس غذائه لا ترفًا.'],
      ['0.12 -0.1 -0.15', '0.5 -0.3 -0.7', 'رجلان خلفيتان قويتان', 'عضلات رجلي الأرنب الخلفيتين محرّك قفزه؛ لكن عموده الفقري هشّ نسبيًا — إمساكه الخاطئ وركلته القوية قد يكسر ظهره، فادعمه دائمًا من الخلف.']
    ],
    fish: [
      ['1.25 0.5 1.3', '0.7 0.3 0.6', 'العينان', 'عينا السمكة الذهبية السليمة صافيتان؛ الغبش أو الجحوظ الزائد قد يدل على رداءة الماء أو عدوى بكتيرية.'],
      ['1.35 0.05 0.65', '1 0 0.2', 'الخياشيم', 'غطاء خيشومي يتحرك بانتظام وهدوء = تنفس سليم؛ لهاث عند السطح أو خياشيم متورمة تعني نقص أكسجين أو أمونيا في الحوض.'],
      ['0.75 -0.15 -2.75', '0.4 0 -1', 'الزعانف وتعفّنها', 'حواف زعانف متآكلة = تعفّن زعانف بكتيري يبدأ غالبًا من ماء متّسخ؛ العلاج يبدأ دائمًا بتصحيح الماء قبل أي دواء.']
    ]
  };

  /* ---------- بطاقات شبكة الوسائط الجديدة ---------- */
  var EXTRA = [
    { key: 'wolf', name: 'الذئب الرمادي', fact: 'سلف الكلب البري وعدّاء القطعان؛ يسكن قصص البشر منذ الأزل وما يزال رمزًا للبرية في نصف الكرة الشمالي.', remote: 'https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/animals_pack/Wolf.glb' },
    { key: 'husky', name: 'هاسكي سيبيريا', fact: 'كلب زلّاقات وُلد للبرد والجري الطويل؛ عيناه قد تكونان زرقاوين أو بنيّتين أو مختلفتين — وكلها طبيعية.', remote: 'https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/animals_pack/Husky.glb' },
    { key: 'deer', name: 'الأيل الأحمر', fact: 'ذكر الأيل يبدّل قرنيه كل عام؛ وفي موسم التزاوج يملأ الغابات بخوارٍ يتردّد صداه كيلومترات.', remote: 'https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/animals_pack/Deer.glb' },
    { key: 'shark', name: 'القرش', fact: 'هيكله غضروفي لا عظمي، وجلده مغطّى بحراشف دقيقة كالصنفرة؛ كثير من أنواعه مهدّد ويحتاج حمايتنا لا خوفنا فقط.', remote: 'https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/cute_fish_pack/Shark.glb' },
    { key: 'clownfish', name: 'سمكة المهرّج', fact: 'نجمة الشعاب المرجانية التي تعيش داخل شقائق النعمان اللاسعة دون أن تؤذيها — بفضل مخاط واقٍ خاص.', remote: 'https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/cute_fish_pack/Clownfish.glb' },
    { key: 'trex', name: 'التيرانوصور ركس 🦖', fact: '«الملك السحلية الطاغية»: مفترس العصر الطباشيري الأشهر، بطول يقارب ١٢ مترًا وأقوى عضّة عرفتها اليابسة.', remote: 'https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/dinosaurs_pack/Trex.glb' },
    { key: 'triceratops', name: 'الترايسيراتوبس', fact: 'من آخر الديناصورات العاشبة العظمى: درع عظمي وثلاثة قرون، وخصم التيرانوصور التاريخي في نهاية العصر الطباشيري.', remote: 'https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/dinosaurs_pack/Triceratops.glb' },
    { key: 'barramundi', name: 'سمكة الباراموندي (قاروص آسيا)', fact: 'من أهم أسماك الاستزراع في آسيا وأستراليا — والوحيدة هنا بنموذج ممسوح ضوئيًا بملمس حقيقي فائق التفاصيل كما في المتاحف الرقمية.', remote: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BarramundiFish/glTF-Binary/BarramundiFish.glb' }
  ];

  /* ---------- أنماط العناصر الجديدة فقط (لا تمس أي نمط قائم) ---------- */
  var CSS = [
    '.v40hs{width:26px;height:26px;border-radius:50%;border:2px solid #0f172a;background:#22d3ee;color:#0f172a;font-size:13px;font-weight:900;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 10px rgba(34,211,238,.45);padding:0}',
    '.v40hs:hover,.v40hs:focus{background:#67e8f9;outline:none}',
    '.v40hs.sel{background:#f59e0b}',
    '.v40fact{display:none;margin-top:10px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.35);border-radius:12px;padding:9px 12px;font-size:12px;line-height:1.9;color:#e2e8f0}',
    '.v40fact b{color:#22d3ee;display:block;font-size:12.5px;margin-bottom:2px}',
    '.v40row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}',
    '.v40arbtn{position:absolute;bottom:10px;inset-inline-start:10px;z-index:5}'
  ].join('\n');

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  var headOk = {};
  function localReady(key) {
    if (!headOk[key]) {
      headOk[key] = fetch(BASE + key + '.glb', { method: 'HEAD' }).then(function (r) { return r.ok; }).catch(function () { return false; });
    }
    return headOk[key];
  }

  function keyFromSrc(src) {
    if (!src) return null;
    for (var frag in LOCAL) { if (src.indexOf(frag) >= 0) return LOCAL[frag]; }
    var m = src.match(/assets\/3d\/([a-z]+)\.glb/);
    if (m) return m[1];
    return null;
  }

  /* يضبط سمات العارض الحديثة: AR + إضاءة بيئية + ظلال ناعمة */
  function tuneViewer(mv) {
    try {
      if (!mv.hasAttribute('ar')) mv.setAttribute('ar', '');
      mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
      mv.setAttribute('ar-scale', 'auto');
      if (!mv.hasAttribute('environment-image')) mv.setAttribute('environment-image', ENV);
      mv.setAttribute('exposure', '1.12');
      mv.setAttribute('shadow-softness', '0.85');
      if (!mv.hasAttribute('interaction-prompt')) mv.setAttribute('interaction-prompt', 'auto');
    } catch (e) {}
  }

  /* يبني النقاط التعليمية داخل العارض وسطر المعلومة تحتها */
  function buildHotspots(mv, key, factBox) {
    try {
      mv.querySelectorAll('.v40hs').forEach(function (b) { b.remove(); });
      var list = HOT[key] || [];
      list.forEach(function (h, i) {
        var b = el('button', 'v40hs', String(i + 1));
        b.type = 'button';
        b.setAttribute('slot', 'hotspot-' + (i + 1));
        b.setAttribute('data-position', h[0]);
        b.setAttribute('data-normal', h[1]);
        b.setAttribute('data-visibility-attribute', 'visible');
        b.setAttribute('aria-label', h[2]);
        b.addEventListener('click', function () {
          mv.querySelectorAll('.v40hs').forEach(function (x) { x.classList.toggle('sel', x === b); });
          if (factBox) {
            factBox.innerHTML = '';
            factBox.appendChild(el('b', '', '🔬 ' + h[2]));
            factBox.appendChild(document.createTextNode(h[3]));
            factBox.style.display = 'block';
          }
        });
        mv.appendChild(b);
      });
    } catch (e) {}
  }

  var ANIM_LABELS = [
    ['Idle', 'هدوء 🧘'], ['Survey', 'ترقّب 👀'], ['Walk', 'مشي 🚶'], ['Run', 'ركض 🏃'],
    ['Gallop', 'عدو 🐎'], ['Eating', 'أكل 🌿'], ['Peck', 'نقر 🐔'], ['Swimming', 'سباحة 🏊'],
    ['Jump', 'قفز ⤴️'], ['Fly', 'طيران 🕊️']
  ];

  /* صف التحكم: رقائق الحركات + إيقاف/تشغيل + تدوير + صوت */
  function buildControls(mv, key, mount) {
    var row = el('div', 'v40row');
    var rot = el('button', 'mchip on', '🔄 تدوير');
    rot.type = 'button';
    rot.addEventListener('click', function () {
      if (mv.hasAttribute('auto-rotate')) { mv.removeAttribute('auto-rotate'); rot.classList.remove('on'); }
      else { mv.setAttribute('auto-rotate', ''); rot.classList.add('on'); }
    });
    row.appendChild(rot);
    if (SOUND[key]) {
      var sb = el('button', 'mchip', '🔊 ' + SOUND_LABEL[key]);
      sb.type = 'button';
      var audio = null;
      sb.addEventListener('click', function () {
        try { if (window.__vetaiSoundOn && !window.__vetaiSoundOn()) return; if (audio) audio.pause(); audio = new Audio(SOUND[key]); audio.play(); } catch (e) {}
      });
      row.appendChild(sb);
    }
    mount.appendChild(row);
    function onLoad() {
      try {
        var avail = mv.availableAnimations || [];
        var chosen = [], used = {};
        ANIM_LABELS.forEach(function (w) {
          if (chosen.length >= 4) return;
          for (var i = 0; i < avail.length; i++) {
            var a = avail[i];
            if (!used[a] && a.toLowerCase().indexOf(w[0].toLowerCase()) >= 0 && a.toLowerCase().indexOf('death') < 0 && a.toLowerCase().indexOf('hitreact') < 0 && a.toLowerCase().indexOf('attack') < 0) {
              used[a] = 1; chosen.push({ name: a, label: w[1] }); break;
            }
          }
        });
        if (chosen.length) {
          chosen.forEach(function (c, idx) {
            var b = el('button', 'mchip' + (idx === 0 ? ' on' : ''), c.label);
            b.type = 'button';
            b.addEventListener('click', function () {
              mv.animationName = c.name;
              if (mv.play) mv.play();
              row.querySelectorAll('.mchip').forEach(function (x) { if (x.dataset.anim) x.classList.toggle('on', x === b); });
            });
            b.dataset.anim = '1';
            row.insertBefore(b, rot);
          });
          mv.animationName = chosen[0].name;
          if (mv.play) mv.play();
        } else if (avail.length === 1) {
          var pb = el('button', 'mchip on', '⏸ إيقاف الحركة');
          pb.type = 'button';
          var playing = true;
          pb.addEventListener('click', function () {
            try {
              if (playing) { mv.pause(); pb.textContent = '▶ تشغيل الحركة'; pb.classList.remove('on'); }
              else { mv.play(); pb.textContent = '⏸ إيقاف الحركة'; pb.classList.add('on'); }
              playing = !playing;
            } catch (e) {}
          });
          row.insertBefore(pb, rot);
        }
      } catch (e) {}
    }
    if (mv.loaded) onLoad(); else mv.addEventListener('load', onLoad, { once: true });
  }

  /* ترقية عارض واحد داخل بطاقة شبكة */
  function enhanceCard(mv) {
    if (!mv || mv.dataset.v40) return;
    var src = mv.getAttribute('src') || '';
    var key = keyFromSrc(src);
    if (!key) return;
    mv.dataset.v40 = '1';
    tuneViewer(mv);
    var card = mv.parentElement;
    var factBox = el('div', 'v40fact');
    if (card) card.appendChild(factBox);
    buildHotspots(mv, key, factBox);
    if (card) buildControls(mv, key, card);
    localReady(key).then(function (ok) {
      if (ok && mv.getAttribute('src') === src) mv.setAttribute('src', BASE + key + '.glb');
    });
  }

  /* ---------- شبكة الوسائط: مراقبة البطاقات + إضافة الأنواع الجديدة ---------- */
  function buildExtraCard(item, grid) {
    var card = el('div', 'rounded-2xl glass-panel p-4');
    var mv = document.createElement('model-viewer');
    mv.setAttribute('camera-controls', ''); mv.setAttribute('auto-rotate', '');
    mv.setAttribute('shadow-intensity', '1'); mv.setAttribute('loading', 'lazy');
    mv.setAttribute('autoplay', '');
    mv.setAttribute('alt', 'نموذج ثلاثي الأبعاد: ' + item.name);
    mv.className = 'mv3d';
    mv.dataset.v40 = '1'; mv.dataset.v40key = item.key;
    card.appendChild(mv);
    card.appendChild(el('div', 'font-black mt-3', '🦴 ' + item.name));
    card.appendChild(el('p', 'text-xs text-slate-400 mt-1 leading-relaxed', item.fact));
    card.appendChild(el('p', 'text-[10px] text-slate-500 mt-2', 'اسحب للتدوير · قرّب للتكبير · اضغط النقاط المرقّمة'));
    var factBox = el('div', 'v40fact');
    card.appendChild(factBox);
    grid.appendChild(card);
    tuneViewer(mv);
    buildHotspots(mv, item.key, factBox);
    buildControls(mv, item.key, card);
    localReady(item.key).then(function (ok) {
      mv.setAttribute('src', ok ? BASE + item.key + '.glb' : item.remote);
    });
  }

  var extraDone = false;
  function watchGrid() {
    var grid = document.getElementById('mv3dGrid');
    if (!grid) return;
    var scan = function () { grid.querySelectorAll('model-viewer').forEach(enhanceCard); };
    scan();
    var mo = new MutationObserver(scan);
    mo.observe(grid, { childList: true });
    var iv = setInterval(function () {
      scan();
      if (!extraDone && grid.children.length >= 6) {
        extraDone = true;
        EXTRA.forEach(function (item) { buildExtraCard(item, grid); });
        var note = el('p', 'text-[10px] text-slate-500 mt-3', 'النماذج الإضافية: Quaternius (CC0) ونموذج الباراموندي من Khronos Group — تُحمّل كل النماذج الآن من خوادم المنصة نفسها مضغوطةً لحماية أصحاب الهواتف الضعيفة.');
        grid.parentElement && grid.parentElement.appendChild(note);
        clearInterval(iv);
      }
    }, 600);
    setTimeout(function () { clearInterval(iv); }, 60000);
  }

  /* ---------- مسرح «من هو مريضك؟»: ترقية العارض وتبديل النقاط مع كل نوع ---------- */
  function watchStage() {
    var stage = document.getElementById('psStage');
    if (!stage) return;
    var state = { mv: null, key: null, swapping: false };
    function applyKey(mv, key) {
      if (!key || state.key === key) return;
      state.key = key;
      var panel = document.getElementById('patientShow');
      var factBox = panel ? panel.querySelector('.v40fact') : null;
      if (!factBox && panel) {
        factBox = el('div', 'v40fact');
        var chips = document.getElementById('psChips');
        if (chips && chips.parentElement) chips.parentElement.insertBefore(factBox, chips.nextSibling);
      }
      buildHotspots(mv, key === 'exotic' ? 'exotic' : key, factBox);
    }
    function onSrc(mv) {
      if (state.swapping) return;
      var src = mv.getAttribute('src') || '';
      var key = keyFromSrc(src);
      if (!key) return;
      var tkey = THEATER_KEY[key];
      tuneViewer(mv);
      if (tkey) applyKey(mv, tkey);
      localReady(key).then(function (ok) {
        if (ok && (mv.getAttribute('src') || '') === src) {
          state.swapping = true;
          mv.setAttribute('src', BASE + key + '.glb');
          setTimeout(function () { state.swapping = false; }, 50);
        }
      });
    }
    function bind(mv) {
      if (!mv || state.mv === mv) return;
      state.mv = mv; state.key = null;
      var ao = new MutationObserver(function () { onSrc(mv); });
      ao.observe(mv, { attributes: true, attributeFilter: ['src'] });
      onSrc(mv);
    }
    var existing = stage.querySelector('model-viewer');
    if (existing) bind(existing);
    var mo = new MutationObserver(function () {
      var mv = stage.querySelector('model-viewer');
      if (mv) bind(mv);
    });
    mo.observe(stage, { childList: true, subtree: true });
  }

  function init() {
    try {
      var st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
    watchGrid();
    watchStage();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
