/* Calvo premium layer: live LCD readout + tile spotlight. Self-contained, touches no existing logic. */
(function () {
  'use strict';

  /* ---- Safe expression evaluator (whitelist only, no identifiers except known functions) ---- */
  var FN = { sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', asin: 'Math.asin', acos: 'Math.acos', atan: 'Math.atan',
             sqrt: 'Math.sqrt', cbrt: 'Math.cbrt', abs: 'Math.abs', ln: 'Math.log', log: 'Math.log10', exp: 'Math.exp' };
  function evaluate(src) {
    var s = src.trim().toLowerCase();
    if (!s) return { empty: true };
    s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '**').replace(/π/g, 'pi');
    s = s.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
    // only numbers, operators, parens, commas and whitelisted names may remain
    var stripped = s.replace(/[a-z]+/g, function (w) { return (FN[w] || w === 'pi' || w === 'e') ? '' : '#'; });
    if (/[^0-9+\-*/().,\s]/.test(stripped)) return { error: true };
    s = s.replace(/(\d|\))\s*([a-z(])/g, '$1*$2');                // 2(3), 2pi, 2sin(x)
    s = s.replace(/[a-z]+/g, function (w) { return w === 'pi' ? 'Math.PI' : w === 'e' ? 'Math.E' : FN[w]; });
    try {
      var v = Function('"use strict"; return (' + s + ')')();
      if (typeof v !== 'number' || !isFinite(v)) return { error: true };
      var r = Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(6).replace(/\.?0+e/, 'e') : +v.toPrecision(12);
      return { value: String(r) };
    } catch (e) { return { error: true }; }
  }

  function initReadout() {
    var inp = document.getElementById('pIn'), out = document.getElementById('pOut');
    if (!inp || !out) return;
    function run() {
      var r = evaluate(inp.value);
      out.classList.toggle('err', !!r.error);
      out.textContent = r.empty ? '0' : r.error ? 'keep typing…' : r.value;
    }
    inp.addEventListener('input', run);
    document.querySelectorAll('.p-chip').forEach(function (c) {
      c.addEventListener('click', function () { inp.value = c.getAttribute('data-expr'); run(); inp.focus(); });
    });
    run();
  }

  /* ---- Cursor spotlight on tiles, links and result cells (sets --mx / --my, cosmetic only).
          Delegated, so it also covers cards the app renders later. ---- */
  var SPOT = '.home-big, .p-pick, .subject-tile, .merit-link, .subject-tool-row, .stats-result-cell';
  function initSpotlight() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    document.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest(SPOT);
      if (!t) return;
      var b = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - b.left) + 'px');
      t.style.setProperty('--my', (e.clientY - b.top) + 'px');
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initReadout(); initSpotlight(); });
  else { initReadout(); initSpotlight(); }
})();

/* ==========================================================
   Student welcome, 3D keys, "Picked for you".
   Remembers only a first name and a class in localStorage (this device).
   ========================================================== */
