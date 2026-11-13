# Timer / rAF Inventory — VetAI frontend (WS-3)

- **Scope:** `index.html` + `js/*.js` only (base `31b90a9`, branch
  `feature/ai-rag-backend-2026-11-13`). Other pages (`ai-suite/`, `atlas/`,
  `articles/`, `study-*.html`) were not audited.
- **Method:** every `setInterval` / `setTimeout` / `requestAnimationFrame`
  mention was extracted by script, then each call site was read in context
  (surrounding function, start/stop conditions, guards). Line numbers are
  base-file line numbers. Counts below are *verified*; where the task brief's
  priors differ, the verified number wins and the difference is explained.
- **Frozen zone:** `index.html` lines 1–1612. One rAF site lives there
  (R-01, line 1107) and is documented only — no change was made to it.
- **Date / author:** 2026-11-13, Workstream 3 (Frontend CPU + API Client).

## Verified counts (mentions vs. real timers)

| Where | `setInterval` mentions | Real interval creations | `setTimeout` mentions | `requestAnimationFrame` mentions | Real rAF call sites |
|---|---|---|---|---|---|
| `index.html` | 12 | 12 | 40 | 8 | 8 |
| `js/*.js` | 13 | **8** | 36 | 6 | 4 |
| **Total** | 25 | **20** | 76 | 14 | 12 |

Reconciliation with the brief's priors:

- "12 setInterval in index.html" — **confirmed**: all 12 mentions are real
  `setInterval(...)` calls (Table 1, I-01…I-12).
- "13 in js/" — **mention-count only**. Five of the 13 are in
  `js/vetai-perf-guard.js` and create no timer: two header comments, the
  capture `window.setInterval` (line 21–22), the wrapper definition
  (line 30), and the restore in `disable()` (line 117). Real interval
  creations in `js/` = **8** (Table 1, J-01…J-08).
- "14 rAF mentions" — **confirmed** (8 in `index.html` + 6 in `js/`). Two
  of the `js/` mentions are perf-guard plumbing (comment + `_raf` capture);
  real rAF call sites = **12** (Table 2).
- "4200ms image rotator is well-gated" — **confirmed** (I-12): starts only
  via `IntersectionObserver`, stops on `visibilitychange`, disabled under
  `prefers-reduced-motion`.
- "500ms `paint` at ~line 5014 is feature-scoped" — **confirmed** (I-03):
  it is the elapsed-time readout of game 1, "ذاكرة الصور" (picture memory).
  It starts on the first card flip and is cleared on win/restart.
- "Clock uses minute-aligned setTimeout" — **confirmed** (T-03, line 2993):
  a self-rescheduling chain aligned to the next minute boundary.

## Global gating already in place (read before judging any row)

`js/vetai-perf-guard.js` (loaded first, `index.html` line 4) wraps
`window.setInterval`/`clearInterval` and **suspends every registered
interval while the tab is hidden** (`visibilitychange`), resuming on return.
It also adds a `vetai-idle` class after 45 s without interaction and watches
long tasks. Consequence: *no* `setInterval` in this inventory runs while the
tab is hidden (unless the guard is disabled with `?perfguard=off`), so
per-timer `document.hidden` guards would be redundant. The browser likewise
pauses `requestAnimationFrame` callbacks in hidden tabs. WS-3 therefore
applied **no additional per-timer gatings**: every remaining timer below is
either already visibility/IntersectionObserver-gated, self-clearing, or
scoped to an explicit user action (a game round, a button click). The one
exception — a provably dead interval — was removed (I-01).

Verdicts: **KEEP** = leave as-is. **REMOVE** = deleted by WS-3 (only I-01).
**GATE** was considered for each row and applied to none, for the reasons
given per row. Nothing else was removed.

## Table 1 — `setInterval` creations (20)

