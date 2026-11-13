# VetAI — Performance Report (WS-5: Perf + Design Staging)

**Program:** VetAI AI-upgrade · **Workstream:** 5 (PERF + DESIGN STAGING)
**Date:** 2026-11-13 · **Base:** branch `feature/ai-rag-backend-2026-11-13`, base `31b90a9`
(as briefed; no git commands were run inside the reference clone, per instructions,
so the commit was not re-verified from the clone itself.)
**Page measured:** homepage `/` (`index.html`) only. No other page was measured.
**Status:** STAGING ONLY. Nothing in this workstream changed `index.html`, changed
any live-facing default, or deployed anything. The reference clone was never written to.

## 0. Verdict (read this first)

- **Real Lighthouse baseline (mobile, simulated throttling): Performance 25/100**
  in two identical-configuration runs. Accessibility 92, Best Practices 96, SEO 100
  in both runs. The performance gap to 99 is **74 points** and is structural, not
  a tuning detail.
- The single page is **1,251,756 bytes of HTML** (6,345 lines) carrying
  **139,536 bytes of inline CSS in 35 `<style>` blocks**, **32 scripts totalling
  ~1 MB**, and a **~8,300-element DOM**. First load transfers **3,440,128 bytes**
  in **110 network records** (91 successful, 19 failed offline — see caveats).
- **Head-only changes cannot reach 99.** Lighthouse's own render-blocking insight
  estimates **1,980–2,390 ms** of savings from eliminating *all* render-blocking
  resources (run 2 – run 1) — against a scored LCP of **18.1–18.9 s** and TBT of
  **16.5–22.0 s**.
  The dominant costs are document size, script execution, and style/layout work
  (37.0 s of throttled main-thread work, of which Style & Layout alone is 14.1 s).
  Section 7 lists the frozen-head changes as **decisions for Noe** (each needs a
  Rule-1 exception); section 8 lists the larger non-head drivers honestly.
- **No "after" score exists.** The other workstreams' code (API, indexer, CPU,
  video) was not assembled with this base at measurement time, so their effect
  could not be measured. Section 9 states only qualitative expectations, labelled
  as such. Nothing in this report is a projected score.
- The staging stylesheet (`../css/vetai-clean.css`) is **inert unless loaded**:
  no `<link>` for it exists anywhere in the repo (verified by grep), and it only
  applies when the gated `?clean=1` loader (section 6) injects it. It was
  verified by static checks plus a 10/10 computed-style probe (section 5).

## 1. Method, environment, and caveats

### 1.1 What was measured, and how

1. A **local copy** of the reference clone was made with hardlinks
   (`cp -al`, same inode — zero extra bytes, byte-identical, verified with
   `diff -q`) into `ws-5/.serve-copy/` (removed after measurement; see §10).
   Nothing was written inside the reference clone.
2. The copy was served with `python3 -m http.server 8471 --bind 127.0.0.1`
   (no compression, no cache headers — a local-server artifact, §1.3).
3. **Lighthouse 13.6.0** (pinned, `npx -y lighthouse@13.6.0`) with an **isolated
   npm cache** (`NPM_CONFIG_CACHE=/tmp/npm-cache-ws5`), `--chrome-path` pointing
   at the headless shell below, fresh Lighthouse profile per run, default mobile
   emulation (Moto G Power class) with **simulated throttling**
   (RTT 150 ms, throughput 1,638.4 Kbps, 4× CPU slowdown), categories
   performance/accessibility/best-practices/seo. Two runs, identical command
   (run 2 JSON-only; run 1 JSON+HTML). Exact commands: Appendix A.
4. **CDP complement** (3 runs, unthrottled, fresh profile each): a dependency-free
   Node harness (`../tools/cdp-timing.mjs`) driving the same headless shell over
   the DevTools protocol, recording Navigation Timing + per-request encoded bytes.
   This corroborates byte totals independently and supplies trustworthy
   DOMContentLoaded / load timings (see §4.3 on why Lighthouse's own observed
   DCL values were not used).

### 1.2 Environment (exact)

| Item | Value |
|---|---|
| Browser | `chrome-headless-shell` 156.0.8078.4 (`~/.cache/ms-playwright/chromium_headless_shell-1248/...`) |
| Lighthouse | 13.6.0 (npm `latest` on 2026-11-13) |
| Node / npm | v24.22.1 / 10.9.4 |
| Server | `python3 -m http.server`, `http://127.0.0.1:8471/` |
| CPU | Shared VM, 1.5 shared CPUs (Lighthouse emitted the slow-CPU warning in both runs) |
| Network | Localhost (RTT ~0 ms, root document 8–10 ms server response) |

### 1.3 Caveats — read before quoting any number

> **These scores describe this offline local setup, not production.**
> 1. **Offline failures (19 requests, 0 bytes).** The headless shell cannot reach
>    the internet (`ERR_TUNNEL_CONNECTION_FAILED`). All 3 Google Fonts stylesheets
>    and 16 external fetches (3 RSS feeds + 1 counter + 12 proxy attempts) failed.
>    Consequences: **zero font bytes** were downloaded (production font cost is
>    unmeasured here); the failing font stylesheets still stall rendering until
>    they fail (~780 ms wasted each per the render-blocking insight); and the
>    Best Practices score loses its only failing audit (`errors-in-console`) to
>    these network errors alone — in production it would likely read 100.
> 2. **Localhost flatters the network.** Real users pay DNS + TLS + round-trips
>    and real-world latency; the scored metrics use simulated throttling to
>    compensate, but TTFB/server-response figures here (8–10 ms) are meaningless
>    for production.
> 3. **No compression locally.** The local server sent everything uncompressed
>    (Lighthouse notes "No compression applied", 838,677 uncompressed bytes on
>    the checked resource). Production (Cloudflare Worker / Render) may compress;
>    **production compression and caching were not measured** and no savings are
>    claimed for them.
> 4. **Slow-CPU warning.** Lighthouse warned in both runs that the test device is
>    slower than expected, which depresses the performance score. Absolute
>    throttled timings (TTI, TBT) vary run to run (TTI 29.0 s → 34.9 s) on this
>    shared CPU; **byte totals and category scores were identical across runs**
>    and are the stable findings. Treat throttled timings as order-of-magnitude,
>    not precision, figures.
> 5. **Homepage only, cold load, empty cache.** Repeat-visit / service-worker
>    behaviour was not measured (fresh profile each run; the page does register
>    `sw.js` on localhost, but a fresh profile has no cached worker on first load).
> 6. **No `?clean=1` measurement.** The staging stylesheet was not loaded during
>    any run (it is not linked). Its runtime cost is one extra ~8 KB stylesheet
>    when — and only when — the gate loads it; that gated-load cost was not
>    measured because the loader snippet has not been applied to any page.

