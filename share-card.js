/* Calvo - shareable result image card.
   CalvoShareCard.open({ label, value, sub, lines: [[name, value], ...], filename, text })
   The image is drawn on a canvas inside the browser. Nothing is uploaded and the optional
   name typed by the student is not stored. */
(function () {
  'use strict';
  var SIZES = { square: [1080, 1080, 'Square (post)'], portrait: [1080, 1350, 'Portrait (post)'], story: [1080, 1920, 'Story / Status'] };
  var FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Naskh Arabic","Noto Sans Arabic",sans-serif';
  var ORANGE = '#ff8a1f';
  var SITE = 'calvoscientificcalculator.online';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function setFont(ctx, weight, size) { ctx.font = weight + ' ' + size + 'px ' + FONT; }
  function fit(ctx, text, weight, maxW, start, min) {
    var s = start;
    setFont(ctx, weight, s);
    while (s > min && ctx.measureText(text).width > maxW) { s -= 4; setFont(ctx, weight, s); }
    return s;
  }
  function wrap(ctx, text, maxW, maxLines) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = test;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += '...'; }
    return lines;
  }
  function clip(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '...').width > maxW) text = text.slice(0, -1);
    return text + '...';
  }
  function isRtl(s) { return /[\u0600-\u06FF]/.test(s); }

  function draw(cv, d, name, mode) {
    var sz = SIZES[mode] || SIZES.square, W = sz[0], H = sz[1];
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    // background
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1d140b'); g.addColorStop(0.55, '#0e0d0d'); g.addColorStop(1, '#0a0a0b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var rg = ctx.createRadialGradient(W * 0.85, H * 0.08, 10, W * 0.85, H * 0.08, W * 0.8);
    rg.addColorStop(0, 'rgba(255,138,31,0.32)'); rg.addColorStop(1, 'rgba(255,138,31,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    // card
    var pad = 56, cx = pad, cy = pad, cw = W - pad * 2, ch = H - pad * 2, ip = 76;
    rr(ctx, cx, cy, cw, ch, 56); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
    var left = cx + ip, right = cx + cw - ip, innerW = right - left, mid = W / 2;
    ctx.textBaseline = 'alphabetic'; ctx.direction = 'ltr';
    // header
    var y = cy + ip + 24;
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(left + 14, y - 14, 14, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left'; setFont(ctx, '800', 42); ctx.fillStyle = '#ffffff'; ctx.fillText('CALVO', left + 44, y);
    var dt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    ctx.textAlign = 'right'; setFont(ctx, '500', 32); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(dt, right, y);
    var topY = y + 40;
    // name
    if (name) {
      ctx.direction = isRtl(name) ? 'rtl' : 'ltr'; ctx.textAlign = 'center';
      var ns = fit(ctx, name, '700', innerW, 58, 30); setFont(ctx, '700', ns);
      ctx.fillStyle = '#ffffff'; ctx.fillText(clip(ctx, name, innerW), mid, topY + 70);
      ctx.direction = 'ltr'; topY += 100;
    }
    // footer (measured first so the middle block can be centred above it)
    var footH = 150, footY = cy + ch - ip + 8;
    // middle block metrics
    var label = String(d.label || '').toUpperCase();
    var pairs = (d.lines || []).slice(0, 6);
    var valStr = String(d.value);
    var startSize = mode === 'story' ? 330 : mode === 'portrait' ? 290 : 250;
    ctx.textAlign = 'center';
    var vs = fit(ctx, valStr, '800', innerW, startSize, 90);
    setFont(ctx, '500', 40);
    var subLines = d.sub ? wrap(ctx, d.sub, innerW, 3) : [];
    var labelH = 70, rowH = 78, valueH, subH = subLines.length ? subLines.length * 54 + 16 : 0, detH, total;
    var avail = (footY - footH) - topY;
    function calc() { valueH = vs * 0.95; detH = pairs.length ? pairs.length * rowH + 56 : 0; total = labelH + valueH + subH + detH; }
    calc();
    while (total > avail && (vs > 110 || rowH > 58)) { if (vs > 110) vs -= 10; else rowH -= 4; calc(); }
    var my = topY + Math.max(10, (avail - total) / 2);
    // label
    ctx.fillStyle = ORANGE; setFont(ctx, '800', 46);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.fillText(label, mid, my + 46);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    // value
    my += labelH;
    setFont(ctx, '800', vs); ctx.fillStyle = '#ffffff'; ctx.fillText(valStr, mid, my + vs * 0.8);
    my += valueH;
    // sub
    setFont(ctx, '500', 40); ctx.fillStyle = 'rgba(255,255,255,0.62)';
    subLines.forEach(function (ln, i) { ctx.fillText(ln, mid, my + 44 + i * 54); });
    my += subH;
    // details
    if (pairs.length) {
      my += 20;
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(left, my); ctx.lineTo(right, my); ctx.stroke();
      my += 8;
      pairs.forEach(function (p, i) {
        var yy = my + 50 + i * rowH;
        setFont(ctx, '700', 40); var vtxt = String(p[1]); var vw = ctx.measureText(vtxt).width;
        ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.fillText(vtxt, right, yy);
        setFont(ctx, '500', 38); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.62)';
        ctx.fillText(clip(ctx, String(p[0]), innerW - vw - 30), left, yy);
      });
    }
    // footer
    ctx.textAlign = 'center'; setFont(ctx, '700', 40); ctx.fillStyle = ORANGE; ctx.fillText(SITE, mid, footY - 40);
    setFont(ctx, '500', 30); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText('Free calculator for students', mid, footY + 4);
  }

  var cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    var st = document.createElement('style');
    st.textContent =
      '.csc-ov{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:100000;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto}' +
      '.csc-box{background:#17171a;color:#eee;border:1px solid #333;border-radius:16px;padding:14px;width:100%;max-width:440px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
      '.csc-box h3{margin:0 0 10px;font-size:15px;color:#ff8a1f}' +
      '.csc-box canvas{display:block;margin:0 auto 10px;max-width:100%;max-height:50vh;border-radius:10px;background:#000}' +
      '.csc-row{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}' +
      '.csc-row input,.csc-row select{flex:1 1 140px;min-width:0;background:#222;color:#eee;border:1px solid #3a3a3f;border-radius:10px;padding:9px 10px;font-size:14px}' +
      '.csc-btn{flex:1 1 auto;background:#222;color:#eee;border:1px solid #3a3a3f;border-radius:20px;padding:10px 14px;font-size:14px;font-weight:600;cursor:pointer}' +
      '.csc-btn.p{background:#ff8a1f;color:#111;border-color:#ff8a1f}' +
      '.csc-btn[disabled]{opacity:.5}' +
      '.csc-note{font-size:11.5px;color:#9a9a9a;margin:2px 0 8px;line-height:1.5}' +
      '.csc-msg{font-size:12.5px;color:#7ee0a0;min-height:18px;margin-top:4px}';
    document.head.appendChild(st);
  }

  function open(d) {
    injectCss();
    var old = document.getElementById('cscOv'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'cscOv'; ov.className = 'csc-ov';
    var box = document.createElement('div'); box.className = 'csc-box';
    box.innerHTML =
      '<h3>Share as image</h3><canvas id="cscCv"></canvas>' +
      '<div class="csc-row"><input id="cscName" type="text" maxlength="40" placeholder="Your name (optional)" autocomplete="off">' +
      '<select id="cscSize"><option value="square">' + SIZES.square[2] + '</option><option value="portrait">' + SIZES.portrait[2] + '</option><option value="story">' + SIZES.story[2] + '</option></select></div>' +
      '<div class="csc-row"><button class="csc-btn p" id="cscShare" type="button" style="display:none">Share</button><button class="csc-btn" id="cscDl" type="button">Download</button><button class="csc-btn" id="cscCopy" type="button" style="display:none">Copy</button><button class="csc-btn" id="cscClose" type="button">Close</button></div>' +
      '<div class="csc-note">The image is made on your device. Your name is optional and is not saved. On a phone, Share opens WhatsApp, Instagram and other apps.</div><div class="csc-msg" id="cscMsg"></div>';
    ov.appendChild(box); document.body.appendChild(ov);
    var $ = function (id) { return document.getElementById(id); };
    var cv = $('cscCv'), blob = null, timer = null, fname = (d.filename || 'calvo-result') + '.png';
    function msg(t) { $('cscMsg').textContent = t; if (t) setTimeout(function () { if ($('cscMsg') && $('cscMsg').textContent === t) $('cscMsg').textContent = ''; }, 3500); }
    function render() {
      draw(cv, d, $('cscName').value.trim(), $('cscSize').value);
      blob = null;
      cv.toBlob(function (b) { blob = b; }, 'image/png');
    }
    function file() { return blob ? new File([blob], fname, { type: 'image/png' }) : null; }
    var canFile = false;
    try { var probe = new File([new Blob(['x'])], 'x.png', { type: 'image/png' }); canFile = !!(navigator.canShare && navigator.canShare({ files: [probe] })); } catch (e) { canFile = false; }
    if (canFile) $('cscShare').style.display = '';
    if (navigator.clipboard && window.ClipboardItem) $('cscCopy').style.display = '';
    $('cscShare').onclick = function () {
      var f = file(); if (!f) { msg('One moment, preparing the image...'); return; }
      navigator.share({ files: [f], title: 'My result on Calvo', text: d.text || '' }).catch(function () {});
    };
    $('cscDl').onclick = function () {
      if (!blob) { msg('One moment, preparing the image...'); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
      msg('Image saved. Upload it to WhatsApp or Instagram.');
    };
    $('cscCopy').onclick = function () {
      if (!blob) { msg('One moment, preparing the image...'); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () { msg('Image copied.'); }, function () { msg('Copy is not allowed here. Use Download.'); });
    };
    function close() { document.removeEventListener('keydown', onKey); ov.remove(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    $('cscClose').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    function later() { clearTimeout(timer); timer = setTimeout(render, 150); }
    $('cscName').addEventListener('input', later);
    $('cscSize').addEventListener('change', render);
    render();
  }

  window.CalvoShareCard = { open: open, _draw: draw };
})();
