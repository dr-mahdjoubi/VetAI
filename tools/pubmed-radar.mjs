#!/usr/bin/env node
/* VetAI v45 Wave B — PubMed Radar (Guard-flow ingestion draft).
   Fetches recent veterinary AI / diagnostic-imaging papers from PubMed
   E-utilities, extracts the same auditable evidence signals as the site
   radar, and writes a DRAFT report. Nothing is published automatically:
   per the Master Plan, a human approves before anything reaches the site.
   Usage: node pubmed-radar.mjs [daysBack] [out.md]                        */
import { writeFileSync } from 'fs';
import { extractSignals } from './vtri-signals.mjs';

const DAYS = parseInt(process.argv[2] || '90', 10);
const OUT = process.argv[3] || '';
const UA = { 'User-Agent': 'VetAI-ResearchRadar/1.0 (mailto:dr.mahdjoubi@proton.me)' };
const TERM = '(veterinary[Title/Abstract] OR canine[Title/Abstract] OR feline[Title/Abstract] OR equine[Title/Abstract] OR bovine[Title/Abstract]) AND ("artificial intelligence"[Title/Abstract] OR "deep learning"[Title/Abstract] OR "machine learning"[Title/Abstract] OR "neural network"[Title/Abstract])';

const esearch = await (await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&sort=date&retmax=10&datetype=pdat&reldate=' + DAYS + '&term=' + encodeURIComponent(TERM), { headers: UA })).json();
const ids = (esearch.esearchresult && esearch.esearchresult.idlist) || [];
console.log('PubMed hits (last ' + DAYS + 'd):', ids.length, ids.join(','));
const rows = [];
if (ids.length) {
  const txt = await (await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&rettype=abstract&retmode=text&id=' + ids.join(','), { headers: UA })).text();
  const blocks = txt.split(/\n(?=\d+\.\s)/).filter(b => b.trim().length > 40);
  blocks.forEach((b, i) => {
    const pmid = ids[i];
    const lines = b.split('\n').map(x => x.trim()).filter(Boolean);
    const title = (lines[2] || lines[1] || 'Untitled').replace(/\s+/g, ' ');
    const item = { id: 'pubmed-' + pmid, title_en: title, summary_en: b.replace(/\s+/g, ' ') };
    const sig = extractSignals(item);
    rows.push({ pmid, title, sig });
  });
}
const today = new Date().toISOString().slice(0, 10);
let md = '# PubMed Radar — DRAFT (' + today + ')\n\n> DRAFT ONLY — human approval required before any item is added to the site research library. ' +
  'Signals are machine-extracted from abstracts with verbatim evidence; provisional domains are suggestions, not VTRI scores.\n\n' +
  'Window: last ' + DAYS + ' days · Query: veterinary AI / deep learning · Hits: ' + rows.length + '\n\n';
rows.forEach(r => {
  md += '## PMID ' + r.pmid + ' — ' + r.title + '\n' +
    '- Design: ' + r.sig.design + (r.sig.sampleSize ? ' · Sample signal: ' + r.sig.sampleSize : '') +
    ' · External validation: ' + (r.sig.externalValidation ? 'mentioned' : 'not mentioned') +
    ' · Species: ' + (r.sig.species.join(', ') || 'n/a') + '\n' +
    (r.sig.provisional ? '- Provisional domains (unreviewed): ' + JSON.stringify(r.sig.provisional.domains) + '\n' : '') +
    '- https://pubmed.ncbi.nlm.nih.gov/' + r.pmid + '/\n\n';
});
if (OUT) writeFileSync(OUT, md);
console.log(md);