## 2. Lighthouse outcome

### 2.1 Attempt 1 — FAILED (exact error, and the fix)

The first invocation (without `CHROME_PATH`, `--chrome-path` flag only) failed
before any measurement:

```text
Runtime error encountered: The CHROME_PATH environment variable must be set to a
Chrome/Chromium executable no older than Chrome stable.
Error
    at new LauncherError (.../chrome-launcher/dist/utils.js:28:22)
    at new ChromePathNotSetError (.../chrome-launcher/dist/utils.js:34:9)
    at Module.linux (.../chrome-launcher/dist/chrome-finder.js:124:15)
    ...
LIGHTHOUSE-EXIT:1
```

Full log: `measure/lighthouse-stdout.log`. **Fix that worked:** export
`CHROME_PATH` to the headless-shell binary *in addition to* passing
`--chrome-path`. All successful runs below used both. Reproducers must set
`CHROME_PATH` or they will hit the same failure with Lighthouse 13.6.0.

### 2.2 Successful runs — real scores

| Category | Run 1 (11:32 UTC) | Run 2 (11:37 UTC) |
|---|---:|---:|
| **Performance** | **25 / 100** | **25 / 100** |
| Accessibility | 92 / 100 | 92 / 100 |
| Best Practices | 96 / 100 | 96 / 100 |
| SEO | 100 / 100 | 100 / 100 |

| Metric (scored, simulated throttling) | Run 1 | Run 2 |
|---|---:|---:|
| First Contentful Paint | 9.6 s | 9.5 s |
| Largest Contentful Paint | 18.1 s | 18.9 s |
| Speed Index | 17.6 s | 21.0 s |
| Time to Interactive | 29.0 s | 34.9 s |
| Total Blocking Time | 16,500 ms | 22,030 ms |
| Cumulative Layout Shift | 0.039 (score 0.99) | 0.039 (score 0.99) |
| Max Potential First Input Delay | 3,130 ms | 4,400 ms |

Raw artifacts: `measure/lighthouse-baseline.report.json`,
`measure/lighthouse-baseline.report.html` (run 1),
`measure/lighthouse-baseline-run2` (run 2 JSON, no extension — that is the
literal filename Lighthouse wrote for a single JSON output),
`measure/lighthouse-stdout-2.log`, `measure/lighthouse-stdout-run2.log`.

**Reading the scores.** CLS (0.039) is the only metric near target — layout
stability is genuinely good. Every other scored metric scores 0. The run-to-run
spread in TTI/TBT/Speed Index is CPU noise on the shared VM (§1.3.4); the
stability of the category scores and byte totals across runs is what makes 25
a trustworthy baseline *for this environment*.

### 2.3 What the other categories actually fail

- **Accessibility 92** — four failing audits, all score 0: `color-contrast`,
  `heading-order`, `target-size`, `label-content-name-mismatch`. Everything else
  passed or was manual/informative. Note: `color-contrast` cannot be fixed
  without colour changes, which this workstream is forbidden to make; it is a
  design decision for Noe (§7, note N3), not a staging-CSS fix.
- **Best Practices 96** — the *only* failing audit is `errors-in-console`, and
  every console error is one of the 19 offline network failures
  (`ERR_TUNNEL_CONNECTION_FAILED`). This is a measurement artifact, not a page
  defect. No other best-practice audit failed.
- **SEO 100** — no failing audits (`structured-data` is manual/informative only).
  Meta description (line 668), canonical, Open Graph, `lang="ar"`, viewport,
  and charset are all present and valid.

### 2.4 LCP element (identified, not guessed)

Lighthouse's LCP-breakdown insight names the LCP element as the text heading
`section#view-home > section.vg-global-intro > div.vg-cine-copy > h2#vg-global-title`.
Its observed-trace breakdown is: time-to-first-byte **99 ms** + element render
delay **8,216 ms**. LCP here is a *text* element gated by render delay
(parser-blocking resources, style/layout, webfont behaviour) — not by the hero
image, even though a hero-image preload exists (line 30). Font decisions (§7 D3)
therefore bear directly on LCP in production, where fonts actually download.

## 3. Page-weight inventory (all numbers measured, both methods agree)

Byte totals were **identical** in both Lighthouse runs and in all three CDP runs:
**3,440,128 bytes** transferred. The two independent harnesses agree to the byte
on every category below, which is the strongest cross-check in this report.

### 3.1 The document itself

| Fact | Value | How verified |
|---|---:|---|
| `index.html` on disk | **1,251,756 bytes**, 6,345 lines | `wc -c` / `wc -l` on the reference clone (read-only) |
| Document transfer (first load) | 1,251,946 bytes | Lighthouse + CDP (file bytes + HTTP headers) |
| Share of total first-load weight | **36.4%** | 1,251,946 / 3,440,128 |
| `<head>` (lines 1–1548, through `</head>`) | 142,998 bytes | char offset of `</head>` |
| Frozen zone (lines 1–1612) | 150,794 bytes | sum of line lengths + newlines |
| Inline CSS in `<head>` | **139,536 bytes in 35 `<style>` blocks** (largest single block: 40,247 bytes) | parsed from the head, block by block |
| Inline scripts in `<head>` | 2,536 bytes in 5 blocks (lang switch, `js` class, endpoint config, news-strip fold, JSON-LD 1,517 bytes) | parsed from the head, block by block |

