/* TEMPORARY 3D DIAGNOSTIC v2 — status banner + in-page render proof.
   Remove after diagnosis. Read-only w.r.t. the site; only READS viewer state. */
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
  banner.setAttribute('style', 'position:fixed;top:0;left:0;z-index:999999;background:rgba(0,0,0,.88);color:#4ade80;font:11px/1.5 monospace;padding:8px;white-space:pre-wrap;max-width:96vw;max-height:56vh;overflow:auto;pointer-events:none;direction:ltr;text-align:left;');
  function mount() { if (!banner.parentNode && document.body) document.body.appendChild(banner); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  var hooked = new WeakSet();
  function hook(mv, tag) {
    if (hooked.has(mv)) return; hooked.add(mv);
    mv.addEventListener('load', function () { log(tag + ' LOAD event'); });
    mv.addEventListener('error', function (e) { log(tag + ' ERROR ' + ((e && e.detail && (e.detail.message || e.detail.type)) || 'unknown')); });
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
    try { var o = mv.getCameraOrbit(); orbit = 'r=' + o.radius.toFixed(2); } catch (e) { orbit = 'err'; }
    var anims = 'n/a';
    try { anims = String((mv.availableAnimations || []).length); } catch (e) { anims = 'err'; }
    var src = (mv.getAttribute('src') || mv.src || '').split('/').pop();
    return tag + ': rect=' + Math.round(r.width) + 'x' + Math.round(r.height) +
      ' disp=' + cs.display + ' canvas=' + (c ? (c.width + 'x' + c.height) : 'none') +
      ' orbit[' + orbit + '] anims=' + anims + ' src=' + src;
  }

  /* ---- Render proof: sample the LIVE canvas inside a rAF frame + toDataURL size ---- */
  var proofs = {}; // tag -> string
  var proofBusy = {};
  function sampleCanvas(mv, tag) {
    var c = mv.shadowRoot && mv.shadowRoot.querySelector('canvas');
    if (!c) { proofs[tag] = 'no-canvas'; return; }
    requestAnimationFrame(function () {
      try {
        var w = 48, h = 48;
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var cx = cv.getContext('2d');
        cx.drawImage(c, 0, 0, w, h);
        var d = cx.getImageData(0, 0, w, h).data;
        var seen = {}, nonBg = 0, total = 0;
        var bgR = d[0], bgG = d[1], bgB = d[2];
        for (var i = 0; i < d.length; i += 4) {
          var key = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4);
          seen[key] = 1; total++;
          if (Math.abs(d[i] - bgR) > 24 || Math.abs(d[i + 1] - bgG) > 24 || Math.abs(d[i + 2] - bgB) > 24) nonBg++;
        }
        proofs[tag] = 'liveColors=' + Object.keys(seen).length + ' nonBg=' + Math.round(100 * nonBg / total) + '%';
      } catch (e) { proofs[tag] = 'sample-err:' + e.message; }
    });
  }
  function runProof(mv, tag) {
    if (!mv || proofBusy[tag]) return;
    var anims = 0;
    try { anims = (mv.availableAnimations || []).length; } catch (e) {}
    if (!anims) return;
    proofBusy[tag] = true;
    sampleCanvas(mv, tag);
    try {
      var p = mv.toDataURL && mv.toDataURL('image/png');
      Promise.resolve(p).then(function (url) {
        proofs[tag] = (proofs[tag] || '') + ' dataURLlen=' + (url ? url.length : 0);
      }).catch(function (e) { proofs[tag] = (proofs[tag] || '') + ' dataURLerr'; });
    } catch (e) { /* toDataURL unavailable */ }
    setTimeout(function () { proofBusy[tag] = false; }, 15000); // re-sample periodically
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
    runProof(grid, 'GRID0');
    runProof(stage, 'STAGE');
    var lines = [
      'DIAG3D t=' + ts() + ' webgl=' + probe + ' hidden=' + document.hidden,
      describe(grid, 'GRID0'),
      describe(stage, 'STAGE'),
      'PROOF GRID0: ' + (proofs.GRID0 || 'pending'),
      'PROOF STAGE: ' + (proofs.STAGE || 'pending'),
      'EVENTS:',
    ].concat(events);
    banner.textContent = lines.join('\n');
  }, 2000);
})();
