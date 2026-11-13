// Plain-node routing tests for worker.js — no Cloudflare auth, no deps.
// Run from the repo root (or from the ws-1 scratch dir, same layout):
//   node --test tests/worker-routing.test.mjs
//
// The worker's fetch handler is imported with mocked env { AI, VECTORIZE }.
// Every test group uses its own client IP (CF-Connecting-IP) so the
// per-IP rate limiter cannot leak between tests. The rate-limit test uses
// one dedicated IP and 61 requests against GET / (no AI calls needed).
//
// NOTE: the lexical index file (data/rag-lexical.json) is absent in this
// environment on purpose: the "vector-only when index absent" test proves
// search degrades safely. Lexical behaviour itself is exercised through
// the documented env override RAG_LEXICAL_JSON.

import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../worker.js';

const BASE = 'http://127.0.0.1:9'; // nothing listens here: lexical fetch fallback fails fast
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const EMBEDDING_MODEL = '@cf/baai/bge-m3';

let ipCounter = 10;
function nextIp() {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`;
}

function makeVector(value = 0.01) {
  return Array.from({ length: 1024 }, () => value);
}

function createMockAI({ llmResponse = 'Mock answer [1].', embeddingVector = null, fail = false } = {}) {
  const calls = [];
  return {
    calls,
    run: async (model, input) => {
      calls.push({ model, input });
      if (fail) throw new Error('mock AI failure');
      if (model === EMBEDDING_MODEL) {
        return { shape: [1, 1024], data: [embeddingVector || makeVector()] };
      }
      return { response: llmResponse };
    },
  };
}

function createMockVectorize(matches, { fail = false } = {}) {
  const calls = [];
  return {
    calls,
    query: async (vector, opts) => {
      calls.push({ vectorLength: vector.length, opts });
      if (fail) throw new Error('mock Vectorize failure');
      return { matches, count: matches.length };
    },
  };
}

function makeRequest(path, { method = 'GET', body, ip, headers = {} } = {}) {
  const init = {
    method,
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip || nextIp(), ...headers },
  };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request(BASE + path, init);
}

async function fetchJson(request, env) {
  const res = await worker.fetch(request, env);
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { res, data, text };
}

function vectorMatch({ id = 'doc-1', score = 0.9, title = 'Feline Asthma', url = '/diseases/feline-asthma.html', text = 'Indexed passage about feline asthma.' } = {}) {
  return { id, score, metadata: { title, url, text } };
}

// ---------------------------------------------------------------------------
// (a) Legacy POST / behaviour
// ---------------------------------------------------------------------------

test('(a) legacy POST / emergency: same model, emergency params, same shape', async () => {
  const ai = createMockAI();
  const { res, data } = await fetchJson(
    makeRequest('/', {
      method: 'POST',
      body: {
        mode: 'emergency',
        messages: [
          { role: 'system', content: 'user-supplied system, must be dropped' },
          { role: 'user', content: 'cat cannot breathe' },
        ],
      },
    }),
    { AI: ai },
  );
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(data), ['text']);
  assert.equal(data.text, 'Mock answer [1].');
  assert.equal(ai.calls.length, 1);
  assert.equal(ai.calls[0].model, MODEL);
  assert.equal(ai.calls[0].input.max_tokens, 380);
  assert.equal(ai.calls[0].input.temperature, 0.15);
  const msgs = ai.calls[0].input.messages;
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].role, 'system');
  assert.match(msgs[0].content, /veterinary emergency triage assistant/);
  assert.equal(msgs[1].role, 'user');
  assert.equal(msgs[1].content, 'cat cannot breathe');
});

test('(a) legacy POST / non-emergency: 900 tokens, 0.3, last 8 messages, 4000-char cap', async () => {
  const ai = createMockAI();
  const messages = Array.from({ length: 10 }, (_, i) => ({ role: 'user', content: `m${i} ` + 'x'.repeat(5000) }));
  const { res, data } = await fetchJson(makeRequest('/', { method: 'POST', body: { messages } }), { AI: ai });
  assert.equal(res.status, 200);
  assert.equal(data.text, 'Mock answer [1].');
  assert.equal(ai.calls[0].model, MODEL);
  assert.equal(ai.calls[0].input.max_tokens, 900);
  assert.equal(ai.calls[0].input.temperature, 0.3);
  const msgs = ai.calls[0].input.messages;
  assert.equal(msgs.length, 8); // slice(-8)
  assert.equal(msgs[0].content.startsWith('m2 '), true);
  assert.equal(msgs[0].content.length, 4000); // slice(0, 4000)
  assert.ok(!msgs.some((m) => m.role === 'system'));
});

test('(a) legacy POST / errors keep original codes: bad_json, no_messages, empty, ai_failed', async () => {
  const ai = createMockAI();
  const bad = await fetchJson(makeRequest('/', { method: 'POST', body: '{not json' }), { AI: ai });
  assert.equal(bad.res.status, 400);
  assert.deepEqual(bad.data, { error: 'bad_json' });

  const none = await fetchJson(makeRequest('/', { method: 'POST', body: { messages: [] } }), { AI: ai });
  assert.equal(none.res.status, 400);
  assert.deepEqual(none.data, { error: 'no_messages' });

  const emptyAi = createMockAI({ llmResponse: '   ' });
  const empty = await fetchJson(
    makeRequest('/', { method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }] } }),
    { AI: emptyAi },
  );
  assert.equal(empty.res.status, 502);
  assert.deepEqual(empty.data, { error: 'empty' });

  const failingAi = createMockAI({ fail: true });
  const failed = await fetchJson(
    makeRequest('/', { method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }] } }),
    { AI: failingAi },
  );
  assert.equal(failed.res.status, 502);
  assert.deepEqual(failed.data, { error: 'ai_failed' });
});

test('(a) legacy GET / returns {ok:true, service:vetai}', async () => {
  const { res, data } = await fetchJson(makeRequest('/'), {});
  assert.equal(res.status, 200);
  assert.deepEqual(data, { ok: true, service: 'vetai' });
});

// ---------------------------------------------------------------------------
// (b) POST /api/ask — grounded answers + unknown fallback
// ---------------------------------------------------------------------------

test('(b) /api/ask returns citations + grounded answer, embeds then generates', async () => {
  const ai = createMockAI({ llmResponse: 'Answer grounded in sources [1] [2].' });
  const vectorize = createMockVectorize([
    vectorMatch({ id: 'doc-1', title: 'Feline Asthma', url: '/diseases/feline-asthma.html' }),
    vectorMatch({ id: 'doc-2', title: 'Asthma Care', url: '/articles/a010.html', text: 'Second indexed passage.' }),
  ]);
  const { res, data } = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'What is feline asthma?' } }),
    { AI: ai, VECTORIZE: vectorize },
  );
  assert.equal(res.status, 200);
  assert.equal(data.grounded, true);
  assert.equal(data.answer, 'Answer grounded in sources [1] [2].');
  assert.deepEqual(data.citations, [
    { title: 'Feline Asthma', url: '/diseases/feline-asthma.html' },
    { title: 'Asthma Care', url: '/articles/a010.html' },
  ]);
  // Embedding call first, with the query as a one-element text array.
  assert.equal(ai.calls[0].model, EMBEDDING_MODEL);
  assert.deepEqual(ai.calls[0].input, { text: ['What is feline asthma?'] });
  // Generation call second, same LLM model, grounded system prompt.
  assert.equal(ai.calls[1].model, MODEL);
  assert.equal(ai.calls[1].input.max_tokens, 600);
  assert.equal(ai.calls[1].input.temperature, 0.2);
  assert.match(ai.calls[1].input.messages[0].content, /Answer ONLY from the numbered sources/);
  assert.match(ai.calls[1].input.messages[0].content, /Never invent drug names, doses/);
  assert.match(ai.calls[1].input.messages[1].content, /Feline Asthma/);
  assert.match(ai.calls[1].input.messages[1].content, /What is feline asthma\?/);
  // Vectorize queried with a 1024-dim vector, default k = 5, metadata 'all'.
  assert.equal(vectorize.calls.length, 1);
  assert.equal(vectorize.calls[0].vectorLength, 1024);
  assert.equal(vectorize.calls[0].opts.topK, 5);
  assert.equal(vectorize.calls[0].opts.returnMetadata, 'all');
});

test('(b) /api/ask unknown fallback on empty retrieval: no LLM generation call', async () => {
  const ai = createMockAI();
  const vectorize = createMockVectorize([]);
  const { res, data } = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'obscure question with no indexed answer' } }),
    { AI: ai, VECTORIZE: vectorize },
  );
  assert.equal(res.status, 200);
  assert.equal(data.grounded, false);
  assert.deepEqual(data.citations, []);
  assert.match(data.answer, /لا أجد إجابة موثوقة/);
  assert.equal(ai.calls.length, 1); // embedding only; generation never called
  assert.equal(ai.calls[0].model, EMBEDDING_MODEL);
});

test('(b) /api/ask unknown fallback on low-score matches', async () => {
  const ai = createMockAI();
  const vectorize = createMockVectorize([vectorMatch({ score: 0.1 })]);
  const { res, data } = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'unrelated question' } }),
    { AI: ai, VECTORIZE: vectorize },
  );
  assert.equal(res.status, 200);
  assert.equal(data.grounded, false);
  assert.deepEqual(data.citations, []);
  assert.equal(ai.calls.length, 1);
});

test('(b) /api/ask unknown fallback honours lang (en/fr)', async () => {
  const vectorize = createMockVectorize([]);
  const en = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'q?', lang: 'en' } }),
    { AI: createMockAI(), VECTORIZE: vectorize },
  );
  assert.match(en.data.answer, /^I cannot find a reliable answer/);
  const fr = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'q?', lang: 'fr' } }),
    { AI: createMockAI(), VECTORIZE: createMockVectorize([]) },
  );
  assert.match(fr.data.answer, /^Je ne trouve pas de réponse fiable/);
});

test('(b) /api/ask validation: no_query, query_too_long, k bounds, missing bindings, bad embedding', async () => {
  const ai = createMockAI();
  const vectorize = createMockVectorize([vectorMatch()]);

  const missing = await fetchJson(makeRequest('/api/ask', { method: 'POST', body: {} }), { AI: ai, VECTORIZE: vectorize });
  assert.equal(missing.res.status, 400);
  assert.deepEqual(missing.data, { error: 'no_query' });

  const blank = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: '   ' } }),
    { AI: ai, VECTORIZE: vectorize },
  );
  assert.equal(blank.res.status, 400);
  assert.deepEqual(blank.data, { error: 'no_query' });

  const badJson = await fetchJson(makeRequest('/api/ask', { method: 'POST', body: '[1,2' }), { AI: ai, VECTORIZE: vectorize });
  assert.equal(badJson.res.status, 400);
  assert.deepEqual(badJson.data, { error: 'bad_json' });

  // k clamping: 999 -> 10, 0 -> 1, 'abc' -> 5 (default).
  const vzHigh = createMockVectorize([vectorMatch()]);
  await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'q', k: 999 } }),
    { AI: createMockAI(), VECTORIZE: vzHigh },
  );
  assert.equal(vzHigh.calls[0].opts.topK, 10);
  const vzLow = createMockVectorize([vectorMatch()]);
  await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'q', k: 0 } }),
    { AI: createMockAI(), VECTORIZE: vzLow },
  );
  assert.equal(vzLow.calls[0].opts.topK, 1);
  const vzBad = createMockVectorize([vectorMatch()]);
  await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'q', k: 'abc' } }),
    { AI: createMockAI(), VECTORIZE: vzBad },
  );
  assert.equal(vzBad.calls[0].opts.topK, 5);

  // Missing bindings -> 503 rag_unavailable (no AI call).
  const aiNoBinding = createMockAI();
  const unavailable = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'q' } }),
    { AI: aiNoBinding },
  );
  assert.equal(unavailable.res.status, 503);
  assert.deepEqual(unavailable.data, { error: 'rag_unavailable' });
  assert.equal(aiNoBinding.calls.length, 0);

  // Wrong-dimension embedding -> 502 embedding_failed.
  const badEmbedAi = createMockAI({ embeddingVector: [0.1, 0.2, 0.3, 0.4] });
  const badEmbed = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'q' } }),
    { AI: badEmbedAi, VECTORIZE: createMockVectorize([vectorMatch()]) },
  );
  assert.equal(badEmbed.res.status, 502);
  assert.deepEqual(badEmbed.data, { error: 'embedding_failed' });

  // Vectorize failure -> 502 vectorize_failed.
  const vecFail = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'q' } }),
    { AI: createMockAI(), VECTORIZE: createMockVectorize([], { fail: true }) },
  );
  assert.equal(vecFail.res.status, 502);
  assert.deepEqual(vecFail.data, { error: 'vectorize_failed' });
});

// ---------------------------------------------------------------------------
// (c) GET /api/search
// ---------------------------------------------------------------------------

test('(c) /api/search returns vector results with title/url/score/source', async () => {
  const vectorize = createMockVectorize([
    vectorMatch({ title: 'Feline Asthma', url: '/diseases/feline-asthma.html', text: 'Passage text here.' }),
  ]);
  const { res, data } = await fetchJson(
    makeRequest('/api/search?q=feline+asthma'),
    { AI: createMockAI(), VECTORIZE: vectorize },
  );
  assert.equal(res.status, 200);
  assert.equal(data.count, 1);
  assert.equal(data.results.length, 1);
  assert.equal(data.results[0].title, 'Feline Asthma');
  assert.equal(data.results[0].url, '/diseases/feline-asthma.html');
  assert.equal(data.results[0].source, 'vector');
  assert.equal(data.results[0].score, 0.9);
  assert.equal(data.results[0].snippet, 'Passage text here.');
});

test('(c) /api/search with absent lexical index returns vector results only, no crash', async () => {
  // No RAG_LEXICAL_JSON override and no data/rag-lexical.json in this
  // environment: the loader must fall through to an empty index.
  const vectorize = createMockVectorize([vectorMatch()]);
  const { res, data } = await fetchJson(makeRequest('/api/search?q=asthma'), { AI: createMockAI(), VECTORIZE: vectorize });
  assert.equal(res.status, 200);
  assert.equal(data.count, 1);
  assert.equal(data.results[0].source, 'vector');

  // No bindings at all: still 200 with an empty list, never a crash.
  const empty = await fetchJson(makeRequest('/api/search?q=asthma'), {});
  assert.equal(empty.res.status, 200);
  assert.deepEqual(empty.data, { results: [], count: 0 });
});

test('(c) /api/search lexical fallback via override, merge + dedupe by URL', async () => {
  const lexical = JSON.stringify([
    { title: 'Feline Asthma Guide', url: '/diseases/feline-asthma.html' },
    { title: 'Canine Parvovirus', url: '/diseases/canine-parvovirus-enteritis.html' },
  ]);
  // Vector empty -> lexical fills.
  const fallback = await fetchJson(
    makeRequest('/api/search?q=asthma'),
    { AI: createMockAI(), VECTORIZE: createMockVectorize([]), RAG_LEXICAL_JSON: lexical },
  );
  assert.equal(fallback.res.status, 200);
  assert.equal(fallback.data.count, 1);
  assert.equal(fallback.data.results[0].title, 'Feline Asthma Guide');
  assert.equal(fallback.data.results[0].source, 'lexical');

  // Same URL in both: vector wins, no duplicate.
  const merged = await fetchJson(
    makeRequest('/api/search?q=asthma&k=5'),
    {
      AI: createMockAI(),
      VECTORIZE: createMockVectorize([vectorMatch({ title: 'Feline Asthma', url: '/diseases/feline-asthma.html' })]),
      RAG_LEXICAL_JSON: lexical,
    },
  );
  assert.equal(merged.data.count, 1);
  assert.equal(merged.data.results[0].source, 'vector');

  // No token match anywhere -> empty list.
  const nomatch = await fetchJson(
    makeRequest('/api/search?q=zzzzqqqq'),
    { AI: createMockAI(), VECTORIZE: createMockVectorize([]), RAG_LEXICAL_JSON: lexical },
  );
  assert.deepEqual(nomatch.data, { results: [], count: 0 });
});

test('(c) /api/search validation: no_query 400, query_too_long 413, k clamped', async () => {
  const missing = await fetchJson(makeRequest('/api/search'), { AI: createMockAI(), VECTORIZE: createMockVectorize([]) });
  assert.equal(missing.res.status, 400);
  assert.deepEqual(missing.data, { error: 'no_query' });

  const blank = await fetchJson(makeRequest('/api/search?q=%20%20'), { AI: createMockAI(), VECTORIZE: createMockVectorize([]) });
  assert.equal(blank.res.status, 400);
  assert.deepEqual(blank.data, { error: 'no_query' });

  const long = await fetchJson(
    makeRequest(`/api/search?q=${'a'.repeat(501)}`),
    { AI: createMockAI(), VECTORIZE: createMockVectorize([]) },
  );
  assert.equal(long.res.status, 413);
  assert.deepEqual(long.data, { error: 'query_too_long' });

  const vz = createMockVectorize([]);
  await fetchJson(makeRequest('/api/search?q=asthma&k=999'), { AI: createMockAI(), VECTORIZE: vz });
  assert.equal(vz.calls[0].opts.topK, 10);
});

// ---------------------------------------------------------------------------
// (d) GET /api/health
// ---------------------------------------------------------------------------

test('(d) /api/health ok with bindings, and ok with binding flags false, no secrets', async () => {
  const full = await fetchJson(makeRequest('/api/health'), { AI: createMockAI(), VECTORIZE: createMockVectorize([]) });
  assert.equal(full.res.status, 200);
  assert.equal(full.data.ok, true);
  assert.equal(full.data.service, 'vetai');
  assert.equal(full.data.ai, true);
  assert.equal(full.data.vectorize, true);
  assert.deepEqual(full.data.endpoints, ['POST /', 'POST /api/ask', 'GET /api/search', 'GET /api/health']);

  const bare = await fetchJson(makeRequest('/api/health'), {});
  assert.equal(bare.res.status, 200);
  assert.equal(bare.data.ok, true);
  assert.equal(bare.data.ai, false);
  assert.equal(bare.data.vectorize, false);

  // No secret-like keys or values anywhere in the health payload.
  assert.match(JSON.stringify(full.data), /^(?!.*(token|secret|password|api[_-]?key))/i);
  assert.deepEqual(Object.keys(full.data).sort(), ['ai', 'endpoints', 'ok', 'service', 'vectorize']);
});

// ---------------------------------------------------------------------------
// (e) Rate limiting
// ---------------------------------------------------------------------------

test('(e) rate limit triggers: 60 allowed, 61st is 429 with Retry-After', async () => {
  const ip = nextIp();
  let lastStatus = 0;
  let lastData = null;
  let retryAfter = null;
  for (let i = 0; i < 61; i++) {
    const { res, data } = await fetchJson(makeRequest('/', { ip }), {});
    lastStatus = res.status;
    lastData = data;
    if (i === 60) retryAfter = res.headers.get('Retry-After');
    if (i < 60) assert.equal(res.status, 200, `request ${i + 1} should pass`);
  }
  assert.equal(lastStatus, 429);
  assert.deepEqual(lastData, { error: 'rate_limited' });
  assert.ok(retryAfter !== null && Number(retryAfter) >= 1);
});

// ---------------------------------------------------------------------------
// (f) CORS
// ---------------------------------------------------------------------------

test('(f) CORS headers present on preflight and responses; legacy root keeps POST-only methods', async () => {
  const preflightApi = await worker.fetch(
    makeRequest('/api/ask', { method: 'OPTIONS' }),
    {},
  );
  assert.equal(preflightApi.status, 204);
  assert.equal(preflightApi.headers.get('Access-Control-Allow-Origin'), '*');
  assert.match(preflightApi.headers.get('Access-Control-Allow-Methods'), /GET/);
  assert.match(preflightApi.headers.get('Access-Control-Allow-Methods'), /POST/);

  const preflightRoot = await worker.fetch(makeRequest('/', { method: 'OPTIONS' }), {});
  assert.equal(preflightRoot.status, 204);
  assert.equal(preflightRoot.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(preflightRoot.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');

  const health = await fetchJson(makeRequest('/api/health'), {});
  assert.equal(health.res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(health.res.headers.get('Content-Type'), 'application/json; charset=utf-8');

  const legacy = await fetchJson(
    makeRequest('/', { method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }] } }),
    { AI: createMockAI() },
  );
  assert.equal(legacy.res.headers.get('Access-Control-Allow-Origin'), '*');
});

// ---------------------------------------------------------------------------
// (g) Oversized input rejected + routing errors
// ---------------------------------------------------------------------------

test('(g) oversized /api/ask query rejected with 413', async () => {
  const ai = createMockAI();
  const { res, data } = await fetchJson(
    makeRequest('/api/ask', { method: 'POST', body: { query: 'a'.repeat(1001) } }),
    { AI: ai, VECTORIZE: createMockVectorize([]) },
  );
  assert.equal(res.status, 413);
  assert.deepEqual(data, { error: 'query_too_long' });
  assert.equal(ai.calls.length, 0); // rejected before any AI call
});

test('routing: 404 unknown paths, 405 method mismatches, trailing slash tolerated', async () => {
  const env = { AI: createMockAI(), VECTORIZE: createMockVectorize([]) };

  const getAsk = await fetchJson(makeRequest('/api/ask'), env);
  assert.equal(getAsk.res.status, 405);
  assert.deepEqual(getAsk.data, { error: 'method_not_allowed' });

  const postSearch = await fetchJson(makeRequest('/api/search', { method: 'POST', body: {} }), env);
  assert.equal(postSearch.res.status, 405);

  const postHealth = await fetchJson(makeRequest('/api/health', { method: 'POST', body: {} }), env);
  assert.equal(postHealth.res.status, 405);

  const unknownApi = await fetchJson(makeRequest('/api/nope'), env);
  assert.equal(unknownApi.res.status, 404);
  assert.deepEqual(unknownApi.data, { error: 'not_found' });

  const unknownPath = await fetchJson(makeRequest('/unknown-path'), env);
  assert.equal(unknownPath.res.status, 404);

  const trailing = await fetchJson(makeRequest('/api/health/'), env);
  assert.equal(trailing.res.status, 200);
  assert.equal(trailing.data.ok, true);
});
