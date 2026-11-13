#!/usr/bin/env node
/**
 * build-rag-index.mjs — VetAI RAG indexer (Workstream 2).
 *
 * Parses the on-disk corpus, cuts VERBATIM chunks (never invented or
 * paraphrased text), embeds them with Workers AI, and upserts the vectors
 * to Cloudflare Vectorize over REST. Also emits a small local lexical
 * fallback file (titles + keywords, no full text) for offline search.
 *
 * Corpus (verified 2026-11-13 against the repo at base 31b90a9):
 *   - articles/*.html   — 123 content pages (a001..a123); index.html excluded
 *   - diseases/*.html   — 540 pages
 *   - json/resources.json — 1003 books + 3 journals + 7 community items
 *   - json/articles.json  — 3 approved items (1 sample/placeholder excluded)
 *   - books/*.pdf       — 70 files but only 35 unique contents (every file is
 *                         byte-duplicated under a second name); duplicates are
 *                         skipped by SHA-256. 1 group is a UI-strings dump
 *                         labelled NOT-A-BOOK and is excluded, leaving 34 books.
 *                         See "PDF text extraction" below.
 *
 * Chunk metadata (Vectorize): { title, url, kind, lang, section, chunk_index,
 *   page?, text, text_source }. `url` is RELATIVE for on-site content
 *   (articles/xxx.html, diseases/yyy.html, books/<file>.pdf with the filename
 *   percent-encoded). Records from json/*.json keep their VERBATIM source URL,
 *   which is usually external (https://...) — there is no on-site page to
 *   point at, and inventing one would break the citation. `text` is the
 *   verbatim chunk (<=~640 chars, well under Vectorize's 10 KiB metadata
 *   limit) so the Worker can answer without re-fetching source pages.
 *   `text_source` is "fulltext" or "metadata" (title-only fallback, books).
 *   Vector IDs are 32 hex chars (<= 64-byte limit), deterministic from
 *   url + chunk index + chunk hash, so re-runs are idempotent.
 *
 * PDF text extraction:
 *   Default (no flags) = metadata-only book chunks (filename-derived title).
 *   --extract-pdfs runs `pdftotext -layout` (poppler-utils, must be installed)
 *   into --books-text-dir (default ./.rag-pdf-text) and indexes the extracted
 *   text with per-page provenance (chunk metadata `page`). Re-runs skip PDFs
 *   whose .txt cache is newer than the PDF. The cache is a BUILD ARTIFACT:
 *   do NOT commit it (add the dir to .gitignore); it is ~16 MB for this corpus.
 *   --books-text-dir alone (no --extract-pdfs) indexes pre-extracted .txt
 *   files named "<pdf-basename-minus-extension>.txt"; books without a .txt
 *   file fall back to metadata-only.
 *   TODO (OCR): 4 of the 34 books have NO embedded text layer (pure scans,
 *   verified with both pdftotext and pypdf 7.0.1 yielding 0 characters):
 *   Agarwal gynaecology manual, Animal-Sciences scanned MCQ paper, Jackson
 *   obstetrics handbook, Nandi surgery/radiology textbook (687 pages total).
 *   They stay metadata-only until someone runs OCR (e.g. ocrmypdf/tesseract)
 *   and drops the .txt files into --books-text-dir. Never invent book text.
 *   pypdf was verified as a working alternative extractor (identical
 *   non-whitespace text on the sampled paper); pdftotext is used here because
 *   it needs no Python dependency for the owner.
 *
 * Environment variables (ONLY source of secrets — never hardcoded, never
 * written to any file this script produces):
 *   CLOUDFLARE_ACCOUNT_ID   Cloudflare account ID (required for live runs)
 *   CLOUDFLARE_API_TOKEN    API token with Workers AI run + Vectorize write
 *                           (Dashboard > API Tokens > Workers AI template,
 *                           plus Account > Vectorize > Edit). Required live.
 *   VECTORIZE_INDEX_NAME    Target Vectorize index (required for live runs).
 *                           The index MUST already exist with dimensions
 *                           matching the embedding model (1024 for the
 *                           default bge-m3) and metric cosine, e.g.:
 *                             wrangler vectorize create vetai-corpus \
 *                               --dimensions=1024 --metric=cosine
 *                           Create metadata indexes for `kind` and `lang`
 *                           BEFORE the first upsert if the Worker filters on
 *                           them — vectors written earlier are not added to a
 *                           metadata index created later.
 *   RAG_EMBED_MODEL         Embedding model ID (default @cf/baai/bge-m3).
 *                           bge-m3 is multilingual (100+ languages incl.
 *                           Arabic) and 1024-dim — the right default for this
 *                           Arabic-first site. English-only bge-small/base
 *                           would weaken Arabic retrieval.
 *   RAG_EXPECTED_DIMS       Refuse to upsert if embeddings differ (default
 *                           1024). Change together with RAG_EMBED_MODEL.
 *   RAG_NAMESPACE           Optional Vectorize namespace (default: none).
 *   RAG_NEURONS_PER_M_TOKENS  Override for the cost estimate (default: known
 *                           rate for the model, 1075 for bge-m3).
 *
 * Usage (run from the repo root unless --root is given):
 *   node tools/build-rag-index.mjs --dry-run --lexical-out data/rag-lexical.json
 *   node tools/build-rag-index.mjs --dry-run --extract-pdfs --stats-out /tmp/stats.json
 *   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... VECTORIZE_INDEX_NAME=vetai-corpus \
 *     node tools/build-rag-index.mjs --extract-pdfs --lexical-out data/rag-lexical.json
 *   # Smoke test: first 20 chunks only (checkpoint still applies):
 *   ... node tools/build-rag-index.mjs --limit 20
 *
 * Flags:
 *   --root <dir>          Repo root (default: parent of this script's dir)
 *   --dry-run             Parse + chunk + count only. NO API calls, no
 *                         checkpoint read/write. Local pdftotext extraction
 *                         still runs if --extract-pdfs is given.
 *   --limit N             Embed/upsert at most N chunks (lexical file still
 *                         covers the full corpus).
 *   --lexical-out <path>  Write data/rag-lexical.json (titles + keywords).
 *   --chunks-out <path>   Write JSONL of all chunks (inspection/debug; can be
 *                         large with book full text — prefer /tmp).
 *   --stats-out <path>    Write the JSON run summary to a file.
 *   --checkpoint <path>   Checkpoint file (default ./.rag-index-checkpoint.json).
 *                         Re-runs skip chunk IDs already upserted.
 *   --no-checkpoint       Do not read/write a checkpoint (re-embed everything).
 *   --books-text-dir <dir>  Directory of extracted PDF .txt files
 *                         (default ./.rag-pdf-text).
 *   --extract-pdfs        Run pdftotext into --books-text-dir first.
 *   --embed-batch N       Texts per embedding request (default 16).
 *   --upsert-batch N      Vectors per Vectorize request (default 500; the
 *                         HTTP API allows up to 5000).
 *   --vectorize-op <op>   insert | upsert (default upsert: re-runs overwrite
 *                         by ID; insert keeps the first write).
 *   --help                Show this help.
 *
 * Cost references (checked 2026-11-13, re-check before a big run):
 *   Workers AI pricing (neurons + per-model rates):
 *     https://developers.cloudflare.com/workers-ai/platform/pricing/
 *     bge-m3 = 1075 neurons / 1M input tokens; free allocation 10,000
 *     neurons/day/account; $0.011 per 1,000 neurons above that (Paid).
 *   bge-m3 model (multilingual, REST {text:[...]}):
 *     https://developers.cloudflare.com/workers-ai/models/bge-m3/
 *   Vectorize pricing (stored/queried dimensions):
 *     https://developers.cloudflare.com/vectorize/platform/pricing/
 *     Free: 5M stored dims, 30M queried dims/month. Paid: first 10M stored
 *     dims included, then $0.05 per 100M.
 *   Vectorize REST upsert (NDJSON body):
 *     https://developers.cloudflare.com/api/resources/vectorize/subresources/indexes/methods/upsert/
 *
 * Runtime: Node.js >= 18, standard library + global fetch only. No deps.
 */

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 100;
const MIN_CHUNK_CHARS = 40;
const MIN_BREAK_AT = 240; // earliest sentence-boundary cut inside a window
const MIN_BOOK_TEXT_CHARS = 200; // below this, a book falls back to metadata-only
const MIN_PAGE_TEXT_CHARS = 20; // non-space chars for a PDF page to count
const LEXICAL_KEYWORD_CAP = 12;
const KEYWORD_SAMPLE_CHARS = 50000;
const DEFAULT_EMBED_MODEL = '@cf/baai/bge-m3';
const DEFAULT_EXPECTED_DIMS = 1024;
const FREE_NEURONS_PER_DAY = 10000;
const NEURON_PRICE_PER_1000 = 0.011; // USD, Workers Paid, above free allocation
const VECTORIZE_FREE_STORED_DIMS = 5_000_000;
const VECTORIZE_PAID_INCLUDED_STORED_DIMS = 10_000_000;

