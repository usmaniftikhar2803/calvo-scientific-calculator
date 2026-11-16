/* Citation generator: APA 7, MLA 9, Harvard. Runs fully in the browser. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MS = ['Jan.','Feb.','Mar.','Apr.','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];
  var KEY = 'calvo_cite_v1';
  var SHOW = {
    website:   ['authors','title','container','publisher','year','month','day','url','accessed'],
    book:      ['authors','title','edition','publisher','year'],
    journal:   ['authors','title','container','year','volume','issue','pages','doi','url'],
    newspaper: ['authors','title','container','year','month','day','pages','url','accessed'],
    video:     ['authors','title','container','year','month','day','url','accessed']
  };
  var LABELS = {
    website:   { authors: 'Author(s)', container: 'Website name' },
    book:      { authors: 'Author(s) / Editor(s)', container: 'Website name' },
    journal:   { authors: 'Author(s)', container: 'Journal name' },
    newspaper: { authors: 'Author(s)', container: 'Newspaper / magazine name' },
    video:     { authors: 'Channel or uploader', container: 'Platform (default YouTube)' }
  };
  var FIELDS = ['authors','title','container','publisher','edition','year','month','day','volume','issue','pages','doi','url','accessed'];
  var style = 'apa', list = [], toastTimer;

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function clean(v) { return String(v || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }
  function toHtml(s) { return esc(s).replace(/\*(.+?)\*/g, '<i>$1</i>'); }
  function toPlain(s) { return s.replace(/\*/g, ''); }
  function end(s) { s = (s || '').trim(); if (!s) return ''; return /[.?!]["'\u201d\u2019*\]]*$/.test(s) ? s : s + '.'; }
  function ordinal(n) {
    var v = parseInt(n, 10); if (isNaN(v)) return n;
    var s = ['th','st','nd','rd'], m = v % 100;
    return v + (s[(m - 20) % 10] || s[m] || s[0]);
  }
  function pg(p) { return p.replace(/\s*[-\u2013\u2014]\s*/g, '\u2013'); }
  function pp(p) { p = pg(p); return (/\u2013/.test(p) ? 'pp. ' : 'p. ') + p; }
  function short(t) { return (t || 'Title').split(/\s+/).slice(0, 5).join(' '); }
  function doiRaw(d) { return d.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, ''); }
  function doiUrl(d) { return 'https://doi.org/' + doiRaw(d); }
  function stripProto(u) { return u ? u.replace(/^https?:\/\//i, '').replace(/\/$/, '') : ''; }
  function mnum(f) { return f.month ? parseInt(f.month, 10) : 0; }
  function dnum(f) { var d = parseInt(f.day, 10); return d > 0 && d < 32 ? d : 0; }
  function acc(v, names) {
    if (!v) return '';
    var p = v.split('-'); if (p.length < 3) return '';
    return parseInt(p[2], 10) + ' ' + names[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }

  /* ---------- names ---------- */
  function parseNames(txt, org) {
    var out = [];
    String(txt || '').split(/\n|;/).forEach(function (l) {
      l = clean(l); if (!l) return;
      if (org) { out.push({ org: l }); return; }
      var first = '', last = '';
      if (l.indexOf(',') > -1) { var p = l.split(','); last = p[0].trim(); first = p.slice(1).join(' ').trim(); }
      else { var w = l.split(' '); last = w.pop(); first = w.join(' '); }
      out.push({ first: first, last: last });
    });
    return out;
  }
  function initials(first) {
    return first.split(/\s+/).map(function (p) {
      return p.split('-').map(function (x) { return x ? x.charAt(0).toUpperCase() + '.' : ''; }).join('-');
    }).join(' ');
  }
  function nm(a) { return a.org || a.last; }
  function full(a) { return a.org || ((a.first ? a.first + ' ' : '') + a.last); }
  function inv(a) { return a.org || (a.last + (a.first ? ', ' + initials(a.first) : '')); }

  /* ---------- APA 7 ---------- */
  function apaAuth(A) {
    var n = A.length;
    if (n === 1) return inv(A[0]);
    if (n <= 20) return A.slice(0, -1).map(inv).join(', ') + ', & ' + inv(A[n - 1]);
    return A.slice(0, 19).map(inv).join(', ') + ', . . . ' + inv(A[n - 1]);
  }
  function apa(t, f, A) {
    var au = A.length ? apaAuth(A) : '', ti = f.title || 'Title', main, tail = [];
    var d;
    if (!f.year) d = '(n.d.).';
    else { d = f.year; if ((t === 'website' || t === 'newspaper' || t === 'video') && mnum(f)) d += ', ' + MONTHS[mnum(f) - 1] + (dnum(f) ? ' ' + dnum(f) : ''); d = '(' + d + ').'; }
    var link = f.doi ? doiUrl(f.doi) : f.url;
    if (t === 'book') { main = '*' + ti + '*' + (f.edition ? ' (' + ordinal(f.edition) + ' ed.)' : ''); tail = [end(f.publisher)]; }
    else if (t === 'website') { main = '*' + ti + '*'; tail = [f.container && f.container !== au ? end(f.container) : '', link]; }
    else if (t === 'video') { main = '*' + ti + '* [Video]'; tail = [end(f.container || 'YouTube'), link]; }
    else if (t === 'journal') {
      main = ti; var j = '*' + (f.container || 'Journal') + '*';
      if (f.volume) j += ', *' + f.volume + '*';
      if (f.issue) j += '(' + f.issue + ')';
      if (f.pages) j += ', ' + pg(f.pages);
      tail = [end(j), link];
    } else { main = ti; tail = [end('*' + (f.container || 'Newspaper') + '*'), link]; }
    var head = au ? [end(au), d, end(main)] : [end(main), d];
    return head.concat(tail).filter(Boolean).join(' ');
  }
  function apaIn(t, f, A) {
    var y = f.year || 'n.d.', n = A.length;
    if (!n) {
      var st = short(f.title);
      return (t === 'book' || t === 'website' || t === 'video') ? '(*' + st + '*, ' + y + ')' : '("' + st + ',"' + ' ' + y + ')';
    }
    var s = n === 1 ? nm(A[0]) : n === 2 ? nm(A[0]) + ' & ' + nm(A[1]) : nm(A[0]) + ' et al.';
    return '(' + s + ', ' + y + ')';
  }

  /* ---------- MLA 9 ---------- */
  function mlaAuth(A) {
    var f0 = A[0].org || (A[0].last + (A[0].first ? ', ' + A[0].first : ''));
    if (A.length === 1) return f0;
    if (A.length === 2) return f0 + ', and ' + full(A[1]);
    return f0 + ', et al.';
  }
  function q(ti) { return '"' + (/[.?!]$/.test(ti) ? ti : ti + '.') + '"'; }
  function mla(t, f, A) {
    var ti = f.title || 'Title', head = (A.length && t !== 'video') ? end(mlaAuth(A)) : '';
    var date = '';
    if (f.year) {
      var p = [];
      if ((t === 'website' || t === 'newspaper' || t === 'video') && mnum(f)) { if (dnum(f)) p.push(dnum(f)); p.push(MS[mnum(f) - 1]); }
      p.push(f.year); date = p.join(' ');
    }
    var url = f.doi ? doiUrl(f.doi) : stripProto(f.url);
    var accessed = (f.accessed && f.url && t !== 'book' && t !== 'journal') ? 'Accessed ' + acc(f.accessed, MS) + '.' : '';
    var parts, out;
    if (t === 'book') {
      out = [head, end('*' + ti + '*'), end([f.edition ? ordinal(f.edition) + ' ed.' : '', f.publisher, f.year].filter(Boolean).join(', '))];
    } else if (t === 'website') {
      parts = [f.container ? '*' + f.container + '*' : '', f.publisher && f.publisher !== f.container ? f.publisher : '', date, url];
      out = [head, q(ti), end(parts.filter(Boolean).join(', ')), accessed];
    } else if (t === 'journal') {
      parts = ['*' + (f.container || 'Journal') + '*', f.volume ? 'vol. ' + f.volume : '', f.issue ? 'no. ' + f.issue : '', f.year, f.pages ? pp(f.pages) : '', url];
      out = [head, q(ti), end(parts.filter(Boolean).join(', '))];
    } else if (t === 'newspaper') {
      parts = ['*' + (f.container || 'Newspaper') + '*', date, f.pages ? pp(f.pages) : '', url];
      out = [head, q(ti), end(parts.filter(Boolean).join(', ')), accessed];
    } else {
      parts = ['*' + (f.container || 'YouTube') + '*', A.length ? 'uploaded by ' + full(A[0]) : '', date, url];
      out = [q(ti), end(parts.filter(Boolean).join(', ')), accessed];
    }
    return out.filter(Boolean).join(' ');
  }
  function mlaIn(t, f, A) {
    var n = A.length;
    if (!n) return '("' + short(f.title) + '")';
    return '(' + (n === 1 ? nm(A[0]) : n === 2 ? nm(A[0]) + ' and ' + nm(A[1]) : nm(A[0]) + ' et al.') + ')';
  }

  /* ---------- Harvard (Cite Them Right) ---------- */
  function harAuth(A) {
    var n = A.length;
    if (n === 1) return inv(A[0]);
    if (n === 2) return inv(A[0]) + ' and ' + inv(A[1]);
    if (n === 3) return inv(A[0]) + ', ' + inv(A[1]) + ' and ' + inv(A[2]);
    return inv(A[0]) + ' et al.';
  }
  function har(t, f, A) {
    var y = f.year || 'no date', au = A.length ? harAuth(A) : '', ti = f.title || 'Title';
    var italicT = (t === 'book' || t === 'website' || t === 'video');
    var tt = italicT ? '*' + ti + '*' : "'" + ti + "'";
    var lead = (au || tt) + ' (' + y + ')';
    var avail = f.url ? 'Available at: ' + f.url + (f.accessed ? ' (Accessed: ' + acc(f.accessed, MONTHS) + ')' : '') + '.' : '';
    var dm = '';
    if (mnum(f)) dm = (dnum(f) ? dnum(f) + ' ' : '') + MONTHS[mnum(f) - 1];
    var out;
    if (t === 'book') {
      out = [lead, au ? end('*' + ti + '*') : '', f.edition ? ordinal(f.edition) + ' edn.' : '', end(f.publisher)];
    } else if (t === 'website') {
      out = [lead, au ? end('*' + ti + '*') : '', f.container && f.container !== au ? end(f.container) : '', avail];
    } else if (t === 'video') {
      out = [lead, au ? end('*' + ti + '* [Video]') : '[Video].', end(f.container || 'YouTube'), avail];
    } else if (t === 'journal') {
      var j = '*' + (f.container || 'Journal') + '*' + (f.volume ? ', ' + f.volume : '') + (f.issue ? '(' + f.issue + ')' : '') + (f.pages ? ', ' + pp(f.pages) : '') + '.';
      out = [au ? lead + " '" + ti + "'," : lead, j, f.doi ? 'doi:' + doiRaw(f.doi) : avail];
    } else {
      var n = '*' + (f.container || 'Newspaper') + '*' + (dm ? ', ' + dm : '') + (f.pages ? ', ' + pp(f.pages) : '') + '.';
      out = [au ? lead + " '" + ti + "'," : lead, n, avail];
    }
    return out.filter(Boolean).join(' ');
  }
  function harIn(t, f, A) {
    var y = f.year || 'no date', n = A.length;
    if (!n) return '(' + short(f.title) + ', ' + y + ')';
    var s = n === 1 ? nm(A[0]) : n === 2 ? nm(A[0]) + ' and ' + nm(A[1]) : n === 3 ? nm(A[0]) + ', ' + nm(A[1]) + ' and ' + nm(A[2]) : nm(A[0]) + ' et al.';
    return '(' + s + ', ' + y + ')';
  }

  function build(st, t, f) {
    var A = parseNames(f.authors, f.org || t === 'video');
    if (st === 'mla') return { ref: mla(t, f, A), intext: mlaIn(t, f, A) };
    if (st === 'harvard') return { ref: har(t, f, A), intext: harIn(t, f, A) };
    return { ref: apa(t, f, A), intext: apaIn(t, f, A) };
  }

  /* ---------- UI ---------- */
  function read() {
    var f = { org: $('f_org').checked };
    FIELDS.forEach(function (k) {
      var el = $('f_' + k); f[k] = el ? (k === 'authors' ? el.value : clean(el.value)) : '';
    });
    f.accessed = $('f_accessed').value;
    return f;
  }
  function toast(msg) {
    var m = $('ctMsg'); m.textContent = msg; clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { m.textContent = ''; }, 2600);
  }
  function copy(html, plain, msg) {
    var done = function () { toast(msg || 'Copied'); };
    function old() {
      var ta = document.createElement('textarea'); ta.value = plain; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed, select the text and copy it.'); }
      document.body.removeChild(ta);
    }
    function plainOnly() {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(plain).then(done, old); else old();
    }
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        })]).then(done, plainOnly);
        return;
      }
    } catch (e) {}
    plainOnly();
  }
  function type() { return $('ctType').value; }

  function applyType() {
    var t = type(), show = SHOW[t];
    FIELDS.forEach(function (k) { var w = $('w_' + k); if (w) w.hidden = show.indexOf(k) < 0; });
    $('l_authors').textContent = LABELS[t].authors;
    $('l_container').textContent = LABELS[t].container;
    $('w_org').hidden = (t === 'video');
    update();
  }
  var cur = null;
  function update() {
    var f = read(), t = type();
    var has = f.title || f.authors.trim();
    if (!has) {
      cur = null;
      $('ctRef').innerHTML = '<span class="ct-ph">Your citation will appear here as you type.</span>';
      $('ctIn').innerHTML = '<span class="ct-ph">&mdash;</span>';
      return;
    }
    var r = build(style, t, f); cur = r;
    $('ctRef').innerHTML = toHtml(r.ref);
    $('ctIn').innerHTML = toHtml(r.intext);
  }
  function sortKey(s) { return toPlain(s).toLowerCase().replace(/^[^a-z0-9]+/, ''); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function load() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(v)) list = v; } catch (e) { list = []; } }
  function refs() {
    return list.map(function (it) { return { id: it.id, ref: build(style, it.t, it.f).ref }; })
      .sort(function (a, b) { var x = sortKey(a.ref), y = sortKey(b.ref); return x < y ? -1 : x > y ? 1 : 0; });
  }
  function renderList() {
    var box = $('ctList'), r = refs();
    $('ctCount').textContent = r.length ? '(' + r.length + ')' : '';
    $('ctListTools').hidden = !r.length;
    if (!r.length) { box.innerHTML = '<p class="ct-ph">No sources yet. Fill the form and tap <b>Add to list</b>.</p>'; return; }
    box.innerHTML = r.map(function (x) {
      return '<div class="ct-item"><div class="ct-ref">' + toHtml(x.ref) + '</div><button type="button" class="ct-x" data-id="' + x.id + '" aria-label="Remove">Remove</button></div>';
    }).join('');
  }
  function resetForm() {
    FIELDS.forEach(function (k) { var el = $('f_' + k); if (el && k !== 'accessed') el.value = ''; });
    $('f_org').checked = false; setToday(); update();
  }
  function setToday() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    $('f_accessed').value = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function listHtml() {
    return refs().map(function (x) {
      return '<p style="margin:0 0 10pt 0.5in;text-indent:-0.5in;line-height:1.6;font-family:\'Times New Roman\',serif;font-size:12pt">' + toHtml(x.ref) + '</p>';
    }).join('');
  }

  function init() {
    load();
    setToday();
    var form = $('ctForm');
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    $('ctType').addEventListener('change', applyType);
    document.querySelectorAll('.ct-seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        style = b.getAttribute('data-s');
        document.querySelectorAll('.ct-seg button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        update(); renderList();
      });
    });
    $('ctCopy').addEventListener('click', function () {
      if (!cur) return toast('Enter some details first.');
      copy('<p>' + toHtml(cur.ref) + '</p>', toPlain(cur.ref), 'Citation copied');
    });
    $('ctCopyIn').addEventListener('click', function () {
      if (!cur) return toast('Enter some details first.');
      copy('<span>' + toHtml(cur.intext) + '</span>', toPlain(cur.intext), 'In-text citation copied');
    });
    $('ctAdd').addEventListener('click', function () {
      var f = read();
      if (!f.title) return toast('Please enter the title first.');
      if (!f.authors.trim() && !confirm('No author entered. The citation will start with the title. Add anyway?')) return;
      list.push({ id: Date.now() + '' + Math.floor(Math.random() * 1000), t: type(), f: f });
      save(); renderList(); resetForm(); toast('Added to your reference list');
    });
    $('ctList').addEventListener('click', function (e) {
      var id = e.target && e.target.getAttribute && e.target.getAttribute('data-id');
      if (!id) return;
      list = list.filter(function (x) { return x.id !== id; }); save(); renderList();
    });
    $('ctCopyAll').addEventListener('click', function () {
      var r = refs(); if (!r.length) return;
      copy(listHtml(), r.map(function (x) { return toPlain(x.ref); }).join('\n\n'), 'Reference list copied');
    });
    $('ctWord').addEventListener('click', function () {
      var r = refs(); if (!r.length) return;
      var title = style === 'mla' ? 'Works Cited' : style === 'harvard' ? 'Reference List' : 'References';
      var doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' + title + '</title></head><body><h2 style="text-align:center;font-family:\'Times New Roman\',serif;font-size:14pt">' + title + '</h2>' + listHtml() + '</body></html>';
      var blob = new Blob(['\ufeff', doc], { type: 'application/msword' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = title.toLowerCase().replace(/\s+/g, '-') + '.doc';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    });
    $('ctClear').addEventListener('click', function () {
      if (list.length && confirm('Remove all sources from your list?')) { list = []; save(); renderList(); }
    });
    $('ctReset').addEventListener('click', resetForm);
    applyType(); renderList();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