### 3.2 First-load weight by type

| Type | Requests | Transfer (bytes) | Notes |
|---|---:|---:|---|
| Document (HTML) | 1 | 1,251,946 | §3.1 |
| Script | 32 | 1,013,848 | 29 static `<script src>` tags + 3 runtime-injected (§3.4) |
| Image (network) | 19 | **947,802** | WebP 852,933 + JPEG 94,869; see §3.3 |
| JSON / fetch (local) | 19 | 165,690 | 19 local fetches; includes duplicates (§3.5) |
| Stylesheet (local) | 9 | 60,842 | On-disk total 59,166 bytes; rest is headers |
| Stylesheet (Google Fonts) | 3 | 0 | Failed offline — production cost unmeasured |
| External fetch (RSS/proxies/counter) | 16 | 0 | Failed offline — production cost unmeasured |
| **Total (Lighthouse resource summary)** | **99** | **3,440,128** | Counts network resources; see counting note |
| **Total (network records observed)** | **110** | **3,440,128** | +11 `data:`-URI images at 0 transfer (§3.3) |

**Counting note (why 99, 110, and 91 all appear).** Lighthouse's network log
holds **110 records**: 1 document + 32 scripts + 12 stylesheets + 30 images +
35 fetches. Of those, **91 returned HTTP 200** and **19 failed** (status −1,
0 bytes). The resource-summary total of **99** counts the 110 records minus the
11 zero-transfer `data:`-URI images. All three counts are correct under their
own definitions; the byte total is the same either way.

### 3.3 Image bytes on first load

- **Network images: 947,802 bytes across 19 requests.** Largest: an Unsplash
  WebP (208,478 bytes), followed by 99,685 / 94,869 (promo poster JPEG) / 88,233 /
  68,111 bytes. The preloaded hero image (`assets/animals/hero-dog.webp`,
  30,348 bytes on disk) transferred 30,537 bytes.
- **Embedded images: 11 `data:`-URI images** (SVG + one base64 JPEG) at 0 bytes
  of transfer — their bytes are already inside the 1,251,756-byte document and
  cannot be separated from it by network measurement. They are part of why the
  document is so large.
- **Image elements in the DOM: 202** after JavaScript runs (Lighthouse
  ImageElements artifact; CDP `document.images.length` also 202), versus **84
  `<img>` tags in the static markup** (71 with `loading="lazy"`, 13 with no
  `loading` attribute, 0 eager). Most images are injected by scripts after load;
  only 19 fetch over the network on the initial viewport pass.
- No image audit failed on aspect ratio or responsive sizing
  (`image-aspect-ratio` and `image-size-responsive` both score 1). Image bytes
  are a real but secondary cost here — roughly a quarter of total weight, and
  far behind the document + scripts combined (2.27 MB, 66%).

### 3.4 Scripts: everything loads, including the kitchen sink

- **32 script requests, 1,013,848 bytes.** The `js/` directory holds 33 files
  totalling 1,014,691 bytes on disk. **Every file except `js/library-extra.js`
  is requested on first load** (29 from static markup + 3 injected at runtime:
  `js/breed-id.js`, `js/innovations.js`, `js/extra-articles.js?v=…`).
- Largest single scripts: `js/animal-images.js` 285,513 bytes (parser-blocking,
  head line 623), `js/exams-more.js` 268,063 bytes (parser-blocking, body line
  3104 — *not* a head item), `js/extra-articles.js` 77,974 bytes,
  `js/diseases.js` 48,668 bytes, `js/viewer3d.js` 36,720 bytes.
- Lighthouse minification findings are small: unminified JS **86 KiB**,
  unminified CSS **8 KiB**, unused CSS **28–29 KiB** (17,840 bytes inline +
  11,180 bytes in `vetai-tw.css`). Minification/treeshaking alone cannot move
  this page materially; the cost is *that so much code loads and runs*, not that
  it is unminified.

### 3.5 Fetches, duplicates, and the third-party cascade

- **19 local JSON fetches (165,690 bytes):** `data/*.json`, `json/*.json`,
  `articles/manifest.json`, library catalogues. Two files are fetched **twice**
  with and without a cache-busting query: `json/research.json` (24,912 bytes ×2)
  and `json/news.json` (10,254 bytes ×2) — **35,166 duplicate bytes** on every
  first load. (Body/JS behaviour; not a head decision. Flagged for the owning
  workstream.)
- **16 external fetches (0 bytes offline):** 3 RSS feeds fetched directly
  (WOAH, ScienceDaily, phys.org) plus the same 3 feeds retried through **4
  different CORS proxies** (codetabs, allorigins, corsproxy, rss2json), plus one
  `api.countapi.xyz` counter hit. In production these are real third-party
  latency and main-thread work on every load; offline they fail between ~7.5 s
  and ~9.3 s into the trace, after the load event. Reducing or deferring this
  cascade is a body/JS decision, not a head decision — but it is one of the
  largest *behavioural* costs on the page and no head-only plan should ignore it.

### 3.6 Render-blocking resources in `<head>` (verified count)

**14 render-blocking resources: 12 stylesheets + 2 scripts.** Verified two ways:
by parsing the head (all 12 `<link rel="stylesheet">` tags carry **no**
`media`, `preload`, or async pattern; both scripts carry **no** `defer`/`async`),
and by Lighthouse's render-blocking insight, which names the same 14 resources
(est. total savings 1,980–2,390 ms; per-resource wasted-ms values overlap and
must not be summed).

