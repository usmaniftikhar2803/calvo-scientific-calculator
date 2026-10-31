/* Passport Photo Maker - everything runs in the browser, photos are never uploaded.
   AI: Google MediaPipe selfie segmentation (background) + face detection (framing), both self-hosted in /vendor/mediapipe. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  if (!$('ppApp')) return;

  var V = 'vendor/mediapipe/';
  var DPI = 300, WORK = 1100, SRC_MAX = 2600, MM = 25.4;
  var PAPERS = { a4: [210, 297, 'A4'], p46: [101.6, 152.4, '4 x 6 inch'], p57: [127, 178, '5 x 7 inch'], letter: [215.9, 279.4, 'Letter'] };

  var S = {
    src: null, iw: 0, ih: 0, ww: 0, wh: 0, gray: null, mG: null,
    proc: null, fin: null, face: null, auto: null,
    view: { fx: 0, fy: 0, fh: 1, rot: 0 },
    bg: '#ffffff', keepBg: false, size: { w: 35, h: 45 },
    bright: 0, contrast: 0, light: 0, marks: 0, autoLight: 0, autoMarks: 0, soft: 1, grow: 0,
    wc: null, wcPix: null, rt: null, ref: null, rollDeg: 0, flags: { straight: true, light: true, skin: true },
    strokes: [], mode: 'erase', brush: 40, check: false, guide: true,
    tab: 'bg', busy: false, sheetDirty: true
  };
  var T1 = document.createElement('canvas'), T2 = document.createElement('canvas');
  var cv = $('ppCanvas');
  var raf = 0, procRaf = 0;

  /* ---------- small helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function status(msg, kind) { var s = $('ppStatus'); s.textContent = msg || ''; s.className = 'status' + (kind ? ' ' + kind : ''); }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var el = document.createElement('script'); el.src = src; el.onload = res;
      el.onerror = function () { rej(new Error('Could not load ' + src)); }; document.head.appendChild(el);
    });
  }
  var libs = {};
  function lib(name, src) { if (!libs[name]) libs[name] = loadScript(src); return libs[name]; }
  function withTimeout(p, ms, msg) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error(msg || 'Timed out')); }, ms); })]);
  }
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); res(im); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('open')); };
      im.src = url;
    });
  }
  function toBlob(c, type, q) { return new Promise(function (res) { c.toBlob(res, type, q); }); }
  function download(blob, name) {
    var a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500);
  }
  function mmToPx(mm) { return Math.round(mm / MM * DPI); }

  /* ---------- mask maths ---------- */
  function boxF(src, w, h, r) {
    var tmp = new Float32Array(w * h), out = new Float32Array(w * h), x, y, o, s, c, a, b;
    for (y = 0; y < h; y++) {
      o = y * w; s = 0; c = 0;
      for (x = 0; x <= r && x < w; x++) { s += src[o + x]; c++; }
      for (x = 0; x < w; x++) {
        tmp[o + x] = s / c; a = x + r + 1; b = x - r;
        if (a < w) { s += src[o + a]; c++; } if (b >= 0) { s -= src[o + b]; c--; }
      }
    }
    for (x = 0; x < w; x++) {
      s = 0; c = 0;
      for (y = 0; y <= r && y < h; y++) { s += tmp[y * w + x]; c++; }
      for (y = 0; y < h; y++) {
        out[y * w + x] = s / c; a = y + r + 1; b = y - r;
        if (a < h) { s += tmp[a * w + x]; c++; } if (b >= 0) { s -= tmp[b * w + x]; c--; }
      }
    }
    return out;
  }
  /* edge-aware smoothing: snaps the rough AI mask to the real edges of the photo (guided filter) */
  function guided(I, p, w, h, r, eps) {
    var n = w * h, Ip = new Float32Array(n), II = new Float32Array(n), i;
    for (i = 0; i < n; i++) { Ip[i] = I[i] * p[i]; II[i] = I[i] * I[i]; }
    var mI = boxF(I, w, h, r), mp = boxF(p, w, h, r), mIp = boxF(Ip, w, h, r), mII = boxF(II, w, h, r);
    var a = new Float32Array(n), b = new Float32Array(n);
    for (i = 0; i < n; i++) { var v = mII[i] - mI[i] * mI[i], c = mIp[i] - mI[i] * mp[i]; a[i] = c / (v + eps); b[i] = mp[i] - a[i] * mI[i]; }
    var ma = boxF(a, w, h, r), mb = boxF(b, w, h, r), q = new Float32Array(n);
    for (i = 0; i < n; i++) q[i] = clamp(ma[i] * I[i] + mb[i], 0, 1);
    return q;
  }
  function morph(src, w, h, r, isMax) {
    var t = new Float32Array(w * h), o = new Float32Array(w * h), x, y, k, v, u;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      v = src[y * w + x];
      for (k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) { u = src[y * w + k]; if (isMax ? u > v : u < v) v = u; }
      t[y * w + x] = v;
    }
    for (x = 0; x < w; x++) for (y = 0; y < h; y++) {
      v = t[y * w + x];
      for (k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) { u = t[k * w + x]; if (isMax ? u > v : u < v) v = u; }
      o[y * w + x] = v;
    }
    return o;
  }

  /* ---------- AI ---------- */
  async function runSegmentation(wc) {
    await lib('seg', V + 'selfie/selfie_segmentation.js');
    var ss = new SelfieSegmentation({ locateFile: function (f) { return V + 'selfie/' + f; } });
    ss.setOptions({ modelSelection: 0 });
    var mask = null; ss.onResults(function (r) { mask = r.segmentationMask; });
    await withTimeout(ss.initialize(), 60000, 'AI start timed out');
    await withTimeout(ss.send({ image: wc }), 60000, 'AI timed out');
    var c = document.createElement('canvas'); c.width = S.ww; c.height = S.wh;
    var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(mask, 0, 0, S.ww, S.wh);
    var d = g.getImageData(0, 0, S.ww, S.wh).data, m = new Float32Array(S.ww * S.wh);
    for (var i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] / 255;
    try { ss.close(); } catch (e) { }
    return m;
  }
  function rotateCanvas(c, q) {
    var o = document.createElement('canvas'), same = q === 2;
    o.width = same ? c.width : c.height; o.height = same ? c.height : c.width;
    var g = o.getContext('2d');
    if (q === 1) { g.translate(o.width, 0); g.rotate(Math.PI / 2); }
    else if (q === 3) { g.translate(0, o.height); g.rotate(-Math.PI / 2); }
    else { g.translate(o.width, o.height); g.rotate(Math.PI); }
    g.drawImage(c, 0, 0); return o;
  }
  function pickFace(det, W, H) {
    if (!det || !det.length) return null;
    det.sort(function (a, b) { return b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height; });
    var d = det[0], bb = d.boundingBox, L = d.landmarks;
    var p0 = { x: L[0].x * W, y: L[0].y * H }, p1 = { x: L[1].x * W, y: L[1].y * H };
    if (p0.x > p1.x) { var t = p0; p0 = p1; p1 = t; }
    return {
      score: (d.V && d.V[0] && d.V[0].ga) || 0.5,
      bb: { x: (bb.xCenter - bb.width / 2) * W, y: (bb.yCenter - bb.height / 2) * H, w: bb.width * W, h: bb.height * H },
      le: p0, re: p1, nose: { x: L[2].x * W, y: L[2].y * H }, mouth: { x: L[3].x * W, y: L[3].y * H }
    };
  }
  /* finds the face. A sideways or upside-down photo is turned upright: the AI is most confident when the face is the right way up. */
  async function findFace(wc) {
    await lib('face', V + 'face/face_detection.js');
    var plans = [['short', [0, 1, 3, 2]], ['full', [0]]], best = null;
    for (var pi = 0; pi < plans.length && !best; pi++) {
      var fd = new FaceDetection({ locateFile: function (f) { return V + 'face/' + f; } });
      fd.setOptions({ model: plans[pi][0], minDetectionConfidence: pi ? 0.4 : 0.5 });
      var last = null; fd.onResults(function (r) { last = r.detections; });
      await withTimeout(fd.initialize(), 60000, 'Face tool timed out');
      for (var qi = 0; qi < plans[pi][1].length; qi++) {
        var q = plans[pi][1][qi], c = q ? rotateCanvas(wc, q) : wc; last = null;
        await withTimeout(fd.send({ image: c }), 60000, 'Face tool timed out');
        var face = pickFace(last, c.width, c.height);
        if (!face) continue;
        if (!best || face.score > best.face.score + (best.q === 0 ? 0.05 : 0)) best = { face: face, q: q, canvas: c };
        if (q === 0 && face.score >= 0.9) break;   /* already upright and sure */
      }
      try { fd.close(); } catch (e) { }
    }
    return best;
  }
  /* fallback when the AI cannot start: treat the colour around the photo's edge as background */
  function colourMask(wc) {
    var w = S.ww, h = S.wh, d = wc.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    var n = w * h, sr = 0, sg = 0, sb = 0, c = 0, x, y, i;
    function acc(px, py) { var j = (py * w + px) * 4; sr += d[j]; sg += d[j + 1]; sb += d[j + 2]; c++; }
    for (x = 0; x < w; x++) { for (y = 0; y < 4; y++) acc(x, y); }
    for (y = 0; y < h; y++) { for (x = 0; x < 4; x++) acc(x, y); for (x = w - 4; x < w; x++) acc(x, y); }
    var br = sr / c, bg = sg / c, bb = sb / c, T2s = 46 * 46;
    var vis = new Uint8Array(n), q = new Int32Array(n), qs = 0, qe = 0;
    function near(p) { var j = p * 4, a = d[j] - br, b = d[j + 1] - bg, e = d[j + 2] - bb; return a * a + b * b + e * e < T2s; }
    function push(p) { if (!vis[p] && near(p)) { vis[p] = 1; q[qe++] = p; } }
    for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (qs < qe) {
      var p = q[qs++], px = p % w, py = (p / w) | 0;
      if (px > 0) push(p - 1); if (px < w - 1) push(p + 1); if (py > 0) push(p - w); if (py < h - 1) push(p + w);
    }
    var m = new Float32Array(n); for (i = 0; i < n; i++) m[i] = vis[i] ? 0 : 1;
    return m;
  }

  /* ---------- building the mask layers ---------- */
  function rebuildProc() {
    var w = S.ww, h = S.wh, n = w * h, m = S.mG, i;
    if (S.grow > 0) m = morph(m, w, h, S.grow, true); else if (S.grow < 0) m = morph(m, w, h, -S.grow, false);
    var o = new Float32Array(n); for (i = 0; i < n; i++) o[i] = clamp((m[i] - 0.5) * 3 + 0.5, 0, 1);
    if (S.soft > 0) { o = boxF(o, w, h, S.soft); o = boxF(o, w, h, S.soft); }
    var g = S.proc.getContext('2d'), id = g.createImageData(w, h), dd = id.data;
    for (i = 0; i < n; i++) { dd[i * 4] = dd[i * 4 + 1] = dd[i * 4 + 2] = 255; dd[i * 4 + 3] = o[i] * 255 + 0.5; }
    g.putImageData(id, 0, 0);
    rebuildFinal();
  }
  function stamp(g, x, y, r, erase) {
    var gr = g.createRadialGradient(x, y, r * 0.35, x, y, r), c = erase ? '0,0,0' : '255,255,255';
    gr.addColorStop(0, 'rgba(' + c + ',1)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
    g.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); g.globalCompositeOperation = 'source-over';
  }
  function segment(g, a, b, r, erase) {
    var d = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.max(1, Math.ceil(d / (r * 0.25)));
    for (var i = 0; i <= steps; i++) stamp(g, a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps, r, erase);
  }
  function rebuildFinal() {
    var g = S.fin.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, S.ww, S.wh); g.drawImage(S.proc, 0, 0);
    S.strokes.forEach(function (st) {
      var p = st.pts; if (p.length === 1) stamp(g, p[0][0], p[0][1], st.r, st.erase);
      for (var i = 1; i < p.length; i++) segment(g, p[i - 1], p[i], st.r, st.erase);
    });
    S.sheetDirty = true;
  }
  function scheduleProc() { if (!procRaf) procRaf = requestAnimationFrame(function () { procRaf = 0; rebuildProc(); draw(); }); }

  /* ---------- automatic framing ---------- */
  function crownRow(f) {
    var w = S.ww, m = S.mG, x0 = Math.max(0, Math.floor(f.bb.x - f.bb.w * 0.15)), x1 = Math.min(w - 1, Math.ceil(f.bb.x + f.bb.w * 1.15));
    var need = Math.max(3, Math.round(f.bb.w * 0.06)), eyeY = (f.le.y + f.re.y) / 2;
    for (var y = 0; y < eyeY; y++) {
      var c = 0; for (var x = x0; x <= x1; x++) if (m[y * w + x] > 0.5) c++;
      if (c >= need) return y;
    }
    return null;
  }
  function autoFit() {
    var A = S.size.w / S.size.h, k = S.iw / S.ww, f = S.face, fh, fx, fy, rot = 0;
    if (f) {
      var eyeY = (f.le.y + f.re.y) / 2, eyeX = (f.le.x + f.re.x) / 2;
      var chin = Math.max(f.bb.y + f.bb.h, f.mouth.y + (f.mouth.y - eyeY) * 0.5);
      var ec = chin - eyeY, crown = crownRow(f);
      var lo = eyeY - 1.55 * ec, hi = eyeY - 0.85 * ec;
      crown = crown === null ? eyeY - 1.05 * ec : clamp(crown, lo, hi);
      var head = chin - crown;
      fh = head / 0.72;
      var top = crown - 0.10 * fh, fy0 = top + fh / 2, fx0 = (eyeX + f.nose.x) / 2;
      var roll = Math.atan2(f.re.y - f.le.y, f.re.x - f.le.x);
      if (S.flags.straight && Math.abs(roll) > 0.012 && Math.abs(roll) < 0.7) rot = -roll;
      var d = eyeY - fy0;   /* keep the face where it should be even after the straightening rotation */
      fx = fx0 - d * Math.sin(rot); fy = eyeY - d * Math.cos(rot);
    } else {
      var w = S.ww, h = S.wh, m = S.mG, x0 = w, x1 = 0, y0 = h, y1 = 0;
      for (var y = 0; y < h; y += 2) for (var x = 0; x < w; x += 2) if (m[y * w + x] > 0.5) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 <= x0 || y1 <= y0) { x0 = 0; x1 = w; y0 = 0; y1 = h; }
      fh = Math.min((y1 - y0) * 1.1, h * 1.2); fx = (x0 + x1) / 2; fy = y0 - 0.08 * fh + fh / 2;
    }
    S.rollDeg = rot * 180 / Math.PI;
    S.auto = { fx: fx * k, fy: fy * k, fh: fh * k, rot: rot };
    S.view = { fx: fx * k, fy: fy * k, fh: fh * k, rot: rot };
    syncSliders();
  }

  /* ---------- drawing ---------- */
  function adjustPixels(g, w, h) {
    var lv = S.light / 100, C = S.contrast * 2, f = (259 * (C + 255)) / (255 * (259 - C)) * (1 + 0.14 * lv);
    var add = S.bright * 1.5, gm = 1 - 0.5 * lv, sat = 1 + 0.4 * lv, lut = new Uint8ClampedArray(256), i;
    for (i = 0; i < 256; i++) lut[i] = f * (255 * Math.pow(i / 255, gm) - 128) + 128 + add;
    var id = g.getImageData(0, 0, w, h), d = id.data;
    for (i = 0; i < d.length; i += 4) {
      var r = lut[d[i]], gg = lut[d[i + 1]], b = lut[d[i + 2]];
      if (sat !== 1) { var y = 0.299 * r + 0.587 * gg + 0.114 * b; r = y + sat * (r - y); gg = y + sat * (gg - y); b = y + sat * (b - y); }
      d[i] = r; d[i + 1] = gg; d[i + 2] = b;
    }
    g.putImageData(id, 0, 0);
  }
  function setT(g, W, H, k) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.translate(W / 2, H / 2); g.rotate(S.view.rot); g.scale(k, k); g.translate(-S.view.fx, -S.view.fy);
  }
  function render(target, W, H, opt) {
    opt = opt || {};
    if (T1.width !== W || T1.height !== H) { T1.width = W; T1.height = H; T2.width = W; T2.height = H; }
    var k = H / S.view.fh, g1 = T1.getContext('2d', { willReadFrequently: true }), g2 = T2.getContext('2d');
    g1.setTransform(1, 0, 0, 1, 0, 0); g1.globalCompositeOperation = 'source-over'; g1.clearRect(0, 0, W, H);
    setT(g1, W, H, k); g1.imageSmoothingQuality = 'high'; g1.drawImage(S.src, 0, 0, S.iw, S.ih); g1.setTransform(1, 0, 0, 1, 0, 0);
    if (S.bright || S.contrast || S.light) adjustPixels(g1, W, H);
    if (!S.keepBg) {
      g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H);
      setT(g2, W, H, k); g2.imageSmoothingQuality = 'high'; g2.drawImage(S.fin, 0, 0, S.iw, S.ih); g2.setTransform(1, 0, 0, 1, 0, 0);
      g1.globalCompositeOperation = 'destination-in'; g1.drawImage(T2, 0, 0); g1.globalCompositeOperation = 'source-over';
    }
    var g = target.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
    g.fillStyle = opt.check ? '#00e676' : (S.keepBg ? '#ffffff' : S.bg); g.fillRect(0, 0, W, H); g.drawImage(T1, 0, 0);
  }
  function previewDims() {
    var W = mmToPx(S.size.w), H = mmToPx(S.size.h), s = Math.min(1, 640 / H);
    return [Math.round(W * s), Math.round(H * s)];
  }
  function draw() {
    if (!S.src) return;
    var d = previewDims();
    if (cv.width !== d[0] || cv.height !== d[1]) { cv.width = d[0]; cv.height = d[1]; }
    render(cv, d[0], d[1], { check: S.check });
    var g = cv.getContext('2d'), W = d[0], H = d[1];
    if (S.guide && (S.tab === 'adjust' || S.tab === 'size')) {
      g.save(); g.setLineDash([6, 5]);
      [['rgba(0,0,0,.55)', 3], ['rgba(255,255,255,.95)', 1.5]].forEach(function (s) {
        g.strokeStyle = s[0]; g.lineWidth = s[1];
        g.beginPath(); g.ellipse(W / 2, H * 0.46, H * 0.27, H * 0.36, 0, 0, 6.2832); g.stroke();
        g.beginPath(); g.moveTo(W * 0.1, H * 0.445); g.lineTo(W * 0.9, H * 0.445); g.stroke();
        g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
      });
      g.restore();
    }
    if (S.tab === 'edges' && cursor) {
      g.save(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.shadowColor = '#000'; g.shadowBlur = 2;
      g.beginPath(); g.arc(cursor[0], cursor[1], brushPrev(), 0, 6.2832); g.stroke(); g.restore();
    }
    var dpi = S.size.w + ' x ' + S.size.h + ' mm  (' + mmToPx(S.size.w) + ' x ' + mmToPx(S.size.h) + ' px)';
    $('ppSizeInfo').textContent = dpi;
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); S.sheetDirty = true; }

  /* ---------- pointer: move / zoom / brush ---------- */
  var ptrs = {}, last = null, cursor = null, stroke = null;
  function brushPrev() { return S.brush * 0.45 * (cv.width / 360); }
  function canvasXY(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
  function toWork(p) {
    var k = cv.height / S.view.fh, vx = (p[0] - cv.width / 2) / k, vy = (p[1] - cv.height / 2) / k, c = Math.cos(S.view.rot), s = Math.sin(S.view.rot);
    var sx = S.view.fx + vx * c + vy * s, sy = S.view.fy - vx * s + vy * c;
    return [sx * S.ww / S.iw, sy * S.wh / S.ih];
  }
  function brushWork() { var k = cv.height / S.view.fh; return brushPrev() / k * S.ww / S.iw; }
  function ptrDist() { var a = Object.keys(ptrs); if (a.length < 2) return 0; var p = ptrs[a[0]], q = ptrs[a[1]]; return Math.hypot(p[0] - q[0], p[1] - q[1]); }
  function zoomBy(f) { S.view.fh = clamp(S.view.fh / f, S.auto.fh * 0.3, S.auto.fh * 3.2); syncSliders(); }
  cv.addEventListener('pointerdown', function (e) {
    if (!S.src || (S.tab !== 'adjust' && S.tab !== 'edges')) return;
    cv.setPointerCapture(e.pointerId); var p = canvasXY(e); ptrs[e.pointerId] = p; last = p;
    if (S.tab === 'edges' && Object.keys(ptrs).length === 1) {
      stroke = { erase: S.mode === 'erase', r: brushWork(), pts: [toWork(p)] };
      S.strokes.push(stroke); var g = S.fin.getContext('2d'); stamp(g, stroke.pts[0][0], stroke.pts[0][1], stroke.r, stroke.erase);
      S.sheetDirty = true; draw();
    }
    e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    var p = canvasXY(e); cursor = p;
    if (!ptrs[e.pointerId]) { if (S.tab === 'edges' && e.pointerType === 'mouse') schedule(); return; }
    var prevD = ptrDist(); ptrs[e.pointerId] = p;
    if (S.tab === 'edges') {
      if (stroke) {
        var w = toWork(p), a = stroke.pts[stroke.pts.length - 1];
        segment(S.fin.getContext('2d'), a, w, stroke.r, stroke.erase); stroke.pts.push(w); S.sheetDirty = true; schedule();
      }
    } else if (Object.keys(ptrs).length >= 2) {
      var nd = ptrDist(); if (prevD > 0 && nd > 0) zoomBy(nd / prevD); schedule();
    } else if (last) {
      var k = cv.height / S.view.fh, dx = (p[0] - last[0]) / k, dy = (p[1] - last[1]) / k, c = Math.cos(S.view.rot), s = Math.sin(S.view.rot);
      S.view.fx -= dx * c + dy * s; S.view.fy -= -dx * s + dy * c; schedule();
    }
    last = p;
  });
  function endPtr(e) { delete ptrs[e.pointerId]; if (!Object.keys(ptrs).length) { stroke = null; } last = null; var a = Object.keys(ptrs); if (a.length) last = ptrs[a[0]]; }
  cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
  cv.addEventListener('pointerleave', function () { cursor = null; if (S.tab === 'edges') schedule(); });
  cv.addEventListener('wheel', function (e) { if (S.tab !== 'adjust') return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.06 : 0.94); schedule(); }, { passive: false });

  /* ---------- controls ---------- */
  function syncSliders() {
    if (!S.auto) return;
    $('ppZoom').value = Math.round(100 * S.auto.fh / S.view.fh);
    $('ppRot').value = (S.view.rot * 180 / Math.PI).toFixed(1);
    $('ppZoomV').textContent = $('ppZoom').value + '%'; $('ppRotV').textContent = $('ppRot').value + '\u00b0';
  }
  function setTab(t) {
    S.tab = t;
    Array.prototype.forEach.call(document.querySelectorAll('#ppTabs button'), function (b) { b.classList.toggle('on', b.dataset.tab === t); });
    Array.prototype.forEach.call(document.querySelectorAll('.pp-panel'), function (p) { p.hidden = p.dataset.p !== t; });
    cv.style.touchAction = (t === 'adjust' || t === 'edges') ? 'none' : 'pan-y';
    cv.style.cursor = t === 'edges' ? 'none' : (t === 'adjust' ? 'grab' : 'default');
    if (t === 'sheet') drawSheetPreview();
    draw();
  }
  function setSize(w, h) {
    S.size = { w: w, h: h }; if (S.src) { autoFit(); draw(); }
    $('ppCustom').hidden = $('ppSize').value !== 'custom'; S.sheetDirty = true; savePrefs();
  }
  function applySizeSelect() {
    var v = $('ppSize').value;
    if (v === 'custom') { setSize(clamp(+$('ppCW').value || 35, 10, 100), clamp(+$('ppCH').value || 45, 10, 130)); return; }
    var p = v.split('x'); setSize(+p[0], +p[1]);
  }
  function setBg(c, keep) {
    S.bg = c || S.bg; S.keepBg = !!keep;
    Array.prototype.forEach.call(document.querySelectorAll('.pp-sw'), function (b) { b.classList.toggle('on', keep ? b.dataset.c === 'keep' : b.dataset.c === S.bg && !S.keepBg); });
    if (!keep) { $('ppCustomBg').value = S.bg; $('ppCustomBg2').value = S.bg; }
    S.sheetDirty = true; savePrefs(); draw();
  }
  function nudge(dx, dy) {
    var st = S.view.fh * 0.02, c = Math.cos(S.view.rot), s = Math.sin(S.view.rot), mx = dx * st, my = dy * st;
    S.view.fx -= mx * c + my * s; S.view.fy -= -mx * s + my * c; draw();
  }
  /* ---------- skin colour of the face, and spot / mark cleaning ---------- */
  function median(a) { a.sort(function (x, y) { return x - y; }); return a[a.length >> 1]; }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function ycc(r, g, b) { return [0.299 * r + 0.587 * g + 0.114 * b, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b]; }
  function faceStats() {
    var f = S.face, d = S.wcPix, w = S.ww, h = S.wh, Y = [], B = [], R = [];
    var cx = f.nose.x, cy = f.nose.y - f.bb.h * 0.02, rx = f.bb.w * 0.3, ry = f.bb.h * 0.2;
    for (var y = Math.max(0, Math.floor(cy - ry)); y < Math.min(h, cy + ry); y += 2) {
      for (var x = Math.max(0, Math.floor(cx - rx)); x < Math.min(w, cx + rx); x += 2) {
        var u = (x - cx) / rx, v = (y - cy) / ry; if (u * u + v * v > 1) continue;
        var j = (y * w + x) * 4, c = ycc(d[j], d[j + 1], d[j + 2]); Y.push(c[0]); B.push(c[1]); R.push(c[2]);
      }
    }
    return Y.length < 20 ? null : { Y: median(Y), Cb: median(B), Cr: median(R) };
  }
  function toCanvas(w, h, data) { var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0); return c; }
  function upscale(c, w, h) { var o = document.createElement('canvas'); o.width = w; o.height = h; var g = o.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, w, h); return g.getImageData(0, 0, w, h).data; }
  /* Replaces small dark or bright spots on the SKIN only (not eyes, brows, mouth or nose) with the colour of the skin around them. */
  function retouch() {
    var f = S.face, ref = S.ref; if (!f || !ref || !S.src) return;
    var k = S.iw / S.ww, bb = f.bb, s = S.marks / 100;
    if (!S.rt) {
      var x0 = Math.max(0, Math.floor((bb.x - bb.w * 0.25) * k)), y0 = Math.max(0, Math.floor((bb.y - bb.h * 0.45) * k)),
        x1 = Math.min(S.iw, Math.ceil((bb.x + bb.w * 1.25) * k)), y1 = Math.min(S.ih, Math.ceil((bb.y + bb.h * 1.25) * k));
      var od = S.src.getContext('2d').getImageData(x0, y0, x1 - x0, y1 - y0);
      S.rt = { x0: x0, y0: y0, w: x1 - x0, h: y1 - y0, orig: od, cv: toCanvas(x1 - x0, y1 - y0, new Uint8ClampedArray(od.data)) };
    }
    var R = S.rt, g = S.src.getContext('2d');
    if (s <= 0) { g.putImageData(R.orig, R.x0, R.y0); S.sheetDirty = true; return; }
    var sc = Math.min(1, 560 / Math.max(R.w, R.h)), lw = Math.max(16, Math.round(R.w * sc)), lh = Math.max(16, Math.round(R.h * sc)), n = lw * lh;
    var lc = document.createElement('canvas'); lc.width = lw; lc.height = lh;
    var lg = lc.getContext('2d', { willReadFrequently: true }); lg.imageSmoothingQuality = 'high'; lg.drawImage(R.cv, 0, 0, lw, lh);
    var ld = lg.getImageData(0, 0, lw, lh).data;
    function P(wx, wy) { return [(wx * k - R.x0) * sc, (wy * k - R.y0) * sc]; }
    var bw = bb.w * k * sc, ce = P(bb.x + bb.w / 2, bb.y + bb.h * 0.38), erx = 0.62 * bb.w * k * sc, ery = 0.78 * bb.h * k * sc;
    var feats = [[P(f.le.x, f.le.y - bb.w * 0.02), 0.22 * bw, 0.17 * bw], [P(f.re.x, f.re.y - bb.w * 0.02), 0.22 * bw, 0.17 * bw], [P(f.mouth.x, f.mouth.y), 0.30 * bw, 0.13 * bw], [P(f.nose.x, f.nose.y), 0.14 * bw, 0.12 * bw]];
    var m = new Float32Array(n), cr = new Float32Array(n), cg = new Float32Array(n), cb = new Float32Array(n), i, x, y, q;
    for (y = 0; y < lh; y++) for (x = 0; x < lw; x++) {
      i = y * lw + x; var j = i * 4, c = ycc(ld[j], ld[j + 1], ld[j + 2]);
      var dcr = c[2] - ref.Cr, v = 1 - sstep(9, 20, Math.hypot(c[1] - ref.Cb, dcr > 0 ? dcr * 0.4 : dcr));
      v *= sstep(0.42 * ref.Y, 0.6 * ref.Y, c[0]);
      v *= 1 - sstep(0.9, 1.1, Math.hypot((x - ce[0]) / erx, (y - ce[1]) / ery));
      for (q = 0; q < 4; q++) { var ft = feats[q]; v *= sstep(0.8, 1.15, Math.hypot((x - ft[0][0]) / ft[1], (y - ft[0][1]) / ft[2])); }
      m[i] = v; cr[i] = ld[j] * v; cg[i] = ld[j + 1] * v; cb[i] = ld[j + 2] * v;
    }
    function means(rad) {
      var den = boxF(m, lw, lh, rad), a = boxF(cr, lw, lh, rad), b = boxF(cg, lw, lh, rad), c2 = boxF(cb, lw, lh, rad), o = new Uint8ClampedArray(n * 4);
      for (var t = 0; t < n; t++) {
        var u = t * 4, dn = den[t];
        if (dn > 0.06) { o[u] = a[t] / dn; o[u + 1] = b[t] / dn; o[u + 2] = c2[t] / dn; } else { o[u] = ld[u]; o[u + 1] = ld[u + 1]; o[u + 2] = ld[u + 2]; }
        o[u + 3] = 255;
      }
      return o;
    }
    var M1 = upscale(toCanvas(lw, lh, means(Math.max(2, Math.round(0.07 * bw)))), R.w, R.h);
    var M2 = upscale(toCanvas(lw, lh, means(Math.max(1, Math.round(0.02 * bw)))), R.w, R.h);
    var mk = new Uint8ClampedArray(n * 4); for (i = 0; i < n; i++) { mk[i * 4] = mk[i * 4 + 1] = mk[i * 4 + 2] = m[i] * 255; mk[i * 4 + 3] = 255; }
    var MK = upscale(toCanvas(lw, lh, mk), R.w, R.h), od2 = new Uint8ClampedArray(R.orig.data), N = R.w * R.h;
    for (i = 0; i < N; i++) {
      var u2 = i * 4, kk = MK[u2] / 255; if (kk < 0.02) continue;
      var r0 = od2[u2], g0 = od2[u2 + 1], b0 = od2[u2 + 2];
      var dY = Math.abs((0.299 * r0 + 0.587 * g0 + 0.114 * b0) - (0.299 * M1[u2] + 0.587 * M1[u2 + 1] + 0.114 * M1[u2 + 2]));
      var dCr = Math.abs((0.5 * r0 - 0.419 * g0 - 0.081 * b0) - (0.5 * M1[u2] - 0.419 * M1[u2 + 1] - 0.081 * M1[u2 + 2]));
      var dCb = Math.abs((-0.169 * r0 - 0.331 * g0 + 0.5 * b0) - (-0.169 * M1[u2] - 0.331 * M1[u2 + 1] + 0.5 * M1[u2 + 2]));
      var wt = sstep(4, 14, Math.max(dY, 1.1 * Math.max(dCr, dCb))) * kk * s;
      var r1 = r0 + wt * (M1[u2] - r0), g1 = g0 + wt * (M1[u2 + 1] - g0), b1 = b0 + wt * (M1[u2 + 2] - b0), sm = 0.3 * s * kk;
      od2[u2] = r1 + sm * (M2[u2] - r1); od2[u2 + 1] = g1 + sm * (M2[u2 + 1] - g1); od2[u2 + 2] = b1 + sm * (M2[u2 + 2] - b1);
    }
    g.putImageData(new ImageData(od2, R.w, R.h), R.x0, R.y0); S.sheetDirty = true;
  }
  var rtTimer = 0;
  function scheduleRetouch() { clearTimeout(rtTimer); rtTimer = setTimeout(function () { retouch(); draw(); }, 140); }
  function syncFace() {
    $('ppLight').value = S.light; $('ppMarks').value = S.marks; $('ppLightV').textContent = S.light; $('ppMarksV').textContent = S.marks;
    var none = !S.face; $('ppLight').disabled = none; $('ppMarks').disabled = none; $('ppFaceNone').hidden = !none;
  }

  /* ---------- progress card shown while the AI works ---------- */
  var STEPS = ['open', 'ai', 'face', 'bg', 'fix', 'skin'];
  function tick() { return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 30); }); }); }
  function step(key) {
    var i = STEPS.indexOf(key), li = document.querySelectorAll('#ppPSteps li');
    Array.prototype.forEach.call(li, function (el, n) { el.className = n < i ? 'done' : (n === i ? 'now' : ''); });
    $('ppBarFill').style.width = Math.round((i + 0.6) / STEPS.length * 100) + '%';
    $('ppProgCount').textContent = 'Step ' + (i + 1) + ' of ' + STEPS.length;
    return tick();
  }

  /* ---------- loading a photo ---------- */
  function setCanvases(src, wc) {
    S.src = src; S.iw = src.width; S.ih = src.height; S.wc = wc; S.ww = wc.width; S.wh = wc.height;
    S.wcPix = wc.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, S.ww, S.wh).data;
    S.gray = new Float32Array(S.ww * S.wh);
    for (var i = 0; i < S.gray.length; i++) S.gray[i] = (0.299 * S.wcPix[i * 4] + 0.587 * S.wcPix[i * 4 + 1] + 0.114 * S.wcPix[i * 4 + 2]) / 255;
    S.proc = document.createElement('canvas'); S.proc.width = S.ww; S.proc.height = S.wh;
    S.fin = document.createElement('canvas'); S.fin.width = S.ww; S.fin.height = S.wh;
    S.strokes = []; S.rt = null; S.ref = null; S.face = null;
  }
  async function handleFile(file) {
    if (!file || S.busy) return;
    S.busy = true;
    S.flags = { straight: $('ppOptStraight').checked, light: $('ppOptLight').checked, skin: $('ppOptSkin').checked };
    $('ppEditor').hidden = true; $('ppStart').hidden = true; status(''); $('ppProgress').hidden = false;
    $('ppProgress').scrollIntoView({ behavior: 'smooth', block: 'center' });
    var ai = true, raw = null, fr = null;
    try {
      await step('open');
      var im = await loadImage(file);
      var sc = Math.min(1, SRC_MAX / Math.max(im.naturalWidth, im.naturalHeight)), src = document.createElement('canvas');
      src.width = Math.round(im.naturalWidth * sc); src.height = Math.round(im.naturalHeight * sc);
      src.getContext('2d').drawImage(im, 0, 0, src.width, src.height);
      var ws = Math.min(1, WORK / Math.max(src.width, src.height)), wc = document.createElement('canvas');
      wc.width = Math.round(src.width * ws); wc.height = Math.round(src.height * ws);
      wc.getContext('2d').drawImage(src, 0, 0, wc.width, wc.height);
      setCanvases(src, wc);
      await step('ai');
      try { await lib('seg', V + 'selfie/selfie_segmentation.js'); await lib('face', V + 'face/face_detection.js'); } catch (e) { ai = false; libs = {}; }
      await step('face');
      if (ai) { try { fr = await findFace(S.wc); } catch (e) { ai = false; libs = {}; fr = null; } }
      if (fr && fr.q) setCanvases(rotateCanvas(S.src, fr.q), fr.canvas);
      S.face = fr ? fr.face : null;
      await step('bg');
      if (ai) { try { raw = await runSegmentation(S.wc); } catch (e) { ai = false; libs = {}; raw = null; } }
      if (!raw) raw = colourMask(S.wc);
      S.mG = guided(S.gray, raw, S.ww, S.wh, Math.max(4, Math.round(Math.max(S.ww, S.wh) * 0.006)), 0.0004);
      S.bright = 0; S.contrast = 0; S.soft = +$('ppSoft').value; S.grow = +$('ppGrow').value;
      $('ppBright').value = 0; $('ppContrast').value = 0; $('ppBrightV').textContent = '0'; $('ppContrastV').textContent = '0';
      rebuildProc();
      await step('fix');
      autoFit();
      S.ref = S.face ? faceStats() : null;
      S.light = (S.flags.light && S.ref) ? clamp(Math.round((128 - S.ref.Y) / 55 * 100), 0, 75) : 0; S.autoLight = S.light;
      await step('skin');
      S.marks = (S.flags.skin && S.ref) ? 70 : 0; S.autoMarks = S.marks; retouch(); syncFace();
      var notes = ['background removed'];
      if (S.face) {
        if (fr && fr.q) notes.push('photo turned upright');
        if (S.flags.straight && Math.abs(S.rollDeg) >= 1) notes.push('straightened by ' + Math.round(Math.abs(S.rollDeg)) + '\u00b0');
        if (S.light > 0) notes.push('dark face made lighter');
        if (S.marks > 0) notes.push('marks on the face cleaned');
      }
      $('ppProgress').hidden = true; $('ppEditor').hidden = false;
      $('ppBadge').className = 'pp-badge ' + (S.face ? 'ok' : 'warn');
      $('ppBadge').textContent = !ai ? 'Quick mode: works best with a plain wall. Use Fix edges to clean up.'
        : (S.face ? 'Done! The AI did this: ' + notes.join(', ') + '. Check the photo and change anything in the tabs.'
          : 'Background removed, but no face was found. Please move and zoom the photo yourself (Adjust tab).');
      setTab(S.face ? 'bg' : 'adjust'); draw(); $('ppEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      $('ppProgress').hidden = true; $('ppStart').hidden = false; S.src = null;
      status(e && e.message === 'open' ? 'That photo could not be opened. Please try a JPG or PNG photo.' : 'Something went wrong. Please try again with another photo.', 'bad');
    }
    S.busy = false;
  }

  /* ---------- download single photo ---------- */
  function photoCanvas() {
    var W = mmToPx(S.size.w), H = mmToPx(S.size.h), c = document.createElement('canvas'); c.width = W; c.height = H; render(c, W, H, {}); return c;
  }
  async function encodeJpeg(c, maxKB) {
    if (!maxKB) return { blob: await toBlob(c, 'image/jpeg', 0.95), w: c.width, h: c.height };
    var lim = maxKB * 1024, cur = c, tries = 0;
    while (tries < 9) {
      var lo = 0.35, hi = 0.95, best = null;
      var b = await toBlob(cur, 'image/jpeg', lo);
      if (b.size <= lim) {
        best = b;
        for (var i = 0; i < 6; i++) { var mid = (lo + hi) / 2, t = await toBlob(cur, 'image/jpeg', mid); if (t.size <= lim) { best = t; lo = mid; } else hi = mid; }
        return { blob: best, w: cur.width, h: cur.height };
      }
      var n = document.createElement('canvas'); n.width = Math.round(cur.width * 0.88); n.height = Math.round(cur.height * 0.88);
      var g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, n.width, n.height); cur = n; tries++;
    }
    return { blob: await toBlob(cur, 'image/jpeg', 0.35), w: cur.width, h: cur.height };
  }
  async function downloadPhoto() {
    var btn = $('ppDl'); btn.disabled = true; var note = $('ppDlNote'); note.textContent = 'Creating your photo...';
    try {
      var r = await encodeJpeg(photoCanvas(), +$('ppMax').value);
      download(r.blob, 'passport-photo-' + S.size.w + 'x' + S.size.h + 'mm.jpg');
      note.textContent = 'Saved: ' + r.w + ' x ' + r.h + ' px, ' + Math.round(r.blob.size / 1024) + ' KB.' + (r.w !== mmToPx(S.size.w) ? ' It was made smaller to fit your limit.' : '');
    } catch (e) { note.textContent = 'Could not create the photo. Please try again.'; }
    btn.disabled = false;
  }

  /* ---------- print sheet ---------- */
  function layout() {
    var p = PAPERS[$('ppPaper').value], W = p[0], H = p[1], m = 8, gap = +$('ppGap').value, pw = S.size.w, ph = S.size.h;
    var capC = Math.max(1, Math.floor((W - 2 * m + gap) / (pw + gap))), capR = Math.max(1, Math.floor((H - 2 * m + gap) / (ph + gap))), cap = capC * capR;
    var want = $('ppCopies').value, count = want === 'max' ? cap : Math.min(+want, cap), cols = 1, c;
    for (c = Math.min(capC, count); c >= 1; c--) if (count % c === 0 && count / c <= capR) { cols = c; break; }
    if (count % cols !== 0 && cols === 1 && count > 1) { cols = Math.min(capC, Math.ceil(count / Math.ceil(count / capC))); }
    var rows = Math.ceil(count / cols);
    return { W: W, H: H, pw: pw, ph: ph, gap: gap, m: m, cols: cols, rows: rows, count: count, cap: cap, clipped: want !== 'max' && +want > cap };
  }
  function drawSheet(c, pxPerMm, photo) {
    var L = layout(); c.width = Math.round(L.W * pxPerMm); c.height = Math.round(L.H * pxPerMm);
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    var gw = L.cols * L.pw + (L.cols - 1) * L.gap, x0 = (L.W - gw) / 2, y0 = L.m, cut = $('ppCut').value;
    g.imageSmoothingQuality = 'high';
    for (var i = 0; i < L.count; i++) {
      var col = i % L.cols, row = (i / L.cols) | 0, x = (x0 + col * (L.pw + L.gap)) * pxPerMm, y = (y0 + row * (L.ph + L.gap)) * pxPerMm, w = L.pw * pxPerMm, h = L.ph * pxPerMm;
      g.drawImage(photo, x, y, w, h);
      g.strokeStyle = '#8a8f98'; g.lineWidth = Math.max(1, 0.2 * pxPerMm);
      if (cut === 'lines') g.strokeRect(x, y, w, h);
      if (cut === 'marks') {
        var t = 2.5 * pxPerMm; g.beginPath();
        [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].forEach(function (q) {
          g.moveTo(q[0] + q[2] * t, q[1]); g.lineTo(q[0] + q[2] * 0.4 * pxPerMm, q[1]); g.moveTo(q[0], q[1] + q[3] * t); g.lineTo(q[0], q[1] + q[3] * 0.4 * pxPerMm);
        }); g.stroke();
      }
    }
    return L;
  }
  var sheetPhoto = null;
  function drawSheetPreview() {
    if (!S.src) return;
    if (S.sheetDirty || !sheetPhoto) { sheetPhoto = photoCanvas(); S.sheetDirty = false; }
    var L = drawSheet($('ppSheet'), 560 / PAPERS[$('ppPaper').value][0], sheetPhoto);
    $('ppSheetInfo').textContent = L.count + ' photos on ' + PAPERS[$('ppPaper').value][2] + ' (' + L.cols + ' x ' + L.rows + ')' +
      (L.clipped ? '. Only ' + L.cap + ' fit on this paper.' : '') + '. Print at 100% / Actual size.';
    savePrefs();
  }
  async function sheetCanvasFull() {
    var c = document.createElement('canvas'); drawSheet(c, DPI / MM, photoCanvas()); return c;
  }
  async function downloadSheetJpg() {
    var b = $('ppShJpg'); b.disabled = true; var c = await sheetCanvasFull();
    download(await toBlob(c, 'image/jpeg', 0.93), 'passport-photo-sheet-' + $('ppPaper').value + '.jpg'); b.disabled = false;
  }
  async function downloadSheetPdf() {
    var b = $('ppShPdf'); b.disabled = true; $('ppSheetInfo').textContent = 'Creating the PDF...';
    try {
      await lib('pdflib', 'vendor/pdf-lib.min.js');
      var c = await sheetCanvasFull(), jb = await toBlob(c, 'image/jpeg', 0.93), p = PAPERS[$('ppPaper').value];
      var doc = await PDFLib.PDFDocument.create(), img = await doc.embedJpg(await jb.arrayBuffer());
      var wpt = p[0] / MM * 72, hpt = p[1] / MM * 72, page = doc.addPage([wpt, hpt]);
      page.drawImage(img, { x: 0, y: 0, width: wpt, height: hpt });
      download(new Blob([await doc.save()], { type: 'application/pdf' }), 'passport-photo-sheet-' + $('ppPaper').value + '.pdf');
    } catch (e) { $('ppSheetInfo').textContent = 'Could not create the PDF. Try Download JPG instead.'; }
    b.disabled = false; drawSheetPreview();
  }

  /* ---------- saved preferences (settings only, never photos) ---------- */
  function savePrefs() {
    try { localStorage.setItem('calvo_pp', JSON.stringify({ bg: S.bg, keep: S.keepBg, size: $('ppSize').value, cw: $('ppCW').value, ch: $('ppCH').value, paper: $('ppPaper').value, copies: $('ppCopies').value })); } catch (e) { }
  }
  function loadPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem('calvo_pp') || 'null'); if (!p) return;
      if (p.bg) S.bg = p.bg; S.keepBg = !!p.keep;
      if (p.size) $('ppSize').value = p.size; if (p.cw) $('ppCW').value = p.cw; if (p.ch) $('ppCH').value = p.ch;
      if (p.paper) $('ppPaper').value = p.paper; if (p.copies) $('ppCopies').value = p.copies;
    } catch (e) { }
  }

  /* ---------- wire up ---------- */
  function val(id, fn) { $(id).addEventListener('input', function () { fn(+this.value); }); }
  $('ppFile').addEventListener('change', function () { handleFile(this.files[0]); this.value = ''; });
  var drop = $('ppDrop');
  ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  Array.prototype.forEach.call(document.querySelectorAll('#ppTabs button'), function (b) { b.onclick = function () { setTab(b.dataset.tab); }; });
  Array.prototype.forEach.call(document.querySelectorAll('.pp-sw'), function (b) {
    b.onclick = function () { b.dataset.c === 'keep' ? setBg(null, true) : setBg(b.dataset.c, false); };
  });
  ['ppCustomBg', 'ppCustomBg2'].forEach(function (id) { $(id).addEventListener('input', function () { setBg(this.value, false); }); });
  $('ppSize').addEventListener('change', applySizeSelect);
  $('ppCW').addEventListener('change', applySizeSelect); $('ppCH').addEventListener('change', applySizeSelect);
  val('ppZoom', function (v) { S.view.fh = S.auto.fh / (v / 100); $('ppZoomV').textContent = v + '%'; schedule(); });
  val('ppRot', function (v) { S.view.rot = v * Math.PI / 180; $('ppRotV').textContent = v + '\u00b0'; schedule(); });
  val('ppBright', function (v) { S.bright = v; $('ppBrightV').textContent = v; schedule(); });
  val('ppContrast', function (v) { S.contrast = v; $('ppContrastV').textContent = v; schedule(); });
  val('ppSoft', function (v) { S.soft = v; $('ppSoftV').textContent = v; scheduleProc(); });
  val('ppGrow', function (v) { S.grow = v; $('ppGrowV').textContent = v; scheduleProc(); });
  val('ppBrush', function (v) { S.brush = v; $('ppBrushV').textContent = v; });
  $('ppUp').onclick = function () { nudge(0, -1); }; $('ppDown').onclick = function () { nudge(0, 1); };
  $('ppLeft').onclick = function () { nudge(-1, 0); }; $('ppRight').onclick = function () { nudge(1, 0); };
  $('ppAutoFit').onclick = function () { autoFit(); draw(); };
  val('ppLight', function (v) { S.light = v; $('ppLightV').textContent = v; schedule(); });
  val('ppMarks', function (v) { S.marks = v; $('ppMarksV').textContent = v; scheduleRetouch(); });
  $('ppFaceAuto').onclick = function () { S.light = S.autoLight; S.marks = S.autoMarks; syncFace(); retouch(); draw(); };
  $('ppFaceOff').onclick = function () { S.light = 0; S.marks = 0; syncFace(); retouch(); draw(); };
  $('ppGuide').onchange = function () { S.guide = this.checked; draw(); };
  $('ppCheck').onchange = function () { S.check = this.checked; draw(); };
  $('ppErase').onclick = function () { S.mode = 'erase'; $('ppErase').classList.add('on'); $('ppRestore').classList.remove('on'); };
  $('ppRestore').onclick = function () { S.mode = 'restore'; $('ppRestore').classList.add('on'); $('ppErase').classList.remove('on'); };
  $('ppUndo').onclick = function () { S.strokes.pop(); rebuildFinal(); draw(); };
  $('ppResetMask').onclick = function () { S.strokes = []; rebuildFinal(); draw(); };
  $('ppDl').onclick = downloadPhoto;
  $('ppGoSheet').onclick = function () { setTab('sheet'); $('ppTabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $('ppNew').onclick = function () { $('ppEditor').hidden = true; $('ppProgress').hidden = true; $('ppStart').hidden = false; S.src = null; status(''); window.scrollTo({ top: $('ppApp').offsetTop - 10, behavior: 'smooth' }); };
  ['ppPaper', 'ppCopies', 'ppGap', 'ppCut'].forEach(function (id) { $(id).addEventListener('change', drawSheetPreview); });
  $('ppShPdf').onclick = downloadSheetPdf; $('ppShJpg').onclick = downloadSheetJpg;

  loadPrefs(); applySizeSelect(); $('ppCustom').hidden = $('ppSize').value !== 'custom';
  setBg(S.bg, S.keepBg); setTab('bg'); $('ppEditor').hidden = true;
  window.__pp = S; /* handy for testing */
})();
