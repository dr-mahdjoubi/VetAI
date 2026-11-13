/* VetAI v45 — Wave A: Diagnostic Guidance Engine (triage & education, NOT a diagnosis)
   Pure on-device engine. Unifies: Diseases Atlas (600) + Differential Pathways (26).
   Method (transparent, auditable — no black box):
     score(disease) = Σ_concept IDF(concept) × match(concept, signs)
                    + pathwayBonus (chief-complaint pathway rank)
                    + signalmentPrior (age-group tokens)
   Reasons for every rank are returned with the result. Red-flag gate runs FIRST:
   any red flag => emergency escalation precedes the candidate list.
   Data fields (atlas): n name_ar, e name_en, a cause, s signs, d diagnosis,
   t treatment(strategy), p prevention, c category, z zoonotic, u emergency.
*/
'use strict';

/* ---------- Arabic-aware text normalization ---------- */
function normTxt(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670]/g, '')      // diacritics
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- Symptom concept lexicon ----------
   Each concept: id, ar/en labels for the UI, and keyword variants searched
   (after normalization) inside the atlas `signs` text and in free text. */
const CONCEPTS = [
  { id: 'vomiting',    ar: 'قيء',                    en: 'Vomiting',              kw: ['قيء', 'تقيؤ', 'vomit'] },
  { id: 'diarrhea',    ar: 'إسهال',                  en: 'Diarrhea',              kw: ['اسهال', 'diarrh'] },
  { id: 'bloody_stool',ar: 'إسهال/براز مدمى',        en: 'Bloody stool',          kw: ['مدمي', 'مدمى', 'دموي', 'براز دم', 'نزف شرجي'] },
  { id: 'fever',       ar: 'حمّى',                   en: 'Fever',                 kw: ['حمي', 'حمى', 'ارتفاع حراره', 'fever'] },
  { id: 'lethargy',    ar: 'خمول/ضعف عام',           en: 'Lethargy / weakness',   kw: ['خمول', 'ضعف', 'هزال عام', 'خامل'] },
  { id: 'anorexia',    ar: 'فقدان الشهية',           en: 'Loss of appetite',      kw: ['فقدان الشهيه', 'فقد الشهيه', 'لا ياكل', 'امتناع عن الاكل', 'قلة الشهيه', 'انعدام الشهيه'] },
  { id: 'weight_loss', ar: 'فقدان الوزن',            en: 'Weight loss',           kw: ['فقدان الوزن', 'نقص الوزن', 'هزال', 'نحول'] },
  { id: 'cough',       ar: 'سعال',                   en: 'Cough',                 kw: ['سعال', 'كحه', 'cough'] },
  { id: 'dyspnea',     ar: 'صعوبة/ضيق تنفس',         en: 'Breathing difficulty',  kw: ['صعوبه تنفس', 'ضيق تنفس', 'ضيق التنفس', 'تنفس سريع', 'لهاث شديد'] },
  { id: 'nasal',       ar: 'إفرازات أنفية/عطاس',      en: 'Nasal discharge / sneezing', kw: ['افرازات انفيه', 'سيلان الانف', 'عطاس', 'افرازات من الانف'] },
  { id: 'eye',         ar: 'إفرازات/احمرار العين',    en: 'Eye discharge / redness', kw: ['افرازات عين', 'احمرار العين', 'التهاب الملتحمه', 'عين'] },
  { id: 'lameness',    ar: 'عرج/صعوبة مشي',          en: 'Lameness',              kw: ['عرج', 'صعوبه المشي', 'لا يستطيع المشي', 'تعثر'] },
  { id: 'swelling',    ar: 'تورّم',                  en: 'Swelling',              kw: ['تورم', 'انتفاخ موضعي', 'ورم'] },
  { id: 'itching',     ar: 'حكّة',                   en: 'Itching',               kw: ['حكه', 'هرش', 'خدش'] },
  { id: 'skin',        ar: 'آفات جلدية/قشور/جروح',   en: 'Skin lesions / crusts', kw: ['افات جلديه', 'قشور', 'بثور', 'تقرحات جلديه', 'طفح'] },
  { id: 'hairloss',    ar: 'تساقط الشعر/الفراء',     en: 'Hair loss',             kw: ['تساقط الشعر', 'تساقط الفراء', 'صلع', 'فقدان الشعر'] },
  { id: 'jaundice',    ar: 'يرقان (اصفرار)',         en: 'Jaundice',              kw: ['يرقان', 'اصفرار'] },
  { id: 'pupd',        ar: 'عطش وتبوّل زائدان',      en: 'Excess thirst / urination', kw: ['عطش', 'كثره التبول', 'تبول زائد', 'شرب ماء زائد'] },
  { id: 'urinary',     ar: 'صعوبة التبوّل/بول مدمى', en: 'Urination difficulty / bloody urine', kw: ['صعوبه التبول', 'احتباس بول', 'بول مدمي', 'بول دموي', 'تبول مؤلم'] },
  { id: 'seizures',    ar: 'تشنّجات/نوبات',          en: 'Seizures',              kw: ['تشنج', 'نوبات', 'صرع', 'اختلاج'] },
  { id: 'neuro',       ar: 'علامات عصبية (ترنّح/دوران/شلل)', en: 'Neurologic signs (ataxia / circling / paralysis)', kw: ['ترنح', 'دوران', 'شلل', 'ضعف الاطراف', 'رعشه عضليه', 'ميل الراس', 'ضغط الراس'] },
  { id: 'pain_abd',    ar: 'ألم بطني/مغص',           en: 'Abdominal pain / colic', kw: ['الم بطني', 'مغص', 'الم البطن', 'تقلصات بطنيه'] },
  { id: 'bloat',       ar: 'انتفاخ البطن/الكرش',     en: 'Bloating',              kw: ['انتفاخ البطن', 'انتفاخ الكرش', 'نفاخ', 'انتفاخ بطني'] },
  { id: 'dehydration', ar: 'جفاف',                   en: 'Dehydration',           kw: ['جفاف'] },
  { id: 'pallor',      ar: 'شحوب/فقر دم',            en: 'Pallor / anemia',       kw: ['شحوب', 'فقر دم', 'انيميا', 'اغشيه شاحبه'] },
  { id: 'salivation',  ar: 'سيلان لعاب زائد',        en: 'Excess salivation',     kw: ['سيلان اللعاب', 'سيلان لعاب', 'رغوه'] },
  { id: 'abortion',    ar: 'إجهاض',                  en: 'Abortion',              kw: ['اجهاض'] },
  { id: 'udder',       ar: 'مشكلة ضرع/التهاب ضرع',   en: 'Udder / mastitis signs', kw: ['ضرع', 'التهاب الضرع', 'حلمه'] },
  { id: 'milk_drop',   ar: 'انخفاض إنتاج الحليب',    en: 'Milk drop',             kw: ['انخفاض الحليب', 'انخفاض انتاج الحليب', 'انخفاض الانتاج', 'قلة الحليب', 'توقف الحليب', 'نقص الحليب', 'قلة الانتاج'] },
  { id: 'constipation',ar: 'إمساك',                  en: 'Constipation',          kw: ['امساك'] },
  { id: 'oral',        ar: 'تقرحات فم/لسان',         en: 'Mouth / tongue ulcers', kw: ['تقرحات الفم', 'قرح الفم', 'تقرحات اللسان', 'افات الفم'] },
  { id: 'sudden_death',ar: 'موت مفاجئ',              en: 'Sudden death',          kw: ['موت مفاجئ', 'نفوق مفاجئ'] },
  { id: 'bleeding',    ar: 'نزف',                    en: 'Bleeding',              kw: ['نزف', 'نزيف'] },
  { id: 'discharge_repro', ar: 'إفرازات تناسلية',    en: 'Genital discharge',     kw: ['افرازات مهبليه', 'افرازات تناسليه', 'افرازات من الفرج'] }
];
const CONCEPT_BY_ID = {};
CONCEPTS.forEach(c => { CONCEPT_BY_ID[c.id] = c; });

