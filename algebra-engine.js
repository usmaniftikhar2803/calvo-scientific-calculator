/* Calvo - step-by-step Limit calculator and Algebra simplifier.
   Built on calculus-engine.js (parser, exact fractions, derivatives).
   Algebra uses exact rational polynomial arithmetic (several variables);
   every algebra answer is verified exactly, every limit is cross-checked numerically. */
(function (root) {
  'use strict';
  var C = root.CalvoCalc, I = C._internal;
  var mkNum = I.mkNum, ZERO = I.ZERO, ONE = I.ONE, MINUS1 = I.MINUS1, nAdd = I.nAdd, nMul = I.nMul, nNeg = I.nNeg, nInv = I.nInv, nv = I.nv;
  var isZ = I.isZ, isNum = I.isNum, isInt = I.isInt, nn = I.nn, sym = I.sym, mkAdd = I.mkAdd, mkMul = I.mkMul, mkPow = I.mkPow;
  var bgcd = I.bgcd, lcmBig = I.lcmBig, pTrim = I.pTrim, pDivide = I.pDivide, ratRoot = I.ratRoot, solveLinear = I.solveLinear;
  function F(a) { return C.fmt(a, 'h'); }
  function T(a) { return C.fmt(a, 't'); }
  function fail(m) { var e = new Error(m); e.user = true; throw e; }
  var MINUS = '\u2212';

  /* ================= multivariate polynomials (exact) ================= */
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function mpNew(vars) { return { vars: vars, t: {} }; }
  function mpConst(c, vars) { var P = mpNew(vars); if (!isZ(c)) { var e = zeros(vars.length); P.t[e.join(',')] = { c: c, e: e }; } return P; }
  function mpVar(name, vars, k) { var P = mpNew(vars), e = zeros(vars.length); e[vars.indexOf(name)] = k || 1; P.t[e.join(',')] = { c: ONE, e: e }; return P; }
  function mpAdd(A, B) {
    var P = mpNew(A.vars);
    Object.keys(A.t).forEach(function (k) { P.t[k] = A.t[k]; });
    Object.keys(B.t).forEach(function (k) {
      if (P.t[k]) { var c = nAdd(P.t[k].c, B.t[k].c); if (isZ(c)) delete P.t[k]; else P.t[k] = { c: c, e: B.t[k].e }; } else P.t[k] = B.t[k];
    });
    return P;
  }
  function mpScale(A, c) { var P = mpNew(A.vars); if (isZ(c)) return P; Object.keys(A.t).forEach(function (k) { P.t[k] = { c: nMul(A.t[k].c, c), e: A.t[k].e }; }); return P; }
  function mpNeg(A) { return mpScale(A, MINUS1); }
  function mpMul(A, B) {
    var P = mpNew(A.vars);
    Object.keys(A.t).forEach(function (ka) {
      Object.keys(B.t).forEach(function (kb) {
        var a = A.t[ka], b = B.t[kb], e = a.e.map(function (x, i) { return x + b.e[i]; }), k = e.join(','), c = nMul(a.c, b.c);
        if (P.t[k]) { c = nAdd(P.t[k].c, c); if (isZ(c)) delete P.t[k]; else P.t[k] = { c: c, e: e }; } else P.t[k] = { c: c, e: e };
      });
    });
    return P;
  }
  function mpPow(A, n) {
    var r = mpConst(ONE, A.vars), b = A;
    while (n > 0) { if (n & 1) r = mpMul(r, b); n >>= 1; if (n) b = mpMul(b, b); }
    return r;
  }
  function mpIsZero(A) { return Object.keys(A.t).length === 0; }
  function mpEq(A, B) {
    var ka = Object.keys(A.t), kb = Object.keys(B.t);
    if (ka.length !== kb.length) return false;
    return ka.every(function (k) { return B.t[k] && A.t[k].c.n === B.t[k].c.n && A.t[k].c.d === B.t[k].c.d; });
  }
  function mpTerms(A) {
    var L = Object.keys(A.t).map(function (k) { return A.t[k]; });
    L.sort(function (x, y) {
      var dx = x.e.reduce(function (s, v) { return s + v; }, 0), dy = y.e.reduce(function (s, v) { return s + v; }, 0);
      if (dx !== dy) return dy - dx;
      for (var i = 0; i < x.e.length; i++) if (x.e[i] !== y.e[i]) return y.e[i] - x.e[i];
      return 0;
    });
    return L;
  }
  function mpKeyStr(A) { return mpTerms(A).map(function (t) { return t.c.n + '/' + t.c.d + ':' + t.e.join(','); }).join('|'); }
  function mpDeg(A) { var m = 0; Object.keys(A.t).forEach(function (k) { var d = A.t[k].e.reduce(function (s, v) { return s + v; }, 0); if (d > m) m = d; }); return m; }
  function mpToNode(A) {
    var list = mpTerms(A).map(function (t) {
      var f = [t.c];
      t.e.forEach(function (k, i) { if (k > 0) f.push(mkPow(sym(A.vars[i]), nn(k))); });
      return mkMul(f);
    });
    return mkAdd(list);
  }
  function mpIsConst(A) { return mpIsZero(A) || (Object.keys(A.t).length === 1 && A.t[Object.keys(A.t)[0]].e.every(function (x) { return x === 0; })); }
  function mpConstVal(A) { return mpIsZero(A) ? ZERO : A.t[Object.keys(A.t)[0]].c; }

  /* ================= expression -> rational function (N / D) ================= */
  function walkVars(a, out) {
    if (a.t === 'sym') out[a.n] = true;
    else if (a.t === 'add' || a.t === 'mul') a.a.forEach(function (x) { walkVars(x, out); });
    else if (a.t === 'pow') { walkVars(a.b, out); walkVars(a.e, out); }
    else if (a.t === 'fn') walkVars(a.a, out);
  }
  function varsOf(node) { var o = {}; walkVars(node, o); return Object.keys(o).sort(); }
  function hasFn(a) {
    if (a.t === 'fn') return true;
    if (a.t === 'add' || a.t === 'mul') return a.a.some(hasFn);
    if (a.t === 'pow') return hasFn(a.b) || hasFn(a.e);
    return false;
  }
  function rAdd(x, y) { return { N: mpAdd(mpMul(x.N, y.D), mpMul(y.N, x.D)), D: mpMul(x.D, y.D) }; }
  function rMul(x, y) { return { N: mpMul(x.N, y.N), D: mpMul(x.D, y.D) }; }
  function rInv(x) { if (mpIsZero(x.N)) fail('Division by zero in the expression.'); return { N: x.D, D: x.N }; }
  function toRat(a, vars) {
    switch (a.t) {
      case 'num': return { N: mpConst(mkNum(a.n, 1n), vars), D: mpConst(mkNum(a.d, 1n), vars) };
      case 'sym': return { N: mpVar(a.n, vars), D: mpConst(ONE, vars) };
      case 'add': return a.a.map(function (x) { return toRat(x, vars); }).reduce(rAdd);
      case 'mul': return a.a.map(function (x) { return toRat(x, vars); }).reduce(rMul);
      case 'pow':
        if (isInt(a.e) && a.e.n >= -40n && a.e.n <= 40n) {
          var b = toRat(a.b, vars), k = Number(a.e.n), neg = k < 0;
          if (neg) { b = rInv(b); k = -k; }
          return { N: mpPow(b.N, k), D: mpPow(b.D, k) };
        }
        fail('Only whole-number powers are supported here (no roots or variable exponents).');
        break;
      default: fail('This tool works with polynomials and fractions of polynomials (no sin, ln, e^x or roots).');
    }
  }
  function parseRational(src) {
    var node = C.parse(src), vars = varsOf(node);
    if (vars.length > 4) fail('Please use at most 4 different letters.');
    if (hasFn(node)) fail('This tool works with polynomials and fractions of polynomials (no sin, ln, e^x or roots).');
    return { node: node, vars: vars, R: toRat(node, vars) };
  }

  /* ================= univariate helpers ================= */
  function mpToUni(A, v) {
    var i = A.vars.indexOf(v), arr = [];
    var ok = Object.keys(A.t).every(function (k) {
      var t = A.t[k];
      for (var j = 0; j < t.e.length; j++) if (j !== i && t.e[j] !== 0) return false;
      while (arr.length <= t.e[i]) arr.push(ZERO);
      arr[t.e[i]] = t.c;
      return true;
    });
    return ok ? pTrim(arr) : null;
  }
  function uniToMP(arr, v, vars) {
    var P = mpNew(vars), i = vars.indexOf(v);
    arr.forEach(function (c, k) { if (!isZ(c)) { var e = zeros(vars.length); e[i] = k; P.t[e.join(',')] = { c: c, e: e }; } });
    return P;
  }
  function uNode(arr, v) { return F(I.fromPoly(arr, v)); }
  function primitive(P) {
    P = pTrim(P);
    var L = 1n; P.forEach(function (c) { L = lcmBig(L, c.d); });
    var ints = P.map(function (c) { return c.n * (L / c.d); }), g = 0n;
    ints.forEach(function (x) { if (x !== 0n) g = (g === 0n) ? (x < 0n ? -x : x) : bgcd(g, x); });
    if (g === 0n) g = 1n;
    if (ints[ints.length - 1] < 0n) g = -g;
    return { c: mkNum(g, L), p: ints.map(function (x) { return mkNum(x / g); }) };
  }
  function divisors(n) {
    n = Math.abs(n); if (!n || n > 1e9) return null;
    var out = []; for (var d = 1; d * d <= n; d++) if (n % d === 0) { out.push(d); if (d * d !== n) out.push(n / d); }
    return out;
  }
  function findQuad(P) {
    var n = P.length - 1, lead = Number(P[n].n), cst = Number(P[0].n);
    var as = divisors(lead), cs = divisors(cst);
    if (!as || !cs) return null;
    var B = Math.min(60, P.reduce(function (s, c) { return s + Math.abs(Number(c.n)); }, 0)), tries = 0;
    for (var ai = 0; ai < as.length; ai++) for (var ci = 0; ci < cs.length; ci++) for (var sg = -1; sg <= 1; sg += 2) {
      var a = as[ai], c = cs[ci] * sg;
      for (var b = -B; b <= B; b++) {
        if (++tries > 250000) return null;
        var q = [mkNum(BigInt(c)), mkNum(BigInt(b)), mkNum(BigInt(a))];
        if (pDivide(P, q).r.length === 0) return q;
      }
    }
    return null;
  }
  // Factor an integer-coefficient primitive polynomial over the rationals.
  function factorUni(P, v, log) {
    var rem = P.slice(), facs = [], guard = 60;
    while (rem.length > 2 && guard--) {
      var r = ratRoot(rem);
      if (r === null) break;
      var fac = [mkNum(-r.n), mkNum(r.d)];
      var rv = I.fromPoly([ZERO, ONE], v), root = mkNum(r.n, r.d);
      log('Rational root test: try ' + v + ' = ' + F(root) + '. It makes the polynomial 0, so <b>' + F(I.fromPoly(fac, v)) + '</b> is a factor.');
      facs.push(fac);
      rem = pDivide(rem, fac).q;
      if (rem.length > 1) log('Divide it out. What is left: ' + uNode(rem, v), 1);
    }
    while (rem.length >= 5) {
      var q = findQuad(rem);
      if (!q) break;
      log('Found a quadratic factor <b>' + uNode(q, v) + '</b> (by trying integer coefficients that divide the first and last coefficients).');
      facs.push(q); rem = pDivide(rem, q).q;
      if (rem.length > 1) log('What is left: ' + uNode(rem, v), 1);
    }
    if (rem.length >= 2) {
      if (rem.length === 3) {
        var disc = nAdd(nMul(rem[1], rem[1]), nNeg(nMul(nn(4), nMul(rem[2], rem[0]))));
        log('<b>' + uNode(rem, v) + '</b> has discriminant b&sup2; ' + MINUS + ' 4ac = ' + F(disc) + (disc.n < 0n ? ', which is negative: no real roots, so it cannot be factored further.' : ', which is not a perfect square: the roots are irrational, so it cannot be factored over the rationals.'));
      } else if (rem.length > 3) log('<b>' + uNode(rem, v) + '</b> has no rational roots and no quadratic factor with whole-number coefficients, so Calvo leaves it as one factor.');
      facs.push(rem);
    }
    return facs;
  }

  /* ================= factoring (several variables) ================= */
  function mpContent(P) {
    var ts = mpTerms(P), L = 1n;
    ts.forEach(function (t) { L = lcmBig(L, t.c.d); });
    var g = 0n;
    ts.forEach(function (t) { var x = t.c.n * (L / t.c.d); if (x < 0n) x = -x; g = g === 0n ? x : bgcd(g, x); });
    var e = ts[0].e.slice();
    ts.forEach(function (t) { t.e.forEach(function (k, i) { if (k < e[i]) e[i] = k; }); });
    return { c: mkNum(g || 1n, L), e: e };
  }
  function addFac(list, mp, m) {
    var k = mpKeyStr(mp);
    for (var i = 0; i < list.length; i++) if (list[i].k === k) { list[i].m += m; return; }
    list.push({ mp: mp, k: k, m: m });
  }
  function monoMP(c, e, vars) { var P = mpNew(vars); P.t[e.join(',')] = { c: c, e: e }; return P; }
  function divMono(P, c, e) {
    var Q = mpNew(P.vars), ic = nInv(c);
    Object.keys(P.t).forEach(function (k) {
      var t = P.t[k], ne = t.e.map(function (x, i) { return x - e[i]; });
      Q.t[ne.join(',')] = { c: nMul(t.c, ic), e: ne };
    });
    return Q;
  }
  function varsUsed(Q) { var u = []; Q.vars.forEach(function (n, i) { if (Object.keys(Q.t).some(function (k) { return Q.t[k].e[i] > 0; })) u.push(n); }); return u; }
  function mergeInto(res, sub) { res.c = nMul(res.c, sub.c); sub.fs.forEach(function (f) { addFac(res.fs, f.mp, f.m); }); }

  function factorAny(P, log, depth) {
    var vars = P.vars, res = { c: ONE, fs: [], stuck: false };
    var ts = mpTerms(P);
    if (!ts.length) { res.c = ZERO; return res; }
    var ct = mpContent(P), c = ts[0].c.n < 0n ? nNeg(ct.c) : ct.c, mono = ct.e.some(function (x) { return x > 0; });
    res.c = c;
    var Q = divMono(P, c, ct.e);
    if (depth === 0 && (!(c.n === 1n && c.d === 1n) || mono)) {
      var cf = [];
      if (!(c.n === 1n && c.d === 1n)) cf.push(F(c));
      ct.e.forEach(function (k, i) { if (k > 0) cf.push(F(mkPow(sym(vars[i]), nn(k)))); });
      log('Take out the common factor <b>' + cf.join('') + '</b> from every term: ' + F(mpToNode(P)) + ' = ' + cf.join('') + '(' + F(mpToNode(Q)) + ')');
    }
    ct.e.forEach(function (k, i) { if (k > 0) addFac(res.fs, mpVar(vars[i], vars), k); });
    var qt = mpTerms(Q);
    if (qt.length === 1) return res;
    var used = varsUsed(Q);
    if (used.length === 1) {
      var v = used[0], arr = mpToUni(Q, v), pr = primitive(arr);
      var facs = factorUni(pr.p, v, function (h, l) { log(h, l); });
      if (facs.length === 1 && mpEq(uniToMP(facs[0], v, vars), Q) && depth === 0 && !mono && (c.n === 1n && c.d === 1n)) { /* irreducible: message already logged */ }
      facs.forEach(function (f) { addFac(res.fs, uniToMP(f, v, vars), 1); });
      return res;
    }
    var d = mpDeg(Q), homog = qt.every(function (t) { return t.e.reduce(function (s, x) { return s + x; }, 0) === d; });
    if (used.length === 2 && homog) {
      var X = used[0], Y = used[1], xi = vars.indexOf(X), arr2 = [];
      qt.forEach(function (t) { while (arr2.length <= t.e[xi]) arr2.push(ZERO); arr2[t.e[xi]] = t.c; });
      log('Every term has total degree ' + d + ', so set ' + Y + ' = 1, factor in ' + X + ', then put ' + Y + ' back to restore the degree.');
      var pr2 = primitive(pTrim(arr2)), facs2 = factorUni(pr2.p, X, function (h, l) { log(h, (l || 0) + 1); });
      facs2.forEach(function (f) {
        var k = f.length - 1, H = mpNew(vars);
        f.forEach(function (co, i) { if (!isZ(co)) { var e = zeros(vars.length); e[xi] = i; e[vars.indexOf(Y)] = k - i; H.t[e.join(',')] = { c: co, e: e }; } });
        addFac(res.fs, H, 1);
      });
      return res;
    }
    if (qt.length === 4 && depth < 3) {
      var pairs = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
      for (var pi = 0; pi < pairs.length; pi++) {
        var parts = pairs[pi].map(function (ix) {
          var A = mpNew(vars); ix.forEach(function (j) { A.t[qt[j].e.join(',')] = qt[j]; });
          var cc = mpContent(A), lead = mpTerms(A)[0].c, g = lead.n < 0n ? nNeg(cc.c) : cc.c;
          return { A: A, g: monoMP(g, cc.e, vars), cof: divMono(A, g, cc.e) };
        });
        if (mpEq(parts[0].cof, parts[1].cof) && !mpIsConst(parts[0].cof)) {
          var gsum = mpAdd(parts[0].g, parts[1].g);
          log('Factor by grouping: (' + F(mpToNode(parts[0].A)) + ') + (' + F(mpToNode(parts[1].A)) + ') = ' + F(mpToNode(parts[0].g)) + '&middot;(' + F(mpToNode(parts[0].cof)) + ') + ' + F(mpToNode(parts[1].g)) + '&middot;(' + F(mpToNode(parts[1].cof)) + '), and the bracket is common, so this is <b>(' + F(mpToNode(gsum)) + ')(' + F(mpToNode(parts[0].cof)) + ')</b>.');
          mergeInto(res, factorAny(gsum, log, depth + 1));
          mergeInto(res, factorAny(parts[0].cof, log, depth + 1));
          return res;
        }
      }
    }
    log('Calvo could not find a further factorisation of <b>' + F(mpToNode(Q)) + '</b>; it is left as one factor.');
    res.stuck = true; addFac(res.fs, Q, 1);
    return res;
  }
  function facList(res) {
    var fs = res.fs.slice();
    fs.sort(function (a, b) { var da = mpDeg(a.mp) - mpDeg(b.mp); return da || (a.k < b.k ? -1 : 1); });
    return fs;
  }
  function facNode(res) {
    var f = [];
    if (!(res.c.n === 1n && res.c.d === 1n)) f.push(res.c);
    facList(res).forEach(function (x) { f.push(x.m === 1 ? mpToNode(x.mp) : mkPow(mpToNode(x.mp), nn(x.m))); });
    return f.length ? mkMul(f) : ONE;
  }
  function facMP(res, vars) {
    var P = mpConst(res.c, vars);
    res.fs.forEach(function (x) { P = mpMul(P, mpPow(x.mp, x.m)); });
    return P;
  }
  function numericCheck(a, b, vars) {
    var good = 0;
    for (var k = 0; k < 8; k++) {
      var env = {}; vars.forEach(function (n, i) { env[n] = 0.37 + 0.61 * (k + 1) + 0.29 * i; });
      var x = I.ev(a, env), y = I.ev(b, env);
      if (!isFinite(x) || !isFinite(y)) continue;
      if (Math.abs(x - y) > 1e-7 * Math.max(1, Math.abs(x), Math.abs(y))) return false;
      good++;
    }
    return good >= 2;
  }
  function stepsOut() {
    var s = [];
    return { list: s, add: function (h, l) { s.push({ lvl: l || 0, html: h }); } };
  }
  function algebraErr(e) {
    if (e && e.user) return { ok: false, error: e.message };
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }

  /* ================= public: expand ================= */
  function binomialLine(node) {
    // (a + b)^n with two terms -> binomial theorem line
    if (node.t !== 'pow' || !isInt(node.e) || node.e.n < 2n || node.e.n > 8n || node.b.t !== 'add' || node.b.a.length !== 2) return null;
    var n = Number(node.e.n), a = node.b.a[0], b = node.b.a[1], parts = [];
    function wrap(x) { var s = F(x); return (x.t === 'add' || (x.t === 'num' && x.n < 0n) || (x.t === 'mul' && I.splitCoef(x)[0].n < 0n)) ? '(' + s + ')' : s; }
    var cb = 1;
    for (var k = 0; k <= n; k++) {
      var piece = [];
      if (cb !== 1) piece.push(String(cb));
      if (n - k > 0) piece.push(wrap(a) + (n - k > 1 ? '<sup>' + (n - k) + '</sup>' : ''));
      if (k > 0) piece.push(wrap(b) + (k > 1 ? '<sup>' + k + '</sup>' : ''));
      parts.push(piece.join('&middot;'));
      cb = cb * (n - k) / (k + 1);
    }
    return parts.join(' + ');
  }
  function expand(src) {
    try {
      var p = parseRational(src), S = stepsOut();
      if (!mpIsConst(p.R.D) && !mpEq(p.R.D, mpConst(ONE, p.vars))) {
        if (!(mpIsConst(p.R.D))) fail('Expand works on polynomials. For a fraction use Simplify.');
      }
      var N = p.R.N;
      if (!mpIsConst(p.R.D)) fail('Expand works on polynomials. For a fraction use Simplify.');
      var dc = mpConstVal(p.R.D); if (!(dc.n === 1n && dc.d === 1n)) N = mpScale(N, nInv(dc));
      var out = mpToNode(N);
      S.add('Start with ' + F(p.node));
      var node = p.node, bl = binomialLine(node);
      if (bl) S.add('Use the binomial theorem for the power of a sum: ' + bl, 0);
      else if (node.t === 'mul' || node.t === 'pow' || node.t === 'add') S.add('Multiply every term of each bracket by every term of the others (the distributive law), then use the power rules for the letters.');
      S.add('Collect like terms (same letters, same powers): <b>' + F(out) + '</b>');
      var ok = numericCheck(p.node, out, p.vars);
      return { ok: ok, error: ok ? undefined : 'Internal check failed.', steps: S.list, html: F(out), text: T(out), input: p.node, check: 'ok' };
    } catch (e) { return algebraErr(e); }
  }

  /* ================= public: factor ================= */
  function primeFactors(n) {
    var out = [], d = 2;
    while (d * d <= n) { var k = 0; while (n % d === 0) { n /= d; k++; } if (k) out.push([d, k]); d += d === 2 ? 1 : 2; }
    if (n > 1) out.push([n, 1]);
    return out;
  }
  function factor(src) {
    try {
      var node = C.parse(src);
      if (node.t === 'num' && isInt(node) && node.n !== 0n && (node.n < 0n ? -node.n : node.n) <= 1000000000000n && (node.n < 0n ? -node.n : node.n) > 1n) {
        var big = Number(node.n < 0n ? -node.n : node.n), pf = primeFactors(big);
        var txt = (node.n < 0n ? MINUS + '1 &middot; ' : '') + pf.map(function (x) { return x[0] + (x[1] > 1 ? '<sup>' + x[1] + '</sup>' : ''); }).join(' &middot; ');
        var S0 = stepsOut(); S0.add('Divide by the smallest primes again and again until 1 is left.');
        return { ok: true, steps: S0.list, html: txt, text: txt.replace(/<[^>]+>/g, '').replace(/&middot;/g, '*'), input: node, check: 'ok' };
      }
      var p = parseRational(src), S = stepsOut();
      if (!mpIsConst(p.R.D)) return simplifyCore(p, S, 'factor');
      var N = p.R.N, dc = mpConstVal(p.R.D);
      if (!(dc.n === 1n && dc.d === 1n)) N = mpScale(N, nInv(dc));
      if (mpIsZero(N)) return { ok: true, steps: [], html: '0', text: '0', input: p.node, check: 'ok' };
      S.add('Start with ' + F(mpToNode(N)));
      var res = factorAny(N, function (h, l) { S.add(h, l); }, 0);
      var outNode = facNode(res);
      var already = res.fs.length === 1 && res.fs[0].m === 1 && res.c.n === 1n && res.c.d === 1n;
      if (already) S.add('This expression has no factors with rational coefficients, so it is already fully factorised.');
      var verified = mpEq(facMP(res, p.vars), N);
      S.add('Final answer: <b>' + F(outNode) + '</b>');
      if (verified) S.add('Check: multiplying the factors back out gives exactly the original, so the factorisation is correct.');
      return { ok: true, steps: S.list, html: F(outNode), text: T(outNode), input: p.node, check: verified ? 'ok' : 'fail', unchanged: already, stuck: res.stuck };
    } catch (e) { return algebraErr(e); }
  }

  /* ================= public: simplify ================= */
  function restrictions(cancelled, vars) {
    var out = [];
    cancelled.forEach(function (f) {
      var u = varsUsed(f.mp);
      if (u.length === 1) {
        var arr = mpToUni(f.mp, u[0]);
        if (arr && arr.length === 2) out.push(u[0] + ' \u2260 ' + F(nNeg(nMul(arr[0], nInv(arr[1])))));
      }
    });
    return out;
  }
  function simplifyCore(p, S, mode) {
    var R = p.R, vars = p.vars;
    var polyOnly = mpIsConst(R.D);
    if (polyOnly) {
      var dc = mpConstVal(R.D), N0 = (dc.n === 1n && dc.d === 1n) ? R.N : mpScale(R.N, nInv(dc)), out0 = mpToNode(N0);
      S.add('Expand all brackets and collect like terms.');
      S.add('Result: <b>' + F(out0) + '</b>');
      return { ok: true, steps: S.list, html: F(out0), text: T(out0), input: p.node, check: numericCheck(p.node, out0, vars) ? 'ok' : 'fail', unchanged: false };
    }
    S.add('Start with ' + F(p.node));
    var multi = p.node.t === 'add' || (p.node.t === 'mul' && p.node.a.some(function (x) { return x.t === 'add'; })) || (p.node.t === 'pow' && p.node.e.n < 0n && p.node.b.t === 'add') ;
    if (p.node.t === 'add' || p.node.t === 'mul') S.add('Write everything as <b>one fraction</b> (common denominator) and multiply out: ' + F(mkMul([mpToNode(R.N), mkPow(mpToNode(R.D), MINUS1)])));
    S.add('Factor the numerator and the denominator.');
    var fn = factorAny(R.N, function (h, l) { S.add(h, (l || 0) + 1); }, 0);
    S.add('Numerator = ' + F(facNode(fn)), 1);
    var fd = factorAny(R.D, function (h, l) { S.add(h, (l || 0) + 1); }, 0);
    S.add('Denominator = ' + F(facNode(fd)), 1);
    // cancel
    var cancelled = [], numF = [], denF = [];
    fn.fs.forEach(function (a) { numF.push({ mp: a.mp, k: a.k, m: a.m }); });
    fd.fs.forEach(function (b) { denF.push({ mp: b.mp, k: b.k, m: b.m }); });
    numF.forEach(function (a) {
      denF.forEach(function (b) {
        if (a.k === b.k && a.m > 0 && b.m > 0) { var c = Math.min(a.m, b.m); a.m -= c; b.m -= c; cancelled.push({ mp: a.mp, m: c }); }
      });
    });
    var cr = nMul(fn.c, nInv(fd.c));
    var numRes = { c: mkNum(cr.n < 0n ? -cr.n : cr.n), fs: numF.filter(function (x) { return x.m > 0; }) };
    var denRes = { c: mkNum(cr.d), fs: denF.filter(function (x) { return x.m > 0; }) };
    var neg = cr.n < 0n;
    var nNode = facNode(numRes), dNode = facNode(denRes);
    var dIsOne = denRes.fs.length === 0 && denRes.c.n === 1n && denRes.c.d === 1n;
    var resNode = dIsOne ? nNode : mkMul([nNode, mkPow(dNode, MINUS1)]);
    if (neg) resNode = mkMul([MINUS1, resNode]);
    if (cancelled.length) {
      S.add('Cancel the common factor' + (cancelled.length > 1 ? 's' : '') + ': <b>' + cancelled.map(function (c) { return F(c.m === 1 ? mpToNode(c.mp) : mkPow(mpToNode(c.mp), nn(c.m))); }).join(', ') + '</b>');
      var rs = restrictions(cancelled, vars);
      if (rs.length) S.add('Note: the original expression is not defined when ' + rs.join(' or ') + ', so the simplified form is valid for all other values.', 1);
    } else if (!(cr.n === fn.c.n && cr.d === fn.c.d)) S.add('Reduce the number part of the fraction.');
    else S.add('There is no common factor to cancel, so the fraction is already in lowest terms.');
    var expandedNode = null;
    var NN = mpConst(numRes.c, vars), DD = mpConst(denRes.c, vars);
    numRes.fs.forEach(function (x) { NN = mpMul(NN, mpPow(x.mp, x.m)); });
    denRes.fs.forEach(function (x) { DD = mpMul(DD, mpPow(x.mp, x.m)); });
    if (neg) NN = mpNeg(NN);
    var shown = F(resNode);
    S.add('Result: <b>' + shown + '</b>');
    var ok = numericCheck(p.node, resNode, vars);
    var exp = null;
    if (!mpIsConst(DD)) { exp = F(mkMul([mpToNode(NN), mkPow(mpToNode(DD), MINUS1)])); }
    else { var dcn = mpConstVal(DD); exp = F(mpToNode(dcn.n === 1n && dcn.d === 1n ? NN : mpScale(NN, nInv(dcn)))); }
    if (exp && exp !== shown) S.add('Multiplied out: ' + exp, 1);
    var unchanged = !cancelled.length && !multi && mode !== 'factor';
    return { ok: true, steps: S.list, html: shown, text: T(resNode), input: p.node, check: ok ? 'ok' : 'fail', unchanged: unchanged, expanded: exp, cancelled: cancelled.length };
  }
  function simplify(src) {
    try { var p = parseRational(src); return simplifyCore(p, stepsOut(), 'simplify'); }
    catch (e) { return algebraErr(e); }
  }

  /* ================= public: partial fractions ================= */
  var UNK = 'ABCDFGHJKLMNPQRSTUVWXYZ';
  function partial(src) {
    try {
      var p = parseRational(src), S = stepsOut();
      if (p.vars.length !== 1) fail('Partial fractions needs a fraction in exactly one letter, for example (3x+5)/(x^2+x-2).');
      var v = p.vars[0], vars = p.vars;
      var Nn = mpToUni(p.R.N, v), Dn = mpToUni(p.R.D, v);
      if (!Dn || Dn.length < 2) fail('The denominator must contain ' + v + '.');
      var node = p.node;
      S.add('Start with ' + F(mkMul([mpToNode(p.R.N), mkPow(mpToNode(p.R.D), MINUS1)])));
      // reduce first if possible
      var fN = factorAny(p.R.N, function () {}, 0), fD0 = factorAny(p.R.D, function () {}, 0), cancelled = false;
      var NpR = p.R.N, DpR = p.R.D;
      fN.fs.forEach(function (a) { fD0.fs.forEach(function (b) { if (a.k === b.k && a.m > 0 && b.m > 0) cancelled = true; }); });
      if (cancelled) {
        var red = simplifyCore(p, stepsOut(), 'simplify');
        S.add('The top and bottom share a common factor, so reduce the fraction first: <b>' + red.html + '</b>');
        var again = (red.text && red.text !== T(p.node)) ? partial(red.text) : null;
        if (again && again.ok && !again.reducedOnly) { again.steps = S.list.concat(again.steps); return again; }
        return { ok: true, steps: S.list, html: red.html, text: red.text, input: p.node, check: red.check, reducedOnly: true };
      }
      var dnum = Nn ? Nn.length - 1 : -1, dden = Dn.length - 1, quo = null, R = Nn;
      var dcont = primitive(Dn), cD = dcont.c;
      if (Nn.length === 0) { return { ok: true, steps: S.list, html: '0', text: '0', input: node, check: 'ok' }; }
      if (dnum >= dden) {
        var dv = pDivide(Nn, Dn);
        quo = dv.q; R = dv.r;
        S.add('The top has degree ' + dnum + ' and the bottom has degree ' + dden + ', so it is an improper fraction. Divide first (long division): quotient <b>' + uNode(quo, v) + '</b>, remainder <b>' + (R.length ? uNode(R, v) : '0') + '</b>.');
        if (!R.length) {
          var only = I.fromPoly(quo, v);
          S.add('Nothing is left over, so the answer is just <b>' + F(only) + '</b>.');
          return { ok: true, steps: S.list, html: F(only), text: T(only), input: node, check: 'ok' };
        }
        S.add('Now split ' + F(mkMul([I.fromPoly(R, v), mkPow(I.fromPoly(Dn, v), MINUS1)])) + ' into partial fractions.', 1);
      }
      var Rs = R.map(function (c) { return nMul(c, nInv(cD)); });
      var fd = factorAny(mpMul(mpConst(ONE, vars), p.R.D), function () {}, 0);
      var fs = facList(fd), bad = fs.some(function (f) { return mpDeg(f.mp) > 2; });
      S.add('Factor the denominator: <b>' + F(facNode(fd)) + '</b>');
      if (bad) fail('The denominator has a factor of degree 3 or higher that cannot be split with rational numbers, so Calvo cannot do this partial-fraction split.');
      // build unknowns
      var unknowns = [], cols = [], terms = [], un = 0;
      var full = I.pMul || null;
      fs.forEach(function (f) {
        var fu = mpToUni(f.mp, v), deg = fu.length - 1;
        for (var j = 1; j <= f.m; j++) {
          // basis = D / f^j  (as uniPoly, with content absorbed in cD)
          var rest = [ONE];
          fs.forEach(function (g) {
            var gu = mpToUni(g.mp, v), pw = (g === f) ? g.m - j : g.m;
            for (var q = 0; q < pw; q++) rest = I.pMul(rest, gu);
          });
          var per = (deg === 1) ? [[ONE]] : [[ONE], [ZERO, ONE]];
          per.forEach(function (mulp, idx) {
            var name = UNK[un++], basis = I.pMul(rest, mulp);
            unknowns.push(name); cols.push(basis);
            var numNode = (deg === 1) ? sym(name) : (idx === 0 ? sym(name) : mkMul([sym(name), sym(v)]));
            terms.push({ name: name, deg: deg, j: j, f: fu, idx: idx });
          });
        }
      });
      // group display of ansatz
      var ansatz = [], used = {};
      terms.forEach(function (t) {
        var key = t.f.map(function (x) { return x.n + '/' + x.d; }).join(',') + '#' + t.j;
        if (used[key]) return; used[key] = 1;
        var den = t.j === 1 ? I.fromPoly(t.f, v) : mkPow(I.fromPoly(t.f, v), nn(t.j));
        if (t.deg === 1) ansatz.push(F(mkMul([sym(t.name), mkPow(den, MINUS1)])));
        else {
          var nm2 = terms.filter(function (z) { return z.f === t.f && z.j === t.j; });
          ansatz.push(F(mkMul([mkAdd([mkMul([sym(nm2[1].name), sym(v)]), sym(nm2[0].name)]), mkPow(den, MINUS1)])));
        }
      });
      S.add('Write the shape of the answer with unknown numbers (' + unknowns.join(', ') + '): ' + ansatz.join(' + '));
      var cdTxt = (cD.n === 1n && cD.d === 1n) ? '' : ' (the number ' + F(cD) + ' from the denominator is divided out of the top)';
      var lhs = F(I.fromPoly(Rs, v)), rhsParts = terms.map(function (t, i) { return F(mkMul([sym(t.name), I.fromPoly(cols[i], v)])); });
      S.add('Multiply both sides by the denominator to clear the fractions' + cdTxt + ': <b>' + lhs + ' = ' + rhsParts.join(' + ') + '</b>');
      var n = dden, M = [], rhs = [];
      for (var pw = 0; pw < n; pw++) {
        M.push(cols.map(function (c) { return c[pw] || ZERO; }));
        rhs.push(Rs[pw] || ZERO);
      }
      var lines = [];
      for (var pw2 = n - 1; pw2 >= 0; pw2--) {
        var lhsTerms = [];
        cols.forEach(function (c, i) { var co = c[pw2] || ZERO; if (!isZ(co)) lhsTerms.push(mkMul([co, sym(unknowns[i])])); });
        lines.push((pw2 === 0 ? 'constant' : v + (pw2 > 1 ? '<sup>' + pw2 + '</sup>' : '')) + ': ' + (lhsTerms.length ? F(mkAdd(lhsTerms)) : '0') + ' = ' + F(rhs[pw2]));
      }
      S.add('Match the coefficients of each power of ' + v + ' on both sides:');
      lines.forEach(function (l) { S.add(l, 1); });
      var sol = solveLinear(M, rhs);
      if (!sol) fail('Calvo could not solve the system for the unknown numbers.');
      S.add('Solve these equations: ' + unknowns.map(function (u, i) { return '<b>' + u + ' = ' + F(sol[i]) + '</b>'; }).join(', '));
      var pieces = [];
      if (quo) pieces.push(I.fromPoly(quo, v));
      var groupDone = {};
      terms.forEach(function (t, i) {
        var den = t.j === 1 ? I.fromPoly(t.f, v) : mkPow(I.fromPoly(t.f, v), nn(t.j));
        if (isZ(sol[i])) return;
        var numNode = t.deg === 1 ? sol[i] : (t.idx === 0 ? sol[i] : mkMul([sol[i], sym(v)]));
        pieces.push({ num: numNode, den: den, key: t.f.map(function (x) { return x.n + '/' + x.d; }).join(',') + '#' + t.j, deg: t.deg });
      });
      // combine quadratic-factor numerators
      var finalNodes = [], seen = {};
      if (quo) finalNodes.push(pieces.shift());
      pieces.forEach(function (pc) {
        if (pc.deg === 1) { finalNodes.push(mkMul([pc.num, mkPow(pc.den, MINUS1)])); return; }
        if (seen[pc.key]) return; seen[pc.key] = 1;
        var same = pieces.filter(function (z) { return z.key === pc.key; }), tot = mkAdd(same.map(function (z) { return z.num; }));
        finalNodes.push(mkMul([tot, mkPow(pc.den, MINUS1)]));
      });
      var finalNode = mkAdd(finalNodes);
      var shown = F(finalNode), ok = numericCheck(p.node, finalNode, vars);
      S.add('Put the numbers back: <b>' + shown + '</b>');
      if (ok) S.add('Check: adding these fractions again gives the original fraction (verified numerically at several points).');
      return { ok: true, steps: S.list, html: shown, text: T(finalNode), input: p.node, check: ok ? 'ok' : 'fail' };
    } catch (e) { return algebraErr(e); }
  }

  /* ================= LIMITS ================= */
  function fmtVal(x) {
    if (x === Infinity) return '\u221e';
    if (x === -Infinity) return MINUS + '\u221e';
    if (isNaN(x)) return 'undefined';
    var ax = Math.abs(x), s = (ax >= 1e7 || (ax < 1e-5 && x !== 0)) ? x.toExponential(5) : String(Math.round(x * 1e8) / 1e8);
    return s.replace('-', MINUS);
  }
  function evalAt(f, v, x) { var e = {}; e[v] = x; try { return I.ev(f, e); } catch (er) { return NaN; } }
  function recognize(x) {
    if (!isFinite(x)) return null;
    if (Math.abs(x) < 1e-12) return '0';
    var q;
    for (q = 1; q <= 24; q++) { var p = Math.round(x * q); if (Math.abs(x - p / q) < 1e-7) return q === 1 ? String(p) : p + '/' + q; }
    for (q = 1; q <= 12; q++) { var pp = Math.round(x / Math.PI * q); if (pp && Math.abs(x - pp * Math.PI / q) < 1e-7) return (pp === 1 ? '' : (pp === -1 ? '-' : pp)) + '\u03c0' + (q > 1 ? '/' + q : ''); }
    if (Math.abs(x - Math.E) < 1e-5) return 'e';
    if (Math.abs(x - 1 / Math.E) < 1e-5) return '1/e';
    if (Math.abs(x - Math.E * Math.E) < 1e-4) return 'e\u00b2';
    if (Math.abs(x - Math.exp(-2)) < 1e-5) return 'e\u207b\u00b2';
    if (Math.abs(x - Math.sqrt(Math.E)) < 1e-5) return '\u221ae';
    for (var s = 2; s <= 50; s++) { if (Math.abs(x - Math.sqrt(s)) < 1e-7 && Math.round(Math.sqrt(s)) !== Math.sqrt(s)) return '\u221a' + s; }
    return null;
  }
  function grows(l, m, k) {
    var al = Math.abs(l), am = Math.abs(m), ak = Math.abs(k);
    return al > 10 && al > am && am > ak && (al - am) > 0.5 * (am - ak) && (l > 0) === (m > 0);
  }
  function sideEst(f, v, a, side) {
    var hs = [1e-2, 1e-3, 1e-4, 1e-5, 1e-6], vals = hs.map(function (h) { return evalAt(f, v, a + side * h); });
    var l = vals[4], m = vals[3], k = vals[2];
    if (isNaN(l) || isNaN(m)) return null;
    if (!isFinite(l)) return l > 0 ? Infinity : -Infinity;
    if (grows(l, m, k)) return l > 0 ? Infinity : -Infinity;
    if (Math.abs(l - m) <= 2e-3 * Math.max(1, Math.abs(l))) return l;
    return null;
  }
  function oscillates(f, v, a) {
    var lo = Infinity, hi = -Infinity, n = 0;
    [-1, 1].forEach(function (sd) {
      for (var i = 0; i < 60; i++) {
        var y = evalAt(f, v, a + sd * Math.pow(10, -2 - i * 0.1));
        if (isFinite(y)) { n++; if (y < lo) lo = y; if (y > hi) hi = y; }
      }
    });
    return n > 40 && (hi - lo) > 0.5 * Math.max(1, Math.abs(hi), Math.abs(lo));
  }
  function infEst(f, v, sg) {
    var xs = [1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8].map(function (x) { return sg * x; }), vals = xs.map(function (x) { return evalAt(f, v, x); });
    var fin = vals.filter(function (y) { return !isNaN(y); });
    if (fin.length < 4) return null;
    var n = fin.length, last = fin[n - 1], prev = fin[n - 2], third = fin[n - 3];
    if (!isFinite(last)) return last > 0 ? Infinity : -Infinity;
    if (grows(last, prev, third)) return last > 0 ? Infinity : -Infinity;
    var al = Math.abs(last), ap = Math.abs(prev), at = Math.abs(third);
    if (al < 1e-4 && al < ap && ap < at) return 0;
    if (Math.abs(last - prev) <= 2e-3 * Math.max(1, al) && Math.abs(prev - third) <= 3e-2 * Math.max(1, al)) return last;
    return null;
  }
  function trendInf(g, v, sg) {
    var vs = [1e4, 1e6, 1e8].map(function (x) { return Math.abs(evalAt(g, v, sg * x)); });
    if (vs.some(isNaN)) return 'unk';
    if (!isFinite(vs[2]) || (vs[2] > 10 && vs[2] > vs[1] && vs[1] > vs[0])) return 'inf';
    if (vs[2] < 1e-4 && vs[2] < vs[1] && vs[1] < vs[0]) return 'zero';
    return 'fin';
  }
  function splitQuot(f) {
    var nums = [], dens = [], fac = f.t === 'mul' ? f.a : [f];
    fac.forEach(function (x) {
      if (x.t === 'pow' && isInt(x.e) && x.e.n < 0n) dens.push(mkPow(x.b, nNeg(x.e)));
      else nums.push(x);
    });
    return { N: nums.length ? mkMul(nums) : ONE, D: dens.length ? mkMul(dens) : ONE, has: dens.length > 0 };
  }
  function tryDirect(f, v, a) {
    try { var r = I.repl(f, v, a), val = I.ev(r, {}); return { node: r, val: val }; } catch (e) { return null; }
  }
  function isZeroish(x) { return isFinite(x) && Math.abs(x) < 1e-9; }
  function isHuge(x) { return !isFinite(x) || Math.abs(x) > 1e6; }
  function ratioNode(N, Dn) { return mkMul([N, mkPow(Dn, MINUS1)]); }

  function limit(src, ptStr, dirStr) {
    try {
      var S0 = I.setup(src), f = S0.node, v = S0.v, vs = varsOf(f).filter(function (n) { return n !== v && n !== 'e' && n !== 'pi'; });
      if (vs.length) fail('The limit calculator works with one letter at a time. Found: ' + vs.join(', ') + '.');
      var S = stepsOut(), pt = String(ptStr === undefined ? '' : ptStr).trim().toLowerCase().replace(/\s+/g, '');
      if (!pt) fail('Type the value ' + v + ' approaches, for example 0, 2, pi or inf.');
      var infSign = 0, a = null, aval;
      var m = pt.match(/^([+\-\u2212]?)(inf|infinity|oo|\u221e)$/);
      if (m) infSign = (m[1] === '-' || m[1] === MINUS) ? -1 : 1;
      else { a = I.parseBound(pt); aval = I.ev(a, {}); if (!isFinite(aval)) fail('That point is not a number.'); }
      var dir = (dirStr === 'left' || dirStr === 'right') ? dirStr : 'both';
      if (infSign) dir = 'both';
      var side = dir === 'left' ? -1 : 1;
      var arrow = infSign ? (infSign > 0 ? '+\u221e' : MINUS + '\u221e') : F(a) + (dir === 'left' ? '<sup>' + MINUS + '</sup>' : dir === 'right' ? '<sup>+</sup>' : '');
      S.add('Find <b>lim</b><sub>' + v + ' \u2192 ' + arrow + '</sub> ' + F(f));
      var res = { kind: 'exact', node: null, value: NaN, note: null };
      var table = [];

      if (!infSign) {
        /* ---------- finite point ---------- */
        var lv = sideEst(f, v, aval, -1), rv = sideEst(f, v, aval, 1);
        var direct = tryDirect(f, v, a);
        if (direct && isFinite(direct.val)) {
          var exactTxt = F(direct.node), isn = direct.node.t === 'num';
          S.add('<b>Direct substitution.</b> Put ' + v + ' = ' + F(a) + ' into the function: ' + exactTxt + (isn ? '' : ' \u2248 ' + fmtVal(direct.val)));
          S.add('The result is a finite number (not 0/0 or division by zero), so the function is continuous here and the limit equals the value.', 1);
          res.node = direct.node; res.value = direct.val;
        } else {
          S.add('<b>Direct substitution</b> fails: putting ' + v + ' = ' + F(a) + ' gives an undefined result (like 0/0 or a/0).');
          var dneMsg = null;
          if (dir === 'both' && lv !== null && rv !== null) {
            var bothFin = isFinite(lv) && isFinite(rv);
            if ((bothFin && Math.abs(lv - rv) > 1e-4 * Math.max(1, Math.abs(lv), Math.abs(rv))) || (!bothFin && lv !== rv)) {
              dneMsg = 'Left-hand limit \u2248 ' + fmtVal(lv) + ', right-hand limit \u2248 ' + fmtVal(rv) + '. They are different.';
            }
          }
          if (dneMsg) {
            S.add('<b>Check both sides.</b> ' + dneMsg);
            S.add('A limit exists only when the left and right limits are equal, so the two-sided limit does <b>not exist</b>. (Choose "from the left" or "from the right" to get the one-sided limits.)', 1);
            res.kind = 'dne'; res.value = NaN;
          } else {
            var q = splitQuot(f), done = false;
            var Nv = evalAt(q.N, v, aval), Dv = evalAt(q.D, v, aval);
            // 1) algebraic route for fractions of polynomials
            var rat = null;
            try { rat = parseRational(src); } catch (e) { rat = null; }
            if (rat && rat.vars.length === 1 && rat.vars[0] === v && !mpIsConst(rat.R.D) && q.has) {
              var fNN = factorAny(rat.R.N, function () {}, 0), fDD = factorAny(rat.R.D, function () {}, 0);
              var Nu = mpToUni(rat.R.N, v), Du = mpToUni(rat.R.D, v);
              var nz = Nu && isZeroish(evalAt(I.fromPoly(Nu, v), v, aval)), dz = Du && isZeroish(evalAt(I.fromPoly(Du, v), v, aval));
              if (nz && dz) {
                var rr = simplifyCore(rat, stepsOut(), 'simplify');
                S.add('Both top and bottom are 0 at ' + v + ' = ' + F(a) + ' (the form <b>0/0</b>, which is indeterminate). Factor and cancel the common factor that causes the zero.');
                S.add('Numerator = ' + F(facNode(fNN)) + ', denominator = ' + F(facNode(fDD)), 1);
                var simp = rr.html;
                S.add('After cancelling: <b>' + simp + '</b>', 1);
                var rnode = null;
                try { var pr2 = parseRational(rr.text); rnode = pr2.node; } catch (e2) { rnode = null; }
                var d2 = rnode ? tryDirect(rnode, v, a) : null;
                if (d2 && isFinite(d2.val)) {
                  S.add('Now substitute ' + v + ' = ' + F(a) + ': <b>' + F(d2.node) + '</b>' + (d2.node.t === 'num' ? '' : ' \u2248 ' + fmtVal(d2.val)));
                  res.node = d2.node; res.value = d2.val; done = true;
                }
              }
            }
            // 2) L'Hopital
            if (!done && q.has && isZeroish(Nv) && isZeroish(Dv)) {
              var N1 = q.N, D1 = q.D, k = 0;
              S.add('Top and bottom both tend to 0: the form <b>0/0</b> is indeterminate. Use <b>L\u2019H\u00f4pital\u2019s rule</b>: the limit of N/D equals the limit of N\u2032/D\u2032 (differentiate top and bottom separately).');
              while (k < 5) {
                k++;
                N1 = I.D(N1, v); D1 = I.D(D1, v);
                S.add('Differentiate: N\u2032 = ' + F(N1) + ', D\u2032 = ' + F(D1), 1);
                var n2 = evalAt(N1, v, aval), d2v = evalAt(D1, v, aval);
                if (isZeroish(n2) && isZeroish(d2v)) { S.add('Still <b>0/0</b>, so apply L\u2019H\u00f4pital\u2019s rule again.', 1); continue; }
                if (!isZeroish(d2v) && isFinite(d2v) && isFinite(n2)) {
                  var dn = tryDirect(N1, v, a), dd = tryDirect(D1, v, a);
                  if (dn && dd) {
                    var ex = mkMul([dn.node, mkPow(dd.node, MINUS1)]);
                    S.add('Now substitute ' + v + ' = ' + F(a) + ': <b>' + F(ex) + '</b>' + (ex.t === 'num' ? '' : ' \u2248 ' + fmtVal(n2 / d2v)));
                    res.node = ex; res.value = n2 / d2v; done = true;
                  }
                }
                break;
              }
            }
            // 3) a/0 -> infinity
            if (!done && q.has && isZeroish(Dv) && isFinite(Nv) && !isZeroish(Nv)) {
              S.add('The top tends to ' + fmtVal(Nv) + ' (not 0) while the bottom tends to 0, so the function blows up. The sign depends on the side you approach from.');
              var l2 = sideEst(f, v, aval, -1), r2 = sideEst(f, v, aval, 1);
              if (dir === 'both') {
                S.add('From the left the values go to ' + fmtVal(l2) + '; from the right they go to ' + fmtVal(r2) + '.', 1);
                if (l2 === r2 && !isFinite(l2)) { res.value = l2; done = true; S.add('Both sides agree, so the limit is <b>' + fmtVal(l2) + '</b>.', 1); }
                else { res.kind = 'dne'; res.value = NaN; done = true; S.add('The two sides go to different places, so the limit does <b>not exist</b>.', 1); }
              } else {
                var one = dir === 'left' ? l2 : r2;
                S.add('Approaching from the ' + dir + ', the values go to <b>' + fmtVal(one) + '</b>.', 1);
                res.value = one; done = true;
              }
            }
            // 4) 0 * infinity -> quotient
            if (!done && f.t === 'mul' && f.a.length === 2) {
              var u = f.a[0], w = f.a[1], uv = sideEst(u, v, aval, side), wv = sideEst(w, v, aval, side);
              if (uv !== null && wv !== null) {
                var zero = isFinite(uv) && Math.abs(uv) < 1e-6 ? u : (isFinite(wv) && Math.abs(wv) < 1e-6 ? w : null), big = zero === u ? w : u, bigv = zero === u ? wv : uv;
                if (zero && !isFinite(bigv)) {
                  var Nq = big, Dq = mkPow(zero, MINUS1);
                  S.add('The form is <b>0 \u00d7 \u221e</b>. Rewrite it as a fraction: ' + F(ratioNode(Nq, Dq)) + ' (form \u221e/\u221e).');
                  var k2 = 0, A1 = Nq, B1 = Dq;
                  while (k2 < 4) {
                    k2++; A1 = I.D(A1, v); B1 = I.D(B1, v);
                    S.add('L\u2019H\u00f4pital: differentiate top and bottom: N\u2032 = ' + F(A1) + ', D\u2032 = ' + F(B1), 1);
                    var nf = ratioNode(A1, B1), val = sideEst(nf, v, aval, side);
                    if (val !== null && isFinite(val)) { var dd2 = tryDirect(nf, v, a); if (dd2 && isFinite(dd2.val)) { res.node = dd2.node; res.value = dd2.val; } else res.value = val; S.add('Simplify and substitute: <b>' + fmtVal(val) + '</b>', 1); done = true; break; }
                    if (val !== null && !isFinite(val)) { res.value = val; done = true; break; }
                  }
                }
              }
            }
            if (!done) {
              var one2 = dir === 'left' ? lv : (dir === 'right' ? rv : (lv !== null && lv === rv ? lv : (lv !== null && rv !== null && isFinite(lv) && isFinite(rv) && Math.abs(lv - rv) <= 1e-4 * Math.max(1, Math.abs(lv)) ? (lv + rv) / 2 : null)));
              if (one2 === null && dir === 'both' && oscillates(f, v, aval)) {
                S.add('As ' + v + ' gets close to ' + F(a) + ' the values keep swinging between different numbers and never settle down (see the table), so the limit does <b>not exist</b>.');
                res.kind = 'dne'; res.value = NaN; one2 = 0;
              } else if (one2 === null) fail('Calvo could not determine this limit reliably. Try rewriting the function, or choose a one-sided limit.');
              else {
                S.add('Exact algebra rules did not finish this one, so Calvo estimates the limit by putting in values very close to ' + F(a) + ' (see the table below). This is a numerical estimate.');
                res.kind = 'estimate'; res.value = one2;
              }
            }
          }
        }
        // table of values
        var offs = [0.1, 0.01, 0.001, 0.0001];
        if (dir !== 'right') offs.slice().reverse().forEach(function (h) { table.push([aval - h, evalAt(f, v, aval - h)]); });
        if (dir !== 'left') offs.forEach(function (h) { table.push([aval + h, evalAt(f, v, aval + h)]); });
      } else {
        /* ---------- x -> +/- infinity ---------- */
        var sg = infSign, rat2 = null;
        try { rat2 = parseRational(src); } catch (e) { rat2 = null; }
        var done2 = false;
        if (rat2 && rat2.vars.length === 1 && rat2.vars[0] === v) {
          var NU = mpToUni(rat2.R.N, v), DU = mpToUni(rat2.R.D, v);
          if (NU && DU) {
            var dN = NU.length - 1, dD = DU.length - 1, lN = NU[NU.length - 1], lD = DU[DU.length - 1];
            S.add('This is a fraction of polynomials. Compare the highest powers: the top has degree <b>' + dN + '</b> and the bottom has degree <b>' + dD + '</b>. Dividing top and bottom by ' + v + (dD > 1 ? '<sup>' + dD + '</sup>' : (dD === 1 ? '' : '<sup>0</sup>')) + ' leaves only the leading terms.');
            if (NU.length === 0) { res.value = 0; res.node = ZERO; S.add('The top is 0, so the limit is 0.', 1); }
            else if (dN < dD) { S.add('Top degree &lt; bottom degree, so every term still containing ' + v + ' in the denominator makes the fraction shrink: the limit is <b>0</b>.', 1); res.value = 0; res.node = ZERO; }
            else if (dN === dD) { var rt = nMul(lN, nInv(lD)); S.add('Equal degrees, so the limit is the ratio of the leading coefficients: ' + F(lN) + ' / ' + F(lD) + ' = <b>' + F(rt) + '</b>.', 1); res.value = nv(rt); res.node = rt; }
            else {
              var sgn = (lN.n < 0n ? -1 : 1) * (lD.n < 0n ? -1 : 1) * (sg < 0 && ((dN - dD) % 2) ? -1 : 1);
              S.add('Top degree &gt; bottom degree, so the fraction grows without bound. The sign comes from the leading coefficients (' + F(lN) + ' and ' + F(lD) + ')' + (sg < 0 ? ' and from ' + v + ' being negative' : '') + ': the limit is <b>' + (sgn > 0 ? '+\u221e' : MINUS + '\u221e') + '</b>.', 1);
              res.value = sgn > 0 ? Infinity : -Infinity;
            }
            done2 = true;
          }
        }
        if (!done2) {
          var q3 = splitQuot(f);
          var tn = trendInf(q3.N, v, sg), td = trendInf(q3.D, v, sg), big1 = tn === 'inf';
          if (q3.has && ((tn === 'inf' && td === 'inf') || (tn === 'zero' && td === 'zero'))) {
            var form = big1 ? '\u221e/\u221e' : '0/0';
            S.add('Top and bottom both ' + (big1 ? 'grow without bound' : 'tend to 0') + ': the form <b>' + form + '</b> is indeterminate. Use <b>L\u2019H\u00f4pital\u2019s rule</b> (differentiate top and bottom).');
            var A2 = q3.N, B2 = q3.D, k3 = 0;
            while (k3 < 5) {
              k3++; A2 = I.D(A2, v); B2 = I.D(B2, v);
              S.add('N\u2032 = ' + F(A2) + ', D\u2032 = ' + F(B2), 1);
              var nf2 = ratioNode(A2, B2), est = infEst(nf2, v, sg);
              if (est !== null) {
                var rat3 = null; try { rat3 = parseRational(T(nf2)); } catch (e3) { rat3 = null; }
                S.add('Now look at ' + F(nf2) + ' as ' + v + ' \u2192 ' + arrow + ': it tends to <b>' + fmtVal(est) + '</b>.', 1);
                res.value = est; done2 = true; break;
              }
            }
          }
        }
        if (!done2) {
          var est2 = infEst(f, v, sg);
          if (est2 === null) fail('Calvo could not determine this limit reliably.');
          S.add('Calvo estimates the limit by evaluating the function at very large values of ' + v + ' (see the table). This is a numerical estimate.');
          res.kind = 'estimate'; res.value = est2;
        }
        [10, 100, 1000, 10000, 100000].forEach(function (x) { table.push([sg * x, evalAt(f, v, sg * x)]); });
      }

      // answer + numeric verification
      var shown, text, extra = '';
      if (res.kind === 'dne') { shown = 'does not exist'; text = 'does not exist'; }
      else if (res.node && !(res.node.t === 'fn' && false)) {
        shown = F(res.node); text = T(res.node);
        var dec = fmtVal(res.value);
        if (res.node.t !== 'num' && isFinite(res.value)) extra = ' \u2248 ' + dec;
      } else {
        var rc = isFinite(res.value) ? recognize(res.value) : null;
        shown = isFinite(res.value) ? ((res.kind === 'estimate' && res.value !== 0) ? '\u2248 ' + fmtVal(res.value) : fmtVal(res.value)) : fmtVal(res.value);
        text = shown;
        if (rc && res.kind === 'estimate' && rc !== '0') extra = ' (looks like ' + rc + ')';
      }
      var check = 'skip';
      if (res.kind !== 'dne') {
        if (!infSign) {
          var lc = sideEst(f, v, aval, -1), rc2 = sideEst(f, v, aval, 1), want = [];
          if (dir !== 'right') want.push(lc); if (dir !== 'left') want.push(rc2);
          var okc = want.every(function (w) { return w !== null && (res.value === w || (isFinite(w) && isFinite(res.value) && Math.abs(w - res.value) <= 5e-3 * Math.max(1, Math.abs(res.value)))); });
          check = okc ? 'ok' : (want.every(function (w) { return w === null; }) ? 'skip' : 'fail');
        } else {
          var ie = infEst(f, v, infSign);
          check = ie === null ? 'skip' : ((res.value === ie || (isFinite(ie) && isFinite(res.value) && Math.abs(ie - res.value) <= 5e-3 * Math.max(1, Math.abs(res.value)))) ? 'ok' : 'fail');
        }
      }
      return { ok: true, v: v, input: f, steps: S.list, html: shown + extra, text: text, value: res.value, kind: res.kind, check: check,
        table: table.map(function (r) { return { x: fmtVal(r[0]), y: fmtVal(r[1]) }; }), arrow: arrow };
    } catch (e) { return algebraErr(e); }
  }

  root.CalvoAlg = { limit: limit, expand: expand, factor: factor, simplify: simplify, partial: partial, version: 1 };
})(typeof window !== 'undefined' ? window : globalThis);
