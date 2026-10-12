/* Calvo — Laplace transform, inverse Laplace and linear ODE (constant coefficients) engine.
   Functions are sums of terms c·t^n·e^(at)·[sin|cos](bt). Every answer is verified numerically. */
(function (root) {
  'use strict';
  var EPS = 1e-12;
  function E(m) { return new Error(m); }
  function r9(x) { return Math.round(x * 1e9); }
  function fact(n) { var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }
  /* ---- real polynomials (ascending) ---- */
  function pa(a, b) { var r = [], n = Math.max(a.length, b.length); for (var i = 0; i < n; i++) r[i] = (a[i] || 0) + (b[i] || 0); return r; }
  function pm(a, b) { var r = []; for (var i = 0; i < a.length + b.length - 1; i++) r[i] = 0; a.forEach(function (x, i) { b.forEach(function (y, j) { r[i + j] += x * y; }); }); return r; }
  function pp(a, n) { var r = [1]; for (var i = 0; i < n; i++) r = pm(r, a); return r; }
  function ps(a, k) { return a.map(function (x) { return x * k; }); }
  function trim(p) { p = p.slice(); while (p.length > 1 && Math.abs(p[p.length - 1]) < EPS) p.pop(); return p; }
  function comp(p, a) { var r = [0]; for (var i = p.length - 1; i >= 0; i--) r = pa(pm(r, [-a, 1]), [p[i]]); return r; }
  /* ---- number / text formatting ---- */
  function fm(x) {
    if (Math.abs(x) < 1e-10) return '0';
    for (var q = 1; q <= 24; q++) { var p = Math.round(x * q); if (Math.abs(x - p / q) < 1e-9) return q === 1 ? '' + p : p + '/' + q; }
    return '' + parseFloat(x.toPrecision(6));
  }
  function co(x) { var s = fm(x); return s.indexOf('/') > -1 ? '(' + s + ')' : s; }
  function joinSigned(parts) { // parts: [{neg, body}]
    if (!parts.length) return '0';
    return parts.map(function (p, i) { return (i ? (p.neg ? ' - ' : ' + ') : (p.neg ? '-' : '')) + p.body; }).join('');
  }
  function fp(p) { // polynomial in s
    var parts = [];
    for (var k = p.length - 1; k >= 0; k--) {
      var c = p[k]; if (Math.abs(c) < 1e-12) continue;
      var m = Math.abs(c), body = k === 0 ? fm(m) : (Math.abs(m - 1) < 1e-12 ? '' : co(m)) + 's' + (k > 1 ? '^' + k : '');
      parts.push({ neg: c < 0, body: body });
    }
    return joinSigned(parts);
  }
  function wp(x) { return /[+\- ]/.test(x.slice(1)) ? '(' + x + ')' : x; }
  function ft(L) { // term list -> text in t
    var parts = [];
    L.forEach(function (t) {
      var m = Math.abs(t.c), segs = [];
      if (Math.abs(m - 1) > 1e-12) segs.push(co(m));
      if (t.n) segs.push('t' + (t.n > 1 ? '^' + t.n : ''));
      if (t.a) segs.push('e^' + (Math.abs(t.a - 1) < 1e-12 ? 't' : Math.abs(t.a + 1) < 1e-12 ? '(-t)' : '(' + fm(t.a) + 't)'));
      if (t.k) segs.push((t.k === 'c' ? 'cos' : 'sin') + '(' + (Math.abs(t.b - 1) < 1e-12 ? '' : fm(t.b)) + 't)');
      parts.push({ neg: t.c < 0, body: segs.length ? segs.join(' ') : '1' });
    });
    return joinSigned(parts);
  }
  /* ---- term lists ---- */
  function nt(t) {
    if (t.k) { if (t.b < -EPS) { t.b = -t.b; if (t.k === 's') t.c = -t.c; } if (Math.abs(t.b) < EPS) { if (t.k === 's') t.c = 0; t.k = 0; t.b = 0; } } else t.b = 0;
    return t;
  }
  function simp(L) {
    var m = {}, o = [];
    L.forEach(function (t) {
      t = nt({ c: t.c, n: t.n, a: t.a, k: t.k, b: t.b });
      var key = [t.n, t.k, r9(t.a), r9(t.b)].join('|');
      if (m[key]) m[key].c += t.c; else { m[key] = t; o.push(t); }
    });
    return o.filter(function (t) { return Math.abs(t.c) > 1e-12; });
  }
  function sc(L, k) { return L.map(function (t) { return { c: t.c * k, n: t.n, a: t.a, k: t.k, b: t.b }; }); }
  function add(A, B) { return simp(A.concat(B)); }
  function mul(A, B) {
    var o = [];
    A.forEach(function (x) { B.forEach(function (y) {
      var b = { c: x.c * y.c, n: x.n + y.n, a: x.a + y.a };
      if (!x.k || !y.k) { b.k = x.k || y.k; b.b = x.k ? x.b : y.b; o.push(b); return; }
      var p = x.b, q = y.b, h = b.c / 2;
      if (x.k === y.k) {
        o.push({ c: h, n: b.n, a: b.a, k: 'c', b: p - q });
        o.push({ c: (x.k === 'c' ? 1 : -1) * h, n: b.n, a: b.a, k: 'c', b: p + q });
      } else {
        var sp = x.k === 's' ? p : q, cq = x.k === 's' ? q : p;
        o.push({ c: h, n: b.n, a: b.a, k: 's', b: sp + cq });
        o.push({ c: h, n: b.n, a: b.a, k: 's', b: sp - cq });
      }
    }); });
    return simp(o);
  }
  function numOf(L) { if (!L.length) return 0; return (L.length === 1 && !L[0].n && !L[0].a && !L[0].k) ? L[0].c : null; }
  function lin(X) { // X must be c0 + c1*t
    var c0 = 0, c1 = 0;
    X.forEach(function (t) { if (t.k || t.a || t.n > 1) throw E('Only e^(k t), sin(k t), cos(k t) with a linear argument are supported.'); if (t.n === 0) c0 += t.c; else c1 += t.c; });
    return [c0, c1];
  }
  function one(c, a, k, b) { return { c: c, n: 0, a: a || 0, k: k || 0, b: b || 0 }; }
  /* ---- parser for f(t) ---- */
  function parseF(src) {
    var s = String(src).replace(/\s+/g, '').replace(/\u2212/g, '-').replace(/\*\*/g, '^').toLowerCase(), i = 0;
    function expr() { var v = term(); while (s[i] === '+' || s[i] === '-') { var o = s[i++], w = term(); v = add(v, o === '-' ? sc(w, -1) : w); } return v; }
    function term() {
      var v = unary();
      while (i < s.length) {
        var c = s[i];
        if (c === '*') { i++; v = mul(v, unary()); }
        else if (c === '/') { i++; var d = numOf(unary()); if (d === null || d === 0) throw E('Division is only supported by a non-zero number.'); v = sc(v, 1 / d); }
        else if (c === '(' || /[a-z0-9.]/.test(c)) v = mul(v, unary());
        else break;
      }
      return v;
    }
    function unary() { if (s[i] === '-') { i++; return sc(unary(), -1); } if (s[i] === '+') { i++; return unary(); } return power(); }
    function power() {
      var b = atom();
      if (s[i] === '^') {
        i++; var e = unary();
        if (b.isE) { var l = lin(e); return [one(Math.exp(l[0]), l[1])]; }
        var n = numOf(e);
        if (n === null || n < 0 || n % 1) throw E('Only non-negative whole-number powers (or e^(...)) are supported.');
        var r = [one(1)]; for (var j = 0; j < n; j++) r = mul(r, b); return r;
      }
      return b;
    }
    function atom() {
      var c = s[i];
      if (c === undefined) throw E('The expression ended too early.');
      if (c === '(') { i++; var v = expr(); if (s[i] !== ')') throw E('A closing bracket is missing.'); i++; return v; }
      if (/[0-9.]/.test(c)) { var m = s.slice(i).match(/^\d*\.?\d+/); if (!m) throw E('Could not read a number.'); i += m[0].length; return [one(parseFloat(m[0]))]; }
      var f = ['sinh', 'cosh', 'sin', 'cos', 'exp'].filter(function (n) { return s.indexOf(n, i) === i; })[0];
      if (f) {
        i += f.length; if (s[i] !== '(') throw E(f + ' needs brackets, e.g. ' + f + '(2t).');
        var X = atom(), l = lin(X), c0 = l[0], c1 = l[1];
        if (f === 'exp') return [one(Math.exp(c0), c1)];
        if (f === 'sin') return simp([one(Math.cos(c0), 0, 's', c1), one(Math.sin(c0), 0, 'c', c1)]);
        if (f === 'cos') return simp([one(Math.cos(c0), 0, 'c', c1), one(-Math.sin(c0), 0, 's', c1)]);
        var q = Math.exp(c0) / 2; return simp([one(q, c1), one(f === 'sinh' ? -q * Math.exp(-2 * c0) * 1 : q * Math.exp(-2 * c0), -c1)]);
      }
      if (s.indexOf('pi', i) === i) { i += 2; return [one(Math.PI)]; }
      if (c === 't') { i++; return [{ c: 1, n: 1, a: 0, k: 0, b: 0 }]; }
      if (c === 'e') { i++; var r = [one(Math.E)]; r.isE = true; return r; }
      throw E('Unsupported symbol "' + c + '". Use t, e, pi, sin, cos, sinh, cosh, exp.');
    }
    var v = expr();
    if (i < s.length) throw E('Could not read the expression near "' + s.slice(i, i + 6) + '".');
    return v;
  }
  /* ---- evaluation / derivative ---- */
  function ev(L, t) { return L.reduce(function (z, x) { return z + x.c * Math.pow(t, x.n) * Math.exp(x.a * t) * (x.k === 'c' ? Math.cos(x.b * t) : x.k === 's' ? Math.sin(x.b * t) : 1); }, 0); }
  function dv(L) {
    var o = [];
    L.forEach(function (x) {
      if (x.n) o.push({ c: x.c * x.n, n: x.n - 1, a: x.a, k: x.k, b: x.b });
      if (x.a) o.push({ c: x.c * x.a, n: x.n, a: x.a, k: x.k, b: x.b });
      if (x.k === 'c') o.push({ c: -x.c * x.b, n: x.n, a: x.a, k: 's', b: x.b });
      if (x.k === 's') o.push({ c: x.c * x.b, n: x.n, a: x.a, k: 'c', b: x.b });
    });
    return simp(o);
  }
  /* ---- forward Laplace ---- */
  function baseStr(t) {
    var sh = t.a === 0 ? 's' : '(s ' + (t.a > 0 ? '- ' + fm(t.a) : '+ ' + fm(-t.a)) + ')';
    return t.k ? (t.a === 0 ? '(s^2 + ' + fm(t.b * t.b) + ')' : '(' + sh + '^2 + ' + fm(t.b * t.b) + ')') : sh;
  }
  function lapTerm(t) {
    var n = t.n, a = t.a, N, B;
    if (!t.k) { N = [t.c * fact(n)]; B = [-a, 1]; }
    else {
      var re = [1], im = [0], b = t.b;
      for (var j = 0; j <= n; j++) { var nr = pa(pm(re, [0, 1]), ps(im, -b)), ni = pa(ps(re, b), pm(im, [0, 1])); re = nr; im = ni; }
      N = ps(comp(t.k === 'c' ? re : im, a), t.c * fact(n)); B = [a * a + t.b * t.b, -2 * a, 1];
    }
    var p = n + 1, bs = baseStr(t);
    return { N: trim(N), B: B, p: p, key: t.k ? 'q' + r9(a) + '_' + r9(t.b) : 'l' + r9(a), text: wp(fp(trim(N))) + ' / ' + (p > 1 ? bs + '^' + p : bs), rule: rule(t) };
  }
  function rule(t) {
    var r = t.k ? (t.k === 'c' ? 'cos(' + fm(t.b) + 't)' : 'sin(' + fm(t.b) + 't)') : '1';
    if (t.n) r = 't^' + t.n + (t.k ? ' · ' + r : '');
    if (t.a) r = (r === '1' ? '' : r + ' · ') + 'e^(' + fm(t.a) + 't)';
    var how = [];
    if (t.n) how.push('multiplying by t^n differentiates F(s) n times (n!/s^(n+1) pattern)');
    if (t.a) how.push('first shifting theorem: replace s by s' + (t.a > 0 ? ' - ' : ' + ') + fm(Math.abs(t.a)));
    return { f: r, how: how.length ? how.join('; ') : 'table entry' };
  }
  function sumRat(items) {
    var g = {}, keys = [];
    items.forEach(function (it) { if (!g[it.key]) { g[it.key] = { B: it.B, p: it.p }; keys.push(it.key); } else g[it.key].p = Math.max(g[it.key].p, it.p); });
    var den = [1], num = [0];
    keys.forEach(function (k) { den = pm(den, pp(g[k].B, g[k].p)); });
    items.forEach(function (it) { var m = it.N; keys.forEach(function (k) { m = pm(m, pp(g[k].B, g[k].p - (k === it.key ? it.p : 0))); }); num = pa(num, m); });
    return { num: trim(num), den: trim(den) };
  }
  function laplace(src) {
    try {
      var L = parseF(src);
      if (!L.length) return { ok: true, zero: true, F: '0', steps: ['f(t) = 0, so F(s) = 0.'] };
      var items = L.map(lapTerm), tot = sumRat(items), steps = [];
      L.forEach(function (t, i) { steps.push('<b>Term ' + (i + 1) + ':</b> L{' + ft([t]) + '} &rarr; ' + items[i].rule.how + '.<br>= ' + items[i].text); });
      var F = items.map(function (x) { return x.text; }).join('  +  ');
      return { ok: true, f: ft(L), F: F, combined: wp(fp(tot.num)) + ' / ' + wp(fp(tot.den)), steps: steps };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  /* ---- complex helpers ---- */
  function cm(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
  function cd(a, b) { var d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
  function cpm(a, b) { var r = []; for (var i = 0; i < a.length + b.length - 1; i++) r[i] = [0, 0]; a.forEach(function (x, i) { b.forEach(function (y, j) { var p = cm(x, y); r[i + j] = [r[i + j][0] + p[0], r[i + j][1] + p[1]]; }); }); return r; }
  function hornerC(p, z) { var r = [0, 0]; for (var i = p.length - 1; i >= 0; i--) { r = cm(r, z); r[0] += p[i]; } return r; }
  function dk(D) {
    var n = D.length - 1, r = [], rad = Math.max(1, Math.pow(Math.abs(D[0]), 1 / n));
    for (var k = 0; k < n; k++) r.push([rad * Math.cos(2 * Math.PI * k / n + 0.4), rad * Math.sin(2 * Math.PI * k / n + 0.4)]);
    for (var it = 0; it < 4000; it++) {
      var mv = 0;
      for (k = 0; k < n; k++) {
        var den = [1, 0]; for (var j = 0; j < n; j++) if (j !== k) den = cm(den, [r[k][0] - r[j][0], r[k][1] - r[j][1]]);
        var d = cd(hornerC(D, r[k]), den); r[k] = [r[k][0] - d[0], r[k][1] - d[1]]; mv = Math.max(mv, Math.abs(d[0]) + Math.abs(d[1]));
      }
      if (mv < 1e-15) break;
    }
    return r;
  }
  function snap(x) { for (var q = 1; q <= 12; q++) { var p = Math.round(x * q); if (Math.abs(x - p / q) < 2e-4) return p / q; } return x; }
  function solveC(M, rhs) {
    var n = rhs.length, A = M.map(function (row, i) { return row.concat([rhs[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.hypot(A[r][c][0], A[r][c][1]) > Math.hypot(A[p][c][0], A[p][c][1])) p = r;
      if (Math.hypot(A[p][c][0], A[p][c][1]) < 1e-12) throw E('Could not split F(s) into partial fractions reliably.');
      var tmp = A[c]; A[c] = A[p]; A[p] = tmp;
      for (r = 0; r < n; r++) if (r !== c) { var f = cd(A[r][c], A[c][c]); for (var k = c; k <= n; k++) { var z = cm(f, A[c][k]); A[r][k] = [A[r][k][0] - z[0], A[r][k][1] - z[1]]; } }
    }
    return A.map(function (row, i) { return cd(row[n], row[i]); });
  }
  /* ---- inverse Laplace of N(s)/D(s) ---- */
  function inverse(N, D) {
    N = trim(N); D = trim(D);
    var lead = D[D.length - 1]; if (Math.abs(lead) < EPS) throw E('The denominator cannot be zero.');
    N = ps(N, 1 / lead); D = ps(D, 1 / lead);
    var dg = D.length - 1;
    if (dg < 1) throw E('The denominator must contain s.');
    if (N.length - 1 >= dg) throw E('F(s) must be a proper fraction (numerator degree smaller than denominator degree). Divide first.');
    var cl = [];
    dk(D).forEach(function (z) {
      var f = cl.filter(function (c) { return Math.hypot(c.re - z[0], c.im - z[1]) < 1e-3 * (1 + Math.hypot(z[0], z[1])); })[0];
      if (f) { f.sr += z[0]; f.si += z[1]; f.m++; f.re = f.sr / f.m; f.im = f.si / f.m; } else cl.push({ re: z[0], im: z[1], sr: z[0], si: z[1], m: 1 });
    });
    cl.forEach(function (c) {
      if (c.m < 2) return;
      var Q = D; for (var d = 1; d < c.m; d++) Q = Q.slice(1).map(function (x, i) { return x * (i + 1); });
      var Q1 = Q.slice(1).map(function (x, i) { return x * (i + 1); }), z = [c.re, c.im];
      for (var it = 0; it < 60; it++) { var dz = cd(hornerC(Q, z), hornerC(Q1, z)); if (!isFinite(dz[0])) break; z = [z[0] - dz[0], z[1] - dz[1]]; }
      if (isFinite(z[0]) && Math.hypot(z[0] - c.re, z[1] - c.im) < 1e-2) { c.re = z[0]; c.im = z[1]; }
    });
    cl.forEach(function (c) { c.re = snap(c.re); c.im = Math.abs(c.im) < 1e-3 * (1 + Math.abs(c.re)) ? 0 : snap(c.im); });
    var real = cl.filter(function (c) { return c.im === 0; }), up = cl.filter(function (c) { return c.im > 0; });
    var full = real.concat(up, up.map(function (c) { return { re: c.re, im: -c.im, m: c.m, lower: true }; }));
    if (full.reduce(function (s, c) { return s + c.m; }, 0) !== dg) throw E('Could not factor the denominator reliably.');
    var U = [], M = [];
    full.forEach(function (c, k) { for (var j = 1; j <= c.m; j++) {
      var P = [[1, 0]]; full.forEach(function (q, h) { var e = h === k ? c.m - j : q.m; for (var z = 0; z < e; z++) P = cpm(P, [[-q.re, -q.im], [1, 0]]); });
      U.push({ c: c, j: j, P: P });
    } });
    for (var r = 0; r < dg; r++) M.push(U.map(function (u) { return u.P[r] || [0, 0]; }));
    var A = solveC(M, Array.apply(null, Array(dg)).map(function (_, i) { return [N[i] || 0, 0]; }));
    var s0 = [0.31, 0.77], chk = [0, 0];
    U.forEach(function (u, i) { var d = [1, 0]; for (var z = 0; z < u.j; z++) d = cm(d, [s0[0] - u.c.re, s0[1] - u.c.im]); var q = cd(A[i], d); chk = [chk[0] + q[0], chk[1] + q[1]]; });
    var tgt = cd(hornerC(N, s0), hornerC(D, s0)), ok = Math.hypot(chk[0] - tgt[0], chk[1] - tgt[1]) < 1e-7 * (1 + Math.hypot(tgt[0], tgt[1]));
    var terms = [], pf = [];
    U.forEach(function (u, i) {
      var a = A[i], c = u.c, f = fact(u.j - 1);
      if (c.lower) return;
      if (c.im === 0) { terms.push({ c: a[0] / f, n: u.j - 1, a: c.re, k: 0, b: 0 }); if (Math.abs(a[0]) > 1e-10) pf.push(co(a[0]) + ' / ' + (c.re === 0 ? 's' : '(s ' + (c.re > 0 ? '- ' + fm(c.re) : '+ ' + fm(-c.re)) + ')') + (u.j > 1 ? '^' + u.j : '')); }
      else { terms.push({ c: 2 * a[0] / f, n: u.j - 1, a: c.re, k: 'c', b: c.im }); terms.push({ c: -2 * a[1] / f, n: u.j - 1, a: c.re, k: 's', b: c.im }); pf.push('complex pair at s = ' + fm(c.re) + ' &plusmn; ' + fm(c.im) + 'i (power ' + u.j + ')'); }
    });
    var roots = full.filter(function (c) { return !c.lower; }).map(function (c) { return (c.im ? fm(c.re) + ' &plusmn; ' + fm(c.im) + 'i' : fm(c.re)) + (c.m > 1 ? ' (x' + c.m + ')' : ''); });
    var f2 = simp(terms);
    return { f: f2, text: ft(f2) || '0', roots: roots, pf: pf, ok: ok };
  }
  function inverseSrc(nSrc, dSrc) {
    try {
      var toP = function (src) {
        var L = parseF(String(src).replace(/s/gi, 't')), p = [0];
        L.forEach(function (t) { if (t.a || t.k) throw E('Numerator and denominator must be polynomials in s.'); while (p.length <= t.n) p.push(0); p[t.n] += t.c; });
        return p;
      };
      var N = toP(nSrc), D = toP(dSrc), r = inverse(N, D);
      r.ok2 = true; r.Ftext = wp(fp(trim(N))) + ' / ' + wp(fp(trim(D)));
      return Object.assign({ ok: true }, r, { verified: r.ok });
    } catch (e) { return { ok: false, error: e.message }; }
  }
  /* ---- ODE:  a_n y^(n) + ... + a_0 y = g(t) ---- */
  function solveODE(src, ics) {
    try {
      var sides = String(src).split('='); if (sides.length !== 2) throw E('Write the equation with one "=" sign, e.g. y\'\' + 3y\' + 2y = e^(-t).');
      if (/y''''/i.test(sides[0])) throw E('Equations up to third order are supported.');
      if (/y/i.test(sides[1])) throw E('The right-hand side must be a function of t only (the equation must be linear in y).');
      var lhs = sides[0].replace(/\s+/g, '').toLowerCase().replace(/y'''/g, 'Y3').replace(/y''/g, 'Y2').replace(/y'/g, 'Y1').replace(/y/g, 'Y0');
      var ts = lhs.match(/[+-]?[^+-]+/g) || [], a = [0, 0, 0, 0];
      ts.forEach(function (t) {
        var m = t.match(/Y(\d)/); if (!m) throw E('Every term on the left must contain y, y\', y\'\' or y\'\'\'. Move other terms to the right side.');
        var cs = t.replace(/\*?Y\d/, ''), c = cs === '' || cs === '+' ? 1 : cs === '-' ? -1 : numOf(parseF(cs));
        if (c === null) throw E('Coefficients of y must be numbers.'); a[+m[1]] += c;
      });
      var n = 3; while (n > 0 && Math.abs(a[n]) < EPS) n--;
      if (n < 1) throw E('The equation must contain a derivative of y.');
      var y0 = []; for (var i = 0; i < n; i++) y0.push(parseFloat(ics[i]) || 0);
      var G = parseF(sides[1].trim() === '' ? '0' : sides[1]), gi = G.map(lapTerm), g = gi.length ? sumRat(gi) : { num: [0], den: [1] };
      var P = a.slice(0, n + 1), Q = Array(n).fill(0);
      for (var k = 1; k <= n; k++) for (var m = 0; m < k; m++) Q[m] += a[k] * y0[k - 1 - m];
      var YN = trim(pa(g.num, pm(trim(Q), g.den))), YD = trim(pm(P, g.den));
      var inv = inverse(YN, YD), y = inv.f, ver = inv.ok, ys = [y];
      for (k = 1; k <= n; k++) ys.push(dv(ys[k - 1]));
      for (i = 0; i < n; i++) if (Math.abs(ev(ys[i], 0) - y0[i]) > 1e-6 * (1 + Math.abs(y0[i]))) ver = false;
      [0.4, 1.1, 2.3].forEach(function (t) { var lhsV = 0, sm = 0; for (var q = 0; q <= n; q++) { lhsV += a[q] * ev(ys[q], t); sm += Math.abs(a[q] * ev(ys[q], t)); } var gv = ev(G, t); if (Math.abs(lhsV - gv) > 1e-6 * (1 + sm + Math.abs(gv))) ver = false; });
      var lt = []; for (k = 1; k <= n; k++) if (Math.abs(a[k]) > EPS) lt.push('L{y' + Array(k + 1).join("'") + '} = s' + (k > 1 ? '^' + k : '') + 'Y(s)' + (function () { var z = []; for (var m2 = 0; m2 < k; m2++) z.push((k - 1 - m2 > 0 ? 's' + (k - 1 - m2 > 1 ? '^' + (k - 1 - m2) : '') : '') + "y" + (m2 ? Array(m2 + 1).join("'") : '') + '(0)'); return ' - ' + z.join(' - '); })());
      var Gtext = gi.length ? gi.map(function (x) { return x.text; }).join('  +  ') : '0';
      return { ok: true, y: inv.text, verified: ver, order: n, laps: lt, G: Gtext, P: fp(P.slice().reverse().length ? P : [0]), Pfull: fp(P), Q: fp(trim(Q)), YN: fp(YN), YD: fp(YD), roots: inv.roots, pf: inv.pf, y0: y0 };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  root.CalvoODE = { laplace: laplace, inverse: inverseSrc, solve: solveODE, parse: parseF, ev: ev, fmt: ft };
})(typeof window !== 'undefined' ? window : globalThis);