/* ---------- Red flags (intake level — user-reported, gate runs first) ---------- */
const RED_FLAGS = [
  { id: 'rf_collapse',   ar: 'انهيار أو إغماء',              kw: ['انهيار', 'اغماء', 'سقوط مفاجئ'] },
  { id: 'rf_dyspnea',    ar: 'صعوبة تنفس شديدة/اختناق',      kw: ['اختناق', 'تنفس بفم مفتوح', 'زرقه اللسان', 'لا يستطيع التنفس'] },
  { id: 'rf_bleeding',   ar: 'نزف لا يتوقف',                 kw: ['نزف لا يتوقف', 'نزيف شديد', 'نزف غزير'] },
  { id: 'rf_seizure',    ar: 'تشنجات مستمرة أو متكررة',      kw: ['تشنجات مستمره', 'نوبات متكرره'] },
  { id: 'rf_no_urine',   ar: 'عدم التبوّل إطلاقًا',          kw: ['احتباس بول كامل', 'لا يتبول', 'عدم التبول'] },
  { id: 'rf_bloat',      ar: 'انتفاخ بطن شديد مع ألم/قلق',   kw: ['انتفاخ شديد مع', 'معدة منتفخه مع'] },
  { id: 'rf_dystocia',   ar: 'ولادة متعسّرة',                kw: ['ولاده متعسره', 'عسر ولاده', 'مخاض طويل'] },
  { id: 'rf_poison',     ar: 'اشتباه تسمّم',                 kw: ['تسمم', 'اكل سم', 'مبيد'] },
  { id: 'rf_trauma',     ar: 'حادث/صدمة/سقوط',               kw: ['حادث', 'دهس', 'سقوط من'] },
  { id: 'rf_herd_death', ar: 'نفوق مفاجئ في القطيع',         kw: ['نفوق جماعي', 'موت جماعي', 'نفوق مفاجئ'] }
];
const RED_FLAG_BY_ID = {};
RED_FLAGS.forEach(r => { RED_FLAG_BY_ID[r.id] = r; });

