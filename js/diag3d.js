/* TEMPORARY 3D DIAGNOSTIC v3 — objective pixel proof, no screenshots needed.
   Samples the alpha channel of each viewer's live canvas: a rendered animal
   yields many opaque pixels; an empty canvas yields ~0%.
   Also spawns a fresh viewer built at runtime inside the live page (DIAGMV)
   to compare against the site's own builder-made viewer (GRID0).
   Remove after diagnosis. */
(function () {
  'use strict';
  var t0 = Date.now();
  function ts() { return ((Date.now() - t0) / 1000).toFixed(1) + 's'; }
  var events = [];
  function log(msg) { events.push(ts() + ' ' + msg); if (events.length > 8) events.shift(); }

  var banner = document.createElement('pre');
  banner.id = 'diag3dBanner';
  banner.setAttribute('style', 'position:fixed;top:0;left:0;z-index:999999;background:rgba(0,0,0,.9);color:#4ade80;font:11px/1.5 monospace;padding:8px;white-space:pre-wrap;max-width:96vw;max-height:56vh;overflow:auto;pointer-events:none;direction:ltr;text-align:left;');
  function mount() { if (!banner.parentNode && document.body) document.body.appendChild(banner); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  /* ---------- fresh runtime-built viewer (control) ---------- */
  var diagMv = null, diagSpawned = false;
  function spawnDiag() {
    if (diagSpawned) return;
    var grid = document.getElementById('mv3dGrid');
    var sec = document.getElementById('view-media');
    if (!grid || !sec || sec.classList.contains('hidden')) return;
    diagSpawned = true;
    diagMv = document.createElement('model-viewer');
    diagMv.setAttribute('src', 'https://threejs.org/examples/models/gltf/Horse.glb');
    diagMv.setAttribute('camera-controls', '');
    diagMv.setAttribute('auto-rotate', '');
    diagMv.setAttribute('autoplay', '');
    diagMv.setAttribute('alt', 'DIAG control viewer');
    diagMv.style.cssText = 'width:329px;height:250px;display:block;background:#222;';
    grid.appendChild(diagMv);
    diagMv.addEventListener('load', function () { log('DIAGMV LOAD event'); });
    diagMv.addEventListener('error', function (e) { log('DIAGMV ERROR'); });
    log('DIAGMV spawned into grid');
  }

  /* ---------- pixel sampling ---------- */
  var proofs = {};
  function sample(mv, tag) {
    if (!mv) { proofs[tag] = 'absent'; return; }
    var c = mv.shadowRoot && mv.shadowRoot.querySelector('canvas');
    if (!c) { proofs[tag] = 'no-canvas'; return; }
    requestAnimationFrame(function () {
      try {
        var w = 64, h = 40;
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var cx = cv.getContext('2d');
        cx.drawImage(c, 0, 0, w, h);
        var d = cx.getImageData(0, 0, w, h).data;
        var opaque = 0, total = 0, seen = {};
        for (var i = 0; i < d.length; i += 4) {
          total++;
          if (d[i + 3] > 10) { opaque++; seen[(d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)] = 1; }
        }
        proofs[tag] = 'opaque=' + Math.round(100 * opaque / total) + '% colors=' + Object.keys(seen).length;
      } catch (e) { proofs[tag] = 'err:' + e.message; }
    });
  }

  function info(mv, tag) {
    if (!mv) return tag + ': absent';
    var r = mv.getBoundingClientRect();
    var anims = 0, orbit = 'err', target = 'err';
    try { anims = (mv.availableAnimations || []).length; } catch (e) {}
    try { orbit = 'r=' + mv.getCameraOrbit().radius.toFixed(1); } catch (e) {}
    try { var t = mv.getCameraTarget(); target = t.x.toFixed(1) + ',' + t.y.toFixed(1) + ',' + t.z.toFixed(1); } catch (e) {}
    return tag + ': rect=' + Math.round(r.width) + 'x' + Math.round(r.height) + ' anims=' + anims + ' orbit[' + orbit + '] target[' + target + ']';
  }

  log('diag v3 boot');
  setInterval(function () {
    mount();
    spawnDiag();
    var grid0 = document.querySelector('#mv3dGrid model-viewer');
    var stage = document.querySelector('.psmv');
    sample(grid0, 'GRID0');
    sample(diagMv, 'DIAGMV');
    sample(stage, 'STAGE');
    var lines = [
      'DIAG3Dv3 t=' + ts(),
      info(grid0, 'GRID0'),
      info(diagMv, 'DIAGMV'),
      info(stage, 'STAGE'),
      'PROOF GRID0: ' + (proofs.GRID0 || 'pending'),
      'PROOF DIAGMV: ' + (proofs.DIAGMV || 'pending'),
      'PROOF STAGE: ' + (proofs.STAGE || 'pending'),
      'EVENTS:'
    ].concat(events);
    banner.textContent = lines.join('\n');
  }, 3000);
})();
