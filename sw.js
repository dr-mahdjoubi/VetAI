/* VetAI service worker — غيّر رقم V عند أي تحديث كبير لإجبار تحديث الكاش */
const V='vetai-v2';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['./','index.html'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  const sameOrigin=u.origin===location.origin;
  const okExternal=/(^|\.)fonts\.(googleapis|gstatic)\.com$|^cdn\.tailwindcss\.com$/.test(u.host);
  if(!sameOrigin&&!okExternal)return;            // لا نتدخل في طلبات الذكاء الاصطناعي ولا الخدمات الأخرى
  if(/\.(pdf|mp4|webm|mov)$/i.test(u.pathname))return;         // الكتب: من الشبكة دائمًا (لا نملأ ذاكرة الهاتف)
  if(r.mode==='navigate'||u.pathname.endsWith('.json')||u.pathname.endsWith('.html')){
    e.respondWith(fetch(r).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;})
      .catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(r).then(m=>{
    const f=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;}).catch(()=>m);
    return m||f;
  }));
});
