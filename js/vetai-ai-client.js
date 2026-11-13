/* ============================================================================
   vetai-ai-client.js — VetAI frontend API client (WS-3, 2026-11-13)
   ----------------------------------------------------------------------------
   Single choke point for frontend -> backend AI traffic. All search,
   question-answering and (future) triage calls go through here so the page
   itself does no heavy processing: no polling, no intervals, no animation
   loops, no full-corpus scans on the main thread beyond a small bounded
   local fallback (see localSearch).

   API BASE — evidence (base 31b90a9, branch feature/ai-rag-backend-2026-11-13):
     * wrangler.toml: name = "vetai", main = "worker.js".
     * worker/guard-worker.js MIRRORS[0] (the production site host):
       https://vetai.vcom.workers.dev/
     * The legacy chat worker https://vetai-chat.vcom.workers.dev (referenced
       by js/ai-engine.js and js/supervisor.js) is a DIFFERENT service with a
       DIFFERENT contract ({question,history,context} -> {answer}); it is NOT
       used here. Do not conflate the two.
   Default base below is therefore https://vetai.vcom.workers.dev. When the
   page itself is served from that origin, requests go same-origin (base '').
   Override before this script loads with window.VETAI_API_BASE, or at
   runtime with VetAIClient.configure({ apiBase: '...' }). If the Worker
   workstream deploys the RAG API under another name/route, change the ONE
   constant DEFAULT_API_BASE.

   CONTRACTS (VERIFIED against repo worker.js by the coordinator, 2026-11-13):
     * GET  {base}/api/search?q=<query>&k=<1..10> ->
       { results: [{title, url, score, source, snippet}], count }.
       Response parsing is defensive and also accepts {hits}/{docs}/
       {data} or a bare array.
     * POST {base}/api/ask     { question|query, k?, lang? } ->
       { answer, citations: [{title, url}], grounded }. Parsing also
       accepts {text} and {sources|references} defensively. Extra
       request fields (history, context) are ignored by the Worker.
     * NOTE: the DEFAULT_API_BASE below is UNCONFIRMED until the owner
       deploys worker.js on his own Cloudflare account; override with
       window.VETAI_API_BASE (see docs/AI-BACKEND-INTEGRATION.md).
     * POST {base}/            { messages, mode: 'emergency' } -> { text }.
       VERIFIED contract: repo worker.js (MODEL llama-3.3-70b, EMERGENCY_SYS)
       implements exactly this at the Worker root. triage() implements it
       but is NOT wired to any UI in WS-3 (see SUMMARY.md); the live
       emergency panel chain is left untouched.
   Local fallback: data/rag-lexical.json (built by the indexer workstream;
   ships with this branch — a 404 is handled silently). Search falls back
   to it when the API is unreachable; ask() rejects by default so existing
   caller fallback chains (supervisor providers, local article search)
   keep working — see ask() options.

   Guarantees: NO setInterval, NO polling, NO requestAnimationFrame, NO
   heavy loops (local search is capped: MAX_LOCAL_DOCS docs, MAX_TOKENS
   query tokens, top-N insertion instead of a full sort). The only timer
   is ONE debounce setTimeout for debouncedSearch, cleared on every call.
   ES5-style (var/function, Promise chains) to match js/ai-engine.js and
   js/supervisor.js. Requires fetch; degrades gracefully without it.
   ========================================================================== */