| # | Resource | Head line(s) | Bytes on disk / transfer | LH wasted ms* |
|---|---|---:|---:|---:|
| 1 | `css/vetai-tw.css` | 29 | 22,319 | 1,058 |
| 2 | `css/proactive-assistant.css` | 30 | 6,917 | 608 |
| 3 | `css/ux-nav.css` | 30 | 2,131 | 308 |
| 4 | `css/consult-pricing.css` | 30 | 2,174 | 308 |
| 5 | `css/diseases-atlas.css` | 30 | 3,841 | 458 |
| 6 | Google Fonts: Aref Ruqaa + Amiri | 426 | 0 (failed offline) | 780 |
| 7 | Google Fonts: IBM Plex Sans Arabic | 427 | 0 (failed offline) | 780 |
| 8 | Google Fonts: Cairo + Tajawal + Inter | 428 | 0 (failed offline) | 780 |
| 9 | `css/i18n.css` | 429 | 2,015 | 308 |
| 10 | `css/audience.css` | 430 | 4,195 | 308 |
| 11 | `css/vetai-ios-tools.css` | 1546 | 4,195 | 308 |
| 12 | `css/vetai-v7-reskin.css` | 1547 | 11,379 | 608 |
| 13 | `js/vetai-perf-guard.js` (no defer) | 4 | 5,435 | 308 |
| 14 | `js/animal-images.js` (no defer) | 623 | 285,318 | 1,958 |

\* Run-1 values; wasted-ms figures overlap in time and are not additive.

Also in the head (non-blocking): 4 deferred scripts (`loader.js` line 7,
`i18n.js` line 431, `diseases.js` line 432, `audience.js` line 435); 4
preconnects (lines 424–426 — **late**, after ~40 KB of inline CSS and 5
stylesheets; see decision D4); 1 image preload (hero, line 30); 0
`dns-prefetch`, 0 `preload as=style/font`, 0 `modulepreload`. `<meta charset>`
sits at line 14, *after* three scripts (see decision D6). The `<style>` blocks
themselves are also render-blocking by nature (139,536 bytes parsed before
first paint can complete) but are not counted in the 14 — they are addressed
separately in decision D7.

### 3.7 DOM size and main-thread cost

- **DOM: 8,255 elements** in the Lighthouse trace (8,346 after the page settles,
  per CDP — the difference is late script-injected nodes), max depth 16, max
  130 children on one node, **95 `<script>` elements, 59 stylesheets** in the
  live document (CDP counts, after settle).
- **Main-thread work (throttled): 37.0 s (run 1) / 44.3 s (run 2).** Run-1
  breakdown: Style & Layout 14.1 s, Other 12.3 s, Script Evaluation 5.2 s,
  Rendering 1.9 s, Script Parsing & Compilation 1.8 s, Parse HTML & CSS 1.6 s.
  Style & Layout dominating is consistent with a very large DOM + 139 KB of
  inline CSS + backdrop-filter/animations, and it is why TBT (16.5–22.0 s)
  is the hardest metric to fix: it is CPU work, not bytes.
- **Bootup (throttled): 6.7 s (run 1) / 9.5 s (run 2)** of attributed script
  bootup; the document itself accounts for the largest share (31.4 s total in
  the run-1 bootup table, mostly inline-script execution and work attributed to
  the page). The two biggest external contributors by parse/compile cost are
  `exams-more.js` (318 ms parse/compile) and `animal-images.js` (276 ms).
  20 long tasks were found (run 1).

## 4. CDP complement timings (unthrottled, local, fresh profile)

Harness: `../tools/cdp-timing.mjs` (Node, no dependencies, CDP over WebSocket).
Three runs, sequential, fresh browser profile each, same server and same offline
conditions as the Lighthouse runs. Raw output: `measure/cdp-timing.json`.

| Run | DOMContentLoaded | Load event | DOM interactive | First paint / FCP | Requests | Failed | Total bytes |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 5,307 ms | 5,524 ms | 4,309 ms | 532 ms | 110 | 19 | 3,440,128 |
| 2 | 4,614 ms | 4,836 ms | 3,734 ms | 1,520 ms | 110 | 19 | 3,440,128 |
| 3 | 5,296 ms | 5,635 ms | 4,524 ms | 628 ms | 110 | 19 | 3,440,128 |
| **Median** | **5,296 ms** | **5,524 ms** | **4,309 ms** | **628 ms** | **110** | **19** | **3,440,128** |

Per-type bytes (identical all 3 runs): HTML 1,251,946; JavaScript 1,013,848;
WebP 852,933; JSON 165,690; JPEG 94,869; CSS 60,842. Document
`responseEnd` was 15–122 ms (localhost) and Navigation Timing `transferSize`
1,252,056 bytes (110 bytes above the network total — header accounting
difference between the two APIs; immaterial).

### 4.1 How to read these next to the Lighthouse numbers

- The CDP runs are **unthrottled**: no 4× CPU slowdown, no simulated 1.6 Mbps
  network. That is why load lands at ~5.5 s here versus a scored TTI of
  29–35 s. Both are "true" under their own conditions; neither is the number a
  real phone on a real network will see. The CDP numbers isolate *CPU/parse
  cost on this VM* (DCL ≈ 5.3 s with near-zero network time proves the cost is
  overwhelmingly local processing, not downloading).
- First-paint variance (532 → 1,520 ms) across identical runs is shared-CPU
  noise. Do not quote a single unthrottled paint number as representative.

### 4.2 Why Lighthouse's own observed DCL values are NOT reported as DCL

Lighthouse's metrics audit reported `observedDomContentLoaded` of **67 ms**
(run 1) and **9 ms** (run 2). Those values are irreconcilable with the page's
own Navigation Timing (DCL ≈ 5.3 s, measured directly three times via CDP),
with 285 KB of parser-blocking script, and with a 1.25 MB document. They
appear to be a trace-attribution quirk in Lighthouse 13.6.0's observed-metrics
extraction for this page (possibly the DCL of the initial blank navigation).
They are disclosed here for transparency and **deliberately excluded** from all
headline numbers. The DCL figures in the table above come from
`performance.getEntriesByType("navigation")` read live in the page, which is
the authoritative source.