// Neurons per 1M input tokens, from the Workers AI pricing page (2026-11-13).
const KNOWN_NEURON_RATES = {
  '@cf/baai/bge-m3': 1075,
  '@cf/baai/bge-small-en-v1.5': 1841,
  '@cf/baai/bge-base-en-v1.5': 6058,
  '@cf/baai/bge-large-en-v1.5': 18582,
  '@cf/qwen/qwen3-embedding-0.6b': 1075,
  '@cf/google/embeddinggemma-2': 154,
  '@cf/pfnet/plamo-embedding-1b': 1689,
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

// Minimal stopword lists (Arabic / English / French) for keyword extraction.
const STOP_AR = new Set(
  'من في إلى على أن إن كان كانت يكون تكون هذا هذه ذلك تلك هناك هنا ما لا لم لن ثم أو و لكن كما عند بعد قبل بين دون مع عن كل أي التي الذي الذين اللذين اللتين اللواتي هو هي هم هن أنت أنتم نحن أنا إذا لو قد لقد تم يتم يجري خلال حيث حول نحو ضد بعد قبل منذ أثناء بينما غير سواء فقط أيضا كذلك حيثما عندما حين حينما كلما بينما لكن لكنه بينما إذ إذن حتى لكي كي بأن فإنه فإنها فهو فهي وما ولا ومن وإلى وعلى وفي وبعد وقبل وحتى الأنواع الموضوع'.split(' '),
);
const STOP_EN = new Set(
  ('a an the and or but if then else when at by for with about against between into through during before after above below to from up down in out on off over under again further once here there all any both each few more most other some such no nor not only own same so than too very can will just should now is are was were be been being have has had having do does did doing would could shall may might must i you he she it we they me him her us them his hers its our their this that these those what which who whom whose how why where when as of per via etc used use using one two also may many much more most').split(' '),
);
const STOP_FR = new Set(
  'le la les un une des de du au aux et ou mais donc or ni car ce cet cette ces il ils elle elles nous vous on je tu mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs dans sur sous chez pour par avec sans avant après entre comme plus moins très tout tous toute toutes même aux être avoir est sont été sera seront du au aux que qui quoi dont où quand comment pourquoi ne pas plus moins'.split(' '),
);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function collapseWhitespace(text) {
  return text.replace(/[ \t\u00A0]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(Number.parseInt(h, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(Number.parseInt(d, 10));
      } catch {
        return '';
      }
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|hellip|mdash|ndash);/g, (_, name) => {
      const map = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
        rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…',
        mdash: '—', ndash: '–',
      };
      return map[name] ?? '';
    });
}

