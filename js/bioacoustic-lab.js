/* VetAI v45 — Wave D: Bioacoustic Logic Lab.
   Fully on-device acoustic analysis: the audio never leaves the browser.
   Measures objective features only (unit segmentation by energy, dominant
   frequency per frame via FFT, harmonicity) and reports NUMERIC SIMILARITY
   to ranges reported in the cited bioacoustics literature. It does NOT
   classify emotions, pain or health states — such claims would exceed the
   evidence, and the UI says so next to every result.                     */
'use strict';

/* ---------- radix-2 FFT (iterative, dependency-free) ---------- */
function fftMagnitudes(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1, cwi = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cwr - im[i + k + len / 2] * cwi;
        const vi = re[i + k + len / 2] * cwi + im[i + k + len / 2] * cwr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nwr = cwr * wr - cwi * wi; cwi = cwr * wi + cwi * wr; cwr = nwr;
      }
    }
  }
  const mags = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  return mags;
}

/* ---------- Core analysis on raw samples ----------
   samples: Float32Array mono; sampleRate: Hz.
   Returns measured features + frame spectra (for the spectrogram).     */
function analyzeSamples(samples, sampleRate) {
  const FRAME = 2048, HOP = 1024;
  const frames = [];
  const win = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1)); // Hann
  let maxRms = 0;
  const rmsList = [];
  for (let start = 0; start + FRAME <= samples.length; start += HOP) {
    let sum = 0;
    for (let i = 0; i < FRAME; i++) { const v = samples[start + i]; sum += v * v; }
    const rms = Math.sqrt(sum / FRAME);
    rmsList.push(rms); if (rms > maxRms) maxRms = rms;
  }
  const threshold = Math.max(0.02, maxRms * 0.25);
  for (let f = 0; f < rmsList.length; f++) {
    const start = f * HOP;
    const re = new Float32Array(FRAME), im = new Float32Array(FRAME);
    for (let i = 0; i < FRAME; i++) { re[i] = samples[start + i] * win[i]; }
    const mags = fftMagnitudes(re, im);
    let peakBin = 0, peakVal = 0;
    const minBin = Math.max(1, Math.floor((20 * FRAME) / sampleRate));
    const maxBin = Math.min(FRAME / 2 - 1, Math.ceil((6000 * FRAME) / sampleRate));
    for (let b = minBin; b <= maxBin; b++) if (mags[b] > peakVal) { peakVal = mags[b]; peakBin = b; }
    const domHz = (peakBin * sampleRate) / FRAME;
    // harmonicity: share of spectral energy at F0 multiples (2f,3f,4f) vs broadband peak region
    let harm = 0;
    if (rmsList[f] >= threshold && peakBin > 0) {
      let hSum = 0, tSum = 0;
      for (let b = minBin; b <= maxBin; b++) tSum += mags[b];
      for (let mult = 1; mult <= 4; mult++) {
        const tb = peakBin * mult; if (tb > maxBin) break;
        for (let b = Math.max(minBin, tb - 1); b <= Math.min(maxBin, tb + 1); b++) hSum += mags[b];
      }
      harm = tSum > 0 ? Math.min(1, hSum / tSum) : 0;
    }
    frames.push({ t: start / sampleRate, rms: rmsList[f], active: rmsList[f] >= threshold, domHz, harm, mags });
  }
  // unit segmentation over active frames
  const units = [];
  let cur = null;
  frames.forEach(fr => {
    if (fr.active && !cur) cur = { start: fr.t, end: fr.t, f0s: [], harms: [] };
    if (cur) {
      if (fr.active) { cur.end = fr.t; if (fr.domHz >= 20) cur.f0s.push(fr.domHz); if (fr.harm > 0) cur.harms.push(fr.harm); }
      else { units.push(cur); cur = null; }
    }
  });
  if (cur) units.push(cur);
  const frameDur = HOP / sampleRate;
  const good = units.filter(u => (u.end - u.start + frameDur) * 1000 >= 30);
  const median = arr => { if (!arr.length) return null; const a = arr.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  const unitDurs = good.map(u => (u.end - u.start + frameDur) * 1000);
  const gaps = [];
  for (let i = 1; i < good.length; i++) gaps.push((good[i].start - good[i - 1].end) * 1000);
  const allF0 = good.flatMap(u => u.f0s);
  const allHarm = good.flatMap(u => u.harms);
  const features = {
    durationSec: Math.round((samples.length / sampleRate) * 100) / 100,
    units: good.length,
    unitDurMs: median(unitDurs),
    gapMs: median(gaps),
    f0MedHz: median(allF0),
    f0MinHz: allF0.length ? Math.min.apply(null, allF0) : null,
    f0MaxHz: allF0.length ? Math.max.apply(null, allF0) : null,
    harmonicity: allHarm.length ? Math.round((allHarm.reduce((a, b) => a + b, 0) / allHarm.length) * 100) / 100 : null
  };
  return { features, frames: frames.map(f => ({ t: f.t, active: f.active, domHz: f.domHz, rms: f.rms })) };
}