### 4.3 Fallback statement (required by the task brief)

Lighthouse **did run successfully**, so no fallback was needed for the headline
scores. The CDP harness above served as an independent complement (and stands
ready as the documented fallback method if Lighthouse ever fails in this
environment: same server, same browser, same offline conditions, same output
shape). If Lighthouse had failed, this section would have carried the full
weight of the report with the methodology caveat in §1.3 stated prominently —
as it is, the caveat applies to both methods equally and is stated there.

## 5. The staging stylesheet: `css/vetai-clean.css`

**File:** `ws-5/css/vetai-clean.css` — **154 lines, 7,957 bytes.** Additive,
below-the-fold-only, staging-only. It is **not** in the repo and **not** linked
by any page.

### 5.1 Scope (by construction)

Every rule is scoped to one of two zones, and to nothing else:

- **S1:** `main > section:not(#view-home)` — every content view except the home
  view (media, diagnostics, services, chat, knowledge, library, pets, fun,
  exams, diseases, reference, drugs, dxlab, aim, about, legal, catalog, bio).
- **S2:** `#homeArts` and `#homeLocal` — the two named below-fold grids on the
  home view (featured articles, local-diseases grid).

The top chrome (`#topline`, `#gnav`, news strip, search row, branch explorer)
sits **outside** `<main>` (lines 1583–1613; `<main>` opens at line 1616), so
`main`-scoped selectors cannot match it. The home view's intro block,
quick-access row, and daily-news block are inside `#view-home` but outside S2,
so no rule here matches them either. **Verification:** a case-insensitive grep
of the file for the frozen-zone names returns zero matches, and the computed-
style probe (§5.3) confirms a card inside `#view-home` is unaffected while the
same card inside another view is.

### 5.2 What it does — and why it is deliberately narrow

| Section | Rules | Why only this |
|---|---|---|
| 1. Spacing rhythm | `p + p` (0.75em) and heading+`p` (0.5em) margins, type-only specificity | The cascade + Tailwind utilities already govern all other spacing; these rules sit *below* every utility and only fill gaps where no spacing is set. |
| 2. Card polish | `overflow-wrap: anywhere` for `.bx-card`, `.msgs`, `.dl`, and the S2 grid children | Radii and shadows are already pinned by high-specificity head rules (flat shadows in the dark theme; radii 24px / `--vx-r` / 22px per context). Re-declaring them would fight the design; the file documents this and does not. |
| 3. Line lengths | `max-width: 68ch` for prose in `.card` / `.tool` / `.bx-card` and S2 grids | 68ch matches the precedent the head already uses for section prose. Narrow cards are unaffected. |
| 4. Focus-visible | Re-asserts the head's own ring values (2px `var(--a1)`, 3px offset, 12px radius) for interactive elements inside below-fold cards | The head already defines a complete focus ring; this is belt-and-braces resilience, with values copied from the head, not invented. |
| 5. Reduced motion | Near-instant animation/transition durations under `prefers-reduced-motion` | The head disables motion only for a few named components; this extends the same respect to all below-fold content. The only `!important` flags in the file (3) live here, where they are the standard pattern. |

**Invariants (all verified by grep over the finished file):** no colour values
of any kind (no hex/rgb/named colours; the only colour token is `var(--a1)` in
the focus ring); no `font-*` properties; no `background` properties; no
`display`/`position`/`width`/`height` layout properties; no `!important`
outside section 5; no selectors naming the frozen zones; logical properties
throughout (Arabic-first RTL untouched); visual identity (colours, fonts, logo)
unchanged. The only `var()` in a live declaration is `var(--a1)` in the focus
ring; every other value is a relative unit (`em`/`ch`) or a time (`ms`).

**Honest limitation.** The base page already contains 35 `<style>` blocks
including a full reskin layer: radius, shadow, focus, table, media, and most
spacing behaviour below the fold are already governed, often with `!important`.
A safe additive file therefore has genuinely little left to do without
overriding intentional design — and overriding intentional design silently is
exactly what the HARD GATE exists to prevent. This file does the small,
defensible remainder. Any stronger visual normalisation is a design decision
for Noe, to be reviewed through the `?clean=1` gate — not something to smuggle
in as "polish".

### 5.3 Verification performed

1. **Static checks:** 154 lines (< 300 budget); balanced braces/parens;
   banned-token grep clean; hex-colour grep clean; declaration grep clean
   (no font/background/colour/layout properties); exactly 3 `!important`
   (reduced-motion only).
2. **Computed-style probe (headless shell, local file, offline):** a probe page
   with representative markup (a card in `#view-home`, a card in `#view-media`,
   the `#homeArts` grid, and content outside `<main>`) linked the stylesheet and
   reported `getComputedStyle` results. **10/10 checks passed exactly as
   designed**, including: home-view card unaffected (`margin-top` 16px UA
   default, `max-width` none), media-view card affected (12px = 0.75em,
   `max-width` 544px = 68ch), `#homeArts` child affected (12px, `overflow-wrap`
   anywhere), outside-`<main>` content unaffected (16px). The probe HTML lived
   in `/tmp` (ephemeral) and is not a deliverable; the method is reproducible
   from this description.
3. **NOT verified:** the stylesheet has not been loaded against the real page
   (the gate snippet has not been applied anywhere) and no visual screenshot
   review was done. The real-page visual check is part of Noe's gated review,
   not something this workstream can pre-approve.

## 6. Gate mechanism: the `?clean=1` loader (snippet for the owning workstream)

**WS-5 did not apply this snippet and did not place the CSS file in the repo.**
Another workstream owns `index.html` patches. What follows is the exact snippet
to apply, and exactly where — for review and for Noe's approval before use.

**Placement:** immediately before `</body>` (**line 6343** in the base),
after the last `<script>` / JSON-LD block. This is well below line 1612, needs
no head edit, and runs after parsing, so no `defer` attribute is required
(`defer` on an inline script without `src` is ignored by the HTML spec —
position provides the deferral).

