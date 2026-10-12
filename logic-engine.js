/* ============================================
   CALVO — Boolean logic engine
   Expression parser, truth tables, Quine-McCluskey
   minimisation (SOP / POS, with don't-cares) and
   K-map layout. Runs fully in the browser.
   ============================================ */
(function (root) {
  'use strict';

  var MAXVARS = 6;
  var WORDS = { AND: 'and', OR: 'or', NOT: 'not', XOR: 'xor', NAND: 'nand', NOR: 'nor', XNOR: 'xnor', XAND: 'xnor' };
  var PREC = { eq: 1, imp: 2, or: 3, nor: 3, xor: 4, xnor: 4, and: 5, nand: 5 };
  var SYM = { and: '\u00b7', or: ' + ', xor: ' \u2295 ', nand: ' NAND ', nor: ' NOR ', xnor: ' XNOR ', imp: ' \u2192 ', eq: ' \u2194 ' };
  var NONASSOC = { nand: 1, nor: 1, xnor: 1, imp: 1, eq: 1 };

  /* ---------- tokenizer ---------- */
  function tokenize(src) {
    var t = [], i = 0, c, j, run, up;
    src = String(src);
    while (i < src.length) {
      c = src.charAt(i);
      if (/\s/.test(c)) { i++; continue; }
      if (/[A-Za-z]/.test(c)) {
        j = i;
        while (j < src.length && /[A-Za-z]/.test(src.charAt(j))) j++;
        run = src.slice(i, j); up = run.toUpperCase();
        if (WORDS[up]) t.push({ k: 'op', v: WORDS[up], pos: i });
        else {
          for (var q = 0; q < run.length; q++) t.push({ k: 'var', v: run.charAt(q).toUpperCase(), pos: i + q, glued: q > 0 });
        }
        i = j; continue;
      }
      if (c === '0' || c === '1') { t.push({ k: 'const', v: +c, pos: i }); i++; continue; }
      if (src.substr(i, 3) === '<->' || src.substr(i, 3) === '<=>') { t.push({ k: 'op', v: 'eq', pos: i }); i += 3; continue; }
      if (src.substr(i, 2) === '->' || src.substr(i, 2) === '=>') { t.push({ k: 'op', v: 'imp', pos: i }); i += 2; continue; }
      if (src.substr(i, 2) === '==') { t.push({ k: 'op', v: 'eq', pos: i }); i += 2; continue; }
      if (c === '!' || c === '~' || c === '\u00ac') { t.push({ k: 'op', v: 'not', pos: i }); i++; continue; }
      if (c === "'" || c === '\u2019' || c === '`') { t.push({ k: 'post', pos: i }); i++; continue; }
      if (c === '&' || c === '*' || c === '\u00b7' || c === '\u2227' || c === '.' || c === '\u2219') {
        if ((c === '&' || c === '*') && src.charAt(i + 1) === c) i++;
        t.push({ k: 'op', v: 'and', pos: i }); i++; continue;
      }
      if (c === '+' || c === '|' || c === '\u2228') {
        if (c === '|' && src.charAt(i + 1) === '|') i++;
        t.push({ k: 'op', v: 'or', pos: i }); i++; continue;
      }
      if (c === '^' || c === '\u2295') { t.push({ k: 'op', v: 'xor', pos: i }); i++; continue; }
      if (c === '\u2191') { t.push({ k: 'op', v: 'nand', pos: i }); i++; continue; }
      if (c === '\u2193') { t.push({ k: 'op', v: 'nor', pos: i }); i++; continue; }
      if (c === '\u2192') { t.push({ k: 'op', v: 'imp', pos: i }); i++; continue; }
      if (c === '\u2194' || c === '\u2261') { t.push({ k: 'op', v: 'eq', pos: i }); i++; continue; }
      if (c === '(' || c === '[' || c === '{') { t.push({ k: 'lp', pos: i }); i++; continue; }
      if (c === ')' || c === ']' || c === '}') { t.push({ k: 'rp', pos: i }); i++; continue; }
      throw new Error('Unexpected character "' + c + '" at position ' + (i + 1) + '.');
    }
    return t;
  }

  /* ---------- parser (precedence climbing) ---------- */
  function parse(src) {
    var tk = tokenize(src), p = 0;
    if (!tk.length) throw new Error('Type a Boolean expression first.');
    function peek() { return tk[p]; }
    function isOp(tok, list) { return tok && tok.k === 'op' && list.indexOf(tok.v) >= 0; }
    function startsPrimary(tok) {
      return tok && (tok.k === 'var' || tok.k === 'const' || tok.k === 'lp' || (tok.k === 'op' && tok.v === 'not'));
    }
    function parseEq() {
      var a = parseImp();
      while (isOp(peek(), ['eq'])) { p++; a = { t: 'bin', op: 'eq', a: a, b: parseImp() }; }
      return a;
    }
    function parseImp() {
      var a = parseOr();
      if (isOp(peek(), ['imp'])) { p++; return { t: 'bin', op: 'imp', a: a, b: parseImp() }; }
      return a;
    }
    function parseOr() {
      var a = parseXor(), o;
      while (isOp(peek(), ['or', 'nor'])) { o = tk[p++].v; a = { t: 'bin', op: o, a: a, b: parseXor() }; }
      return a;
    }
    function parseXor() {
      var a = parseAnd(), o;
      while (isOp(peek(), ['xor', 'xnor'])) { o = tk[p++].v; a = { t: 'bin', op: o, a: a, b: parseAnd() }; }
      return a;
    }
    function parseAnd() {
      var a = parseUnary(), o;
      for (;;) {
        if (isOp(peek(), ['and', 'nand'])) { o = tk[p++].v; a = { t: 'bin', op: o, a: a, b: parseUnary() }; }
        else if (startsPrimary(peek())) { a = { t: 'bin', op: 'and', a: a, b: parseUnary() }; }
        else break;
      }
      return a;
    }
    function parseUnary() {
      if (isOp(peek(), ['not'])) { p++; return { t: 'not', a: parseUnary() }; }
      return parsePost();
    }
    function parsePost() {
      var a = parsePrimary();
      while (peek() && peek().k === 'post') { p++; a = { t: 'not', a: a }; }
      return a;
    }
    function parsePrimary() {
      var tok = peek(), a;
      if (!tok) throw new Error('The expression ends unexpectedly. Something is missing after the last operator.');
      if (tok.k === 'var') { p++; return { t: 'var', n: tok.v }; }
      if (tok.k === 'const') { p++; return { t: 'const', v: tok.v }; }
      if (tok.k === 'lp') {
        p++; a = parseEq();
        if (!peek() || peek().k !== 'rp') throw new Error('Missing closing bracket ")".');
        p++; return a;
      }
      if (tok.k === 'rp') throw new Error('Extra closing bracket at position ' + (tok.pos + 1) + '.');
      if (tok.k === 'post') throw new Error('A complement mark (\') must come right after a variable or bracket (position ' + (tok.pos + 1) + ').');
      throw new Error('An operand is missing before the operator at position ' + (tok.pos + 1) + '.');
    }
    var ast = parseEq();
    if (p < tk.length) {
      var x = tk[p];
      if (x.k === 'rp') throw new Error('Extra closing bracket at position ' + (x.pos + 1) + '.');
      throw new Error('Unexpected input at position ' + (x.pos + 1) + '.');
    }
    return ast;
  }

  /* ---------- AST helpers ---------- */
  function collectVars(n, set) {
    set = set || {};
    if (n.t === 'var') set[n.n] = 1;
    else if (n.t === 'not') collectVars(n.a, set);
    else if (n.t === 'bin') { collectVars(n.a, set); collectVars(n.b, set); }
    return set;
  }
  function varsOf(ast) { return Object.keys(collectVars(ast)).sort(); }

  function evalNode(n, env) {
    var a, b;
    switch (n.t) {
      case 'const': return n.v;
      case 'var': return env[n.n];
      case 'not': return evalNode(n.a, env) ? 0 : 1;
      default:
        a = evalNode(n.a, env); b = evalNode(n.b, env);
        switch (n.op) {
          case 'and': return a & b;
          case 'or': return a | b;
          case 'xor': return a ^ b;
          case 'nand': return (a & b) ? 0 : 1;
          case 'nor': return (a | b) ? 0 : 1;
          case 'xnor': return (a ^ b) ? 0 : 1;
          case 'imp': return (a ? b : 1);
          case 'eq': return a === b ? 1 : 0;
        }
    }
    return 0;
  }

  function toStr(n, parentPrec, parentOp, side) {
    var s, pr, need;
    if (n.t === 'var') return n.n;
    if (n.t === 'const') return String(n.v);
    if (n.t === 'not') {
      if (n.a.t === 'var' || n.a.t === 'const') return toStr(n.a) + "'";
      return '(' + toStr(n.a) + ")'";
    }
    pr = PREC[n.op];
    s = toStr(n.a, pr, n.op, 'l') + SYM[n.op] + toStr(n.b, pr, n.op, 'r');
    need = false;
    if (parentPrec) {
      if (pr < parentPrec) need = true;
      else if (pr === parentPrec && (parentOp !== n.op || NONASSOC[n.op])) need = true;
    }
    return need ? '(' + s + ')' : s;
  }

  /* post-order list of unique non-leaf sub-expressions (for the step columns) */
  function subExprs(ast) {
    var list = [], seen = {};
    (function walk(n) {
      if (n.t === 'var' || n.t === 'const') return;
      if (n.t === 'not') { walk(n.a); } else { walk(n.a); walk(n.b); }
      var k = toStr(n);
      if (!seen[k]) { seen[k] = 1; list.push({ str: k, node: n }); }
    })(ast);
    return list;
  }

  function envFor(vars, i) {
    var env = {}, n = vars.length;
    for (var b = 0; b < n; b++) env[vars[b]] = (i >> (n - 1 - b)) & 1;
    return env;
  }

  /* full table: out[i] for each row, optional step columns */
  function table(ast, vars) {
    var n = vars.length, rows = 1 << n, out = [], i, subs = subExprs(ast), cols = [];
    for (i = 0; i < subs.length; i++) cols.push([]);
    for (i = 0; i < rows; i++) {
      var env = envFor(vars, i);
      out.push(evalNode(ast, env));
      for (var s = 0; s < subs.length; s++) cols[s].push(evalNode(subs[s].node, env));
    }
    return { n: n, rows: rows, out: out, subs: subs, cols: cols };
  }

  function indicesOf(out, val) {
    var r = [];
    for (var i = 0; i < out.length; i++) if (out[i] === val) r.push(i);
    return r;
  }

  /* ---------- Quine-McCluskey ---------- */
  function popcount(x) { var c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

  function primeImplicants(n, ones, dcs) {
    var terms = ones.concat(dcs), cur = {}, primes = [], i, key;
    if (!terms.length) return [];
    terms.forEach(function (m) { cur[m + ':0'] = { val: m, mask: 0, used: false }; });
    for (;;) {
      var arr = Object.keys(cur).map(function (k) { return cur[k]; }), next = {}, any = false, a, b, d;
      for (i = 0; i < arr.length; i++) {
        for (var j = i + 1; j < arr.length; j++) {
          a = arr[i]; b = arr[j];
          if (a.mask !== b.mask) continue;
          d = a.val ^ b.val;
          if (d && (d & (d - 1)) === 0) {
            a.used = b.used = true; any = true;
            var nm = a.mask | d, nv = a.val & ~d;
            key = nv + ':' + nm;
            if (!next[key]) next[key] = { val: nv, mask: nm, used: false };
          }
        }
      }
      arr.forEach(function (x) { if (!x.used) primes.push({ val: x.val, mask: x.mask }); });
      if (!any) break;
      cur = next;
    }
    return primes;
  }

  function covers(imp, m) { return ((m & ~imp.mask) === (imp.val & ~imp.mask)); }
  function cellsOf(imp, n) {
    var r = [], rows = 1 << n;
    for (var m = 0; m < rows; m++) if (covers(imp, m)) r.push(m);
    return r;
  }
  function litCount(imp, n) { return n - popcount(imp.mask); }

  /* minimum cover: essential primes first, then exact search (with a safe fallback) */
  function minimize(n, ones, dcs) {
    var res = { n: n, ones: ones.slice(), dcs: dcs.slice(), primes: [], chosen: [], essential: [], constant: null };
    if (!ones.length) { res.constant = 0; return res; }
    if (ones.length + dcs.length === (1 << n)) { res.constant = 1; res.primes = [{ val: 0, mask: (1 << n) - 1 }]; res.chosen = [0]; res.essential = [0]; return res; }
    var primes = primeImplicants(n, ones, dcs), i, j;
    res.primes = primes;
    var cov = primes.map(function (pm) { return ones.filter(function (m) { return covers(pm, m); }); });
    var chosen = {}, covered = {};
    ones.forEach(function (m) {
      var who = [];
      for (i = 0; i < primes.length; i++) if (covers(primes[i], m)) who.push(i);
      if (who.length === 1) chosen[who[0]] = 1;
    });
    res.essential = Object.keys(chosen).map(Number);
    Object.keys(chosen).forEach(function (k) { cov[k].forEach(function (m) { covered[m] = 1; }); });
    var left = ones.filter(function (m) { return !covered[m]; });
    if (left.length) {
      var cand = [];
      for (i = 0; i < primes.length; i++) if (!chosen[i] && cov[i].some(function (m) { return !covered[m]; })) cand.push(i);
      var best = null, bestCost = null, nodes = 0, LIMIT = 200000;
      var cost = function (set) {
        var lits = 0; set.forEach(function (x) { lits += litCount(primes[x], n); });
        return set.length * 1000 + lits;
      };
      var rec = function (idx, set, rem) {
        if (nodes++ > LIMIT) return;
        if (!rem.length) {
          var c = cost(set);
          if (bestCost === null || c < bestCost) { best = set.slice(); bestCost = c; }
          return;
        }
        if (bestCost !== null && set.length * 1000 >= bestCost) return;
        /* pick the uncovered minterm with fewest candidate primes */
        var m = rem[0], fewest = 1e9, pick = rem[0], opts;
        rem.forEach(function (x) {
          var cnt = 0; cand.forEach(function (ci) { if (covers(primes[ci], x)) cnt++; });
          if (cnt < fewest) { fewest = cnt; pick = x; }
        });
        opts = cand.filter(function (ci) { return covers(primes[ci], pick); });
        opts.sort(function (a, b) { return litCount(primes[a], n) - litCount(primes[b], n); });
        for (var k = 0; k < opts.length; k++) {
          var ci = opts[k];
          set.push(ci);
          rec(idx + 1, set, rem.filter(function (x) { return !covers(primes[ci], x); }));
          set.pop();
        }
      };
      rec(0, [], left);
      if (!best) { /* greedy fallback */
        best = []; var rem2 = left.slice();
        while (rem2.length) {
          var bi = -1, bc = -1;
          cand.forEach(function (ci) {
            var c = rem2.filter(function (x) { return covers(primes[ci], x); }).length;
            if (c > bc) { bc = c; bi = ci; }
          });
          best.push(bi);
          rem2 = rem2.filter(function (x) { return !covers(primes[bi], x); });
        }
      }
      best.forEach(function (x) { chosen[x] = 1; });
    }
    res.chosen = Object.keys(chosen).map(Number).sort(function (a, b) { return a - b; });
    return res;
  }

  /* ---------- formatting ---------- */
  function names(vars, n) {
    var d = ['A', 'B', 'C', 'D', 'E', 'F'], r = [];
    for (var i = 0; i < n; i++) r.push(vars && vars[i] ? vars[i] : d[i]);
    return r;
  }
  function sopTerm(imp, vars) {
    var n = vars.length, s = '';
    for (var b = 0; b < n; b++) {
      var bit = 1 << (n - 1 - b);
      if (imp.mask & bit) continue;
      s += vars[b] + ((imp.val & bit) ? '' : "'");
    }
    return s || '1';
  }
  function posTerm(imp, vars) {
    /* imp is an implicant of the complement; apply De Morgan */
    var n = vars.length, lits = [];
    for (var b = 0; b < n; b++) {
      var bit = 1 << (n - 1 - b);
      if (imp.mask & bit) continue;
      lits.push(vars[b] + ((imp.val & bit) ? "'" : ''));
    }
    if (!lits.length) return '0';
    return lits.length === 1 ? lits[0] : '(' + lits.join(' + ') + ')';
  }
  function sopString(res, vars) {
    if (res.constant === 0) return '0';
    if (res.constant === 1) return '1';
    return res.chosen.map(function (i) { return sopTerm(res.primes[i], vars); }).join(' + ');
  }
  function posString(resC, vars) {
    /* resC = minimisation of the complement */
    if (resC.constant === 0) return '1';
    if (resC.constant === 1) return '0';
    return resC.chosen.map(function (i) { return posTerm(resC.primes[i], vars); }).join('');
  }
  function canonSOP(ones, vars) {
    if (!ones.length) return '0';
    var n = vars.length;
    return ones.map(function (m) { return sopTerm({ val: m, mask: 0 }, vars); }).join(' + ');
  }
  function canonPOS(zeros, vars) {
    if (!zeros.length) return '1';
    return zeros.map(function (m) {
      var n = vars.length, lits = [];
      for (var b = 0; b < n; b++) lits.push(vars[b] + (((m >> (n - 1 - b)) & 1) ? "'" : ''));
      return '(' + lits.join(' + ') + ')';
    }).join('');
  }

  /* ---------- K-map layout ---------- */
  function gray(k) { return k === 0 ? [0] : k === 1 ? [0, 1] : [0, 1, 3, 2]; }
  function bits(v, k) { var s = ''; for (var i = k - 1; i >= 0; i--) s += (v >> i) & 1; return s; }
  function kmapLayout(n) {
    var layerBits = Math.max(0, n - 4), m = n - layerBits;
    var rb = Math.floor(m / 2), cb = m - rb;
    var layers = [];
    for (var L = 0; L < (1 << layerBits); L++) {
      var grid = [], rg = gray(rb), cg = gray(cb);
      rg.forEach(function (rv) {
        var row = [];
        cg.forEach(function (cv) { row.push((L << m) | (rv << cb) | cv); });
        grid.push(row);
      });
      layers.push({ layer: L, grid: grid });
    }
    return {
      n: n, layerBits: layerBits, rowBits: rb, colBits: cb,
      rowLabels: gray(rb).map(function (v) { return bits(v, rb); }),
      colLabels: gray(cb).map(function (v) { return bits(v, cb); }),
      layers: layers,
      layerLabels: layers.map(function (l) { return bits(l.layer, layerBits); })
    };
  }

  function parseNumList(str, max) {
    var out = [], seen = {}, parts = String(str || '').split(/[\s,;]+/).filter(Boolean), bad = null;
    parts.forEach(function (p) {
      if (bad) return;
      var m = /^(\d+)\s*-\s*(\d+)$/.exec(p);
      if (m) { for (var x = +m[1]; x <= +m[2]; x++) { if (x >= max) { bad = x; return; } if (!seen[x]) { seen[x] = 1; out.push(x); } } return; }
      if (!/^\d+$/.test(p)) { bad = p; return; }
      var v = +p;
      if (v >= max) { bad = v; return; }
      if (!seen[v]) { seen[v] = 1; out.push(v); }
    });
    out.sort(function (a, b) { return a - b; });
    return { list: out, bad: bad };
  }

  root.CalvoLogic = {
    MAXVARS: MAXVARS,
    parse: parse, varsOf: varsOf, evalNode: evalNode, toStr: toStr, table: table,
    indicesOf: indicesOf, minimize: minimize, cellsOf: cellsOf, covers: covers,
    sopTerm: sopTerm, posTerm: posTerm, sopString: sopString, posString: posString,
    canonSOP: canonSOP, canonPOS: canonPOS, kmapLayout: kmapLayout, names: names,
    parseNumList: parseNumList, bits: bits, envFor: envFor
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CalvoLogic;
})(typeof window !== 'undefined' ? window : this);