/* ---------- Similarity to literature-reported ranges ----------
   score = share of the pattern's defined features whose measured value
   falls inside the reported range. Reported with the feature table so the
   reader sees exactly which features matched and which did not.        */
function matchPatterns(features, patterns) {
  return patterns.map(p => {
    const rows = [];
    let inside = 0, defined = 0;
    Object.keys(p.range).forEach(k => {
      const v = features[k];
      if (v == null) return;
      defined++;
      const [lo, hi] = p.range[k];
      const ok = v >= lo && v <= hi;
      if (ok) inside++;
      rows.push({ feature: k, value: Math.round(v * 100) / 100, range: [lo, hi], inside: ok });
    });
    return { id: p.id, name_ar: p.name_ar, name_en: p.name_en, src: p.src, rows,
      score: defined ? Math.round((inside / defined) * 100) : 0, defined };
  }).filter(r => r.defined >= 2).sort((a, b) => b.score - a.score);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyzeSamples, matchPatterns, fftMagnitudes };
}

/* ---------- Browser UI ---------- */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.VetAI_BioLab = { analyzeSamples, matchPatterns };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
  let patterns = null;
  function mount() {
    const view = document.getElementById('view-ai-diagnostics');
    if (!view || document.getElementById('biolab45')) return;
    const sec = document.createElement('section');
    sec.id = 'biolab45';
    sec.innerHTML = '<h3>🔬 مختبر المنطق الصوتي الحيوي (v45)</h3>' +
      '<p>ارفع تسجيلًا صوتيًا لحيوانك أو سجّل من الميكروفون: يُحلَّل الصوت <b>على جهازك بالكامل</b> (لا يُرسل ولا يُحفظ) — وحدات صوتية، تردد أساسي، انسجام توافقي — ثم تُقارَن القياسات رقميًا بمديات موصوفة في أدبيات علم الصوتيات الحيوية مع مصادرها. <b>هذا تشابه قياسي مع مديات منشورة، وليس تشخيصًا لمشاعر أو ألم أو حالة صحية.</b></p>' +
      '<input type="file" id="blFile" accept="audio/*"> ' +
      '<button type="button" id="blMic">🎙️ تسجيل من الميكروفون</button> ' +
      '<canvas id="blSpec" width="640" height="160" style="max-width:100%;background:#111"></canvas>' +
      '<div id="blOut" aria-live="polite"></div>';
    view.appendChild(sec);
    const out = sec.querySelector('#blOut');
    function ensurePatterns() {
      if (patterns) return Promise.resolve(patterns);
      return fetch('json/bioacoustic-patterns.json').then(r => r.json()).then(j => { patterns = j.patterns; return patterns; });
    }
    function drawSpec(frames) {
      const cv = sec.querySelector('#blSpec'), ctx = cv.getContext('2d');
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cv.width, cv.height);
      if (!frames.length) return;
      const maxT = frames[frames.length - 1].t || 1;
      frames.forEach(f => {
        if (!f.active) return;
        const x = (f.t / maxT) * cv.width;
        const y = cv.height - Math.min(cv.height, (f.domHz / 3000) * cv.height);
        ctx.fillStyle = '#ffb347';
        ctx.fillRect(x, y, 3, 3);
      });
    }
    function run(samples, sr) {
      ensurePatterns().then(pats => {
        const { features, frames } = analyzeSamples(samples, sr);
        drawSpec(frames);
        const matches = matchPatterns(features, pats);
        let h = '<p>المدة: ' + features.durationSec + 'ث · الوحدات الصوتية: ' + features.units +
          (features.unitDurMs ? ' · مدة الوحدة الوسطى: ' + Math.round(features.unitDurMs) + 'ms' : '') +
          (features.f0MedHz ? ' · التردد الأساسي الوسطي: ' + Math.round(features.f0MedHz) + 'Hz (المدى ' + Math.round(features.f0MinHz || 0) + '–' + Math.round(features.f0MaxHz || 0) + ')' : '') +
          (features.harmonicity != null ? ' · الانسجام التوافقي: ' + features.harmonicity : '') + '</p>';
        if (!matches.length) h += '<p>تعذّرت المقارنة: إشارة صوتية غير كافية (تسجيل قصير جدًا أو صامت).</p>';
        else h += matches.slice(0, 3).map(mt =>
          '<div style="border:1px solid #ccc;border-radius:8px;padding:8px;margin:6px 0"><b>' + esc(mt.name_ar) + '</b> — تشابه قياسي ' + mt.score + '% ' +
          '<small>(' + esc(mt.src) + ')</small><br>' +
          mt.rows.map(r => '<small>' + r.feature + ': ' + r.value + ' ضمن [' + r.range[0] + '–' + r.range[1] + '] ' + (r.inside ? '✓' : '✗') + '</small>').join(' · ') + '</div>').join('');
        h += '<p><small>تذكير: التشابه مع مديات الأدبيات لا يحدد نوع الصوت بيقين ولا يعني أي استنتاج عن المشاعر أو الصحة؛ عند القلق على الحيوان فالفحص البيطري هو المرجع.</small></p>';
        out.innerHTML = h;
      }).catch(() => { out.innerHTML = 'تعذّر تحميل مكتبة الأنماط.'; });
    }
    sec.querySelector('#blFile').addEventListener('change', ev => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      out.innerHTML = 'جارٍ التحليل على جهازك…';
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      f.arrayBuffer().then(buf => ctx.decodeAudioData(buf)).then(ab => run(ab.getChannelData(0), ab.sampleRate))
        .catch(() => { out.innerHTML = 'تعذّر قراءة هذا الملف الصوتي.'; });
    });
    let recorder = null, chunks = [];
    sec.querySelector('#blMic').addEventListener('click', () => {
      if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) { out.innerHTML = 'التسجيل غير مدعوم في هذا المتصفح؛ ارفع ملفًا صوتيًا.'; return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        chunks = []; recorder = new MediaRecorder(stream);
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          out.innerHTML = 'جارٍ التحليل على جهازك…';
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          blob.arrayBuffer().then(buf => ctx.decodeAudioData(buf)).then(ab => run(ab.getChannelData(0), ab.sampleRate))
            .catch(() => { out.innerHTML = 'تعذّر تحليل التسجيل.'; });
        };
        recorder.start();
        out.innerHTML = '🔴 يُسجّل الآن… اضغط الزر مجددًا للإيقاف (حتى 15 ثانية).';
        setTimeout(() => { if (recorder && recorder.state === 'recording') recorder.stop(); }, 15000);
      }).catch(() => { out.innerHTML = 'تعذّر الوصول إلى الميكروفون.'; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
}