**Prerequisite:** a copy of `ws-5/css/vetai-clean.css` must exist at
`css/vetai-clean.css` relative to the site root at integration time.

```html
<script>
/* VetAI clean-UI staging gate (WS-5). Loads css/vetai-clean.css ONLY when
   the URL carries ?clean=1. No effect on normal visits. Staging only — do
   not make this unconditional without Noe's explicit final-version approval. */
(function () {
  try {
    if (!/[?&]clean=1(?:&|$)/.test(location.search)) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/vetai-clean.css";
    link.setAttribute("data-vetai-clean", "1");
    document.head.appendChild(link);
  } catch (e) { /* staging gate must never break the page */ }
})();
</script>
```

**Behaviour notes for the reviewer.**

- The gate matches exactly `clean=1` as a query parameter (`?clean=1`,
  `?clean=1&…`, `?…&clean=1`). It does not match `clean=10`, `clean=yes`, or
  `xclean=1`.
- The stylesheet is injected into `<head>` at runtime, so it participates in
  the cascade *after* all existing styles — which is what the file's
  specificity discipline (§5.2) assumes.
- A flash of un-gated styling on `?clean=1` previews is expected (the sheet
  arrives after first paint). That is acceptable for a staging preview and is
  one more reason the gate must never become the default without approval.
- Removing the gate (or the file) restores the page exactly: no other code
  depends on either.

## 7. The gap to 99/100, and the frozen-head decisions for Noe

### 7.1 Scale of the gap (honest arithmetic)

Scores near 99 under this throttling profile require LCP in the ~2-second class
and TBT in the low-hundreds-of-milliseconds class — roughly a **9× improvement
in LCP** (18 s → ~2 s) and a **100×+ improvement in TBT** (16,500 ms → low
hundreds). The render-blocking insight caps the *entire* head-resource win at
**1,980–2,390 ms**. Even if every decision below were approved and executed
perfectly, the page would remain far from 99 on document size, script
execution, and style/layout work alone (§8). **Noe should not approve head
edits expecting 99 as their result.** The decisions below are worth taking on
their own merits (each removes real, measured waste); 99 needs the structural
programme in §8 plus re-measurement on production-like hosting with online fonts.

### 7.2 Decisions (each needs a Rule-1 exception — head edits are frozen)

Every "current state" below was verified against `<head>` in lines 1–1612
(read-only). Line numbers are base-`31b90a9` line numbers.

| # | Decision | Current state (verified) | Proposed change | Expected effect (honest scale) | Risk / prerequisite |
|---|---|---|---|---|---|
| **D1** | **Defer or relocate `animal-images.js`** | Line 623: `<script src="js/animal-images.js">` — no `defer`/`async`. 285,318 bytes. Largest single render-blocking item (1,958 ms wasted). | Add `defer`, or move the tag to end-of-body, or split its data from its code (owning workstream to choose). | Removes the largest render block; DCL and LCP render delay fall as part of the 1,980–2,390 ms total. Exact gain unmeasured until tried. | **Dependency audit required first.** Inline scripts and other files may read its globals during parsing. Deferring blindly can break image rendering. |
| **D2** | **Defer, inline-minimal, or keep `vetai-perf-guard.js`** | Line 4: `<script src="js/vetai-perf-guard.js">` — no `defer`. 5,435 bytes, 308 ms wasted. | Keep as-is (it is the perf guard — early execution may be its purpose), or defer if the owning workstream confirms its guards tolerate late execution. | Small either way (308 ms class). Do not approve on perf grounds alone. | Deferring a guard can defeat the guard. Owner confirmation required. |
| **D3** | **Font strategy** (3 sub-options; pick one) | Lines 426–428: 3 Google Fonts stylesheets, **6 families / 17 weights** (Aref Ruqaa 700; Amiri 700; IBM Plex Sans Arabic 400/500/600/700; Cairo 400/600/700/900; Tajawal 400/500/700; Inter 400/500/600/700). `display=swap` already set on all three (good — keep). Production font bytes **unmeasured** (0 bytes offline). | **(a)** Self-host subsetted WOFF2 + preload critical weights + `font-display: swap` — biggest production gain, needs font files + CSS + subsetting choices. **(b)** Cut families/weights — a visual-identity decision; fonts *are* identity, needs Noe's explicit pick of what to cut. **(c)** Keep Google Fonts, combine the 3 links into 1 `css2` request + move preconnects up (D4) — smallest gain, smallest risk. | Unknown until measured online — fonts are the largest *unmeasured* cost in this report. LCP is a text heading (§2.4), so font behaviour bears directly on LCP in production. Any option must be validated by an online before/after run. | (a) needs font licensing/subsetting work + new files. (b) changes typography visibly. (c) is safe but marginal. |
| **D4** | **Move preconnects to the top of `<head>`** | Lines 424–426: 4 preconnects (`fonts.googleapis.com`, `fonts.gstatic.com`, `images.unsplash.com`, `i.ytimg.com`) — placed *after* ~40 KB of inline CSS and 5 stylesheets, so connection setup starts late. | Move all 4 to immediately after charset/viewport, before the first stylesheet. Optionally drop the `i.ytimg.com` preconnect: no `i.ytimg.com` request was observed on first load. | Small (earlier connection setup for fonts/Unsplash). Low risk. | None material. Still a head edit — needs the exception on principle. |
| **D5** | **Defer non-critical stylesheets** (triage first) | 9 local stylesheets, all render-blocking, none with `media`/`preload` patterns (lines 29–30, 429–430, 1546–1547). Total only 59,166 bytes on disk — the cost is request count + blocking, not bytes. Unused CSS is just 28 KiB, so the sheets are mostly *used*. | Per-sheet criticality triage (which sheets paint above-fold content?), then defer the non-critical ones via `media="print"` + `onload` or `preload` + `onload`. **No blind deferral.** | Part of the 1,980–2,390 ms total (individual wasted-ms 308–1,058, overlapping). | Deferring a *used* sheet causes a flash of unstyled content. Triage needs render testing per sheet — not done in this workstream. |
| **D6** | **Move `<meta charset>` first** | Line 14: `<meta charset="UTF-8">` sits *after* three scripts (lines 4–13). | Move it to the first element inside `<head>`. | Negligible perf effect; spec-correctness + robust parsing. | Zero visual risk. Include with any other approved head edit; not worth an exception alone. |
| **D7** | **Inline CSS: extract, minify, or leave** | 139,536 bytes in 35 `<style>` blocks, interleaved with `<link>` tags (order matters for the cascade). | **(a)** Leave as-is. **(b)** Minify in place (~8 KiB saved per Lighthouse — negligible). **(c)** Extract to external cached file(s), replacing blocks with `<link>` tags — enables caching + smaller document, but is a refactor needing cascade-order preservation + visual regression checks. | (c) helps repeat visits (caching) and shrinks the document; first-load parse cost moves rather than vanishes. Do not expect a large first-load score jump from (c) alone. | (c) is high-touch: 35 blocks, interleaved order, `!important` rules throughout. Needs a dedicated verification pass and Noe's explicit approval as a refactor, not a tweak. |

