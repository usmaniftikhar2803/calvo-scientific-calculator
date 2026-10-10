/* Calvo CV / Resume Builder: fill in the form, pick a design, download a clean text-based PDF.
   Everything runs in the browser. Your details are saved on this device only. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(2) + ' MB'; }

  /*CV_CORE_START*/
  function hexRgb(h) { h = String(h || '#000000').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16) || 0; return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
  function splitList(s) { return String(s || '').split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function splitLines(s) { return String(s || '').split('\n').map(function (x) { return x.replace(/^\s*[-*\u2022]+\s*/, '').trim(); }).filter(Boolean); }

  /* Builds the CV PDF. Returns {bytes, lossy}. d is the form data; photoPng is optional PNG bytes (round photo). */
  async function buildCv(PL, d, photoPng) {
    var doc = await PL.PDFDocument.create(), lossy = false;
    var SF = PL.StandardFonts, serif = d.font === 'serif';
    var FR = await doc.embedFont(serif ? SF.TimesRoman : SF.Helvetica), FB = await doc.embedFont(serif ? SF.TimesRomanBold : SF.HelveticaBold), FI = await doc.embedFont(serif ? SF.TimesRomanItalic : SF.HelveticaOblique);
    var okSet = {}; (FR.getCharacterSet ? FR.getCharacterSet() : []).forEach(function (cp) { okSet[cp] = 1; });
    var haveSet = Object.keys(okSet).length > 0;
    function clean(s) {
      s = String(s == null ? '' : s).replace(/\r/g, '').replace(/\t/g, ' ')
        .replace(/[\u2018\u2019\u201B\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"')
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-').replace(/[\u200B-\u200D\uFEFF]/g, '');
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var cp = s.codePointAt(i), ch = String.fromCodePoint(cp); if (cp > 0xFFFF) i++;
        if (ch === '\n' || (haveSet ? okSet[cp] : cp <= 255)) out += ch; else { out += '?'; lossy = true; }
      }
      return out;
    }
    var W = 595.28, H = 841.89, sc = { compact: 0.92, normal: 1, large: 1.08 }[d.size] || 1;
    var A = PL.rgb.apply(null, hexRgb(d.accent || '#1f3a5f')), ARGB = hexRgb(d.accent || '#1f3a5f');
    var lum = 0.299 * ARGB[0] + 0.587 * ARGB[1] + 0.114 * ARGB[2], FG = lum > 0.68 ? PL.rgb(0.1, 0.1, 0.1) : PL.rgb(1, 1, 1);
    var INK = PL.rgb(0.11, 0.11, 0.11), MUTED = PL.rgb(0.38, 0.38, 0.38), LIGHT = PL.rgb(0.8, 0.8, 0.8);
    var pages = [], bg = null;
    function newPage() { var p = doc.addPage([W, H]); pages.push(p); if (bg) bg(p); return p; }
    function wrap(font, size, text, maxW) {
      var out = [];
      String(text).split('\n').forEach(function (par) {
        var words = par.split(/\s+/).filter(Boolean), line = '';
        if (!words.length) { out.push(''); return; }
        words.forEach(function (w) {
          var t = line ? line + ' ' + w : w;
          if (font.widthOfTextAtSize(t, size) <= maxW) { line = t; return; }
          if (line) out.push(line);
          while (font.widthOfTextAtSize(w, size) > maxW && w.length > 1) { var k = w.length; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > maxW) k--; out.push(w.slice(0, k)); w = w.slice(k); }
          line = w;
        });
        out.push(line);
      });
      return out;
    }
    function Col(x, w, top, bottom) { this.x = x; this.w = w; this.top = top; this.bottom = bottom; this.pi = 0; this.y = top; }
    Col.prototype.pg = function () { while (pages.length <= this.pi) newPage(); return pages[this.pi]; };
    Col.prototype.room = function (h) { if (this.y + h > this.bottom && this.y > this.top + 1) { this.pi++; this.y = this.top; } };
    Col.prototype.gap = function (h) { if (this.y > this.top + 0.5) this.y += h; };
    Col.prototype.text = function (str, o) {
      o = o || {}; var font = o.font || FR, size = (o.size || 10) * sc, lh = o.lh || 1.32, ind = o.indent || 0, w = (o.w || this.w) - ind, x = this.x + ind;
      var lines = wrap(font, size, clean(str), w), step = size * lh;
      for (var i = 0; i < lines.length; i++) {
        this.room(step); var p = this.pg(), tw = font.widthOfTextAtSize(lines[i], size);
        var xx = o.align === 'center' ? x + (w - tw) / 2 : o.align === 'right' ? x + w - tw : x;
        if (lines[i]) p.drawText(lines[i], { x: xx, y: H - this.y - size * 0.82, size: size, font: font, color: o.color || INK, opacity: o.opacity == null ? 1 : o.opacity });
        this.y += step;
      }
      if (o.after) this.y += o.after * sc;
      return this;
    };
    Col.prototype.lr = function (left, right, o) {
      o = o || {}; var size = (o.size || 10.5) * sc, rs = size * 0.92; right = clean(right || '');
      var rw = right ? FI.widthOfTextAtSize(right, rs) + 12 : 0, lines = wrap(FB, size, clean(left || ''), this.w - rw), step = size * 1.32;
      for (var i = 0; i < lines.length; i++) {
        this.room(step * (i === 0 ? 2 : 1)); var p = this.pg();
        if (lines[i]) p.drawText(lines[i], { x: this.x, y: H - this.y - size * 0.82, size: size, font: FB, color: INK });
        if (i === 0 && right) p.drawText(right, { x: this.x + this.w - FI.widthOfTextAtSize(right, rs), y: H - this.y - rs * 0.82 - (size - rs) * 0.3, size: rs, font: FI, color: MUTED });
        this.y += step;
      }
      return this;
    };
    Col.prototype.bullets = function (items, o) {
      o = o || {}; var size = (o.size || 10) * sc, step = size * 1.32, ind = 11 * sc;
      items.forEach(function (it) {
        var lines = wrap(FR, size, clean(it), this.w - ind);
        for (var i = 0; i < lines.length; i++) {
          this.room(step); var p = this.pg();
          if (i === 0) p.drawText('\u2022', { x: this.x + 2, y: H - this.y - size * 0.82, size: size, font: FR, color: o.bullet || A });
          p.drawText(lines[i], { x: this.x + ind, y: H - this.y - size * 0.82, size: size, font: FR, color: INK });
          this.y += step;
        }
        this.y += 1.5 * sc;
      }, this);
      return this;
    };
    Col.prototype.rule = function (color, th, opacity) {
      this.room(th + 2); var p = this.pg();
      p.drawLine({ start: { x: this.x, y: H - this.y }, end: { x: this.x + this.w, y: H - this.y }, thickness: th, color: color, opacity: opacity == null ? 1 : opacity });
      this.y += th; return this;
    };
    Col.prototype.bar = function (w, th, color) { this.room(th + 2); var p = this.pg(); p.drawRectangle({ x: this.x, y: H - this.y - th, width: w, height: th, color: color }); this.y += th; return this; };

    /* ---- clean data ---- */
    var pv = d.preview;
    var S = {
      name: clean(d.name || (pv ? 'Your Name' : '')), role: clean(d.role || (pv ? 'Your target job title' : '')),
      email: clean(d.email), phone: clean(d.phone), location: clean(d.location), link: clean(d.link), summary: clean(d.summary),
      edu: (d.edu || []).filter(function (e) { return e.degree || e.school; }), exp: (d.exp || []).filter(function (e) { return e.role || e.org; }), proj: (d.proj || []).filter(function (e) { return e.name; }),
      skills: splitList(d.skills), certs: splitLines(d.certs), langs: splitList(d.langs), interests: splitList(d.interests), refs: !!d.refs
    };
    doc.setTitle((S.name || 'Resume') + ' - Resume'); doc.setAuthor(S.name || ''); doc.setProducer('Calvo CV Builder'); doc.setCreator('calvoscientificcalculator.online');
    var photo = photoPng ? await doc.embedPng(photoPng) : null;
    var contact = [];
    [['Email', S.email], ['Phone', S.phone], ['Location', S.location], ['Web', S.link]].forEach(function (c) { if (c[1]) contact.push(c); });

    /* ---- sections (shared) ---- */
    var R = {
      summary: function (col, H1) { if (!S.summary) return; H1(col, 'Profile'); col.text(S.summary, { size: 10, after: 4 }); },
      edu: function (col, H1) {
        if (!S.edu.length) return; H1(col, 'Education');
        S.edu.forEach(function (e) {
          col.lr(clean(e.degree), clean(e.years));
          var sub = [clean(e.school), clean(e.grade)].filter(Boolean).join('  |  '); if (sub) col.text(sub, { font: FI, size: 10, color: MUTED });
          if (e.note) col.text(clean(e.note), { size: 9.5 }); col.gap(6);
        });
      },
      exp: function (col, H1) {
        if (!S.exp.length) return; H1(col, 'Experience');
        S.exp.forEach(function (e) {
          col.lr(clean(e.role), clean(e.dates)); if (e.org) col.text(clean(e.org), { font: FI, size: 10, color: MUTED });
          col.gap(1); col.bullets(splitLines(clean(e.bullets))); col.gap(5);
        });
      },
      proj: function (col, H1) {
        if (!S.proj.length) return; H1(col, 'Projects');
        S.proj.forEach(function (e) {
          col.lr(clean(e.name), ''); if (e.tech) col.text(clean(e.tech), { font: FI, size: 9.5, color: MUTED });
          col.gap(1); col.bullets(splitLines(clean(e.bullets))); col.gap(5);
        });
      },
      skills: function (col, H1) { if (!S.skills.length) return; H1(col, 'Skills'); col.text(S.skills.join(', '), { size: 10, after: 4 }); },
      certs: function (col, H1) { if (!S.certs.length) return; H1(col, 'Certifications & Achievements'); col.bullets(S.certs); col.gap(4); },
      langs: function (col, H1) { if (!S.langs.length) return; H1(col, 'Languages'); col.text(S.langs.join(', '), { size: 10, after: 4 }); },
      interests: function (col, H1) { if (!S.interests.length) return; H1(col, 'Interests'); col.text(S.interests.join(', '), { size: 10, after: 4 }); },
      refs: function (col, H1) { if (!S.refs) return; H1(col, 'References'); col.text('Available on request.', { size: 10 }); }
    };
    var eduFirst = d.order !== 'exp', MAIN_ORDER = eduFirst ? ['summary', 'edu', 'exp', 'proj'] : ['summary', 'exp', 'edu', 'proj'];

    /* ---- designs ---- */
    function classic() {
      var M = 44, hasPh = !!photo, hw = W - 2 * M - (hasPh ? 84 : 0), head = new Col(M, hw, 40, H - 40);
      if (hasPh) {
        newPage(); var r = 31, cx = W - M - r, cy = H - 40 - r;
        pages[0].drawImage(photo, { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r }); pages[0].drawCircle({ x: cx, y: cy, size: r + 0.8, borderColor: A, borderWidth: 1.6 });
      }
      var al = hasPh ? 'left' : 'center';
      head.text(S.name, { font: FB, size: 25, align: al, lh: 1.15 });
      if (S.role) head.text(S.role, { size: 12.5, color: A, align: al, after: 2 });
      if (contact.length) head.text(contact.map(function (c) { return c[1]; }).join('   |   '), { size: 9.5, color: MUTED, align: al });
      var col = new Col(M, W - 2 * M, 40, H - 40); col.y = Math.max(head.y, hasPh ? 40 + 62 + 6 : 0) + 8; col.pi = 0;
      col.rule(A, 1.4); col.gap(2);
      function H1(c, label) { c.room(48 * sc); c.gap(8); c.text(label.toUpperCase(), { font: FB, size: 11, color: A, lh: 1.2 }); c.gap(1); c.rule(LIGHT, 0.8); c.gap(4); }
      MAIN_ORDER.concat(['skills', 'certs', 'langs', 'interests', 'refs']).forEach(function (k) { R[k](col, H1); });
    }

    function modern() {
      var SBW = 192; bg = function (p) { p.drawRectangle({ x: 0, y: 0, width: SBW, height: H, color: A }); };
      newPage();
      var side = new Col(22, SBW - 44, 40, H - 40), main = new Col(SBW + 26, W - SBW - 26 - 34, 46, H - 40);
      if (photo) {
        var r = 52, cx = SBW / 2, cy = H - 40 - r;
        pages[0].drawImage(photo, { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r }); pages[0].drawCircle({ x: cx, y: cy, size: r + 0.8, borderColor: FG, borderWidth: 2 });
        side.y = 40 + 2 * r + 20;
      }
      function SH(c, label) { c.room(40 * sc); c.gap(12); c.text(label.toUpperCase(), { font: FB, size: 10, color: FG, lh: 1.2 }); c.gap(1); c.rule(FG, 0.8, 0.5); c.gap(5); }
      if (contact.length) { SH(side, 'Contact'); contact.forEach(function (c) { side.text(c[0].toUpperCase(), { font: FB, size: 7.5, color: FG, opacity: 0.7, lh: 1.2 }); side.text(c[1], { size: 9.5, color: FG, after: 4, lh: 1.25 }); }); }
      function listSide(items, label) { if (!items.length) return; SH(side, label); items.forEach(function (s) { side.text(s, { size: 9.5, color: FG, lh: 1.3, after: 1.5 }); }); }
      listSide(S.skills, 'Skills'); listSide(S.langs, 'Languages'); listSide(S.interests, 'Interests');
      main.text(S.name, { font: FB, size: 27, lh: 1.12 }); if (S.role) main.text(S.role, { size: 13, color: A, after: 4 });
      function H1(c, label) { c.room(44 * sc); c.gap(10); c.text(label.toUpperCase(), { font: FB, size: 11.5, color: A, lh: 1.2 }); c.gap(1); c.bar(30, 2, A); c.gap(5); }
      MAIN_ORDER.concat(['certs', 'refs']).forEach(function (k) { R[k](main, H1); });
    }

    function minimal() {
      var M = 50, LW = 92, GAP = 18, head = new Col(M, W - 2 * M - (photo ? 80 : 0), 44, H - 44);
      if (photo) { newPage(); var r = 30, cx = W - M - r, cy = H - 44 - r; pages[0].drawImage(photo, { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r }); }
      head.text(S.name, { font: FB, size: 28, lh: 1.12 }); if (S.role) head.text(S.role, { size: 12.5, color: A, after: 2 });
      if (contact.length) head.text(contact.map(function (c) { return c[1]; }).join('   \u2022   '), { size: 9.5, color: MUTED });
      var rc = new Col(M + LW + GAP, W - 2 * M - LW - GAP, 44, H - 44), lc = new Col(M, LW, 44, H - 44);
      rc.y = Math.max(head.y, photo ? 44 + 60 : 0) + 10; rc.pi = 0;
      var full = new Col(M, W - 2 * M, 44, H - 44); full.y = rc.y; full.rule(LIGHT, 0.8); rc.y += 12;
      function H1(c, label) { c.room(46 * sc); lc.pi = c.pi; lc.y = c.y + 1; lc.text(label.toUpperCase(), { font: FB, size: 9, color: A, lh: 1.2 }); c.gap(0); }
      MAIN_ORDER.concat(['skills', 'certs', 'langs', 'interests', 'refs']).forEach(function (k) { R[k](rc, H1); rc.gap(6); });
    }
    ({ classic: classic, modern: modern, minimal: minimal }[d.tpl] || classic)();
    if (!pages.length) newPage();
    return { bytes: await doc.save(), lossy: lossy, pages: pages.length };
  }
  /*CV_CORE_END*/

  if (!$('cvApp')) return;

  /* ---------- load libraries on demand (vendor/ first, then site root) ---------- */
  var libs = {};
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('x')); }; document.head.appendChild(s); }); }
  function lib(name) {
    if (!libs[name]) {
      var file = name === 'pdflib' ? 'pdf-lib.min.js' : 'pdf.min.js', p = Promise.reject(), base = '';
      ['vendor/', ''].forEach(function (b) { p = p.catch(function () { return loadScript(b + file).then(function () { base = b; }); }); });
      libs[name] = p.then(function () { if (name === 'pdfjs') window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js'; })
        .catch(function () { delete libs[name]; throw new Error('PDF engine file not found (' + file + '). Upload the vendor folder next to this page.'); });
    }
    return libs[name];
  }

  /* ---------- state ---------- */
  var KEY = 'calvo_cv_v1';
  var LISTS = {
    edu: { title: 'Education', add: '+ Add education', blank: { degree: '', school: '', years: '', grade: '', note: '' }, fields: [['degree', 'Degree / qualification', 'e.g. BS Computer Science'], ['school', 'Institution', 'e.g. Sample University, Lahore'], ['years', 'Years', 'e.g. 2021 - 2025'], ['grade', 'Grade / CGPA (optional)', 'e.g. CGPA 3.45 / 4.00'], ['note', 'Extra line (optional)', 'e.g. Final year project: Student Result Portal']] },
    exp: { title: 'Experience', add: '+ Add experience', blank: { role: '', org: '', dates: '', bullets: '' }, fields: [['role', 'Job title', 'e.g. Web Development Intern'], ['org', 'Company / organisation', 'e.g. Sample Software House'], ['dates', 'Dates', 'e.g. Jun 2024 - Aug 2024'], ['bullets', 'What you did (one point per line)', 'Built 3 responsive landing pages\nFixed 25+ bugs', true]] },
    proj: { title: 'Project', add: '+ Add project', blank: { name: '', tech: '', bullets: '' }, fields: [['name', 'Project name', 'e.g. Student Result Portal'], ['tech', 'Tools used (optional)', 'e.g. HTML, CSS, JavaScript'], ['bullets', 'Details (one point per line)', 'Lets students check results by roll number', true]] }
  };
  var STATIC = { cvName: 'name', cvRole: 'role', cvEmail: 'email', cvPhone: 'phone', cvLoc: 'location', cvLink: 'link', cvSummary: 'summary', cvSkills: 'skills', cvCerts: 'certs', cvLangs: 'langs', cvInterests: 'interests' };
  function blank() {
    return { tpl: 'classic', accent: '#1f3a5f', font: 'sans', size: 'normal', order: 'edu', name: '', role: '', email: '', phone: '', location: '', link: '', summary: '', skills: '', certs: '', langs: '', interests: '', refs: false, photo: '',
      edu: [JSON.parse(JSON.stringify(LISTS.edu.blank))], exp: [JSON.parse(JSON.stringify(LISTS.exp.blank))], proj: [] };
  }
  function example() {
    return { name: 'Ali Hassan', role: 'Junior Web Developer', email: 'ali.hassan@email.com', phone: '0300-1234567', location: 'Lahore, Pakistan', link: 'linkedin.com/in/alihassan',
      summary: 'Motivated Computer Science graduate with hands-on experience building responsive websites using HTML, CSS and JavaScript. Quick learner who enjoys solving real problems and working in a team.',
      edu: [{ degree: 'BS Computer Science', school: 'Sample University, Lahore', years: '2021 - 2025', grade: 'CGPA 3.45 / 4.00', note: 'Final year project: Student Result Portal' }, { degree: 'Intermediate (Pre-Engineering)', school: 'Sample College', years: '2019 - 2021', grade: 'Grade A', note: '' }],
      exp: [{ role: 'Web Development Intern', org: 'Sample Software House', dates: 'Jun 2024 - Aug 2024', bullets: 'Built 3 responsive landing pages used by real clients\nFixed 25+ UI bugs and improved page load time by 30%\nWorked with a team of 4 using Git and GitHub' }],
      proj: [{ name: 'Student Result Portal', tech: 'HTML, CSS, JavaScript, Firebase', bullets: 'Lets students check results by roll number\nAdmin panel to upload results from a spreadsheet' }],
      skills: 'HTML, CSS, JavaScript, React, Git, Firebase, Problem solving, Communication', certs: 'Web Development Bootcamp - Sample Academy (2024)\nDean\'s Honor List, 2023', langs: 'Urdu, English, Punjabi', interests: 'Cricket, Reading, Open source', refs: true };
  }
  var cv = blank(), saveT = 0, prevT = 0, token = 0, pngCache = { url: '', bytes: null };
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(cv)); } catch (e) {} }, 300); }
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!o) return;
      var b = blank(); Object.keys(b).forEach(function (k) { if (o[k] !== undefined) b[k] = o[k]; }); cv = b;
    } catch (e) {}
  }

  /* ---------- form <-> state ---------- */
  function fillStatic() {
    Object.keys(STATIC).forEach(function (id) { $(id).value = cv[STATIC[id]] || ''; });
    $('cvRefs').checked = !!cv.refs; $('cvFont').value = cv.font; $('cvSize').value = cv.size; $('cvOrder').value = cv.order; $('cvColor').value = cv.accent;
    syncChoices(); renderPhoto();
  }
  function syncChoices() {
    Array.prototype.forEach.call(document.querySelectorAll('.cv-tpl'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === cv.tpl); });
    Array.prototype.forEach.call(document.querySelectorAll('.cv-sw'), function (b) { b.classList.toggle('on', b.getAttribute('data-c').toLowerCase() === cv.accent.toLowerCase()); });
  }
  function renderPhoto() { var h = $('cvPhotoPrev'); h.innerHTML = cv.photo ? '<img alt="" src="' + cv.photo + '">' : ''; $('cvPhotoClear').style.display = cv.photo ? '' : 'none'; }
  function renderList(key) {
    var L = LISTS[key], box = $('cvList_' + key), items = cv[key];
    box.innerHTML = items.map(function (it, i) {
      var f = L.fields.map(function (fd) {
        var v = esc(it[fd[0]] || ''), id = 'cv_' + key + '_' + i + '_' + fd[0];
        return '<div class="cv-f"><label for="' + id + '">' + fd[1] + '</label>' + (fd[3]
          ? '<textarea id="' + id + '" rows="3" data-k="' + fd[0] + '" placeholder="' + esc(fd[2]) + '">' + v + '</textarea>'
          : '<input type="text" id="' + id + '" data-k="' + fd[0] + '" value="' + v + '" placeholder="' + esc(fd[2]) + '">') + '</div>';
      }).join('');
      return '<div class="cv-ent" data-i="' + i + '"><div class="cv-ent-h"><b>' + L.title + ' ' + (i + 1) + '</b><span>' +
        '<button type="button" class="btn ghost" data-a="up"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">&uarr;</button>' +
        '<button type="button" class="btn ghost" data-a="down"' + (i === items.length - 1 ? ' disabled' : '') + ' aria-label="Move down">&darr;</button>' +
        '<button type="button" class="btn ghost" data-a="del" aria-label="Remove">&times;</button></span></div>' + f + '</div>';
    }).join('');
  }
  Object.keys(LISTS).forEach(function (key) {
    var box = $('cvList_' + key);
    box.addEventListener('input', function (e) {
      var ent = e.target.closest('.cv-ent'), k = e.target.getAttribute('data-k'); if (!ent || !k) return;
      cv[key][+ent.getAttribute('data-i')][k] = e.target.value; touch();
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'), ent = e.target.closest('.cv-ent'); if (!b || !ent) return;
      var i = +ent.getAttribute('data-i'), a = b.getAttribute('data-a'), arr = cv[key];
      if (a === 'del') arr.splice(i, 1);
      else if (a === 'up' && i > 0) { var t = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = t; }
      else if (a === 'down' && i < arr.length - 1) { var t2 = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t2; }
      renderList(key); touch();
    });
    $('cvAdd_' + key).addEventListener('click', function () {
      if (cv[key].length >= 8) return; cv[key].push(JSON.parse(JSON.stringify(LISTS[key].blank))); renderList(key); touch();
    });
  });
  Object.keys(STATIC).forEach(function (id) { $(id).addEventListener('input', function () { cv[STATIC[id]] = this.value; touch(); }); });
  $('cvRefs').addEventListener('change', function () { cv.refs = this.checked; touch(); });
  $('cvFont').addEventListener('change', function () { cv.font = this.value; touch(); });
  $('cvSize').addEventListener('change', function () { cv.size = this.value; touch(); });
  $('cvOrder').addEventListener('change', function () { cv.order = this.value; touch(); });
  $('cvColor').addEventListener('input', function () { cv.accent = this.value; syncChoices(); touch(); });
  Array.prototype.forEach.call(document.querySelectorAll('.cv-tpl'), function (b) { b.addEventListener('click', function () { cv.tpl = b.getAttribute('data-t'); syncChoices(); touch(); }); });
  Array.prototype.forEach.call(document.querySelectorAll('.cv-sw'), function (b) { b.addEventListener('click', function () { cv.accent = b.getAttribute('data-c'); $('cvColor').value = cv.accent; syncChoices(); touch(); }); });
  function touch() { save(); clearTimeout(prevT); prevT = setTimeout(renderPreview, 500); }

  /* ---------- photo (cropped to a square, drawn round in the PDF) ---------- */
  $('cvPhoto').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = ''; if (!f) return;
    var u = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      var iw = im.naturalWidth, ih = im.naturalHeight, s = Math.min(iw, ih), c = document.createElement('canvas'); c.width = c.height = 300;
      c.getContext('2d').drawImage(im, (iw - s) / 2, (ih - s) / 2, s, s, 0, 0, 300, 300); URL.revokeObjectURL(u);
      cv.photo = c.toDataURL('image/jpeg', 0.85); renderPhoto(); touch();
    };
    im.onerror = function () { URL.revokeObjectURL(u); $('cvMsg').textContent = 'That photo could not be opened. Try a JPG or PNG.'; };
    im.src = u;
  });
  $('cvPhotoClear').onclick = function () { cv.photo = ''; renderPhoto(); touch(); };
  function photoPng() {
    if (!cv.photo) return Promise.resolve(null);
    if (pngCache.url === cv.photo && pngCache.bytes) return Promise.resolve(pngCache.bytes);
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'), g; c.width = c.height = 300; g = c.getContext('2d');
        g.beginPath(); g.arc(150, 150, 150, 0, Math.PI * 2); g.closePath(); g.clip(); g.drawImage(im, 0, 0, 300, 300);
        c.toBlob(function (b) { if (!b) { res(null); return; } b.arrayBuffer().then(function (buf) { pngCache = { url: cv.photo, bytes: new Uint8Array(buf) }; res(pngCache.bytes); }); }, 'image/png');
      };
      im.onerror = function () { res(null); }; im.src = cv.photo;
    });
  }

  /* ---------- build + preview ---------- */
  function dataFor(preview) { var d = JSON.parse(JSON.stringify(cv)); d.preview = !!preview; delete d.photo; return d; }
  async function makePdf(preview) { await lib('pdflib'); return await buildCv(PDFLib, dataFor(preview), await photoPng()); }
  async function renderPreview() {
    var my = ++token, box = $('cvPages');
    try {
      var res = await makePdf(true); if (my !== token) return;
      $('cvWarn').style.display = res.lossy ? 'block' : 'none';
      try {
        await lib('pdfjs');
        var pdf = await pdfjsLib.getDocument({ data: res.bytes.slice() }).promise; if (my !== token) { pdf.destroy(); return; }
        var wpx = Math.max(240, Math.min(560, box.clientWidth || 400)), dpr = Math.min(2, window.devicePixelRatio || 1), frag = document.createDocumentFragment();
        for (var p = 1; p <= pdf.numPages; p++) {
          var page = await pdf.getPage(p), v1 = page.getViewport({ scale: 1 }), v = page.getViewport({ scale: wpx * dpr / v1.width });
          var c = document.createElement('canvas'); c.width = Math.ceil(v.width); c.height = Math.ceil(v.height);
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: g, viewport: v }).promise; frag.appendChild(c); page.cleanup();
          if (my !== token) { pdf.destroy(); return; }
        }
        box.innerHTML = ''; box.appendChild(frag); pdf.destroy();
        $('cvPageCount').textContent = res.pages + ' page' + (res.pages > 1 ? 's' : '');
      } catch (e) {
        box.innerHTML = '<div class="note">The live preview needs the file pdf.min.js from the vendor folder. You can still tap Download PDF.</div>';
      }
    } catch (e) { box.innerHTML = '<div class="note">' + esc(e && e.message ? e.message : 'Preview failed.') + '</div>'; }
  }

  /* ---------- download ---------- */
  var url = null, busy = false;
  $('cvDl').onclick = async function () {
    if (busy) return;
    var msg = $('cvMsg'); msg.textContent = '';
    if (!(cv.name || '').trim()) { msg.textContent = 'Please enter your name first.'; $('cvName').focus(); return; }
    busy = true; $('cvDl').disabled = true; msg.textContent = 'Creating your CV...';
    try {
      var res = await makePdf(false), blob = new Blob([res.bytes], { type: 'application/pdf' });
      var name = (cv.name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'CV') + ' - CV.pdf';
      if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      var file = null; try { file = new File([blob], name, { type: 'application/pdf' }); } catch (e) {}
      var canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      msg.innerHTML = 'Done: ' + res.pages + ' page' + (res.pages > 1 ? 's' : '') + ', ' + fmt(res.bytes.length) + '. ' + (canShare ? '<button class="btn ghost" id="cvShare" type="button" style="padding:6px 12px">Share / Save</button>' : '');
      if (canShare) $('cvShare').onclick = function () { navigator.share({ files: [file], title: name }).catch(function () {}); };
      $('cvWarn').style.display = res.lossy ? 'block' : 'none';
    } catch (e) { msg.textContent = e && e.message ? e.message : 'Something went wrong.'; }
    busy = false; $('cvDl').disabled = false;
  };

  $('cvExample').onclick = function () { var keep = { tpl: cv.tpl, accent: cv.accent, font: cv.font, size: cv.size, order: cv.order, photo: cv.photo }; cv = Object.assign(blank(), example(), keep); fillAll(); touch(); };
  $('cvClear').onclick = function () {
    if (typeof confirm === 'function' && !confirm('Clear everything you have typed?')) return;
    var keep = { tpl: cv.tpl, accent: cv.accent, font: cv.font, size: cv.size, order: cv.order }; cv = Object.assign(blank(), keep); fillAll(); touch();
  };
  $('cvTabEdit').onclick = function () { $('cvGrid').setAttribute('data-view', 'edit'); $('cvTabEdit').classList.add('on'); $('cvTabPrev').classList.remove('on'); };
  $('cvTabPrev').onclick = function () { $('cvGrid').setAttribute('data-view', 'preview'); $('cvTabPrev').classList.add('on'); $('cvTabEdit').classList.remove('on'); renderPreview(); };
  function fillAll() { fillStatic(); Object.keys(LISTS).forEach(renderList); }

  load(); fillAll(); renderPreview();
})();