| ID | File:line | Interval | What it does | Lifecycle / guards | Verdict + evidence |
|---|---|---|---|---|---|
| I-01 | `index.html:2979` | 5000 ms | "Live Visitors Simulator": `const counter = null; if (counter) { … }` | Runs forever from parse; body is a literal no-op (`null` is always falsy) | **REMOVE** — verified exact code (comment line 2978 + block 2979–2987). Removed in `patches/index-html.patch` hunk H1. The *real* visitor counter is the separate countapi fetch at line 3869, untouched. |
| I-02 | `index.html:3274` | 60000 ms | Hourly-info widget: refreshes the "next update" countdown; calls `gen()` on hour change only if the auto-generate toggle is on | Runs from parse; perf-guard-suspended when hidden; `gen()` itself is click/hour-gated | KEEP — one cheap text write per minute; generation is hour-gated, not per-tick. |
| I-03 | `index.html:5014` | 500 ms | Game 1 "ذاكرة الصور": `paint()` elapsed-time readout | Starts on first card flip (`if (!t0)`); `clearInterval` on win (line 5018) and on restart (line 5007) | KEEP — feature-scoped; single `textContent` write per tick. |
| I-04 | `index.html:5084` | 100 ms | Game 3 "خمّن الحيوان": countdown bar | Per round; cleared on answer (line 5087) and on timeout (inside callback) | KEEP — per-round, self-clearing. |
| I-05 | `index.html:5116` | variable (`speed`) | Game 4 "ثعبان المزرعة": re-creates the tick timer faster every 50 points | Paired `clearInterval` immediately before; only inside the food-eaten branch | KEEP — not an additional concurrent timer; replaces I-06. |
| I-06 | `index.html:5123` | 150 ms (start) | Game 4 snake `tick()` (move/draw) | Starts on Play click; cleared on game over (line 5120) and on restart; perf-guard-suspended when hidden | KEEP — user-started; hidden-tab case already handled globally. |
| I-07 | `index.html:5160` | 100 ms | Game 5 "خمّن الصوت": countdown bar | Same pattern as I-04 (per round, cleared on answer/timeout) | KEEP — per-round, self-clearing. |
| I-08 | `index.html:5202` | 100 ms | Game 6 "الغذاء الصحيح": countdown bar | Same pattern as I-04 | KEEP — per-round, self-clearing. |
| I-09 | `index.html:5770` | 100 ms | `newgames-js` shared `timer()`: countdown bar for detective/habitat/food-chain games | Created per round; cleared at zero and via returned `stop()` | KEEP — per-round, self-clearing. |
| I-10 | `index.html:6033` | 100 ms | `advgames-js` shared `mkTimer()`: countdown bar for clinic-manager etc. | Same as I-09 | KEEP — per-round, self-clearing. |
| I-11 | `index.html:6252` | 100 ms | 60-second challenge countdown bar | Created on challenge start; previous timer stopped first (line 6250); cleared at zero | KEEP — per-round, self-clearing. |
| I-12 | `index.html:6270` | 4200 ms | Hero animal-image rotator (`#view-home .vg-animal-core img.vg-rot`) | `IntersectionObserver` (threshold .12) start/stop + `visibilitychange` stop/start + early return under `prefers-reduced-motion`; no-op if fewer than 2 images | KEEP — the brief's "well-gated" claim verified verbatim. |
| J-01 | `js/differentials.js:121` | 700 ms | Polls until `view-ai-diagnostics` is visible, then `init()` | `clearInterval` on first visible check; hard cap `setTimeout(clearInterval, 10 min)` (line 124) | KEEP — bounded, self-clearing. Future improvement (not applied): replace with a `switchTab` hook; changing init timing needs live testing. |
| J-02 | `js/diseases-atlas.js:323` | 800 ms | Polls for `#dz-entry`, calls `mountEntry()` | Clears when the entry exists or after 40 tries (~32 s) | KEEP — bounded, self-clearing. |
| J-03 | `js/drugs-pro.js:103` | 700 ms | Polls until `view-drugs` is visible, then `takeover()` | Same pattern as J-01 (visible check + 10-min cap) | KEEP — bounded, self-clearing. Same future-hook note as J-01. |
| J-04 | `js/exams-graded.js:135` | 800 ms | Polls for `#xg-panel`, calls `mountPanel()` | Clears when the panel exists or after 40 tries (~32 s) | KEEP — bounded, self-clearing. |
| J-05 | `js/lazy-views.js:79` | 100 ms | Polls until `window.switchTab` exists, then wraps it | Clears on success or after 60 tries (~6 s) | KEEP — short-lived bootstrap poll. |
| J-06 | `js/supervisor.js:162` | 45000 ms | Supervisor recovery probe (`probeTick`) | Wrapper checks `document.hidden`; `probeTick` re-checks `visibilityState` and `navigator.onLine`; probes at most one non-closed provider per tick | KEEP — already doubly gated; probes only providers in a failed state. |
| J-07 | `js/terminology.js:119` | 700 ms | Polls until `view-exams` is visible, then `init()` | Same pattern as J-01 (visible check + 10-min cap) | KEEP — bounded, self-clearing. Same future-hook note as J-01. |
| J-08 | `js/viewer3d.js:355` | 600 ms | Re-scans `#mv3dGrid` for `model-viewer` cards; injects extra cards once ≥6 children exist | Clears when extra cards are injected; hard cap `setTimeout(clearInterval, 60 s)` (line 365); a `MutationObserver` already scans on DOM change | KEEP — bounded (≤60 s), self-clearing. |

