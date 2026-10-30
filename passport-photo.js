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
    bright: 0, contrast: 0, soft: 1, grow: 0,
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
  async function detectFace(wc) {
    await lib('face', V + 'face/face_detection.js');
    var best = null;
    for (var pass = 0; pass < 2 && !best; pass++) {
      var fd = new FaceDetection({ locateFile: function (f) { return V + 'face/' + f; } });
      fd.setOptions({ model: pass ? 'full' : 'short', minDetectionConfidence: pass ? 0.4 : 0.5 });
      var det = null; fd.onResults(function (r) { det = r.detections; });
      await withTimeout(fd.initialize(), 60000, 'Face tool timed out');
      await withTimeout(fd.send({ image: wc }), 60000, 'Face tool timed out');
      try { fd.close(); } catch (e) { }
      if (det && det.length) {
        det.sort(function (a, b) { return b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height; });
        var d = det[0], bb = d.boundingBox, L = d.landmarks, W = S.ww, H = S.wh;
        var p0 = { x: L[0].x * W, y: L[0].y * H }, p1 = { x: L[1].x * W, y: L[1].y * H };
        if (p0.x > p1.x) { var t = p0; p0 = p1; p1 = t; }
        best = {
          bb: { x: (bb.xCenter - bb.width / 2) * W, y: (bb.yCenter - bb.height / 2) * H, w: bb.width * W, h: bb.height * H },
          le: p0, re: p1, nose: { x: L[2].x * W, y: L[2].y * H }, mouth: { x: L[3].x * W, y: L[3].y * H }
        };
      }
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
      if (Math.abs(roll) > 0.012 && Math.abs(roll) < 0.35) rot = -roll;
      var d = eyeY - fy0;   /* keep the face where it should be even after the straightening rotation */
      fx = fx0 - d * Math.sin(rot); fy = eyeY - d * Math.cos(rot);
    } else {
      var w = S.ww, h = S.wh, m = S.mG, x0 = w, x1 = 0, y0 = h, y1 = 0;
      for (var y = 0; y < h; y += 2) for (var x = 0; x < w; x += 2) if (m[y * w + x] > 0.5) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 <= x0 || y1 <= y0) { x0 = 0; x1 = w; y0 = 0; y1 = h; }
      fh = Math.min((y1 - y0) * 1.1, h * 1.2); fx = (x0 + x1) / 2; fy = y0 - 0.08 * fh + fh / 2;
    }
    S.auto = { fx: fx * k, fy: fy * k, fh: fh * k, rot: rot };
    S.view = { fx: fx * k, fy: fy * k, fh: fh * k, rot: rot };
    syncSliders();
  }

  /* ---------- drawing ---------- */
  function adjustPixels(g, w, h) {
    var C = S.contrast * 2, f = (259 * (C + 255)) / (255 * (259 - C)), add = S.bright * 1.5;
    var id = g.getImageData(0, 0, w, h), d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      d[i] = clamp(f * (d[i] - 128) + 128 + add, 0, 255);
      d[i + 1] = clamp(f * (d[i + 1] - 128) + 128 + add, 0, 255);
      d[i + 2] = clamp(f * (d[i + 2] - 128) + 128 + add, 0, 255);
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
    if (S.bright || S.contrast) adjustPixels(g1, W, H);
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
    S.sheetDirty = true; savePrefs(); draw();
  }
  function nudge(dx, dy) {
    var st = S.view.fh * 0.02, c = Math.cos(S.view.rot), s = Math.sin(S.view.rot), mx = dx * st, my = dy * st;
    S.view.fx -= mx * c + my * s; S.view.fy -= -mx * s + my * c; draw();
  }
  function autoLight() {
    var f = S.face, w = S.ww, h = S.wh, g = S.gray, sum = 0, n = 0, x0, x1, y0, y1;
    if (f) { x0 = Math.max(0, f.bb.x | 0); x1 = Math.min(w, (f.bb.x + f.bb.w) | 0); y0 = Math.max(0, f.bb.y | 0); y1 = Math.min(h, (f.bb.y + f.bb.h) | 0); }
    else { x0 = w * 0.3 | 0; x1 = w * 0.7 | 0; y0 = h * 0.15 | 0; y1 = h * 0.5 | 0; }
    for (var y = y0; y < y1; y += 2) for (var x = x0; x < x1; x += 2) { sum += g[y * w + x]; n++; }
    var mean = n ? sum / n * 255 : 130;
    S.bright = clamp(Math.round((140 - mean) / 1.5), -40, 40); S.contrast = 6;
    $('ppBright').value = S.bright; $('ppContrast').value = S.contrast; $('ppBrightV').textContent = S.bright; $('ppContrastV').textContent = S.contrast; draw();
  }

  /* ---------- loading a photo ---------- */
  async function handleFile(file) {
    if (!file || S.busy) return;
    S.busy = true; $('ppEditor').hidden = true;
    try {
      status('Opening your photo...');
      var im = await loadImage(file);
      var sc = Math.min(1, SRC_MAX / Math.max(im.naturalWidth, im.naturalHeight));
      S.iw = Math.round(im.naturalWidth * sc); S.ih = Math.round(im.naturalHeight * sc);
      S.src = document.createElement('canvas'); S.src.width = S.iw; S.src.height = S.ih;
      S.src.getContext('2d').drawImage(im, 0, 0, S.iw, S.ih);
      var ws = Math.min(1, WORK / Math.max(S.iw, S.ih)); S.ww = Math.round(S.iw * ws); S.wh = Math.round(S.ih * ws);
      var wc = document.createElement('canvas'); wc.width = S.ww; wc.height = S.wh;
      var wg = wc.getContext('2d', { willReadFrequently: true }); wg.drawImage(S.src, 0, 0, S.ww, S.wh);
      var id = wg.getImageData(0, 0, S.ww, S.wh).data; S.gray = new Float32Array(S.ww * S.wh);
      for (var i = 0; i < S.gray.length; i++) S.gray[i] = (0.299 * id[i * 4] + 0.587 * id[i * 4 + 1] + 0.114 * id[i * 4 + 2]) / 255;
      S.proc = document.createElement('canvas'); S.proc.width = S.ww; S.proc.height = S.wh;
      S.fin = document.createElement('canvas'); S.fin.width = S.ww; S.fin.height = S.wh;
      S.strokes = []; S.face = null; var raw = null, ai = true;
      try {
        status('Loading the AI tools (about 12 MB, only the first time)...');
        await lib('seg', V + 'selfie/selfie_segmentation.js'); await lib('face', V + 'face/face_detection.js');
        status('Removing the background...');
        raw = await runSegmentation(wc);
        status('Fitting your face to the passport frame...');
        try { S.face = await detectFace(wc); } catch (e) { S.face = null; }
      } catch (e) {
        ai = false; libs = {}; status('The AI could not start on this device, so quick mode is being used...');
        raw = colourMask(wc);
      }
      var r = Math.max(4, Math.round(Math.max(S.ww, S.wh) * 0.006));
      S.mG = guided(S.gray, raw, S.ww, S.wh, r, 0.0004);
      S.bright = 0; S.contrast = 0; S.soft = +$('ppSoft').value; S.grow = +$('ppGrow').value;
      $('ppBright').value = 0; $('ppContrast').value = 0; $('ppBrightV').textContent = '0'; $('ppContrastV').textContent = '0';
      rebuildProc(); autoFit();
      $('ppStart').hidden = true; $('ppEditor').hidden = false; $('ppBadge').className = 'pp-badge ' + (S.face ? 'ok' : 'warn');
      $('ppBadge').textContent = !ai ? 'Quick mode: works best with a plain wall. Use Fix edges to clean up.'
        : (S.face ? 'Done! Face found. Check the photo and change anything you like.' : 'Background removed, but no face was found. Please move and zoom the photo yourself (Adjust tab).');
      status('');
      setTab(S.face ? 'bg' : 'adjust'); draw(); $('ppEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
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
  $('ppCustomBg').addEventListener('input', function () { setBg(this.value, false); });
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
  $('ppAutoLight').onclick = autoLight;
  $('ppGuide').onchange = function () { S.guide = this.checked; draw(); };
  $('ppCheck').onchange = function () { S.check = this.checked; draw(); };
  $('ppErase').onclick = function () { S.mode = 'erase'; $('ppErase').classList.add('on'); $('ppRestore').classList.remove('on'); };
  $('ppRestore').onclick = function () { S.mode = 'restore'; $('ppRestore').classList.add('on'); $('ppErase').classList.remove('on'); };
  $('ppUndo').onclick = function () { S.strokes.pop(); rebuildFinal(); draw(); };
  $('ppResetMask').onclick = function () { S.strokes = []; rebuildFinal(); draw(); };
  $('ppDl').onclick = downloadPhoto;
  $('ppGoSheet').onclick = function () { setTab('sheet'); $('ppTabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $('ppNew').onclick = function () { $('ppEditor').hidden = true; $('ppStart').hidden = false; S.src = null; status(''); window.scrollTo({ top: $('ppApp').offsetTop - 10, behavior: 'smooth' }); };
  ['ppPaper', 'ppCopies', 'ppGap', 'ppCut'].forEach(function (id) { $(id).addEventListener('change', drawSheetPreview); });
  $('ppShPdf').onclick = downloadSheetPdf; $('ppShJpg').onclick = downloadSheetJpg;

  loadPrefs(); applySizeSelect(); $('ppCustom').hidden = $('ppSize').value !== 'custom';
  setBg(S.bg, S.keepBg); setTab('bg'); $('ppEditor').hidden = true;
  window.__pp = S; /* handy for testing */
})();