(function () {
  'use strict';
  if (window.VetAIClient && window.VetAIClient.__v) return; // double-load guard

  /* ---------------- configuration ---------------- */
  var DEFAULT_API_BASE = 'https://vetai.vcom.workers.dev';
  var LOCAL_INDEX_URL = 'data/rag-lexical.json';
  var SEARCH_DEBOUNCE_MS = 300;
  var SEARCH_TIMEOUT_MS = 8000;
  var ASK_TIMEOUT_MS = 25000;
  var TRIAGE_TIMEOUT_MS = 20000;
  var MAX_RESULTS = 10;
  var MAX_LOCAL_DOCS = 5000;
  var MAX_TOKENS = 8;

  function resolveApiBase() {
    try {
      if (typeof window.VETAI_API_BASE === 'string' && window.VETAI_API_BASE) {
        return window.VETAI_API_BASE.replace(/\/+$/, '');
      }
      if (typeof location !== 'undefined' && location.origin === DEFAULT_API_BASE) return '';
    } catch (e) { /* fall through to default */ }
    return DEFAULT_API_BASE;
  }
  var apiBase = resolveApiBase();

  function debug() {
    if (typeof window !== 'undefined' && window.VETAI_CLIENT_DEBUG && window.console) {
      window.console.info.apply(window.console, ['[VetAIClient]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  /* ---------------- small helpers ---------------- */
  function isFn(f) { return typeof f === 'function'; }
  function trimStr(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) : s; }

  /* Arabic-aware normalisation shared by the local fallback only. */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[^؀-ۿa-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function queryTokens(q) {
    return norm(q).split(' ').filter(function (w) { return w.length >= 2; }).slice(0, MAX_TOKENS);
  }

  /* One fetch with a timeout. Links an outer AbortSignal when given so a
     caller (or the debounce logic) can cancel a stale request. In browsers
     without AbortController the timeout still rejects, but the underlying
     fetch cannot be aborted (documented limitation, harmless here). */
  function fetchJSON(path, body, timeoutMs, outerSignal, isGet) {
    if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
    var ctrl = null, timer = null, settled = false;
    try { ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null; } catch (e) { ctrl = null; }
    function onOuterAbort() { if (ctrl) { try { ctrl.abort(); } catch (e) {} } }
    if (outerSignal) {
      if (outerSignal.aborted) return Promise.reject(new Error('aborted'));
      if (outerSignal.addEventListener) outerSignal.addEventListener('abort', onOuterAbort);
    }
    var p = new Promise(function (resolve, reject) {
      timer = setTimeout(function () {
        if (settled) return; settled = true;
        if (ctrl) { try { ctrl.abort(); } catch (e) {} }
        reject(new Error('timeout after ' + timeoutMs + 'ms'));
      }, timeoutMs);
      var url = apiBase + path, opts;
      if (isGet) {
        var qs = [];
        for (var key in body) {
          if (body[key] !== undefined && body[key] !== null) qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(body[key]));
        }
        if (qs.length) url += (url.indexOf('?') === -1 ? '?' : '&') + qs.join('&');
        opts = { method: 'GET', headers: { 'Accept': 'application/json' } };
      } else {
        opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      }
      if (ctrl) opts.signal = ctrl.signal;
      fetch(url, opts).then(function (r) {
        if (settled) return;
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(function (j) {
        if (settled) return; settled = true; clearTimeout(timer); resolve(j);
      }).catch(function (e) {
        if (settled) return; settled = true; clearTimeout(timer); reject(e);
      });
    });
    return p.then(function (v) {
      if (outerSignal && outerSignal.removeEventListener) outerSignal.removeEventListener('abort', onOuterAbort);
      return v;
    }, function (e) {
      if (outerSignal && outerSignal.removeEventListener) outerSignal.removeEventListener('abort', onOuterAbort);
      throw e;
    });
  }

  /* Defensive normalisation of one search/ask result item, accepting the
     repo's compact shapes ({t,u,c,l,d}) and verbose shapes ({title,url}). */
  function normalizeItem(x) {
    if (!x || typeof x !== 'object') return null;
    var title = trimStr(x.title || x.t || x.name || '', 200);
    var url = trimStr(x.url || x.u || x.href || '', 500);
    if (!title && !url) return null;
    return {
      title: title,
      url: url,
      snippet: trimStr(x.snippet || x.d || x.excerpt || x.text || '', 300),
      source: trimStr(x.source || x.s || '', 60),
      category: trimStr(x.category || x.c || '', 60),
      lang: trimStr(x.lang || x.l || '', 10),
      score: (typeof x.score === 'number') ? x.score : 0
    };
  }
  function normalizeList(j) {
    var arr = null;
    if (Array.isArray(j)) arr = j;
    else if (j && typeof j === 'object') arr = j.results || j.hits || j.docs || j.data || j.items || null;
    if (!Array.isArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length && out.length < 60; i++) {
      var n = normalizeItem(arr[i]);
      if (n) out.push(n);
    }
    return out;
  }
  function normalizeCitations(j) {
    if (!j || typeof j !== 'object') return [];
    var arr = j.citations || j.sources || j.references || null;
    if (!Array.isArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length && out.length < 8; i++) {
      var n = normalizeItem(arr[i]);
      if (n) out.push(n);
    }
    return out;
  }

  /* ---------------- local lexical fallback ---------------- */
  var localIndexPromise = null;
  function loadLocalIndex() {
    if (localIndexPromise) return localIndexPromise;
    if (typeof fetch !== 'function') { localIndexPromise = Promise.resolve(null); return localIndexPromise; }
    localIndexPromise = fetch(LOCAL_INDEX_URL).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).catch(function () { return null; }); // file absent (base has none) -> silent null
    return localIndexPromise;
  }
  function clearLocalCache() { localIndexPromise = null; }

  /* Bounded top-N insertion: keeps at most `limit` entries, never sorts
     the whole corpus. */
  function topNInsert(top, item, limit) {
    var i = 0;
    while (i < top.length && top[i].score >= item.score) i++;
    if (i < limit) { top.splice(i, 0, item); if (top.length > limit) top.length = limit; }
  }

  function localSearch(query, opts) {
    opts = opts || {};
    var limit = opts.limit || MAX_RESULTS;
    var toks = queryTokens(query);
    if (!toks.length) return Promise.resolve({ results: [], source: 'local', query: query });
    return loadLocalIndex().then(function (data) {
      if (!data) return { results: [], source: 'none', query: query };
      var docs = null, inv = null;
      if (Array.isArray(data)) docs = data;
      else if (typeof data === 'object') {
        /* NOTE: data.docs may be a COUNT, not an array:
           data/rag-lexical.json is {docs: <count>, entries: [...]}.
           Only accept arrays, entries first. */
        var cands = [data.entries, data.docs, data.items, data.results];
        for (var ci = 0; ci < cands.length; ci++) {
          if (Array.isArray(cands[ci])) { docs = cands[ci]; break; }
        }
        inv = data.inv || null;
      }
      if (!docs || !docs.length) return { results: [], source: 'none', query: query };

      /* Inverted-index shape ({docs, inv}) — same shape as the existing
         js/search-index.json used by js/proactive-assistant.js. */
      if (inv && Array.isArray(docs)) {
        var score = {};
        toks.forEach(function (t) {
          var ids = inv[t] || [];
          for (var k = 0; k < ids.length; k++) score[ids[k]] = (score[ids[k]] || 0) + 1;
        });
        var ids = Object.keys(score);
        ids.sort(function (a, b) { return score[b] - score[a] || a - b; });
        var out = [];
        for (var j = 0; j < ids.length && out.length < limit; j++) {
          var n = normalizeItem(docs[ids[j]]);
          if (n) { n.score = score[ids[j]]; out.push(n); }
        }
        return { results: out, source: 'local', query: query };
      }

      /* Flat-doc shape: single bounded pass, cached normalised text per
         doc so repeat searches do not re-normalise the corpus. */
      var top = [];
      var n = Math.min(docs.length, MAX_LOCAL_DOCS);
      for (var i = 0; i < n; i++) {
        var d = docs[i];
        if (!d || typeof d !== 'object') continue;
        if (d._n == null) {
          var base = normalizeItem(d);
          var kw = '';
          if (Array.isArray(d.keywords)) kw = d.keywords.join(' ');
          else if (typeof d.keywords === 'string') kw = d.keywords;
          d._t = norm(base ? base.title : '');
          d._n = norm((base ? base.title : '') + ' ' + (base ? base.snippet : '') + ' ' + kw);
          d._base = base;
        }
        if (!d._base) continue;
        var s = 0;
        for (var t = 0; t < toks.length; t++) {
          if (d._t.indexOf(toks[t]) !== -1) s += 3;
          else if (d._n.indexOf(toks[t]) !== -1) s += 1;
        }
        if (s > 0) {
          var item = { title: d._base.title, url: d._base.url, snippet: d._base.snippet,
                       source: d._base.source, category: d._base.category, lang: d._base.lang, score: s };
          topNInsert(top, item, limit);
        }
      }
      return { results: top, source: 'local', query: query };
    });
  }

  /* ---------------- public: search ---------------- */
  function search(query, opts) {
    opts = opts || {};
    var q = String(query == null ? '' : query).trim();
    if (!q) return Promise.resolve({ results: [], source: 'none', query: q });
    var limit = opts.limit || MAX_RESULTS;
    var timeoutMs = opts.timeoutMs || SEARCH_TIMEOUT_MS;
    return fetchJSON('/api/search', { q: q, k: limit }, timeoutMs, opts.signal, true)
      .then(function (j) {
        var results = normalizeList(j).slice(0, limit);
        debug('search api', q, results.length);
        if (results.length) return { results: results, source: 'api', query: q };
        /* API answered but empty: honour it (do not paper over with local
           hits the backend deliberately did not return) unless the caller
           explicitly wants the local fallback on empty results. */
        if (opts.fallbackOnEmpty) return localSearch(q, { limit: limit });
        return { results: [], source: 'api', query: q };
      })
      .catch(function (e) {
        if (e && (e.name === 'AbortError' || e.message === 'aborted')) throw e;
        debug('search api failed, local fallback:', e && e.message);
        if (opts.allowLocalFallback === false) throw e;
        return localSearch(q, { limit: limit });
      });
  }

  /* Debounced search: ONE shared timer + ONE shared AbortController.
     Every call cancels the previous pending request and timer, so stale
     responses can never overwrite newer ones. The callback fires only for
     the latest query. Returns a cancel function for that call. */
  var debTimer = null, debController = null, debSeq = 0;
  function cancelDebouncedSearch() {
    if (debTimer) { clearTimeout(debTimer); debTimer = null; }
    if (debController) { try { debController.abort(); } catch (e) {} debController = null; }
  }
  function debouncedSearch(query, callback, opts) {
    opts = opts || {};
    var delay = (typeof opts.debounceMs === 'number') ? opts.debounceMs : SEARCH_DEBOUNCE_MS;
    cancelDebouncedSearch();
    var seq = ++debSeq;
    debTimer = setTimeout(function () {
      debTimer = null;
      var ctrl = null;
      try { ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null; } catch (e) { ctrl = null; }
      debController = ctrl;
      var o = { limit: opts.limit, timeoutMs: opts.timeoutMs, allowLocalFallback: opts.allowLocalFallback,
                fallbackOnEmpty: opts.fallbackOnEmpty };
      if (ctrl) o.signal = ctrl.signal;
      search(query, o).then(function (res) {
        if (seq !== debSeq) return; // superseded
        if (isFn(callback)) callback(res);
      }).catch(function (e) {
        if (seq !== debSeq) return;
        if (e && (e.name === 'AbortError' || e.message === 'aborted')) return;
        if (isFn(callback)) callback({ results: [], source: 'none', query: String(query || ''), error: String(e && e.message || e) });
      });
    }, delay);
    return cancelDebouncedSearch;
  }

  /* ---------------- public: ask ---------------- */
  function ask(question, opts) {
    opts = opts || {};
    var q = String(question == null ? '' : question).trim();
    if (!q) return Promise.reject(new Error('empty question'));
    var history = Array.isArray(opts.history) ? opts.history.slice(-6).map(function (m) {
      return { role: m && m.role, content: trimStr(m && m.content, 2000) };
    }) : [];
    var body = { question: q, history: history, context: trimStr(opts.context || '', 4000) };
    return fetchJSON('/api/ask', body, opts.timeoutMs || ASK_TIMEOUT_MS, opts.signal)
      .then(function (j) {
        var text = '';
        if (j && typeof j === 'object') {
          text = trimStr(j.text || j.answer || (j.result && j.result.response) || '', 12000).trim();
        }
        if (!text) throw new Error('empty answer');
        var res = { text: text, citations: normalizeCitations(j), source: 'api' };
        debug('ask api ok, citations:', res.citations.length);
        return res;
      })
      .catch(function (e) {
        if (e && (e.name === 'AbortError' || e.message === 'aborted')) throw e;
        /* No text-generation fallback exists locally by design. Callers
           that want "related articles instead of nothing" opt in with
           fallback: 'citations'; everyone else (supervisor chains) gets a
           rejection and falls through to their next provider. */
        if (opts.fallback === 'citations') {
          return localSearch(q, { limit: MAX_RESULTS }).then(function (lr) {
            return { text: '', citations: lr.results, source: 'local', error: String(e && e.message || e) };
          });
        }
        throw e;
      });
  }

  /* ---------------- public: triage (Worker-root contract) ----------------
     POST {base}/ { messages, mode: 'emergency' } -> { text }.
     Mirrors worker.js input limits (last 8 messages, 4000 chars each).
     NOT wired to any UI by WS-3; provided for the Worker workstream. */
  function triage(messages, opts) {
    opts = opts || {};
    var msgs = Array.isArray(messages) ? messages : [];
    msgs = msgs.filter(function (m) {
      return m && typeof m.content === 'string' && (m.role === 'system' || m.role === 'user' || m.role === 'assistant');
    }).map(function (m) { return { role: m.role, content: m.content.slice(0, 4000) }; }).slice(-8);
    if (!msgs.length) return Promise.reject(new Error('no_messages'));
    return fetchJSON('/', { messages: msgs, mode: 'emergency' }, opts.timeoutMs || TRIAGE_TIMEOUT_MS, opts.signal)
      .then(function (j) {
        var text = (j && typeof j === 'object') ? trimStr(j.text || '', 8000).trim() : '';
        if (!text) throw new Error('empty answer');
        return { text: text, source: 'worker' };
      });
  }

  /* ---------------- public: citations rendering ----------------
     DOM-safe: builds elements with textContent only, never innerHTML, so
     citation titles/URLs from the API cannot inject markup. Accepts the
     normalised citation objects returned by ask()/search(). */
  function safeHref(u) {
    u = String(u || '').trim();
    if (/^(https?:\/\/|\/|\.\/)/i.test(u)) return u;
    if (/^[A-Za-z0-9._~%\-]+(\/[A-Za-z0-9._~%\-?#=&]*)*$/.test(u)) return u; // site-relative path
    return '';
  }
  function renderCitations(citations, container) {
    if (!container || typeof document === 'undefined') return container || null;
    container.textContent = '';
    if (!citations || !citations.length) return container;
    var list = document.createElement('ol');
    list.className = 'vetai-citations';
    citations.forEach(function (c, i) {
      var li = document.createElement('li');
      var href = safeHref(c.url);
      if (href) {
        var a = document.createElement('a');
        a.href = href;
        a.textContent = c.title || href;
        if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
        li.appendChild(a);
      } else {
        li.textContent = c.title || '';
      }
      if (c.source) {
        var s = document.createElement('span');
        s.className = 'vetai-cit-src';
        s.textContent = ' — ' + c.source;
        li.appendChild(s);
      }
      list.appendChild(li);
    });
    container.appendChild(list);
    return container;
  }

  function configure(cfg) {
    cfg = cfg || {};
    if (typeof cfg.apiBase === 'string' && cfg.apiBase) apiBase = cfg.apiBase.replace(/\/+$/, '');
    if (typeof cfg.searchDebounceMs === 'number') SEARCH_DEBOUNCE_MS = cfg.searchDebounceMs;
    if (typeof cfg.searchTimeoutMs === 'number') SEARCH_TIMEOUT_MS = cfg.searchTimeoutMs;
    if (typeof cfg.askTimeoutMs === 'number') ASK_TIMEOUT_MS = cfg.askTimeoutMs;
  }

  window.VetAIClient = {
    __v: '1.0.0',
    version: '1.0.0',
    DEFAULT_API_BASE: DEFAULT_API_BASE,
    LOCAL_INDEX_URL: LOCAL_INDEX_URL,
    get API_BASE() { return apiBase; },
    configure: configure,
    search: search,
    debouncedSearch: debouncedSearch,
    cancelDebouncedSearch: cancelDebouncedSearch,
    ask: ask,
    triage: triage,
    localSearch: localSearch,
    clearLocalCache: clearLocalCache,
    renderCitations: renderCitations
  };
})();
