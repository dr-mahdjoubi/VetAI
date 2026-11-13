# Vectorize setup — VetAI RAG backend

> **Who does this:** Noe (the owner), in his own Cloudflare account.
> The agent prepares the code only; it cannot create the index, confirm
> bindings, or deploy. No secrets, keys, or tokens are needed for any
> step below — never paste an API token into chat or into the repo.

## What this sets up

The Worker (`worker.js`) answers questions from indexed veterinary sources:

- `POST /api/ask` — grounded answers with citations.
- `GET /api/search` — vector search + lexical fallback.
- `GET /api/health` — liveness and binding check.

For that to work, Cloudflare needs two things:

1. A **Vectorize index** named `vetai-corpus` (1024 dimensions, cosine).
2. The Worker bound to it as variable **`VECTORIZE`**, plus the existing
   Workers AI binding as variable **`AI`** (already in `wrangler.toml`).

The index starts **empty**. Creating it does not index any books or
articles — a separate ingestion workstream fills it later. Until then,
`/api/ask` honestly returns the "unknown" fallback and `/api/search`
returns lexical results only. That is expected, not an error.

## Read this first — two things to confirm

1. **Worker name.** `wrangler.toml` says `name = "vetai"`, but the site's
   frontend currently calls a Worker at `vetai-chat.vcom.workers.dev`.
   The repo does **not** prove which Worker name/account runs `worker.js`.
   Before deploying, confirm in the dashboard which Worker you are
   updating, and use that Worker's URL for the checks in Part C. Do not
   guess — if the names do not match, ask the coordinator before deploying.
2. **Dimensions cannot be changed.** Once the index is created with 1024
   dimensions and cosine metric, those settings are fixed. 1024 must match
   the embedding model `@cf/baai/bge-m3` (1024 output dimensions,
   confirmed in the Cloudflare docs). If the index is ever created with
   the wrong dimensions, the only fix is to delete it and recreate it
   (which deletes all indexed vectors), then re-index.

## Part A — Dashboard steps (no command line)

### A1. Create the Vectorize index

1. Log in to the Cloudflare dashboard and select the correct account
   (the account that owns the VetAI Worker).
2. Open **Workers & Pages**, then open **Vectorize**. (If you cannot see
   it in the left menu, use the dashboard search box and type
   "Vectorize".)
3. Click **Create index** (or **Create**).
4. Enter the index name exactly: `vetai-corpus`
5. Set **Dimensions** to `1024`.
6. Set **Metric** to `cosine`.
7. Create the index. Leave it empty — do not add vectors by hand.

### A2. Bind the Worker to the index and confirm the AI binding

1. In **Workers & Pages**, open your VetAI Worker (see "Worker name"
   above — confirm this is the Worker that runs `worker.js`).
2. Open **Settings**, then **Bindings**.
3. Confirm a binding with **Variable name** `AI` and type **Workers AI**
   already exists. If it is missing, click **Add**, choose **Workers AI**,
   set **Variable name** to `AI`, and save. (This is the binding the
   original `worker.js` comment requires.)
4. Click **Add**, choose **Vectorize index**.
5. Set **Variable name** to exactly `VECTORIZE`.
6. Under **Vectorize index**, select `vetai-corpus`.
7. Save. If the dashboard asks you to deploy/redeploy for the binding
   to take effect, do so.

> Note: `wrangler.toml` in the repo already declares both bindings
> (`[ai]` → `AI`, `[[vectorize]]` → `VECTORIZE` / `vetai-corpus`), so a
> normal `wrangler deploy` (Part B) also applies them. The dashboard
> check above is how you *confirm* they are live.

### A3. Deploy the updated Worker code

The repo has **no automatic deploy** for `worker.js` (no GitHub workflow
deploys it). Deploying is a manual step, done only after the coordinator
has committed the new `worker.js` + `wrangler.toml` to the branch and
confirmed the Worker name/account:

- Either deploy from the dashboard (upload/paste the new `worker.js`,
  keeping the bindings from A2), or
- Use the CLI in Part B, which is the recommended route because it uses
  `wrangler.toml` exactly as committed.

Do not deploy from any other branch or file version.

## Part B — CLI alternative (Wrangler)

Run these from the repo root, on a machine where Node.js is installed.
The coordinator must first have committed the new `worker.js` and
`wrangler.toml` and confirmed the Worker name/account.

```bash
# 1. Log in to Cloudflare (opens a browser window; approve the request).
npx wrangler login

# 2. Create the index: 1024 dimensions, cosine metric. Run once.
npx wrangler vectorize create vetai-corpus --dimensions=1024 --metric=cosine

# 3. Confirm the index exists and shows 1024 dimensions / cosine.
npx wrangler vectorize info vetai-corpus

# 4. Create metadata indexes for `kind` and `lang` BEFORE the first
#    upsert (vectors written earlier are NOT added retroactively).
#    The indexer stores these on every chunk; the Worker can filter
#    on them later. Run once.
npx wrangler vectorize create-metadata-index vetai-corpus --propertyName kind --type string
npx wrangler vectorize create-metadata-index vetai-corpus --propertyName lang --type string

# 5. Deploy the Worker. wrangler.toml already declares the AI + Vectorize
#    bindings, so this deploy applies them.
npx wrangler deploy
```