(function () {
  'use strict';
  var KEY = 'calvo_profile';
  var LEVELS = [
    { id: 'matric', t: 'Matric', s: '9th and 10th class', title: 'Matric students',
      picks: [['Class-wise Formulas', 'Every formula by class', 'class-wise-formulas.html'], ['9th Class Physics', 'Formulas and units', '9th-class-physics-formulas.html'],
              ['9th Class Math', 'Formulas and examples', '9th-class-math-formulas.html'], ['Marks to Percentage', 'Subject-wise result', 'marks-percentage-calculator.html'],
              ['Periodic Table', 'All elements', 'periodic-table.html'], ['Quadratic Solver', 'Roots with steps', 'quadratic-equation-solver.html']] },
    { id: 'eng', t: 'FSc Pre-Engineering', s: 'ECAT, NUST, FAST', title: 'FSc Pre-Engineering students',
      picks: [['ECAT Aggregate', 'Check your merit', 'ecat-aggregate-calculator.html'], ['NUST Aggregate', 'NET and FSc marks', 'nust-aggregate-calculator.html'],
              ['FAST Aggregate', 'FAST-NU merit', 'fast-aggregate-calculator.html'], ['Physics Formulas', '1st year', '1st-year-physics-formulas.html'],
              ['Math Formulas', '1st year', '1st-year-math-formulas.html'], ['Derivative Calculator', 'Steps included', 'derivative-calculator.html']] },
    { id: 'med', t: 'FSc Pre-Medical', s: 'MDCAT', title: 'FSc Pre-Medical students',
      picks: [['MDCAT Aggregate', 'Check your merit', 'mdcat-aggregate-calculator.html'], ['Biology Formulas', 'FSc biology', 'fsc-biology-formulas.html'],
              ['Chemistry Formulas', 'FSc chemistry', 'fsc-chemistry-formulas.html'], ['Equation Balancer', 'Balance in one tap', 'chemical-equation-balancer.html'],
              ['Molar Mass', 'Any compound', 'molar-mass-calculator.html'], ['Periodic Table', 'All elements', 'periodic-table.html']] },
    { id: 'ics', t: 'ICS / FA', s: 'Computer science, general', title: 'ICS and FA students',
      picks: [['Computer Science Formulas', 'FSc ICS', 'fsc-computer-science-formulas.html'], ['Truth Table and K-Map', 'Logic made easy', 'truth-table-kmap.html'],
              ['Programmer', 'Binary, octal and hex', null, 'programmer'], ['Aggregate Calculator', 'Admission merit', 'aggregate-calculator.html'],
              ['Math Formulas', '1st year', '1st-year-math-formulas.html'], ['Image to PDF', 'Photos to one PDF', 'image-to-pdf.html']] },
    { id: 'uni', t: 'University', s: 'CGPA, assignments, CV', title: 'University students',
      picks: [['CGPA Calculator', 'All semesters', 'cgpa-calculator.html'], ['GPA Calculator', 'One semester', 'gpa-calculator.html'],
              ['Target CGPA', 'What you need next', 'target-cgpa-calculator.html'], ['Title Page', 'Assignment cover, ready PDF', 'title-page-generator.html'],
              ['CV Builder', 'Resume PDF in minutes', 'cv-builder.html'], ['Image to PDF', 'Photos to one PDF', 'image-to-pdf.html']] }
  ];

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
  function level(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i]; return null; }
  var isBot = /bot|crawl|spider|lighthouse|pagespeed|headless/i.test(navigator.userAgent || '');

  /* ---- 3D keys ---- [symbol, x%, y%, z px, size px, rotX, rotY, seconds, delay] ---- */
  function buildKeys(box, defs) {
    if (!box) return;
    defs.forEach(function (k, i) {
      var el = document.createElement('div');
      el.className = 'p-key' + (i % 2 ? ' dark' : '');
      el.textContent = k[0];
      var st = el.style;
      st.setProperty('--x', k[1]); st.setProperty('--y', k[2]); st.setProperty('--z', k[3] + 'px'); st.setProperty('--s', k[4] + 'px');
      st.setProperty('--rx', k[5] + 'deg'); st.setProperty('--ry', k[6] + 'deg'); st.setProperty('--d', k[7] + 's'); st.setProperty('--dl', k[8] + 's');
      box.appendChild(el);
    });
  }
  var HERO_KEYS = [['π', 2, 4, 90, 58, 16, -20, 7, 0], ['∑', 98, 2, 50, 64, -14, 18, 9, -2], ['√x', 0, 94, 110, 62, 18, 16, 8, -1], ['∫', 100, 92, 70, 56, -16, -14, 10, -3]];
  var WELCOME_KEYS = [['π', 9, 15, 90, 66, 18, -22, 7, 0], ['∑', 90, 13, 40, 74, -14, 20, 9, -2], ['√x', 11, 78, 120, 72, 20, 18, 8, -1],
                      ['∫', 88, 80, 60, 66, -18, -16, 10, -3], ['x²', 50, 5, -40, 56, 12, -12, 11, -4], ['%', 52, 94, -30, 60, -12, 14, 9, -5],
                      ['f(x)', 97, 47, -80, 58, 10, -18, 12, -2], ['θ', 3, 45, -60, 54, -10, 16, 10, -6]];
  buildKeys(document.getElementById('pHeroKeys'), HERO_KEYS);

  /* ---- Depth: keys lean toward the pointer (desktop only) ---- */
  if (window.matchMedia && matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var raf = 0, nx = 0, ny = 0;
    document.addEventListener('pointermove', function (e) {
      nx = (e.clientX / innerWidth - .5) * 2; ny = (e.clientY / innerHeight - .5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        document.documentElement.style.setProperty('--px', nx.toFixed(3));
        document.documentElement.style.setProperty('--py', ny.toFixed(3));
      });
    }, { passive: true });
  }

  /* ---- Picked for you ---- */
  function renderPicks() {
    var box = document.getElementById('pForYou'), p = load(), lv = p && level(p.level);
    if (!box) return;
    if (!lv) { box.hidden = true; return; }
    var name = (p.name || '').trim();
    document.getElementById('pFyTitle').textContent = name ? 'Assalam o Alaikum, ' + name + '.' : 'Picked for you.';
    document.getElementById('pFySub').textContent = 'What ' + lv.title + ' use most.';
    var grid = document.getElementById('pFyGrid');
    grid.textContent = '';
    lv.picks.forEach(function (it) {
      var el = document.createElement(it[2] ? 'a' : 'button');
      el.className = 'p-pick';
      if (it[2]) el.href = it[2]; else { el.type = 'button'; el.setAttribute('data-go', it[3]); }
      var b = document.createElement('b'); b.textContent = it[0];
      var s = document.createElement('small'); s.textContent = it[1];
      el.appendChild(b); el.appendChild(s); grid.appendChild(el);
    });
    box.hidden = false;
  }

  /* ---- Welcome screen ---- */
  function openWelcome() {
    if (document.getElementById('pWelcome')) return;
    var prev = load() || {}, chosen = prev.level || '';
    var w = document.createElement('div');
    w.className = 'p-welcome'; w.id = 'pWelcome'; w.tabIndex = -1;
    w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-labelledby', 'pwTitle');
    w.innerHTML =
      '<div class="p-scene" aria-hidden="true"><div class="p-scene-inner" id="pwKeys"></div></div>' +
      '<div class="p-w-card">' +
        '<div class="p-w-brand"><span class="mark">=x</span>Calvo</div>' +
        '<h2 id="pwTitle">Assalam o Alaikum! Welcome to Calvo.</h2>' +
        '<p>Calculators, formulas and PDF tools made for students. Tell us what you study and we will set up your home screen.</p>' +
        '<label class="p-w-label" for="pwName">Your name (optional)</label>' +
        '<input id="pwName" class="p-w-input" maxlength="24" autocomplete="given-name" placeholder="For example, Usman">' +
        '<div class="p-w-label" id="pwLvlLbl">What are you studying?</div>' +
        '<div class="p-levels" role="radiogroup" aria-labelledby="pwLvlLbl"></div>' +
        '<button type="button" class="p-btn primary p-w-go" id="pwGo">Set up my home screen</button>' +
        '<button type="button" class="p-w-skip" id="pwSkip">Skip for now</button>' +
      '</div>';
    document.body.appendChild(w);
    document.getElementById('pwName').value = prev.name || '';
    buildKeys(document.getElementById('pwKeys'), WELCOME_KEYS);

    var group = w.querySelector('.p-levels');
    LEVELS.forEach(function (lv) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'p-level'; b.setAttribute('role', 'radio'); b.setAttribute('data-id', lv.id);
      b.setAttribute('aria-checked', lv.id === chosen ? 'true' : 'false');
      b.innerHTML = '<b></b><small></small>';
      b.firstChild.textContent = lv.t; b.lastChild.textContent = lv.s;
      b.addEventListener('click', function () {
        chosen = lv.id;
        group.querySelectorAll('.p-level').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      });
      group.appendChild(b);
    });

    var closed = false;
    function close(saveIt) {
      if (closed) return; closed = true;
      var name = document.getElementById('pwName').value.replace(/[<>]/g, '').trim().slice(0, 24);
      save(saveIt ? { name: name, level: chosen, seen: 1 } : { name: prev.name || '', level: prev.level || '', seen: 1 });
      renderPicks();
      w.classList.add('leaving');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 550);
    }
    function onKey(e) { if (e.key === 'Escape') close(false); }
    document.addEventListener('keydown', onKey);
    document.getElementById('pwGo').addEventListener('click', function () { close(true); });
    document.getElementById('pwSkip').addEventListener('click', function () { close(false); });
    w.focus();
  }

  function start() {
    renderPicks();
    var ch = document.getElementById('pFyChange');
    if (ch) ch.addEventListener('click', openWelcome);
    if (!load() && !isBot) openWelcome();      // first visit only; search bots never see it
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
