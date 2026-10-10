/* Calvo Merge / Split PDF: join PDFs, extract or remove pages, split into several files.
   Everything runs in the browser. Files are never uploaded. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(2) + ' MB'; }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  /*PO_CORE_START*/
  /* "1-3, 5, 8-10", "odd", "even", "last", "all". Returns {pages:[1-based, in typed order]} or {error}. */
  function parseRanges(text, n) {
    text = (text || '').trim().toLowerCase();
    if (!text) return { pages: [], error: 'Enter the pages you want, for example 1-3, 5, 8-10.' };
    var out = [], parts = text.split(/[\s,;]+/).filter(Boolean), i, a, b;
    for (var k = 0; k < parts.length; k++) {
      var part = parts[k];
      if (part === 'all') { for (i = 1; i <= n; i++) out.push(i); continue; }
      if (part === 'odd') { for (i = 1; i <= n; i += 2) out.push(i); continue; }
      if (part === 'even') { for (i = 2; i <= n; i += 2) out.push(i); continue; }
      var m = /^(\d+|last)(?:-(\d+|last))?$/.exec(part);
      if (!m) return { pages: [], error: 'Could not understand "' + part + '". Use numbers and dashes, like 1-3, 5.' };
      a = m[1] === 'last' ? n : +m[1]; b = m[2] === undefined ? a : (m[2] === 'last' ? n : +m[2]);
      if (a < 1 || b < 1 || a > n || b > n) return { pages: [], error: 'Page ' + (a < 1 || a > n ? a : b) + ' is not in this PDF. It has ' + n + ' page' + (n > 1 ? 's' : '') + '.' };
      if (a <= b) for (i = a; i <= b; i++) out.push(i); else for (i = a; i >= b; i--) out.push(i);
    }
    return { pages: out };
  }
  /* [1,2,3,5,7,8] -> "1-3, 5, 7-8" */
  function compressRanges(list) {
    var s = list.slice().sort(function (x, y) { return x - y; }), out = [], i = 0;
    while (i < s.length) { var j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++; out.push(j > i ? s[i] + '-' + s[j] : String(s[i])); i = j + 1; }
    return out.join(', ');
  }
  /* kind: 'every' | 'chunk' | 'ranges'. Returns {groups:[[pages]...]} or {error}. */
  function groupPages(n, kind, k, rangesText) {
    var groups = [], i;
    if (kind === 'every') { for (i = 1; i <= n; i++) groups.push([i]); return { groups: groups }; }
    if (kind === 'chunk') {
      k = Math.floor(k);
      if (!(k >= 1)) return { error: 'Enter how many pages each file should have.' };
      for (i = 1; i <= n; i += k) { var g = []; for (var j = i; j < i + k && j <= n; j++) g.push(j); groups.push(g); }
      return { groups: groups };
    }
    var parts = (rangesText || '').split(/[,;]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!parts.length) return { error: 'Enter the page ranges, for example 1-3, 4-6, 7-10. Each range becomes its own file.' };
    for (i = 0; i < parts.length; i++) { var r = parseRanges(parts[i], n); if (r.error) return { error: r.error }; groups.push(r.pages); }
    return { groups: groups };
  }
  /* Minimal ZIP writer (no compression, which is fine for PDFs). */
  var CRC_T = null;
  function crc32(b) {
    if (!CRC_T) { CRC_T = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; } }
    var c2 = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c2 = CRC_T[(c2 ^ b[i]) & 255] ^ (c2 >>> 8);
    return (c2 ^ 0xFFFFFFFF) >>> 0;
  }
  function makeZip(files) {
    var enc = new TextEncoder(), chunks = [], central = [], offset = 0, now = new Date();
    var dt = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    var tm = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    files.forEach(function (f) {
      var name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      var lh = new Uint8Array(30 + name.length), dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true); dv.setUint16(8, 0, true);
      dv.setUint16(10, tm, true); dv.setUint16(12, dt, true); dv.setUint32(14, crc, true); dv.setUint32(18, size, true); dv.setUint32(22, size, true);
      dv.setUint16(26, name.length, true); dv.setUint16(28, 0, true); lh.set(name, 30);
      chunks.push(lh, f.data);
      var ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
      cv.setUint16(12, tm, true); cv.setUint16(14, dt, true); cv.setUint32(16, crc, true); cv.setUint32(20, size, true); cv.setUint32(24, size, true);
      cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); ch.set(name, 46);
      central.push(ch); offset += lh.length + size;
    });
    var cd = 0; central.forEach(function (c) { cd += c.length; });
    var end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cd, true); ev.setUint32(16, offset, true);
    return new Blob(chunks.concat(central, [end]), { type: 'application/zip' });
  }
  /*PO_CORE_END*/

  if (!$('poApp')) return;

  /* ---------- load libraries on demand (vendor/ first, then site root) ---------- */
  var libs = {};
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('x')); };
      document.head.appendChild(s);
    });
  }
  function lib(name) {
    if (!libs[name]) {
      var file = name === 'pdflib' ? 'pdf-lib.min.js' : 'pdf.min.js', p = Promise.reject(), base = '';
      ['vendor/', ''].forEach(function (b) { p = p.catch(function () { return loadScript(b + file).then(function () { base = b; }); }); });
      libs[name] = p.then(function () {
        if (name === 'pdfjs') window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
      }).catch(function () {
        delete libs[name];
        throw new Error('PDF engine file not found (' + file + '). Upload the vendor folder next to this page.');
      });
    }
    return libs[name];
  }
  function setStatus(id, msg) { var e = $(id); e.style.display = msg ? 'block' : 'none'; e.textContent = msg || ''; }
  function isPdf(f) { return /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name); }
  function baseName(n) { return n.replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document'; }
  function safeName(n, dflt) { return (n || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\.pdf$/i, '').trim() || dflt; }
  async function loadDoc(f) {
    var bytes = new Uint8Array(await f.arrayBuffer());
    try { return { bytes: bytes, doc: await PDFLib.PDFDocument.load(bytes) }; }
    catch (e) {
      if (e && (e.name === 'EncryptedPDFError' || /encrypt/i.test(e.message || ''))) throw new Error('is password protected. Remove the password first.');
      throw new Error('could not be read as a PDF.');
    }
  }

  var urls = [];
  function blobUrl(blob) { var u = URL.createObjectURL(blob); urls.push(u); if (urls.length > 60) URL.revokeObjectURL(urls.shift()); return u; }
  function download(url, name) { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function showError(boxId, msg) { var b = $(boxId); b.className = 'result empty'; b.textContent = msg; }
  function stat(label, val) { return '<div class="stat"><b>' + esc(val) + '</b><span>' + esc(label) + '</span></div>'; }
  function showSingle(boxId, bytes, fileName, rows, notes) {
    var blob = new Blob([bytes], { type: 'application/pdf' }), url = blobUrl(blob), file = null, box = $(boxId);
    try { file = new File([blob], fileName, { type: 'application/pdf' }); } catch (e) {}
    var canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    box.className = 'result';
    box.innerHTML = '<div class="stats">' + rows.map(function (r) { return stat(r[0], r[1]); }).join('') + '</div>' +
      (notes && notes.length ? '<div class="note" style="margin-top:8px">' + notes.map(esc).join('<br>') + '</div>' : '') +
      '<div class="row" style="margin-top:12px"><button class="btn" id="' + boxId + 'Dl" type="button">Download PDF</button>' +
      (canShare ? '<button class="btn ghost" id="' + boxId + 'Sh" type="button">Share / Save</button>' : '') + '</div>';
    $(boxId + 'Dl').onclick = function () { download(url, fileName); };
    if (canShare) $(boxId + 'Sh').onclick = function () { navigator.share({ files: [file], title: fileName }).catch(function () {}); };
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function wireDrop(dropId, inputId, handler) {
    var d = $(dropId), inp = $(inputId);
    inp.addEventListener('change', function () { if (inp.files && inp.files.length) handler(inp.files); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.remove('over'); }); });
    d.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) handler(e.dataTransfer.files); });
  }

  /* ---------- tabs ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.po-tabs button'), function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.po-tabs button'), function (x) { x.classList.toggle('on', x === b); });
      $('tabMg').hidden = b.getAttribute('data-tab') !== 'mg'; $('tabSp').hidden = b.getAttribute('data-tab') !== 'sp';
    });
  });

  /* ================= MERGE ================= */
  var files = [], nid = 1, mgBusy = false, MAXFILES = 30, MAXMB = 80;
  function renderFiles() {
    $('mgList').innerHTML = files.map(function (f, i) {
      return '<div class="it"><div class="meta"><b>' + (i + 1) + '. ' + esc(f.name) + '</b><span>' + f.pages + ' page' + (f.pages > 1 ? 's' : '') + ' &middot; ' + fmt(f.size) + '</span></div>' +
        '<input type="text" class="rg" data-id="' + f.id + '" placeholder="All pages" value="' + esc(f.range) + '" aria-label="Pages to use from ' + esc(f.name) + '">' +
        '<div class="acts"><button class="btn ghost" data-a="up" data-i="' + i + '" type="button" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
        '<button class="btn ghost" data-a="down" data-i="' + i + '" type="button" aria-label="Move down"' + (i === files.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
        '<button class="btn ghost" data-a="del" data-i="' + i + '" type="button" aria-label="Remove">&times;</button></div></div>';
    }).join('');
    var total = files.reduce(function (a, f) { return a + f.pages; }, 0);
    $('mgCount').textContent = files.length ? files.length + ' file' + (files.length > 1 ? 's' : '') + ', ' + total + ' pages in total' : '';
    $('mgRun').disabled = files.length < 2 || mgBusy; $('mgClear').style.display = files.length ? '' : 'none';
  }
  async function addPdfs(list) {
    var arr = Array.prototype.slice.call(list), msgs = [];
    setStatus('mgStatus', 'Reading files...');
    try { await lib('pdflib'); } catch (e) { setStatus('mgStatus', e.message); return; }
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i];
      if (files.length >= MAXFILES) { msgs.push('Maximum ' + MAXFILES + ' files.'); break; }
      if (!isPdf(f)) { msgs.push(f.name + ' is not a PDF.'); continue; }
      if (f.size > MAXMB * 1048576) { msgs.push(f.name + ' is larger than ' + MAXMB + ' MB.'); continue; }
      try {
        setStatus('mgStatus', 'Reading ' + f.name + '...'); await tick();
        var d = await loadDoc(f);
        files.push({ id: nid++, name: f.name, size: f.size, doc: d.doc, pages: d.doc.getPageCount(), range: '' });
      } catch (e) { msgs.push(f.name + ' ' + e.message); }
    }
    renderFiles(); setStatus('mgStatus', msgs.join(' '));
  }
  wireDrop('mgDrop', 'mgFiles', addPdfs);
  $('mgList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var i = +b.getAttribute('data-i'), a = b.getAttribute('data-a');
    if (a === 'up' && i > 0) { var t = files[i]; files[i] = files[i - 1]; files[i - 1] = t; }
    else if (a === 'down' && i < files.length - 1) { var t2 = files[i]; files[i] = files[i + 1]; files[i + 1] = t2; }
    else if (a === 'del') files.splice(i, 1);
    renderFiles();
  });
  $('mgList').addEventListener('input', function (e) {
    if (!e.target.classList.contains('rg')) return;
    var id = +e.target.getAttribute('data-id'); files.forEach(function (f) { if (f.id === id) f.range = e.target.value; });
  });
  $('mgClear').onclick = function () { files = []; renderFiles(); setStatus('mgStatus', ''); $('mgResult').className = 'result empty'; $('mgResult').textContent = 'Add two or more PDFs, then tap Merge.'; };
  $('mgRun').onclick = async function () {
    if (mgBusy || files.length < 2) return;
    mgBusy = true; renderFiles();
    $('mgResult').className = 'result empty'; $('mgResult').textContent = 'Merging...';
    try {
      await lib('pdflib');
      var out = await PDFLib.PDFDocument.create(), total = 0;
      out.setProducer('Calvo Merge PDF'); out.setCreator('calvoscientificcalculator.online');
      for (var i = 0; i < files.length; i++) {
        var f = files[i], idx;
        setStatus('mgStatus', 'Adding ' + f.name + ' (' + (i + 1) + ' of ' + files.length + ')...'); await tick();
        if (f.range.trim()) {
          var r = parseRanges(f.range, f.pages);
          if (r.error) throw new Error(f.name + ': ' + r.error);
          idx = r.pages.map(function (p) { return p - 1; });
        } else { idx = []; for (var k = 0; k < f.pages; k++) idx.push(k); }
        var copied = await out.copyPages(f.doc, idx);
        copied.forEach(function (pg) { out.addPage(pg); }); total += copied.length;
      }
      var bytes = await out.save();
      showSingle('mgResult', bytes, safeName($('mgName').value, 'merged') + '.pdf', [['files merged', String(files.length)], ['pages', String(total)], ['PDF size', fmt(bytes.length)]], []);
      setStatus('mgStatus', '');
    } catch (e) { showError('mgResult', e && e.message ? e.message : 'Something went wrong.'); setStatus('mgStatus', ''); }
    mgBusy = false; renderFiles();
  };
  renderFiles();

  /* ================= SPLIT / EXTRACT ================= */
  var sp = { file: null, name: '', doc: null, bytes: null, n: 0, sel: {}, token: 0 }, spBusy = false, MAXTILES = 300, MAXSPLIT = 200;
  function selList() { var a = []; for (var i = 1; i <= sp.n; i++) if (sp.sel[i]) a.push(i); return a; }
  function paintTiles() {
    Array.prototype.forEach.call($('spTiles').children, function (t) { t.classList.toggle('on', !!sp.sel[+t.getAttribute('data-p')]); });
  }
  function syncText() { $('spRange').value = compressRanges(selList()); paintTiles(); }
  function setSel(pages) { sp.sel = {}; pages.forEach(function (p) { sp.sel[p] = true; }); syncText(); }
  function updateMode() {
    var m = $('spMode').value, k = $('spKind').value;
    $('spSelect').hidden = m === 'split'; $('spSplit').hidden = m !== 'split';
    $('spNWrap').hidden = k !== 'chunk'; $('spRWrap').hidden = k !== 'ranges';
    $('spRangeLabel').textContent = m === 'remove' ? 'Pages to remove' : 'Pages to keep';
  }
  $('spMode').addEventListener('change', updateMode); $('spKind').addEventListener('change', updateMode);

  async function pickSplit(list) {
    var f = list[0]; if (!f) return;
    if (!isPdf(f)) { setStatus('spStatus', 'Please choose a PDF file.'); return; }
    if (f.size > MAXMB * 1048576) { setStatus('spStatus', 'This file is larger than ' + MAXMB + ' MB.'); return; }
    setStatus('spStatus', 'Reading ' + f.name + '...');
    try {
      await lib('pdflib');
      var d = await loadDoc(f);
      sp.file = f; sp.name = baseName(f.name); sp.doc = d.doc; sp.bytes = d.bytes; sp.n = d.doc.getPageCount(); sp.sel = {}; var token = ++sp.token;
      $('spBox').hidden = false; $('spName').innerHTML = '<b>' + esc(f.name) + '</b> &middot; ' + sp.n + ' page' + (sp.n > 1 ? 's' : '') + ' &middot; ' + fmt(f.size);
      $('spRange').value = ''; $('spOut').value = sp.name; setStatus('spStatus', '');
      $('spResult').className = 'result empty'; $('spResult').textContent = 'Choose what to do, then tap the button.';
      var html = '', shown = Math.min(sp.n, MAXTILES);
      for (var i = 1; i <= shown; i++) html += '<button type="button" class="pg" data-p="' + i + '" aria-label="Page ' + i + '"><span class="th"></span><i>' + i + '</i></button>';
      $('spTiles').innerHTML = html;
      $('spTileNote').textContent = sp.n > shown ? 'Showing the first ' + shown + ' pages. Use the box above for the others.' : 'Tap pages to select them, or type a range.';
      updateMode();
      renderThumbs(token);
    } catch (e) { setStatus('spStatus', f.name + ' ' + (e && e.message ? e.message : 'could not be opened.')); }
  }
  wireDrop('spDrop', 'spFile', pickSplit);

  async function renderThumbs(token) {
    try {
      await lib('pdfjs');
      var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(sp.bytes.slice(0)) }).promise, shown = Math.min(sp.n, MAXTILES);
      for (var p = 1; p <= shown; p++) {
        if (token !== sp.token) { pdf.destroy(); return; }
        var page = await pdf.getPage(p), v1 = page.getViewport({ scale: 1 }), sc = 110 / Math.max(v1.width, v1.height) * 1.5, v = page.getViewport({ scale: sc });
        var c = document.createElement('canvas'); c.width = Math.ceil(v.width); c.height = Math.ceil(v.height);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, viewport: v }).promise;
        var tile = $('spTiles').children[p - 1];
        if (tile && token === sp.token) { var th = tile.querySelector('.th'); th.innerHTML = ''; th.appendChild(c); }
        page.cleanup(); await tick();
      }
      pdf.destroy();
    } catch (e) { /* thumbnails are optional: page numbers still work */ }
  }

  $('spTiles').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var p = +b.getAttribute('data-p'); sp.sel[p] = !sp.sel[p]; if (!sp.sel[p]) delete sp.sel[p]; syncText();
  });
  $('spRange').addEventListener('input', function () {
    var r = parseRanges(this.value, sp.n);
    if (!r.error) { sp.sel = {}; r.pages.forEach(function (p) { sp.sel[p] = true; }); paintTiles(); }
    else if (!this.value.trim()) { sp.sel = {}; paintTiles(); }
  });
  $('spAll').onclick = function () { var a = []; for (var i = 1; i <= sp.n; i++) a.push(i); setSel(a); };
  $('spNone').onclick = function () { setSel([]); };
  $('spOdd').onclick = function () { var a = []; for (var i = 1; i <= sp.n; i += 2) a.push(i); setSel(a); };
  $('spEven').onclick = function () { var a = []; for (var i = 2; i <= sp.n; i += 2) a.push(i); setSel(a); };

  async function makeDoc(pages1) {
    var d = await PDFLib.PDFDocument.create(); d.setProducer('Calvo Split PDF'); d.setCreator('calvoscientificcalculator.online');
    var copied = await d.copyPages(sp.doc, pages1.map(function (p) { return p - 1; }));
    copied.forEach(function (pg) { d.addPage(pg); });
    return await d.save();
  }
  $('spRun').onclick = async function () {
    if (spBusy || !sp.doc) return;
    var mode = $('spMode').value, out = safeName($('spOut').value, sp.name);
    spBusy = true; $('spRun').disabled = true;
    $('spResult').className = 'result empty'; $('spResult').textContent = 'Working...';
    try {
      await lib('pdflib');
      if (mode === 'split') {
        var gr = groupPages(sp.n, $('spKind').value, parseFloat($('spN').value), $('spRanges').value);
        if (gr.error) throw new Error(gr.error);
        if (gr.groups.length > MAXSPLIT) throw new Error('That would make ' + gr.groups.length + ' files. The limit is ' + MAXSPLIT + '. Use bigger groups.');
        var res = [];
        for (var i = 0; i < gr.groups.length; i++) {
          setStatus('spRunStatus', 'Creating file ' + (i + 1) + ' of ' + gr.groups.length + '...'); await tick();
          res.push({ name: out + '_part' + (i + 1) + '.pdf', data: await makeDoc(gr.groups[i]), pages: gr.groups[i] });
        }
        showSplit(res, out); setStatus('spRunStatus', '');
      } else {
        var text = $('spRange').value, r = parseRanges(text, sp.n);
        if (r.error) throw new Error(r.error);
        var pages = r.pages;
        if (mode === 'remove') {
          var gone = {}; pages.forEach(function (p) { gone[p] = true; }); pages = [];
          for (var q = 1; q <= sp.n; q++) if (!gone[q]) pages.push(q);
          if (!pages.length) throw new Error('You cannot remove every page. Leave at least one.');
        }
        setStatus('spRunStatus', 'Creating PDF...'); await tick();
        var bytes = await makeDoc(pages);
        showSingle('spResult', bytes, out + (mode === 'remove' ? '-edited' : '-extract') + '.pdf',
          [['pages in new PDF', String(pages.length)], [mode === 'remove' ? 'pages removed' : 'of original', mode === 'remove' ? String(sp.n - pages.length) : String(sp.n)], ['PDF size', fmt(bytes.length)]], []);
        setStatus('spRunStatus', '');
      }
    } catch (e) { showError('spResult', e && e.message ? e.message : 'Something went wrong.'); setStatus('spRunStatus', ''); }
    spBusy = false; $('spRun').disabled = false;
  };
  function showSplit(res, out) {
    var box = $('spResult'), total = res.reduce(function (a, r) { return a + r.data.length; }, 0);
    var items = res.map(function (r, i) {
      r.url = blobUrl(new Blob([r.data], { type: 'application/pdf' }));
      return '<div class="it"><div class="meta"><b>' + esc(r.name) + '</b><span>pages ' + esc(compressRanges(r.pages)) + ' &middot; ' + fmt(r.data.length) + '</span></div>' +
        '<div class="acts"><button class="btn ghost" data-dl="' + i + '" type="button">Download</button></div></div>';
    }).join('');
    box.className = 'result';
    box.innerHTML = '<div class="stats">' + stat('files', String(res.length)) + stat('total size', fmt(total)) + '</div>' +
      '<div class="row" style="margin-top:12px"><button class="btn" id="spZip" type="button">Download all (ZIP)</button></div>' +
      '<div class="sp-files">' + items + '</div>';
    $('spZip').onclick = function () { download(blobUrl(makeZip(res.map(function (r) { return { name: r.name, data: r.data }; }))), out + '-split.zip'); };
    box.onclick = function (e) { var b = e.target.closest('button[data-dl]'); if (b) { var r = res[+b.getAttribute('data-dl')]; download(r.url, r.name); } };
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  updateMode();
})();