## Table 2 — `requestAnimationFrame` call sites (12) + plumbing (2)

| ID | File:line | What it does | Lifecycle / guards | Verdict |
|---|---|---|---|---|
| R-01 | `index.html:1107` | News-strip collapse on scroll (throttled: one frame per scroll burst) | Scroll listener with `t` flag; passive | KEEP — frozen zone (line < 1612); documented only, untouched. |
| R-02 | `index.html:2870` | One-shot re-scroll after view switch (`goTop`) | Single call + two `setTimeout` retries; not a loop | KEEP — one-shot. |
| R-03 | `index.html:3084` | Reading-progress bar on scroll (throttled via `__pgT` flag) | Scroll-gated, passive | KEEP — event-driven, not a loop. |
| R-04 | `index.html:4486` | Card spotlight follows pointer (throttled via `__pmT` flag) | Pointermove-gated | KEEP — event-driven, not a loop. |
| R-05 | `index.html:4500` + `4503` | Particle-network canvas loop | `visibilitychange` sets `run=false` (stops rescheduling); `prefers-reduced-motion` early return; 33 ms throttle; `perf-idle` class switches the loop to a 900 ms `setTimeout` fallback | KEEP — already gated on all three axes (visibility, motion preference, idle). |
| R-06 | `index.html:4746` | Bioacoustics oscilloscope/spectrogram `frame()` loop | `IntersectionObserver` (threshold .05) + `visibilitychange` toggle `bxOn`; loop exits without rescheduling when `bxOn` is false; stops the mic when the view is hidden | KEEP — already gated; note the loop reschedules before the visibility check, but the next frame exits immediately when `bxOn` is false, so it does not spin. |
| R-07 | `index.html:5055` | Game 2 "عدّاء الأرنب" `step()` loop | Runs only while `run` is true (set on Play click, cleared on collision); `visibilitychange` stops the game; `cancelAnimationFrame` on restart (line 5058) | KEEP — user-started, stops on hide/collision. |
| R-08 | `js/audience.js:108` | One-shot: add overlay class + focus after open | Single call | KEEP — one-shot. |
| R-09 | `js/i18n.js:176` | One-shot `flush()` of pending translation mutations | `flushT` flag coalesces bursts; observer only active for non-Arabic languages | KEEP — coalesced, one-shot per burst. |
| R-10 | `js/ux-nav.js:43` | Progress-bar / back-to-top update on scroll (throttled via `ticking`) | Scroll-gated, passive | KEEP — event-driven, not a loop. |
| R-11 | `js/vetai-3d-fix.js:139` | One-shot: re-set `model-viewer` `src` on retry click | Single call inside a click handler | KEEP — one-shot. |
| — | `js/vetai-perf-guard.js:4,23` | Plumbing only: header comment + `_raf` capture. The guard wraps intervals/timeouts; it does not wrap or create rAF loops. | n/a | n/a — not a timer. |

## Table 3 — `setTimeout` call sites in `index.html` (40)

All are one-shot unless noted. Verdict for every row is **KEEP**: none is a
free-running loop except the clock chain (T-03, by design) and the particle
idle fallback (T-15, a throttle, not a spinner). Fetch-abort timeouts are
paired with `AbortController` + `clearTimeout` on completion.

