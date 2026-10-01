/* Calvo — step-by-step calculus engine (derivatives and integrals).
   Exact rational arithmetic, rule-based differentiation and integration,
   and every answer is checked numerically before it is shown. */
(function (root) {
  'use strict';

  /* ================= exact numbers ================= */
  function bgcd(a, b) { if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) { var t = a % b; a = b; b = t; } return a || 1n; }
  function mkNum(n, d) {
    if (d === undefined) d = 1n;
    if (d === 0n) throw new Error('Division by zero.');
    if (d < 0n) { n = -n; d = -d; }
    var g = bgcd(n, d);
    return { t: 'num', n: n / g, d: d / g };
  }
  var ZERO = mkNum(0n), ONE = mkNum(1n), MINUS1 = mkNum(-1n), HALF = mkNum(1n, 2n);
  function isNum(a) { return a.t === 'num'; }
  function isInt(a) { return a.t === 'num' && a.d === 1n; }
  function isZ(a) { return a.t === 'num' && a.n === 0n; }
  function isOne(a) { return a.t === 'num' && a.n === 1n && a.d === 1n; }
  function nv(a) { return Number(a.n) / Number(a.d); }
  function nAdd(a, b) { return mkNum(a.n * b.d + b.n * a.d, a.d * b.d); }
  function nMul(a, b) { return mkNum(a.n * b.n, a.d * b.d); }
  function nInv(a) { return mkNum(a.d, a.n); }
  function nNeg(a) { return mkNum(-a.n, a.d); }
  function sym(n) { return { t: 'sym', n: n }; }
  function nn(k) { return mkNum(BigInt(k)); }

  /* ================= structure helpers ================= */
  function key(a) {
    if (a._k) return a._k;
    var k;
    switch (a.t) {
      case 'num': k = a.n + '/' + a.d; break;
      case 'sym': k = a.n; break;
      case 'add': k = '+(' + a.a.map(key).sort().join(',') + ')'; break;
      case 'mul': k = '*(' + a.a.map(key).sort().join(',') + ')'; break;
      case 'pow': k = '^(' + key(a.b) + ',' + key(a.e) + ')'; break;
      case 'fn': k = a.n + '(' + key(a.a) + ')'; break;
    }
    a._k = k; return k;
  }
  function has(a, v) {
    switch (a.t) {
      case 'num': return false;
      case 'sym': return a.n === v;
      case 'add': case 'mul': return a.a.some(function (x) { return has(x, v); });
      case 'pow': return has(a.b, v) || has(a.e, v);
      case 'fn': return has(a.a, v);
    }
    return false;
  }
  function isVarSym(n) { return n.length === 1 && n !== 'e'; }

  function splitCoef(t) {
    if (t.t === 'num') return [t, null];
    if (t.t === 'mul') {
      var c = ONE, rest = [];
      t.a.forEach(function (f) { if (f.t === 'num') c = nMul(c, f); else rest.push(f); });
      if (!rest.length) return [c, null];
      return [c, rest.length === 1 ? rest[0] : { t: 'mul', a: rest }];
    }
    return [ONE, t];
  }
  function mulRaw(c, rest) {
    if (isOne(c)) return rest;
    if (rest.t === 'mul') return { t: 'mul', a: [c].concat(rest.a) };
    return { t: 'mul', a: [c, rest] };
  }

  /* ================= smart constructors (always simplified) ================= */
  function monoDeg(t) {
    var r = splitCoef(t)[1];
    if (!r) return null;
    if (r.t === 'sym' && isVarSym(r.n)) return 1;
    if (r.t === 'pow' && r.b.t === 'sym' && isVarSym(r.b.n) && isNum(r.e)) return nv(r.e);
    return null;
  }
  function mkAdd(list) {
    var terms = [];
    (function flat(l) { l.forEach(function (t) { if (t.t === 'add') flat(t.a); else terms.push(t); }); })(list);
    var map = {}, order = [], c0 = ZERO;
    terms.forEach(function (t) {
      var sc = splitCoef(t);
      if (sc[1] === null) { c0 = nAdd(c0, sc[0]); return; }
      var k = key(sc[1]);
      if (map[k]) map[k].c = nAdd(map[k].c, sc[0]);
      else { map[k] = { c: sc[0], r: sc[1] }; order.push(k); }
    });
    var out = [];
    order.forEach(function (k) { var m = map[k]; if (!isZ(m.c)) out.push(mulRaw(m.c, m.r)); });
    var mono = [], other = [];
    out.forEach(function (t) { (monoDeg(t) !== null ? mono : other).push(t); });
    mono.sort(function (a, b) { return monoDeg(b) - monoDeg(a); });
    out = mono.concat(other);
    if (!isZ(c0)) out.push(c0);
    if (!out.length) return ZERO;
    if (out.length === 1) return out[0];
    return { t: 'add', a: out };
  }

  function rank(f) {
    switch (f.t) {
      case 'sym': return isVarSym(f.n) ? 2 : 1;
      case 'pow':
        if (f.b.t === 'sym') return f.b.n === 'e' ? 4 : (isVarSym(f.b.n) ? 2 : 1);
        if (f.b.t === 'add') return 5;
        if (f.b.t === 'fn') return 3;
        return 4;
      case 'fn': return 3;
      case 'add': return 5;
    }
    return 6;
  }
  function mkMul(list, depth) {
    depth = depth || 0;
    var c = ONE, facs = [];
    (function flat(l) {
      l.forEach(function (f) {
        if (f.t === 'mul') flat(f.a);
        else if (f.t === 'num') c = nMul(c, f);
        else facs.push(f);
      });
    })(list);
    if (isZ(c)) return ZERO;
    var map = {}, order = [];
    facs.forEach(function (f) {
      var b = f, e = ONE;
      if (f.t === 'pow') { b = f.b; e = f.e; }
      var k = key(b);
      if (map[k]) map[k].es.push(e); else { map[k] = { b: b, es: [e] }; order.push(k); }
    });
    var out = [], again = false;
    order.forEach(function (k) {
      var m = map[k];
      var e = m.es.length === 1 ? m.es[0] : mkAdd(m.es);
      var f = mkPow(m.b, e);
      if (f.t === 'num') c = nMul(c, f);
      else { if (f.t === 'mul') again = true; out.push(f); }
    });
    if (isZ(c)) return ZERO;
    if (again && depth < 6) return mkMul([c].concat(out), depth + 1);
    out.sort(function (a, b) { var ra = rank(a), rb = rank(b); if (ra !== rb) return ra - rb; var ka = key(a), kb = key(b); return ka < kb ? -1 : ka > kb ? 1 : 0; });
    if (!out.length) return c;
    if (out.length === 1 && isOne(c)) return out[0];
    return { t: 'mul', a: isOne(c) ? out : [c].concat(out) };
  }

  function intPow(r, k) {
    var neg = k < 0; if (neg) k = -k;
    var n = r.n ** BigInt(k), d = r.d ** BigInt(k);
    return neg ? mkNum(d, n) : mkNum(n, d);
  }
  function iroot(n, k) {
    if (n < 2n) return n;
    var lo = 1n, hi = n;
    while (lo <= hi) {
      var mid = (lo + hi) / 2n, p = mid ** BigInt(k);
      if (p === n) return mid;
      if (p < n) lo = mid + 1n; else hi = mid - 1n;
    }
    return null;
  }
  function mkPow(b, e) {
    if (isNum(e)) { if (isZ(e)) return ONE; if (isOne(e)) return b; }
    if (isNum(b)) {
      if (isOne(b)) return ONE;
      if (isZ(b) && isNum(e)) { if (e.n > 0n) return ZERO; throw new Error('Division by zero.'); }
      if (isNum(e)) {
        if (e.d === 1n && e.n < 200n && e.n > -200n) return intPow(b, Number(e.n));
        if (b.n > 0n && e.d < 20n) {
          var q = Number(e.d), rn = iroot(b.n, q), rd = iroot(b.d, q);
          if (rn !== null && rd !== null && e.n < 200n && e.n > -200n) return intPow(mkNum(rn, rd), Number(e.n));
        }
      }
    }
    if (b.t === 'pow' && isInt(e)) return mkPow(b.b, mkMul([b.e, e]));
    if (b.t === 'mul' && isInt(e)) return mkMul(b.a.map(function (f) { return mkPow(f, e); }));
    if (b.t === 'fn' && b.n === 'abs' && isInt(e) && e.n % 2n === 0n) return mkPow(b.a, e);
    if (b.t === 'sym' && b.n === 'e' && e.t === 'fn' && e.n === 'ln') return e.a;
    return { t: 'pow', b: b, e: e };
  }

  var ODD = { sin: 1, tan: 1, asin: 1, atan: 1, sinh: 1, tanh: 1, cot: 1, csc: 1 };
  var EVEN = { cos: 1, cosh: 1, sec: 1 };
  function mkFn(n, a) {
    if (n === 'sqrt') return mkPow(a, HALF);
    if (n === 'exp') return mkPow(sym('e'), a);
    if (isZ(a)) {
      if (ODD[n] && n !== 'cot' && n !== 'csc') return ZERO;
      if (EVEN[n] && n !== 'sec') return ONE;
      if (n === 'sec') return ONE;
    }
    if (n === 'ln') {
      if (isOne(a)) return ZERO;
      if (a.t === 'sym' && a.n === 'e') return ONE;
      if (a.t === 'pow' && a.b.t === 'sym' && a.b.n === 'e') return a.e;
    }
    if (n === 'abs' && isNum(a)) return mkNum(a.n < 0n ? -a.n : a.n, a.d);
    if (n === 'abs' && a.t === 'fn' && a.n === 'abs') return a;
    if (ODD[n] || EVEN[n]) {
      var sc = splitCoef(a);
      if (sc[0].n < 0n) {
        var na = mkMul([MINUS1, a]);
        if (ODD[n]) return mkMul([MINUS1, mkFn(n, na)]);
        return mkFn(n, na);
      }
    }
    return { t: 'fn', n: n, a: a };
  }

  function repl(a, name, r) {
    switch (a.t) {
      case 'sym': return a.n === name ? r : a;
      case 'add': return mkAdd(a.a.map(function (t) { return repl(t, name, r); }));
      case 'mul': return mkMul(a.a.map(function (t) { return repl(t, name, r); }));
      case 'pow': return mkPow(repl(a.b, name, r), repl(a.e, name, r));
      case 'fn': return mkFn(a.n, repl(a.a, name, r));
    }
    return a;
  }
  function substU(a, uk, uNode, usym) {
    if (key(a) === uk) return usym;
    switch (a.t) {
      case 'add': return mkAdd(a.a.map(function (t) { return substU(t, uk, uNode, usym); }));
      case 'mul': return mkMul(a.a.map(function (t) { return substU(t, uk, uNode, usym); }));
      case 'pow':
        if (uNode.t === 'pow' && key(a.b) === key(uNode.b) && isNum(a.e) && isNum(uNode.e)) {
          var ratio = nMul(a.e, nInv(uNode.e));
          if (ratio.d === 1n) return mkPow(usym, ratio);
        }
        return mkPow(substU(a.b, uk, uNode, usym), substU(a.e, uk, uNode, usym));
      case 'fn': return mkFn(a.n, substU(a.a, uk, uNode, usym));
    }
    return a;
  }

  function expand(a) {
    switch (a.t) {
      case 'add': return mkAdd(a.a.map(expand));
      case 'mul':
        var terms = [ONE];
        a.a.forEach(function (f) {
          var ef = expand(f), fs = ef.t === 'add' ? ef.a : [ef], nt = [];
          terms.forEach(function (t) { fs.forEach(function (g) { nt.push(mkMul([t, g])); }); });
          terms = nt;
        });
        return mkAdd(terms);
      case 'pow':
        var eb = expand(a.b);
        if (isInt(a.e) && a.e.n > 0n && a.e.n <= 12n && eb.t === 'add') {
          var r = eb, n = Number(a.e.n);
          for (var i = 1; i < n; i++) r = expand(mkMul([r, eb]));
          return r;
        }
        return mkPow(eb, a.e);
      case 'fn': return mkFn(a.n, expand(a.a));
    }
    return a;
  }

  /* ================= parser ================= */
  var FUNCS = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'exp', 'log', 'ln', 'abs'];
  var ALIAS = { arcsin: 'asin', arccos: 'acos', arctan: 'atan' };

  function normalizeInput(s) {
    return String(s)
      .replace(/\u2212|\u2013/g, '-').replace(/[\u00d7\u00b7\u22c5]/g, '*').replace(/\u00f7/g, '/')
      .replace(/\u00b2/g, '^2').replace(/\u00b3/g, '^3').replace(/\u03c0/g, 'pi').replace(/\u221a/g, 'sqrt')
      .replace(/\*\*/g, '^').replace(/\[/g, '(').replace(/\]/g, ')').replace(/\{/g, '(').replace(/\}/g, ')');
  }
  function tokenize(src) {
    var s = normalizeInput(src).toLowerCase(), i = 0, toks = [];
    while (i < s.length) {
      var ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        var j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
        var lit = s.slice(i, j);
        if ((lit.match(/\./g) || []).length > 1 || lit === '.') throw new Error('Check the number "' + lit + '".');
        toks.push({ k: 'num', v: lit }); i = j; continue;
      }
      if (/[a-z]/.test(ch)) {
        var j2 = i; while (j2 < s.length && /[a-z]/.test(s[j2])) j2++;
        var run = s.slice(i, j2), p = 0;
        while (p < run.length) {
          var m = null;
          if (run.slice(p, p + 2) === 'pi') m = 'pi';
          else FUNCS.forEach(function (f) { if (run.slice(p, p + f.length) === f && (!m || f.length > m.length)) m = f; });
          if (m === 'pi') { toks.push({ k: 'id', v: 'pi' }); p += 2; }
          else if (m) { toks.push({ k: 'fn', v: ALIAS[m] || m }); p += m.length; }
          else { toks.push({ k: 'id', v: run[p] }); p++; }
        }
        i = j2; continue;
      }
      if ('+-*/^(),'.indexOf(ch) >= 0) { toks.push({ k: ch }); i++; continue; }
      throw new Error('Unexpected character "' + ch + '".');
    }
    return toks;
  }
  function litToNum(lit) {
    var dot = lit.indexOf('.');
    if (dot < 0) return mkNum(BigInt(lit));
    var frac = lit.slice(dot + 1), whole = lit.slice(0, dot) || '0';
    return mkNum(BigInt(whole + frac), 10n ** BigInt(frac.length));
  }

  function parse(src) {
    var toks = tokenize(src), p = 0;
    if (!toks.length) throw new Error('Type a function first, for example x^2*sin(x).');
    function peek() { return toks[p]; }
    function next() { return toks[p++]; }
    function startsFactor(t) { return t && (t.k === 'num' || t.k === 'id' || t.k === 'fn' || t.k === '('); }
    function expect(k, msg) { var t = next(); if (!t || t.k !== k) throw new Error(msg); return t; }

    function parseAdd() {
      var t = parseMul();
      while (peek() && (peek().k === '+' || peek().k === '-')) {
        var op = next().k, r = parseMul();
        t = mkAdd([t, op === '-' ? mkMul([MINUS1, r]) : r]);
      }
      return t;
    }
    function parseMul() {
      var t = parseUnary();
      for (;;) {
        var tk = peek();
        if (!tk) break;
        if (tk.k === '*') { next(); t = mkMul([t, parseUnary()]); }
        else if (tk.k === '/') { next(); t = mkMul([t, mkPow(parseUnary(), MINUS1)]); }
        else if (startsFactor(tk)) { t = mkMul([t, parsePower()]); }
        else break;
      }
      return t;
    }
    function parseUnary() {
      var tk = peek();
      if (tk && tk.k === '-') { next(); return mkMul([MINUS1, parseUnary()]); }
      if (tk && tk.k === '+') { next(); return parseUnary(); }
      return parsePower();
    }
    function parseExponent() {
      var tk = peek();
      if (tk && tk.k === '-') { next(); return mkMul([MINUS1, parseExponent()]); }
      if (tk && tk.k === '+') { next(); return parseExponent(); }
      return parsePower();
    }
    function parsePower() {
      var b = parseAtom();
      if (peek() && peek().k === '^') { next(); b = mkPow(b, parseExponent()); }
      return b;
    }
    function parseAtom() {
      var t = next();
      if (!t) throw new Error('The expression ends too early. Check for a missing number or bracket.');
      if (t.k === 'num') return litToNum(t.v);
      if (t.k === '(') {
        var e = parseAdd();
        expect(')', 'A closing bracket ")" is missing.');
        return e;
      }
      if (t.k === 'id') return sym(t.v);
      if (t.k === 'fn') {
        var pw = null;
        if (peek() && peek().k === '^') { next(); pw = parseExponent(); }
        var arg;
        if (peek() && peek().k === '(') {
          next(); arg = parseAdd();
          expect(')', 'A closing bracket ")" is missing after ' + t.v + '(...).');
        } else {
          if (!peek() || !(peek().k === 'num' || peek().k === 'id' || peek().k === 'fn')) throw new Error('Write the argument in brackets, e.g. ' + t.v + '(x).');
          arg = parsePower();
          if (arg.t === 'num' && peek() && peek().k === 'id') arg = mkMul([arg, parsePower()]);
        }
        var f;
        if (t.v === 'log') f = mkMul([mkFn('ln', arg), mkPow(mkFn('ln', nn(10)), MINUS1)]);
        else f = mkFn(t.v, arg);
        return pw ? mkPow(f, pw) : f;
      }
      if (t.k === ')') throw new Error('Unexpected closing bracket ")".');
      throw new Error('Unexpected "' + t.k + '". Check the expression.');
    }
    var res = parseAdd();
    if (p < toks.length) throw new Error(toks[p].k === ')' ? 'Unexpected closing bracket ")".' : 'Could not read the expression near "' + (toks[p].v || toks[p].k) + '".');
    return res;
  }

  function symsOf(a, out) {
    out = out || {};
    switch (a.t) {
      case 'sym': out[a.n] = 1; break;
      case 'add': case 'mul': a.a.forEach(function (x) { symsOf(x, out); }); break;
      case 'pow': symsOf(a.b, out); symsOf(a.e, out); break;
      case 'fn': symsOf(a.a, out); break;
    }
    return out;
  }
  function pickVar(node) {
    var s = symsOf(node); delete s.e; delete s.pi;
    var names = Object.keys(s);
    if (s.x || !names.length) return 'x';
    return names.length === 1 ? names[0] : 'x';
  }
  function freshName(node) {
    var s = symsOf(node), c = ['u', 'w', 'z', 's', 't', 'p'];
    for (var i = 0; i < c.length; i++) if (!s[c[i]]) return c[i];
    return 'u';
  }

  /* ================= printer ================= */
  function fmt(a, mode) {
    var H = mode !== 't';
    var MINUS = H ? '\u2212' : '-';
    function sup(s, simple) {
      if (H) return '<sup>' + s + '</sup>';
      return '^' + (simple ? s : '(' + s + ')');
    }
    function frac(n, d) { return H ? '<span class="fr"><span class="nu">' + n + '</span><span class="de">' + d + '</span></span>' : '(' + n + ')/(' + d + ')'; }
    var FN = { asin: 'arcsin', acos: 'arccos', atan: 'arctan' };
    function fname(n) { return H ? (FN[n] || n) : n; }
    function numStr(a, inline) {
      var n = a.n < 0n ? -a.n : a.n, s;
      if (a.d === 1n) s = String(n);
      else s = (inline || !H) ? n + '/' + a.d : frac(String(n), String(a.d));
      return (a.n < 0n ? MINUS : '') + s;
    }
    function level(a) {
      switch (a.t) {
        case 'num': return a.n < 0n ? 1 : (a.d === 1n ? 5 : 2);
        case 'sym': case 'fn': return 5;
        case 'add': return 1;
        case 'mul': return splitCoef(a)[0].n < 0n ? 1 : 2;
        case 'pow': return 3;
      }
      return 5;
    }
    function str(a, ctx) {
      var s = raw(a);
      return level(a) < ctx ? '(' + s + ')' : s;
    }
    function raw(a) {
      switch (a.t) {
        case 'num': return numStr(a, false);
        case 'sym': return a.n === 'pi' ? (H ? '\u03c0' : 'pi') : a.n;
        case 'add': return addStr(a);
        case 'mul': return mulStr(a);
        case 'pow': return powStr(a);
        case 'fn': return fnStr(a);
      }
      return '?';
    }
    function addStr(a) {
      var out = '';
      a.a.forEach(function (t, i) {
        var neg = false, abs = t;
        if (t.t === 'num' && t.n < 0n) { neg = true; abs = nNeg(t); }
        else if (t.t === 'mul') { var sc = splitCoef(t); if (sc[0].n < 0n) { neg = true; abs = mulRaw(nNeg(sc[0]), sc[1]); } }
        var s = str(abs, 1);
        if (i === 0) out += (neg ? MINUS : '') + s;
        else out += ' ' + (neg ? MINUS : '+') + ' ' + s;
      });
      return out;
    }
    function joinParts(parts) {
      var s = '';
      parts.forEach(function (p, i) {
        if (i) s += !H ? '*' : ((p.add || parts[i - 1].num) ? '' : ' ');
        s += p.s;
      });
      return s;
    }
    function mulStr(a) {
      var c = ONE, nums = [], dens = [];
      a.a.forEach(function (f) {
        if (f.t === 'num') { c = f; return; }
        if (f.t === 'pow' && isNum(f.e) && f.e.n < 0n) {
          var pe = mkNum(-f.e.n, f.e.d);
          dens.push(isOne(pe) ? f.b : { t: 'pow', b: f.b, e: pe });
        } else nums.push(f);
      });
      var neg = c.n < 0n, cn = neg ? nNeg(c) : c;
      var np = [], dp = [];
      if (cn.n !== 1n || !nums.length) np.push({ s: String(cn.n), num: true });
      nums.forEach(function (f) { np.push({ s: str(f, 2), add: f.t === 'add' }); });
      if (cn.d !== 1n) dp.push({ s: String(cn.d), num: true });
      dens.forEach(function (f) { dp.push({ s: str(f, 2), add: f.t === 'add' }); });
      var body = dp.length ? frac(joinParts(np), joinParts(dp)) : joinParts(np);
      return (neg ? MINUS : '') + body;
    }
    function sqrtStr(b) {
      var simple = b.t === 'sym' || (b.t === 'num' && b.d === 1n && b.n >= 0n);
      if (!H) return 'sqrt(' + raw(b) + ')';
      return '\u221a' + (simple ? raw(b) : '(' + raw(b) + ')');
    }
    function expStr(e) { return isNum(e) ? numStr(e, true) : raw(e); }
    function powStr(a) {
      var b = a.b, e = a.e;
      if (isNum(e) && e.n < 0n) {
        var pe = mkNum(-e.n, e.d);
        var den = isOne(pe) ? raw(b) : raw({ t: 'pow', b: b, e: pe });
        if (!isOne(pe) || level(b) < 2) den = isOne(pe) ? str(b, 0) : den;
        return frac('1', den);
      }
      if (isNum(e) && e.n === 1n && e.d === 2n) return sqrtStr(b);
      if (b.t === 'sym' && b.n === 'e') return 'e' + sup(expStr(e), isNum(e) && e.d === 1n || e.t === 'sym');
      if (H && b.t === 'fn' && isInt(e) && e.n > 0n) return fname(b.n) + sup(String(e.n)) + '(' + raw(b.a) + ')';
      var simpleExp = (isNum(e) && e.d === 1n && e.n > 0n) || e.t === 'sym';
      return str(b, 4) + sup(expStr(e), simpleExp);
    }
    function fnStr(a) {
      if (a.n === 'abs') return '|' + raw(a.a) + '|';
      return fname(a.n) + '(' + raw(a.a) + ')';
    }
    return str(a, 0);
  }

  /* ================= numeric evaluation ================= */
  var CONSTS = { pi: Math.PI, e: Math.E };
  function constVal(n) {
    if (CONSTS[n] !== undefined) return CONSTS[n];
    return 0.5 + (n.charCodeAt(0) % 11) * 0.23;
  }
  function ev(a, env) {
    switch (a.t) {
      case 'num': return nv(a);
      case 'sym': return env[a.n] !== undefined ? env[a.n] : constVal(a.n);
      case 'add': { var s = 0; for (var i = 0; i < a.a.length; i++) s += ev(a.a[i], env); return s; }
      case 'mul': { var m = 1; for (var j = 0; j < a.a.length; j++) m *= ev(a.a[j], env); return m; }
      case 'pow': return Math.pow(ev(a.b, env), ev(a.e, env));
      case 'fn': {
        var x = ev(a.a, env);
        switch (a.n) {
          case 'sin': return Math.sin(x); case 'cos': return Math.cos(x); case 'tan': return Math.tan(x);
          case 'cot': return 1 / Math.tan(x); case 'sec': return 1 / Math.cos(x); case 'csc': return 1 / Math.sin(x);
          case 'asin': return Math.asin(x); case 'acos': return Math.acos(x); case 'atan': return Math.atan(x);
          case 'sinh': return Math.sinh(x); case 'cosh': return Math.cosh(x); case 'tanh': return Math.tanh(x);
          case 'ln': return Math.log(x); case 'abs': return Math.abs(x);
        }
      }
    }
    return NaN;
  }

  /* ================= logging ================= */
  function newCtx(v, u) { return { steps: [], lvl: 0, silent: 0, v: v, u: u, depth: 0, stack: [] }; }
  function say(c, html) { if (!c.silent) c.steps.push({ lvl: c.lvl, html: html }); }
  function F(a) { return fmt(a, 'h'); }
  function dd(v) { return 'd/d' + v; }

  /* ================= differentiation ================= */
  var FDER = {
    sin: function (u) { return mkFn('cos', u); },
    cos: function (u) { return mkMul([MINUS1, mkFn('sin', u)]); },
    tan: function (u) { return mkPow(mkFn('sec', u), nn(2)); },
    cot: function (u) { return mkMul([MINUS1, mkPow(mkFn('csc', u), nn(2))]); },
    sec: function (u) { return mkMul([mkFn('sec', u), mkFn('tan', u)]); },
    csc: function (u) { return mkMul([MINUS1, mkFn('csc', u), mkFn('cot', u)]); },
    asin: function (u) { return mkPow(mkAdd([ONE, mkMul([MINUS1, mkPow(u, nn(2))])]), mkNum(-1n, 2n)); },
    acos: function (u) { return mkMul([MINUS1, mkPow(mkAdd([ONE, mkMul([MINUS1, mkPow(u, nn(2))])]), mkNum(-1n, 2n))]); },
    atan: function (u) { return mkPow(mkAdd([ONE, mkPow(u, nn(2))]), MINUS1); },
    sinh: function (u) { return mkFn('cosh', u); },
    cosh: function (u) { return mkFn('sinh', u); },
    tanh: function (u) { return mkPow(mkFn('cosh', u), nn(-2)); },
    ln: function (u) { return mkPow(u, MINUS1); },
    abs: function (u) { return mkMul([u, mkPow(mkFn('abs', u), MINUS1)]); }
  };
  var FRULE = {
    sin: 'cos(u)', cos: '\u2212sin(u)', tan: 'sec\u00b2(u)', cot: '\u2212csc\u00b2(u)', sec: 'sec(u)tan(u)', csc: '\u2212csc(u)cot(u)',
    asin: '1/\u221a(1\u2212u\u00b2)', acos: '\u22121/\u221a(1\u2212u\u00b2)', atan: '1/(1+u\u00b2)', sinh: 'cosh(u)', cosh: 'sinh(u)', tanh: 'sech\u00b2(u)', ln: '1/u', abs: 'u/|u|'
  };
  var FNAME = { asin: 'arcsin', acos: 'arccos', atan: 'arctan' };

  function D(f, v, c) {
    if (!has(f, v)) {
      say(c, 'The derivative of a constant is 0: ' + dd(v) + '[' + F(f) + '] = 0.');
      return ZERO;
    }
    if (f.t === 'sym') { say(c, dd(v) + '[' + v + '] = 1.'); return ONE; }
    var r;
    if (f.t === 'add') {
      say(c, '<b>Sum rule:</b> differentiate each term separately.');
      c.lvl++;
      var parts = f.a.map(function (t) {
        var before = c.steps.length, tr = D(t, v, c);
        return tr;
      });
      c.lvl--;
      r = mkAdd(parts);
      say(c, 'Add the results: ' + F(r));
      return r;
    }
    if (f.t === 'mul') {
      var consts = [], vars = [];
      f.a.forEach(function (x) { (has(x, v) ? vars : consts).push(x); });
      if (consts.length) {
        var c0 = mkMul(consts), g = mkMul(vars);
        say(c, '<b>Constant multiple rule:</b> (c\u00b7g)\u2032 = c\u00b7g\u2032, with c = ' + F(c0) + ' and g = ' + F(g) + '.');
        c.lvl++; var gp = D(g, v, c); c.lvl--;
        r = mkMul([c0, gp]);
        say(c, 'So ' + dd(v) + '[' + F(f) + '] = ' + F(r));
        return r;
      }
      var numF = [], denF = [];
      vars.forEach(function (x) {
        if (x.t === 'pow' && isNum(x.e) && x.e.n < 0n) denF.push(mkPow(x.b, nNeg(x.e))); else numF.push(x);
      });
      if (numF.length && denF.length) {
        var u = mkMul(numF), w = mkMul(denF);
        say(c, '<b>Quotient rule:</b> (u/v)\u2032 = (u\u2032v \u2212 uv\u2032)/v\u00b2, with u = ' + F(u) + ' and v = ' + F(w) + '.');
        c.lvl++;
        say(c, 'Find u\u2032:'); c.lvl++; var up = D(u, v, c); c.lvl--;
        say(c, 'Find v\u2032:'); c.lvl++; var wp = D(w, v, c); c.lvl--;
        c.lvl--;
        var numer = expand(mkAdd([mkMul([up, w]), mkMul([MINUS1, u, wp])]));
        r = mkMul([numer, mkPow(w, nn(-2))]);
        say(c, 'So ' + dd(v) + '[' + F(f) + '] = ' + F(r));
        return r;
      }
      if (vars.length === 2) {
        say(c, '<b>Product rule:</b> (u\u00b7v)\u2032 = u\u2032v + uv\u2032, with u = ' + F(vars[0]) + ' and v = ' + F(vars[1]) + '.');
        c.lvl++;
        say(c, 'Find u\u2032:'); c.lvl++; var a1 = D(vars[0], v, c); c.lvl--;
        say(c, 'Find v\u2032:'); c.lvl++; var a2 = D(vars[1], v, c); c.lvl--;
        c.lvl--;
        r = mkAdd([mkMul([a1, vars[1]]), mkMul([vars[0], a2])]);
        say(c, 'So ' + dd(v) + '[' + F(f) + '] = u\u2032v + uv\u2032 = ' + F(r));
        return r;
      }
      say(c, '<b>Product rule</b> for several factors: differentiate one factor at a time and keep the others unchanged, then add the results.');
      c.lvl++;
      var terms = vars.map(function (fi, i) {
        say(c, 'Differentiate ' + F(fi) + ':');
        c.lvl++; var dfi = D(fi, v, c); c.lvl--;
        return mkMul([dfi].concat(vars.filter(function (_, j) { return j !== i; })));
      });
      c.lvl--;
      r = mkAdd(terms);
      say(c, 'Add the results: ' + F(r));
      return r;
    }
    if (f.t === 'pow') {
      var b = f.b, e = f.e;
      if (!has(e, v)) {
        var em1 = mkAdd([e, MINUS1]);
        if (b.t === 'sym') {
          r = mkMul([e, mkPow(b, em1)]);
          say(c, '<b>Power rule:</b> (x<sup>n</sup>)\u2032 = n\u00b7x<sup>n\u22121</sup>, so ' + dd(v) + '[' + F(f) + '] = ' + F(r) + '.');
          return r;
        }
        say(c, '<b>Chain rule with the power rule:</b> (u<sup>n</sup>)\u2032 = n\u00b7u<sup>n\u22121</sup>\u00b7u\u2032, with u = ' + F(b) + ' and n = ' + F(e) + '.');
        c.lvl++; say(c, 'Find u\u2032:'); c.lvl++; var bp = D(b, v, c); c.lvl--; c.lvl--;
        r = mkMul([e, mkPow(b, em1), bp]);
        say(c, 'So ' + dd(v) + '[' + F(f) + '] = ' + F(r));
        return r;
      }
      if (!has(b, v)) {
        var isE = b.t === 'sym' && b.n === 'e';
        say(c, isE
          ? '<b>Exponential rule:</b> (e<sup>u</sup>)\u2032 = e<sup>u</sup>\u00b7u\u2032, with u = ' + F(e) + '.'
          : '<b>Exponential rule:</b> (a<sup>u</sup>)\u2032 = a<sup>u</sup>\u00b7ln(a)\u00b7u\u2032, with a = ' + F(b) + ' and u = ' + F(e) + '.');
        var ep;
        if (e.t === 'sym') ep = ONE; else { c.lvl++; say(c, 'Find u\u2032:'); c.lvl++; ep = D(e, v, c); c.lvl--; c.lvl--; }
        r = isE ? mkMul([f, ep]) : mkMul([f, mkFn('ln', b), ep]);
        say(c, 'So ' + dd(v) + '[' + F(f) + '] = ' + F(r));
        return r;
      }
      say(c, '<b>Logarithmic differentiation:</b> for y = u<sup>w</sup>, y\u2032 = u<sup>w</sup>\u00b7(w\u2032\u00b7ln u + w\u00b7u\u2032/u), with u = ' + F(b) + ' and w = ' + F(e) + '.');
      c.lvl++;
      say(c, 'Find u\u2032:'); c.lvl++; var ub = D(b, v, c); c.lvl--;
      say(c, 'Find w\u2032:'); c.lvl++; var we = D(e, v, c); c.lvl--;
      c.lvl--;
      r = mkMul([f, mkAdd([mkMul([we, mkFn('ln', b)]), mkMul([e, ub, mkPow(b, MINUS1)])])]);
      say(c, 'So ' + dd(v) + '[' + F(f) + '] = ' + F(r));
      return r;
    }
    if (f.t === 'fn') {
      var inner = f.a, outer = FDER[f.n](inner), nm = FNAME[f.n] || f.n;
      if (inner.t === 'sym') {
        r = outer;
        say(c, '<b>Standard derivative:</b> ' + dd(v) + '[' + F(f) + '] = ' + F(r) + '.');
        return r;
      }
      say(c, '<b>Chain rule:</b> ' + dd(v) + '[' + nm + '(u)] = ' + FRULE[f.n] + '\u00b7u\u2032, with u = ' + F(inner) + '.');
      c.lvl++; say(c, 'Find u\u2032:'); c.lvl++; var ip = D(inner, v, c); c.lvl--; c.lvl--;
      r = mkMul([outer, ip]);
      say(c, 'So ' + dd(v) + '[' + F(f) + '] = ' + F(r));
      return r;
    }
    throw new Error('Unsupported expression.');
  }
  function Dq(f, v) { var c = newCtx(v, 'u'); c.silent = 1; return D(f, v, c); }

  /* ================= polynomial helpers (arrays of exact numbers, index = degree) ================= */
  function pTrim(p) { var q = p.slice(); while (q.length && isZ(q[q.length - 1])) q.pop(); return q; }
  function pDeg(p) { return pTrim(p).length - 1; }
  function toPoly(node, v) {
    var e = expand(node), terms = e.t === 'add' ? e.a : [e], poly = [];
    for (var i = 0; i < terms.length; i++) {
      var sc = splitCoef(terms[i]), deg;
      if (!isNum(sc[0])) return null;
      var r = sc[1];
      if (r === null) deg = 0;
      else if (r.t === 'sym' && r.n === v) deg = 1;
      else if (r.t === 'pow' && r.b.t === 'sym' && r.b.n === v && isInt(r.e) && r.e.n >= 2n && r.e.n < 60n) deg = Number(r.e.n);
      else return null;
      while (poly.length <= deg) poly.push(ZERO);
      poly[deg] = nAdd(poly[deg], sc[0]);
    }
    return pTrim(poly);
  }
  function fromPoly(p, v) {
    var terms = [];
    p.forEach(function (c, k) { if (!isZ(c)) terms.push(mkMul([c, mkPow(sym(v), nn(k))])); });
    return mkAdd(terms);
  }
  function pDivide(N, Dn) {
    var r = N.slice(), q = [], dd0 = pTrim(Dn), dl = dd0.length - 1, lead = dd0[dl];
    for (var i = 0; i <= N.length - 1 - dl; i++) q.push(ZERO);
    for (var k = r.length - 1; k >= dl; k--) {
      var coef = nMul(r[k], nInv(lead));
      if (q.length) q[k - dl] = coef;
      for (var j = 0; j <= dl; j++) r[k - dl + j] = nAdd(r[k - dl + j], nNeg(nMul(coef, dd0[j])));
    }
    return { q: pTrim(q), r: pTrim(r.slice(0, dl)) };
  }
  function pMul(a, b) {
    var out = [];
    for (var i = 0; i < a.length + b.length - 1; i++) out.push(ZERO);
    a.forEach(function (x, i) { b.forEach(function (y, j) { out[i + j] = nAdd(out[i + j], nMul(x, y)); }); });
    return pTrim(out);
  }
  function lcmBig(a, b) { return a / bgcd(a, b) * b; }
  function ratRoot(P) {
    // rational root of polynomial P (exact numbers), or null
    if (isZ(P[0])) return ZERO;
    var L = 1n; P.forEach(function (c) { L = lcmBig(L, c.d); });
    var I = P.map(function (c) { return c.n * (L / c.d); });
    var a0 = I[0] < 0n ? -I[0] : I[0], an = I[I.length - 1] < 0n ? -I[I.length - 1] : I[I.length - 1];
    if (a0 > 1000000000000n || an > 1000000000000n) return null;
    function divisors(n) { var out = [], N = Number(n); for (var d = 1; d * d <= N; d++) if (N % d === 0) { out.push(BigInt(d)); if (d * d !== N) out.push(BigInt(N / d)); } return out; }
    var ps = divisors(a0), qs = divisors(an);
    for (var i = 0; i < ps.length; i++) for (var j = 0; j < qs.length; j++) {
      if (bgcd(ps[i], qs[j]) !== 1n) continue;
      for (var s = -1n; s <= 1n; s += 2n) {
        var p = s * ps[i], q = qs[j], sum = 0n, n = I.length - 1;
        for (var k = 0; k <= n; k++) sum += I[k] * (p ** BigInt(k)) * (q ** BigInt(n - k));
        if (sum === 0n) return mkNum(p, q);
      }
    }
    return null;
  }
  function pDivLinear(P, r) {
    var res = pDivide(P, [nNeg(r), ONE]);
    return res.q;
  }
  function solveLinear(M, rhs) {
    var n = rhs.length, A = M.map(function (row, i) { return row.concat([rhs[i]]); });
    for (var col = 0; col < n; col++) {
      var piv = -1;
      for (var r = col; r < n; r++) if (!isZ(A[r][col])) { piv = r; break; }
      if (piv < 0) return null;
      var t = A[col]; A[col] = A[piv]; A[piv] = t;
      var inv = nInv(A[col][col]);
      A[col] = A[col].map(function (x) { return nMul(x, inv); });
      for (var r2 = 0; r2 < n; r2++) if (r2 !== col && !isZ(A[r2][col])) {
        var f = A[r2][col];
        A[r2] = A[r2].map(function (x, k) { return nAdd(x, nNeg(nMul(f, A[col][k]))); });
      }
    }
    return A.map(function (row) { return row[n]; });
  }

  /* ================= integration ================= */
  function pos(a) {
    switch (a.t) {
      case 'num': return a.n > 0n ? 'p' : (a.n === 0n ? 'n' : null);
      case 'sym': return (a.n === 'e' || a.n === 'pi') ? 'p' : null;
      case 'pow':
        if (a.b.t === 'sym' && a.b.n === 'e') return 'p';
        if (isInt(a.e) && a.e.n % 2n === 0n) return 'n';
        return pos(a.b) === 'p' ? 'p' : null;
      case 'add': {
        var anyP = false;
        for (var i = 0; i < a.a.length; i++) { var s = pos(a.a[i]); if (!s) return null; if (s === 'p') anyP = true; }
        return anyP ? 'p' : 'n';
      }
      case 'mul': {
        var allP = true;
        for (var j = 0; j < a.a.length; j++) { var s2 = pos(a.a[j]); if (!s2) return null; if (s2 !== 'p') allP = false; }
        return allP ? 'p' : 'n';
      }
      case 'fn': return a.n === 'cosh' ? 'p' : (a.n === 'abs' ? 'n' : null);
    }
    return null;
  }
  function lnAbs(u) { return pos(u) === 'p' ? mkFn('ln', u) : mkFn('ln', mkFn('abs', u)); }
  function nOf(k) { return mkNum(BigInt(k)); }

  function tablePatterns(v) {
    var x = sym(v), L = [];
    function add(pat, res, name) { L.push({ k: key(pat), res: res, name: name }); }
    var two = nn(2);
    add(mkFn('sin', x), mkMul([MINUS1, mkFn('cos', x)]), '\u222b sin x dx = \u2212cos x');
    add(mkFn('cos', x), mkFn('sin', x), '\u222b cos x dx = sin x');
    add(mkPow(mkFn('sec', x), two), mkFn('tan', x), '\u222b sec\u00b2x dx = tan x');
    add(mkPow(mkFn('csc', x), two), mkMul([MINUS1, mkFn('cot', x)]), '\u222b csc\u00b2x dx = \u2212cot x');
    add(mkMul([mkFn('sec', x), mkFn('tan', x)]), mkFn('sec', x), '\u222b sec x tan x dx = sec x');
    add(mkMul([mkFn('csc', x), mkFn('cot', x)]), mkMul([MINUS1, mkFn('csc', x)]), '\u222b csc x cot x dx = \u2212csc x');
    add(mkFn('tan', x), mkMul([MINUS1, lnAbs(mkFn('cos', x))]), '\u222b tan x dx = \u2212ln|cos x|');
    add(mkFn('cot', x), lnAbs(mkFn('sin', x)), '\u222b cot x dx = ln|sin x|');
    add(mkFn('sec', x), lnAbs(mkAdd([mkFn('sec', x), mkFn('tan', x)])), '\u222b sec x dx = ln|sec x + tan x|');
    add(mkFn('csc', x), mkMul([MINUS1, lnAbs(mkAdd([mkFn('csc', x), mkFn('cot', x)]))]), '\u222b csc x dx = \u2212ln|csc x + cot x|');
    add(mkFn('sinh', x), mkFn('cosh', x), '\u222b sinh x dx = cosh x');
    add(mkFn('cosh', x), mkFn('sinh', x), '\u222b cosh x dx = sinh x');
    add(mkFn('ln', x), mkAdd([mkMul([x, mkFn('ln', x)]), mkMul([MINUS1, x])]), '\u222b ln x dx = x ln x \u2212 x');
    add(mkFn('atan', x), mkAdd([mkMul([x, mkFn('atan', x)]), mkMul([nNeg(HALF), mkFn('ln', mkAdd([ONE, mkPow(x, two)]))])]), '\u222b arctan x dx = x arctan x \u2212 \u00bd ln(1+x\u00b2)');
    add(mkFn('asin', x), mkAdd([mkMul([x, mkFn('asin', x)]), mkPow(mkAdd([ONE, mkMul([MINUS1, mkPow(x, two)])]), HALF)]), '\u222b arcsin x dx = x arcsin x + \u221a(1\u2212x\u00b2)');
    add(mkFn('acos', x), mkAdd([mkMul([x, mkFn('acos', x)]), mkMul([MINUS1, mkPow(mkAdd([ONE, mkMul([MINUS1, mkPow(x, two)])]), HALF)])]), '\u222b arccos x dx = x arccos x \u2212 \u221a(1\u2212x\u00b2)');
    add(mkPow(mkAdd([ONE, mkPow(x, two)]), MINUS1), mkFn('atan', x), '\u222b 1/(1+x\u00b2) dx = arctan x');
    add(mkPow(mkAdd([ONE, mkMul([MINUS1, mkPow(x, two)])]), mkNum(-1n, 2n)), mkFn('asin', x), '\u222b 1/\u221a(1\u2212x\u00b2) dx = arcsin x');
    return L;
  }
  var TABLE_CACHE = {};
  function tableInt(f, v) {
    if (f.t === 'sym' && f.n === v) return { res: mkMul([HALF, mkPow(f, two2())]), name: 'Power rule: \u222b x dx = x\u00b2/2' };
    if (f.t === 'pow' && f.b.t === 'sym' && f.b.n === v && isNum(f.e)) {
      if (f.e.n === -1n && f.e.d === 1n) return { res: mkFn('ln', mkFn('abs', f.b)), name: '\u222b 1/x dx = ln|x|' };
      var n1 = nAdd(f.e, ONE);
      return { res: mkMul([nInv(n1), mkPow(f.b, n1)]), name: '<b>Power rule:</b> \u222b x<sup>n</sup> dx = x<sup>n+1</sup>/(n+1), here n = ' + F(f.e) };
    }
    if (f.t === 'pow' && f.e.t === 'sym' && f.e.n === v && !has(f.b, v)) {
      if (f.b.t === 'sym' && f.b.n === 'e') return { res: f, name: '\u222b e<sup>x</sup> dx = e<sup>x</sup>' };
      return { res: mkMul([f, mkPow(mkFn('ln', f.b), MINUS1)]), name: '\u222b a<sup>x</sup> dx = a<sup>x</sup>/ln a, with a = ' + F(f.b) };
    }
    var tp = TABLE_CACHE[v] || (TABLE_CACHE[v] = tablePatterns(v)), k = key(f);
    for (var i = 0; i < tp.length; i++) if (tp[i].k === k) return { res: tp[i].res, name: '<b>Standard integral:</b> ' + tp[i].name };
    return null;
  }
  function two2() { return nn(2); }

  function candidatesU(f, v) {
    var out = [], seen = {};
    function add(u) {
      if (u.t === 'num' || u.t === 'sym' || !has(u, v)) return;
      var k = key(u); if (seen[k]) return; seen[k] = 1; out.push(u);
    }
    (function walk(a) {
      switch (a.t) {
        case 'add': case 'mul': a.a.forEach(walk); break;
        case 'pow':
          if (has(a.b, v)) add(a.b);
          if (has(a.e, v)) add(a.e);
          walk(a.b); walk(a.e); break;
        case 'fn': add(a.a); walk(a.a); break;
      }
    })(f);
    return out.slice(0, 14);
  }

  function linearParts(u, v) {
    var du = Dq(u, v);
    if (has(du, v) || isZ(du)) return null;
    var b = mkAdd([u, mkMul([MINUS1, du, sym(v)])]);
    if (has(b, v)) return null;
    return { a: du, b: b };
  }

  function clsOf(f, v) {
    if (f.t === 'fn') {
      if (f.n === 'ln' || f.n === 'asin' || f.n === 'acos' || f.n === 'atan') return 1;
      return 3;
    }
    if (f.t === 'sym' && f.n === v) return 2;
    if (f.t === 'pow') {
      if (!has(f.e, v) && isNum(f.e) && f.e.n > 0n && has(f.b, v)) return 2;
      if (!has(f.b, v) && has(f.e, v)) return 4;
      if (f.b.t === 'fn' && isInt(f.e) && f.e.n > 0n) return clsOf(f.b, v) === 1 ? 1 : 0;
    }
    return 0;
  }

  function I(f, v, c) {
    if (c.depth > 7) return null;
    var k = v + '|' + key(f);
    if (c.stack.indexOf(k) >= 0) return null;
    c.stack.push(k); c.depth++;
    try { return Iinner(f, v, c); }
    finally { c.stack.pop(); c.depth--; }
  }
  function mark(c) { return c.steps.length; }
  function rollback(c, m) { c.steps.length = m; }
  function intStr(f, v) { return '\u222b ' + F(f) + ' d' + v; }

  function Iinner(f, v, c) {
    var m0 = mark(c), res;
    if (!has(f, v)) {
      res = mkMul([f, sym(v)]);
      say(c, '<b>Constant rule:</b> ' + intStr(f, v) + ' = ' + F(res));
      return res;
    }
    if (f.t === 'add') {
      say(c, '<b>Sum rule:</b> integrate each term separately.');
      c.lvl++;
      var parts = [];
      for (var i = 0; i < f.a.length; i++) {
        var r = I(f.a[i], v, c);
        if (r === null) { c.lvl--; rollback(c, m0); return Iexpand(f, v, c, m0); }
        parts.push(r);
      }
      c.lvl--;
      return mkAdd(parts);
    }
    if (f.t === 'mul') {
      var consts = [], vars = [];
      f.a.forEach(function (x) { (has(x, v) ? vars : consts).push(x); });
      if (consts.length) {
        var c0 = mkMul(consts), g = mkMul(vars);
        say(c, '<b>Constant multiple rule:</b> \u222b c\u00b7g d' + v + ' = c\u00b7\u222b g d' + v + ', with c = ' + F(c0) + '.');
        c.lvl++;
        var rg = I(g, v, c);
        c.lvl--;
        if (rg === null) { rollback(c, m0); return Iexpand(f, v, c, m0); }
        return mkMul([c0, rg]);
      }
    }
    var t = tableInt(f, v);
    if (t) { say(c, t.name + (t.name.indexOf('=') >= 0 ? '' : ': ' + intStr(f, v) + ' = ' + F(t.res)) + '.'); return t.res; }
    var steps = [Iexp_trig, Isub, Itrigpow, Iparts, Irational];
    for (var s = 0; s < steps.length; s++) {
      var mk = mark(c);
      var out = steps[s](f, v, c);
      if (out !== null) return out;
      rollback(c, mk);
    }
    return Iexpand(f, v, c, m0);
  }

  function Iexpand(f, v, c, m0) {
    var e = expand(f);
    if (key(e) === key(f)) return null;
    var mk = mark(c);
    say(c, '<b>Expand</b> first: ' + F(f) + ' = ' + F(e));
    var r = I(e, v, c);
    if (r === null) { rollback(c, mk); return null; }
    return r;
  }

  /* u-substitution (covers linear substitutions too) */
  function Isub(f, v, c) {
    var cands = candidatesU(f, v), un = c.u;
    for (var i = 0; i < cands.length; i++) {
      var u = cands[i], mk = mark(c), q, lin = linearParts(u, v), du;
      var usym = sym(un);
      if (lin) {
        var xr = mkMul([mkAdd([usym, mkMul([MINUS1, lin.b])]), mkPow(lin.a, MINUS1)]);
        q = mkMul([mkPow(lin.a, MINUS1), repl(f, v, xr)]);
        du = lin.a;
      } else {
        du = Dq(u, v);
        if (isZ(du)) continue;
        q = substU(mkMul([f, mkPow(du, MINUS1)]), key(u), u, usym);
      }
      if (has(q, v)) continue;
      say(c, '<b>Substitution:</b> let ' + un + ' = ' + F(u) + '. Then d' + un + ' = ' + F(du) + ' d' + v + (lin ? (isOne(du) ? '' : ', so d' + v + ' = d' + un + '/' + F(du)) : ', and the ' + v + '-terms cancel') + '.');
      say(c, 'The integral becomes \u222b ' + F(q) + ' d' + un + '.');
      c.lvl++;
      var r = I(q, un, c);
      c.lvl--;
      if (r === null) { rollback(c, mk); continue; }
      var back = repl(r, un, u);
      say(c, 'Substitute back ' + un + ' = ' + F(u) + ': ' + F(back));
      return back;
    }
    return null;
  }

  /* exp(linear) * sin/cos(linear) and product-to-sum */
  function Iexp_trig(f, v, c) {
    if (f.t !== 'mul') return null;
    var fs = f.a.filter(function (x) { return has(x, v); });
    if (fs.length !== 2) return null;
    var ex = null, tr = null;
    fs.forEach(function (x) {
      if (x.t === 'pow' && x.b.t === 'sym' && x.b.n === 'e' && has(x.e, v)) ex = x;
      if (x.t === 'fn' && (x.n === 'sin' || x.n === 'cos')) tr = x;
    });
    if (ex && tr) {
      var L1 = linearParts(ex.e, v), L2 = linearParts(tr.a, v);
      if (!L1 || !L2) return null;
      var a = L1.a, b = L2.a, den = mkAdd([mkPow(a, nn(2)), mkPow(b, nn(2))]);
      var inner = tr.n === 'sin'
        ? mkAdd([mkMul([a, mkFn('sin', tr.a)]), mkMul([MINUS1, b, mkFn('cos', tr.a)])])
        : mkAdd([mkMul([a, mkFn('cos', tr.a)]), mkMul([b, mkFn('sin', tr.a)])]);
      var res = mkMul([ex, inner, mkPow(den, MINUS1)]);
      say(c, '<b>Integration by parts twice:</b> after two rounds the original integral appears again, so solve for it. For \u222b e<sup>ax+p</sup>' + tr.n + '(\u03b8) d' + v + ' with \u03b8\u2032 = b the answer is e<sup>ax+p</sup>(' + (tr.n === 'sin' ? 'a sin \u03b8 \u2212 b cos \u03b8' : 'a cos \u03b8 + b sin \u03b8') + ')/(a\u00b2+b\u00b2). Here a = ' + F(a) + ' and b = ' + F(b) + '.');
      say(c, 'So ' + intStr(f, v) + ' = ' + F(res));
      return res;
    }
    var A = fs[0], B = fs[1];
    if (A.t === 'fn' && B.t === 'fn' && (A.n === 'sin' || A.n === 'cos') && (B.n === 'sin' || B.n === 'cos') && key(A.a) !== key(B.a)) {
      if (!linearParts(A.a, v) || !linearParts(B.a, v)) return null;
      var sum = mkAdd([A.a, B.a]), dif = mkAdd([A.a, mkMul([MINUS1, B.a])]), e;
      if (A.n === 'sin' && B.n === 'cos') e = mkMul([HALF, mkAdd([mkFn('sin', sum), mkFn('sin', dif)])]);
      else if (A.n === 'cos' && B.n === 'sin') e = mkMul([HALF, mkAdd([mkFn('sin', sum), mkMul([MINUS1, mkFn('sin', dif)])])]);
      else if (A.n === 'sin') e = mkMul([HALF, mkAdd([mkFn('cos', dif), mkMul([MINUS1, mkFn('cos', sum)])])]);
      else e = mkMul([HALF, mkAdd([mkFn('cos', dif), mkFn('cos', sum)])]);
      say(c, '<b>Product-to-sum identity:</b> ' + F(f) + ' = ' + F(e));
      c.lvl++; var r = I(e, v, c); c.lvl--;
      return r;
    }
    return null;
  }

  /* powers of sin, cos, tan, cot */
  function Itrigpow(f, v, c) {
    var fac = f.t === 'mul' ? f.a : [f], sm = 0, cm = 0, arg = null, ok = true;
    fac.forEach(function (x) {
      var base = x, p = 1;
      if (x.t === 'pow' && isInt(x.e) && x.e.n > 0n && x.e.n < 30n) { base = x.b; p = Number(x.e.n); }
      if (base.t === 'fn' && (base.n === 'sin' || base.n === 'cos')) {
        if (arg === null) arg = base.a; else if (key(arg) !== key(base.a)) ok = false;
        if (base.n === 'sin') sm += p; else cm += p;
      } else ok = false;
    });
    if (ok && arg && sm + cm >= 2) {
      var th = arg, lin = linearParts(th, v);
      if (!lin) return null;
      var s = mkFn('sin', th), co = mkFn('cos', th);
      if (sm % 2 === 1 || cm % 2 === 1) {
        var useSin = sm % 2 === 1, kk = (useSin ? sm - 1 : cm - 1) / 2, un = c.u, us = sym(un);
        var other = useSin ? cm : sm;
        var poly = expand(mkMul([mkPow(mkAdd([ONE, mkMul([MINUS1, mkPow(us, nn(2))])]), nn(kk)), mkPow(us, nn(other))]));
        var sign = useSin ? MINUS1 : ONE;
        say(c, '<b>Odd power of ' + (useSin ? 'sine' : 'cosine') + ':</b> keep one ' + (useSin ? 'sin' : 'cos') + ' factor for the differential and write the rest with sin\u00b2 + cos\u00b2 = 1. Let ' + un + ' = ' + F(useSin ? co : s) + ', so d' + un + ' = ' + F(useSin ? mkMul([MINUS1, s, lin.a]) : mkMul([co, lin.a])) + ' d' + v + '.');
        var qq = mkMul([sign, mkPow(lin.a, MINUS1), poly]);
        say(c, 'The integral becomes \u222b ' + F(qq) + ' d' + un + '.');
        c.lvl++; var rr = I(qq, un, c); c.lvl--;
        if (rr === null) return null;
        var back = repl(rr, un, useSin ? co : s);
        say(c, 'Substitute back ' + un + ' = ' + F(useSin ? co : s) + ': ' + F(back));
        return back;
      }
      var e = mkMul([mkPow(mkMul([HALF, mkAdd([ONE, mkMul([MINUS1, mkFn('cos', mkMul([nn(2), th]))])])]), nn(sm / 2)),
                     mkPow(mkMul([HALF, mkAdd([ONE, mkFn('cos', mkMul([nn(2), th]))])]), nn(cm / 2))]);
      var ee = expand(e);
      say(c, '<b>Even powers:</b> use sin\u00b2\u03b8 = (1 \u2212 cos 2\u03b8)/2 and cos\u00b2\u03b8 = (1 + cos 2\u03b8)/2, giving ' + F(ee));
      c.lvl++; var r2 = I(ee, v, c); c.lvl--;
      return r2;
    }
    if (f.t === 'pow' && isInt(f.e) && f.e.n >= 2n && f.e.n < 30n && f.b.t === 'fn' && (f.b.n === 'tan' || f.b.n === 'cot')) {
      var isT = f.b.n === 'tan', n = Number(f.e.n), th2 = f.b.a;
      if (!linearParts(th2, v)) return null;
      var sq = isT ? mkPow(mkFn('sec', th2), nn(2)) : mkPow(mkFn('csc', th2), nn(2));
      var e2 = mkAdd([mkMul([mkPow(f.b, nn(n - 2)), sq]), mkMul([MINUS1, mkPow(f.b, nn(n - 2))])]);
      if (!isT) e2 = mkAdd([mkMul([mkPow(f.b, nn(n - 2)), sq]), mkMul([MINUS1, mkPow(f.b, nn(n - 2))])]);
      say(c, '<b>Use ' + (isT ? '1 + tan\u00b2\u03b8 = sec\u00b2\u03b8' : '1 + cot\u00b2\u03b8 = csc\u00b2\u03b8') + ':</b> ' + F(f) + ' = ' + F(e2));
      c.lvl++; var r3 = I(e2, v, c); c.lvl--;
      return r3;
    }
    return null;
  }

  /* integration by parts */
  function Iparts(f, v, c) {
    var U, dv, one = false;
    if (f.t === 'mul') {
      var fs = f.a.filter(function (x) { return has(x, v); });
      if (fs.length !== 2) return null;
      var c1 = clsOf(fs[0], v), c2 = clsOf(fs[1], v);
      if (!c1 || !c2) return null;
      if ((c1 === 3 && c2 === 4) || (c1 === 4 && c2 === 3)) return null;
      if (c1 === 2 && c2 === 2) return null;
      if (c1 <= c2) { U = fs[0]; dv = fs[1]; } else { U = fs[1]; dv = fs[0]; }
    } else if (clsOf(f, v) === 1 && !(f.t === 'fn' && f.a.t === 'sym')) {
      U = f; dv = ONE; one = true;
    } else return null;
    var sc = newCtx(v, c.u); sc.silent = 1; sc.depth = c.depth; sc.stack = c.stack.slice();
    var V = one ? sym(v) : I(dv, v, sc);
    if (V === null) return null;
    var du = Dq(U, v);
    var next = mkMul([V, du]);
    say(c, '<b>Integration by parts:</b> \u222b u dv = uv \u2212 \u222b v du. Choose u = ' + F(U) + ' and dv = ' + (one ? '1' : F(dv)) + ' d' + v + '.');
    say(c, 'Then du = ' + F(du) + ' d' + v + ' and v = ' + F(V) + '.');
    say(c, 'So ' + intStr(f, v) + ' = ' + F(mkMul([U, V])) + ' \u2212 \u222b ' + F(next) + ' d' + v);
    c.lvl++;
    var r = I(next, v, c);
    c.lvl--;
    if (r === null) return null;
    return mkAdd([mkMul([U, V]), mkMul([MINUS1, r])]);
  }

  /* rational functions: division, partial fractions */
  function splitRational(f) {
    var nums = [], dens = [];
    var fac = f.t === 'mul' ? f.a : [f];
    for (var i = 0; i < fac.length; i++) {
      var x = fac[i];
      if (x.t === 'pow' && isNum(x.e) && x.e.n < 0n) {
        if (x.e.d !== 1n) return null;
        dens.push(mkPow(x.b, nNeg(x.e)));
      } else nums.push(x);
    }
    if (!dens.length) return null;
    return { n: mkMul(nums), d: mkMul(dens) };
  }
  function polyNode(p, v) { return fromPoly(p, v); }

  function Irational(f, v, c) {
    var sr = splitRational(f);
    if (!sr) return null;
    var N = toPoly(sr.n, v), Dp = toPoly(sr.d, v);
    if (!N || !Dp || pDeg(Dp) < 1) return null;
    var lc = Dp[Dp.length - 1], ilc = nInv(lc);
    N = N.map(function (x) { return nMul(x, ilc); });
    Dp = Dp.map(function (x) { return nMul(x, ilc); });
    var x = sym(v), results = [];
    var whole = pTrim(N);
    var R = whole;
    if (pDeg(whole) >= pDeg(Dp)) {
      var dv = pDivide(whole, Dp);
      say(c, '<b>Polynomial division</b> (the top degree is not smaller than the bottom): ' + F(f) + ' = ' + F(mkAdd([polyNode(dv.q, v), mkMul([polyNode(dv.r, v), mkPow(polyNode(Dp, v), MINUS1)])])));
      c.lvl++;
      var rq = I(polyNode(dv.q, v), v, c);
      c.lvl--;
      if (rq === null) return null;
      results.push(rq);
      R = dv.r;
      if (!R.length) return mkAdd(results);
    }
    // factor denominator
    var rem = Dp.slice(), roots = [];
    while (pDeg(rem) >= 1) {
      var r = ratRoot(rem);
      if (r === null) break;
      var mult = 0;
      while (pDeg(rem) >= 1) {
        var rr = pDivide(rem, [nNeg(r), ONE]);
        if (rr.r.length) break;
        rem = rr.q; mult++;
      }
      roots.push({ r: r, m: mult });
    }
    var lc2 = rem[rem.length - 1];
    rem = rem.map(function (z) { return nMul(z, nInv(lc2)); });
    var quad = null;
    if (pDeg(rem) === 2) quad = rem;
    else if (pDeg(rem) > 2) return null;
    var facStr = roots.map(function (z) { var lf = mkAdd([x, nNeg(z.r)]); return fmt(z.m > 1 ? mkPow(lf, nn(z.m)) : lf, 'h'); });
    if (quad) facStr.push(F(polyNode(quad, v)));
    say(c, '<b>Partial fractions.</b> Factor the denominator: ' + F(polyNode(Dp, v)) + ' = ' + facStr.map(function (s) { return '(' + s + ')'; }).join('') + '.');
    var basis = [], labels = [];
    var degD = pDeg(Dp);
    var quadBasePoly = null;
    roots.forEach(function (z) {
      for (var j = 1; j <= z.m; j++) {
        var b = Dp.slice();
        for (var q2 = 0; q2 < j; q2++) b = pDivide(b, [nNeg(z.r), ONE]).q;
        basis.push(b); labels.push({ type: 'lin', r: z.r, j: j });
      }
    });
    if (quad) {
      var qb = Dp.slice(); qb = pDivide(qb, quad).q;
      basis.push(pMul(qb, [ZERO, ONE])); labels.push({ type: 'qB' });
      basis.push(qb); labels.push({ type: 'qC' });
    }
    var n = degD;
    if (basis.length !== n) return null;
    var M = [];
    for (var row = 0; row < n; row++) M.push(basis.map(function (bp) { return bp[row] || ZERO; }));
    var rhs = []; for (var rw = 0; rw < n; rw++) rhs.push(R[rw] || ZERO);
    var sol = solveLinear(M, rhs);
    if (!sol) return null;
    var letters = 'ABCDEFGH', decomp = [], consts = [], total = [];
    labels.forEach(function (lb, i) {
      var A = sol[i];
      if (lb.type === 'lin') {
        var lf = mkAdd([x, nNeg(lb.r)]);
        decomp.push(mkMul([sym(letters[i]), mkPow(lf, nn(-lb.j))]));
      }
    });
    if (quad) {
      var iB = labels.length - 2, iC = labels.length - 1;
      decomp.push(mkMul([mkAdd([mkMul([sym(letters[iB]), x]), sym(letters[iC])]), mkPow(polyNode(quad, v), MINUS1)]));
    }
    var show = [];
    for (var s = 0; s < sol.length; s++) show.push(letters[s] + ' = ' + F(sol[s]));
    say(c, 'Write ' + F(mkMul([polyNode(R, v), mkPow(polyNode(Dp, v), MINUS1)])) + ' = ' + decomp.map(F).join(' + ') + '. Multiply out and compare coefficients to get ' + show.join(', ') + '.');
    var parts = [];
    labels.forEach(function (lb, i) {
      var A = sol[i];
      if (lb.type === 'lin' && !isZ(A)) {
        var lf = mkAdd([x, nNeg(lb.r)]);
        parts.push(mkMul([A, mkPow(lf, nn(-lb.j))]));
      }
    });
    var Bq = quad ? sol[labels.length - 2] : ZERO, Cq = quad ? sol[labels.length - 1] : ZERO;
    if (quad && (!isZ(Bq) || !isZ(Cq))) parts.push(mkMul([mkAdd([mkMul([Bq, x]), Cq]), mkPow(polyNode(quad, v), MINUS1)]));
    say(c, 'Integrate each fraction:');
    c.lvl++;
    var out = [];
    labels.forEach(function (lb, i) {
      var A = sol[i];
      if (lb.type !== 'lin' || isZ(A)) return;
      var lf = mkAdd([x, nNeg(lb.r)]);
      var term = mkMul([A, mkPow(lf, nn(-lb.j))]);
      var res2;
      if (lb.j === 1) { res2 = mkMul([A, lnAbs(lf)]); say(c, F(term) + ': \u222b 1/(' + F(lf) + ') d' + v + ' = ln|' + F(lf) + '|, giving ' + F(res2)); }
      else { var pw = nn(1 - lb.j); res2 = mkMul([A, nInv(pw), mkPow(lf, pw)]); say(c, F(term) + ': power rule gives ' + F(res2)); }
      out.push(res2);
    });
    if (quad && (!isZ(Bq) || !isZ(Cq))) {
      var bb = quad[1], cc = quad[0], two = nn(2);
      var qn = polyNode(quad, v), k0 = nAdd(cc, nNeg(nMul(nMul(bb, bb), mkNum(1n, 4n))));
      var half_b = nMul(bb, HALF);
      var coefI0 = nAdd(Cq, nNeg(nMul(Bq, half_b)));
      var logPart = isZ(Bq) ? ZERO : mkMul([nMul(Bq, HALF), mkFn('ln', qn)]);
      var I0;
      var shifted = mkAdd([x, half_b]);
      if (k0.n > 0n) {
        var sq = mkPow(k0, HALF);
        I0 = mkMul([mkPow(sq, MINUS1), mkFn('atan', mkMul([shifted, mkPow(sq, MINUS1)]))]);
        say(c, 'Complete the square: ' + F(qn) + ' = ' + F(mkAdd([mkPow(shifted, two), k0])) + '. Split ' + F(mkAdd([mkMul([Bq, x]), Cq])) + ' into a part that is the derivative of the denominator and a constant, then use \u222b 1/(w\u00b2+k) dw = (1/\u221ak) arctan(w/\u221ak).');
      } else {
        var s2 = mkPow(nNeg(k0), HALF);
        I0 = mkMul([mkPow(mkMul([two, s2]), MINUS1), mkFn('ln', mkFn('abs', mkMul([mkAdd([shifted, mkMul([MINUS1, s2])]), mkPow(mkAdd([shifted, s2]), MINUS1)])))]);
        say(c, 'The quadratic ' + F(qn) + ' does not factor over the rationals; complete the square and use \u222b 1/(w\u00b2\u2212s\u00b2) dw = (1/2s) ln|(w\u2212s)/(w+s)|.');
      }
      var res3 = mkAdd([logPart, mkMul([coefI0, I0])]);
      say(c, F(mkMul([mkAdd([mkMul([Bq, x]), Cq]), mkPow(qn, MINUS1)])) + ' integrates to ' + F(res3));
      out.push(res3);
    }
    c.lvl--;
    return mkAdd(results.concat(out));
  }

  /* ================= verification ================= */
  var SAMPLES = [0.31, 0.77, 1.21, 1.73, 2.4, 0.52, -0.45, -1.3, 3.1, 0.12];
  function okClose(a, b) { return Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(a), Math.abs(b)); }
  function checkDerivative(f, fp, v) {
    var good = 0, bad = 0;
    SAMPLES.forEach(function (x0) {
      var env = {}; env[v] = x0;
      var h = 1e-5 * Math.max(1, Math.abs(x0));
      var e1 = {}, e2 = {}; e1[v] = x0 + h; e2[v] = x0 - h;
      var num = (ev(f, e1) - ev(f, e2)) / (2 * h), sy = ev(fp, env);
      if (!isFinite(num) || !isFinite(sy)) return;
      if (Math.abs(num - sy) <= 1e-4 * Math.max(1, Math.abs(sy))) good++; else bad++;
    });
    return bad === 0 && good >= 2 ? 'ok' : (bad > 0 ? 'fail' : 'skip');
  }
  function checkIntegral(Fn, f, v) {
    var Fp = Dq(Fn, v), good = 0, bad = 0;
    SAMPLES.forEach(function (x0) {
      var env = {}; env[v] = x0;
      var a = ev(Fp, env), b = ev(f, env);
      if (!isFinite(a) || !isFinite(b)) return;
      if (okClose(a, b)) good++; else bad++;
    });
    return bad === 0 && good >= 2 ? 'ok' : (bad > 0 ? 'fail' : 'skip');
  }
  function simpson(f, v, a, b) {
    var n = 4000, h = (b - a) / n, env = {}, s = 0;
    for (var i = 0; i <= n; i++) {
      env[v] = a + i * h;
      var y = ev(f, env), w = (i === 0 || i === n) ? 1 : (i % 2 ? 4 : 2);
      s += w * y;
    }
    return s * h / 3;
  }

  /* ================= public API ================= */
  function setup(src) {
    var node = parse(src), v = pickVar(node);
    return { node: node, v: v, u: freshName(node) };
  }
  function parseBound(s) {
    var n = parse(s);
    var syms = symsOf(n);
    if (Object.keys(syms).some(function (k) { return k !== 'e' && k !== 'pi'; })) throw new Error('Limits must be numbers (you can use pi and e).');
    return n;
  }

  function derivative(src, order, atStr) {
    try {
      var S = setup(src), f = S.node, v = S.v;
      order = Math.max(1, Math.min(5, order || 1));
      var blocks = [], cur = f, results = [];
      for (var k = 1; k <= order; k++) {
        var c = newCtx(v, S.u);
        var r = D(cur, v, c);
        blocks.push({ order: k, of: cur, steps: c.steps, result: r });
        results.push(r);
        cur = r;
      }
      var final = cur, chk = checkDerivative(order === 1 ? f : results[order - 2], final, v);
      var out = { ok: true, v: v, input: f, blocks: blocks, result: final, check: chk, html: F(final), text: fmt(final, 't') };
      if (atStr && String(atStr).trim() !== '') {
        var at = parseBound(atStr), val = ev(final, (function () { var e = {}; e[v] = ev(at, {}); return e; })());
        out.at = { x: F(at), exact: F(repl(final, v, at)), value: val };
      }
      return out;
    } catch (e) { return { ok: false, error: e.message || String(e) }; }
  }

  function integral(src, loStr, hiStr) {
    try {
      var S = setup(src), f = S.node, v = S.v;
      var c = newCtx(v, S.u);
      var Fn = I(f, v, c);
      if (Fn === null) return { ok: false, unsupported: true, v: v, input: f, error: 'Calvo could not find an antiderivative for this function with the methods it knows (basic rules, substitution, integration by parts, trig powers, partial fractions). Check the expression, or try rewriting it.' };
      var out = { ok: true, v: v, input: f, steps: c.steps, result: Fn, html: F(Fn), text: fmt(Fn, 't') };
      out.check = checkIntegral(Fn, f, v);
      if (loStr !== undefined && hiStr !== undefined && String(loStr).trim() !== '' && String(hiStr).trim() !== '') {
        var a = parseBound(loStr), b = parseBound(hiStr);
        var av = ev(a, {}), bv = ev(b, {});
        var Fb = repl(Fn, v, b), Fa = repl(Fn, v, a);
        var exact = mkAdd([Fb, mkMul([MINUS1, Fa])]);
        var val = ev(exact, {});
        var sp = simpson(f, v, av, bv);
        var d = { lo: F(a), hi: F(b), exact: F(exact), value: val, fb: F(Fb), fa: F(Fa), simpson: sp, warn: null };
        if (!isFinite(val) || !isFinite(sp)) d.warn = 'The function is not defined (or blows up) somewhere between the limits, so this is an improper integral and the formula above cannot be used directly.';
        else if (Math.abs(val - sp) > 1e-5 * Math.max(1, Math.abs(val))) d.warn = 'The numeric check does not match the exact value. The function may have a break inside the interval, so do not trust this result.';
        out.def = d;
      }
      return out;
    } catch (e) { return { ok: false, error: e.message || String(e) }; }
  }

  root.CalvoCalc = {
    derivative: derivative, integral: integral, fmt: fmt, parse: parse, version: 1,
    _internal: { mkAdd: mkAdd, mkMul: mkMul, mkPow: mkPow, mkFn: mkFn, D: Dq, ev: ev, key: key, expand: expand, setup: setup }
  };
})(typeof window !== 'undefined' ? window : globalThis);
