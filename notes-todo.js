/* Calvo Notepad: simple mobile-style notes. Saved on this device, works offline.
   Uses the same storage key as before, so older notes (and tasks) are kept. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  if (!$('ntApp')) return;
  var KEY = 'calvo_nt_v1';
  var db = { notes: [], tasks: [] }, cur = null, timer = 0;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && Array.isArray(o.notes)) db = { notes: o.notes, tasks: Array.isArray(o.tasks) ? o.tasks : [] };
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); $('ntMsg').textContent = ''; return true; }
    catch (e) { $('ntMsg').textContent = 'Could not save (storage full or blocked).'; return false; }
  }
  function fmt(ts) {
    var d = new Date(ts), n = new Date(), hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (d.toDateString() === n.toDateString()) return hm;
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== n.getFullYear() ? ' ' + d.getFullYear() : '');
  }
  function find(id) { for (var i = 0; i < db.notes.length; i++) if (db.notes[i].id === id) return db.notes[i]; return null; }

  function render() {
    var q = $('npSearch').value.trim().toLowerCase();
    var list = db.notes.slice().sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.updated || 0) - (a.updated || 0);
    }).filter(function (n) { return !q || ((n.title || '') + ' ' + (n.body || '')).toLowerCase().indexOf(q) >= 0; });
    if (!list.length) {
      $('npItems').innerHTML = '<div class="np-empty">' + (q ? 'No notes found.' : 'No notes yet.<br>Tap + to write your first note.') + '</div>';
      return;
    }
    $('npItems').innerHTML = list.map(function (n) {
      var body = (n.body || '').replace(/\s+/g, ' ').trim();
      var title = (n.title || '').trim() || body.slice(0, 40) || 'Untitled';
      return '<div class="np-row"><button type="button" class="np-item" data-id="' + esc(n.id) + '"><b>' + (n.pinned ? '\u{1F4CC} ' : '') + esc(title) + '</b>' +
        '<span><small>' + fmt(n.updated || Date.now()) + '</small>' + esc(body.slice(0, 80) || 'No additional text') + '</span></button><button type="button" class="np-sh" data-share="' + esc(n.id) + '">Share</button></div>';
    }).join('');
  }

  function openEditor(n) {
    cur = n; document.body.style.overflow = 'hidden';
    $('npBody').value = (n.title || '') + (n.body ? '\n' + n.body : '');
    $('npSaved').textContent = '';
    $('npList').hidden = true; $('npEd').hidden = false;
    $('npBody').focus();
    window.scrollTo(0, 0);
  }
  function flush() {
    clearTimeout(timer); timer = 0;
    if (!cur) return;
    var v = $('npBody').value, i = v.indexOf('\n');
    cur.title = (i < 0 ? v : v.slice(0, i)).slice(0, 100); cur.body = i < 0 ? '' : v.slice(i + 1); cur.updated = Date.now();
    if (db.notes.indexOf(cur) < 0) { if (!cur.title.trim() && !cur.body.trim()) return; db.notes.push(cur); }
    if (save()) { $('npSaved').textContent = 'Saved'; }
  }
  function queue() { $('npSaved').textContent = '...'; clearTimeout(timer); timer = setTimeout(flush, 400); }
  function closeEditor() {
    flush();
    if (cur && !cur.title.trim() && !cur.body.trim()) { db.notes = db.notes.filter(function (x) { return x !== cur; }); save(); }
    cur = null; document.body.style.overflow = ''; $('npEd').hidden = true; $('npList').hidden = false; render();
  }

  $('npNew').addEventListener('click', function () { openEditor({ id: uid(), title: '', body: '', updated: Date.now() }); });
  function toast(m) {
    var t = document.createElement('div'); t.className = 'np-toast'; t.textContent = m; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }
  function shareNote(title, body) {
    title = (title || '').trim(); body = body || '';
    var text = (title ? title + '\n' : '') + body;
    if (!text.trim()) { toast('Note is empty'); return; }
    if (navigator.share) {
      navigator.share({ title: title || 'Note', text: text }).catch(function () {});
      return;
    }
    var done = function () { toast('Copied. Paste it in WhatsApp or anywhere.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast('Could not copy'); });
    else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (x) { toast('Could not copy'); } ta.remove(); }
  }
  $('npShare').addEventListener('click', function () {
    var v = $('npBody').value, i = v.indexOf('\n');
    shareNote(i < 0 ? v : v.slice(0, i), i < 0 ? '' : v.slice(i + 1));
  });
  $('npItems').addEventListener('click', function (e) {
    var sh = e.target.closest ? e.target.closest('.np-sh') : null;
    if (sh) { var m = find(sh.getAttribute('data-share')); if (m) shareNote(m.title, m.body); return; }
    var b = e.target.closest ? e.target.closest('.np-item') : null;
    if (b) { var n = find(b.getAttribute('data-id')); if (n) openEditor(n); }
  });
  $('npSearch').addEventListener('input', render);
  $('npBody').addEventListener('input', queue);
  $('npBack').addEventListener('click', closeEditor);
  $('npDel').addEventListener('click', function () {
    if (!cur) return;
    if (!confirm('Delete this note?')) return;
    clearTimeout(timer);
    db.notes = db.notes.filter(function (x) { return x !== cur; }); save();
    cur = null; document.body.style.overflow = ''; $('npEd').hidden = true; $('npList').hidden = false; render();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);

  load(); render();
})();