| ID | Line | Delay | Purpose | Notes |
|---|---|---|---|---|
| T-01 | 2871 | 150 ms | Retry `goTop` after view switch | One-shot; paired with T-02. |
| T-02 | 2872 | 450 ms | Second `goTop` retry after layout settles | One-shot. |
| T-03 | 2993 | ~60 s, aligned | Clock: self-rescheduling chain `60050 − (now % 60000)` | The only recurring `setTimeout` chain in the file; single outstanding timer; one `textContent` write per minute. KEEP. |
| T-04 | 3093 | 1500 ms | Remove confetti spans after "هل تعلم؟" | Click-scoped. |
| T-05 | 3276 | 200 ms | Focus chat input after "اسأل" FAB click | Click-scoped. |
| T-06 | 3311 | 200 ms | `scrollIntoView` after opening a search-hit element | Search-scoped. |
| T-07 | 3343 | 50 ms | Show dxlab section after nav click | Click-scoped. |
| T-08 | 3361 | 1200 ms | Restore copy-button label | Click-scoped. |
| T-09 | 3569 | 1500 ms | Restore copy-button label (vet-ai-pro box) | Click-scoped. |
| T-10 | 3577 | `ms \|\| 5000` | Abort for `getJSON` (Wikipedia / Europe PMC / MyMemory) | Cleared on settle; abort + resolve(null). |
| T-11 | 3723 | `ms \|\| 30000` | Abort for `postJSON` (vet-ai-pro providers) | Cleared on settle. |
| T-12 | 3775 | 1500 ms | Restore copy-button label (top AI panel) | Click-scoped. |
| T-13 | 3986 | `ms \|\| 60000` | Abort for translator `post()` | Cleared on settle. |
| T-14 | 4303 | `ms` | Abort for emergency-panel `post()` | Cleared on settle. |
| T-15 | 4500 | 900 ms | Particle loop idle fallback (see R-05) | Only while `perf-idle`; deliberately slow. KEEP. |
| T-16 | 4555 | 60 ms | Scroll to simulator after view switch | Click-scoped. |
| T-17 | 4695 | 25000 ms | Watchdog: finish video-frame extraction | Cleared implicitly by `done` flag. |
| T-18 | 4704 | `ms` | Abort for image/video analysis `post()` | Cleared on settle. |
| T-19 | 4796 | 2800 ms | Remove paragraph-search highlight | Search-scoped. |
| T-20 | 4799 | 180 ms | Debounce for paragraph search | Cleared on each keystroke (`clearTimeout`). |
| T-21 | 4801 | 0 ms | Defer branch-active toggle after click | One-shot. |
| T-22 | 4891 | 150 ms | Deferred media-view init after branch click | Click-scoped; guarded by `inited` flag. |
| T-23 | 4971 | 60 ms | Scroll panel into view | Click-scoped. |
| T-24 | 5021 | 750 ms | Flip memory cards back down | Game-scoped. |
| T-25 | 5092 | 950 ms | Next question (guess-the-animal) | Game-scoped. |
| T-26 | 5168 | 1100 ms | Next question (guess-the-sound) | Game-scoped. |
| T-27 | 5210 | 1500 ms | Next question (correct food) | Game-scoped. |
| T-28 | 5240 | 1100 ms | Next round (letter-order game) | Game-scoped. |
| T-29 | 5319 | 9000 ms | Abort for RSS feed fetch attempts | Cleared on settle. |
| T-30 | 5501 | 500 ms | Focus translator input after scroll | Click-scoped. |
| T-31 | 5690 | 90000 ms | Add `perf-idle` class after inactivity | Re-armed on every activity event; single outstanding timer. |
| T-32 | 5701 | 200 ms | `requestIdleCallback` fallback delay | Only when the API is missing. |
| T-33 | 5723 | 120000 ms | Disconnect the media-stamping `MutationObserver` | One-shot cap. |
| T-34 | 5756 | 2500 ms | Re-run study injection after load | One-shot; injection itself is idempotent (skips existing). |
| T-35 | 5845 | 3200 ms | Next case (detective game) | Game-scoped. |
| T-36 | 5922 | 2600 ms | Next round (habitat game) | Game-scoped. |
| T-37 | 5991 | 3600 ms | Next round (food-chain game) | Game-scoped. |
| T-38 | 6070 | 1400 ms | Next case (clinic-manager game) | Game-scoped. |
| T-39 | 6100 | 1600 ms | Next question (advanced game) | Game-scoped. |
| T-40 | 6329 | 650 ms | Flip memory-match cards back down | Game-scoped. |

## Table 4 — `setTimeout` call sites in `js/*.js` (36: 34 direct + 2 via captured `_st`)

Line 350 of `proactive-assistant.js` contains two calls on one line; both
are listed. `vetai-perf-guard.js` has no direct `setTimeout(...)` calls —
its two internal timers use the captured `_st` and are listed as P-01/P-02.
Files with no timers at all (`animal-images`, `audience-adapt`, `breed-id`,
`consult-pricing`, `diseases`, `exams-more`, `extra-articles`, `loader`,
`research-radar`, `triage-engine`, `vetai-counts`) are omitted. Every row:
**KEEP**.

