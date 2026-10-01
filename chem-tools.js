/* Calvo — chemistry engine for the standalone Molar Mass and Equation Balancer pages.
   Handles brackets, hydrates (CuSO4.5H2O), state symbols and leading coefficients. */
(function () {
  var MASS = {"H": 1.008, "He": 4.0026, "Li": 6.94, "Be": 9.0122, "B": 10.81, "C": 12.011, "N": 14.007, "O": 15.999, "F": 18.998, "Ne": 20.18, "Na": 22.99, "Mg": 24.305, "Al": 26.982, "Si": 28.085, "P": 30.974, "S": 32.06, "Cl": 35.45, "Ar": 39.948, "K": 39.098, "Ca": 40.078, "Sc": 44.956, "Ti": 47.867, "V": 50.942, "Cr": 51.996, "Mn": 54.938, "Fe": 55.845, "Co": 58.933, "Ni": 58.693, "Cu": 63.546, "Zn": 65.38, "Ga": 69.723, "Ge": 72.63, "As": 74.922, "Se": 78.971, "Br": 79.904, "Kr": 83.798, "Rb": 85.468, "Sr": 87.62, "Y": 88.906, "Zr": 91.224, "Nb": 92.906, "Mo": 95.95, "Tc": 98.0, "Ru": 101.07, "Rh": 102.91, "Pd": 106.42, "Ag": 107.87, "Cd": 112.41, "In": 114.82, "Sn": 118.71, "Sb": 121.76, "Te": 127.6, "I": 126.9, "Xe": 131.29, "Cs": 132.91, "Ba": 137.33, "La": 138.91, "Ce": 140.12, "Pr": 140.91, "Nd": 144.24, "Pm": 145.0, "Sm": 150.36, "Eu": 151.96, "Gd": 157.25, "Tb": 158.93, "Dy": 162.5, "Ho": 164.93, "Er": 167.26, "Tm": 168.93, "Yb": 173.05, "Lu": 174.97, "Hf": 178.49, "Ta": 180.95, "W": 183.84, "Re": 186.21, "Os": 190.23, "Ir": 192.22, "Pt": 195.08, "Au": 196.97, "Hg": 200.59, "Tl": 204.38, "Pb": 207.2, "Bi": 208.98, "Po": 209.0, "At": 210.0, "Rn": 222.0, "Fr": 223.0, "Ra": 226.0, "Ac": 227.0, "Th": 232.04, "Pa": 231.04, "U": 238.03, "Np": 237.0, "Pu": 244.0, "Am": 243.0, "Cm": 247.0, "Bk": 247.0, "Cf": 251.0, "Es": 252.0, "Fm": 257.0, "Md": 258.0, "No": 259.0, "Lr": 266.0, "Rf": 267.0, "Db": 268.0, "Sg": 269.0, "Bh": 270.0, "Hs": 269.0, "Mt": 278.0, "Ds": 281.0, "Rg": 282.0, "Cn": 285.0, "Nh": 286.0, "Fl": 289.0, "Mc": 290.0, "Lv": 293.0, "Ts": 294.0, "Og": 294.0};
  var NAME = {"H": "Hydrogen", "He": "Helium", "Li": "Lithium", "Be": "Beryllium", "B": "Boron", "C": "Carbon", "N": "Nitrogen", "O": "Oxygen", "F": "Fluorine", "Ne": "Neon", "Na": "Sodium", "Mg": "Magnesium", "Al": "Aluminium", "Si": "Silicon", "P": "Phosphorus", "S": "Sulfur", "Cl": "Chlorine", "Ar": "Argon", "K": "Potassium", "Ca": "Calcium", "Sc": "Scandium", "Ti": "Titanium", "V": "Vanadium", "Cr": "Chromium", "Mn": "Manganese", "Fe": "Iron", "Co": "Cobalt", "Ni": "Nickel", "Cu": "Copper", "Zn": "Zinc", "Ga": "Gallium", "Ge": "Germanium", "As": "Arsenic", "Se": "Selenium", "Br": "Bromine", "Kr": "Krypton", "Rb": "Rubidium", "Sr": "Strontium", "Y": "Yttrium", "Zr": "Zirconium", "Nb": "Niobium", "Mo": "Molybdenum", "Tc": "Technetium", "Ru": "Ruthenium", "Rh": "Rhodium", "Pd": "Palladium", "Ag": "Silver", "Cd": "Cadmium", "In": "Indium", "Sn": "Tin", "Sb": "Antimony", "Te": "Tellurium", "I": "Iodine", "Xe": "Xenon", "Cs": "Caesium", "Ba": "Barium", "La": "Lanthanum", "Ce": "Cerium", "Pr": "Praseodymium", "Nd": "Neodymium", "Pm": "Promethium", "Sm": "Samarium", "Eu": "Europium", "Gd": "Gadolinium", "Tb": "Terbium", "Dy": "Dysprosium", "Ho": "Holmium", "Er": "Erbium", "Tm": "Thulium", "Yb": "Ytterbium", "Lu": "Lutetium", "Hf": "Hafnium", "Ta": "Tantalum", "W": "Tungsten", "Re": "Rhenium", "Os": "Osmium", "Ir": "Iridium", "Pt": "Platinum", "Au": "Gold", "Hg": "Mercury", "Tl": "Thallium", "Pb": "Lead", "Bi": "Bismuth", "Po": "Polonium", "At": "Astatine", "Rn": "Radon", "Fr": "Francium", "Ra": "Radium", "Ac": "Actinium", "Th": "Thorium", "Pa": "Protactinium", "U": "Uranium", "Np": "Neptunium", "Pu": "Plutonium", "Am": "Americium", "Cm": "Curium", "Bk": "Berkelium", "Cf": "Californium", "Es": "Einsteinium", "Fm": "Fermium", "Md": "Mendelevium", "No": "Nobelium", "Lr": "Lawrencium", "Rf": "Rutherfordium", "Db": "Dubnium", "Sg": "Seaborgium", "Bh": "Bohrium", "Hs": "Hassium", "Mt": "Meitnerium", "Ds": "Darmstadtium", "Rg": "Roentgenium", "Cn": "Copernicium", "Nh": "Nihonium", "Fl": "Flerovium", "Mc": "Moscovium", "Lv": "Livermorium", "Ts": "Tennessine", "Og": "Oganesson"};
  var AVOGADRO = 6.02214076e23;

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
  function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
  function Frac(n, d) { if (d === undefined) d = 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); this.n = n / g; this.d = d / g; }
  Frac.prototype.add = function (o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); };
  Frac.prototype.sub = function (o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); };
  Frac.prototype.mul = function (o) { return new Frac(this.n * o.n, this.d * o.d); };
  Frac.prototype.div = function (o) { return new Frac(this.n * o.d, this.d * o.n); };
  Frac.prototype.zero = function () { return this.n === 0; };

  function clean(f) {
    return String(f)
      .replace(/[\u2080-\u2089]/g, function (c) { return String(c.charCodeAt(0) - 0x2080); })
      .replace(/[\u00b7\u2022\u22c5*]/g, '.')
      .replace(/\s+/g, '');
  }

  /* Parse one formula into {element: count}. Supports (), [], and hydrate parts joined by "." */
  function parseFormula(raw) {
    var f = clean(raw);
    if (!f) throw new Error('Enter a chemical formula.');
    var parts = f.split('.'), total = {};
    parts.forEach(function (part) {
      var mult = 1, m = part.match(/^(\d+)(.*)$/);
      if (m) { mult = parseInt(m[1], 10); part = m[2]; }
      if (!part) throw new Error('Incomplete hydrate part in "' + raw + '".');
      var c = parseGroup(part);
      for (var el in c) total[el] = (total[el] || 0) + c[el] * mult;
    });
    if (!Object.keys(total).length) throw new Error('No elements found in "' + raw + '".');
    return total;
  }
  function parseGroup(s) {
    var i = 0;
    function group(closer) {
      var counts = {};
      while (i < s.length) {
        var ch = s[i];
        if (ch === '(' || ch === '[') {
          var close = ch === '(' ? ')' : ']';
          i++;
          var inner = group(close);
          if (s[i] !== close) throw new Error('Brackets do not match in "' + s + '".');
          i++;
          var k = num();
          for (var e in inner) counts[e] = (counts[e] || 0) + inner[e] * k;
        } else if (ch === ')' || ch === ']') {
          if (closer && ch === closer) return counts;
          throw new Error('Brackets do not match in "' + s + '".');
        } else if (/[A-Z]/.test(ch)) {
          var sym = ch; i++;
          while (i < s.length && /[a-z]/.test(s[i])) { sym += s[i]; i++; }
          if (!(sym in MASS)) throw new Error('"' + sym + '" is not an element. Element symbols start with a capital letter, e.g. Co is cobalt but CO is carbon monoxide.');
          counts[sym] = (counts[sym] || 0) + num();
        } else if (/[a-z]/.test(ch)) {
          throw new Error('Unexpected lowercase "' + ch + '" in "' + s + '". Write element symbols with a capital first letter, e.g. NaCl not nacl.');
        } else {
          throw new Error('Unexpected character "' + ch + '" in "' + s + '".');
        }
      }
      if (closer) throw new Error('Brackets do not match in "' + s + '".');
      return counts;
    }
    function num() {
      var d = '';
      while (i < s.length && /[0-9]/.test(s[i])) { d += s[i]; i++; }
      return d ? parseInt(d, 10) : 1;
    }
    return group(null);
  }

  function molarMass(formula) {
    var counts = parseFormula(formula), total = 0, rows = [];
    Object.keys(counts).forEach(function (el) {
      var sub = MASS[el] * counts[el];
      total += sub;
      rows.push({ el: el, name: NAME[el], count: counts[el], mass: MASS[el], sub: sub });
    });
    rows.forEach(function (r) { r.pct = r.sub / total * 100; });
    return { total: total, rows: rows, counts: counts };
  }

  /* ---------- Equation balancer ---------- */
  function splitCompounds(side) {
    return side.split('+').map(function (c) {
      return clean(c).replace(/^\d+/, '').replace(/\((s|l|g|aq)\)/gi, '').replace(/\u2193|\u2191/g, '');
    }).filter(function (c) { return c.length; });
  }

  function balance(eq) {
    var sides = String(eq).split(/->|\u2192|\u27f6|=>|<=>|\u21cc|=/);
    if (sides.length !== 2 || !sides[0].trim() || !sides[1].trim()) throw new Error('Write the equation with an arrow or equals sign, e.g. H2 + O2 = H2O.');
    var left = splitCompounds(sides[0]), right = splitCompounds(sides[1]);
    if (!left.length || !right.length) throw new Error('Add at least one compound on each side.');
    var all = left.concat(right), parsed = all.map(parseFormula);
    var elements = [];
    parsed.forEach(function (p) { Object.keys(p).forEach(function (e) { if (elements.indexOf(e) < 0) elements.push(e); }); });
    var lset = {}, rset = {};
    parsed.forEach(function (p, i) { Object.keys(p).forEach(function (e) { (i < left.length ? lset : rset)[e] = 1; }); });
    elements.forEach(function (e) {
      if (!lset[e] || !rset[e]) throw new Error('Cannot balance: ' + e + ' (' + NAME[e] + ') appears only on one side of the equation.');
    });
    var n = all.length;
    var M = elements.map(function (e) { return parsed.map(function (p, c) { return new Frac((p[e] || 0) * (c < left.length ? 1 : -1)); }); });
    // Reduced row echelon form
    var piv = [], r = 0;
    for (var c = 0; c < n && r < M.length; c++) {
      var p = -1;
      for (var i = r; i < M.length; i++) if (!M[i][c].zero()) { p = i; break; }
      if (p < 0) continue;
      var tmp = M[p]; M[p] = M[r]; M[r] = tmp;
      var lead = M[r][c];
      M[r] = M[r].map(function (x) { return x.div(lead); });
      for (var j = 0; j < M.length; j++) if (j !== r && !M[j][c].zero()) {
        var f = M[j][c];
        M[j] = M[j].map(function (x, k) { return x.sub(M[r][k].mul(f)); });
      }
      piv.push(c); r++;
    }
    var free = [];
    for (var cc = 0; cc < n; cc++) if (piv.indexOf(cc) < 0) free.push(cc);
    if (free.length === 0) throw new Error('This equation cannot be balanced with positive whole numbers. Check the formulas for typing mistakes.');
    if (free.length > 1) throw new Error('This equation has more than one valid way to balance (the reaction may be a combination of separate reactions). Split it into single reactions and balance each one.');
    var sol = new Array(n), fcol = free[0];
    sol[fcol] = new Frac(1);
    piv.forEach(function (pc, row) { sol[pc] = M[row][fcol].mul(new Frac(-1)); });
    var den = 1; sol.forEach(function (s) { den = lcm(den, s.d); });
    var coeffs = sol.map(function (s) { return Math.round(s.n * (den / s.d)); });
    var g = coeffs.reduce(function (a, b) { return gcd(a, b); }, 0);
    coeffs = coeffs.map(function (x) { return x / g; });
    if (coeffs.some(function (x) { return x < 0; })) coeffs = coeffs.map(function (x) { return -x; });
    if (coeffs.some(function (x) { return x <= 0; })) throw new Error('This equation cannot be balanced with positive whole numbers. Check the formulas for typing mistakes.');
    // Verify
    var table = elements.map(function (e) {
      var L = 0, R = 0;
      parsed.forEach(function (pp, i) { var a = (pp[e] || 0) * coeffs[i]; if (i < left.length) L += a; else R += a; });
      return { el: e, left: L, right: R };
    });
    table.forEach(function (t) { if (t.left !== t.right) throw new Error('Internal check failed for ' + t.el + '. Please report this equation.'); });
    return { left: left, right: right, coeffs: coeffs, table: table };
  }

  function sub(f) { return String(f).replace(/(\d+)/g, '<sub>$1</sub>').replace(/\./g, '&middot;').replace(/<sub>(\d+)<\/sub>(?=[A-Z(\[])/g, '<sub>$1</sub>'); }
  function fmtFormula(f) {
    // subscripts for digits that follow a letter or bracket; leading digits (hydrate multipliers) stay normal
    return String(f).replace(/\./g, '&middot;').replace(/([A-Za-z\)\]])(\d+)/g, '$1<sub>$2</sub>');
  }

  window.CalvoChem = {
    mass: MASS, names: NAME, AVOGADRO: AVOGADRO,
    parseFormula: parseFormula, molarMass: molarMass, balance: balance, fmtFormula: fmtFormula
  };
})();
