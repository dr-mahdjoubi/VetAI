// ux-extras.js — VetAI Phase 4: back-to-top button + in-app 404 card.
// Small, dependency-free, defensive: never throws, never duplicates existing UI.
(function () {
  'use strict';

  /* ---------- Back to top ---------- */
  function addBackToTop() {
    if (document.querySelector('[data-btt], #backTop, .to-top, #toTop')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-btt', '1');
    btn.setAttribute('aria-label', 'العودة إلى الأعلى');
    btn.textContent = '⬆';
    btn.style.cssText = 'position:fixed;inset-inline-end:14px;bottom:86px;z-index:60;width:44px;height:44px;border-radius:50%;border:1px solid rgba(45,212,191,.5);background:rgba(6,32,24,.92);color:#5eead4;font-size:19px;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .2s ease;box-shadow:0 6px 18px rgba(0,0,0,.35)';
    btn.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
    document.body.appendChild(btn);
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var show = window.scrollY > 600;
        btn.style.opacity = show ? '1' : '0';
        btn.style.pointerEvents = show ? 'auto' : 'none';
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- In-app 404 ---------- */
  function checkHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h || !/^[a-z0-9-]+$/i.test(h)) return;
    if (document.getElementById(h) || document.getElementById('view-' + h)) {
      var old = document.getElementById('nf404');
      if (old) old.remove();
      return;
    }
    if (document.getElementById('nf404')) return;
    var card = document.createElement('div');
    card.id = 'nf404';
    card.setAttribute('role', 'alert');
    card.style.cssText = 'position:fixed;inset-inline:16px;top:76px;z-index:90;max-width:520px;margin-inline:auto;background:var(--card,#0d1b2a);border:1px solid rgba(45,212,191,.45);border-radius:16px;padding:18px;box-shadow:0 12px 32px rgba(0,0,0,.45);text-align:center';
    card.innerHTML = '<div style="font-size:34px">🧭</div>' +
      '<h2 style="margin:6px 0 4px;font-size:1.15rem">الصفحة غير موجودة</h2>' +
      '<p class="small" style="margin:0 0 12px;opacity:.85">الرابط الذي طلبته غير متاح. يمكنك العودة إلى الصفحة الرئيسية ومتابعة التصفح من هناك.</p>' +
      '<button type="button" id="nf404-home" style="min-height:44px;padding:10px 22px;border-radius:999px;border:0;background:#0b6e4f;color:#fff;font-weight:800;cursor:pointer">العودة إلى الرئيسية</button> ' +
      '<button type="button" id="nf404-x" style="min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid rgba(127,180,200,.4);background:transparent;color:inherit;cursor:pointer">إغلاق</button>';
    document.body.appendChild(card);
    function close() { card.remove(); }
    card.querySelector('#nf404-x').addEventListener('click', close);
    card.querySelector('#nf404-home').addEventListener('click', function () {
      close();
      if (typeof window.switchTab === 'function') window.switchTab('home');
    });
  }

  function init() { addBackToTop(); checkHash(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.addEventListener('hashchange', checkHash);
})();