| ID | File:line | Delay | Purpose | Notes |
|---|---|---|---|---|
| S-01 | `ai-engine.js:16` | `ms` | Timeout race for provider calls (`withTimeout`) | Cleared on settle. |
| S-02 | `ai-engine.js:49` | `ms` | `delay()` helper (1500 ms retry pause in `VetAI_ask`) | One-shot. |
| S-03 | `audience.js:113` | 220 ms | Hide overlay after close animation | Click-scoped. |
| S-04 | `bioacoustic-lab.js:214` | 15000 ms | Auto-stop mic recording | Guarded by recorder state. |
| S-05 | `differentials.js:124` | 10 min | Hard cap for J-01 | One-shot cap. |
| S-06 | `diseases-atlas.js:120` | 220 ms | Debounce for atlas search input | Cleared per keystroke. |
| S-07 | `drugs-pro.js:106` | 10 min | Hard cap for J-03 | One-shot cap. |
| S-08 | `exams-graded.js:145` | 350 ms | Re-localise after exam-language click | Click-scoped. |
| S-09 | `i18n.js:94` | 800 ms | Debounced save of machine-translation cache | Cleared per write. |
| S-10 | `i18n.js:107` | 350 ms | Schedule translation-queue drain | Cleared per enqueue. |
| S-11 | `i18n.js:127` | 61000 ms | Retry translation queue after provider failure | Only on failure path; queue re-checked by `next()`. |
| S-12 | `i18n.js:129` | 250 ms | Continue draining while queue non-empty | Self-terminating: fires only if the queue has entries. |
| S-13 | `innovations.js:72` | 2400 ms | Remove search-hit flash class | Search-scoped. |
| S-14 | `innovations.js:75` | 420 ms | Deferred open-item action after Ctrl+K selection | Search-scoped. |
| S-15 | `innovations.js:82` | 40 ms | Focus quick-search input on open | One-shot. |
| S-16 | `lazy-views.js:132` | 2500 ms | `requestIdleCallback` fallback (idle safety-net loads) | Only when the API is missing. |
| S-17 | `library-engine.js:136` | 300 ms | Debounce for library search (already debounced; see § Search-index audit) | Cleared per keystroke. |
| S-18 | `library-extra.js:78` | 180 ms | Debounce for extra-library search | Cleared per keystroke. |
| S-19 | `proactive-assistant.js:334` | 60 ms | Focus assistant input on panel open | Click-scoped. |
| S-20 | `proactive-assistant.js:350` | 2600 ms | First-visit FAB pulse (outer) | Once per browser (localStorage-gated). |
| S-21 | `proactive-assistant.js:350` | 450 ms | FAB pulse reset (inner, same line as S-20) | One-shot. |
| S-22 | `supervisor.js:38` | `ms` | Timeout race for provider calls | Cleared on settle. |
| S-23 | `supervisor.js:219` | hedge delay | Hedged launch of the next provider | Cleared when the race settles (`cleanup()`). |
| S-24 | `supervisor.js:254` | 90000 ms | Queue-job timeout | Cleared on job settle. |
| S-25 | `terminology.js:122` | 10 min | Hard cap for J-07 | One-shot cap. |
| S-26 | `ux-nav.js:105` | 650 ms | Scroll-position retry | Click-scoped. |
| S-27 | `ux-nav.js:126` | 60 ms | Deferred scroll to heading | Click-scoped. |
| S-28 | `v45-showcase.js:36` | 150 ms | Scroll to target view after `switchTab` | Click-scoped. |
| S-29 | `vetai-3d-fix.js:63` | 9000 ms | Timeout for model-viewer CDN script load | Cleared on load/error. |
| S-30 | `vetai-3d-fix.js:70` | 100 ms | Poll for `customElements` registration | Bounded: max 40 tries, stops on success/timeout; only after a script load. KEEP. |
| S-31 | `vetai-router.js:128` | 90 ms | Scroll to deep-linked element after `switchTab` | Navigation-scoped. |
| S-32 | `vetai-v7-photos.js:175` | 10000 ms | Disconnect showcase-card observer | One-shot cap. |
| S-33 | `viewer3d.js:365` | 60 s | Hard cap for J-08 | One-shot cap. |
| S-34 | `viewer3d.js:397` | 50 ms | Clear model-swap lock | One-shot. |
| P-01 | `vetai-perf-guard.js:63` | 45000 ms | Idle timer (`vetai-idle` class) via captured `_st` | Re-armed on interaction. |
| P-02 | `vetai-perf-guard.js:79` | 250 ms | Scroll throttle for idle wake-up via captured `_st` | Coalesces scroll bursts. |
| — | `vetai-perf-guard.js:4,22` | — | Plumbing only: header comment + `_st` capture. | Not a timer. |

