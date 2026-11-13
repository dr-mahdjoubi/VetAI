/* VetAI hash router (Batch F, audit item 1 — incremental step only).
 *
 * The homepage stays a single-page app: this file adds deep links over the
 * working SPA instead of splitting the monolith (the full split is
 * documented as remainder work in docs/deferred-rule1.md).
 *
 * Behaviour:
 *  - Wraps window.switchTab (monkey-patch; the inline definition is never
 *    edited) so every view switch updates the URL hash to the view name
 *    (#library, #diseases, ...) via history.pushState.
 *  - On load, a hash naming a known view activates that view; unknown or
 *    empty hashes fall through to the default (home) with no error. A
 *    leading slash (#/library) is accepted on read; only #name is written.
 *  - Back/forward work through the hashchange handler (pushState itself
 *    fires no hashchange, so no loop is possible).
 *  - Anchor fall-through: a hash naming an element id inside a view (e.g.
 *    #myLib, #unis) activates that view first, activates the enclosing
 *    library tab when the element sits in a hidden #libTabs panel (by
 *    clicking the existing tab button — the site's own mechanism), opens
 *    closed <details> ancestors (mirroring openEl), then scrolls the
 *    element into view. An already-visible element is left to the
 *    browser's native anchor scroll untouched.
 *  - Syncs the branch-explorer active state: the existing .active class
 *    (plus aria-current="page") on [data-branch] buttons matching the
 *    current view. switchTab's own btn-* mechanism and the #gnav painter
 *    are untouched.
 *
 * View names are DERIVED from the section[id^="view-"] elements in the DOM
 * at wrap time, so the list cannot drift from the markup. The hardcoded
 * FALLBACK list is used only if no view sections exist at all (it mirrors
 * switchTab's own hide-list plus the two view sections that list omits:
 * diseases and pets).
 *
 * Ordering note: this script is loaded with defer AFTER every other script
 * tag, so it wraps the outermost switchTab (including the #gnav, uni-only,
 * vx, lazy-views and diseases-atlas wrappers, all of which call through).
 * Marker properties (__dz, __vx, __vetaiLazyHooked) are copied onto the
 * wrapper so later guard checks (e.g. diseases-atlas re-wrapping on window
 * load) still see them and do not double-wrap.
 */