If step 2 says the index already exists, do **not** recreate it — go to
step 3 and check its dimensions/metric instead. If they are wrong, stop
and ask the coordinator: recreating deletes all indexed vectors.

## Part C — Verify it works (no secrets needed)

Replace `WORKER_URL` with your Worker's real URL from the dashboard
(the `https://<worker-name>.<subdomain>.workers.dev` address shown on
the Worker's page). Run these from any terminal, or open the first URL
in a browser:

```bash
# 1. Health: expect "ok":true, "ai":true, "vectorize":true.
curl -s "$WORKER_URL/api/health"

# 2. Search: expect a JSON list (possibly empty until indexing runs).
curl -s "$WORKER_URL/api/search?q=feline%20asthma&k=5"

# 3. Ask: expect the "unknown" fallback until documents are indexed.
curl -s -X POST "$WORKER_URL/api/ask" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is feline asthma?","k":5,"lang":"en"}'

# 4. Legacy emergency endpoint: unchanged behaviour (returns {"text": ...}).
curl -s -X POST "$WORKER_URL/" \
  -H "Content-Type: application/json" \
  -d '{"mode":"emergency","messages":[{"role":"user","content":"test"}]}'
```

Expected results:

| Check | Healthy result |
|---|---|
| `/api/health` | `"ok":true`, `"ai":true`, `"vectorize":true` |
| `/api/search` | HTTP 200, `{"results":[...],"count":N}` (N may be 0) |
| `/api/ask` (empty index) | HTTP 200, `"grounded":false`, citations `[]` |
| `POST /` (legacy) | HTTP 200, `{"text":"..."}` as before |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Health shows `"vectorize":false` | Binding missing or wrong variable name | Repeat A2: variable must be exactly `VECTORIZE`, index `vetai-corpus`; redeploy. |
| Health shows `"ai":false` | Workers AI binding missing | Repeat A2 step 3: add Workers AI binding named `AI`; redeploy. |
| `/api/ask` returns `rag_unavailable` (503) | A binding is missing at runtime | Same as above; then redeploy. |
| `/api/ask` returns `embedding_failed` (502) | Embedding model returned the wrong shape/size | Check the Worker is deployed from the current `worker.js`; if it persists, report it to the coordinator with the time of the request. |
| Vectorize dimension-mismatch error | Index created with dimensions other than 1024 | Stop. Deleting/recreating the index deletes vectors. Ask the coordinator before recreating. |
| AI calls start failing late in the day | Daily free Neurons allowance spent (resets 00:00 UTC) | Wait for reset, or upgrade to Workers Paid. See "Free-tier limits" below. |
| `rate_limited` (429) | More than 60 requests/minute from one IP | Wait up to 60 seconds and retry. This is the Worker's own per-IP limit. |

## Free-tier limits (checked 2026-11-13 — verify before relying on them)

Sources (Cloudflare docs):

- Embedding model, 1024 dims (BAAI spec table; multilingual):
  <https://huggingface.co/BAAI/bge-m3> and the hosted variant
  <https://developers.cloudflare.com/workers-ai/models/bge-m3/>
- Vectorize pricing:
  <https://developers.cloudflare.com/vectorize/platform/pricing/>
- Workers AI pricing (Neurons):
  <https://developers.cloudflare.com/workers-ai/platform/pricing/>

| Service | Workers Free includes | What it means here |
|---|---|---|
| Vectorize stored dimensions | 5,000,000 total | At 1024 dims/vector: **~4,882 vectors max** within the free storage allowance. The measured full corpus is 30,282 vectors (31,008,768 dims) — it does **not** fit the free tier. Workers Paid ($5/month, 10M dims included) + a small overage (~$0.01/month at the measured size) is required for full-corpus RAG. A metadata-only corpus (5,155 vectors, 5,278,720 dims) also slightly exceeds the free allowance. |
| Vectorize queried dimensions | 30,000,000 / month | Formula: `(queries + stored vectors) × 1024`. With 5,000 stored vectors, ~24,296 queries/month fit. Generous for current traffic. |
| Vectorize indexes | 100 per account | Only 1 is used (`vetai-corpus`). |
| Workers AI Neurons | 10,000 / day (resets 00:00 UTC; calls fail when spent on Free) | One `/api/ask` with the 70B model costs roughly 100+ Neurons, so the free allowance covers **on the order of dozens of answers per day**, shared with the legacy emergency endpoint. Embeddings with bge-m3 are cheap (~1,075 Neurons per 1M input tokens): embedding the full measured corpus costs ~3,805 Neurons, inside one free day. |

**Honest verdict:** embedding the corpus fits the free tier, but
**storing the full corpus in Vectorize does not** — full-corpus RAG needs
Workers Paid (owner's decision, not an automatic upgrade). The free tier
suffices for a prototype with a disciplined chunk budget (keep total
vectors at or below ~4,800) and for low Q&A traffic. Until the index
exists and is filled, the Worker degrades gracefully to lexical search
over the bundled titles index, so the site keeps working.

## What this setup does NOT do

- It does not index any content. Indexing is a separate workstream.
- It does not change the site, the `guard-worker.js` file, or any mirror.
- It does not add any secret, key, or token to the repo or the Worker.
- It does not deploy automatically. Every deploy is manual and confirmed.
