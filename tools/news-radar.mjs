#!/usr/bin/env node
/* VetAI v45 Wave C — Emergency/news radar (WOAH official feed).
   Reads the WOAH (World Organisation for Animal Health) public RSS feed,
   flags items matching animal-health emergency keywords, and drafts
   cautiously-worded Arabic news cards WITH the official source link.
   DRAFTS ONLY — per governance, a human approves before anything is
   published to the site news. No auto-posting exists in this tool.
   Usage: node news-radar.mjs [out.md]                                     */
import { writeFileSync } from 'fs';

const FEED = 'https://www.woah.org/en/feed/';
const KEYWORDS = [/outbreak/i, /avian influenza/i, /highly pathogenic/i, /foot-and-mouth/i, /african swine fever/i,
  /lumpy skin/i, /peste des petits/i, /rabies/i, /anthrax/i, /emergency/i, /epidemic/i, /disease notification/i, /bluetongue/i, /newcastle/i];

const xml = await (await fetch(FEED, { headers: { 'User-Agent': 'VetAI-NewsRadar/1.0' } })).text();
const items = [];
const itemRe = /<item>([\s\S]*?)<\/item>/g;
let m;
const pick = (b, tag) => { const mm = b.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>')); return mm ? mm[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : ''; };
while ((m = itemRe.exec(xml)) !== null && items.length < 30) {
  const b = m[1];
  items.push({ title: pick(b, 'title'), link: pick(b, 'link'), date: pick(b, 'pubDate') });
}
const flagged = items.filter(it => KEYWORDS.some(k => k.test(it.title)));
const today = new Date().toISOString().slice(0, 10);
let md = '# WOAH News Radar — DRAFT (' + today + ')\n\n> مسودات فقط — لا يُنشر أي بند على الموقع دون موافقة بشرية. المصدر الرسمي: WOAH.\n\n' +
  'Feed items scanned: ' + items.length + ' · Emergency-keyword matches: ' + flagged.length + '\n\n';
flagged.forEach(it => {
  md += '## ' + it.title + '\n- التاريخ: ' + it.date + '\n- المصدر الرسمي: ' + it.link + '\n' +
    '- مسودة بطاقة خبر (حذرة، للنشر بعد المراجعة): «رصد رسمي من المنظمة العالمية لصحة الحيوان (WOAH): ' + it.title + ' — التفاصيل الكاملة والتدابير الرسمية في المصدر.»\n\n';
});
if (!flagged.length) md += 'لا بنود مطابقة لكلمات الطوارئ في هذه الجولة.\n';
const outp = process.argv[2];
if (outp) writeFileSync(outp, md);
console.log(md);
