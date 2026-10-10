/* Calvo Assignment Title Page Generator: pick a design, fill in your details, download a PDF
   (or put the title page in front of your own PDF). Everything runs in the browser. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(2) + ' MB'; }

  /*TP_CORE_START*/
  var DARK = '#1a1a1a';
  function fam(d) { return d.font === 'sans' ? 'Arial, Helvetica, "Liberation Sans", sans-serif' : '"Times New Roman", Times, "Liberation Serif", Georgia, serif'; }
  function setFont(g, d, size, weight, italic) { g.font = (italic ? 'italic ' : '') + (weight || 'normal') + ' ' + size + 'px ' + fam(d); }
  function hexRgb(h) { h = (h || '#000000').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hexA(h, a) { var c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function onAccent(h) { var c = hexRgb(h), l = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; return l > 0.68 ? '#1a1a1a' : '#ffffff'; }
  function wrapText(g, text, maxW) {
    var out = [];
    String(text).split('\n').forEach(function (par) {
      var words = par.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (g.measureText(t).width <= maxW) { line = t; return; }
        if (line) out.push(line);
        while (g.measureText(w).width > maxW && w.length > 1) { var k = w.length; while (k > 1 && g.measureText(w.slice(0, k)).width > maxW) k--; out.push(w.slice(0, k)); w = w.slice(k); }
        line = w;
      });
      out.push(line);
    });
    return out;
  }
  /* draws wrapped text; returns the y of the bottom edge */
  function block(g, d, text, x, y, o) {
    text = o.upper ? String(text).toUpperCase() : String(text);
    var size = o.size, lines;
    for (;;) {
      setFont(g, d, size, o.weight, o.italic); lines = wrapText(g, text, o.maxW);
      if (!o.maxLines || lines.length <= o.maxLines || size <= (o.minSize || 10)) break;
      size -= 1;
    }
    if (o.maxLines && lines.length > o.maxLines) {
      lines = lines.slice(0, o.maxLines); var last = lines[o.maxLines - 1];
      while (last.length > 1 && g.measureText(last + '\u2026').width > o.maxW) last = last.slice(0, -1);
      lines[o.maxLines - 1] = last.replace(/\s+$/, '') + '\u2026';
    }
    g.fillStyle = o.color || DARK; g.textBaseline = 'top'; g.textAlign = o.align || 'left';
    var lh = size * (o.lh || 1.25);
    lines.forEach(function (ln, i) { g.fillText(ln, x, y + i * lh); });
    return y + lines.length * lh;
  }
  function logoBox(g, img, x, y, maxW, maxH, align) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.min(maxW / iw, maxH / ih), w = iw * s, h = ih * s;
    var lx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    g.drawImage(img, lx, y, w, h); return y + h;
  }
  function hline(g, x1, x2, y, color, w) { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke(); }
  function courseText(d) { var c = (d.course || '').trim(), k = (d.code || '').trim(); return c && k ? c + ' (' + k + ')' : (c || k); }
  function rowsOf(d) {
    var r = [];
    function add(l, v) { if (v && String(v).trim()) r.push([l, String(v).trim()]); }
    add('Submitted by', d.name); add('Roll No.', d.roll); add('Class / Program', d.program);
    add('Course', courseText(d)); add('Submitted to', d.teacher); add('Date', d.date);
    return r;
  }
  function sample(d, k, fallback) { return (d[k] && String(d[k]).trim()) ? d[k] : (d.preview ? fallback : ''); }

  function tplClassic(g, d, logo) {
    var A = d.accent, W = 595, H = 842;
    g.strokeStyle = A; g.lineWidth = 3; g.strokeRect(28, 28, W - 56, H - 56); g.lineWidth = 1; g.strokeRect(36, 36, W - 72, H - 72);
    var y = 64;
    if (logo) y = logoBox(g, logo, W / 2, y, 150, 84, 'center') + 14;
    y = block(g, d, sample(d, 'inst', 'Institution name'), W / 2, y, { size: 24, weight: 'bold', color: A, align: 'center', maxW: 440, upper: true, maxLines: 3, minSize: 14 });
    if (d.dept) y = block(g, d, d.dept, W / 2, y + 4, { size: 15, color: '#333', align: 'center', maxW: 440, maxLines: 2 });
    y += 16; hline(g, W / 2 - 65, W / 2 + 65, y, A, 1.6); y += 26;
    y = block(g, d, sample(d, 'docType', 'Assignment'), W / 2, y, { size: 16, weight: 'bold', color: '#555', align: 'center', maxW: 440, upper: true });
    y += 26;
    y = block(g, d, sample(d, 'title', 'Title of your assignment'), W / 2, y, { size: 32, weight: 'bold', color: DARK, align: 'center', maxW: 450, maxLines: 4, minSize: 18, lh: 1.22 });
    y += 12; hline(g, W / 2 - 35, W / 2 + 35, y, A, 3); y += 20;
    var c = courseText(d); if (c) block(g, d, c, W / 2, y, { size: 15, color: '#333', align: 'center', maxW: 440, maxLines: 2 });
    var by = [d.name, d.roll ? 'Roll No: ' + d.roll : '', d.program].filter(function (s) { return s && String(s).trim(); });
    var to = d.teacher && d.teacher.trim() ? [d.teacher.trim()] : [];
    var top = 590, cols = [];
    if (to.length) cols.push(['SUBMITTED TO', to]); if (by.length) cols.push(['SUBMITTED BY', by]);
    cols.forEach(function (col, i) {
      var cw = 215, cx = cols.length === 1 ? W / 2 - cw / 2 : (i === 0 ? 62 : W - 62 - cw);
      hline(g, cx, cx + cw, top, A, 1.4);
      var yy = block(g, d, col[0], cx, top + 8, { size: 11, weight: 'bold', color: A, maxW: cw });
      col[1].forEach(function (t, j) { yy = block(g, d, t, cx, yy + 4, { size: j === 0 ? 17 : 14, weight: j === 0 ? 'bold' : 'normal', color: DARK, maxW: cw, maxLines: 2, minSize: 11 }); });
    });
    if (d.date) block(g, d, d.date, W / 2, 764, { size: 14, color: '#333', align: 'center', maxW: 440 });
  }

  function tplModern(g, d, logo) {
    var A = d.accent, W = 595, H = 842, fg = onAccent(A);
    g.fillStyle = A; g.fillRect(0, 0, W, 240);
    var tx = 48, tw = logo ? 330 : 500;
    if (logo) { g.fillStyle = '#fff'; g.fillRect(W - 48 - 110, 48, 110, 110); logoBox(g, logo, W - 48 - 55 - 45, 58, 90, 90, 'left'); }
    var y = block(g, d, sample(d, 'inst', 'Institution name'), tx, 56, { size: 26, weight: 'bold', color: fg, maxW: tw, upper: true, maxLines: 3, minSize: 15, lh: 1.2 });
    if (d.dept) block(g, d, d.dept, tx, y + 8, { size: 14, color: fg, maxW: tw, maxLines: 2 });
    y = block(g, d, sample(d, 'docType', 'Assignment'), 48, 290, { size: 14, weight: 'bold', color: A, maxW: 500, upper: true });
    y = block(g, d, sample(d, 'title', 'Title of your assignment'), 48, y + 12, { size: 36, weight: 'bold', color: DARK, maxW: 500, maxLines: 4, minSize: 20, lh: 1.15 });
    g.fillStyle = A; g.fillRect(48, y + 14, 64, 5); y += 40;
    var c = courseText(d), cb = y; if (c) cb = block(g, d, c, 48, y, { size: 17, color: '#555', maxW: 500, maxLines: 2 });
    var rows = rowsOf(d).filter(function (r) { return r[0] !== 'Course'; }), yy = Math.max(540, cb + 30);
    rows.forEach(function (r, i) {
      var col = i % 2, row = Math.floor(i / 2), x = col ? 320 : 48, y0 = yy + row * 76;
      g.fillStyle = hexA(A, 0.08); g.fillRect(x - 12, y0 - 8, 252, 66);
      g.fillStyle = A; g.fillRect(x - 12, y0 - 8, 4, 66);
      block(g, d, r[0], x, y0, { size: 10.5, weight: 'bold', color: A, maxW: 220, upper: true });
      block(g, d, r[1], x, y0 + 17, { size: 15, weight: 'bold', color: DARK, maxW: 225, maxLines: 2, minSize: 11, lh: 1.15 });
    });
    g.fillStyle = A; g.fillRect(0, H - 22, W, 22);
  }

  function tplMinimal(g, d, logo) {
    var A = d.accent, W = 595, x = 64, mw = W - 128, y = 64;
    if (logo) y = logoBox(g, logo, x, y, 130, 60, 'left') + 12;
    y = block(g, d, sample(d, 'inst', 'Institution name'), x, y, { size: 17, weight: 'bold', color: DARK, maxW: mw, upper: true, maxLines: 2, minSize: 12 });
    if (d.dept) y = block(g, d, d.dept, x, y + 3, { size: 13, color: '#666', maxW: mw, maxLines: 2 });
    y += 16; hline(g, x, W - x, y, '#cfcfcf', 1);
    var ty = Math.max(y + 100, 230);
    block(g, d, sample(d, 'docType', 'Assignment'), x, ty, { size: 12, weight: 'bold', color: A, maxW: mw, upper: true });
    var yy = block(g, d, sample(d, 'title', 'Title of your assignment'), x, ty + 20, { size: 34, color: DARK, maxW: mw, maxLines: 4, minSize: 20, lh: 1.18 });
    hline(g, x, x + 56, yy + 16, A, 3);
    var c = courseText(d); if (c) block(g, d, c, x, yy + 34, { size: 15, color: '#666', maxW: mw, maxLines: 2 });
    var rows = rowsOf(d).filter(function (r) { return r[0] !== 'Course'; }), ry = 520;
    rows.forEach(function (r) {
      block(g, d, r[0], x, ry + 2, { size: 11, color: '#888', maxW: 130, upper: true });
      var b = block(g, d, r[1], x + 150, ry, { size: 15, weight: 'bold', color: DARK, maxW: mw - 150, maxLines: 2, minSize: 11, lh: 1.15 });
      ry = Math.max(b, ry + 20) + 16;
    });
  }

  function tplFormal(g, d, logo) {
    var A = d.accent, W = 595, H = 842;
    g.strokeStyle = A; g.lineWidth = 5; g.strokeRect(30, 30, W - 60, H - 60); g.lineWidth = 1; g.strokeRect(42, 42, W - 84, H - 84);
    var y = 66;
    if (logo) y = logoBox(g, logo, W / 2, y, 140, 80, 'center') + 12;
    y = block(g, d, sample(d, 'inst', 'Institution name'), W / 2, y, { size: 23, weight: 'bold', color: DARK, align: 'center', maxW: 430, upper: true, maxLines: 3, minSize: 14 });
    if (d.dept) y = block(g, d, d.dept, W / 2, y + 4, { size: 14, color: '#444', align: 'center', maxW: 430, maxLines: 2 });
    y += 22;
    var label = String(sample(d, 'docType', 'Assignment')).toUpperCase(); setFont(g, d, 15, 'bold');
    var bw = Math.min(380, g.measureText(label).width + 56);
    g.fillStyle = A; g.fillRect(W / 2 - bw / 2, y, bw, 34);
    g.fillStyle = onAccent(A); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, W / 2, y + 18);
    y += 34 + 36;
    y = block(g, d, sample(d, 'title', 'Title of your assignment'), W / 2, y, { size: 30, weight: 'bold', color: DARK, align: 'center', maxW: 420, maxLines: 4, minSize: 18, lh: 1.2 });
    var rows = rowsOf(d), tx = 72, tw = W - 144, ty = Math.max(y + 50, 470), lw = 150;
    rows.forEach(function (r) {
      setFont(g, d, 14, 'bold'); var lines = wrapText(g, r[1], tw - lw - 20), rh = Math.max(34, lines.length * 18 + 16);
      if (lines.length > 3) rh = 34 + 36;
      g.fillStyle = hexA(A, 0.1); g.fillRect(tx, ty, lw, rh);
      g.strokeStyle = A; g.lineWidth = 1.2; g.strokeRect(tx, ty, lw, rh); g.strokeRect(tx + lw, ty, tw - lw, rh);
      block(g, d, r[0], tx + 10, ty + (rh - 15) / 2, { size: 12, weight: 'bold', color: A, maxW: lw - 16 });
      block(g, d, r[1], tx + lw + 10, ty + (rh - Math.min(lines.length, 3) * 17.5) / 2, { size: 14, weight: 'bold', color: DARK, maxW: tw - lw - 20, maxLines: 3, minSize: 10, lh: 1.25 });
      ty += rh;
    });
  }
  var TPLS = { classic: tplClassic, modern: tplModern, minimal: tplMinimal, formal: tplFormal };
  function drawTitlePage(canvas, d, logo) {
    var k = canvas.width / 595, g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.setTransform(k, 0, 0, k, 0, 0); g.textBaseline = 'top'; g.textAlign = 'left';
    (TPLS[d.tpl] || tplClassic)(g, d, logo);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  /*TP_CORE_END*/

  if (!$('tpApp')) return;

  /* ---------- state + persistence ---------- */
  var FIELDS = ['inst', 'dept', 'docType', 'title', 'course', 'code', 'teacher', 'name', 'roll', 'program', 'date'];
  var st = { tpl: 'classic', accent: '#1f3a5f', font: 'serif', logoData: '' }, logo = null, KEY = 'calvo_titlepage_v1';
  function fmtDate(v) {
    if (!v) return '';
    var p = v.split('-'); if (p.length !== 3) return v;
    var dt = new Date(+p[0], +p[1] - 1, +p[2]);
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function data() {
    var d = { tpl: st.tpl, accent: st.accent, font: st.font };
    FIELDS.forEach(function (f) { d[f] = f === 'date' ? fmtDate($('tpDate').value) : $('tp' + f.charAt(0).toUpperCase() + f.slice(1)).value; });
    return d;
  }
  function save() {
    try {
      var o = { tpl: st.tpl, accent: st.accent, font: st.font, logoData: st.logoData, f: {} };
      FIELDS.forEach(function (f) { if (f !== 'date') o.f[f] = $('tp' + f.charAt(0).toUpperCase() + f.slice(1)).value; });
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!o) return;
      st.tpl = o.tpl || st.tpl; st.accent = o.accent || st.accent; st.font = o.font || st.font; st.logoData = o.logoData || '';
      Object.keys(o.f || {}).forEach(function (f) { var el = $('tp' + f.charAt(0).toUpperCase() + f.slice(1)); if (el) el.value = o.f[f]; });
      if (st.logoData) setLogo(st.logoData, true);
    } catch (e) {}
  }

  /* ---------- preview ---------- */
  var cv = $('tpCanvas'), raf = 0;
  cv.width = 892; cv.height = Math.round(892 * 842 / 595);
  function paint() { raf = 0; var d = data(); d.preview = true; drawTitlePage(cv, d, logo); }
  function redraw() { if (!raf) raf = requestAnimationFrame(paint); save(); }

  function syncUI() {
    Array.prototype.forEach.call(document.querySelectorAll('.tp-tpl'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === st.tpl); });
    Array.prototype.forEach.call(document.querySelectorAll('.tp-sw'), function (b) { b.classList.toggle('on', b.getAttribute('data-c').toLowerCase() === st.accent.toLowerCase()); });
    $('tpColor').value = st.accent; $('tpFont').value = st.font; $('tpLogoClear').style.display = logo ? '' : 'none';
  }
  Array.prototype.forEach.call(document.querySelectorAll('.tp-tpl'), function (b) { b.addEventListener('click', function () { st.tpl = b.getAttribute('data-t'); syncUI(); redraw(); }); });
  Array.prototype.forEach.call(document.querySelectorAll('.tp-sw'), function (b) { b.addEventListener('click', function () { st.accent = b.getAttribute('data-c'); syncUI(); redraw(); }); });
  $('tpColor').addEventListener('input', function () { st.accent = this.value; syncUI(); redraw(); });
  $('tpFont').addEventListener('change', function () { st.font = this.value; redraw(); });
  FIELDS.forEach(function (f) { $('tp' + f.charAt(0).toUpperCase() + f.slice(1)).addEventListener('input', redraw); });

  /* ---------- logo ---------- */
  function setLogo(url, quiet) {
    var im = new Image();
    im.onload = function () { logo = im; st.logoData = url; syncUI(); if (!quiet) redraw(); else paint(); };
    im.onerror = function () { logo = null; st.logoData = ''; syncUI(); };
    im.src = url;
  }
  $('tpLogo').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = ''; if (!f) return;
    var u = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      var s = Math.min(1, 300 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); setLogo(c.toDataURL('image/png'));
    };
    im.onerror = function () { URL.revokeObjectURL(u); setStatus('That image could not be opened. Try a PNG or JPG.'); };
    im.src = u;
  });
  $('tpLogoClear').onclick = function () { logo = null; st.logoData = ''; syncUI(); redraw(); };

  /* ---------- PDF ---------- */
  var libP = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('x')); }; document.head.appendChild(s); }); }
  function lib() {
    if (!libP) {
      var p = Promise.reject();
      ['vendor/', ''].forEach(function (b) { p = p.catch(function () { return loadScript(b + 'pdf-lib.min.js'); }); });
      libP = p.catch(function () { libP = null; throw new Error('PDF engine file not found (pdf-lib.min.js). Upload the vendor folder next to this page.'); });
    }
    return libP;
  }
  function setStatus(msg) { var e = $('tpStatus'); e.style.display = msg ? 'block' : 'none'; e.textContent = msg || ''; }
  function toBlob(c, type, q) { return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error('Could not create the image.')); }, type, q); }); }
  function fileBase() { var t = ($('tpTitle').value || 'assignment').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 40) || 'assignment'; return t; }
  var url = null;
  function download(u, name) { var a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  async function renderHi() {
    var c = document.createElement('canvas'); c.width = 2083; c.height = Math.round(2083 * 842 / 595);
    drawTitlePage(c, data(), logo); return c;
  }
  var busy = false;
  async function run(kind) {
    if (busy) return; busy = true; ['tpPdf', 'tpJpg'].forEach(function (i) { $(i).disabled = true; });
    var box = $('tpResult'); box.className = 'result empty'; box.textContent = 'Creating...';
    try {
      setStatus('Creating your title page...'); await new Promise(function (r) { setTimeout(r, 0); });
      var hi = await renderHi(), jpg = await toBlob(hi, 'image/jpeg', 0.92), name, blob, rows;
      if (kind === 'jpg') { name = fileBase() + '-title-page.jpg'; blob = jpg; rows = [['format', 'JPG'], ['size', fmt(jpg.size)]]; }
      else {
        await lib();
        var bytes = new Uint8Array(await jpg.arrayBuffer()), W = 595.28, H = 841.89, out, merged = false, f = $('tpMerge').files && $('tpMerge').files[0];
        if (f) {
          try { out = await PDFLib.PDFDocument.load(new Uint8Array(await f.arrayBuffer())); merged = true; }
          catch (e) { throw new Error((e && (e.name === 'EncryptedPDFError' || /encrypt/i.test(e.message || ''))) ? 'Your PDF is password protected. Remove the password first.' : 'Your PDF could not be read. Choose a different file or clear it.'); }
        } else out = await PDFLib.PDFDocument.create();
        var img = await out.embedJpg(bytes), page = merged ? out.insertPage(0, [W, H]) : out.addPage([W, H]);
        page.drawImage(img, { x: 0, y: 0, width: W, height: H });
        if (!merged) { out.setTitle($('tpTitle').value || 'Title page'); out.setProducer('Calvo Title Page Generator'); }
        var pdf = await out.save(); blob = new Blob([pdf], { type: 'application/pdf' });
        name = fileBase() + (merged ? '-with-title-page.pdf' : '-title-page.pdf');
        rows = [['pages', String(out.getPageCount())], ['size', fmt(pdf.length)]];
      }
      if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      var file = null; try { file = new File([blob], name, { type: blob.type }); } catch (e) {}
      var canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      box.className = 'result';
      box.innerHTML = '<div class="stats">' + rows.map(function (r) { return '<div class="stat"><b>' + esc(r[1]) + '</b><span>' + esc(r[0]) + '</span></div>'; }).join('') + '</div>' +
        '<div class="row" style="margin-top:12px"><button class="btn" id="tpDl" type="button">Download ' + (kind === 'jpg' ? 'JPG' : 'PDF') + '</button>' + (canShare ? '<button class="btn ghost" id="tpSh" type="button">Share / Save</button>' : '') + '</div>';
      $('tpDl').onclick = function () { download(url, name); };
      if (canShare) $('tpSh').onclick = function () { navigator.share({ files: [file], title: name }).catch(function () {}); };
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setStatus('');
    } catch (e) { box.className = 'result empty'; box.textContent = e && e.message ? e.message : 'Something went wrong.'; setStatus(''); }
    busy = false; ['tpPdf', 'tpJpg'].forEach(function (i) { $(i).disabled = false; });
  }
  $('tpPdf').onclick = function () { run('pdf'); }; $('tpJpg').onclick = function () { run('jpg'); };
  $('tpMerge').addEventListener('change', function () { var f = this.files && this.files[0]; $('tpMergeName').textContent = f ? f.name : 'No PDF chosen'; $('tpMergeClear').style.display = f ? '' : 'none'; });
  $('tpMergeClear').onclick = function () { $('tpMerge').value = ''; $('tpMergeName').textContent = 'No PDF chosen'; this.style.display = 'none'; };
  $('tpReset').onclick = function () {
    FIELDS.forEach(function (f) { if (f !== 'date') $('tp' + f.charAt(0).toUpperCase() + f.slice(1)).value = f === 'docType' ? 'Assignment' : ''; });
    logo = null; st.logoData = ''; syncUI(); redraw();
  };

  /* defaults */
  var now = new Date(); $('tpDate').value = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
  load(); syncUI(); paint();
})();