**Notes.**

- **N1 — Already good in the head (preserve in any edit):** `display=swap` on
  all font links; hero-image preload with `fetchpriority="high"` (line 30);
  correct viewport (line 15); charset present; canonical / Open Graph / meta
  description valid (SEO 100); `defer` already on `loader.js`, `i18n.js`,
  `diseases.js`, `audience.js`. A head-edit plan that breaks any of these has
  gone backwards.
- **N2 — No promise of 99.** See §7.1. Approving D1–D7 is approving real waste
  removal, not a 99-point outcome.
- **N3 — Accessibility colour contrast** (`color-contrast` audit fails) needs
  colour-value changes. That is a separate design decision for Noe; WS-5's
  no-colour-change rule forbids it, and the staging stylesheet deliberately
  does not touch it.

## 8. Non-head drivers (observed; other owners — listed so the gap stays honest)

These are **not** head decisions and were **not** changed by WS-5. They are
listed because any plan that only fixes the head will miss most of the gap.

1. **Document size / single-page structure.** 1.25 MB of HTML with all views
   inline. Splitting views out of the first load (or genuinely lazy-loading
   hidden views) is the largest structural lever. Whether the existing
   `lazy-views.js` already does this effectively was not assessed — owning
   workstream to verify against the 8,255-element DOM and 95-script counts.
2. **`js/exams-more.js`** (body line 3104): 268,063 bytes, parser-blocking, in
   the body — the second-largest script and entirely outside the head freeze.
   Deferring or lazy-loading it is a body change for the owning workstream.
3. **Third-party RSS cascade** (§3.5): 16 external fetches per load through 4
   proxies. Deferring, caching server-side, or cutting proxies is a behaviour
   decision with real production latency at stake.
4. **Duplicate JSON fetches** (§3.5): 35,166 duplicate bytes (`research.json`,
   `news.json` fetched twice). Small, but free to fix in the owning code.
5. **Script payload breadth:** 32 of 33 `js/` files load on first load (§3.4).
   Code-splitting per view, or deferring below-fold view code until its view
   opens, is the JS-side lever. Minification (86 KiB) is not.
6. **DOM + style/layout cost:** 8.3k elements; Style & Layout is the largest
   main-thread bucket (14.1 s throttled). The CPU workstream owns profiling
   here; backdrop-filter/animations are *candidates* to investigate, stated as
   a hypothesis, not a finding of this report.
7. **Images:** 947,802 bytes is material but secondary, and image audits pass.
   Further gains need resizing/cropping decisions (visual) — not a head matter.
8. **Production hosting behaviour** (compression, caching headers, HTTP version,
   CDN): unmeasured in this offline setup. Before any 99-claim, re-measure on
   production-like hosting with online fonts.

## 9. Expected effect of the other workstreams (qualitative only — unmeasured)

The API, indexer, CPU, and video workstreams' code was **not assembled** with
this base at measurement time. **No "after" measurement exists, and no numeric
prediction is made.** Directional expectations only, each labelled with what
would confirm or refute it on re-measurement:

| Workstream | Plausible direction | What re-measurement must check |
|---|---|---|
| API / indexer | Could *reduce* first-load JS/data if search and content move server-side; could *add* weight if it adds client code or new first-load fetches. Direction unknown until assembled. | Script bytes + fetch bytes + TBT delta, same commands as Appendix A. |
| CPU / main-thread | Highest-leverage direction for TBT, given Style & Layout (14.1 s) and Script Evaluation (5.2 s) dominate throttled main-thread work. Any real win here should move TBT and TTI first. | TBT, long-task count, main-thread breakdown delta. |
| Video | First-load Media bytes are currently **0**. Any above-fold/autoplay video would *add* weight and could harm LCP; lazy below-fold video should be roughly neutral to first-load metrics. | Media bytes + LCP delta; confirm no new render-blocking requests. |
| Design staging (this workstream) | The gated stylesheet adds ~8 KB **only** on `?clean=1` previews; zero effect on normal loads (not linked). Its visual effect is intentionally subtle (§5.2). | Gated-load run (after the snippet is applied): confirm byte delta ≈ file size and no new console errors. |

**Re-measurement protocol for the assembled build:** same server method, same
browser, same Lighthouse command (Appendix A), 2 Lighthouse runs + 3 CDP runs,
fresh profiles. Compare **byte totals first** (deterministic — any change is
real), then category scores, then throttled timings (noisy — require the same
direction in both runs before claiming a win). Re-measure with online access
before making any font or third-party claim.

## 10. What was NOT done, artifacts, and cleanup

### 10.1 Not done (and why)

