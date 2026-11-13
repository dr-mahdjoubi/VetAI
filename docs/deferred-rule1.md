# Deferred by Rule 1 — Batch F (audit items 1, 2, 3, 5, 6, 34, 40, 41)

Rule 1 of the repair program: lines 1–1612 of `index.html` (everything
above the "ابحث داخل فقرات الموقع" search-bar anchor) must remain
byte-identical. That region contains the whole `<head>` (title, meta/OG
tags, font `<link>` sheets, stylesheet `<link>`s, preconnects) and the top
bar / nav / hero. The sub-tasks below were therefore NOT implemented in
Batch F. Each entry states what was blocked, the evidence, and the exact
future step that would need Noe's explicit approval for a head/top-region
edit. Nothing here is claimed as done.

## 1. Head metadata unification (item 40) — BLOCKED

- NOT done: unifying `title` / `og:title` / description language
  (Arabic-first), adding `og:type` / `og:locale`, touching any `<head>`
  meta tag. All live in the protected region (lines ~14–28).
- What WAS done instead (below the bar): a static `MedicalWebPage`
  JSON-LD block at the end of `<body>`; `FAQPage` was omitted because no
  visible FAQ question/answer pairs exist on the page (see §7).
- Future step (needs Noe's approval for a head edit): set `og:title` to
  the Arabic title, add `og:type=website` and `og:locale=ar_AR`, align
  `meta description` with the visible Arabic description. Verify with a
  head diff + screenshot comparison; no other head line may change.

## 2. Font self-hosting + preconnect/loading changes (items 5, 6) — DEFERRED

Current state (verified from the protected region, audit item 6):

- 6 families / 17 weights from Google Fonts, in 3 render-blocking
  `<link>` sheets (lines ~426–428), all with `display=swap` (good).
- `preconnect` to `fonts.googleapis.com` / `fonts.gstatic.com` sits late
  (line ~424), after a large `<style>` block.
- Zero local font files, zero `@font-face` in the repo.

Why deferred: the font `<link>` sheets and the preconnects are inside
the protected region, so neither self-hosting nor moving the preconnect
earlier can be done without a Rule-1 exception.

Parity-verification plan for the future (no step executed yet):

1. Download the same 6 families in the same 17 weights (WOFF2, same
   subsets Google serves for the page's content), keep
   `font-display: swap` on every `@font-face`.
2. Serve them from a local `fonts/` directory; replace the 3 sheets with
   local `@font-face` rules (or a local CSS file) in one head edit.
3. Verify parity before any deploy: side-by-side screenshots (Arabic +
   EN/FR views) at 360/768/1440, plus geometry comparison of the hero,
   headings and nav (bounding boxes must match within rounding); confirm
   no FOUT regression beyond the current `swap` behaviour.
4. Open question for Noe first: the audit could not prove from the code
   whether Tajawal/Inter are actually used anywhere — do NOT drop a
   family/weight on an assumption; keep all 17 weights unless usage is
   proven otherwise.

## 3. Render-blocking stylesheets (item 3) — BLOCKED

- NOT done: deferring, inlining, or reordering the 12 render-blocking
  stylesheets in `<head>` (9 local + 3 Google Fonts). All are in the
  protected region.
- Tailwind: NO CDN exists — `css/vetai-tw.css` is prebuilt v3.4.17, so
  no CDN replacement was needed or done. The misleading comment
  `<!-- Tailwind CSS CDN -->` at line 28 is in the protected region and
  was LEFT untouched. The one misleading Tailwind sentence that sat
  BELOW the bar (privacy policy, "Tailwind loaded from external
  servers") WAS corrected in Batch F, since the file is local.

## 4. Skip link + header/nav landmarks around the top menu (items 34, 38) — BLOCKED

- NOT done: no skip link, no `<header>`/`<nav>` landmarks around the top
  menu — the menu markup is in the protected region.
- What WAS done instead (below the bar): the three footer link groups
  are now `<nav aria-label="…">` elements (same grid children, same
  styling, no visual change); `<main>` was verified to already exist
  (it opens below the bar); hash-synced active states are handled by
  `js/vetai-router.js` (existing `.active` class on branch buttons +
  `aria-current="page"`).
- Future step (needs Noe's approval): add a skip link as the first
  focusable element and wrap the top menu in `<nav>` — only as a
  separately approved top-region edit, with a focus-order check after.

## 5. Blocking script `js/animal-images.js` (item 2) — BLOCKED

- NOT done: adding `defer` to `js/animal-images.js` (285KB). Its
  `<script src>` tag sits at line 623 — inside the protected region.
- Dependency evidence (for the future edit): the file defines only
  `window.AIMG` (a base64 image map). Its only consumer found by grep is
  `index.html:4941`, a guarded runtime read
  (`window.AIMG && window.AI_SP && AIMG[...]`) inside a render function —
  no inline script reads `AIMG` synchronously at parse time. Deferring
  looks safe on this evidence, but it was NOT done: the tag cannot move
  without a Rule-1 exception, and the runtime behaviour after deferring
  must be re-verified headlessly (animal images render) at that time.
- `js/exams-more.js` (268KB, line 3101, below the bar) was checked and
  deliberately LEFT blocking: the inline merge block at line 3236 reads
  `window.EXMORE` synchronously at parse time, so `defer` would silently
  drop the +476-questions-per-language expansion. See the Batch F report.
- Games code (`newgames-js`, `advgames-js`, `mmgame-js` inline blocks)
  was LEFT inline: no other code references those blocks, but extraction
  would change init timing for ~600 lines of game code plus shared CSS,
  and full regression of all 14 games could not be proven safe in this
  pass. The code is inert until a game is played (timers start on play).

## 6. Full monolith split + old-`#` redirects (item 1) — REMAINDER, NOT DONE

- What exists now: hash routing over the working SPA
  (`js/vetai-router.js`): `#library`, `#diseases`, … deep links,
  back/forward support, and anchor fall-through for element ids inside
  views (including the `#myLib` library-tab-3 case). No view was
  removed, renamed, or reordered.
- NOT done: splitting `index.html` into per-view pages, and redirecting
  old `#` links. A full split in one pass was judged too risky (61
  inline script blocks, 4+ `switchTab` wrappers, shared state).
- Safe next increment (for a future batch): per-view static shells that
  reuse the same sections, one view at a time, each verified headlessly
  before the next; old `#` links keep working through the hash router in
  the meantime. The disease pages (`diseases/<slug>/`) built in Batch F
  are the first standalone pages and the pattern to follow.

## 7. FAQPage JSON-LD (item 40) — OMITTED, no invented content

No visible FAQ question/answer pairs exist on the homepage (the only
"FAQ"/"الأسئلة الشائعة" matches are a base64 image blob, a JS string,
and a section-label array — none of them user-facing Q&A). `FAQPage`
was therefore omitted rather than invented. If Noe supplies real FAQs,
add them as visible page content first, then mirror them in JSON-LD.

## 8. hreflang (items 40, 41) — TODO FOR NOE

No `hreflang` was added anywhere: no alternate-language URLs exist (the
site is one Arabic-first page with runtime EN/FR translation). Adding
`hreflang` without alternate URLs would be invalid. TODO for Noe: decide
whether real per-language URLs should exist; only then can `hreflang`
be added truthfully.