(function () {
  'use strict';

  /* Fallback only — see header. Must match switchTab's hide-list + diseases/pets. */
  var FALLBACK_VIEWS = ['catalog', 'home', 'media', 'ai-diagnostics', 'chat',
    'knowledge', 'ref', 'drugs', 'dxlab', 'aim', 'bio', 'exams', 'library',
    'services', 'fun', 'creator', 'about', 'legal', 'diseases', 'pets'];

  var suppressPush = false;

  function deriveViews() {
    var views = {};
    var secs = document.querySelectorAll('section[id^="view-"]');
    for (var i = 0; i < secs.length; i++) {
      var id = secs[i].getAttribute('id');
      if (id && id.length > 5) views[id.slice(5)] = true;
    }
    if (Object.keys(views).length === 0) {
      for (var j = 0; j < FALLBACK_VIEWS.length; j++) views[FALLBACK_VIEWS[j]] = true;
    }
    return views;
  }

  var VIEWS = null;
  function isView(name) {
    if (!VIEWS) VIEWS = deriveViews();
    return !!name && !!VIEWS[name];
  }

  function parseHash() {
    var h = (window.location.hash || '').replace(/^#/, '');
    if (h.charAt(0) === '/') h = h.slice(1);
    try { h = decodeURIComponent(h); } catch (e) { /* keep raw */ }
    return h;
  }

  function currentHashName() { return parseHash(); }

  function syncNav(viewName) {
    var btns = document.querySelectorAll('[data-branch]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-branch') === viewName;
      btns[i].classList.toggle('active', on);
      if (on) btns[i].setAttribute('aria-current', 'page');
      else btns[i].removeAttribute('aria-current');
    }
  }

  function containingView(el) {
    if (!el) return null;
    if (el.tagName === 'SECTION' && el.id && el.id.indexOf('view-') === 0) return el.id.slice(5);
    var s = el.closest ? el.closest('section[id^="view-"]') : null;
    return s ? s.id.slice(5) : null;
  }

  function isHiddenByViewOrTab(el) {
    var n = el;
    while (n && n !== document.body) {
      if (n.classList && n.classList.contains('hidden')) return true;
      if (n.style && n.style.display === 'none') return true;
      if (n.tagName === 'DETAILS' && !n.open) return true;
      n = n.parentElement;
    }
    return el.getClientRects().length === 0;
  }

  function activateLibTabFor(el) {
    /* Reuse the existing #libTabs mechanism: click the tab button whose
       data-libtab names the panel containing the element. */
    var panel = el.closest ? el.closest('[role="tabpanel"]') : null;
    if (!panel || !panel.id) return;
    if (panel.style.display !== 'none') return;
    var btn = document.querySelector('#libTabs [data-libtab="' + panel.id + '"]');
    if (btn) btn.click();
  }

  function openDetailsAncestors(el) {
    var n = el.parentElement;
    while (n && n !== document.body) {
      if (n.tagName === 'DETAILS' && !n.open) n.open = true;
      n = n.parentElement;
    }
  }

  function scrollToEl(el) {
    /* switchTab scrolls to the top (smooth); scroll after a short delay so
       the element — not the top — is the final position. */
    setTimeout(function () {
      try {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      } catch (e) {
        el.scrollIntoView();
      }
    }, 90);
  }

  function activateViaSwitchTab(viewName) {
    suppressPush = true;
    try {
      window.switchTab(viewName);
    } finally {
      suppressPush = false;
    }
  }

  function handleHash() {
    var name = parseHash();
    if (!name) return;
    if (isView(name)) {
      activateViaSwitchTab(name);
      return;
    }
    var el = document.getElementById(name);
    if (!el) return; /* unknown hash: default behaviour, no error */
    if (!isHiddenByViewOrTab(el)) return; /* visible: native anchor scroll stands */
    var view = containingView(el);
    if (view) activateViaSwitchTab(view);
    activateLibTabFor(el);
    openDetailsAncestors(el);
    scrollToEl(el);
  }

  function wrap() {
    var orig = window.switchTab;
    if (typeof orig !== 'function') return false;
    if (orig.__vetaiRouter) return true;
    VIEWS = deriveViews();
    var wrapped = function (tabId) {
      var r = orig.apply(this, arguments);
      if (typeof tabId === 'string' && isView(tabId)) {
        syncNav(tabId);
        if (!suppressPush && currentHashName() !== tabId) {
          try { history.pushState(null, '', '#' + tabId); } catch (e) { /* e.g. file:// */ }
        }
      }
      return r;
    };
    /* Preserve markers other wrappers use as already-wrapped guards. */
    var markers = ['__dz', '__vx', '__vetaiLazyHooked'];
    for (var i = 0; i < markers.length; i++) {
      if (orig[markers[i]]) wrapped[markers[i]] = orig[markers[i]];
    }
    wrapped.__vetaiRouter = true;
    window.switchTab = wrapped;
    return true;
  }

  function init() {
    if (!wrap()) {
      /* switchTab not defined yet (should not happen: this script is
         deferred and loads last). Retry once at DOMContentLoaded. */
      if (document.readyState !== 'complete') {
        document.addEventListener('DOMContentLoaded', function onReady() {
          document.removeEventListener('DOMContentLoaded', onReady);
          if (wrap()) handleHash();
        });
      }
      return;
    }
    window.addEventListener('hashchange', handleHash);
    /* Initial activation runs at DOMContentLoaded, NOT immediately:
       deferred scripts execute while readyState is 'interactive', i.e.
       BEFORE DOMContentLoaded — and the #libTabs initializer (registered
       during parsing, hence earlier) only attaches its click handlers
       and hides inactive panels at DOMContentLoaded. Activating here
       would run before the tab mechanism exists (verified: tab 3 stayed
       inactive). At DOMContentLoaded the router's listener runs after
       the tab initializer, so tab clicks work. If the document is
       already complete, activate immediately (tabs are initialized). */
    if (document.readyState !== 'complete') {
      document.addEventListener('DOMContentLoaded', handleHash);
    } else {
      handleHash();
    }
  }

  init();
})();
