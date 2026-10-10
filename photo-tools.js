/* Calvo Photo Resizer: crop to passport/CNIC size, white background, compress to a size in KB.
   Everything runs in the browser. Photos are never uploaded. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(b) { return b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(2) + ' MB'; }

  /*PH_CORE_START*/
  function toBlobQ(c, q) {
    return new Promise(function (res, rej) {
      c.toBlob(function (b) { b ? res(b) : rej(new Error('Image encoding failed. Try a smaller photo.')); }, 'image/jpeg', q);
    });
  }
  function resizeCanvas(src, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h);
    return c;
  }

  /* Turns a plain background white. Flood-fills from the photo edges over pixels close to the
     edge colour, so the face, hair and clothes are left alone unless they match the wall. */
  function whitenBg(c, tol) {
    var w = c.width, h = c.height, g = c.getContext('2d');
    var im = g.getImageData(0, 0, w, h), d = im.data, n = w * h, x, y, k, i;
    var R = [], G = [], B = [], t = Math.max(1, Math.min(3, Math.floor(Math.min(w, h) / 100)));
    function push(px, py) { var j = (py * w + px) * 4; R.push(d[j]); G.push(d[j + 1]); B.push(d[j + 2]); }
    for (x = 0; x < w; x += 2) for (k = 0; k < t; k++) { push(x, k); push(x, h - 1 - k); }
    for (y = 0; y < h; y += 2) for (k = 0; k < t; k++) { push(k, y); push(w - 1 - k, y); }
    function med(a) { a.sort(function (p, q) { return p - q; }); return a[a.length >> 1]; }
    var mr = med(R), mg = med(G), mb = med(B), thr = tol * 3, whiteThr = Math.min(thr, 40);
    function isBg(j) {
      var r = d[j], gg = d[j + 1], b = d[j + 2];
      if (Math.abs(r - mr) + Math.abs(gg - mg) + Math.abs(b - mb) <= thr) return true;
      return (765 - r - gg - b) <= whiteThr;
    }
    var mask = new Uint8Array(n), stack = new Int32Array(n), sp = 0;
    function tryPx(p) { if (!mask[p] && isBg(p * 4)) { mask[p] = 1; stack[sp++] = p; } }
    for (x = 0; x < w; x++) { tryPx(x); tryPx((h - 1) * w + x); }
    for (y = 0; y < h; y++) { tryPx(y * w); tryPx(y * w + w - 1); }
    while (sp) {
      var p = stack[--sp], px = p % w, py = (p - px) / w;
      if (px > 0) tryPx(p - 1);
      if (px < w - 1) tryPx(p + 1);
      if (py > 0) tryPx(p - w);
      if (py < h - 1) tryPx(p + w);
    }
    var a = new Float32Array(n), tmp = new Float32Array(n);
    for (i = 0; i < n; i++) a[i] = mask[i];
    for (var pass = 0; pass < 2; pass++) {
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        var r0 = y * w;
        tmp[r0 + x] = (a[r0 + (x > 0 ? x - 1 : 0)] + a[r0 + x] + a[r0 + (x < w - 1 ? x + 1 : x)]) / 3;
      }
      for (y = 0; y < h; y++) {
        var up = (y > 0 ? y - 1 : 0) * w, dn = (y < h - 1 ? y + 1 : y) * w;
        for (x = 0; x < w; x++) a[y * w + x] = (tmp[up + x] + tmp[y * w + x] + tmp[dn + x]) / 3;
      }
    }
    for (i = 0; i < n; i++) {
      var al = a[i];
      if (al > 0) { var j = i * 4; d[j] += (255 - d[j]) * al; d[j + 1] += (255 - d[j + 1]) * al; d[j + 2] += (255 - d[j + 2]) * al; }
    }
    g.putImageData(im, 0, 0);
  }

  /* Finds the highest JPEG quality that stays under the size limit. */
  async function encodeTo(src, target, allowShrink) {
    if (!target) { var b0 = await toBlobQ(src, 0.92); return { blob: b0, w: src.width, h: src.height }; }
    var scale = 1;
    for (;;) {
      var w = Math.max(40, Math.round(src.width * scale)), h = Math.max(40, Math.round(src.height * scale));
      var c = scale === 1 ? src : resizeCanvas(src, w, h);
      var hi = await toBlobQ(c, 0.95);
      if (hi.size <= target) return { blob: hi, w: w, h: h };
      var lo = await toBlobQ(c, 0.15);
      if (lo.size > target) {
        if (allowShrink && Math.min(w, h) > 60) { scale *= 0.85; continue; }
        return { blob: lo, w: w, h: h, over: true };
      }
      var l = 0.15, u = 0.95, best = lo;
      for (var i = 0; i < 8; i++) {
        var m = (l + u) / 2, b = await toBlobQ(c, m);
        if (b.size <= target) { best = b; l = m; } else u = m;
      }
      return { blob: best, w: w, h: h };
    }
  }
  /*PH_CORE_END*/

  if (!$('phDrop')) return;

  var PRESETS = { p3545: [413, 531], nadra: [350, 467], sq: [600, 600] };
  var st = { img: null, iw: 0, ih: 0, rot: 0, zoom: 1, ox: 0, oy: 0, kb: 50, url: null };
  var cv = $('phCanvas'), cx = cv.getContext('2d'), viewW = 300, viewH = 400, raf = 0;

  function setStatus(msg) { var e = $('phStatus'); e.style.display = msg ? 'block' : 'none'; e.textContent = msg || ''; }

  function outDims() {
    var p = $('phPreset').value;
    if (PRESETS[p]) return { w: PRESETS[p][0], h: PRESETS[p][1], fixed: true };
    if (p === 'orig') {
      if (!st.img) return null;
      var sw = (st.rot % 180) ? st.ih : st.iw, sh = (st.rot % 180) ? st.iw : st.ih, k = Math.min(1, 1200 / Math.max(sw, sh));
      return { w: Math.max(40, Math.round(sw * k)), h: Math.max(40, Math.round(sh * k)), fixed: false };
    }
    var cw = parseFloat($('phCW').value), ch = parseFloat($('phCH').value), u = $('phCU').value;
    if (!(cw > 0) || !(ch > 0)) return null;
    var pw = u === 'mm' ? Math.round(cw / 25.4 * 300) : Math.round(cw), ph = u === 'mm' ? Math.round(ch / 25.4 * 300) : Math.round(ch);
    if (pw < 40 || ph < 40 || pw > 3000 || ph > 3000) return null;
    return { w: pw, h: ph, fixed: true };
  }

  function layout() {
    var d = outDims();
    if (!d) { $('phDims').textContent = 'Enter a valid width and height.'; return false; }
    $('phDims').textContent = 'Output size: ' + d.w + ' \u00D7 ' + d.h + ' px';
    var wrapW = Math.max(180, Math.min(340, $('phEditor').clientWidth - 4 || 340));
    viewW = wrapW; viewH = viewW * d.h / d.w;
    if (viewH > 460) { viewH = 460; viewW = viewH * d.w / d.h; }
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(viewW * dpr); cv.height = Math.round(viewH * dpr);
    cv.style.width = viewW + 'px'; cv.style.height = viewH + 'px';
    return true;
  }

  function drawTo(g, cw, ch) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch);
    if (!st.img) return;
    var swap = st.rot % 180 !== 0, rw = swap ? st.ih : st.iw, rh = swap ? st.iw : st.ih;
    var s = Math.max(cw / rw, ch / rh) * st.zoom;
    g.save();
    g.translate(cw / 2 + st.ox * cw, ch / 2 + st.oy * ch);
    g.rotate(st.rot * Math.PI / 180); g.scale(s, s);
    g.imageSmoothingQuality = 'high';
    g.drawImage(st.img, -st.iw / 2, -st.ih / 2, st.iw, st.ih);
    g.restore();
  }
  function paint() {
    raf = 0;
    drawTo(cx, cv.width, cv.height);
    cx.strokeStyle = 'rgba(255,138,31,.55)'; cx.lineWidth = 1; cx.beginPath();
    for (var i = 1; i < 3; i++) {
      cx.moveTo(cv.width * i / 3, 0); cx.lineTo(cv.width * i / 3, cv.height);
      cx.moveTo(0, cv.height * i / 3); cx.lineTo(cv.width, cv.height * i / 3);
    }
    cx.stroke();
  }
  function redraw() { if (!raf) raf = requestAnimationFrame(paint); }

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

  async function pick(files) {
    var f = files[0]; if (!f) return;
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)) { setStatus('Please choose an image (JPG, PNG or WebP). HEIC photos must be saved as JPG first.'); return; }
    try {
      var im = await loadImage(f);
      st.img = im.src; st.iw = im.w; st.ih = im.h; st.rot = 0; st.zoom = 1; st.ox = 0; st.oy = 0;
      $('phZoom').value = 1; setStatus('');
      $('phEditor').style.display = 'block';
      $('phName').innerHTML = '<b>' + esc(f.name) + '</b> &middot; ' + fmt(f.size) + ' &middot; ' + im.w + '&times;' + im.h + ' px';
      layout(); redraw();
      $('phResult').className = 'result empty'; $('phResult').textContent = 'Position your photo, then tap Resize & compress.';
    } catch (e) { setStatus('This photo could not be opened. Try a JPG or PNG.'); }
  }

  /* ----- drop / pick ----- */
  var drop = $('phDrop'), inp = $('phFile');
  inp.addEventListener('change', function () { if (inp.files && inp.files.length) pick(inp.files); inp.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) pick(e.dataTransfer.files); });

  /* ----- drag to position, wheel / slider to zoom ----- */
  var drag = null;
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    st.ox += (e.clientX - drag.x) / viewW; st.oy += (e.clientY - drag.y) / viewH;
    drag.x = e.clientX; drag.y = e.clientY; redraw();
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) { cv.addEventListener(ev, function () { drag = null; cv.style.cursor = 'grab'; }); });
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    st.zoom = Math.min(4, Math.max(0.5, st.zoom * (e.deltaY < 0 ? 1.06 : 0.94)));
    $('phZoom').value = st.zoom; redraw();
  }, { passive: false });
  $('phZoom').addEventListener('input', function () { st.zoom = parseFloat(this.value); redraw(); });
  $('phRot').onclick = function () { st.rot = (st.rot + 90) % 360; st.ox = st.oy = 0; if ($('phPreset').value === 'orig') layout(); redraw(); };
  $('phReset').onclick = function () { st.zoom = 1; st.ox = st.oy = 0; $('phZoom').value = 1; redraw(); };

  /* ----- options ----- */
  function syncOptions() {
    var p = $('phPreset').value;
    $('phCustom').style.display = p === 'custom' ? 'flex' : 'none';
    $('phTolWrap').style.display = $('phBg').value === 'white' ? 'block' : 'none';
    if (st.img) { layout(); redraw(); }
    else layout();
  }
  $('phPreset').addEventListener('change', syncOptions);
  $('phBg').addEventListener('change', syncOptions);
  ['phCW', 'phCH', 'phCU'].forEach(function (id) { $(id).addEventListener('input', function () { if (st.img) { layout(); redraw(); } }); });
  window.addEventListener('resize', function () { if (st.img) { layout(); redraw(); } });

  var chips = document.querySelectorAll('#phSizes button[data-kb]');
  function setKB(v, chip) {
    st.kb = v;
    Array.prototype.forEach.call(chips, function (b) { b.classList.toggle('on', b === chip); });
  }
  Array.prototype.forEach.call(chips, function (b) {
    b.addEventListener('click', function () { $('phKB').value = ''; setKB(parseFloat(b.getAttribute('data-kb')), b); });
  });
  $('phKB').addEventListener('input', function () {
    var v = parseFloat(this.value);
    if (v > 0) setKB(v, null); else setKB(50, chips[2]);
  });
  setKB(50, chips[2]);

  /* ----- run ----- */
  var busy = false;
  $('phRun').onclick = async function () {
    if (busy || !st.img) return;
    var d = outDims(); if (!d) { setStatus('Enter a valid width and height.'); return; }
    busy = true; $('phRun').disabled = true;
    $('phResult').className = 'result empty'; $('phResult').textContent = 'Working...';
    try {
      setStatus('Preparing photo...');
      var full = document.createElement('canvas'); full.width = d.w; full.height = d.h;
      drawTo(full.getContext('2d'), d.w, d.h);
      if ($('phBg').value === 'white') { setStatus('Cleaning background...'); await new Promise(function (r) { setTimeout(r, 0); }); whitenBg(full, parseFloat($('phTol').value)); }
      setStatus('Compressing to ' + (st.kb > 0 ? fmt(st.kb * 1024) : 'best quality') + '...');
      await new Promise(function (r) { setTimeout(r, 0); });
      var target = st.kb > 0 ? Math.round(st.kb * 1024) : 0;
      var res = await encodeTo(full, target, !d.fixed || $('phShrink').checked);
      showResult(res, target, d);
      setStatus('');
    } catch (e) {
      $('phResult').className = 'result empty'; $('phResult').textContent = 'Something went wrong: ' + (e && e.message ? e.message : e);
      setStatus('');
    }
    busy = false; $('phRun').disabled = false;
  };

  function showResult(res, target, d) {
    if (st.url) URL.revokeObjectURL(st.url);
    st.url = URL.createObjectURL(res.blob);
    var name = 'photo-' + (target ? Math.round(target / 1024) + 'kb' : 'resized') + '.jpg', file = null;
    try { file = new File([res.blob], name, { type: 'image/jpeg' }); } catch (e) {}
    var canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    var notes = [];
    if (res.over) notes.push('Could not get under ' + fmt(target) + ' at this pixel size. This is the smallest possible. Tick "make the photo smaller" or choose a bigger limit.');
    else if (target && (res.w !== d.w || res.h !== d.h)) notes.push('The photo was made smaller (' + res.w + '\u00D7' + res.h + ' px) to fit the limit.');
    var box = $('phResult');
    box.className = 'result';
    box.innerHTML = '<div class="phout"><img src="' + st.url + '" alt="Resized photo"></div>' +
      '<div class="stats"><div class="stat"><b>' + res.w + '\u00D7' + res.h + '</b><span>pixels</span></div>' +
      '<div class="stat"><b>' + fmt(res.blob.size) + '</b><span>file size</span></div>' +
      (target ? '<div class="stat"><b>' + fmt(target) + '</b><span>your limit</span></div>' : '') + '</div>' +
      (notes.length ? '<div class="note" style="margin-top:8px">' + notes.map(esc).join('<br>') + '</div>' : '') +
      '<div class="row" style="margin-top:12px"><button class="btn" id="phDl">Download JPG</button>' +
      (canShare ? '<button class="btn ghost" id="phSh">Share / Save</button>' : '') + '</div>';
    $('phDl').onclick = function () { var a = document.createElement('a'); a.href = st.url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
    if (canShare) $('phSh').onclick = function () { navigator.share({ files: [file], title: name }).catch(function () {}); };
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  syncOptions();
})();