function stripTags(text) {
  return decodeEntities(text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Heuristic language tag for a text sample: 'ar' | 'fr' | 'en' | 'und'. */
function detectLang(text) {
  if (!text) return 'und';
  const letters = text.match(/[\p{L}]/gu) || [];
  if (letters.length === 0) return 'und';
  const arabic = (text.match(ARABIC_CHAR_RE) || []).length;
  if (arabic > 20 && arabic / letters.length > 0.3) return 'ar';
  const accented = (text.match(/[éèêàâîôûçëïü]/gi) || []).length;
  const lower = ` ${text.toLowerCase()} `;
  const frenchHits = [' les ', ' des ', ' pour ', ' dans ', ' avec ', ' vaccination ', ' guide ']
    .filter((w) => lower.includes(w)).length;
  if (accented > 5 && frenchHits >= 2) return 'fr';
  return 'en';
}

/** Token estimate: Arabic tokenises denser than Latin under XLM-R-style tokenisers. */
function estimateTokens(text) {
  const arabic = (text.match(ARABIC_CHAR_RE) || []).length;
  const other = Math.max(0, text.length - arabic);
  return arabic / 2.5 + other / 4;
}

// ---------------------------------------------------------------------------
// Chunking (verbatim slices, sentence-boundary preferred, ~600 chars / ~100 overlap)
// ---------------------------------------------------------------------------

/**
 * Cut `text` into verbatim slices. Returns [{ text, charStart, charEnd }].
 * Slices keep the source characters exactly, except leading/trailing
 * whitespace trimmed at the edges. Overlap re-uses source characters only.
 */
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const spans = [];
  const n = text.length;
  let pos = 0;
  while (pos < n) {
    let end = Math.min(pos + size, n);
    if (end < n) {
      const window = text.slice(pos, end);
      let cut = -1;
      // Prefer a paragraph break, else a sentence-ending mark, in the
      // latter part of the window (never before MIN_BREAK_AT).
      const para = window.lastIndexOf('\n\n');
      if (para >= MIN_BREAK_AT) cut = para + 2;
      if (cut === -1) {
        const re = /[.!؟?!\n]\s/g;
        let m;
        let last = -1;
        while ((m = re.exec(window)) !== null) {
          if (m.index >= MIN_BREAK_AT) last = m.index + 1;
        }
        if (last !== -1) cut = last;
      }
      if (cut !== -1 && cut > pos + 40) end = pos + cut;
    }
    spans.push([pos, end]);
    if (end >= n) break;
    const next = end - overlap;
    pos = next > pos ? next : end; // guarantee progress
  }
  // Merge a trailing sliver into the previous chunk (extend its end).
  if (spans.length > 1) {
    const [lastStart, lastEnd] = spans[spans.length - 1];
    if (lastEnd - lastStart < MIN_CHUNK_CHARS) {
      spans.pop();
      spans[spans.length - 1][1] = n;
    }
  }
  return spans
    .map(([start, end]) => {
      const raw = text.slice(start, end);
      const trimmed = raw.trim();
      if (trimmed.length < MIN_CHUNK_CHARS && spans.length > 1) return null;
      return { text: trimmed, charStart: start, charEnd: end };
    })
    .filter(Boolean);
}

/**
 * Chunk a document's sections. Each section is chunked independently so a
 * chunk never mixes two headings (or two PDF pages). Returns chunk objects
 * with verbatim text + metadata (no embedding yet).
 */
function chunkDocument(doc) {
  const chunks = [];
  let chunkIndex = 0;
  for (const section of doc.sections) {
    const text = section.text;
    if (!text || !text.trim()) continue;
    const slices = chunkText(text);
    for (const slice of slices) {
      const id = sha256Hex(`${doc.url}\n${chunkIndex}\n${sha256Hex(slice.text)}`).slice(0, 32);
      chunks.push({
        id,
        text: slice.text,
        title: doc.title,
        url: doc.url,
        kind: doc.kind,
        lang: doc.lang,
        section: section.heading || '',
        chunk_index: chunkIndex,
        ...(section.page ? { page: section.page } : {}),
        text_source: doc.textSource,
        char_start: slice.charStart,
        source_file: doc.sourceFile,
      });
      chunkIndex += 1;
    }
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Keyword extraction (lexical fallback: titles + key terms only, no full text)
// ---------------------------------------------------------------------------

function tokenizeWords(text) {
  return text.match(/[\p{L}\p{N}]+/gu) || [];
}

function isStopword(token) {
  const lower = token.toLowerCase();
  if (ARABIC_RE.test(token)) return STOP_AR.has(token);
  return STOP_EN.has(lower) || STOP_FR.has(lower);
}

function keepToken(token) {
  if (/^\d+$/.test(token)) return false;
  if (ARABIC_RE.test(token)) return token.length >= 2 && !isStopword(token);
  return token.length >= 3 && !isStopword(token);
}

/**
 * Ordered, de-duplicated keywords: title terms first, then tags, then the
 * most frequent body terms (from a bounded sample), then heading terms to
 * fill any remaining slots. Headings come LAST because the section headings
 * repeat identically across hundreds of pages (e.g. التعريف/الأعراض) and
 * would otherwise crowd out the distinctive terms. No invented terms —
 * every keyword occurs verbatim in the document.
 * (Badge field labels الأنواع/الموضوع are stopwords: they repeat on every
 * article page; the values after them — species/topics — are kept.)
 */
function extractKeywords(doc) {
  const seen = new Set();
  const keywords = [];
  const push = (token) => {
    const key = ARABIC_RE.test(token) ? token : token.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    keywords.push(token);
  };
  for (const field of [doc.title, doc.titleEn || '', ...(doc.tags || [])]) {
    for (const token of tokenizeWords(field)) {
      if (keepToken(token)) push(token);
      if (keywords.length >= LEXICAL_KEYWORD_CAP) return keywords;
    }
  }
  // Frequency terms from a bounded sample of the body text.
  const body = doc.sections.map((s) => s.text).join('\n').slice(0, KEYWORD_SAMPLE_CHARS);
  const counts = new Map();
  const firstSeen = new Map();
  tokenizeWords(body).forEach((token, i) => {
    if (!keepToken(token)) return;
    const key = ARABIC_RE.test(token) ? token : token.toLowerCase();
    if (!counts.has(key)) {
      counts.set(key, 0);
      firstSeen.set(key, i);
      counts.set(`${key}\u0000form`, token);
    }
    counts.set(key, counts.get(key) + 1);
  });
  const ranked = [...counts.keys()]
    .filter((k) => !k.includes('\u0000'))
    .sort((a, b) => counts.get(b) - counts.get(a) || firstSeen.get(a) - firstSeen.get(b));
  for (const key of ranked) {
    push(counts.get(`${key}\u0000form`));
    if (keywords.length >= LEXICAL_KEYWORD_CAP) break;
  }
  if (keywords.length >= LEXICAL_KEYWORD_CAP) return keywords;
  for (const section of doc.sections) {
    for (const token of tokenizeWords(section.heading || '')) {
      if (keepToken(token)) push(token);
      if (keywords.length >= LEXICAL_KEYWORD_CAP) return keywords;
    }
  }
  return keywords;
}

// ---------------------------------------------------------------------------
// HTML parsing (dependency-free; templates are uniform: h1 + h2 sections + p)
// ---------------------------------------------------------------------------

/**
 * Parse one article/disease page. Boilerplate is dropped: <head> (after
 * title/lang), scripts/styles, nav (.top/.nav), related links (.rel),
 * the repeated disclaimer (.warn), and <footer>. Badges and the English
 * name paragraph feed keywords/titles, not chunks.
 */
function parseHtmlDoc(html, fallbackTitle) {
  const langMatch = html.match(/<html[^>]*\blang=["']?([a-zA-Z-]+)/i);
  const htmlLang = langMatch ? langMatch[1].toLowerCase().slice(0, 2) : null;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? stripTags(titleMatch[1]) : '';

  let body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    // Boilerplate blocks (no nested <div> inside any of them in this corpus).
    .replace(/<div[^>]*class="[^"]*\b(top|nav|rel|warn)\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ');

  // Badges (articles): "الأنواع: ..." / "الموضوع: ..." — keywords only.
  const tags = [];
  for (const m of body.matchAll(/<span[^>]*class="[^"]*\bbadge\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)) {
    const t = stripTags(m[1]);
    if (t) tags.push(t);
  }
  body = body.replace(/<span[^>]*class="[^"]*\bbadge\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, ' ');

  // English name paragraph (diseases): <p class="en">Anthrax</p>
  let titleEn = '';
  const enMatch = body.match(/<p[^>]*class="[^"]*\ben\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (enMatch) titleEn = stripTags(enMatch[1]);

  let h1 = '';
  const sections = [];
  let current = null;
  const ensureSection = (heading) => {
    current = { heading, paragraphs: [] };
    sections.push(current);
    return current;
  };
  ensureSection('');

  const tokenRe = /<(h1|h2|p|li)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = tokenRe.exec(body)) !== null) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';
    const inner = m[3];
    if (tag === 'h1') {
      if (!h1) h1 = stripTags(inner);
      continue;
    }
    if (/\bclass="[^"]*\b(top|en)\b/.test(attrs)) continue; // nav / english-name
    const text = stripTags(inner);
    if (!text) continue;
    if (tag === 'h2') {
      ensureSection(text);
    } else {
      current.paragraphs.push(text);
    }
  }

  const title = h1 || rawTitle.replace(/\s*[—–|-].*$/, '').trim() || fallbackTitle;
  const built = sections
    .map((s) => ({ heading: s.heading, text: collapseWhitespace(s.paragraphs.join('\n\n')) }))
    .filter((s) => s.text.length > 0);
  return { title, titleEn, tags, sections: built, htmlLang };
}