/* ---------- Engine core ---------- */
const AGE_TOKENS = {
  young:  ['جرو', 'جراء', 'صغير', 'صغار', 'رضيع', 'حديث الولاده', 'عجل', 'حمل صغير', 'مهر صغير', 'kitten', 'puppy', 'young', 'juvenile'],
  adult:  ['بالغ', 'بالغه', 'adult'],
  senior: ['مسن', 'كبير السن', 'شيخوخه', 'elderly', 'senior', 'geriatric']
};

function createTriageEngine(data) {
  const diseasesBySpecies = (data && data.diseasesBySpecies) || {};
  const pathways = (data && data.pathways) || [];

  // Precompute per-species normalized signs + concept document frequency (for IDF)
  const index = {};
  Object.keys(diseasesBySpecies).forEach(sp => {
    const list = diseasesBySpecies[sp] || [];
    const df = {};
    const rows = list.map(dz => {
      const signsN = normTxt(dz.s);
      const allN = signsN + ' ' + normTxt(dz.n) + ' ' + normTxt(dz.e);
      const hits = new Set();
      CONCEPTS.forEach(c => {
        for (const k of c.kw) { if (allN.indexOf(normTxt(k)) !== -1) { hits.add(c.id); break; } }
      });
      hits.forEach(id => { df[id] = (df[id] || 0) + 1; });
      return { dz, signsN, allN, hits };
    });
    const N = Math.max(1, list.length);
    const idf = {};
    CONCEPTS.forEach(c => { idf[c.id] = Math.log((N + 1) / ((df[c.id] || 0) + 1)) + 0.35; });
    index[sp] = { rows, idf, N };
  });

  function detectConcepts(text) {
    const t = normTxt(text);
    const found = [];
    CONCEPTS.forEach(c => { for (const k of c.kw) { if (t.indexOf(normTxt(k)) !== -1) { found.push(c.id); break; } } });
    return found;
  }
  function detectRedFlags(text) {
    const t = normTxt(text);
    const found = [];
    RED_FLAGS.forEach(r => { for (const k of r.kw) { if (t.indexOf(normTxt(k)) !== -1) { found.push(r.id); break; } } });
    return found;
  }

  /* input: { species, symptoms:[conceptId], redFlags:[rfId], age:'young|adult|senior', text:'' }
     output: { escalation:{active,flags}, candidates:[{...}], coverage, notes } */
  function analyze(input) {
    input = input || {};
    const sp = input.species;
    const pack = index[sp];
    if (!pack) return { error: 'unknown_species', escalation: { active: false, flags: [] }, candidates: [], coverage: 0 };

    const conceptSet = new Set(input.symptoms || []);
    detectConcepts(input.text || '').forEach(id => conceptSet.add(id));
    const rfSet = new Set(input.redFlags || []);
    detectRedFlags(input.text || '').forEach(id => rfSet.add(id));
    // A reported red-flag concept in the symptom list also escalates care advice
    const escalation = { active: rfSet.size > 0, flags: Array.from(rfSet).map(id => RED_FLAG_BY_ID[id]).filter(Boolean) };

    const concepts = Array.from(conceptSet).filter(id => CONCEPT_BY_ID[id]);
    if (concepts.length === 0) {
      return { escalation, candidates: [], coverage: 0, notes: ['no_symptoms'] };
    }

    // Pathway bonus: pathways of this species whose complaint overlaps selected concepts
    const pathwayBonus = {};   // disease name_en(lower) -> {bonus, pathwayId, rank, total, test}
    pathways.filter(p => p.sp === sp).forEach(p => {
      const complaintTxt = normTxt((p.complaint && (p.complaint.ar + ' ' + p.complaint.en)) || '');
      const overlap = concepts.some(id => CONCEPT_BY_ID[id].kw.some(k => complaintTxt.indexOf(normTxt(k)) !== -1));
      if (!overlap) return;
      (p.diffs || []).forEach((df, i, arr) => {
        const key = String(df.n_en || '').toLowerCase();
        const bonus = ((arr.length - i) / arr.length) * 1.6;
        if (!pathwayBonus[key] || pathwayBonus[key].bonus < bonus) {
          pathwayBonus[key] = { bonus, pathwayId: p.id, rank: i + 1, total: arr.length, test: df.test_ar || '' };
        }
      });
    });

    const ageTokens = AGE_TOKENS[input.age] || [];
    const scored = [];
    pack.rows.forEach(row => {
      let score = 0; const reasons = [];
      concepts.forEach(id => {
        if (row.hits.has(id)) { const w = pack.idf[id]; score += w; reasons.push({ concept: id, weight: Math.round(w * 100) / 100 }); }
      });
      if (score === 0 && !pathwayBonus[String(row.dz.e || '').toLowerCase()]) return;
      const pb = pathwayBonus[String(row.dz.e || '').toLowerCase()];
      if (pb) { score += pb.bonus; reasons.push({ pathway: pb.pathwayId, rank: pb.rank, of: pb.total, weight: Math.round(pb.bonus * 100) / 100 }); }
      if (ageTokens.length) {
        for (const tk of ageTokens) { if (row.allN.indexOf(normTxt(tk)) !== -1) { score += 0.45; reasons.push({ signalment: input.age, weight: 0.45 }); break; } }
      }
      scored.push({ row, score, reasons, pathway: pb || null });
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 5);
    const maxScore = top.length ? top[0].score : 0;
    const matchedConceptUnion = new Set();
    top.forEach(t => t.reasons.forEach(r => { if (r.concept) matchedConceptUnion.add(r.concept); }));
    const coverage = concepts.length ? matchedConceptUnion.size / concepts.length : 0;

    return {
      escalation,
      coverage: Math.round(coverage * 100) / 100,
      confidenceLabel: coverage >= 0.66 ? 'good' : (coverage >= 0.34 ? 'partial' : 'low'),
      candidates: top.map(t => ({
        name_ar: t.row.dz.n, name_en: t.row.dz.e,
        score: Math.round(t.score * 100) / 100,
        scorePct: maxScore ? Math.round((t.score / maxScore) * 100) : 0,
        emergency: t.row.dz.u === 1, zoonotic: t.row.dz.z === 1,
        category: t.row.dz.c || '',
        reasons: t.reasons,
        keyTest: (t.pathway && t.pathway.test) || t.row.dz.d || '',
        diagnosis: t.row.dz.d || '',
        firstSteps: t.row.dz.t || ''
      })),
      disclaimer: 'educational_triage_not_diagnosis'
    };
  }

  return { analyze, detectConcepts, detectRedFlags, CONCEPTS, RED_FLAGS };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createTriageEngine, normTxt, CONCEPTS, RED_FLAGS };
}

