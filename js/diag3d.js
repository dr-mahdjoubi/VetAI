/* TEMPORARY 3D DIAGNOSTIC — renders a live status banner for model-viewer elements.
   Remove after diagnosis. Read-only: never touches the viewers themselves. */
(function () {
  'use strict';
  var t0 = Date.now();
  function ts() { return ((Date.now() - t0) / 1000).toFixed(1) + 's'; }
  var events = [];
  function log(msg) {
    events.push(ts() + ' ' + msg);
    if (events.length > 8) events.shift();
  }
  var banner = document.createElement('pre');
  banner.id = 'diag3dBanner';
  banner.setAttribute('style', 'position:fixed;top:0;left:0;z-index:999999;background:rgba(0,0,0,.88);color:#4ade80;font:11px/1.5 monospace;padding:8px;white-space:pre-wrap;max-width:96vw;max-height:52vh;overflow:auto;pointer-events:none;direction:ltr;text-align:left;');
  function mount() { if (!banner.parentNode && document.body) document.body.appendChild(banner); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  var hooked = new WeakSet();
  function hook(mv, tag) {
    if (hooked.has(mv)) return; hooked.add(mv);
    mv.addEventListener('load', function () { log(tag + ' LOAD event'); });
    mv.addEventListener('error', function (e) { log(tag + ' ERROR ' + ((e && e.detail && (e.detail.message || e.detail.type)) || 'unknown')); });
    mv.addEventListener('camera-change', function () { /* presence only */ });
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var c = mv.shadowRoot && mv.shadowRoot.querySelector('canvas');
      if (c) {
        clearInterval(iv);
        c.addEventListener('webglcontextlost', function (e) { log(tag + ' WEBGL CONTEXT LOST'); e.preventDefault(); });
        c.addEventListener('webglcontextrestored', function () { log(tag + ' WEBGL CONTEXT RESTORED'); });
        log(tag + ' shadow canvas found');
      } else if (tries > 40) clearInterval(iv);
    }, 500);
  }
  function describe(mv, tag) {
    if (!mv) return tag + ': (absent)';
    hook(mv, tag);
    var r = mv.getBoundingClientRect();
    var cs = getComputedStyle(mv);
    var c = mv.shadowRoot && mv.shadowRoot.querySelector('canvas');
    var orbit = 'n/a';
    try { var o = mv.getCameraOrbit(); orbit = 'r=' + o.radius.toFixed(2) + ' theta=' + o.theta.toFixed(2) + ' phi=' + o.phi.toFixed(2); } catch (e) { orbit = 'err'; }
    var anims = 'n/a';
    try { anims = String((mv.availableAnimations || []).length); } catch (e) { anims = 'err'; }
    var src = (mv.getAttribute('src') || '').split('/').pop();
    return tag + ': rect=' + Math.round(r.width) + 'x' + Math.round(r.height) +
      ' disp=' + cs.display + ' vis=' + cs.visibility +
      ' canvas=' + (c ? (c.width + 'x' + c.height) : 'none') +
      ' orbit[' + orbit + '] anims=' + anims + ' src=' + src;
  }
  function webglProbe() {
    try {
      var cv = document.createElement('canvas');
      var gl = cv.getContext('webgl2') || cv.getContext('webgl');
      return gl ? 'OK' : 'NULL';
    } catch (e) { return 'THROW'; }
  }
  var probe = webglProbe(); log('webgl probe at boot: ' + probe);
  var tick = 0;
  setInterval(function () {
    mount();
    tick++;
    if (tick % 5 === 0) probe = webglProbe();
    var grid = document.querySelector('#mv3dGrid model-viewer');
    var stage = document.querySelector('.psmv');
    var lines = [
      'DIAG3D t=' + ts() + ' webgl=' + probe + ' hidden=' + document.hidden,
      describe(grid, 'GRID0'),
      describe(stage, 'STAGE'),
      'EVENTS:',
    ].concat(events);
    banner.textContent = lines.join('\n');
  }, 2000);
})();
