/* Calvo PDF tools: Image to PDF + Compress PDF
   Everything runs in the browser. Files are never uploaded. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  /* ---------- lazy library loading ---------- */
  var libs = {};
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error('Could not load the PDF engine. Check your internet connection and try again.')); };
      document.head.appendChild(s);
    });
  }
  function lib(name) {
    if (!libs[name]) {
      var src = name === 'pdflib' ? '/vendor/pdf-lib.min.js' : '/vendor/pdf.min.js';
      libs[name] = loadScript(src).then(function () {
        if (name === 'pdfjs') window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
      }).catch(function (e) { delete libs[name]; throw e; });
    }
    return libs[name];
  }

  /* ---------- helpers ---------- */
  function targetBytes(valId, unitId) {
    var v = parseFloat($(valId).value);
    if (!(v > 0)) return 0;
    return Math.round(v * ($(unitId).value === 'MB' ? 1048576 : 1024));
  }
  function toBlob(canvas, q) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) { b ? res(b) : rej(new Error('Image encoding failed. Try a smaller image.')); }, 'image/jpeg', q);
    });
  }
  function setStatus(id, msg) { var e = $(id); e.style.display = msg ? 'block' : 'none'; e.textContent = msg || ''; }
  function showError(boxId, msg) { var b = $(boxId); b.className = 'result empty'; b.textContent = msg; }

  var urls = {};
  function showResult(boxId, bytes, fileName, rows, notes) {
    var box = $(boxId);
    if (urls[boxId]) URL.revokeObjectURL(urls[boxId]);
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob); urls[boxId] = url;
    var file = null;
    try { file = new File([blob], fileName, { type: 'application/pdf' }); } catch (e) {}
    var canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    box.className = 'result';
    box.innerHTML =
      '<div class="stats">' + rows.map(function (r) { return '<div class="stat"><b>' + esc(r[1]) + '</b><span>' + esc(r[0]) + '</span></div>'; }).join('') + '</div>' +
      (notes && notes.length ? '<div class="note" style="margin-top:8px">' + notes.map(esc).join('<br>') + '</div>' : '') +
      '<div class="row" style="margin-top:12px"><button class="btn" id="' + boxId + 'Dl">Download PDF</button>' +
      (canShare ? '<button class="btn ghost" id="' + boxId + 'Sh">Share / Save</button>' : '') + '</div>';
    $(boxId + 'Dl').onclick = function () {
      var a = document.createElement('a'); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
    };
    if (canShare) $(boxId + 'Sh').onclick = function () {
      navigator.share({ files: [file], title: fileName }).catch(function () {});
    };
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function wireDrop(dropId, inputId, handler) {
    var d = $(dropId), inp = $(inputId);
    inp.addEventListener('change', function () { if (inp.files && inp.files.length) handler(inp.files); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.remove('over'); }); });
    d.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) handler(e.dataTransfer.files); });
  }

  /* ================= IMAGE TO PDF ================= */
  function initImage() {
    var items = [], busy = false, MAX = 50;
    var PRESETS = { high: [2200, 0.85], medium: [1600, 0.7], low: [1100, 0.5] };
    var LADDER = [[2200, 0.85], [1800, 0.75], [1500, 0.65], [1200, 0.55], [1000, 0.45], [800, 0.4], [650, 0.33], [500, 0.28]];
    var MARGINS = { none: 0, small: 18, medium: 36 };

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

    function render() {
      var list = $('imgList');
      list.innerHTML = items.map(function (it, i) {
        return '<div class="it"><img src="' + it.url + '" style="transform:rotate(' + it.rot + 'deg)" alt="">' +
          '<div class="meta"><b>' + (i + 1) + '. ' + esc(it.file.name) + '</b><span>' + fmt(it.file.size) + ' &middot; ' + it.w + '&times;' + it.h + '</span></div>' +
          '<div class="acts">' +
          '<button class="btn ghost" data-a="up" data-i="' + i + '" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
          '<button class="btn ghost" data-a="down" data-i="' + i + '" aria-label="Move down"' + (i === items.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
          '<button class="btn ghost" data-a="rot" data-i="' + i + '" aria-label="Rotate">&#8635;</button>' +
          '<button class="btn ghost" data-a="del" data-i="' + i + '" aria-label="Remove">&times;</button></div></div>';
      }).join('');
      $('imgCount').textContent = items.length ? items.length + ' image' + (items.length > 1 ? 's' : '') + ' added' : '';
      $('imgConvert').disabled = !items.length || busy;
      $('imgClear').style.display = items.length ? '' : 'none';
    }

    async function addFiles(files) {
      var arr = Array.prototype.slice.call(files), bad = 0, over = false;
      for (var k = 0; k < arr.length; k++) {
        var f = arr[k];
        if (items.length >= MAX) { over = true; break; }
        if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name)) { bad++; continue; }
        try {
          var im = await loadImage(f);
          items.push({ file: f, src: im.src, w: im.w, h: im.h, rot: 0, url: URL.createObjectURL(f) });
        } catch (e) { bad++; }
      }
      render();
      var msg = '';
      if (over) msg += 'Maximum ' + MAX + ' images at a time. ';
      if (bad) msg += bad + ' file' + (bad > 1 ? 's' : '') + ' skipped (not a supported image; HEIC photos may need to be saved as JPG first).';
      setStatus('imgStatus', msg);
    }

    $('imgList').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var i = +b.getAttribute('data-i'), a = b.getAttribute('data-a');
      if (a === 'up' && i > 0) { var t = items[i]; items[i] = items[i - 1]; items[i - 1] = t; }
      else if (a === 'down' && i < items.length - 1) { var t2 = items[i]; items[i] = items[i + 1]; items[i + 1] = t2; }
      else if (a === 'rot') items[i].rot = (items[i].rot + 90) % 360;
      else if (a === 'del') { URL.revokeObjectURL(items[i].url); items.splice(i, 1); }
      render();
    });
    $('imgClear').onclick = function () {
      items.forEach(function (it) { URL.revokeObjectURL(it.url); });
      items = []; render(); setStatus('imgStatus', '');
      $('imgResult').className = 'result empty'; $('imgResult').textContent = 'Add images and tap Convert to PDF.';
    };
    wireDrop('imgDrop', 'imgFiles', addFiles);

    function drawItem(it, maxSide) {
      var rot = ((it.rot % 360) + 360) % 360, sw = it.w, sh = it.h;
      var w = (rot === 90 || rot === 270) ? sh : sw, h = (rot === 90 || rot === 270) ? sw : sh;
      var sc = Math.min(1, maxSide / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * sc)), ch = Math.max(1, Math.round(h * sc));
      var c = document.createElement('canvas'); c.width = cw; c.height = ch;
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch);
      g.save(); g.translate(cw / 2, ch / 2); g.rotate(rot * Math.PI / 180);
      g.drawImage(it.src, -sw * sc / 2, -sh * sc / 2, sw * sc, sh * sc); g.restore();
      return c;
    }

    async function build(maxSide, quality, label) {
      var doc = await PDFLib.PDFDocument.create();
      doc.setProducer('Calvo Image to PDF'); doc.setCreator('calvoscientificcalculator.online');
      var size = $('imgSize').value, m = MARGINS[$('imgMargin').value] || 0;
      for (var i = 0; i < items.length; i++) {
        setStatus('imgStatus', (label ? label + ' ' : '') + 'Processing image ' + (i + 1) + ' of ' + items.length + '...');
        await tick();
        var c = drawItem(items[i], maxSide);
        var blob = await toBlob(c, quality);
        var bytes = new Uint8Array(await blob.arrayBuffer());
        c.width = c.height = 0;
        var img = await doc.embedJpg(bytes), iw = img.width, ih = img.height, pw, ph, dw, dh;
        if (size === 'fit') {
          var s = 842 / Math.max(iw, ih); dw = iw * s; dh = ih * s; pw = dw + 2 * m; ph = dh + 2 * m;
        } else {
          var base = size === 'letter' ? [612, 792] : [595.28, 841.89];
          pw = iw > ih ? base[1] : base[0]; ph = iw > ih ? base[0] : base[1];
          var k = Math.min((pw - 2 * m) / iw, (ph - 2 * m) / ih); dw = iw * k; dh = ih * k;
        }
        var page = doc.addPage([pw, ph]);
        page.drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
      }
      return await doc.save();
    }

    $('imgConvert').onclick = async function () {
      if (busy || !items.length) return;
      busy = true; render();
      $('imgResult').className = 'result empty'; $('imgResult').textContent = 'Working...';
      try {
        await lib('pdflib');
        var target = targetBytes('imgTarget', 'imgTargetUnit'), bytes, notes = [];
        if (target) {
          for (var s = 0; s < LADDER.length; s++) {
            bytes = await build(LADDER[s][0], LADDER[s][1], 'Step ' + (s + 1) + '/' + LADDER.length + '.');
            if (bytes.length <= target) break;
          }
          if (bytes.length > target) notes.push('Could not get under ' + fmt(target) + '. This is the smallest possible size at readable quality. Try fewer images or the Fit-to-image page size.');
        } else {
          var p = PRESETS[$('imgQuality').value] || PRESETS.medium;
          bytes = await build(p[0], p[1], '');
        }
        var total = items.reduce(function (a, it) { return a + it.file.size; }, 0);
        showResult('imgResult', bytes, 'calvo-images-' + items.length + 'p.pdf',
          [['pages', String(items.length)], ['original images', fmt(total)], ['PDF size', fmt(bytes.length)]], notes);
        setStatus('imgStatus', '');
      } catch (e) {
        showError('imgResult', 'Something went wrong: ' + (e && e.message ? e.message : e));
        setStatus('imgStatus', '');
      }
      busy = false; render();
    };
    render();
  }

  /* ================= COMPRESS PDF ================= */
  function initCompress() {
    var file = null, busy = false, MAXPAGES = 100;
    var LEVELS = { light: [130, 0.8], medium: [100, 0.65], strong: [72, 0.5] };
    var LADDER = [[130, 0.8], [110, 0.65], [90, 0.55], [72, 0.45], [60, 0.38], [50, 0.3]];

    function pick(files) {
      var f = files[0];
      if (!f) return;
      if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { setStatus('pdfStatus', 'Please choose a PDF file.'); return; }
      if (f.size > 60 * 1048576) { setStatus('pdfStatus', 'This file is larger than 60 MB. Please use a smaller PDF.'); return; }
      file = f; setStatus('pdfStatus', '');
      $('pdfName').innerHTML = '<b>' + esc(f.name) + '</b> &middot; ' + fmt(f.size);
      $('pdfRun').disabled = false;
      $('pdfResult').className = 'result empty'; $('pdfResult').textContent = 'Choose a level and tap Compress PDF.';
    }
    wireDrop('pdfDrop', 'pdfFile', pick);

    async function rebuild(pdf, dpi, q, label) {
      var doc = await PDFLib.PDFDocument.create();
      doc.setProducer('Calvo Compress PDF'); doc.setCreator('calvoscientificcalculator.online');
      for (var p = 1; p <= pdf.numPages; p++) {
        setStatus('pdfStatus', (label ? label + ' ' : '') + 'Compressing page ' + p + ' of ' + pdf.numPages + '...');
        await tick();
        var page = await pdf.getPage(p);
        var v1 = page.getViewport({ scale: 1 }), scale = dpi / 72, v = page.getViewport({ scale: scale });
        var big = Math.max(v.width, v.height);
        if (big > 4000) { scale *= 4000 / big; v = page.getViewport({ scale: scale }); }
        var c = document.createElement('canvas'); c.width = Math.ceil(v.width); c.height = Math.ceil(v.height);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, viewport: v }).promise;
        var blob = await toBlob(c, q);
        var img = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        var pg = doc.addPage([v1.width, v1.height]);
        pg.drawImage(img, { x: 0, y: 0, width: v1.width, height: v1.height });
        page.cleanup(); c.width = c.height = 0;
      }
      return await doc.save();
    }

    $('pdfRun').onclick = async function () {
      if (busy || !file) return;
      busy = true; $('pdfRun').disabled = true;
      $('pdfResult').className = 'result empty'; $('pdfResult').textContent = 'Working...';
      try {
        await Promise.all([lib('pdflib'), lib('pdfjs')]);
        var buf = await file.arrayBuffer();
        var pdf;
        try { pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise; }
        catch (e) {
          if (e && e.name === 'PasswordException') throw new Error('This PDF is password protected. Remove the password first, then try again.');
          throw new Error('This file could not be read as a PDF.');
        }
        if (pdf.numPages > MAXPAGES) throw new Error('This PDF has ' + pdf.numPages + ' pages. The limit is ' + MAXPAGES + ' pages so your browser does not run out of memory.');
        var target = targetBytes('pdfTarget', 'pdfTargetUnit'), bytes, notes = [];
        if (target) {
          for (var s = 0; s < LADDER.length; s++) {
            bytes = await rebuild(pdf, LADDER[s][0], LADDER[s][1], 'Step ' + (s + 1) + '/' + LADDER.length + '.');
            if (bytes.length <= target) break;
          }
          if (bytes.length > target) notes.push('Could not get under ' + fmt(target) + ' without making the pages unreadable. This is the smallest result at usable quality.');
        } else {
          var L = LEVELS[$('pdfLevel').value] || LEVELS.medium;
          bytes = await rebuild(pdf, L[0], L[1], '');
        }
        var saved = file.size - bytes.length;
        if (saved <= 0) notes.push('The new file is not smaller than the original. This PDF is already well optimised (or mostly text). Try the Strong level, or keep the original.');
        else notes.push('Pages are saved as images, so text in the new PDF cannot be selected or copied. Keep your original for editing.');
        showResult('pdfResult', bytes, file.name.replace(/\.pdf$/i, '') + '-compressed.pdf',
          [['original', fmt(file.size)], ['compressed', fmt(bytes.length)], [saved > 0 ? 'saved' : 'change', saved > 0 ? Math.round(saved / file.size * 100) + '%' : '+' + Math.round(-saved / file.size * 100) + '%']], notes);
        setStatus('pdfStatus', '');
        pdf.destroy();
      } catch (e) {
        showError('pdfResult', e && e.message ? e.message : 'Something went wrong. Please try again.');
        setStatus('pdfStatus', '');
      }
      busy = false; $('pdfRun').disabled = false;
    };
  }

  if ($('imgDrop')) initImage();
  if ($('pdfDrop')) initCompress();
})();