## Search-index / heavy-work audit (Task 5 evidence)

What the brief expected ("index built at load") vs. what the base actually
does. Every index builder found is already lazy except the `#gs` handler,
which had no debounce and re-scanned/re-stringified on every keystroke.

| Index / builder | File | Loaded/built when? | Size | WS-3 action |
|---|---|---|---|---|
| `js/search-index.json` (`{docs, inv}` inverted index) | `js/proactive-assistant.js:15,210–229` | On demand only: first article search or AI-failure fallback; cached after first load | 334 KB | API-first: `searchArticles()` now tries `VetAIClient.search()` first, falls back to the local index, then the manifest. Local path unchanged. |
| `data/library/search.json` (1003 entries) | `js/library-engine.js:126–131` | On demand only: first non-empty library query (`enterSearch`); debounced 300 ms | 228 KB | API-first: `enterSearch()` tries `VetAIClient.search()` first (stale-query guarded); any failure/empty result falls through to the existing `search.json` flow. Local filter now uses a once-per-load normalised title (`_n`) instead of re-normalising every title on every keystroke. |
| Global quick-search index (Ctrl+K) | `js/innovations.js:23–33,82` | Lazily: built on first overlay open (`if (!IDX)`) | ~200 items | No load change needed. Normalised title/kind cached once in `buildIndex()` (+ in `loadBooks()`); `renderQS()` reuses the cache instead of calling `norm()` per item per keystroke. |
| Triage engine data (6 species files + differentials) | `js/triage-engine.js:222–231` | On demand only: "تحليل الأعراض" click (`loadEngine()`); mount only builds the form | 6 JSON files + 72 KB | None — already lazy. |
| Diseases-atlas `loadAll()` | `js/diseases-atlas.js:120–129` | On demand: first search query, debounced 220 ms | Per-species JSON | None — already lazy + debounced. |
| `#gs` top search suggestions | `index.html:3312–3318` | **On every keystroke, unthrottled**: rescanned `R`/`T`/`DD` (including `JSON.stringify(d)` per differential per keystroke) + every `.art` element's `textContent` | In-memory arrays + live DOM | **Debounced 180 ms + lazily cached haystacks** (`R`/`T`/`DD` normalised once on first use) + early exit once 14 matches are collected. Same results, same buttons, same handlers. |
| Paragraph finder | `index.html:4789–4799` | On demand, debounced 180 ms; scans `main` paragraphs per search | Live DOM | None — already debounced + on-demand. (`getComputedStyle` per element in `searchable()` is noted as a possible future optimisation; not changed.) |
| Library catalogue filters | `index.html:5465–5472` | On input/change, over ≤~30 in-memory items | Tiny | None. |

## Changes applied by WS-3 (timer-related)

1. **I-01 removed** — the only deletion. See `patches/index-html.patch`
   hunk H1 and `SUMMARY.md`.
2. **No other timer removed, no timer interval changed, no gating added.**
   Rationale (evidence above): the perf-guard already suspends all
   intervals when hidden; every other interval is bounded, self-clearing,
   or user-action-scoped; every rAF loop is visibility/IO/event-gated or
   one-shot. Adding redundant guards would only add merge risk with the
   other `index.html` editor for zero measured benefit.
3. **New timers introduced by WS-3: none that recur.** `js/vetai-ai-client.js`
   contains exactly two `setTimeout` call sites (fetch timeout, debounce
   timer), both cleared, no `setInterval`, no rAF. The `#gs` debounce adds
   one cleared `setTimeout` per keystroke burst. No other file gained a
   timer.

## Recommendations (not applied — need live testing / owner decision)

- Replace the three 700 ms view-pollers (J-01/J-03/J-07) and the two
  800 ms mount-pollers (J-02/J-04) with a `switchTab` hook or a
  `MutationObserver` on the view's `class` attribute (the pattern already
  used by the media view at `index.html:4889`). Bounded cost today
  (≤10 min / ≤32 s, hidden-suspended), so this is polish, not a fix.
- Consider pausing game timers when their SPA view is hidden (user switched
  tabs mid-game while the document stays visible). The perf-guard does not
  cover this case; pausing changes game fairness and needs a product call.
- The paragraph finder's `searchable()` calls `getComputedStyle` per
  candidate per search; caching visibility per search pass would cut
  per-keystroke cost further.