- **No `index.html` modification of any kind** — forbidden to this workstream;
  the gate snippet (§6) is delivered as text for the owning workstream.
- **No deploy, no push, no live-facing change** — staging only, per the HARD GATE.
- **No production or online measurement** — the headless shell cannot reach the
  internet; production font bytes, compression, caching, and real-network
  timings are unmeasured (see §1.3).
- **No "after" score** — other workstreams' code was unassembled (§9).
- **No per-stylesheet criticality analysis** — needed before decision D5; it
  requires render testing per sheet and belongs to the head-edit work, not to
  this baseline.
- **No real-page visual review of the staging stylesheet** — the gate is not
  applied anywhere; visual approval is Noe's gated review (§5.3.3).
- **No `?clean=1` loaded measurement** — same reason; the gated-load cost
  (~8 KB) is stated, not measured.
- **No git commands in the reference clone** — per instructions; the base
  commit is as briefed (§0).

### 10.2 Artifacts delivered (all under `~/workspace/vetai-ai-upgrade/ws-5/`)

| Path | What |
|---|---|
| `css/vetai-clean.css` | Staging stylesheet (154 lines, 7,957 bytes) — §5 |
| `docs/PERF-REPORT.md` | This report |
| `tools/cdp-timing.mjs` | CDP timing harness (dependency-free Node) — §4 |
| `measure/lighthouse-baseline.report.json` + `.report.html` | Lighthouse run 1 raw outputs |
| `measure/lighthouse-baseline-run2` | Lighthouse run 2 raw JSON (literal filename) |
| `measure/lighthouse-stdout.log` | Failed attempt 1 log (§2.1) |
| `measure/lighthouse-stdout-2.log`, `measure/lighthouse-stdout-run2.log` | Successful runs' stdout logs |
| `measure/cdp-timing.json`, `measure/cdp-timing-stdout.log` | CDP runs raw output + log |
| `measure/http-server.log`, `measure/copy.log` | Server + hardlink-copy logs |

### 10.3 Cleanup and reference-clone integrity

After measurement: the local HTTP server was stopped and the hardlinked serve
copy (`ws-5/.serve-copy/`) was removed. Removing hardlinks does not alter the
reference clone. Integrity was verified at the end of the work: the reference
`index.html` is still **1,251,756 bytes** with its original modification time
(2026-11-13 11:18 UTC, before this workstream started); no `vetai-clean` or
`clean=1` reference exists anywhere in the repo; no file inside the reference
clone was created, modified, or deleted by this workstream.

## Appendix A. Exact reproduction commands

```bash
# 1. Local copy (hardlinks; read-only w.r.t. the reference clone).
#    Served from a copy so the reference clone is never at risk.
mkdir -p ~/workspace/vetai-ai-upgrade/ws-5/.serve-copy
cd ~/workspace/vetai-ai-upgrade/repo
for item in *; do cp -al --no-preserve=ownership "$item" \
  ~/workspace/vetai-ai-upgrade/ws-5/.serve-copy/; done

# 2. Serve locally (no compression, no cache headers — see §1.3.3).
cd ~/workspace/vetai-ai-upgrade/ws-5/.serve-copy
python3 -m http.server 8471 --bind 127.0.0.1

# 3. Lighthouse (CHROME_PATH is REQUIRED in addition to --chrome-path —
#    without it, Lighthouse 13.6.0 fails before measuring; see §2.1).
export CHROME_PATH="$HOME/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell"
NPM_CONFIG_CACHE=/tmp/npm-cache-ws5 npx -y lighthouse@13.6.0 \
  http://127.0.0.1:8471/ \
  --chrome-path="$CHROME_PATH" \
  --output=json --output=html \
  --output-path="$HOME/workspace/vetai-ai-upgrade/ws-5/measure/lighthouse-baseline" \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--no-sandbox --disable-gpu --disable-dev-shm-usage" \
  --max-wait-for-load=60000

# 4. CDP complement (3 runs, fresh profile each, unthrottled).
cd ~/workspace/vetai-ai-upgrade/ws-5/tools
CHROME="$CHROME_PATH" node cdp-timing.mjs http://127.0.0.1:8471/ 3 \
  ~/workspace/vetai-ai-upgrade/ws-5/measure/cdp-timing.json

# 5. Head inventory checks (read-only; all counts in §3.6 derive from these).
grep -n -E '<link|<script src=' ~/workspace/vetai-ai-upgrade/repo/index.html \
  | awk -F: '$1<=1548'
wc -c ~/workspace/vetai-ai-upgrade/repo/index.html
```

## Appendix B. Number glossary (which count means what)

| Number | Meaning |
|---|---:|
| 1,251,756 | `index.html` bytes on disk |
| 1,251,946 | Document transfer bytes (file + headers) |
| 3,440,128 | Total first-load transfer bytes (both harnesses, all runs) |
| 110 | Network records observed (incl. 11 zero-byte `data:` images, 19 failures) |
| 99 | Lighthouse resource-summary request count (excludes `data:` images) |
| 91 | Requests returning HTTP 200 |
| 19 | Failed requests, 0 bytes (3 font stylesheets + 16 external fetches) |
| 14 | Render-blocking resources in `<head>` (12 stylesheets + 2 scripts) |
| 35 / 139,536 | Inline `<style>` blocks / bytes in `<head>` |
| 32 / 1,013,848 | Script requests / bytes (29 static + 3 runtime-injected) |
| 19 / 947,802 | Network image requests / bytes |
| 8,255 / 8,346 | DOM elements (Lighthouse trace / after settle via CDP) |
| 202 | `<img>` elements after JS (vs 84 in static markup) |
| 5,296 / 5,524 ms | Median unthrottled DCL / load (CDP, 3 runs) |
| 25 / 92 / 96 / 100 | Lighthouse scores, both runs (Perf / A11y / BP / SEO) |

*End of report. WS-5 — staging only, nothing live, nothing deployed.*