function collectHtmlDocs(root, dirName, kind, sourceLabel) {
  const dir = path.join(root, dirName);
  const docs = [];
  const skipped = [];
  if (!existsSync(dir)) return { docs, skipped };
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.html')).sort();
  for (const file of files) {
    if (file.toLowerCase() === 'index.html') {
      skipped.push(`${dirName}/${file} (listing page, not content)`);
      continue;
    }
    const full = path.join(dir, file);
    const html = readFileSync(full, 'utf8');
    const parsed = parseHtmlDoc(html, file.replace(/\.html$/i, ''));
    const url = `${dirName}/${file}`;
    const sample = parsed.sections.map((s) => s.text).join('\n').slice(0, 2000);
    docs.push({
      source: sourceLabel,
      sourceFile: url,
      kind,
      title: parsed.title,
      titleEn: parsed.titleEn || undefined,
      tags: parsed.tags,
      url,
      lang: parsed.htmlLang || detectLang(sample),
      sections: parsed.sections,
      textSource: 'fulltext',
    });
  }
  return { docs, skipped };
}

// ---------------------------------------------------------------------------
// JSON records (json/resources.json + json/articles.json)
// ---------------------------------------------------------------------------

function collectResources(root) {
  const file = path.join(root, 'json', 'resources.json');
  const docs = [];
  if (!existsSync(file)) return { docs, skipped: ['json/resources.json (missing)'] };
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const addRecord = (rec, sectionHeading) => {
    const title = String(rec.title || '').trim();
    const url = String(rec.url || '').trim();
    if (!title || !url) return;
    const desc = String(rec.desc || '').trim();
    const text = collapseWhitespace(desc ? `${title}\n\n${desc}` : title);
    docs.push({
      source: 'json/resources.json',
      sourceFile: 'json/resources.json',
      kind: 'resource',
      title,
      url, // verbatim source URL (usually external) — see header note
      lang: detectLang(text),
      sections: [{ heading: sectionHeading || '', text }],
      textSource: 'fulltext',
    });
  };
  for (const rec of data.books || []) addRecord(rec, '');
  for (const rec of data.journals || []) addRecord(rec, '');
  for (const group of data.communities || []) {
    for (const rec of group.items || []) addRecord(rec, String(group.group || ''));
  }
  return { docs, skipped: [] };
}

function collectJsonArticles(root) {
  const file = path.join(root, 'json', 'articles.json');
  const docs = [];
  const skipped = [];
  if (!existsSync(file)) return { docs, skipped: ['json/articles.json (missing)'] };
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const item of data.items || []) {
    // Exclude the sample/placeholder record and anything not approved:
    // it carries example.com links and lorem-style titles.
    if (item.is_sample || item.status !== 'approved') {
      skipped.push(`json/articles.json:${item.id || '?'} (sample or not approved)`);
      continue;
    }
    const title = String(item.title_ar || item.title_en || '').trim();
    const url = String(item.source_url || '').trim();
    if (!title || !url) {
      skipped.push(`json/articles.json:${item.id || '?'} (missing title/url)`);
      continue;
    }
    const parts = [item.title_ar, item.title_en, item.summary_ar, item.summary_en]
      .map((s) => String(s || '').trim())
      .filter(Boolean);
    const text = collapseWhitespace(parts.join('\n\n'));
    docs.push({
      source: 'json/articles.json',
      sourceFile: 'json/articles.json',
      kind: 'article',
      title,
      url, // verbatim external source URL — see header note
      lang: detectLang(text),
      sections: [{ heading: '', text }],
      textSource: 'fulltext',
    });
  }
  return { docs, skipped };
}

// ---------------------------------------------------------------------------
// Books (books/*.pdf): SHA-256 dedupe, canonical naming, pdftotext extraction
// ---------------------------------------------------------------------------

