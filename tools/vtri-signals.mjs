#!/usr/bin/env node
/* VetAI v45 Wave B — evidence-signal extractor for the Research Radar.
   Deterministic, rule-based, fully auditable: every signal carries the exact
   source substring that justified it. It does NOT assign the author's VTRI
   scores (those are expert judgements, Table 6 of the manuscript, shipped
   separately in vtri-classes.json). For AI/diagnostic items it may suggest
   PROVISIONAL rubric domains D1-D4 from explicit text signals only, always
   flagged as machine-extracted and requiring human review. D5 is never
   auto-scored: integration/regulatory status cannot be inferred from an
   abstract, and the engine refuses to guess it.
   Usage: node vtri-signals.mjs <research.json> <out.json>            */
import { readFileSync, writeFileSync } from 'fs';

const SPECIES_RULES = [
  ['dogs', /\bdogs?\b|canine/i], ['cats', /\bcats?\b|feline/i],
  ['cattle', /cattle|bovine|cows?\b/i], ['horses', /horses?|equine/i],
  ['sheep', /sheep|ovine/i], ['goats', /goats?|caprine/i],
  ['pigs', /pigs?|swine|porcine/i], ['poultry', /poultry|chickens?|avian/i],
  ['rabbits', /rabbits?/i]
];
const GROUP_OF = { dogs: 'companion', cats: 'companion', cattle: 'livestock', sheep: 'livestock', goats: 'livestock', pigs: 'livestock', horses: 'equine', poultry: 'poultry', rabbits: 'companion' };
const DESIGN_RULES = [
  ['systematic_review', /systematic (review|survey)|meta-analysis|PRISMA/i],
  ['randomized', /randomi[sz]ed/i],
  ['prospective', /prospective/i],
  ['retrospective', /retrospective/i],
  ['cohort', /cohort/i],
  ['cross_sectional', /cross-sectional|survey of|questionnaire/i],
  ['case_series', /case series|case report/i],
  ['narrative_review', /\breview\b|secondary analysis/i],
  ['lab_study', /in vitro|laboratory stud/i]
];
const SAMPLE_CTX = /(studies|study|cases|animals|dogs|cats|samples|images|radiographs|records|participants|patients|isolates|herds|farms)/i;

function quoteAround(text, idx, len, span = 70) {
  const a = Math.max(0, idx - span), b = Math.min(text.length, idx + len + span);
  return text.slice(a, b).replace(/\s+/g, ' ').trim();
}
export function extractSignals(item) {
  // Strip DOIs and journal citation article-ids (";13:1952589") first: their
  // digits are identifiers, never sample sizes, and they poison count scans.
  const text = [item.title_en || '', item.summary_en || '', item.summary_ar || ''].join(' \n ')
    .replace(/10\.\d{4,9}\/\S+/g, ' ').replace(/;\d{1,3}:\d{4,}/g, ';');
  const sig = { id: item.id || null, evidence: {} };

  // design (highest tier first)
  sig.design = 'not_stated';
  for (const [name, re] of DESIGN_RULES) {
    const m = text.match(re);
    if (m) { sig.design = name; sig.evidence.design = quoteAround(text, m.index, m[0].length); break; }
  }
  // sample size: largest number tied to a countable unit within 60 chars
  let best = null;
  const numRe = /(\d{1,3}(?:,\d{3})+|\d{2,7})\s*([A-Za-z%]{0,14})/g;
  let m;
  while ((m = numRe.exec(text)) !== null) {
    const window = text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60);
    if (!SAMPLE_CTX.test(window)) continue;
    if ((m[2] || '').includes('%')) continue; // percentages are not counts
    if (/^\s*-?\s*(minutes?|hours?|days?|weeks?|months?)\b/i.test(text.slice(m.index + m[1].length, m.index + m[1].length + 12))) continue; // durations are not counts
    const afterDigits = text[m.index + m[1].length] || '';
    if (afterDigits === '.' && /\d/.test(text[m.index + m[1].length + 1] || '')) continue; // decimal number, not a count
    const val = parseInt(m[1].replace(/,/g, ''), 10);
    // A bare 4-digit year (1900-2099) is never a sample size, unless a countable
    // unit word follows it immediately (e.g. "2024 cases" would still count).
    if (!m[1].includes(',') && val >= 1900 && val <= 2099 && !SAMPLE_CTX.test(m[2] || '')) continue;
    if (!best || val > best.value) best = { value: val, quote: quoteAround(text, m.index, m[0].length) };
  }
  sig.sampleSize = best ? best.value : null;
  if (best) sig.evidence.sampleSize = best.quote;

  const flag = (key, re) => {
    const mm = text.match(re);
    sig[key] = !!mm;
    if (mm) sig.evidence[key] = quoteAround(text, mm.index, mm[0].length);
  };
  flag('externalValidation', /external(ly)?\s+validat|independent(ly)?\s+(evaluat|validat|test|assess)/i);
  flag('interpretability', /interpretab|explainab|saliency|grad-?cam|attention maps?/i);
  flag('dataAvailability', /data (are |is )?available|open data|code available|publicly available data/i);
  sig.aiRelevant = /\bartificial intelligence\b|deep learning|machine learning|neural network|large language models?|\bLLMs?\b/i.test(text);

  sig.species = SPECIES_RULES.filter(([, re]) => re.test(text)).map(([n]) => n);
  const groups = new Set(sig.species.map(s => GROUP_OF[s]).filter(Boolean));
  sig.speciesGroups = Array.from(groups);

  // Provisional rubric domains — AI/diagnostic items only, explicit signals only.
  sig.provisional = null;
  if (sig.aiRelevant) {
    const d = {};
    if (sig.sampleSize != null) d.D1 = sig.sampleSize < 500 ? 0 : (sig.sampleSize <= 2000 ? 1 : 2); // 3 requires multi-centre curation: never auto-assigned
    d.D2 = sig.externalValidation ? 2 : (sig.design === 'prospective' ? 1 : 0);
    d.D3 = sig.interpretability ? 1 : 0; // 2-3 require systematic/validated explainability: not inferable here beyond a mention
    d.D4 = groups.size >= 2 ? 2
      : (sig.species.length === 2 && sig.species.includes('dogs') && sig.species.includes('cats')) ? 1
      : (sig.species.length === 1 ? 0 : 1);
    if (!sig.species.length) delete d.D4;
    const keys = Object.keys(d);
    sig.provisional = {
      domains: d, scoredDomains: keys.length,
      totalOnScored: keys.reduce((a, k) => a + d[k], 0),
      note: 'Machine-extracted provisional suggestion from explicit text signals only. D5 is never auto-scored. Requires human review; it is NOT the author VTRI score.'
    };
  }
  return sig;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, outp] = process.argv.slice(2);
  const doc = JSON.parse(readFileSync(inp, 'utf8'));
  const items = doc.items || doc;
  const signals = items.map(extractSignals);
  writeFileSync(outp, JSON.stringify({ generated_from: inp, count: signals.length, signals }, null, 1) + '\n');
  console.log('signals written:', signals.length, '->', outp);
}
