/* Exam datesheet and countdown planner. Runs in the browser, data stays on the device. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'calvo_exams_v1', DUR = 3;
  var LEADS = [0, 15, 30, 60, 180, 720, 1440];
  var S = { title: '', exams: [], alarm: { on: true, lead: 30, notify: false, wake: false } }, editId = null, showDone = false, toastT;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function sod(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function dayDiff(a, b) { return Math.round((sod(a) - sod(b)) / 864e5); }
  function when(e) {
    var p = e.date.split('-'), h = 0, m = 0;
    if (e.time) { var q = e.time.split(':'); h = +q[0]; m = +q[1]; }
    return new Date(+p[0], +p[1] - 1, +p[2], h, m, 0);
  }
  function fmtDate(e) { return when(e).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  function fmtTime(t) { if (!t) return ''; var q = t.split(':'), h = +q[0], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + q[1] + ' ' + ap; }
  function sorted() { return S.exams.slice().sort(function (a, b) { return when(a) - when(b); }); }
  function parts(ms) { var s = Math.floor(ms / 1000); return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; }

  function state(e, now) {
    var t = when(e);
    if (e.time) {
      var ms = t - now;
      if (ms > 0) return { k: 'up', ms: ms, dd: dayDiff(t, now) };
      return (now - t < DUR * 36e5) ? { k: 'live' } : { k: 'done' };
    }
    var dd = dayDiff(t, now);
    return dd > 0 ? { k: 'up', dd: dd } : dd === 0 ? { k: 'today' } : { k: 'done' };
  }
  function finished(e, now) { return e.done || state(e, now).k === 'done'; }
  function label(e, now) {
    var st = state(e, now);
    if (e.done) return 'Done';
    if (st.k === 'live') return 'In progress';
    if (st.k === 'today') return 'Today';
    if (st.k === 'done') return 'Finished';
    if (e.time) { var p = parts(st.ms); return (p.d ? p.d + 'd ' : '') + p.h + 'h ' + p.m + 'm'; }
    return st.dd === 1 ? 'Tomorrow' : st.dd + ' days left';
  }
  function nextExam(now) {
    var l = sorted();
    for (var i = 0; i < l.length; i++) if (!finished(l[i], now)) return l[i];
    return null;
  }

  function heroHtml(now) {
    var n = nextExam(now);
    if (!n) return '<div class="ep-hl">Next exam</div><div class="ep-hs">No upcoming exams</div><div class="ep-hd">Add your first subject to start the countdown.</div>';
    var st = state(n, now), inner;
    var box = function (v, l) { return '<div class="ep-b"><b>' + v + '</b><span>' + l + '</span></div>'; };
    if (st.k === 'live') inner = '<div class="ep-big">In progress</div>';
    else if (st.k === 'today') inner = '<div class="ep-big">Today!</div>';
    else if (n.time) { var p = parts(st.ms); inner = box(p.d, 'Days') + box(pad(p.h), 'Hours') + box(pad(p.m), 'Minutes') + box(pad(p.s), 'Seconds'); }
    else inner = box(st.dd, st.dd === 1 ? 'Day' : 'Days');
    return '<div class="ep-hl">Next exam</div><div class="ep-hs">' + esc(n.subject) + '</div><div class="ep-hd">' + esc(fmtDate(n)) +
      (n.time ? ' &middot; ' + fmtTime(n.time) : '') + (n.venue ? ' &middot; ' + esc(n.venue) : '') + '</div>' + alarmLine(n, now) + '<div class="ep-bx">' + inner + '</div>';
  }

  function rowHtml(e, prev, now) {
    var st = state(e, now), gap = '';
    if (prev) {
      var g = dayDiff(when(e), when(prev));
      gap = g === 0 ? 'Same day as previous exam' : g === 1 ? 'Back-to-back with previous exam' : (g - 1) + ' free day' + (g - 1 === 1 ? '' : 's') + ' after previous exam';
    }
    var k = e.done ? 'done' : st.k;
    return '<div class="ep-row ' + (finished(e, now) ? 'is-done' : '') + '">' +
      '<label class="ep-ck" title="Mark as done"><input type="checkbox" data-act="done" data-id="' + e.id + '"' + (e.done ? ' checked' : '') + '></label>' +
      '<div class="ep-m"><b>' + esc(e.subject) + '</b><span>' + esc(fmtDate(e)) + (e.time ? ' &middot; ' + fmtTime(e.time) : '') + (e.venue ? ' &middot; ' + esc(e.venue) : '') + '</span>' +
      (e.notes ? '<span class="ep-n">' + esc(e.notes) + '</span>' : '') + (gap ? '<span class="ep-g">' + gap + '</span>' : '') + '</div>' +
      '<div class="ep-r"><span class="ep-cd" data-id="' + e.id + '" data-k="' + k + '">' + label(e, now) + '</span>' +
      '<span class="ep-bt ep-np"><button type="button" data-act="bell" data-id="' + e.id + '" aria-pressed="' + (e.alarm !== false) + '">' + (e.alarm !== false ? 'Alarm on' : 'Alarm off') + '</button><button type="button" data-act="edit" data-id="' + e.id + '">Edit</button><button type="button" class="del" data-act="del" data-id="' + e.id + '">Delete</button></span></div></div>';
  }

  function render() {
    var now = new Date(), l = sorted();
    var up = [], dn = [];
    l.forEach(function (e) {
      var g = finished(e, now) ? dn : up;
      g.push({ e: e, prev: g.length ? g[g.length - 1].e : null });
    });
    var html = up.map(function (r) { return rowHtml(r.e, r.prev, now); }).join('');
    if (!up.length) html = '<p class="ep-ph">' + (l.length ? 'All exams are finished. Good luck with the results!' : 'No exams added yet. Use the form to add your first subject.') + '</p>';
    if (dn.length) {
      html += '<button type="button" class="ep-tg ep-np" id="epTg">' + (showDone ? 'Hide' : 'Show') + ' finished exams (' + dn.length + ')</button>';
      if (showDone) html += dn.map(function (r) { return rowHtml(r.e, r.prev, now); }).join('');
    }
    $('epList').innerHTML = html;
    $('epHero').innerHTML = heroHtml(now);
    $('epTotal').textContent = l.length;
    $('epLeft').textContent = up.length;
    $('epDone').textContent = dn.length;
    var n = nextExam(now), nd = '\u2014';
    if (n) { var s = state(n, now); nd = s.k === 'today' || s.k === 'live' ? 'Today' : s.dd + 'd'; }
    $('epNext').textContent = nd;
    $('epTools').hidden = !l.length;
    $('epPrintTitle').textContent = S.title || 'Exam Datesheet';
  }
  function tick() {
    var now = new Date(), changed = false;
    var els = document.querySelectorAll('.ep-cd');
    for (var i = 0; i < els.length; i++) {
      var e = byId(els[i].getAttribute('data-id')); if (!e) continue;
      var k = e.done ? 'done' : state(e, now).k;
      if (k !== els[i].getAttribute('data-k')) { changed = true; break; }
      var t = label(e, now); if (els[i].textContent !== t) els[i].textContent = t;
    }
    checkAlarms(now);
    if (changed) { render(); return; }
    $('epHero').innerHTML = heroHtml(now);
  }
  function byId(id) { for (var i = 0; i < S.exams.length; i++) if (S.exams[i].id === id) return S.exams[i]; return null; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && Array.isArray(v.exams)) { S.title = String(v.title || '');
        if (v.alarm && typeof v.alarm === 'object') { S.alarm.on = v.alarm.on !== false; S.alarm.lead = LEADS.indexOf(+v.alarm.lead) > -1 ? +v.alarm.lead : 30; S.alarm.notify = !!v.alarm.notify; S.alarm.wake = !!v.alarm.wake; }
        S.exams = v.exams.filter(function (e) { return e && e.id && e.subject && /^\d{4}-\d{2}-\d{2}$/.test(e.date); }); }
    } catch (e) {}
  }
  function toast(m) { var el = $('epMsg'); el.textContent = m; clearTimeout(toastT); toastT = setTimeout(function () { el.textContent = ''; }, 2600); }

  function clearForm() {
    ['epSubject', 'epDate', 'epTime', 'epVenue', 'epNotes'].forEach(function (i) { $(i).value = ''; });
    editId = null; $('epAdd').textContent = 'Add exam'; $('epCancel').hidden = true;
  }
  function submit() {
    var subject = $('epSubject').value.replace(/\s+/g, ' ').trim(), date = $('epDate').value;
    if (!subject) return toast('Please enter the subject name.');
    if (!date) return toast('Please choose the exam date.');
    var rec = { subject: subject, date: date, time: $('epTime').value, venue: $('epVenue').value.trim(), notes: $('epNotes').value.trim() };
    var nowS = new Date();
    if (editId) { var e = byId(editId); if (e) { for (var k in rec) e[k] = rec[k]; e.done = false; e.fired = nowS >= alarmAt(e); } toast('Exam updated'); }
    else { rec.id = Date.now() + '' + Math.floor(Math.random() * 1000); rec.done = false; rec.alarm = true; rec.fired = nowS >= alarmAt(rec); S.exams.push(rec); toast('Exam added'); }
    save(); clearForm(); render();
  }
  function plain() {
    var out = [S.title || 'Exam Datesheet', ''];
    sorted().forEach(function (e, i) {
      out.push((i + 1) + '. ' + e.subject + ' - ' + fmtDate(e) + (e.time ? ', ' + fmtTime(e.time) : '') + (e.venue ? ', ' + e.venue : ''));
    });
    return out.join('\n');
  }
  function copy(text, msg) {
    var done = function () { toast(msg); };
    function old() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, old); else old();
  }
  function ics() {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Calvo//Exam Planner//EN', 'CALSCALE:GREGORIAN'];
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var e2 = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); };
    var f = function (d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); };
    S.exams.forEach(function (e) {
      var t = when(e);
      L.push('BEGIN:VEVENT', 'UID:' + e.id + '@calvoscientificcalculator.online', 'DTSTAMP:' + stamp);
      if (e.time) { var en = new Date(t.getTime() + DUR * 36e5); L.push('DTSTART:' + f(t) + 'T' + pad(t.getHours()) + pad(t.getMinutes()) + '00', 'DTEND:' + f(en) + 'T' + pad(en.getHours()) + pad(en.getMinutes()) + '00'); }
      else { var nx = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1); L.push('DTSTART;VALUE=DATE:' + f(t), 'DTEND;VALUE=DATE:' + f(nx)); }
      L.push('SUMMARY:' + e2('Exam: ' + e.subject));
      if (e.venue) L.push('LOCATION:' + e2(e.venue));
      if (e.notes) L.push('DESCRIPTION:' + e2(e.notes));
      L.push('BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + e2('Exam tomorrow: ' + e.subject), 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    var blob = new Blob([L.join('\r\n')], { type: 'text/calendar' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'exam-datesheet.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }


  /* ---------- alarm ---------- */
  var ctx = null, ring = null, ringStop = null, wl = null;
  function leadText(m) { return m === 0 ? 'at the start' : m < 60 ? m + ' minutes before' : m < 1440 ? (m / 60) + ' hour' + (m === 60 ? '' : 's') + ' before' : '1 day before'; }
  function alarmAt(e) {
    var b = when(e); if (!e.time) b = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 9, 0, 0);
    return new Date(b.getTime() - S.alarm.lead * 60000);
  }
  function alarmLine(n, now) {
    if (!S.alarm.on || n.alarm === false) return '<div class="ep-hd ep-al">Alarm is off for this exam</div>';
    var a = alarmAt(n), same = dayDiff(a, now) === 0;
    var t = a.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
    return '<div class="ep-hd ep-al">Alarm ' + (a > now ? 'rings ' + (same ? 'today' : a.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })) + ' at ' + t : 'already rang') + ' (' + leadText(S.alarm.lead) + ')</div>';
  }
  function resync() { var now = new Date(); S.exams.forEach(function (e) { e.fired = now >= alarmAt(e); }); }
  function unlock() {
    try {
      if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  }
  function beep(t0, f, d) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.45, t0 + 0.02); g.gain.linearRampToValueAtTime(0, t0 + d);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + d + 0.05);
  }
  function pattern() {
    try { if (ctx) { var t = ctx.currentTime; beep(t, 880, 0.18); beep(t + 0.25, 880, 0.18); beep(t + 0.5, 1175, 0.32); } } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) {}
  }
  function stopRing() {
    clearInterval(ring); clearTimeout(ringStop); ring = ringStop = null;
    try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) {}
    $('epAlarm').hidden = true;
  }
  function startRing(title, sub) {
    unlock(); stopRing();
    $('epAlT').textContent = title; $('epAlS').textContent = sub; $('epAlarm').hidden = false;
    pattern(); ring = setInterval(pattern, 1600); ringStop = setTimeout(stopRing, 60000);
  }
  function fire(e, now) {
    var t = when(e), sub;
    if (e.time) { var m = Math.round((t - now) / 60000); sub = m > 0 ? 'starts in ' + (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min') : 'has started'; }
    else { var dd = dayDiff(t, now); sub = dd <= 0 ? 'is today' : dd === 1 ? 'is tomorrow' : 'is in ' + dd + ' days'; }
    startRing('Exam: ' + e.subject, fmtDate(e) + (e.time ? ', ' + fmtTime(e.time) : '') + ' \u2013 ' + sub);
    try { if (S.alarm.notify && window.Notification && Notification.permission === 'granted') new Notification('Exam: ' + e.subject, { body: sub.charAt(0).toUpperCase() + sub.slice(1) }); } catch (x) {}
  }
  function checkAlarms(now) {
    if (!S.alarm.on || ring) return;
    for (var i = 0; i < S.exams.length; i++) {
      var e = S.exams[i];
      if (e.done || e.alarm === false || e.fired) continue;
      if (now >= alarmAt(e)) {
        e.fired = true; save();
        if (!finished(e, now)) { fire(e, now); }
        return;
      }
    }
  }
  function wake() {
    try {
      if (S.alarm.on && S.alarm.wake && navigator.wakeLock && document.visibilityState === 'visible' && !wl) {
        navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }, function () {});
      } else if (!S.alarm.wake && wl) { wl.release(); wl = null; }
    } catch (e) {}
  }
  function bindAlarm() {
    $('epAlOn').checked = S.alarm.on; $('epAlLead').value = String(S.alarm.lead);
    $('epAlNotify').checked = S.alarm.notify; $('epAlWake').checked = S.alarm.wake;
    $('epAlOn').addEventListener('change', function () { S.alarm.on = this.checked; if (S.alarm.on) { unlock(); resync(); } else stopRing(); save(); render(); wake(); });
    $('epAlLead').addEventListener('change', function () { S.alarm.lead = +this.value; resync(); save(); render(); });
    $('epAlNotify').addEventListener('change', function () {
      S.alarm.notify = this.checked; save();
      if (this.checked) {
        if (!window.Notification) { toast('Notifications are not supported on this browser.'); this.checked = false; S.alarm.notify = false; save(); }
        else if (Notification.permission === 'default') Notification.requestPermission();
        else if (Notification.permission === 'denied') { toast('Notifications are blocked in your browser settings.'); }
      }
    });
    $('epAlWake').addEventListener('change', function () { S.alarm.wake = this.checked; save(); wake(); });
    $('epAlTest').addEventListener('click', function () { startRing('Test alarm', 'If you can hear this, your alarm will work.'); });
    $('epAlStop').addEventListener('click', stopRing);
    document.addEventListener('visibilitychange', wake);
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock, { passive: true });
  }

  function init() {
    load();
    bindAlarm();
    $('epTitle').value = S.title;
    $('epTitle').addEventListener('input', function () { S.title = this.value.trim(); save(); $('epPrintTitle').textContent = S.title || 'Exam Datesheet'; });
    $('epAdd').addEventListener('click', submit);
    $('epCancel').addEventListener('click', clearForm);
    $('epForm').addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') { ev.preventDefault(); submit(); } });
    $('epList').addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.id === 'epTg') { showDone = !showDone; render(); return; }
      var act = t.getAttribute && t.getAttribute('data-act'), id = t.getAttribute && t.getAttribute('data-id');
      if (!act || act === 'done') return;
      var e = byId(id); if (!e) return;
      if (act === 'bell') { e.alarm = (e.alarm === false); e.fired = new Date() >= alarmAt(e); save(); render(); unlock(); return; }
      if (act === 'del') { if (confirm('Delete "' + e.subject + '"?')) { S.exams = S.exams.filter(function (x) { return x.id !== id; }); save(); render(); } }
      if (act === 'edit') {
        editId = id; $('epSubject').value = e.subject; $('epDate').value = e.date; $('epTime').value = e.time || '';
        $('epVenue').value = e.venue || ''; $('epNotes').value = e.notes || '';
        $('epAdd').textContent = 'Save changes'; $('epCancel').hidden = false; $('epSubject').focus();
        if ($('epForm').scrollIntoView) $('epForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    $('epList').addEventListener('change', function (ev) {
      var t = ev.target; if (t.getAttribute('data-act') !== 'done') return;
      var e = byId(t.getAttribute('data-id')); if (e) { e.done = t.checked; save(); render(); }
    });
    $('epCopy').addEventListener('click', function () { copy(plain(), 'Datesheet copied'); });
    $('epIcs').addEventListener('click', ics);
    $('epPrint').addEventListener('click', function () { window.print(); });
    $('epClear').addEventListener('click', function () {
      if (S.exams.length && confirm('Delete all exams from this planner?')) { S.exams = []; save(); clearForm(); render(); }
    });
    render();
    setInterval(tick, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
