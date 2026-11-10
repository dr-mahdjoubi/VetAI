/* VetAI v45 — Wave B: Research Radar (VTRI)
   Renders the founder's published VTRI framework faithfully:
   - the rubric (5 domains x 0-3) and his Table 6 class judgements with RWP flags
     (attributed as preliminary expert judgements, exactly as the manuscript states);
   - per-item EVIDENCE SIGNALS machine-extracted from each research item's own text
     (design, sample size, external validation, species) with verbatim evidence quotes.
   Provisional domain suggestions appear only for AI/diagnostic items, are labelled
   as machine-extracted and unreviewed, and never include D5. Nothing here is
   presented as a measurement the manuscript did not make.                        */
'use strict';
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
  const RWP_AR = { green: '🟢 أداء واقعي مؤكد', amber: '🟡 بيانات واقعية محدودة', red: '🔴 قصور واقعي موثق' };
  const DESIGN_AR = { systematic_review: 'مراجعة منهجية', randomized: 'مجرّبة عشوائية', prospective: 'دراسة استباقية', retrospective: 'دراسة رجعية', cohort: 'دراسة أتراب', cross_sectional: 'دراسة مقطعية/مسح', case_series: 'سلسلة/تقرير حالات', narrative_review: 'مراجعة/تحليل ثانوي', lab_study: 'دراسة مخبرية', not_stated: 'تصميم غير مصرّح' };
  function bar(v) {
    return '<span title="' + v + '/3">' + '●'.repeat(v) + '○'.repeat(3 - v) + '</span>';
  }
  function mount() {
    const host = document.getElementById('research');
    if (!host || document.getElementById('radar45')) return;
    const sec = document.createElement('div');
    sec.id = 'radar45';
    sec.innerHTML = '<h3>📡 رادار الأبحاث — مؤشر الجاهزية الترجمية VTRI</h3>' +
      '<p>إطار الدكتور محجوبي عبدالناصر المنشور (2026): خمسة مجالات تُقيَّم 0–3 (المجموع /15) مع علم أداء واقعي RWP. ' +
      'درجات الفئات أدناه هي <b>أحكام المؤلف المنشورة</b> في مخطوطته («أحكام خبرة أولية قابلة للتحقق») — ليست قياسات آلية.</p>' +
      '<div id="radar45Classes">جارٍ التحميل…</div>' +
      '<h4>إشارات أدلة مستخرجة آليًا من نصوص الأبحاث العشرين في المكتبة</h4>' +
      '<p>استخراج حتمي قائم على قواعد معلنة، وكل إشارة مدعومة باقتباس حرفي من نص البحث. الاقتراحات المؤقتة للمجالات تظهر فقط لأبحاث الذكاء الاصطناعي/التشخيص، وتبقى <b>غير مراجعة بشريًا</b>، والمجال D5 لا يُستنتج آليًا أبدًا.</p>' +
      '<div id="radar45Signals">جارٍ التحميل…</div>';
    host.insertBefore(sec, host.firstChild.nextSibling || null);

    fetch('json/vtri-classes.json').then(r => r.json()).then(fw => {
      const el = sec.querySelector('#radar45Classes');
      el.innerHTML = fw.classes.map(c => {
        const total = c.D1 + c.D2 + c.D3 + c.D4 + c.D5;
        return '<div style="border:1px solid #ccc;border-radius:8px;padding:8px;margin:6px 0">' +
          '<b>' + esc(c.name_ar) + '</b> (' + esc(c.name_en) + ') — <b>VTRI ' + total + '/15</b> · ' + (RWP_AR[c.rwp] || c.rwp) + '<br>' +
          ['D1', 'D2', 'D3', 'D4', 'D5'].map(d => '<small>' + esc(fw.rubric[d].name_ar) + ' ' + bar(c[d]) + ' ' + c[d] + '/3</small>').join(' · ') +
          '<br><small>' + esc(c.basis_en) + '</small></div>';
      }).join('');
    }).catch(() => { sec.querySelector('#radar45Classes').innerHTML = 'تعذّر تحميل إطار VTRI.'; });

    Promise.all([
      fetch('json/research-signals.json').then(r => r.json()),
      fetch('json/research.json').then(r => r.json())
    ]).then(([sig, res]) => {
      const titles = {};
      (res.items || []).forEach(it => { titles[it.id] = it.title_ar || it.title_en || it.id; });
      sec.querySelector('#radar45Signals').innerHTML = '<ul>' + sig.signals.map(s => {
        let h = '<li><b>' + esc(titles[s.id] || s.id) + '</b><br><small>التصميم: ' + (DESIGN_AR[s.design] || s.design) +
          (s.sampleSize ? ' · حجم العينة/الدراسات: ' + s.sampleSize : '') +
          (s.externalValidation ? ' · تحقق خارجي مذكور' : '') +
          (s.species && s.species.length ? ' · الأنواع: ' + s.species.map(esc).join('، ') : '') + '</small>';
        if (s.provisional) {
          const d = s.provisional.domains;
          h += '<br><small>اقتراح آلي مؤقت (غير مراجَع): ' + Object.keys(d).map(k => k + '=' + d[k]).join(' · ') + ' — المجموع على المجالات المسجّلة: ' + s.provisional.totalOnScored + ' من ' + (s.provisional.scoredDomains * 3) + '</small>';
        }
        return h + '</li>';
      }).join('') + '</ul>';
    }).catch(() => { sec.querySelector('#radar45Signals').innerHTML = 'تعذّر تحميل إشارات الأبحاث.'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
}