function filenameToTitle(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Canonical copy of a byte-duplicate group: most hyphen segments, then longest, then A-Z. */
function pickCanonical(filenames) {
  return [...filenames].sort((a, b) => {
    const seg = b.split('-').length - a.split('-').length;
    if (seg !== 0) return seg;
    if (b.length !== a.length) return b.length - a.length;
    return a.localeCompare(b);
  })[0];
}

function listPdfGroups(root) {
  const dir = path.join(root, 'books');
  const groups = new Map(); // sha256 -> { files: [names], bytes }
  const files = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort()
    : [];
  for (const file of files) {
    const full = path.join(dir, file);
    const hash = createHash('sha256').update(readFileSync(full)).digest('hex');
    if (!groups.has(hash)) groups.set(hash, { files: [], bytes: statSync(full).size });
    groups.get(hash).files.push(file);
  }
  return { dir, groups, fileCount: files.length };
}

function txtPathFor(booksTextDir, pdfFilename) {
  const base = pdfFilename.replace(/\.[^.]+$/, '');
  return path.join(booksTextDir, `${base}.txt`);
}

/**
 * Run pdftotext -layout for each canonical PDF missing a fresh .txt cache.
 * Returns { extracted, skippedFresh, failed: [] }. Throws if pdftotext is
 * missing (caller decides: fatal in --extract-pdfs mode).
 */
async function extractPdfs(root, booksTextDir, log) {
  const { dir, groups } = listPdfGroups(root);
  mkdirSync(booksTextDir, { recursive: true });
  let extracted = 0;
  let skippedFresh = 0;
  const failed = [];
  const canonicals = [];
  for (const [, group] of groups) {
    if (group.files.some((f) => /NOT-A-BOOK/i.test(f))) continue; // excluded, never extracted
    canonicals.push(pickCanonical(group.files));
  }
  canonicals.sort((a, b) => a.localeCompare(b));
  for (const canonical of canonicals) {
    const pdfPath = path.join(dir, canonical);
    const txtPath = txtPathFor(booksTextDir, canonical);
    if (existsSync(txtPath) && statSync(txtPath).mtimeMs >= statSync(pdfPath).mtimeMs) {
      skippedFresh += 1;
      continue;
    }
    try {
      await execFileAsync('pdftotext', ['-layout', pdfPath, txtPath], { timeout: 300000 });
      extracted += 1;
      log(`  extracted: ${canonical}`);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        throw new Error(
          'pdftotext not found. Install poppler-utils (apt/brew) or drop pre-extracted .txt files into --books-text-dir. No book text was indexed.',
        );
      }
      failed.push(`${canonical}: ${String(err && err.message ? err.message : err).slice(0, 160)}`);
    }
  }
  return { extracted, skippedFresh, failed };
}

