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
  var SPOT = '.home-big, .subject-tile, .merit-link, .subject-tool-row, .stats-result-cell';
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
