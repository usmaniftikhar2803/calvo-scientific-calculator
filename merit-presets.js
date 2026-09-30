/* Calvo — merit / aggregate calculator engine
   Shared by aggregate-calculator.html and the MDCAT / ECAT / NUST / FAST pages.
   Weightages change between admission cycles: every preset is editable in the UI
   and every page tells the student to confirm with the official notice. */
(function () {
  var PRESETS = {
    custom: {
      label: 'Custom (your own weights)',
      hint: 'Example weights (10 / 40 / 50). Replace them with the weightage from your university\'s prospectus.',
      rows: [
        { n: 'Matric', t: '', w: 10 },
        { n: 'Intermediate', t: '', w: 40 },
        { n: 'Entry test', t: '', w: 50, test: true }
      ]
    },
    mdcat: {
      label: 'MDCAT (MBBS / BDS)',
      hint: 'PMDC formula: 10% Matric + 40% FSc + 50% MDCAT. MDCAT is marked out of 180. Use your full FSc (Part I + II) marks.',
      rows: [
        { n: 'Matric (SSC)', t: 1100, w: 10 },
        { n: 'FSc (HSSC)', t: 1100, w: 40 },
        { n: 'MDCAT', t: 180, w: 50, test: true }
      ]
    },
    nums: {
      label: 'NUMS (Army medical, no Matric)',
      hint: 'NUMS ranks on FSc 50% + NUMS test 50% (no Matric). Enter the test total shown on your NUMS result card.',
      rows: [
        { n: 'FSc (HSSC)', t: 1100, w: 50 },
        { n: 'NUMS test', t: '', w: 50, test: true }
      ]
    },
    ecat: {
      label: 'ECAT / UET Lahore (engineering)',
      hint: 'UET Lahore (Fall 2026): 17% Matric + 50% FSc Part-I + 33% ECAT. ECAT is out of 400. Use FSc Part-I marks, and the Part-I total printed on your result card.',
      rows: [
        { n: 'Matric (SSC)', t: 1100, w: 17 },
        { n: 'FSc Part-I', t: '', w: 50 },
        { n: 'ECAT', t: 400, w: 33, test: true }
      ]
    },
    nust: {
      label: 'NUST NET (engineering / computing)',
      hint: 'NUST: 10% Matric + 15% FSc (HSSC) + 75% NET. NET is out of 200. NUST uses FSc Part-I if Part-II is not out yet.',
      rows: [
        { n: 'Matric (SSC)', t: 1100, w: 10 },
        { n: 'FSc (HSSC)', t: '', w: 15 },
        { n: 'NET', t: 200, w: 75, test: true }
      ]
    },
    fast: {
      label: 'FAST-NU (computing / business)',
      hint: 'FAST-NU computing & business: 10% Matric + 40% FSc + 50% NU test. The NU test is out of 100.',
      rows: [
        { n: 'Matric (SSC)', t: 1100, w: 10 },
        { n: 'FSc (HSSC)', t: '', w: 40 },
        { n: 'NU test', t: 100, w: 50, test: true }
      ]
    },
    fasteng: {
      label: 'FAST-NU (engineering)',
      hint: 'FAST-NU engineering programs are listed with 17% Matric + 50% FSc + 33% test. Check your program in the FAST prospectus.',
      rows: [
        { n: 'Matric (SSC)', t: 1100, w: 17 },
        { n: 'FSc (HSSC)', t: '', w: 50 },
        { n: 'FAST test', t: 100, w: 33, test: true }
      ]
    }
  };

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(x) { return (Math.round(x * 100) / 100).toFixed(2); }

  var current = 'custom';

  function addRow(n, t, w, isTest, ph) {
    var d = document.createElement('div');
    d.className = 'subj';
    d.style.gridTemplateColumns = 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto';
    if (isTest) d.setAttribute('data-test', '1');
    d.innerHTML =
      '<input placeholder="Name" aria-label="Name">' +
      '<input type="number" step="any" min="0" placeholder="Obtained" aria-label="Obtained marks" inputmode="decimal">' +
      '<input type="number" step="any" min="0" placeholder="' + (ph || 'Total') + '" aria-label="Total marks" inputmode="decimal">' +
      '<input type="number" step="any" min="0" placeholder="Weight %" aria-label="Weightage percent" inputmode="decimal">' +
      '<button class="btn ghost" title="Remove" aria-label="Remove row">&times;</button>';
    d.children[0].value = n || '';
    d.children[2].value = t === undefined || t === null ? '' : t;
    d.children[3].value = w === undefined || w === null ? '' : w;
    d.lastChild.onclick = function () { d.remove(); };
    $('rows').appendChild(d);
  }

  function loadPreset(id) {
    var p = PRESETS[id] || PRESETS.custom;
    current = PRESETS[id] ? id : 'custom';
    $('rows').innerHTML = '';
    p.rows.forEach(function (r) {
      addRow(r.n, r.t, r.w, r.test, r.t === '' ? 'Total (see result card)' : 'Total');
    });
    if ($('presetHint')) $('presetHint').textContent = p.hint;
    var out = $('out');
    out.className = 'result empty';
    out.textContent = 'Your aggregate will appear here.';
    if ($('needOut')) { $('needOut').className = 'result empty'; $('needOut').textContent = 'Enter a target aggregate and press the button.'; }
  }

  function readRows() {
    var rows = [];
    document.querySelectorAll('#rows .subj').forEach(function (r) {
      rows.push({
        name: r.children[0].value || 'Row',
        o: parseFloat(r.children[1].value),
        t: parseFloat(r.children[2].value),
        w: parseFloat(r.children[3].value),
        test: r.getAttribute('data-test') === '1'
      });
    });
    return rows;
  }

  function bonus() {
    var b = $('bonus') ? parseFloat($('bonus').value) : 0;
    return isNaN(b) ? 0 : b;
  }

  function calculate() {
    var out = $('out'), rows = readRows(), tot = 0, wsum = 0, lines = [], warns = [];
    rows.forEach(function (r) {
      if (isNaN(r.o) || isNaN(r.t) || r.t <= 0 || isNaN(r.w)) return;
      if (r.o > r.t) { warns.push(r.name + ': obtained marks are more than total marks.'); return; }
      var c = r.o / r.t * r.w;
      tot += c; wsum += r.w;
      lines.push(esc(r.name) + ': ' + fmt(r.o / r.t * 100) + '% x ' + r.w + '% = ' + fmt(c));
    });
    if (!lines.length) {
      out.className = 'result empty';
      out.innerHTML = esc(warns.join('\n') || 'Fill in obtained marks, total marks and weightage for at least one row.');
      return;
    }
    var b = bonus();
    if (b) { tot += b; lines.push('Bonus marks: +' + fmt(b)); }
    var label = PRESETS[current] ? PRESETS[current].label : 'Aggregate';
    var msg = 'My ' + label.split(' (')[0] + ' aggregate is ' + fmt(tot) + '% - calculated on Calvo: https://calvoscientificcalculator.online/aggregate-calculator.html';
    var html = lines.join('\n') + '\n\nAggregate: <span class="big">' + fmt(tot) + '%</span>';
    if (warns.length) html += '\n<b>Note:</b> ' + esc(warns.join(' '));
    if (Math.abs(wsum - 100) > 0.001) html += '\n<b>Note:</b> the weightages you entered add up to ' + wsum + ', not 100.';
    html += '\n<a class="share" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">Share on WhatsApp</a>';
    out.className = 'result';
    out.innerHTML = html;
  }

  /* Reverse calculator: how many test marks do I need for a target aggregate? */
  function need() {
    var out = $('needOut'), target = parseFloat($('target').value), rows = readRows();
    var test = rows.filter(function (r) { return r.test; })[0];
    var fail = function (m) { out.className = 'result empty'; out.textContent = m; };
    if (isNaN(target)) return fail('Enter your target aggregate first, for example 85.');
    if (!test) return fail('Pick MDCAT, ECAT, NUST or FAST above so Calvo knows which row is the entry test.');
    if (isNaN(test.t) || test.t <= 0 || isNaN(test.w) || test.w <= 0) return fail('Enter the total marks and weightage of the entry test row.');
    var others = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.test) continue;
      if (isNaN(r.o) || isNaN(r.t) || r.t <= 0 || isNaN(r.w)) return fail('Fill in obtained marks, total and weight for "' + r.name + '" first.');
      others += r.o / r.t * r.w;
    }
    var have = others + bonus();
    var needContribution = target - have;
    var needPct = needContribution / test.w * 100;
    var needMarks = needPct / 100 * test.t;
    var html;
    if (needMarks <= 0) {
      html = 'Your other marks alone already give <b>' + fmt(have) + '%</b>. You reach ' + fmt(target) + '% even with a very low test score.';
    } else if (needMarks > test.t) {
      html = 'Not reachable. Even full marks in the test give <b>' + fmt(have + test.w) + '%</b>, which is below ' + fmt(target) + '%.';
    } else {
      html = 'Your other marks give <b>' + fmt(have) + '%</b>.\nFor ' + fmt(target) + '% you need about <span class="big">' + Math.ceil(needMarks) + ' / ' + test.t + '</span> in the ' + esc(test.name) + ' (' + fmt(needPct) + '%).';
    }
    out.className = 'result';
    out.innerHTML = html;
  }

  window.MeritCalc = {
    presets: PRESETS,
    init: function (presetId) {
      var sel = $('preset');
      if (sel) {
        Object.keys(PRESETS).forEach(function (k) {
          var o = document.createElement('option');
          o.value = k; o.textContent = PRESETS[k].label;
          sel.appendChild(o);
        });
        sel.value = presetId || 'custom';
        sel.onchange = function () { loadPreset(sel.value); };
      }
      loadPreset(presetId || 'custom');
      $('add').onclick = function () { addRow(); };
      $('go').onclick = calculate;
      if ($('needGo')) $('needGo').onclick = need;
    }
  };
})();
