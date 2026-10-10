/* Calvo Document Scanner: camera / gallery -> auto edge detection -> perspective crop ->
   scan filters -> one PDF. Everything runs in the browser. Photos are never uploaded. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(2) + ' MB'; }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  /*SC_CORE_START*/
  function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }
  function newCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function copyCanvas(c) { var o = newCanvas(c.width, c.height); o.getContext('2d').drawImage(c, 0, 0); return o; }
  function scaledCanvas(src, w, h) {
    var o = newCanvas(w, h), g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h); return o;
  }
  function rotateCanvas(c, rot) {
    rot = ((rot % 360) + 360) % 360;
    if (!rot) return c;
    var swap = rot === 90 || rot === 270, o = newCanvas(swap ? c.height : c.width, swap ? c.width : c.height), g = o.getContext('2d');
    g.translate(o.width / 2, o.height / 2); g.rotate(rot * Math.PI / 180); g.drawImage(c, -c.width / 2, -c.height / 2);
    return o;
  }
  function fullQuad(w, h) { return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }]; }
  function insetQuad(w, h) { var m = 0.04; return [{ x: w * m, y: h * m }, { x: w * (1 - m), y: h * m }, { x: w * (1 - m), y: h * (1 - m) }, { x: w * m, y: h * (1 - m) }]; }
  function dist(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); }
  function quadSize(q) { return { w: (dist(q[0], q[1]) + dist(q[3], q[2])) / 2, h: (dist(q[0], q[3]) + dist(q[1], q[2])) / 2 }; }

  /* --- perspective warp --- */
  function solve8(A, b) {
    var n = 8, i, c, r, k;
    for (i = 0; i < n; i++) A[i].push(b[i]);
    for (c = 0; c < n; c++) {
      var piv = c;
      for (r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      var t = A[c]; A[c] = A[piv]; A[piv] = t;
      var d = A[c][c]; if (Math.abs(d) < 1e-12) return null;
      for (k = c; k <= n; k++) A[c][k] /= d;
      for (r = 0; r < n; r++) if (r !== c) { var f = A[r][c]; if (f) for (k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
    }
    return A.map(function (row) { return row[n]; });
  }
  function homography(dst, src) {
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var u = dst[i].x, v = dst[i].y, x = src[i].x, y = src[i].y;
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
    }
    return solve8(A, b);
  }
  /* quad: TL, TR, BR, BL in srcCanvas pixels. Returns a flat, upright rectangle. */
  function warpQuad(srcCanvas, quad, outW, outH) {
    var sw = srcCanvas.width, sh = srcCanvas.height;
    var H = homography([{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }], quad);
    if (!H) return scaledCanvas(srcCanvas, outW, outH);
    var sd = srcCanvas.getContext('2d').getImageData(0, 0, sw, sh).data;
    var out = newCanvas(outW, outH), og = out.getContext('2d'), oi = og.createImageData(outW, outH), od = oi.data;
    var x, y, o = 0;
    for (y = 0; y < outH; y++) {
      var v = y + 0.5;
      for (x = 0; x < outW; x++, o += 4) {
        var u = x + 0.5, w = H[6] * u + H[7] * v + 1;
        var sx = (H[0] * u + H[1] * v + H[2]) / w - 0.5, sy = (H[3] * u + H[4] * v + H[5]) / w - 0.5;
        sx = sx < 0 ? 0 : sx > sw - 1 ? sw - 1 : sx; sy = sy < 0 ? 0 : sy > sh - 1 ? sh - 1 : sy;
        var x0 = sx | 0, y0 = sy | 0, x1 = x0 + 1 < sw ? x0 + 1 : x0, y1 = y0 + 1 < sh ? y0 + 1 : y0;
        var fx = sx - x0, fy = sy - y0, a = (y0 * sw + x0) * 4, b = (y0 * sw + x1) * 4, c = (y1 * sw + x0) * 4, d = (y1 * sw + x1) * 4;
        var w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        od[o] = sd[a] * w00 + sd[b] * w10 + sd[c] * w01 + sd[d] * w11;
        od[o + 1] = sd[a + 1] * w00 + sd[b + 1] * w10 + sd[c + 1] * w01 + sd[d + 1] * w11;
        od[o + 2] = sd[a + 2] * w00 + sd[b + 2] * w10 + sd[c + 2] * w01 + sd[d + 2] * w11;
        od[o + 3] = 255;
      }
    }
    og.putImageData(oi, 0, 0);
    return out;
  }

  /* --- automatic edge detection: finds the biggest paper-like region --- */
  function detectQuad(src, iw, ih) {
    var s = Math.min(1, 300 / Math.max(iw, ih)), w = Math.max(8, Math.round(iw * s)), h = Math.max(8, Math.round(ih * s)), n = w * h, i, p, x, y;
    var c = newCanvas(w, h), g = c.getContext('2d'); g.drawImage(src, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data, gray = new Uint8Array(n), tmp = new Uint8Array(n);
    for (i = 0, p = 0; i < n; i++, p += 4) gray[i] = (d[p] * 77 + d[p + 1] * 150 + d[p + 2] * 29) >> 8;
    for (var pass = 0; pass < 2; pass++) {
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var r0 = y * w; tmp[r0 + x] = (gray[r0 + (x > 0 ? x - 1 : 0)] + gray[r0 + x] + gray[r0 + (x < w - 1 ? x + 1 : x)]) / 3; }
      for (y = 0; y < h; y++) { var up = (y > 0 ? y - 1 : 0) * w, dn = (y < h - 1 ? y + 1 : y) * w; for (x = 0; x < w; x++) gray[y * w + x] = (tmp[up + x] + tmp[y * w + x] + tmp[dn + x]) / 3; }
    }
    var hist = new Array(256).fill(0), sum = 0;
    for (i = 0; i < n; i++) { hist[gray[i]]++; sum += gray[i]; }
    var sumB = 0, wB = 0, best = -1, T = 128;
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue; var wF = n - wB; if (!wF) break;
      sumB += i * hist[i]; var mB = sumB / wB, mF = (sum - sumB) / wF, vb = wB * wF * (mB - mF) * (mB - mF);
      if (vb > best) { best = vb; T = i; }
    }
    var result = null, bestScore = 0, stack = new Int32Array(n);
    [true, false].forEach(function (bright) {
      var mask = new Uint8Array(n), seen = new Uint8Array(n), k;
      for (k = 0; k < n; k++) mask[k] = (bright ? gray[k] > T : gray[k] <= T) ? 1 : 0;
      var top = null;
      for (k = 0; k < n; k++) {
        if (!mask[k] || seen[k]) continue;
        var sp = 0, size = 0, border = 0, e = [k, k, k, k], ev = [1e9, -1e9, -1e9, 1e9]; // min(x+y), max(x+y), max(x-y), min(x-y)
        stack[sp++] = k; seen[k] = 1;
        while (sp) {
          var q = stack[--sp], qx = q % w, qy = (q - qx) / w; size++;
          if (qx === 0 || qy === 0 || qx === w - 1 || qy === h - 1) border++;
          var a1 = qx + qy, a2 = qx - qy;
          if (a1 < ev[0]) { ev[0] = a1; e[0] = q; } if (a1 > ev[1]) { ev[1] = a1; e[1] = q; }
          if (a2 > ev[2]) { ev[2] = a2; e[2] = q; } if (a2 < ev[3]) { ev[3] = a2; e[3] = q; }
          if (qx > 0 && mask[q - 1] && !seen[q - 1]) { seen[q - 1] = 1; stack[sp++] = q - 1; }
          if (qx < w - 1 && mask[q + 1] && !seen[q + 1]) { seen[q + 1] = 1; stack[sp++] = q + 1; }
          if (qy > 0 && mask[q - w] && !seen[q - w]) { seen[q - w] = 1; stack[sp++] = q - w; }
          if (qy < h - 1 && mask[q + w] && !seen[q + w]) { seen[q + w] = 1; stack[sp++] = q + w; }
        }
        if (!top || size > top.size) top = { size: size, border: border, e: e };
      }
      if (!top) return;
      var ratio = top.size / n; if (ratio < 0.12 || ratio > 0.97) return;
      var score = ratio * (1 - 0.8 * Math.min(1, top.border / (2 * (w + h))));
      if (score > bestScore) { bestScore = score; result = top.e; }
    });
    if (!result) return null;
    function pt(idx) { var px = idx % w; return { x: px + 0.5, y: (idx - px) / w + 0.5 }; }
    var TL = pt(result[0]), BR = pt(result[1]), TR = pt(result[2]), BL = pt(result[3]);
    var area = Math.abs((TL.x * TR.y - TR.x * TL.y) + (TR.x * BR.y - BR.x * TR.y) + (BR.x * BL.y - BL.x * BR.y) + (BL.x * TL.y - TL.x * BL.y)) / 2;
    if (area < 0.1 * n) return null;
    var cx = (TL.x + TR.x + BR.x + BL.x) / 4, cy = (TL.y + TR.y + BR.y + BL.y) / 4;
    return [TL, TR, BR, BL].map(function (q) {
      return { x: clampN((cx + (q.x - cx) * 1.012) / s, 0, iw), y: clampN((cy + (q.y - cy) * 1.012) / s, 0, ih) };
    });
  }

  /* --- scan filters --- */
  function flattenCanvas(canvas, mode) {
    var w = canvas.width, h = canvas.height, g = canvas.getContext('2d');
    var img = g.getImageData(0, 0, w, h), d = img.data, n = w * h, gray = new Uint8ClampedArray(n), i, p, x, y;
    var hist = new Array(256).fill(0);
    for (i = 0, p = 0; i < n; i++, p += 4) { var gv0 = (d[p] * 77 + d[p + 1] * 150 + d[p + 2] * 29) >> 8; gray[i] = gv0; hist[gv0]++; }
    var acc = 0, p80 = 255, target = n * 0.8;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc >= target) { p80 = i; break; } }
    var floor = 0.62 * p80;
    var W1 = w + 1, ii = new Uint32Array(W1 * (h + 1));
    for (y = 0; y < h; y++) { var row = 0; for (x = 0; x < w; x++) { row += gray[y * w + x]; ii[(y + 1) * W1 + x + 1] = ii[y * W1 + x + 1] + row; } }
    var half = Math.max(8, Math.round(Math.max(w, h) / 16));
    for (y = 0; y < h; y++) {
      var y1 = Math.max(0, y - half), y2 = Math.min(h, y + half + 1);
      for (x = 0; x < w; x++) {
        var x1 = Math.max(0, x - half), x2 = Math.min(w, x + half + 1);
        var mean = (ii[y2 * W1 + x2] - ii[y1 * W1 + x2] - ii[y2 * W1 + x1] + ii[y1 * W1 + x1]) / ((x2 - x1) * (y2 - y1));
        var bg = (mean > floor ? mean : floor) + 1, idx = y * w + x, q = idx * 4, gv = gray[idx];
        if (mode === 'bw') { var b = gv < bg * 0.80 ? 0 : 255; d[q] = d[q + 1] = d[q + 2] = b; }
        else if (mode === 'gray') { var v = ((gv / bg) - 0.55) / 0.37; v = v < 0 ? 0 : v > 1 ? 1 : v; d[q] = d[q + 1] = d[q + 2] = v * 255; }
        else { for (var ch = 0; ch < 3; ch++) { var u = ((d[q + ch] / bg) - 0.5) / 0.45; u = u < 0 ? 0 : u > 1 ? 1 : u; d[q + ch] = u * 255; } }
      }
    }
    g.putImageData(img, 0, 0);
  }
  function applyFilter(c, name, bright, contrast) {
    if (name === 'magic' || name === 'gray' || name === 'bw') flattenCanvas(c, name);
    if (name !== 'lighten' && !bright && !contrast) return;
    var lut = new Uint8ClampedArray(256), k = 1 + (contrast || 0) / 100, i;
    for (i = 0; i < 256; i++) {
      var v = i;
      if (name === 'lighten') v = 255 * Math.pow(i / 255, 0.7) * 1.04;
      v = (v - 128) * k + 128 + (bright || 0);
      lut[i] = v;
    }
    var g = c.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), d = img.data;
    for (i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
    g.putImageData(img, 0, 0);
  }
  /*SC_CORE_END*/

  if (!$('scApp')) return;

  /* ---------- load pdf-lib on demand (looks in vendor/ then in the site root) ---------- */
  var libP = null;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('x')); };
      document.head.appendChild(s);
    });
  }
  function lib() {
    if (!libP) {
      var p = Promise.reject();
      ['vendor/', ''].forEach(function (b) { p = p.catch(function () { return loadScript(b + 'pdf-lib.min.js'); }); });
      libP = p.catch(function () {
        libP = null;
        throw new Error('PDF engine file not found (pdf-lib.min.js). Upload the vendor folder next to image-to-pdf.html.');
      });
    }
    return libP;
  }
  function toBlobQ(c, q) {
    return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error('Image encoding failed. Try fewer or smaller photos.')); }, 'image/jpeg', q); });
  }

  /* ---------- state ---------- */
  var FILTERS = [['original', 'Original'], ['magic', 'Magic Color'], ['lighten', 'Lighten'], ['gray', 'Grayscale'], ['bw', 'B&W']];
  var PRESETS = { high: [2200, 0.85], medium: [1600, 0.7], low: [1100, 0.5] };
  var LADDER = [[2200, 0.85], [1800, 0.75], [1500, 0.65], [1200, 0.55], [1000, 0.45], [800, 0.4], [650, 0.33], [500, 0.28]];
  var MAXPAGES = 40, STORE_SIDE = 2600;
  var pages = [], sel = 0, nid = 1, busy = false, decoded = [], resultUrl = null;

  function cur() { return pages[sel]; }
  function setStatus(msg) { var e = $('scStatus'); e.style.display = msg ? 'block' : 'none'; e.textContent = msg || ''; }

  /* ---------- photo loading (keeps memory small: each page is stored as a compressed JPEG) ---------- */
  function loadImage(f) {
    var p = window.createImageBitmap ? createImageBitmap(f, { imageOrientation: 'from-image' }).then(function (b) { return { src: b, w: b.width, h: b.height }; }) : Promise.reject();
    return p.catch(function () {
      return new Promise(function (res, rej) {
        var u = URL.createObjectURL(f), im = new Image();
        im.onload = function () { URL.revokeObjectURL(u); res({ src: im, w: im.naturalWidth, h: im.naturalHeight }); };
        im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('bad')); };
        im.src = u;
      });
    });
  }
  async function ensureSrc(p) {
    if (!p.src) {
      var im = await loadImage(p.blob);
      p.src = im.src;
    }
    var k = decoded.indexOf(p); if (k >= 0) decoded.splice(k, 1);
    decoded.push(p);
    while (decoded.length > 3) { var old = decoded.shift(); if (old !== p) { if (old.src && old.src.close) old.src.close(); old.src = null; } }
    return p.src;
  }

  /* ---------- rendering pipeline ---------- */
  function sampleCanvas(p, maxSide) {
    var s = Math.min(1, maxSide / Math.max(p.iw, p.ih)), c = scaledCanvas(p.src, Math.max(1, Math.round(p.iw * s)), Math.max(1, Math.round(p.ih * s)));
    c._s = s; return c;
  }
  function getBase(p, maxSide) {
    if (p.full) return sampleCanvas(p, maxSide);
    var sc = sampleCanvas(p, Math.min(2600, Math.max(maxSide * 1.5, 900))), s = sc._s;
    var q = p.quad.map(function (pt) { return { x: pt.x * s, y: pt.y * s }; }), dm = quadSize(q);
    var k = Math.min(1, maxSide / Math.max(dm.w, dm.h));
    return warpQuad(sc, q, Math.max(8, Math.round(dm.w * k)), Math.max(8, Math.round(dm.h * k)));
  }
  function renderPage(p, maxSide) {
    var rc = rotateCanvas(getBase(p, maxSide), p.rot);
    applyFilter(rc, p.filter, p.b, p.c);
    return rc;
  }
  function smallURL(c, side, q) {
    var k = Math.min(1, side / Math.max(c.width, c.height));
    return scaledCanvas(c, Math.max(1, Math.round(c.width * k)), Math.max(1, Math.round(c.height * k))).toDataURL('image/jpeg', q || 0.65);
  }
  function qkey(p) { return p.quad.map(function (q) { return Math.round(q.x) + ',' + Math.round(q.y); }).join(';') + '|' + p.full + '|' + p.rot; }
  async function refresh(p) {
    await ensureSrc(p);
    var key = qkey(p);
    if (p.key !== key || !p.rotC) { p.rotC = rotateCanvas(getBase(p, 1000), p.rot); p.key = key; p.fthumbs = null; }
    repaint(p);
    if (!p.fthumbs) p.fthumbs = FILTERS.map(function (f) { var t = scaledCanvas(p.rotC, Math.max(1, Math.round(p.rotC.width * Math.min(1, 96 / Math.max(p.rotC.width, p.rotC.height)))), Math.max(1, Math.round(p.rotC.height * Math.min(1, 96 / Math.max(p.rotC.width, p.rotC.height))))); applyFilter(t, f[0], 0, 0); return t.toDataURL('image/jpeg', 0.6); });
    p.thumb = smallURL(p.prevC, 90);
  }
  function repaint(p) {
    var rc = copyCanvas(p.rotC); applyFilter(rc, p.filter, p.b, p.c); p.prevC = rc;
    if (p === cur()) drawView();
  }

  /* ---------- UI ---------- */
  var view = $('scView'), vg = view.getContext('2d');
  function drawView() {
    var p = cur(); if (!p || !p.prevC) return;
    view.width = p.prevC.width; view.height = p.prevC.height; vg.drawImage(p.prevC, 0, 0);
  }
  function renderAll() {
    $('scEmpty').hidden = pages.length > 0; $('scEditor').hidden = !pages.length;
    if (!pages.length) return;
    var p = cur();
    $('scCount').textContent = 'Page ' + (sel + 1) + ' of ' + pages.length;
    $('scPrev').disabled = sel === 0; $('scNext').disabled = sel === pages.length - 1;
    drawView();
    $('scFilters').innerHTML = FILTERS.map(function (f, i) {
      return '<button type="button" class="sc-f' + (p.filter === f[0] ? ' on' : '') + '" data-f="' + f[0] + '"><img alt="" src="' + (p.fthumbs ? p.fthumbs[i] : '') + '"><span>' + f[1] + '</span></button>';
    }).join('');
    $('scBright').value = p.b; $('scContrast').value = p.c;
    $('scStrip').innerHTML = pages.map(function (q, i) {
      return '<button type="button" class="sc-t' + (i === sel ? ' on' : '') + '" data-i="' + i + '" aria-label="Page ' + (i + 1) + '"><img alt="" src="' + (q.thumb || '') + '"><i>' + (i + 1) + '</i></button>';
    }).join('');
    var on = $('scStrip').querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    $('scL').disabled = sel === 0; $('scR').disabled = sel === pages.length - 1;
  }
  async function select(i) {
    sel = Math.max(0, Math.min(pages.length - 1, i));
    var p = cur(); if (p && (!p.prevC || !p.thumb)) await refresh(p);
    renderAll();
  }

  async function addFiles(files) {
    var arr = Array.prototype.slice.call(files), first = pages.length, bad = 0, over = false;
    setStatus('Opening photos...');
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i];
      if (pages.length >= MAXPAGES) { over = true; break; }
      if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name)) { bad++; continue; }
      try {
        setStatus('Opening photo ' + (i + 1) + ' of ' + arr.length + '...'); await tick();
        var im = await loadImage(f), k = Math.min(1, STORE_SIDE / Math.max(im.w, im.h));
        var c = scaledCanvas(im.src, Math.max(1, Math.round(im.w * k)), Math.max(1, Math.round(im.h * k)));
        if (im.src.close) im.src.close();
        var blob = await toBlobQ(c, 0.92);
        var p = { id: nid++, blob: blob, src: c, iw: c.width, ih: c.height, rot: 0, filter: 'magic', b: 0, c: 0, full: false, quad: null };
        p.quad = detectQuad(c, c.width, c.height); p.auto = !!p.quad; if (!p.quad) p.quad = insetQuad(c.width, c.height);
        pages.push(p); await ensureSrc(p);
      } catch (e) { bad++; }
    }
    if (pages.length > first) { sel = first; await refresh(cur()); }
    renderAll();
    var msg = '';
    if (over) msg += 'Maximum ' + MAXPAGES + ' pages. ';
    if (bad) msg += bad + ' file' + (bad > 1 ? 's' : '') + ' skipped (not a supported image; HEIC photos may need saving as JPG first).';
    setStatus(msg);
    if (pages.length > first && !msg) $('scEditor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* pickers */
  function wireInput(inpId) {
    var inp = $(inpId);
    inp.addEventListener('change', function () { if (inp.files && inp.files.length) addFiles(inp.files); inp.value = ''; });
  }
  function wireBtn(btnId, inpId) { $(btnId).addEventListener('click', function () { $(inpId).click(); }); }
  wireInput('scCam'); wireInput('scGal');
  wireBtn('scBtnCam', 'scCam'); wireBtn('scBtnGal', 'scGal'); wireBtn('scAddCam', 'scCam'); wireBtn('scAddGal', 'scGal');
  var drop = $('scDrop');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

  /* navigation */
  $('scPrev').onclick = function () { select(sel - 1); };
  $('scNext').onclick = function () { select(sel + 1); };
  $('scStrip').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) select(+b.getAttribute('data-i')); });
  var sw = null, stage = $('scStage');
  stage.addEventListener('pointerdown', function (e) { if (e.target === view) sw = { x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointerup', function (e) {
    if (!sw) return; var dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) select(sel + (dx < 0 ? 1 : -1));
  });

  /* filters + adjust */
  $('scFilters').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var p = cur(); p.filter = b.getAttribute('data-f'); repaint(p); p.thumb = smallURL(p.prevC, 90); renderAll();
  });
  var rafId = 0;
  function onAdjust() {
    var p = cur(); if (!p) return; p.b = +$('scBright').value; p.c = +$('scContrast').value;
    if (!rafId) rafId = requestAnimationFrame(function () { rafId = 0; repaint(p); });
  }
  $('scBright').addEventListener('input', onAdjust); $('scContrast').addEventListener('input', onAdjust);
  ['scBright', 'scContrast'].forEach(function (id) { $(id).addEventListener('change', function () { var p = cur(); if (p && p.prevC) { p.thumb = smallURL(p.prevC, 90); renderAll(); } }); });
  $('scAdjReset').onclick = function () { var p = cur(); p.b = 0; p.c = 0; $('scBright').value = 0; $('scContrast').value = 0; repaint(p); p.thumb = smallURL(p.prevC, 90); renderAll(); };
  $('scAll').onclick = async function () {
    var p = cur(), i; setStatus('Applying to all pages...');
    for (i = 0; i < pages.length; i++) { var q = pages[i]; q.filter = p.filter; q.b = p.b; q.c = p.c; if (q !== p) { await refresh(q); await tick(); } }
    setStatus(''); renderAll();
  };

  /* tools */
  $('scAdjBtn').onclick = function () { $('scAdj').hidden = !$('scAdj').hidden; };
  $('scRotate').onclick = async function () { var p = cur(); p.rot = (p.rot + 90) % 360; await refresh(p); renderAll(); };
  function move(d) {
    var j = sel + d; if (j < 0 || j >= pages.length) return;
    var t = pages[sel]; pages[sel] = pages[j]; pages[j] = t; sel = j; renderAll();
  }
  $('scL').onclick = function () { move(-1); }; $('scR').onclick = function () { move(1); };
  $('scDel').onclick = async function () {
    if (!pages.length) return;
    var gone = pages.splice(sel, 1)[0]; var k = decoded.indexOf(gone); if (k >= 0) decoded.splice(k, 1);
    if (!pages.length) { sel = 0; $('scResult').className = 'result empty'; $('scResult').textContent = 'Add photos to begin.'; renderAll(); return; }
    sel = Math.min(sel, pages.length - 1); await select(sel);
  };

  /* ---------- crop screen ---------- */
  var cr = { p: null, quad: null, full: false, drag: -1, dpr: 1 }, crCv = $('crCanvas'), crG = crCv.getContext('2d');
  async function openCrop() {
    var p = cur(); if (!p) return;
    await ensureSrc(p);
    cr.p = p; cr.quad = p.full ? fullQuad(p.iw, p.ih) : p.quad.map(function (q) { return { x: q.x, y: q.y }; }); cr.full = p.full;
    $('crMsg').textContent = 'Drag the four corners to the edges of the page.';
    $('crOverlay').hidden = false; document.body.style.overflow = 'hidden';
    layoutCrop(); drawCrop();
  }
  function layoutCrop() {
    var p = cr.p; if (!p) return;
    var maxW = Math.min(window.innerWidth - 24, 760), maxH = Math.max(220, window.innerHeight * 0.58), s = Math.min(maxW / p.iw, maxH / p.ih);
    cr.dpr = Math.min(2, window.devicePixelRatio || 1);
    crCv.width = Math.max(1, Math.round(p.iw * s * cr.dpr)); crCv.height = Math.max(1, Math.round(p.ih * s * cr.dpr));
    crCv.style.width = (p.iw * s) + 'px'; crCv.style.height = (p.ih * s) + 'px';
  }
  function drawCrop() {
    var p = cr.p; if (!p || !p.src) return;
    var k = crCv.width / p.iw, q = cr.quad, i;
    crG.drawImage(p.src, 0, 0, crCv.width, crCv.height);
    crG.fillStyle = 'rgba(0,0,0,.55)'; crG.beginPath(); crG.rect(0, 0, crCv.width, crCv.height);
    crG.moveTo(q[0].x * k, q[0].y * k); for (i = 1; i < 4; i++) crG.lineTo(q[i].x * k, q[i].y * k); crG.closePath(); crG.fill('evenodd');
    crG.strokeStyle = '#ff8a1f'; crG.lineWidth = 2 * cr.dpr; crG.beginPath(); crG.moveTo(q[0].x * k, q[0].y * k);
    for (i = 1; i < 4; i++) crG.lineTo(q[i].x * k, q[i].y * k); crG.closePath(); crG.stroke();
    for (i = 0; i < 4; i++) {
      crG.beginPath(); crG.arc(q[i].x * k, q[i].y * k, 11 * cr.dpr, 0, 6.2832); crG.fillStyle = 'rgba(255,255,255,.92)'; crG.fill();
      crG.lineWidth = 3 * cr.dpr; crG.strokeStyle = '#ff8a1f'; crG.stroke();
    }
  }
  function crPoint(e) {
    var r = crCv.getBoundingClientRect(), p = cr.p;
    return { x: clampN((e.clientX - r.left) / r.width * p.iw, 0, p.iw), y: clampN((e.clientY - r.top) / r.height * p.ih, 0, p.ih), k: p.iw / r.width };
  }
  crCv.addEventListener('pointerdown', function (e) {
    if (!cr.p) return; var pt = crPoint(e), best = -1, bd = 44 * pt.k;
    cr.quad.forEach(function (q, i) { var d = Math.sqrt((q.x - pt.x) * (q.x - pt.x) + (q.y - pt.y) * (q.y - pt.y)); if (d < bd) { bd = d; best = i; } });
    cr.drag = best; if (best >= 0) { try { crCv.setPointerCapture(e.pointerId); } catch (x) {} }
  });
  crCv.addEventListener('pointermove', function (e) {
    if (cr.drag < 0) return; var pt = crPoint(e); cr.quad[cr.drag] = { x: pt.x, y: pt.y }; cr.full = false; drawCrop();
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) { crCv.addEventListener(ev, function () { cr.drag = -1; }); });
  $('crAuto').onclick = function () {
    var p = cr.p, q = detectQuad(p.src, p.iw, p.ih);
    cr.quad = q || insetQuad(p.iw, p.ih); cr.full = false;
    $('crMsg').textContent = q ? 'Edges found. Adjust the corners if needed.' : 'Could not find the edges automatically. Drag the corners by hand.';
    drawCrop();
  };
  $('crFull').onclick = function () { cr.quad = fullQuad(cr.p.iw, cr.p.ih); cr.full = true; $('crMsg').textContent = 'Using the whole photo.'; drawCrop(); };
  function closeCrop() { $('crOverlay').hidden = true; document.body.style.overflow = ''; cr.p = null; }
  $('crCancel').onclick = closeCrop;
  $('crDone').onclick = async function () {
    var p = cr.p; if (!p) return;
    p.quad = cr.quad.map(function (q) { return { x: q.x, y: q.y }; }); p.full = cr.full; closeCrop();
    await refresh(p); renderAll();
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('crOverlay').hidden) closeCrop(); });
  window.addEventListener('resize', function () { if (cr.p) { layoutCrop(); drawCrop(); } });
  $('scCrop').onclick = openCrop;

  /* ---------- create PDF ---------- */
  function targetBytes() {
    var v = parseFloat($('scTarget').value); if (!(v > 0)) return 0;
    return Math.round(v * ($('scTargetUnit').value === 'MB' ? 1048576 : 1024));
  }
  async function buildPdf(maxSide, quality, label) {
    var doc = await PDFLib.PDFDocument.create();
    doc.setProducer('Calvo Document Scanner'); doc.setCreator('calvoscientificcalculator.online');
    var size = $('scSize').value, layout = $('scLayout').value, base = size === 'letter' ? [612, 792] : [595.28, 841.89], i, embedded = [];
    for (i = 0; i < pages.length; i++) {
      setStatus((label ? label + ' ' : '') + 'Creating page ' + (i + 1) + ' of ' + pages.length + '...'); await tick();
      var p = pages[i]; await ensureSrc(p);
      var rc = renderPage(p, maxSide), blob = await toBlobQ(rc, quality), img = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      rc.width = rc.height = 0; embedded.push(img);
      if (layout === 'single') {
        var iw = img.width, ih = img.height, pw, ph, dw, dh, m = size === 'fit' ? 0 : 14;
        if (size === 'fit') { var s = 842 / Math.max(iw, ih); dw = iw * s; dh = ih * s; pw = dw; ph = dh; }
        else { pw = iw > ih ? base[1] : base[0]; ph = iw > ih ? base[0] : base[1]; var kk = Math.min((pw - 2 * m) / iw, (ph - 2 * m) / ih); dw = iw * kk; dh = ih * kk; }
        doc.addPage([pw, ph]).drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
      }
    }
    if (layout === 'id') {
      var bw = base[0], bh = base[1], cw = 242.6;       // real ID card width (85.6 mm)
      for (i = 0; i < embedded.length; i += 2) {
        var page = doc.addPage([bw, bh]), y = bh - 110;
        for (var j = i; j < Math.min(i + 2, embedded.length); j++) {
          var im = embedded[j], hh = cw * im.height / im.width; if (hh > 340) hh = 340;
          var ww = hh * im.width / im.height;
          y -= hh; page.drawImage(im, { x: (bw - ww) / 2, y: y, width: ww, height: hh }); y -= 36;
        }
      }
    }
    return await doc.save();
  }
  $('scCreate').onclick = async function () {
    if (busy || !pages.length) return;
    busy = true; $('scCreate').disabled = true;
    var box = $('scResult'); box.className = 'result empty'; box.textContent = 'Creating your PDF...';
    try {
      await lib();
      var target = targetBytes(), bytes, notes = [];
      if (target) {
        for (var s = 0; s < LADDER.length; s++) {
          bytes = await buildPdf(LADDER[s][0], LADDER[s][1], 'Step ' + (s + 1) + '/' + LADDER.length + '.');
          if (bytes.length <= target) break;
        }
        if (bytes.length > target) notes.push('Could not get under ' + fmt(target) + '. This is the smallest possible at readable quality. Try fewer pages or a bigger limit.');
      } else {
        var pr = PRESETS[$('scQuality').value] || PRESETS.medium; bytes = await buildPdf(pr[0], pr[1], '');
      }
      showResult(bytes, notes);
      setStatus('');
    } catch (e) {
      box.className = 'result empty'; box.textContent = 'Something went wrong: ' + (e && e.message ? e.message : e); setStatus('');
    }
    busy = false; $('scCreate').disabled = false;
  };
  function showResult(bytes, notes) {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    var blob = new Blob([bytes], { type: 'application/pdf' }); resultUrl = URL.createObjectURL(blob);
    var nm = ($('scName').value || 'Calvo Scan').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Calvo Scan', fileName = nm + '.pdf', file = null;
    try { file = new File([blob], fileName, { type: 'application/pdf' }); } catch (e) {}
    var canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] })), box = $('scResult');
    box.className = 'result';
    box.innerHTML = '<div class="stats"><div class="stat"><b>' + pages.length + '</b><span>pages</span></div><div class="stat"><b>' + fmt(bytes.length) + '</b><span>PDF size</span></div></div>' +
      (notes.length ? '<div class="note" style="margin-top:8px">' + notes.map(esc).join('<br>') + '</div>' : '') +
      '<div class="row" style="margin-top:12px"><button class="btn" id="scDl" type="button">Download PDF</button>' +
      (canShare ? '<button class="btn ghost" id="scSh" type="button">Share / Save</button>' : '') +
      '<button class="btn ghost" id="scNew" type="button">New scan</button></div>';
    $('scDl').onclick = function () { var a = document.createElement('a'); a.href = resultUrl; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); };
    if (canShare) $('scSh').onclick = function () { navigator.share({ files: [file], title: fileName }).catch(function () {}); };
    $('scNew').onclick = function () {
      pages = []; decoded = []; sel = 0; box.className = 'result empty'; box.textContent = 'Add photos to begin.'; renderAll();
    };
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  var d0 = new Date(); $('scName').value = 'Scan ' + d0.getFullYear() + '-' + ('0' + (d0.getMonth() + 1)).slice(-2) + '-' + ('0' + d0.getDate()).slice(-2);
  renderAll();
})();
