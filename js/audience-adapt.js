/* VetAI v45 Wave C — Privacy-first audience adaptation.
   Counts section visits ON THIS DEVICE ONLY (localStorage), never transmits
   anything anywhere, holds no identifiers, and uses the counts solely to
   surface the visitor's own most-used sections on the home view — choosing
   only among the site's existing, pre-approved sections. Deleting site data
   erases the counts completely.                                          */
'use strict';
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const KEY = 'vetai_local_audience_v1';
  const LABELS = {
    'view-home': 'الرئيسية', 'view-ai-diagnostics': 'التشخيص الذكي', 'view-diseases': 'أطلس الأمراض',
    'view-knowledge': 'المعرفة', 'view-library': 'المكتبة', 'view-exams': 'الاختبارات',
    'view-drugs': 'دليل الأدوية', 'view-media': 'الوسائط', 'view-pets': 'الحيوانات الأليفة',
    'view-services': 'الخدمات', 'view-fun': 'الترفيه', 'view-chat': 'المساعد الذكي'
  };
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }
  function bump(id) {
    if (!LABELS[id] || id === 'view-home') return;
    const c = load(); c[id] = (c[id] || 0) + 1; save(c);
  }
  function visible(el) {
    return el && (el.classList.contains('active') || el.style.display === 'block' ||
      (el.style.display !== 'none' && el.offsetParent !== null && !el.hidden));
  }
  function watch() {
    const views = Array.from(document.querySelectorAll('[id^="view-"]'));
    const obs = new MutationObserver(() => {
      views.forEach(v => { if (visible(v) && v.dataset.audiSeen !== '1') { v.dataset.audiSeen = '1'; bump(v.id); } });
    });
    views.forEach(v => obs.observe(v, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] }));
    renderStrip();
  }
  function renderStrip() {
    const home = document.getElementById('view-home');
    if (!home || document.getElementById('audi45')) return;
    const counts = load();
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).filter(id => LABELS[id]).slice(0, 3);
    if (top.length < 2) return; // adapt only once a real pattern exists on this device
    const strip = document.createElement('div');
    strip.id = 'audi45';
    strip.innerHTML = '<small>⭐ الأكثر استخدامًا على هذا الجهاز (تكييف محلي — لا تُرسل أي بيانات):</small> ' +
      top.map(id => '<button type="button" data-audi-go="' + id + '">' + LABELS[id] + '</button>').join(' ');
    home.insertBefore(strip, home.firstChild);
    strip.addEventListener('click', e => {
      const id = e.target && e.target.getAttribute && e.target.getAttribute('data-audi-go');
      const target = id && document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }
  window.VetAI_Audience = { load, bump, KEY };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
}
