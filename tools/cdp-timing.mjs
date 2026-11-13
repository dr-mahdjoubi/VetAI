// WS-5 fallback/complement timing harness (no dependencies, Node >= 22).
// Measures UNTHROTTLED first-load timings + network totals via CDP against a
// locally served copy, fresh browser profile per run. Offline conditions:
// external requests fail in the headless shell (ERR_TUNNEL_CONNECTION_FAILED),
// exactly as in the Lighthouse runs, so numbers are comparable to those runs'
// *observed* (unthrottled) values, NOT to the throttled Lighthouse scores.
//
// Usage (from the repo-copy server root already running on 127.0.0.1:8471):
//   CHROME=/path/to/chrome-headless-shell node cdp-timing.mjs <url> <runs> <out.json>
// Env: CHROME (required), PROFILE_BASE (default /tmp/ws5-cdp-profile).
import { spawn } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

const CHROME = process.env.CHROME;
const URL = process.argv[2] || "http://127.0.0.1:8471/";
const RUNS = parseInt(process.argv[3] || "3", 10);
const OUT = process.argv[4] || "cdp-timing.json";
const PROFILE_BASE = process.env.PROFILE_BASE || "/tmp/ws5-cdp-profile";
if (!CHROME) { console.error("CHROME env var required"); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDebugger(port, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error("devtools endpoint did not come up");
}

async function oneRun(port, profileDir) {
  rmSync(profileDir, { recursive: true, force: true });
  const chrome = spawn(CHROME, [
    "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`,
    "--window-size=412,915", "about:blank",
  ], { stdio: "ignore" });
  try {
    await waitForDebugger(port);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find((t) => t.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let seq = 0;
    const pending = new Map();
    const bytesByType = new Map(); // mimeType -> bytes
    const requests = new Map();    // requestId -> {url, mimeType, status}
    let reqCount = 0, failCount = 0;
    let loadEventFired = false;

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
        return;
      }
      const m = msg.method, p = msg.params || {};
      if (m === "Network.requestWillBeSent") {
        reqCount++;
        requests.set(p.requestId, { url: p.request.url, mimeType: "", status: null });
      } else if (m === "Network.responseReceived") {
        const r = requests.get(p.requestId);
        if (r) { r.mimeType = p.response.mimeType || ""; r.status = p.response.status; }
      } else if (m === "Network.loadingFinished") {
        const r = requests.get(p.requestId);
        const b = p.encodedDataLength || 0;
        const key = r ? (r.mimeType || "(unknown)") : "(unknown)";
        bytesByType.set(key, (bytesByType.get(key) || 0) + b);
      } else if (m === "Network.loadingFailed") {
        failCount++;
      } else if (m === "Page.loadEventFired") {
        loadEventFired = true;
      }
    };

    await send("Page.enable");
    await send("Network.enable");
    await send("Runtime.enable");
    await send("Page.navigate", { url: URL });
    // Wait for load + 4s settle (page fires late JSON/RSS fetches after load).
    const t0 = Date.now();
    while ((!loadEventFired || Date.now() - t0 < 4000) && Date.now() - t0 < 45000) await sleep(250);
    await sleep(4000);

    const evalJs = async (expr) => {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
      return r.result.value;
    };
    const nav = await evalJs(`(()=>{const n=performance.getEntriesByType("navigation")[0];return {domContentLoadedEventEnd:n.domContentLoadedEventEnd,loadEventEnd:n.loadEventEnd,responseEnd:n.responseEnd,transferSize:n.transferSize,domInteractive:n.domInteractive,domComplete:n.domComplete};})()`);
    const counts = await evalJs(`({elements:document.getElementsByTagName("*").length,images:document.images.length,scripts:document.scripts.length,stylesheets:document.styleSheets.length})`);
    const paint = await evalJs(`(()=>{const e={};for(const p of performance.getEntriesByType("paint"))e[p.name]=p.startTime;return e;})()`);
    ws.close();
    return {
      nav, counts, paint,
      requestsSeen: reqCount, failedRequests: failCount,
      bytesByMimeType: Object.fromEntries(bytesByType),
      totalEncodedBytes: [...bytesByType.values()].reduce((a, b) => a + b, 0),
    };
  } finally {
    chrome.kill("SIGKILL");
    await sleep(500);
  }
}

const results = [];
for (let i = 0; i < RUNS; i++) {
  const port = 9333 + i;
  console.log(`run ${i + 1}/${RUNS} ...`);
  results.push(await oneRun(port, `${PROFILE_BASE}-${i}`));
  console.log(JSON.stringify(results[i].nav), "elements=" + results[i].counts.elements,
    "totalBytes=" + results[i].totalEncodedBytes, "reqs=" + results[i].requestsSeen);
}
writeFileSync(OUT, JSON.stringify({ url: URL, runs: results }, null, 2));
console.log("wrote " + OUT);