function normalizePdfPage(raw) {
  // pdftotext -layout pads table columns with wide spaces; collapse runs.
  return raw.replace(/[ \t\u00A0]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function collectBooks(root, booksTextDir) {
  const { groups, fileCount } = listPdfGroups(root);
  const docs = [];
  const skipped = [];
  const duplicates = [];
  let excludedNotABook = 0;
  let fulltext = 0;
  let metadataOnly = 0;
  let totalPages = 0;
  let pagesWithText = 0;

  const ordered = [...groups.values()]
    .map((g) => ({ canonical: pickCanonical(g.files), aliases: g.files.filter((f) => f !== pickCanonical(g.files)) }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical));

  for (const { canonical, aliases } of ordered) {
    for (const alias of aliases) duplicates.push(`${alias} (duplicate of ${canonical})`);
    if ([canonical, ...aliases].some((f) => /NOT-A-BOOK/i.test(f))) {
      excludedNotABook += 1;
      skipped.push(`${canonical} (+${aliases.length} alias) — filename labelled NOT-A-BOOK, excluded`);
      continue;
    }
    const title = filenameToTitle(canonical);
    const url = `books/${encodeURIComponent(canonical)}`;
    let sections = null;
    let textSource = 'metadata';
    let pageCount = 0;
    let pagesKept = 0;
    const txtPath = booksTextDir ? txtPathFor(booksTextDir, canonical) : null;
    if (txtPath && existsSync(txtPath)) {
      const raw = readFileSync(txtPath, 'utf8');
      const rawPages = raw.split('\f');
      const pages = [];
      rawPages.forEach((rawPage, i) => {
        const text = normalizePdfPage(rawPage);
        const nonSpace = text.replace(/\s+/g, '').length;
        if (nonSpace >= MIN_PAGE_TEXT_CHARS) {
          pages.push({ heading: '', page: i + 1, text });
        }
      });
      pageCount = rawPages.filter((p) => p.trim().length > 0 || p === '').length;
      const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
      if (totalChars >= MIN_BOOK_TEXT_CHARS && pages.length > 0) {
        sections = pages;
        textSource = 'fulltext';
        pagesKept = pages.length;
        fulltext += 1;
      }
    }
    if (!sections) {
      metadataOnly += 1;
      sections = [{ heading: '', text: title }];
    }
    totalPages += pageCount;
    pagesWithText += pagesKept;
    const sample = sections.map((s) => s.text).join('\n').slice(0, 5000);
    docs.push({
      source: 'books/*.pdf',
      sourceFile: `books/${canonical}`,
      kind: 'book',
      title,
      url,
      lang: detectLang(sample),
      sections,
      textSource,
    });
  }

  return {
    docs,
    skipped,
    duplicates,
    bookStats: {
      pdfFiles: fileCount,
      uniqueContents: groups.size,
      duplicatesSkipped: duplicates.length,
      excludedNotABook,
      booksIndexed: docs.length,
      fulltext,
      metadataOnly,
      pdfPagesApprox: totalPages,
      pagesWithText,
    },
  };
}

// ---------------------------------------------------------------------------
// Lexical fallback file + run statistics
// ---------------------------------------------------------------------------

function buildLexicalEntries(docs) {
  return docs.map((doc) => {
    const entry = {
      title: doc.title,
      url: doc.url,
      kind: doc.kind,
      lang: doc.lang,
      keywords: extractKeywords(doc),
    };
    if (doc.titleEn) entry.title_en = doc.titleEn;
    if (/^https?:\/\//.test(doc.url)) entry.external = true;
    return entry;
  });
}

function summarizeSource(docs, chunks) {
  const sourceChars = docs.reduce(
    (sum, d) => sum + d.sections.reduce((s, sec) => s + sec.text.length, 0),
    0,
  );
  const chunkChars = chunks.reduce((sum, c) => sum + c.text.length, 0);
  const estTokens = chunks.reduce((sum, c) => sum + estimateTokens(c.text), 0);
  return { docs: docs.length, chunks: chunks.length, sourceChars, chunkChars, estTokens: Math.round(estTokens) };
}

// ---------------------------------------------------------------------------
// Checkpoint (resume): JSON { version, model, index, namespace, done: [ids] }
// ---------------------------------------------------------------------------

function loadCheckpoint(checkpointPath, model, index, namespace) {
  if (!checkpointPath || !existsSync(checkpointPath)) return new Set();
  const data = JSON.parse(readFileSync(checkpointPath, 'utf8'));
  if (data.version !== 1 || data.model !== model || data.index !== index || (data.namespace || '') !== (namespace || '')) {
    throw new Error(
      `Checkpoint ${checkpointPath} belongs to a different model/index/namespace ` +
        `(model=${data.model}, index=${data.index}). Delete it or use --checkpoint <new path> to start fresh; refusing to mix runs.`,
    );
  }
  return new Set(Array.isArray(data.done) ? data.done : []);
}

function saveCheckpoint(checkpointPath, model, index, namespace, doneSet) {
  if (!checkpointPath) return;
  const payload = {
    version: 1,
    model,
    index,
    namespace: namespace || '',
    updated_at: new Date().toISOString(),
    done: [...doneSet].sort(),
  };
  const tmp = `${checkpointPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(payload));
  renameSync(tmp, checkpointPath);
}

// ---------------------------------------------------------------------------
// Cloudflare REST clients (Workers AI embeddings + Vectorize upsert)
// ---------------------------------------------------------------------------

class FatalApiError extends Error {}

function isAllocationExhausted(bodyText) {
  return /daily free allocation|used up.*neurons|10,?000 neurons|error code: ?(4006|3036)/i.test(bodyText || '');
}

/** fetch with exponential backoff on 429/5xx + network errors. Never logs auth headers. */
async function fetchWithRetry(url, options, label) {
  const maxAttempts = 5;
  let lastError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const bodyText = (await res.text()).slice(0, 500);
      if (isAllocationExhausted(bodyText)) {
        throw new FatalApiError(
          `${label} failed: daily free Neurons allocation exhausted (Cloudflare error). ` +
            `Checkpoint preserved — re-run tomorrow (resets 00:00 UTC) or upgrade to Workers Paid. Body: ${bodyText}`,
        );
      }
      const retryable = res.status === 429 || res.status >= 500;
      lastError = new Error(`${label} failed: HTTP ${res.status}. Body: ${bodyText}`);
      if (!retryable) throw lastError;
    } catch (err) {
      if (err instanceof FatalApiError) throw err;
      lastError = err;
      // Network errors are retryable; HTTP 4xx errors thrown above are not
      // retried (they re-throw immediately via the non-retryable branch only
      // when constructed there — distinguish by message prefix).
      if (err instanceof Error && /HTTP 4\d\d/.test(err.message) && !/HTTP 429/.test(err.message)) throw err;
    }
    if (attempt < maxAttempts - 1) {
      const delay = 1000 * 2 ** attempt + Math.floor(Math.random() * 500);
      console.error(`  retry ${label} in ${delay}ms (attempt ${attempt + 1}/${maxAttempts}): ${lastError.message.slice(0, 160)}`);
      await sleep(delay);
    }
  }
  throw lastError;
}

/** Embed a batch of texts. Returns an array of number[] vectors, same order. */
async function embedBatch({ accountId, apiToken, model, texts }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts }),
    },
    'Workers AI embedding',
  );
  const json = await res.json();
  const result = json && json.result !== undefined ? json.result : json;
  let data = result && result.data !== undefined ? result.data : result;
  if (!Array.isArray(data)) throw new Error(`Unexpected embedding response shape: ${JSON.stringify(json).slice(0, 200)}`);
  // Single-string responses return one flat vector; normalise to [vector].
  if (data.length > 0 && typeof data[0] === 'number') data = [data];
  if (data.length !== texts.length) {
    throw new Error(`Embedding count mismatch: sent ${texts.length}, received ${data.length}`);
  }
  return data;
}

/** Upsert one NDJSON batch to Vectorize. Returns the mutationId (if any). */
async function upsertBatch({ accountId, apiToken, indexName, operation, vectors }) {
  const ndjson = vectors.map((v) => JSON.stringify(v)).join('\n');
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${encodeURIComponent(indexName)}/${operation}`;
  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/x-ndjson' },
      body: ndjson,
    },
    `Vectorize ${operation}`,
  );
  const json = await res.json().catch(() => ({}));
  return (json && json.result && json.result.mutationId) || '';
}

function toVector(chunk, values, namespace) {
  const metadata = {
    title: chunk.title,
    url: chunk.url,
    kind: chunk.kind,
    lang: chunk.lang,
    section: chunk.section,
    chunk_index: chunk.chunk_index,
    text: chunk.text,
    text_source: chunk.text_source,
  };
  if (chunk.page) metadata.page = chunk.page;
  const vector = { id: chunk.id, values, metadata };
  if (namespace) vector.namespace = namespace;
  return vector;
}

// ---------------------------------------------------------------------------
// Cost estimate (uses the pricing-page rates in the header; re-check them)
// ---------------------------------------------------------------------------

function estimateCost({ estTokens, totalChunks, model, expectedDims, neuronRateOverride }) {
  const neuronsPerM = neuronRateOverride || KNOWN_NEURON_RATES[model] || null;
  const neurons = neuronsPerM === null ? null : (estTokens / 1_000_000) * neuronsPerM;
  const storedDims = totalChunks * expectedDims;
  return {
    embeddingModel: model,
    estInputTokens: Math.round(estTokens),
    neuronsPerMillionTokens: neuronsPerM,
    estNeurons: neurons === null ? null : Math.round(neurons),
    freeNeuronsPerDay: FREE_NEURONS_PER_DAY,
    fitsOneFreeDay: neurons === null ? null : neurons <= FREE_NEURONS_PER_DAY,
    freeDaysNeeded: neurons === null ? null : Math.max(1, Math.ceil(neurons / FREE_NEURONS_PER_DAY)),
    // Cost if everything ran on one Paid day (first 10k neurons free that day).
    estPaidCostUsdOneDay: neurons === null ? null : Math.max(0, neurons - FREE_NEURONS_PER_DAY) * (NEURON_PRICE_PER_1000 / 1000),
    vectorizeStoredDims: storedDims,
    vectorizeFreeStoredDims: VECTORIZE_FREE_STORED_DIMS,
    fitsVectorizeFreeStorage: storedDims <= VECTORIZE_FREE_STORED_DIMS,
    // Storage overage on Paid (first 10M stored dims included, then $0.05/100M).
    estVectorizeStorageOverageUsdPerMonth: Math.max(0, storedDims - VECTORIZE_PAID_INCLUDED_STORED_DIMS) * (0.05 / 100_000_000),
    note: neuronsPerM === null
      ? `No known neuron rate for ${model}; cost estimate unavailable — check https://developers.cloudflare.com/workers-ai/platform/pricing/`
      : 'Estimates only. Token counts use chars/4 (Latin) + Arabic-chars/2.5. Query-time dims/costs are excluded.',
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`Usage: node tools/build-rag-index.mjs [flags]

  --root <dir>           Repo root (default: parent of this script's dir)
  --dry-run              Parse + chunk + count only; no API calls
  --limit N              Embed/upsert at most N chunks
  --lexical-out <path>   Write the lexical fallback JSON file
  --chunks-out <path>    Write all chunks as JSONL (inspection/debug)
  --stats-out <path>     Write the JSON run summary
  --checkpoint <path>    Checkpoint file (default ./.rag-index-checkpoint.json)
  --no-checkpoint        Do not read/write a checkpoint
  --books-text-dir <dir> Extracted PDF .txt directory (default ./.rag-pdf-text)
  --extract-pdfs         Run pdftotext into --books-text-dir first
  --embed-batch N        Texts per embedding request (default 16)
  --upsert-batch N       Vectors per Vectorize request (default 500)
  --vectorize-op <op>    insert | upsert (default upsert)
  --help                 Show this help

Live runs need: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, VECTORIZE_INDEX_NAME.
Optional: RAG_EMBED_MODEL (default @cf/baai/bge-m3), RAG_EXPECTED_DIMS (1024),
RAG_NAMESPACE, RAG_NEURONS_PER_M_TOKENS. See the script header for full docs.`);
}

function parseArgs(argv) {
  const opts = {
    root: null,
    dryRun: false,
    limit: null,
    lexicalOut: null,
    chunksOut: null,
    statsOut: null,
    checkpoint: path.join(process.cwd(), '.rag-index-checkpoint.json'),
    useCheckpoint: true,
    booksTextDir: null,
    extractPdfs: false,
    embedBatch: 16,
    upsertBatch: 500,
    vectorizeOp: 'upsert',
  };
  const takeValue = (flag, i) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`Flag ${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--no-checkpoint') opts.useCheckpoint = false;
    else if (a === '--extract-pdfs') opts.extractPdfs = true;
    else if (a === '--root') opts.root = takeValue(a, i++);
    else if (a === '--limit') opts.limit = Number.parseInt(takeValue(a, i++), 10);
    else if (a === '--lexical-out') opts.lexicalOut = takeValue(a, i++);
    else if (a === '--chunks-out') opts.chunksOut = takeValue(a, i++);
    else if (a === '--stats-out') opts.statsOut = takeValue(a, i++);
    else if (a === '--checkpoint') opts.checkpoint = takeValue(a, i++);
    else if (a === '--books-text-dir') opts.booksTextDir = takeValue(a, i++);
    else if (a === '--embed-batch') opts.embedBatch = Number.parseInt(takeValue(a, i++), 10);
    else if (a === '--upsert-batch') opts.upsertBatch = Number.parseInt(takeValue(a, i++), 10);
    else if (a === '--vectorize-op') opts.vectorizeOp = takeValue(a, i++);
    else throw new Error(`Unknown flag: ${a} (see --help)`);
  }
  if (opts.limit !== null && !(opts.limit > 0)) throw new Error('--limit must be a positive integer');
  if (!(opts.embedBatch > 0)) throw new Error('--embed-batch must be a positive integer');
  if (!(opts.upsertBatch > 0)) throw new Error('--upsert-batch must be a positive integer');
  if (!['insert', 'upsert'].includes(opts.vectorizeOp)) throw new Error('--vectorize-op must be insert or upsert');
  return opts;
}

function defaultRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const root = path.resolve(opts.root || defaultRoot());
  const booksTextDir = opts.booksTextDir
    ? path.resolve(opts.booksTextDir)
    : path.join(process.cwd(), '.rag-pdf-text');
  const booksTextDirInUse = opts.extractPdfs || opts.booksTextDir ? booksTextDir : null;

  const model = process.env.RAG_EMBED_MODEL || DEFAULT_EMBED_MODEL;
  const expectedDims = Number.parseInt(process.env.RAG_EXPECTED_DIMS || String(DEFAULT_EXPECTED_DIMS), 10);
  const namespace = process.env.RAG_NAMESPACE || '';
  const neuronRateOverride = process.env.RAG_NEURONS_PER_M_TOKENS
    ? Number.parseFloat(process.env.RAG_NEURONS_PER_M_TOKENS)
    : null;

  console.log(`VetAI RAG indexer — root: ${root} — mode: ${opts.dryRun ? 'DRY-RUN (no API calls)' : 'LIVE'}`);
  console.log(`Embedding model: ${model} (expected dims ${expectedDims})`);

  // --- 1. Optional PDF extraction (local only; runs in dry-run too) ---
  let extraction = null;
  if (opts.extractPdfs) {
    console.log(`Extracting PDFs with pdftotext into ${booksTextDir} ...`);
    extraction = await extractPdfs(root, booksTextDir, (msg) => console.log(msg));
    console.log(`  extracted=${extraction.extracted} fresh-cache=${extraction.skippedFresh} failed=${extraction.failed.length}`);
    for (const f of extraction.failed) console.error(`  FAILED: ${f}`);
  } else if (booksTextDirInUse) {
    console.log(`Using pre-extracted PDF text from ${booksTextDir} (books without a .txt fall back to metadata-only).`);
    if (!existsSync(booksTextDir)) {
      console.error(`WARNING: --books-text-dir ${booksTextDir} does not exist — all books will fall back to metadata-only.`);
    }
  } else {
    console.log('Books mode: metadata-only (no --books-text-dir / --extract-pdfs).');
  }

  // --- 2. Parse + chunk every source ---
  const articles = collectHtmlDocs(root, 'articles', 'article', 'articles/*.html');
  const diseases = collectHtmlDocs(root, 'diseases', 'disease', 'diseases/*.html');
  const resources = collectResources(root);
  const jsonArticles = collectJsonArticles(root);
  const books = collectBooks(root, booksTextDirInUse);

  const groups = [
    { name: 'articles', ...articles },
    { name: 'diseases', ...diseases },
    { name: 'resources', ...resources },
    { name: 'jsonArticles', ...jsonArticles },
    { name: 'books', docs: books.docs, skipped: books.skipped },
  ];
  const allDocs = groups.flatMap((g) => g.docs);
  const allChunks = [];
  const perSource = {};
  for (const g of groups) {
    const chunks = g.docs.flatMap((d) => chunkDocument(d));
    perSource[g.name] = summarizeSource(g.docs, chunks);
    allChunks.push(...chunks);
  }
  const totals = {
    docs: allDocs.length,
    chunks: allChunks.length,
    sourceChars: Object.values(perSource).reduce((s, p) => s + p.sourceChars, 0),
    chunkChars: Object.values(perSource).reduce((s, p) => s + p.chunkChars, 0),
    estTokens: Object.values(perSource).reduce((s, p) => s + p.estTokens, 0),
  };

  const cost = estimateCost({
    estTokens: totals.estTokens,
    totalChunks: totals.chunks,
    model,
    expectedDims,
    neuronRateOverride,
  });

  // --- 3. Lexical fallback + chunk dump (local outputs; also in dry-run) ---
  if (opts.lexicalOut) {
    const entries = buildLexicalEntries(allDocs);
    const byKind = {};
    for (const e of entries) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    const lexical = {
      version: 1,
      generated_at: new Date().toISOString(),
      generator: 'tools/build-rag-index.mjs',
      docs: entries.length,
      by_kind: byKind,
      note: 'Titles + keywords only (no full text). Keywords occur verbatim in the source document. External URLs are kept verbatim.',
      entries,
    };
    const outPath = path.resolve(opts.lexicalOut);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(lexical)}\n`);
    console.log(`Lexical fallback written: ${outPath} (${entries.length} entries)`);
  }
  if (opts.chunksOut) {
    const outPath = path.resolve(opts.chunksOut);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, allChunks.map((c) => JSON.stringify(c)).join('\n') + (allChunks.length ? '\n' : ''));
    console.log(`Chunk dump written: ${outPath} (${allChunks.length} chunks)`);
  }

  // --- 4. Summary ---
  const stats = {
    generated_at: new Date().toISOString(),
    root,
    mode: opts.dryRun ? 'dry-run' : 'live',
    model,
    expected_dims: expectedDims,
    namespace: namespace || null,
    per_source: perSource,
    totals,
    books: books.bookStats,
    extraction,
    skipped: groups.flatMap((g) => g.skipped),
    duplicate_pdfs_skipped: books.duplicates,
    limit: opts.limit,
    chunks_to_embed: opts.limit === null ? totals.chunks : Math.min(opts.limit, totals.chunks),
    cost_estimate: cost,
  };
  console.log('\n--- COUNTS (exact, from this run) ---');
  for (const [name, s] of Object.entries(perSource)) {
    console.log(`  ${name}: docs=${s.docs} chunks=${s.chunks} sourceChars=${s.sourceChars} chunkChars=${s.chunkChars} estTokens=${s.estTokens}`);
  }
  console.log(`  TOTAL: docs=${totals.docs} chunks=${totals.chunks} sourceChars=${totals.sourceChars} chunkChars=${totals.chunkChars} estTokens=${totals.estTokens}`);
  console.log(`  BOOKS: pdfFiles=${books.bookStats.pdfFiles} unique=${books.bookStats.uniqueContents} duplicatesSkipped=${books.bookStats.duplicatesSkipped} excludedNotABook=${books.bookStats.excludedNotABook} fulltext=${books.bookStats.fulltext} metadataOnly=${books.bookStats.metadataOnly}`);
  console.log('--- COST ESTIMATE ---');
  console.log(`  estNeurons=${cost.estNeurons} (rate ${cost.neuronsPerMillionTokens}/M tokens) — fits one free day (10,000): ${cost.fitsOneFreeDay}; free days needed: ${cost.freeDaysNeeded}; one-day Paid cost above free: $${(cost.estPaidCostUsdOneDay ?? 0).toFixed(4)}`);
  console.log(`  Vectorize stored dims=${cost.vectorizeStoredDims} — fits 5M free storage: ${cost.fitsVectorizeFreeStorage}; Paid storage overage: $${cost.estVectorizeStorageOverageUsdPerMonth.toFixed(4)}/month`);
  console.log(`  ${cost.note}`);
  if (stats.skipped.length > 0) {
    console.log(`--- SKIPPED (${stats.skipped.length}) ---`);
    for (const s of stats.skipped) console.log(`  ${s}`);
  }
  if (opts.statsOut) {
    const outPath = path.resolve(opts.statsOut);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(stats, null, 2)}\n`);
    console.log(`Stats written: ${outPath}`);
  }

  if (opts.dryRun) {
    console.log('\nDry-run complete. No API calls were made, no checkpoint touched.');
    return;
  }

  // --- 5. Live run: env validation (values never printed) ---
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
  const indexName = process.env.VECTORIZE_INDEX_NAME || '';
  const missing = [];
  if (!accountId) missing.push('CLOUDFLARE_ACCOUNT_ID');
  if (!apiToken) missing.push('CLOUDFLARE_API_TOKEN');
  if (!indexName) missing.push('VECTORIZE_INDEX_NAME');
  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}. Aborting before any API call.`);
    process.exit(2);
  }

  const checkpointPath = opts.useCheckpoint ? path.resolve(opts.checkpoint) : null;
  const done = opts.useCheckpoint ? loadCheckpoint(checkpointPath, model, indexName, namespace) : new Set();
  let pending = allChunks.filter((c) => !done.has(c.id));
  if (opts.limit !== null) pending = pending.slice(0, opts.limit);
  console.log(`\nLive run: ${allChunks.length} chunks total, ${done.size} already done (checkpoint), ${pending.length} pending${opts.limit !== null ? ` (--limit ${opts.limit})` : ''}.`);
  if (pending.length === 0) {
    console.log('Nothing to do — all chunks are already indexed.');
    return;
  }

  // --- 6. Embed + upsert in batches, checkpointing after each upsert batch ---
  let embedded = 0;
  let upserted = 0;
  let dimsChecked = false;
  const vectorBuffer = [];
  const flushUpserts = async () => {
    while (vectorBuffer.length > 0) {
      const batch = vectorBuffer.splice(0, opts.upsertBatch);
      const mutationId = await upsertBatch({ accountId, apiToken, indexName, operation: opts.vectorizeOp, vectors: batch });
      for (const v of batch) done.add(v.id);
      upserted += batch.length;
      if (checkpointPath) saveCheckpoint(checkpointPath, model, indexName, namespace, done);
      console.log(`  upserted ${upserted}/${pending.length}${mutationId ? ` (mutation ${mutationId})` : ''}`);
    }
  };

  for (let i = 0; i < pending.length; i += opts.embedBatch) {
    const batch = pending.slice(i, i + opts.embedBatch);
    const vectors = await embedBatch({ accountId, apiToken, model, texts: batch.map((c) => c.text) });
    if (!dimsChecked) {
      const dims = vectors[0] ? vectors[0].length : 0;
      if (dims !== expectedDims) {
        console.error(`Dimension mismatch: model returned ${dims}-dim vectors, expected ${expectedDims} (RAG_EXPECTED_DIMS). Aborting before any upsert — recreate the Vectorize index with the right dimensions or fix the model/dims settings.`);
        process.exit(3);
      }
      dimsChecked = true;
      console.log(`  embedding dims verified: ${dims}`);
    }
    for (let j = 0; j < batch.length; j += 1) {
      vectorBuffer.push(toVector(batch[j], vectors[j], namespace));
    }
    embedded += batch.length;
    if (vectorBuffer.length >= opts.upsertBatch) await flushUpserts();
    if (embedded % (opts.embedBatch * 10) === 0 || embedded === pending.length) {
      console.log(`  embedded ${embedded}/${pending.length}`);
    }
  }
  await flushUpserts();
  console.log(`\nDone: embedded+upserted ${upserted} chunks into Vectorize index "${indexName}" (op=${opts.vectorizeOp}).`);
  console.log('Note: Vectorize writes are asynchronous; allow a few minutes before vectors appear in queries.');
}

main().catch((err) => {
  console.error(`ERROR: ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
