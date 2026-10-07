/* Calvo - Physics & Electronics helpers: projectile motion, series/parallel
   resistance and resistor colour codes. Every function returns plain data plus
   a list of steps ({lvl, html}) that SimpleSteps shows one at a time. */
(function (root) {
  'use strict';
  var PI = Math.PI, MINUS = '\u2212';

  /* ---------- number formatting ---------- */
  function sig(x, n) {
    if (x === 0 || !isFinite(x)) return String(x);
    n = n || 5;
    var ax = Math.abs(x), s;
    if (ax >= 1e9 || ax < 1e-4) { s = x.toExponential(n - 1).replace(/\.?0+e/, 'e').replace('e+', ' \u00d7 10<sup>').replace('e-', ' \u00d7 10<sup>-') + '</sup>'; return s.replace('<sup>-', '<sup>' + MINUS); }
    s = Number(x.toPrecision(n)).toString();
    return s.replace('-', MINUS);
  }
  function plainNum(x, n) { return sig(x, n).replace(/<[^>]+>/g, ''); }

  /* ================= PROJECTILE MOTION ================= */
  function projectile(v0, thDeg, h0, g, tq) {
    var err = null;
    if (!isFinite(v0) || v0 < 0) err = 'Launch speed must be 0 or more.';
    else if (!isFinite(thDeg) || thDeg < -90 || thDeg > 90) err = 'Launch angle must be between \u221290\u00b0 and 90\u00b0.';
    else if (!isFinite(h0) || h0 < 0) err = 'Starting height must be 0 or more.';
    else if (!isFinite(g) || g <= 0) err = 'Gravity g must be more than 0.';
    else if (v0 === 0 && h0 === 0) err = 'Nothing moves when the speed and the height are both 0.';
    if (err) return { ok: false, error: err };
    var th = thDeg * PI / 180, vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
    if (Math.abs(vx) < 1e-12) vx = 0;
    if (Math.abs(vy) < 1e-12) vy = 0;
    var tUp = vy > 0 ? vy / g : 0;
    var H = h0 + (vy > 0 ? vy * vy / (2 * g) : 0);
    var T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
    if (h0 === 0 && vy <= 0) T = 0;
    var R = vx * T, vyEnd = vy - g * T, vEnd = Math.hypot(vx, vyEnd);
    var angEnd = vx === 0 ? 90 : Math.atan(Math.abs(vyEnd) / vx) * 180 / PI;
    var S = [], add = function (h, l) { S.push({ lvl: l || 0, html: h }); };
    var n = function (x) { return sig(x, 5); };
    add('<b>Split the launch speed</b> into a sideways part and an up part. v<sub>x</sub> = v<sub>0</sub> cos\u03b8 = ' + n(v0) + ' \u00d7 cos ' + n(thDeg) + '\u00b0 = <b>' + n(vx) + ' m/s</b>, and v<sub>y</sub> = v<sub>0</sub> sin\u03b8 = ' + n(v0) + ' \u00d7 sin ' + n(thDeg) + '\u00b0 = <b>' + n(vy) + ' m/s</b>.');
    if (vy > 0) add('<b>Time to the top.</b> Gravity slows the upward speed until it is 0: t = v<sub>y</sub> / g = ' + n(vy) + ' / ' + n(g) + ' = <b>' + n(tUp) + ' s</b>.');
    else add('<b>Time to the top.</b> The object is not going up at the start, so the highest point is the starting point (t = 0 s).');
    if (vy > 0) add('<b>Highest point.</b> H = h<sub>0</sub> + v<sub>y</sub>\u00b2 / (2g) = ' + n(h0) + ' + ' + n(vy) + '\u00b2 / (2 \u00d7 ' + n(g) + ') = <b>' + n(H) + ' m</b>.');
    else add('<b>Highest point.</b> H = h<sub>0</sub> = <b>' + n(H) + ' m</b>.');
    if (h0 === 0 && vy <= 0) add('<b>Time in the air.</b> It starts on the ground and is not going up, so it never leaves the ground: T = <b>0 s</b>.');
    else add('<b>Total time in the air.</b> It lands when the height is 0, so solve h<sub>0</sub> + v<sub>y</sub>t ' + MINUS + ' \u00bdgt\u00b2 = 0. The answer is T = (v<sub>y</sub> + \u221a(v<sub>y</sub>\u00b2 + 2gh<sub>0</sub>)) / g = (' + n(vy) + ' + \u221a(' + n(vy * vy) + ' + ' + n(2 * g * h0) + ')) / ' + n(g) + ' = <b>' + n(T) + ' s</b>.');
    add('<b>Range (how far it lands).</b> Sideways speed does not change, so R = v<sub>x</sub> \u00d7 T = ' + n(vx) + ' \u00d7 ' + n(T) + ' = <b>' + n(R) + ' m</b>.');
    add('<b>Landing speed.</b> The sideways speed is still ' + n(vx) + ' m/s. The up-speed at landing is v<sub>y</sub> ' + MINUS + ' gT = ' + n(vy) + ' ' + MINUS + ' ' + n(g) + ' \u00d7 ' + n(T) + ' = ' + n(vyEnd) + ' m/s. Speed = \u221a(v<sub>x</sub>\u00b2 + v<sub>y</sub>\u00b2) = <b>' + n(vEnd) + ' m/s</b>, at <b>' + n(angEnd) + '\u00b0</b> below the horizontal.');
    var at = null;
    if (tq !== null && tq !== undefined && isFinite(tq) && tq >= 0) {
      var xq = vx * tq, yq = h0 + vy * tq - 0.5 * g * tq * tq, vyq = vy - g * tq;
      at = { t: tq, x: xq, y: yq, vy: vyq, speed: Math.hypot(vx, vyq), landed: tq > T };
      add('<b>Position at t = ' + n(tq) + ' s.</b> x = v<sub>x</sub>t = ' + n(vx) + ' \u00d7 ' + n(tq) + ' = <b>' + n(xq) + ' m</b>, and height y = h<sub>0</sub> + v<sub>y</sub>t ' + MINUS + ' \u00bdgt\u00b2 = <b>' + n(yq) + ' m</b>' + (tq > T ? ' (the object has already landed by then, so this point is below the ground and not real)' : '') + '. Speed then = <b>' + n(at.speed) + ' m/s</b>.');
    }
    // path points for drawing
    var pts = [], N = 80, Tend = Math.max(T, 1e-9);
    for (var i = 0; i <= N; i++) { var t = Tend * i / N; pts.push([vx * t, Math.max(0, h0 + vy * t - 0.5 * g * t * t)]); }
    return { ok: true, vx: vx, vy: vy, tUp: tUp, H: H, T: T, R: R, vEnd: vEnd, angEnd: angEnd, vyEnd: vyEnd, h0: h0, at: at, steps: S, pts: pts,
      xTop: vx * tUp };
  }

  /* ================= RESISTORS ================= */
  var MULT = { '': 1, R: 1, r: 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9, m: 1e-3 };
  function parseR(tok) {
    var s = String(tok).trim().replace(/\u03a9|\u2126|ohms?/gi, '').replace(/\s+/g, '');
    if (!s) return null;
    var m = s.match(/^(\d+)([RkKMG])(\d+)$/);
    if (m) return parseFloat(m[1] + '.' + m[3]) * MULT[m[2]];
    m = s.match(/^(\d*\.?\d+(?:e[+-]?\d+)?)([RkKMGm]?)$/i);
    if (m && /^\d*\.?\d+(e[+-]?\d+)?$/i.test(m[1])) { var mm = (m[2] === 'm' || m[2] === 'M' || m[2] === 'G' || m[2] === 'k' || m[2] === 'K' || m[2] === 'R' || m[2] === 'r' || m[2] === '') ? m[2] : ''; return parseFloat(m[1]) * MULT[mm]; }
    return null;
  }
  function parseList(str) {
    var toks = String(str).replace(/ohms?|\u03a9|\u2126/gi, ' ').split(/[\s,;+]+/).filter(Boolean), vals = [], bad = [];
    toks.forEach(function (t) { var v = parseR(t); if (v === null || !isFinite(v) || v < 0) bad.push(t); else vals.push(v); });
    return { vals: vals, bad: bad };
  }
  function fmtR(x) {
    if (!isFinite(x)) return '\u221e \u03a9';
    if (x === 0) return '0 \u03a9';
    var ax = Math.abs(x), u = '\u03a9', d = 1;
    if (ax >= 1e9) { u = 'G\u03a9'; d = 1e9; } else if (ax >= 1e6) { u = 'M\u03a9'; d = 1e6; } else if (ax >= 1e3) { u = 'k\u03a9'; d = 1e3; } else if (ax < 1) { u = 'm\u03a9'; d = 1e-3; }
    return sig(x / d, 4) + ' ' + u;
  }
  function fmtU(x, unit) { return sig(x, 4) + ' ' + unit; }

  function seriesParallel(vals, V) {
    if (vals.length < 2) return { ok: false, error: 'Enter at least two resistor values, separated by commas or spaces. Example: 100, 220, 330' };
    if (vals.length > 30) return { ok: false, error: 'Please use 30 resistors or fewer.' };
    var sum = vals.reduce(function (a, b) { return a + b; }, 0), anyZero = vals.some(function (v) { return v === 0; });
    var par = anyZero ? 0 : 1 / vals.reduce(function (a, b) { return a + 1 / b; }, 0);
    var S = [], add = function (h, l) { S.push({ lvl: l || 0, html: h }); }, names = vals.map(fmtR);
    add('<b>Series</b> means the resistors are in one row, so the same current goes through all of them. The total is simply the sum: R = R<sub>1</sub> + R<sub>2</sub> + \u2026');
    add('<b>Add them up:</b> ' + names.join(' + ') + ' = <b>' + fmtR(sum) + '</b>');
    add('<b>Parallel</b> means each resistor gives the current its own path, so the total becomes <i>smaller</i> than the smallest one. The rule is 1/R = 1/R<sub>1</sub> + 1/R<sub>2</sub> + \u2026');
    if (anyZero) add('One resistor is 0 \u03a9 (a plain wire). Current takes that path, so the parallel total is <b>0 \u03a9</b>.');
    else {
      add('<b>Turn each into 1/R:</b> ' + vals.map(function (v, i) { return '1/' + names[i] + ' = ' + sig(1 / v, 4) + ' S'; }).join(', '));
      var recip = vals.reduce(function (a, b) { return a + 1 / b; }, 0);
      add('<b>Add the 1/R numbers:</b> 1/R = ' + sig(recip, 5) + ' S');
      add('<b>Flip it over:</b> R = 1 / ' + sig(recip, 5) + ' = <b>' + fmtR(par) + '</b>');
      if (vals.length === 2) add('Shortcut for two resistors: R = (R<sub>1</sub> \u00d7 R<sub>2</sub>) / (R<sub>1</sub> + R<sub>2</sub>) = ' + sig(vals[0] * vals[1], 5) + ' / ' + sig(sum, 5) + ' = ' + fmtR(par), 1);
    }
    var res = { ok: true, vals: vals, series: sum, parallel: par, steps: S, smallest: Math.min.apply(null, vals) };
    if (V !== null && V !== undefined && isFinite(V) && V > 0) {
      var I = V / sum;
      add('<b>With a ' + sig(V, 4) + ' V supply in series:</b> the current is I = V / R = ' + sig(V, 4) + ' / ' + sig(sum, 5) + ' = <b>' + fmtU(I, 'A') + '</b>. Each resistor drops V<sub>i</sub> = I \u00d7 R<sub>i</sub> and uses power P<sub>i</sub> = I\u00b2R<sub>i</sub>.');
      res.seriesRows = vals.map(function (r, i) { return { name: names[i], v: I * r, i: I, p: I * I * r }; });
      res.seriesI = I; res.V = V; res.seriesP = V * I;
      if (!anyZero) {
        add('<b>With the same supply in parallel:</b> every resistor gets the full ' + sig(V, 4) + ' V, so I<sub>i</sub> = V / R<sub>i</sub>. The total current is the sum of them.');
        res.parRows = vals.map(function (r, i) { return { name: names[i], v: V, i: V / r, p: V * V / r }; });
        res.parI = V / par; res.parP = V * V / par;
      }
    }
    return res;
  }

  /* ================= COLOUR CODE ================= */
  var COLORS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white', 'gold', 'silver'];
  var HEX = { black: '#151515', brown: '#8b5a2b', red: '#e23b2e', orange: '#f7822a', yellow: '#f6d83a', green: '#3fa34d', blue: '#2f6fd6', violet: '#8a4fc7', grey: '#9a9a9a', white: '#f4f4f4', gold: '#d4af37', silver: '#c0c0c0', none: 'transparent' };
  var DIGIT = { black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5, blue: 6, violet: 7, grey: 8, white: 9 };
  var MUL = { black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5, blue: 6, violet: 7, grey: 8, white: 9, gold: -1, silver: -2 };
  var TOL = { brown: 1, red: 2, green: 0.5, blue: 0.25, violet: 0.1, grey: 0.05, gold: 5, silver: 10, none: 20 };
  var TEMP = { brown: 100, red: 50, orange: 15, yellow: 25, blue: 10, violet: 5 };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function colorDecode(bands) {
    var n = bands.length;
    if (n < 4 || n > 6) return { ok: false, error: 'Use 4, 5 or 6 bands.' };
    var nd = n === 4 ? 2 : 3, digits = [], i;
    for (i = 0; i < nd; i++) { if (DIGIT[bands[i]] === undefined) return { ok: false, error: 'Band ' + (i + 1) + ' must be a digit colour (black to white), not ' + bands[i] + '.' }; digits.push(DIGIT[bands[i]]); }
    var mc = bands[nd], tc = bands[nd + 1], tp = bands[nd + 2];
    if (MUL[mc] === undefined) return { ok: false, error: 'The multiplier band cannot be ' + mc + '.' };
    if (TOL[tc] === undefined) return { ok: false, error: 'The tolerance band cannot be ' + tc + '.' };
    if (n === 6 && TEMP[tp] === undefined) return { ok: false, error: 'The temperature band must be brown, red, orange, yellow, blue or violet.' };
    var num = parseInt(digits.join(''), 10), val = num * Math.pow(10, MUL[mc]), tol = TOL[tc];
    var S = [], add = function (h, l) { S.push({ lvl: l || 0, html: h }); };
    for (i = 0; i < nd; i++) add('<b>Band ' + (i + 1) + ' is ' + bands[i] + '.</b> ' + cap(bands[i]) + ' stands for the digit <b>' + digits[i] + '</b>.');
    add('<b>Band ' + (nd + 1) + ' is ' + mc + ' (the multiplier).</b> It tells how many zeros to add, or the power of ten: \u00d7 10<sup>' + (MUL[mc] < 0 ? MINUS + Math.abs(MUL[mc]) : MUL[mc]) + '</sup> = \u00d7 ' + sig(Math.pow(10, MUL[mc]), 4) + '.');
    add('<b>Read the digits together</b> as one number: ' + digits.join('') + '. Then multiply: ' + digits.join('') + ' \u00d7 ' + sig(Math.pow(10, MUL[mc]), 4) + ' = <b>' + fmtR(val) + '</b>.');
    add('<b>Tolerance band is ' + tc + '.</b> It says how far the real value may be from this: <b>\u00b1' + tol + '%</b>.');
    var lo = val * (1 - tol / 100), hi = val * (1 + tol / 100);
    add('<b>The real value is between</b> ' + fmtR(lo) + ' and ' + fmtR(hi) + ', because ' + fmtR(val) + ' \u00b1 ' + tol + '% = ' + fmtR(val) + ' \u00b1 ' + fmtR(val * tol / 100) + '.');
    if (n === 6) add('<b>Temperature band is ' + tp + '.</b> The value changes by about <b>' + TEMP[tp] + ' ppm per \u00b0C</b> when it gets hot or cold.');
    return { ok: true, value: val, tol: tol, lo: lo, hi: hi, temp: n === 6 ? TEMP[tp] : null, bands: bands, steps: S, text: fmtR(val) + ' \u00b1' + tol + '%' };
  }

  function colorEncode(value, n, tolPct) {
    if (!isFinite(value) || value < 0) return { ok: false, error: 'Enter a resistance such as 4.7k, 220 or 1M.' };
    var nd = n === 4 ? 2 : 3, S = [], add = function (h, l) { S.push({ lvl: l || 0, html: h }); };
    var bands = [], coded, mexp, digs;
    if (value === 0) {
      bands = ['black']; coded = 0; digs = [0];
      add('A 0 \u03a9 resistor is just a wire link. It has a single <b>black</b> band.');
      return { ok: true, bands: bands, value: 0, coded: 0, exact: true, steps: S, text: '0 \u03a9' };
    }
    var k = Math.floor(Math.log10(value)) - (nd - 1), m = Math.round(value / Math.pow(10, k));
    if (m >= Math.pow(10, nd)) { m = Math.round(m / 10); k += 1; }
    if (k < -2 || k > 9) return { ok: false, error: 'This value is outside the range a ' + n + '-band resistor can show.' };
    coded = m * Math.pow(10, k);
    var exact = Math.abs(coded - value) <= 1e-9 * value;
    var ds = String(m);
    while (ds.length < nd) ds = '0' + ds;
    digs = ds.split('').map(Number);
    var colorOfDigit = function (d) { return COLORS[d]; };
    var mulColor = k === -1 ? 'gold' : (k === -2 ? 'silver' : COLORS[k]);
    var tcol = null;
    Object.keys(TOL).forEach(function (c) { if (c !== 'none' && Math.abs(TOL[c] - tolPct) < 1e-9) tcol = c; });
    if (!tcol) tcol = n === 4 ? 'gold' : 'brown';
    bands = digs.map(colorOfDigit).concat([mulColor, tcol]);
    add('<b>Write the value</b> ' + fmtR(value) + ' as ' + nd + ' digits and a power of ten: ' + ds + ' \u00d7 10<sup>' + (k < 0 ? MINUS + Math.abs(k) : k) + '</sup>.');
    if (!exact) add('A ' + n + '-band resistor can only show ' + nd + ' digits, so it shows ' + fmtR(coded) + ' (the nearest value it can code). Use 5 bands for more exact values.', 1);
    add('<b>The digits ' + digs.join(', ') + '</b> are the colours <b>' + digs.map(colorOfDigit).join(', ') + '</b>.');
    add('<b>The multiplier</b> 10<sup>' + (k < 0 ? MINUS + Math.abs(k) : k) + '</sup> is <b>' + mulColor + '</b>.');
    add('<b>The tolerance</b> \u00b1' + TOL[tcol] + '% is <b>' + tcol + '</b>.');
    add('<b>Colour bands, from the end with the bands close together:</b> <b>' + bands.join(' \u2192 ') + '</b>');
    return { ok: true, bands: bands, value: value, coded: coded, exact: exact, steps: S, text: bands.join(', '), tol: TOL[tcol] };
  }

  root.CalvoPhys = { projectile: projectile, parseR: parseR, parseList: parseList, fmtR: fmtR, seriesParallel: seriesParallel,
    colorDecode: colorDecode, colorEncode: colorEncode, COLORS: COLORS, HEX: HEX, DIGIT: DIGIT, MUL: MUL, TOL: TOL, TEMP: TEMP, sig: sig, plainNum: plainNum };
})(typeof window !== 'undefined' ? window : globalThis);
