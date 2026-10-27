// غيّر هذا الرقم عند كل نشر جديد
const CACHE = 'vetai-v32';
const CORE = ['css/proactive-assistant.css', 'js/proactive-assistant.js', 'assets/animals/hero-dog.webp', 'js/lazy-views.js', 'js/ux-nav.js', 'css/ux-nav.css', 'css/consult-pricing.css', 'js/consult-pricing.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE))));
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

// الشبكة أولاً (نسخة جديدة دائماً)، والكاش فقط عند انقطاع الإنترنت
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
