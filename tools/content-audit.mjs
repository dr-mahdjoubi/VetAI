#!/usr/bin/env node
/* VetAI v45 Wave C — Master Supervisor: content scientific audit.
   Scores every structured knowledge unit on declared, checkable rules:
   - diseases (600): required fields present & substantive; NO numeric dose
     patterns in treatment/signs (doses live only in the professional drug
     guide — the platform's standing safety rule); flags are valid 0/1.
   - drugs-pro (37): full standard schema incl. contraindications present.
   - research (20): source URL, date, bilingual summaries present.
   - terminology (600): MeSH mapping status counted honestly (mapped vs
     explicitly pending) — pending is a tracked state, not a failure.
   Output: a quality report (aggregate + capped issue list). The Supervisor
   PROPOSES; it never edits or publishes medical content automatically.
   Usage: node content-audit.mjs <dataDir> <out.json>
   dataDir holds: {dogs,cats,cattle,small-ruminants,rabbits,horses}.json,
   terminology.json, drugs-pro.json, research.json                        */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = process.argv[2], outp = process.argv[3];
const load = f => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const SPECIES = ['dogs', 'cats', 'cattle', 'small-ruminants', 'rabbits', 'horses'];
const DOSE_RE = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|ml|iu|meq)\s*(?:\/\s*(?:kg|lb|animal|head))?/i;

const issues = [];
let dTotal = 0, dComplete = 0, dDoseLeaks = 0;
for (const sp of SPECIES) {
  for (const dz of load(sp + '.json')) {
    dTotal++;
    const missing = ['n', 'e', 'a', 's', 'd', 't', 'p', 'c'].filter(k => !dz[k] || String(dz[k]).trim().length < 3);
    const badFlags = !((dz.z === 0 || dz.z === 1) && (dz.u === 0 || dz.u === 1));
    if (!missing.length && !badFlags) dComplete++;
    else if (issues.length < 200) issues.push({ corpus: 'diseases', id: sp + ':' + (dz.e || dz.n), missing, badFlags });
    if (DOSE_RE.test(dz.t || '') || DOSE_RE.test(dz.s || '')) {
      dDoseLeaks++;
      if (issues.length < 200) issues.push({ corpus: 'diseases', id: sp + ':' + (dz.e || dz.n), doseLeak: (dz.t.match(DOSE_RE) || dz.s.match(DOSE_RE))[0] });
    }
  }
}

const drugsDoc = load('drugs-pro.json');
const drugs = drugsDoc.drugs || drugsDoc.items || drugsDoc;
const DRUG_FIELDS = ['name_ar', 'active_ingredient', 'drug_class_en', 'species', 'indications_ar', 'dosage', 'contraindications_ar', 'withdrawal_ar'];
let drComplete = 0;
for (const d of drugs) {
  const missing = DRUG_FIELDS.filter(k => d[k] == null || (typeof d[k] === 'string' && d[k].trim().length < 3) || (Array.isArray(d[k]) && !d[k].length));
  if (!missing.length) drComplete++;
  else if (issues.length < 200) issues.push({ corpus: 'drugs-pro', id: d.name_ar || d.id, missing });
}

const resDoc = load('research.json');
const res = resDoc.items || resDoc;
let rComplete = 0;
for (const it of res) {
  const missing = ['title_ar', 'title_en', 'summary_ar', 'summary_en', 'source_url', 'published'].filter(k => !it[k] || String(it[k]).trim().length < 4);
  if (!missing.length) rComplete++;
  else if (issues.length < 200) issues.push({ corpus: 'research', id: it.id, missing });
}

const termDoc = load('terminology.json');
const terms = termDoc.terms || termDoc.items || termDoc;
const meshMapped = terms.filter(t => t.mesh).length;

const pct = (a, b) => Math.round((a / Math.max(1, b)) * 1000) / 10;
const report = {
  generated: new Date().toISOString(),
  rule: 'Supervisor proposes only — no automatic editing or publishing of medical content.',
  corpora: {
    diseases: { total: dTotal, complete: dComplete, completenessPct: pct(dComplete, dTotal), doseLeaks: dDoseLeaks },
    drugsPro: { total: drugs.length, complete: drComplete, completenessPct: pct(drComplete, drugs.length) },
    research: { total: res.length, complete: rComplete, completenessPct: pct(rComplete, res.length) },
    terminology: { total: terms.length, meshMapped, meshPending: terms.length - meshMapped, meshCoveragePct: pct(meshMapped, terms.length) }
  },
  issuesCapped: issues.length, issues: issues.slice(0, 50)
};
report.overallCompletenessPct = pct(dComplete + drComplete + rComplete, dTotal + drugs.length + res.length);
if (outp) writeFileSync(outp, JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify(report.corpora, null, 1));
console.log('overall completeness:', report.overallCompletenessPct + '% · dose leaks:', dDoseLeaks, '· issues listed:', issues.length);
