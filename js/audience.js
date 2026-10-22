/* Audience cards -> interactive modal (breeder / student / researcher). RTL/LTR safe, i18n-aware. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ul = function (a) { return '<ul>' + a.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; };
  var tb = function (head, rows) { return '<div class="aud-tw"><table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return (i ? '<td>' : '<th scope="row">') + c + (i ? '</td>' : '</th>'); }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; };
  var note = function (t, c) { return '<div class="aud-note ' + (c || '') + '">' + t + '</div>'; };
  var faq = function (a) { return a.map(function (x) { return '<details><summary>' + x[0] + '</summary><p>' + x[1] + '</p></details>'; }).join(''); };
  var link = function (u, t) { return '<li><a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + ' ↗</a></li>'; };
  var DZ = ['الجرو (الكلب)', 'الورم/المعدة'];

  var D = {
    breeder: { icon: '🏡', name: 'للمربي', tabs: [
      ['👁️ الأعراض الظاهرة', '<h4>ما الذي تلاحظه بعينك؟</h4>' + ul(['<b>السلوك:</b> خمول، عزلة عن القطيع، رفض الأكل أو الماء، عدم القدرة على الوقوف.', '<b>التنفس:</b> لهاث غير معتاد، سعال، صوت خرخرة، تنفس بفم مفتوح (في الدواجن).', '<b>الجهاز الهضمي:</b> إسهال (أخضر، دموي، أسود)، قيء متكرر، انتفاخ البطن، توقف الاجترار.', '<b>الجلد والشعر:</b> تساقط، حكة، قشور، تورم، جروح تنزّ.', '<b>العينان والأنف:</b> إفرازات، احمرار، عتامة، جفاف الأنف مع حرارة.', '<b>الإنتاج:</b> انخفاض الحليب أو البيض، ضرع ساخن متورم أو لبن متجلط.']) + note('قارن الحيوان المريض بحالته الطبيعية وبباقي القطيع؛ التغير المفاجئ أهم من العَرَض المفرد.')],
      ['🩹 الإسعافات الأولية', '<h4>قبل وصول الطبيب</h4>' + ul(['<b>اعزل</b> الحيوان في مكان نظيف دافئ وهادئ.', '<b>النزيف:</b> اضغط بقطعة قماش نظيفة 5–10 دقائق دون رفعها باستمرار.', '<b>الجروح:</b> اغسل بمحلول ملحي أو ماء نظيف، لا تضع مواد منزلية.', '<b>الحرارة:</b> الطبيعي للكلب والقط 38–39.2°م؛ لا تخفضها بالماء المثلج.', '<b>الجفاف:</b> قدّم ماءً نظيفًا بكميات صغيرة متكررة.', '<b>التسمم:</b> احتفظ بالعبوة أو العينة واتصل فورًا؛ لا تُحفّز القيء دون توجيه الطبيب.']) + note('لا تعطِ أي دواء بشري (باراسيتامول، إيبوبروفين) للحيوانات: قد يكون قاتلًا خاصة للقطط.', 'bad')],
      ['🥗 الوقاية والتغذية', '<h4>وقاية يومية</h4>' + ul(['<b>التلقيح</b> حسب برنامج الطبيب للنوع والعمر والمنطقة.', '<b>مكافحة الطفيليات</b> الداخلية والخارجية بانتظام.', '<b>النظافة:</b> تنظيف الأواني والحظائر، تهوية جيدة، تقليل الازدحام.', '<b>الحجر</b> للحيوانات الجديدة 14–21 يومًا قبل خلطها.', '<b>الماء</b> النظيف المتاح دائمًا.']) + '<h4>التغذية</h4>' + ul(['علف متوازن مناسب للنوع والعمر والحالة الفسيولوجية.', 'تغيير الأعلاف تدريجيًا على 7–10 أيام.', 'تجنب الشوكولاتة والعنب والبصل والثوم للكلاب والقطط.', 'تأكد من شرب العجول والحملان اللبأ في الساعات الأولى.'])],
      ['🚨 علامات الخطر', '<h4>اتصل بالطبيب البيطري فورًا إذا ظهر:</h4>' + ul(['صعوبة تنفس أو لون أزرق/شاحب للغشاء المخاطي.', 'تشنجات أو فقدان وعي أو شلل مفاجئ.', 'نزيف لا يتوقف أو قيء/إسهال دموي.', 'انتفاخ بطن حاد مع ألم أو محاولة قيء عقيمة (خاصة الكلاب الكبيرة).', 'تعثر الولادة أكثر من ساعتين من الطلق القوي.', 'عدم التبول 24 ساعة (خاصة القطط الذكور).', 'نفوق متعدد في القطيع أو الدواجن خلال أيام قليلة.', 'الاشتباه بتسمم أو لدغة أو حادث.']) + note('الأمراض المشتركة (كالسعار والبروسيلا) تستدعي الإبلاغ وعدم لمس الحيوان دون حماية.', 'bad')],
      ['❓ أسئلة شائعة', faq([['كم مرة أزور الطبيب البيطري؟', 'مرة سنويًا على الأقل للفحص الدوري، وأكثر للصغار والمسنين والحيوانات الحوامل.'], ['هل أستطيع علاج حيواني بنفسي؟', 'الإسعاف الأولي نعم؛ أما المضادات الحيوية وغيرها فتحتاج تشخيصًا، والاستخدام العشوائي يصنع مقاومة.'], ['متى أبدأ تلقيح الجرو؟', 'عادةً من عمر 6–8 أسابيع بجرعات متتالية حسب برنامج الطبيب.'], ['حيواني لا يأكل منذ يوم، هل أقلق؟', 'في الصغار والقطط أكثر من 24 ساعة يستدعي الاتصال؛ وفي الكبار راقب النشاط والحرارة.'], ['هل الحليب واللحم آمنان أثناء العلاج؟', 'لا، يجب احترام فترة السحب المكتوبة على الدواء.']])] ] },
    student: { icon: '🎓', name: 'لطالب الطب البيطري', tabs: [] },
    researcher: { icon: '🔬', name: 'للباحث والطبيب', tabs: [] }
  };
  var DIS = ['<i>Parvovirus (CPV-2)</i> — كلاب', 'التهاب الضرع — أبقار', 'نيوكاسل (<i>NDV</i>) — دواجن'];
  var S = function (h, rows) { return tb(['المرض', h], rows.map(function (t, i) { return [DIS[i], t]; })); };
  D.student.tabs = [
    ['🧫 Etiology', S('المسبب المرضي', ['<i>Carnivore protoparvovirus 1</i>؛ فيروس DNA أحادي الخيط عارٍ شديد المقاومة بيئيًا.', '<i>Staph. aureus</i>, <i>Strep. agalactiae</i>, <i>Strep. uberis</i>, <i>E. coli</i>, كلبسيلا.', '<i>Avian orthoavulavirus 1</i> (APMV-1)؛ فيروس RNA مغلّف، سلالات ضارية/متوسطة/لطيفة.'])],
    ['⚙️ Pathogenesis', S('الآلية المرضية', ['يستهدف الخلايا سريعة الانقسام: خبايا الأمعاء، نخاع العظم والأنسجة اللمفاوية ← ضمور الخملات، فرط نزف، قلة كريات.', 'دخول الجراثيم عبر قناة الحلمة ← استعمار ← استجابة التهابية ← زيادة الخلايا الجسدية وتلف النسيج المفرز.', 'انتشار الفيروس بالدم ← ارتباط بمستقبلات حمض السياليك ← أضرار هضمية وعصبية وتنفسية؛ ارتفاع النفوق.'])],
    ['🩺 العلامات السريرية', S('العلامات السريرية', ['قيء، إسهال نزفي، خمول، جفاف، حمى أو انخفاض حرارة، التهاب عضل القلب في الجراء الصغيرة.', 'ضرع متورم ساخن، حليب متجلط أو مائي، حمى وفقدان شهية في الحاد، وإصابة تحت سريرية.', 'ضيق تنفس، إسهال أخضر، التواء رقبة، شلل، انخفاض إنتاج البيض، نفوق مرتفع.'])],
    ['🧪 التشخيص المخبري', S('Laboratory Diagnostics', ['اختبار مستضد في البراز (ELISA/سريع)، PCR، تعداد دم (قلة كريات بيض)، HI.', 'اختبار CMT، عد الخلايا الجسدية (SCC)، زرع واختبار الحساسية للمضادات.', 'RT-PCR، عزل الفيروس في بيض مُخصّب، HI، فهرس العزل (ICPI).'])],
    ['⚖️ التشخيص التفريقي', S('Differential Diagnosis', ['فيروس كورونا المعوي، الأجسام الغريبة، الديدان، التسمم، التهاب البنكرياس.', 'جروح الحلمة، التهاب الضرع البيئي، التسمم، الجمرة الخبيثة (في الأشكال الحادة).', 'إنفلونزا الطيور، التهاب القصبات المعدي، جدري الطيور، الكوليرا.'])],
    ['💊 العلاج', S('أبرز الخيارات', ['علاج داعم: سوائل وريدية، مضادات قيء، تغذية مبكرة، مضادات حيوية لمنع العدوى الثانوية، تلقيح وقائي.', 'مضادات حيوية بحسب الحساسية، مضادات التهاب، حلب متكرر، تحسين الصحة والحلب.', 'لا علاج نوعي؛ وقاية بالتلقيح، أمن حيوي، تطبيق الإبلاغ والمكافحة الرسمية.'])] ];
  D.researcher.tabs = [
    ['🧬 الأسماء العلمية', tb(['الاسم الشائع', 'الاسم العلمي'], [['كلب / قط', '<i>Canis lupus familiaris</i> / <i>Felis catus</i>'], ['بقرة', '<i>Bos taurus</i> / <i>Bos indicus</i>'], ['غنم / ماعز', '<i>Ovis aries</i> / <i>Capra hircus</i>'], ['دجاج', '<i>Gallus gallus domesticus</i>'], ['حصان / جمل', '<i>Equus ferus caballus</i> / <i>Camelus dromedarius</i>'], ['بروسيلا', '<i>Brucella abortus, B. melitensis</i>'], ['السعار', '<i>Rabies lyssavirus</i>']])],
    ['💉 الجرعات المرجعية', note('للمختصين فقط وعلى سبيل المراجعة: تحقق دائمًا من نشرة المنتج والمرجع المعتمد وتاريخ المريض (الوزن، الكلى، الكبد، السلالة) قبل الاستعمال.', 'bad') + tb(['الدواء', 'النوع', 'الجرعة المرجعية الشائعة'], [['أموكسيسيلين/كلافولانات', 'كلاب/قطط', '12.5–25 ملغ/كغ فمويًا كل 12 ساعة'], ['دوكسيسيكلين', 'كلاب', '5 ملغ/كغ كل 12 ساعة (أو 10 ملغ/كغ كل 24 ساعة)'], ['ميلوكسيكام', 'كلاب', '0.2 ملغ/كغ أول يوم ثم 0.1 ملغ/كغ كل 24 ساعة (حسب النشرة)'], ['فينبندازول', 'كلاب', '50 ملغ/كغ كل 24 ساعة لمدة 3 أيام'], ['إيفرمكتين (وقاية ديدان القلب)', 'كلاب', '6 ميكروغرام/كغ شهريًا؛ احذر سلالات MDR1']])],
    ['⚠️ التداخلات الدوائية', ul(['<b>NSAIDs + كورتيكوستيرويدات:</b> خطر قرحة وثقب هضمي؛ يُفصل بينهما أيام.', '<b>NSAIDs + مثبطات ACE / مدرّات:</b> خطر تأذي كلوي، خاصة مع الجفاف.', '<b>فلوروكينولونات / تتراسيكلينات + كالسيوم، حديد، ألمنيوم:</b> ترسّب (Chelation) وانخفاض الامتصاص.', '<b>إيفرمكتين + مثبطات P-gp (كيتوكونازول):</b> زيادة السمية العصبية، خاصة في MDR1.', '<b>الأمينوغليكوزيدات + مدرّات الحلقة:</b> زيادة سمية الكلى والأذن.', '<b>فينوباربيتال:</b> يحفّز إنزيمات الكبد فيغيّر مستويات أدوية أخرى.'])],
    ['⏳ فترات السحب', note('تختلف فترة السحب حسب المنتج والتركيب والبلد؛ المرجع الوحيد هو نشرة المنتج والتشريع المحلي (الجزائر، الاتحاد الأوروبي، Codex).') + tb(['الحالة', 'قاعدة عامة (الاتحاد الأوروبي، قاعدة Cascade)'], [['اللحم والأحشاء', '28 يومًا كحد أدنى إذا لم يُحدَّد'], ['الحليب', '7 أيام كحد أدنى إذا لم يُحدَّد'], ['البيض', '7 أيام كحد أدنى إذا لم يُحدَّد'], ['الدواجن الدقيقة (النحل/الأسماك)', 'قواعد خاصة حسب المنتج']])],
    ['🛡️ الضبط الوبائي', ul(['<b>الترصد:</b> أخذ عينات منتظم، تحليل البيانات، نظام إنذار مبكر.', '<b>الإبلاغ:</b> الإخطار الفوري للأمراض واجبة الإبلاغ (WOAH).', '<b>الحجر وتقييد الحركة:</b> مناطق عزل وحجر ومراقبة الأسواق والنقل.', '<b>التلقيح:</b> شامل أو حلقي (Ring vaccination) حسب المرض.', '<b>الاختبار والإعدام (Test-and-slaughter):</b> كمكافحة البروسيلا والسل.', '<b>الأمن الحيوي:</b> التطهير، إدارة الجثث، مكافحة النواقل.', '<b>One Health:</b> تنسيق الطب البيطري والبشري والبيئة.'])],
    ['📚 المراجع', '<ul class="aud-links">' + [link('https://pubmed.ncbi.nlm.nih.gov/', 'PubMed — الأدبيات المحكّمة'), link('https://www.woah.org/en/what-we-do/standards/codes-and-manuals/terrestrial-manual-online-access/', 'WOAH Terrestrial Manual'), link('https://www.merckvetmanual.com/', 'Merck Veterinary Manual'), link('https://wsava.org/global-guidelines/', 'WSAVA Global Guidelines'), link('https://www.acvim.org/consensus-statements', 'ACVIM Consensus Statements'), link('https://www.fao.org/animal-health/en', 'FAO — Animal Health')].join('') + '</ul>' + note('هذه بوابات مرجعية رسمية؛ ابحث فيها عن آخر الدراسات حول المرض الذي تهتم به.')]
  ];


  /* ---- "🆕 الجديد" tab fed by data/*.json (written daily by agents/run_agents.py) ---- */
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var safeUrl = function (u) { return /^https?:\/\//i.test(u || '') ? esc(u) : ''; };
  function renderFeed(a) {
    return note('محتوى يُحدَّث يوميًا تلقائيًا بالذكاء الاصطناعي ولم يُراجَع طبيًا؛ ارجع للمصدر الأصلي.') + a.slice(0, 20).map(function (x) {
      var body = x.body ? '<p>' + esc(x.body).split(/\n\s*\n/).join('</p><p>') + '</p>' : '';
      return '<details><summary>' + esc(x.title) + '</summary><p>' + esc(x.summary) + '</p>' + body +
        '<p><small>' + esc(x.category || '') + (x.journal ? ' · ' + esc(x.journal) : '') + (x.meta ? ' · ' + esc(x.meta) : '') + ' · ' + esc((x.added || '').slice(0, 10)) + '</small>' +
        (safeUrl(x.url) ? ' <a href="' + safeUrl(x.url) + '" target="_blank" rel="noopener noreferrer">المصدر ↗</a>' : '') + '</p></details>';
    }).join('');
  }
  function loadFeeds() {
    [['breeder', 'breeders'], ['student', 'students'], ['researcher', 'researchers']].forEach(function (p) {
      fetch('data/' + p[1] + '.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (a) {
        if (!a.length) return; D[p[0]].tabs.unshift(['🆕 الجديد', renderFeed(a)]);
        if (ov && !ov.hidden && cur === p[0]) show(cur, tab + 1);
      }).catch(function () {});
    });
  }


  /* ---- disease library (data in diseases.js) ---- */
  var dsel = 0;
  var li = function (a) { return ul(a); };
  function diseaseView(kind) {
    var L = window.VET_DISEASES || []; if (!L.length) return '';
    var d = L[dsel] || L[0];
    var h = '<div class="aud-chips">' + L.map(function (x, i) { return '<button type="button" class="aud-chip" data-d="' + i + '" aria-pressed="' + (i === dsel) + '">' + x.name + '</button>'; }).join('') + '</div>';
    h += '<h4>' + d.name + '</h4><p class="aud-meta">' + d.sci + ' · 🐾 ' + d.sp + (d.zoo ? ' · ⚠️ مشترك مع الإنسان' : '') + (d.rep ? ' · 📢 واجب الإبلاغ' : '') + '</p>';
    if (kind === 'breeder') {
      h += '<h4>👁️ ماذا ترى؟</h4>' + li(d.b.signs) + '<h4>🩹 ماذا تفعل الآن؟</h4>' + li(d.b.first) + '<h4>🛡️ الوقاية</h4>' + li(d.b.prev) + note('<b>🚨 اتصل بالطبيب فورًا:</b>' + li(d.b.danger), 'bad');
    } else if (kind === 'student') {
      var S = d.s, rows = [['Etiology — المسبب', S.eti], ['Pathogenesis — الآلية', S.path], ['Clinical signs — العلامات', S.signs], ['Lab diagnostics — التشخيص المخبري', S.lab], ['DDx — التفريقي', S.ddx], ['Treatment — العلاج', S.tx]];
      h += tb(['المحور', 'الملخص'], rows);
    } else {
      h += '<h4>🛡️ الضبط والسيطرة</h4>' + li(d.r.ctrl) + '<h4>📝 ملاحظات علمية</h4>' + li(d.r.notes) +
        '<h4>📚 المراجع</h4><ul class="aud-links">' + d.r.refs.map(function (r) { return link(r[0], r[1]); }).join('') + link('https://pubmed.ncbi.nlm.nih.gov/?term=' + encodeURIComponent(d.en), 'PubMed — أحدث الأبحاث') + '</ul>' +
        note('لا جرعات هنا عمدًا: ارجع لنشرة المنتج والمرجع الدوائي المعتمد.');
    }
    return h;
  }

  var order = ['breeder', 'student', 'researcher'], cur = 'breeder', tab = 0, opener = null, ov;
  function build() {
    ov = document.createElement('div'); ov.className = 'aud-ov'; ov.hidden = true;
    ov.innerHTML = '<div class="aud-dlg" role="dialog" aria-modal="true" aria-labelledby="aud-ttl"><div class="aud-hd"><div class="aud-seg" role="tablist"></div><button type="button" class="aud-x" aria-label="إغلاق">✕</button></div><h3 id="aud-ttl"></h3><div class="aud-sub" role="tablist"></div><div class="aud-body" tabindex="0"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.aud-x')) close(); });
    $('.aud-seg', ov).innerHTML = order.map(function (k) { return '<button type="button" role="tab" data-k="' + k + '">' + D[k].icon + ' ' + D[k].name + '</button>'; }).join('');
    $('.aud-seg', ov).onclick = function (e) { var b = e.target.closest('button'); if (b) show(b.dataset.k, 0); };
    ov.addEventListener('click', function (e) { var c = e.target.closest('.aud-chip'); if (c) { dsel = +c.dataset.d; show(cur, tab); } });
    $('.aud-sub', ov).onclick = function (e) { var b = e.target.closest('button'); if (b) show(cur, +b.dataset.i); };
    document.addEventListener('keydown', function (e) {
      if (ov.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { var f = ov.querySelectorAll('button,a,summary,[tabindex="0"]'); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); } }
    });
  }
  function show(k, i) {
    cur = k; tab = i; var d = D[k];
    $('#aud-ttl', ov).textContent = d.icon + ' ' + d.name;
    ov.querySelectorAll('.aud-seg button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.k === k); });
    $('.aud-sub', ov).innerHTML = d.tabs.map(function (t, j) { return '<button type="button" role="tab" data-i="' + j + '" aria-selected="' + (j === i) + '">' + t[0] + '</button>'; }).join('');
    var b = $('.aud-body', ov); var c = d.tabs[i][1]; b.innerHTML = typeof c === 'function' ? c() : c; b.scrollTop = 0; b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
  }
  function open(k, el) {
    if (!ov) build(); opener = el; ov.hidden = false; show(k, 0);
    requestAnimationFrame(function () { ov.classList.add('on'); $('.aud-x', ov).focus(); });
    document.documentElement.classList.add('aud-lock');
  }
  function close() {
    ov.classList.remove('on'); document.documentElement.classList.remove('aud-lock');
    setTimeout(function () { ov.hidden = true; }, 220); if (opener) opener.focus();
  }
  function init() {
    if (window.VET_DISEASES) order.forEach(function (k) { D[k].tabs.unshift(['🦠 الأمراض', function () { return diseaseView(k); }]); });
    loadFeeds();
    var cards = document.querySelectorAll('.tri .card');
    cards.forEach(function (c, i) {
      var k = order[i]; if (!k) return;
      c.setAttribute('role', 'button'); c.tabIndex = 0; c.classList.add('aud-card');
      c.setAttribute('aria-haspopup', 'dialog');
      c.addEventListener('click', function () { open(k, c); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(k, c); } });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
