/**
 * VetAI Guard Worker — طبقة حماية اختيارية أمام الموقع على Cloudflare
 * ------------------------------------------------------------------
 * ماذا يفعل:
 *  1) يضيف ترويسات أمان لكل رد (CSP محافظ لا يكسر الموقع الحالي،
 *     منع التضمين الخارجي، منع تخمين نوع المحتوى، سياسة إحالة).
 *  2) يقدّم نقطة صحة JSON على /__health تلخّص حالة المرايا.
 *  3) معالج مجدوَل (Cron Trigger) يفحص المرايا دوريًا ويمكن ربطه
 *     بـ Webhook (تنبيه فوري عند سقوط مرآة).
 *
 * النشر (يتطلب حساب Cloudflare خاصًا بك ونطاقًا مخصصًا مربوطًا به):
 *   npx wrangler deploy worker/guard-worker.js --name vetai-guard
 * ثم اربط الـ Worker بمسار نطاقك من لوحة Cloudflare (Workers Routes).
 * ملاحظة: الاستضافة الحالية على نطاق workers.dev تابع لطرف ثالث، لذا
 * هذه الطبقة اختيارية وتُفعَّل عند انتقال الموقع إلى حسابك الخاص.
 */

const MIRRORS = [
  'https://vetai.vcom.workers.dev/',
  'https://drvet.onrender.com/',
  'https://dr-vetai.vercel.app/',
  'https://dr-mahdjoubi.github.io/VetAI/',
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  // CSP محافظ: يسمح بمصادر الموقع الحالية (صور/فيديوهات/خطوط/سكريبتات خارجية معروفة)
  'Content-Security-Policy':
    "default-src 'self' https: data: blob:; " +
    "script-src 'self' 'unsafe-inline' https:; " +
    "style-src 'self' 'unsafe-inline' https:; " +
    "img-src 'self' data: blob: https:; " +
    "media-src 'self' https: data: blob:; " +
    "frame-src https:; connect-src 'self' https:; " +
    "object-src 'none'; base-uri 'self'",
};

async function probe(url) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow', cf: { cacheTtl: 0 } });
    return { url, status: r.status, ok: r.status === 200, ms: Date.now() - t0 };
  } catch (e) {
    return { url, status: 0, ok: false, ms: Date.now() - t0, error: String(e).slice(0, 120) };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/__health') {
      const results = [];
      for (const m of MIRRORS) results.push(await probe(m));
      const ok = results.every(r => r.ok);
      return new Response(JSON.stringify({
        service: 'vetai-guard',
        at: new Date().toISOString(),
        overall: ok ? 'ok' : 'degraded',
        mirrors: results,
      }, null, 2), {
        status: ok ? 200 : 503,
        headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS },
      });
    }

    const response = await fetch(request);
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },

  async scheduled(event, env, ctx) {
    const results = [];
    for (const m of MIRRORS) results.push(await probe(m));
    const down = results.filter(r => !r.ok);
    console.log('vetai-guard scheduled check:', JSON.stringify(results));
    if (down.length && env.ALERT_WEBHOOK) {
      ctx.waitUntil(fetch(env.ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: `🛡️ VetAI Guard: ${down.length} مرآة متعثرة: ${down.map(d => d.url).join(', ')}`,
          at: new Date().toISOString(),
          results,
        }),
      }));
    }
  },
};