/* ---------- Browser UI (self-mounting, lazy data load) ---------- */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.VetAI_Triage = { create: createTriageEngine, CONCEPTS, RED_FLAGS };
  const SPECIES = [
    ['dogs', 'الكلاب'], ['cats', 'القطط'], ['cattle', 'الأبقار'],
    ['small-ruminants', 'الأغنام والماعز'], ['rabbits', 'الأرانب'], ['horses', 'الخيول']
  ];
  let engine = null, loading = null;
  function loadEngine() {
    if (engine) return Promise.resolve(engine);
    if (loading) return loading;
    const bySp = {};
    loading = Promise.all(SPECIES.map(([sp]) =>
      fetch('json/diseases/' + sp + '.json').then(r => r.json()).then(j => { bySp[sp] = j; }).catch(() => { bySp[sp] = []; })
    )).then(() => fetch('json/differentials.json').then(r => r.json()).catch(() => ({ pathways: [] })))
      .then(diff => { engine = createTriageEngine({ diseasesBySpecies: bySp, pathways: (diff && diff.pathways) || [] }); return engine; });
    return loading;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
  function mount() {
    const view = document.getElementById('view-ai-diagnostics');
    if (!view || document.getElementById('triage45')) return;
    const sec = document.createElement('section');
    sec.id = 'triage45';
    sec.innerHTML =
      '<p style="margin:0"><span class="eb">المرحلة 2 — التحليل المفصّل</span></p>' +
      '<h3>🩺 التحليل التفريقي المفصّل (أطلس الأمراض)</h3>' +
      '<p>المرحلة الثانية المفصّلة من الأداة نفسها: بعد التقييم الأولي أعلاه، اختر نوع الحيوان والأعراض؛ يرتّب المحرك الاحتمالات من أطلس الأمراض (600) ومسارات التشخيص التفريقي (26) مع إظهار أسباب كل ترتيب. <b>أداة فرز وتثقيف — ليست تشخيصًا نهائيًا.</b></p>' +
      '<label>نوع الحيوان <select id="tgSp">' + SPECIES.map(s => '<option value="' + s[0] + '">' + s[1] + '</option>').join('') + '</select></label> ' +
      '<label>الفئة العمرية <select id="tgAge"><option value="">غير محددة</option><option value="young">صغير/جرو</option><option value="adult">بالغ</option><option value="senior">مُسنّ</option></select></label>' +
      '<fieldset><legend>الأعراض</legend>' + CONCEPTS.map(c => '<label style="display:inline-block;margin:2px 6px"><input type="checkbox" class="tgSym" value="' + c.id + '"> ' + esc(c.ar) + '</label>').join('') + '</fieldset>' +
      '<fieldset><legend>⚠️ علامات خطر (إن وُجدت)</legend>' + RED_FLAGS.map(r => '<label style="display:inline-block;margin:2px 6px"><input type="checkbox" class="tgRf" value="' + r.id + '"> ' + esc(r.ar) + '</label>').join('') + '</fieldset>' +
      '<label>وصف حرّ اختياري <input id="tgText" type="text" style="width:100%" placeholder="مثال: جرو غير محصّن مع قيء وإسهال مدمى"></label>' +
      '<button id="tgGo" type="button">تحليل الأعراض</button>' +
      '<div id="tgOut" aria-live="polite"></div>';
    /* Stage 2 of the unified evaluator (audit item 8): mount after the
       Stage 1 form grid — i.e. just before the tools wrapper (.my) — so
       the two stages read in order. Falls back to appending if the
       wrapper is ever absent; mounting target and guard unchanged. */
    var anchor = null;
    for (var i = 0; i < view.children.length; i++) {
      if (view.children[i].classList && view.children[i].classList.contains('my')) { anchor = view.children[i]; break; }
    }
    if (anchor) view.insertBefore(sec, anchor); else view.appendChild(sec);
    sec.querySelector('#tgGo').addEventListener('click', () => {
      const out = sec.querySelector('#tgOut');
      out.innerHTML = 'جارٍ التحليل…';
      loadEngine().then(eng => {
        const res = eng.analyze({
          species: sec.querySelector('#tgSp').value,
          age: sec.querySelector('#tgAge').value,
          symptoms: Array.from(sec.querySelectorAll('.tgSym:checked')).map(x => x.value),
          redFlags: Array.from(sec.querySelectorAll('.tgRf:checked')).map(x => x.value),
          text: sec.querySelector('#tgText').value || ''
        });
        let h = '';
        if (res.escalation && res.escalation.active) {
          h += '<div style="border:2px solid #c0392b;padding:10px"><b>🚨 حالة طارئة محتملة:</b> ' +
            res.escalation.flags.map(f => esc(f.ar)).join('، ') +
            '<br>توجّه فورًا إلى أقرب طبيب بيطري/عيادة طوارئ — لا تنتظر نتيجة التحليل.</div>';
        }
        if (!res.candidates || !res.candidates.length) {
          h += '<p>لا توجد أعراض كافية للترتيب. اختر عرضًا واحدًا على الأقل أو صف الحالة نصيًا.</p>';
        } else {
          h += '<ol>' + res.candidates.map(cd =>
            '<li><b>' + esc(cd.name_ar) + '</b> (' + esc(cd.name_en) + ') — قوة التطابق ' + cd.scorePct + '%' +
            (cd.emergency ? ' · ⚠️ قد تكون طارئة' : '') + (cd.zoonotic ? ' · مشترك مع الإنسان' : '') +
            '<br>أسباب الترتيب: ' + cd.reasons.map(r => r.concept ? esc((CONCEPT_BY_ID[r.concept] || {}).ar || r.concept) : (r.pathway ? 'مسار تفريقي (مرتبة ' + r.rank + '/' + r.of + ')' : 'ملاءمة عمرية')).join('، ') +
            (cd.keyTest ? '<br>الفحص المفتاحي المقترح: ' + esc(cd.keyTest) : '') +
            '</li>').join('') + '</ol>' +
            '<p>تغطية الأعراض المدخلة: ' + Math.round((res.coverage || 0) * 100) + '% — النتيجة توجيه تعليمي يرتّب الاحتمالات ولا يؤكد أي تشخيص؛ الفحص السريري عند الطبيب البيطري هو المرجع.</p>';
        }
        out.innerHTML = h;
      }).catch(() => { out.innerHTML = 'تعذّر تحميل بيانات المحرك؛ حاول مجددًا.'; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
}
