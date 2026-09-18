/* ============================================
   CALVO — SUBJECT TOOLS
   Subject-specific calculators covering
   Chemistry, Physics, Biology, Commerce/Finance,
   and advanced Math — organized by category.
   ============================================ */
(function () {

  /* ---------- Shared helpers ---------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
  function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

  class Frac {
    constructor(n, d = 1) {
      if (d < 0) { n = -n; d = -d; }
      const g = gcd(n, d) || 1;
      this.n = n / g; this.d = d / g;
    }
    add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
    div(o) { return new Frac(this.n * o.d, this.d * o.n); }
    isZero() { return this.n === 0; }
    neg() { return new Frac(-this.n, this.d); }
  }

  // Standard atomic weights (g/mol) — common elements for FSc/Matric-level chemistry
  const ATOMIC_WEIGHTS = {
    H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
    F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06,
    Cl: 35.45, Ar: 39.948, K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996,
    Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.630,
    As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224,
    Nb: 92.906, Mo: 95.95, Ag: 107.87, Cd: 112.41, In: 114.82, Sn: 118.71, Sb: 121.76, I: 126.90,
    Te: 127.60, Xe: 131.29, Cs: 132.91, Ba: 137.33, Pt: 195.08, Au: 196.97, Hg: 200.59, Pb: 207.2,
    Bi: 208.98, Ra: 226, U: 238.03, W: 183.84, Pd: 106.42, Rh: 102.91, Ru: 101.07
  };

  // Parse a chemical formula (e.g. "Ca(OH)2") into { element: count }
  function parseFormula(formula) {
    let i = 0;
    function parseGroup() {
      const counts = {};
      while (i < formula.length) {
        const ch = formula[i];
        if (ch === '(') {
          i++;
          const inner = parseGroup();
          if (formula[i] !== ')') throw new Error('Mismatched parentheses');
          i++;
          let numStr = '';
          while (i < formula.length && /[0-9]/.test(formula[i])) { numStr += formula[i]; i++; }
          const mult = numStr ? parseInt(numStr, 10) : 1;
          for (const el in inner) counts[el] = (counts[el] || 0) + inner[el] * mult;
        } else if (ch === ')') {
          break;
        } else if (/[A-Z]/.test(ch)) {
          let sym = ch; i++;
          while (i < formula.length && /[a-z]/.test(formula[i])) { sym += formula[i]; i++; }
          let numStr = '';
          while (i < formula.length && /[0-9]/.test(formula[i])) { numStr += formula[i]; i++; }
          const count = numStr ? parseInt(numStr, 10) : 1;
          counts[sym] = (counts[sym] || 0) + count;
        } else {
          i++;
        }
      }
      return counts;
    }
    return parseGroup();
  }

  function molarMassOf(formula) {
    const counts = parseFormula(formula.replace(/\s+/g, ''));
    let mass = 0;
    for (const el in counts) {
      if (!(el in ATOMIC_WEIGHTS)) throw new Error('Unknown element: ' + el);
      mass += ATOMIC_WEIGHTS[el] * counts[el];
    }
    return { mass, counts };
  }

  function balanceEquation(equationStr) {
    const [lhs, rhs] = equationStr.split(/=|->/).map(s => s.trim());
    if (!lhs || !rhs) throw new Error('bad_format');
    const reactants = lhs.split('+').map(s => s.trim().replace(/\s+/g, ''));
    const products = rhs.split('+').map(s => s.trim().replace(/\s+/g, ''));
    const compounds = [...reactants.map(f => ({ f, sign: 1 })), ...products.map(f => ({ f, sign: -1 }))];
    const parsed = compounds.map(c => parseFormula(c.f));
    const elements = [...new Set(parsed.flatMap(p => Object.keys(p)))];
    const nCompounds = compounds.length;
    const matrix = elements.map((el) => parsed.map((p, c) => new Frac((p[el] || 0) * compounds[c].sign)));

    let lead = 0;
    const rows = matrix.length, cols = nCompounds;
    for (let r = 0; r < rows && lead < cols; r++) {
      let i = r;
      while (i < rows && matrix[i][lead].isZero()) i++;
      if (i === rows) { lead++; r--; continue; }
      [matrix[i], matrix[r]] = [matrix[r], matrix[i]];
      const lv = matrix[r][lead];
      for (let c = 0; c < cols; c++) matrix[r][c] = matrix[r][c].div(lv);
      for (let i2 = 0; i2 < rows; i2++) {
        if (i2 !== r) {
          const factor = matrix[i2][lead];
          for (let c = 0; c < cols; c++) matrix[i2][c] = matrix[i2][c].sub(matrix[r][c].mul(factor));
        }
      }
      lead++;
    }

    const solution = new Array(nCompounds).fill(null);
    solution[nCompounds - 1] = new Frac(1);
    for (let r = rows - 1; r >= 0; r--) {
      let pivotCol = -1;
      for (let c = 0; c < cols; c++) { if (!matrix[r][c].isZero()) { pivotCol = c; break; } }
      if (pivotCol === -1 || pivotCol === nCompounds - 1) continue;
      let sum = new Frac(0);
      for (let c = pivotCol + 1; c < cols; c++) if (solution[c] !== null) sum = sum.add(matrix[r][c].mul(solution[c]));
      solution[pivotCol] = sum.neg().div(matrix[r][pivotCol]);
    }
    for (let i = 0; i < nCompounds; i++) if (solution[i] === null) solution[i] = new Frac(0);

    let denomLcm = 1;
    solution.forEach(s => { denomLcm = lcm(denomLcm, s.d); });
    let coeffs = solution.map(s => Math.round(s.n * (denomLcm / s.d)));
    let g = coeffs.reduce((a, b) => gcd(a, b), coeffs[0] || 1);
    coeffs = coeffs.map(c => c / (g || 1));
    if (coeffs.some(c => c < 0)) coeffs = coeffs.map(c => -c);
    if (coeffs.every(c => c === 0)) throw new Error('could_not_balance');

    return { compounds: compounds.map(c => c.f), coeffs, nReactants: reactants.length };
  }

  /* ---------- UI helpers ---------- */
  function field(id, labelKey, placeholder, type) {
    type = type || 'text';
    // All fields use a plain type="text" input with the standard keyboard
    // (letters + numbers together) rather than a numbers-only inputmode,
    // so every field — number or text — lets the user type both digits
    // and letters (e.g. a minus sign, scientific notation 'e', or a
    // pasted chemical formula) instead of being locked to one or the other.
    return `<div class="tool-field">
      <label for="${id}">${t(labelKey)}</label>
      <input type="text" id="${id}" class="formula-search convert-input tool-input" placeholder="${placeholder || ''}" style="padding-left:14px;background-image:none;">
    </div>`;
  }
  function selectField(id, labelKey, options) {
    const opts = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    return `<div class="tool-field">
      <label for="${id}">${t(labelKey)}</label>
      <select id="${id}" class="formula-search convert-select tool-input" style="padding-left:14px;">${opts}</select>
    </div>`;
  }
  function num(id) {
    const el = document.getElementById(id);
    if (!el || el.value.trim() === '') return null;
    const v = parseFloat(el.value);
    return isNaN(v) ? null : v;
  }
  function str(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function resultCell(label, value) {
    return `<div class="stats-result-cell"><div class="stats-label">${label}</div><div class="stats-value">${value}</div></div>`;
  }
  function errorBox(msg) {
    return `<div class="tool-error">${msg}</div>`;
  }
  function round(x, dp) {
    dp = dp === undefined ? 4 : dp;
    if (!isFinite(x)) return String(x);
    return Math.round(x * Math.pow(10, dp)) / Math.pow(10, dp);
  }

  // Safely compiles a single-variable f(x) string (used by the Calculus
  // tools) into a callable JS function, whitelisting allowed tokens first.
  function compileCalcFn(exprRaw) {
    let expr = (exprRaw || '').trim();
    if (!expr) return null;
    expr = expr.replace(/(\d)(x)/gi, '$1*$2');
    expr = expr.replace(/\)(\s*)(x|\()/gi, ')*$2');
    expr = expr.replace(/(\d)(\()/g, '$1*$2');
    expr = expr.replace(/\^/g, '**');
    expr = expr.replace(/\bln\(/g, 'log(');
    const safety = expr
      .replace(/\b(sin|cos|tan|asin|acos|atan|sqrt|abs|log|exp|pow|min|max|pi|PI)\b/g, '')
      .replace(/[x\d\s+\-*/().,]/g, '');
    if (safety.length > 0) return null;
    const body = expr
      .replace(/\bsin\(/g, 'Math.sin(').replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(').replace(/\basin\(/g, 'Math.asin(')
      .replace(/\bacos\(/g, 'Math.acos(').replace(/\batan\(/g, 'Math.atan(')
      .replace(/\bsqrt\(/g, 'Math.sqrt(').replace(/\babs\(/g, 'Math.abs(')
      .replace(/\blog\(/g, 'Math.log(').replace(/\bexp\(/g, 'Math.exp(')
      .replace(/\bpow\(/g, 'Math.pow(').replace(/\bmin\(/g, 'Math.min(')
      .replace(/\bmax\(/g, 'Math.max(').replace(/\bpi\b/gi, 'Math.PI');
    try {
      const fn = new Function('x', 'return (' + body + ');');
      fn(1);
      return fn;
    } catch (e) { return null; }
  }

  // Shared numeric-calculus helpers (used by the extra Calculus tools below).
  function numDeriv1(fn, x, h) { h = h || 1e-5; return (fn(x + h) - fn(x - h)) / (2 * h); }
  function numDeriv2(fn, x, h) { h = h || 1e-4; return (fn(x + h) - 2 * fn(x) + fn(x - h)) / (h * h); }
  function numDeriv3(fn, x, h) { h = h || 1e-2; return (fn(x + 2*h) - 2*fn(x + h) + 2*fn(x - h) - fn(x - 2*h)) / (2 * h * h * h); }
  function numDeriv4(fn, x, h) { h = h || 1e-2; return (fn(x + 2*h) - 4*fn(x + h) + 6*fn(x) - 4*fn(x - h) + fn(x - 2*h)) / (h * h * h * h); }
  function simpsonIntegral(fn, a, b, n) {
    n = n || 1000;
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);
    for (let i = 1; i < n; i++) {
      const x = a + i * h;
      sum += fn(x) * (i % 2 === 0 ? 2 : 4);
    }
    return (h / 3) * sum;
  }

  /* ============================================
     PERIODIC TABLE DATA (all 118 elements)
     cat: alkali | alkaline | transition | post | metalloid |
          nonmetal | halogen | noble | lanthanide | actinide
     ============================================ */
  const ELEMENTS = [
    {z:1,symbol:'H',name:'Hydrogen',mass:1.008,cat:'nonmetal',group:1,period:1},
    {z:2,symbol:'He',name:'Helium',mass:4.0026,cat:'noble',group:18,period:1},
    {z:3,symbol:'Li',name:'Lithium',mass:6.94,cat:'alkali',group:1,period:2},
    {z:4,symbol:'Be',name:'Beryllium',mass:9.0122,cat:'alkaline',group:2,period:2},
    {z:5,symbol:'B',name:'Boron',mass:10.81,cat:'metalloid',group:13,period:2},
    {z:6,symbol:'C',name:'Carbon',mass:12.011,cat:'nonmetal',group:14,period:2},
    {z:7,symbol:'N',name:'Nitrogen',mass:14.007,cat:'nonmetal',group:15,period:2},
    {z:8,symbol:'O',name:'Oxygen',mass:15.999,cat:'nonmetal',group:16,period:2},
    {z:9,symbol:'F',name:'Fluorine',mass:18.998,cat:'halogen',group:17,period:2},
    {z:10,symbol:'Ne',name:'Neon',mass:20.180,cat:'noble',group:18,period:2},
    {z:11,symbol:'Na',name:'Sodium',mass:22.990,cat:'alkali',group:1,period:3},
    {z:12,symbol:'Mg',name:'Magnesium',mass:24.305,cat:'alkaline',group:2,period:3},
    {z:13,symbol:'Al',name:'Aluminium',mass:26.982,cat:'post',group:13,period:3},
    {z:14,symbol:'Si',name:'Silicon',mass:28.085,cat:'metalloid',group:14,period:3},
    {z:15,symbol:'P',name:'Phosphorus',mass:30.974,cat:'nonmetal',group:15,period:3},
    {z:16,symbol:'S',name:'Sulfur',mass:32.06,cat:'nonmetal',group:16,period:3},
    {z:17,symbol:'Cl',name:'Chlorine',mass:35.45,cat:'halogen',group:17,period:3},
    {z:18,symbol:'Ar',name:'Argon',mass:39.948,cat:'noble',group:18,period:3},
    {z:19,symbol:'K',name:'Potassium',mass:39.098,cat:'alkali',group:1,period:4},
    {z:20,symbol:'Ca',name:'Calcium',mass:40.078,cat:'alkaline',group:2,period:4},
    {z:21,symbol:'Sc',name:'Scandium',mass:44.956,cat:'transition',group:3,period:4},
    {z:22,symbol:'Ti',name:'Titanium',mass:47.867,cat:'transition',group:4,period:4},
    {z:23,symbol:'V',name:'Vanadium',mass:50.942,cat:'transition',group:5,period:4},
    {z:24,symbol:'Cr',name:'Chromium',mass:51.996,cat:'transition',group:6,period:4},
    {z:25,symbol:'Mn',name:'Manganese',mass:54.938,cat:'transition',group:7,period:4},
    {z:26,symbol:'Fe',name:'Iron',mass:55.845,cat:'transition',group:8,period:4},
    {z:27,symbol:'Co',name:'Cobalt',mass:58.933,cat:'transition',group:9,period:4},
    {z:28,symbol:'Ni',name:'Nickel',mass:58.693,cat:'transition',group:10,period:4},
    {z:29,symbol:'Cu',name:'Copper',mass:63.546,cat:'transition',group:11,period:4},
    {z:30,symbol:'Zn',name:'Zinc',mass:65.38,cat:'transition',group:12,period:4},
    {z:31,symbol:'Ga',name:'Gallium',mass:69.723,cat:'post',group:13,period:4},
    {z:32,symbol:'Ge',name:'Germanium',mass:72.630,cat:'metalloid',group:14,period:4},
    {z:33,symbol:'As',name:'Arsenic',mass:74.922,cat:'metalloid',group:15,period:4},
    {z:34,symbol:'Se',name:'Selenium',mass:78.971,cat:'nonmetal',group:16,period:4},
    {z:35,symbol:'Br',name:'Bromine',mass:79.904,cat:'halogen',group:17,period:4},
    {z:36,symbol:'Kr',name:'Krypton',mass:83.798,cat:'noble',group:18,period:4},
    {z:37,symbol:'Rb',name:'Rubidium',mass:85.468,cat:'alkali',group:1,period:5},
    {z:38,symbol:'Sr',name:'Strontium',mass:87.62,cat:'alkaline',group:2,period:5},
    {z:39,symbol:'Y',name:'Yttrium',mass:88.906,cat:'transition',group:3,period:5},
    {z:40,symbol:'Zr',name:'Zirconium',mass:91.224,cat:'transition',group:4,period:5},
    {z:41,symbol:'Nb',name:'Niobium',mass:92.906,cat:'transition',group:5,period:5},
    {z:42,symbol:'Mo',name:'Molybdenum',mass:95.95,cat:'transition',group:6,period:5},
    {z:43,symbol:'Tc',name:'Technetium',mass:98,cat:'transition',group:7,period:5},
    {z:44,symbol:'Ru',name:'Ruthenium',mass:101.07,cat:'transition',group:8,period:5},
    {z:45,symbol:'Rh',name:'Rhodium',mass:102.91,cat:'transition',group:9,period:5},
    {z:46,symbol:'Pd',name:'Palladium',mass:106.42,cat:'transition',group:10,period:5},
    {z:47,symbol:'Ag',name:'Silver',mass:107.87,cat:'transition',group:11,period:5},
    {z:48,symbol:'Cd',name:'Cadmium',mass:112.41,cat:'transition',group:12,period:5},
    {z:49,symbol:'In',name:'Indium',mass:114.82,cat:'post',group:13,period:5},
    {z:50,symbol:'Sn',name:'Tin',mass:118.71,cat:'post',group:14,period:5},
    {z:51,symbol:'Sb',name:'Antimony',mass:121.76,cat:'metalloid',group:15,period:5},
    {z:52,symbol:'Te',name:'Tellurium',mass:127.60,cat:'metalloid',group:16,period:5},
    {z:53,symbol:'I',name:'Iodine',mass:126.90,cat:'halogen',group:17,period:5},
    {z:54,symbol:'Xe',name:'Xenon',mass:131.29,cat:'noble',group:18,period:5},
    {z:55,symbol:'Cs',name:'Caesium',mass:132.91,cat:'alkali',group:1,period:6},
    {z:56,symbol:'Ba',name:'Barium',mass:137.33,cat:'alkaline',group:2,period:6},
    {z:57,symbol:'La',name:'Lanthanum',mass:138.91,cat:'lanthanide',group:3,period:6},
    {z:58,symbol:'Ce',name:'Cerium',mass:140.12,cat:'lanthanide',group:0,period:9},
    {z:59,symbol:'Pr',name:'Praseodymium',mass:140.91,cat:'lanthanide',group:0,period:9},
    {z:60,symbol:'Nd',name:'Neodymium',mass:144.24,cat:'lanthanide',group:0,period:9},
    {z:61,symbol:'Pm',name:'Promethium',mass:145,cat:'lanthanide',group:0,period:9},
    {z:62,symbol:'Sm',name:'Samarium',mass:150.36,cat:'lanthanide',group:0,period:9},
    {z:63,symbol:'Eu',name:'Europium',mass:151.96,cat:'lanthanide',group:0,period:9},
    {z:64,symbol:'Gd',name:'Gadolinium',mass:157.25,cat:'lanthanide',group:0,period:9},
    {z:65,symbol:'Tb',name:'Terbium',mass:158.93,cat:'lanthanide',group:0,period:9},
    {z:66,symbol:'Dy',name:'Dysprosium',mass:162.50,cat:'lanthanide',group:0,period:9},
    {z:67,symbol:'Ho',name:'Holmium',mass:164.93,cat:'lanthanide',group:0,period:9},
    {z:68,symbol:'Er',name:'Erbium',mass:167.26,cat:'lanthanide',group:0,period:9},
    {z:69,symbol:'Tm',name:'Thulium',mass:168.93,cat:'lanthanide',group:0,period:9},
    {z:70,symbol:'Yb',name:'Ytterbium',mass:173.05,cat:'lanthanide',group:0,period:9},
    {z:71,symbol:'Lu',name:'Lutetium',mass:174.97,cat:'lanthanide',group:0,period:9},
    {z:72,symbol:'Hf',name:'Hafnium',mass:178.49,cat:'transition',group:4,period:6},
    {z:73,symbol:'Ta',name:'Tantalum',mass:180.95,cat:'transition',group:5,period:6},
    {z:74,symbol:'W',name:'Tungsten',mass:183.84,cat:'transition',group:6,period:6},
    {z:75,symbol:'Re',name:'Rhenium',mass:186.21,cat:'transition',group:7,period:6},
    {z:76,symbol:'Os',name:'Osmium',mass:190.23,cat:'transition',group:8,period:6},
    {z:77,symbol:'Ir',name:'Iridium',mass:192.22,cat:'transition',group:9,period:6},
    {z:78,symbol:'Pt',name:'Platinum',mass:195.08,cat:'transition',group:10,period:6},
    {z:79,symbol:'Au',name:'Gold',mass:196.97,cat:'transition',group:11,period:6},
    {z:80,symbol:'Hg',name:'Mercury',mass:200.59,cat:'transition',group:12,period:6},
    {z:81,symbol:'Tl',name:'Thallium',mass:204.38,cat:'post',group:13,period:6},
    {z:82,symbol:'Pb',name:'Lead',mass:207.2,cat:'post',group:14,period:6},
    {z:83,symbol:'Bi',name:'Bismuth',mass:208.98,cat:'post',group:15,period:6},
    {z:84,symbol:'Po',name:'Polonium',mass:209,cat:'post',group:16,period:6},
    {z:85,symbol:'At',name:'Astatine',mass:210,cat:'halogen',group:17,period:6},
    {z:86,symbol:'Rn',name:'Radon',mass:222,cat:'noble',group:18,period:6},
    {z:87,symbol:'Fr',name:'Francium',mass:223,cat:'alkali',group:1,period:7},
    {z:88,symbol:'Ra',name:'Radium',mass:226,cat:'alkaline',group:2,period:7},
    {z:89,symbol:'Ac',name:'Actinium',mass:227,cat:'actinide',group:3,period:7},
    {z:90,symbol:'Th',name:'Thorium',mass:232.04,cat:'actinide',group:0,period:10},
    {z:91,symbol:'Pa',name:'Protactinium',mass:231.04,cat:'actinide',group:0,period:10},
    {z:92,symbol:'U',name:'Uranium',mass:238.03,cat:'actinide',group:0,period:10},
    {z:93,symbol:'Np',name:'Neptunium',mass:237,cat:'actinide',group:0,period:10},
    {z:94,symbol:'Pu',name:'Plutonium',mass:244,cat:'actinide',group:0,period:10},
    {z:95,symbol:'Am',name:'Americium',mass:243,cat:'actinide',group:0,period:10},
    {z:96,symbol:'Cm',name:'Curium',mass:247,cat:'actinide',group:0,period:10},
    {z:97,symbol:'Bk',name:'Berkelium',mass:247,cat:'actinide',group:0,period:10},
    {z:98,symbol:'Cf',name:'Californium',mass:251,cat:'actinide',group:0,period:10},
    {z:99,symbol:'Es',name:'Einsteinium',mass:252,cat:'actinide',group:0,period:10},
    {z:100,symbol:'Fm',name:'Fermium',mass:257,cat:'actinide',group:0,period:10},
    {z:101,symbol:'Md',name:'Mendelevium',mass:258,cat:'actinide',group:0,period:10},
    {z:102,symbol:'No',name:'Nobelium',mass:259,cat:'actinide',group:0,period:10},
    {z:103,symbol:'Lr',name:'Lawrencium',mass:266,cat:'actinide',group:0,period:10},
    {z:104,symbol:'Rf',name:'Rutherfordium',mass:267,cat:'transition',group:4,period:7},
    {z:105,symbol:'Db',name:'Dubnium',mass:268,cat:'transition',group:5,period:7},
    {z:106,symbol:'Sg',name:'Seaborgium',mass:269,cat:'transition',group:6,period:7},
    {z:107,symbol:'Bh',name:'Bohrium',mass:270,cat:'transition',group:7,period:7},
    {z:108,symbol:'Hs',name:'Hassium',mass:269,cat:'transition',group:8,period:7},
    {z:109,symbol:'Mt',name:'Meitnerium',mass:278,cat:'transition',group:9,period:7},
    {z:110,symbol:'Ds',name:'Darmstadtium',mass:281,cat:'transition',group:10,period:7},
    {z:111,symbol:'Rg',name:'Roentgenium',mass:282,cat:'transition',group:11,period:7},
    {z:112,symbol:'Cn',name:'Copernicium',mass:285,cat:'transition',group:12,period:7},
    {z:113,symbol:'Nh',name:'Nihonium',mass:286,cat:'post',group:13,period:7},
    {z:114,symbol:'Fl',name:'Flerovium',mass:289,cat:'post',group:14,period:7},
    {z:115,symbol:'Mc',name:'Moscovium',mass:290,cat:'post',group:15,period:7},
    {z:116,symbol:'Lv',name:'Livermorium',mass:293,cat:'post',group:16,period:7},
    {z:117,symbol:'Ts',name:'Tennessine',mass:294,cat:'halogen',group:17,period:7},
    {z:118,symbol:'Og',name:'Oganesson',mass:294,cat:'noble',group:18,period:7},
  ];
  const ELEMENT_CAT_LABELS = {
    alkali: 'Alkali metal', alkaline: 'Alkaline earth metal', transition: 'Transition metal',
    post: 'Post-transition metal', metalloid: 'Metalloid', nonmetal: 'Reactive nonmetal',
    halogen: 'Halogen', noble: 'Noble gas', lanthanide: 'Lanthanide', actinide: 'Actinide'
  };

  window.CalvoPeriodicTable = {
    init() {
      const grid = document.getElementById('periodicGrid');
      if (!grid) return;
      grid.innerHTML = ELEMENTS.map(el => {
        // main table cells only get a CSS grid position; the two
        // f-block rows (lanthanides/actinides) sit below, in order.
        const style = el.group > 0
          ? `grid-column:${el.group};grid-row:${el.period};`
          : `grid-row:${el.period};`;
        return `<button type="button" class="periodic-cell cat-${el.cat}" style="${style}" data-symbol="${el.symbol}" title="${el.name}">
          <span class="pc-z">${el.z}</span>
          <span class="pc-symbol">${el.symbol}</span>
        </button>`;
      }).join('');
      grid.querySelectorAll('.periodic-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const el = ELEMENTS.find(e => e.symbol === cell.dataset.symbol);
          if (el) this.renderDetail(el);
        });
      });
    },
    renderDetail(el) {
      const box = document.getElementById('periodicDetail');
      if (!box) return;
      box.classList.remove('periodic-detail-empty');
      box.innerHTML = `
        <div class="periodic-detail-head cat-${el.cat}">
          <div class="periodic-detail-symbol">${el.symbol}</div>
          <div>
            <div class="periodic-detail-name">${el.name}</div>
            <div class="periodic-detail-sub">${ELEMENT_CAT_LABELS[el.cat] || ''}</div>
          </div>
        </div>
        <div class="stats-result-grid">
          ${resultCell('Atomic Number', el.z)}
          ${resultCell('Atomic Mass', el.mass + ' u')}
          ${resultCell('Period', el.period <= 7 ? el.period : (el.cat === 'lanthanide' ? 6 : 7))}
          ${resultCell('Group', el.group > 0 ? el.group : '—')}
        </div>`;
    }
  };

  /* ============================================
     TOOL DEFINITIONS
     ============================================ */
  const TOOLS = {

    Chemistry: [
      {
        id: 'molarMass',
        label: 'tool_molar_mass',
        render: () => `
          <p class="tool-hint">${t('tool_molar_mass_hint')}</p>
          ${field('molarFormula', 'tool_formula_label', 'e.g. H2O, NaCl, C6H12O6')}
          ${field('molarMass_g', 'tool_mass_g', 'grams (optional)', 'number')}
          ${field('molarMoles', 'tool_moles', 'moles (optional)', 'number')}
          ${field('molarVolumeL', 'tool_volume_l', 'volume in liters (optional)', 'number')}
          <p class="tool-hint">${t('tool_molar_mass_hint2')}</p>
        `,
        calc: (out) => {
          const formula = str('molarFormula');
          const g = num('molarMass_g');
          let moles = num('molarMoles');
          const vol = num('molarVolumeL');
          if (!formula) { out.innerHTML = errorBox(t('tool_err_formula')); return; }
          let molarMass, counts;
          try { ({ mass: molarMass, counts } = molarMassOf(formula)); }
          catch (e) { out.innerHTML = errorBox(t('tool_err_element')); return; }

          let html = resultCell(t('tool_molar_mass'), round(molarMass, 3) + ' g/mol');
          if (g !== null && moles === null) { moles = g / molarMass; html += resultCell(t('tool_moles'), round(moles, 5)); }
          else if (moles !== null && g === null) { html += resultCell(t('tool_mass_g'), round(moles * molarMass, 4) + ' g'); }
          else if (g !== null && moles !== null) { html += resultCell(t('tool_moles'), round(moles, 5)); }
          if (vol !== null && moles !== null) html += resultCell(t('tool_molarity'), round(moles / vol, 5) + ' mol/L');
          out.innerHTML = html;
        }
      },
      {
        id: 'ph',
        label: 'tool_ph_calc',
        render: () => `
          <p class="tool-hint">${t('tool_ph_hint')}</p>
          ${field('phConcH', 'tool_h_conc', 'e.g. 0.0001 (mol/L)', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('phValue', 'tool_ph_value', 'e.g. 4', 'number')}
        `,
        calc: (out) => {
          const h = num('phConcH');
          const ph = num('phValue');
          if (h === null && ph === null) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
          let html = '';
          if (h !== null) {
            const p = -Math.log10(h);
            html += resultCell('pH', round(p, 3));
            html += resultCell('pOH', round(14 - p, 3));
          } else {
            const hc = Math.pow(10, -ph);
            html += resultCell('[H+]', hc.toExponential(3) + ' mol/L');
            html += resultCell('pOH', round(14 - ph, 3));
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'balancer',
        label: 'tool_eq_balancer',
        render: () => `
          <p class="tool-hint">${t('tool_balancer_hint')}</p>
          ${field('balancerInput', 'tool_equation_label', 'e.g. C3H8 + O2 = CO2 + H2O')}
        `,
        calc: (out) => {
          const eq = str('balancerInput');
          if (!eq) { out.innerHTML = errorBox(t('tool_err_equation')); return; }
          try {
            const result = balanceEquation(eq);
            const { compounds, coeffs, nReactants } = result;
            const fmt = (i) => (coeffs[i] === 1 ? '' : coeffs[i]) + compounds[i];
            const lhs = compounds.slice(0, nReactants).map((_, i) => fmt(i)).join(' + ');
            const rhs = compounds.slice(nReactants).map((_, i) => fmt(i + nReactants)).join(' + ');
            out.innerHTML = `<div class="tool-balanced-eq">${lhs} &rarr; ${rhs}</div>`;
          } catch (e) {
            out.innerHTML = errorBox(t('tool_err_balance'));
          }
        }
      },
      {
        id: 'gasLaw',
        label: 'tool_ideal_gas',
        render: () => `
          <p class="tool-hint">${t('tool_gas_hint')}</p>
          ${field('gasP', 'tool_pressure_atm', 'P (atm)', 'number')}
          ${field('gasV', 'tool_volume_liters', 'V (L)', 'number')}
          ${field('gasN', 'tool_moles_n', 'n (mol)', 'number')}
          ${field('gasT', 'tool_temp_k', 'T (K)', 'number')}
          <p class="tool-hint">${t('tool_gas_hint2')}</p>
        `,
        calc: (out) => {
          const R = 0.0821;
          let P = num('gasP'), V = num('gasV'), n = num('gasN'), T = num('gasT');
          const filled = [P, V, n, T].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (P === null) P = (n * R * T) / V;
          else if (V === null) V = (n * R * T) / P;
          else if (n === null) n = (P * V) / (R * T);
          else if (T === null) T = (P * V) / (n * R);
          out.innerHTML =
            resultCell('P', round(P, 4) + ' atm') +
            resultCell('V', round(V, 4) + ' L') +
            resultCell('n', round(n, 4) + ' mol') +
            resultCell('T', round(T, 4) + ' K');
        }
      },
      {
        id: 'dilution',
        label: 'tool_dilution',
        render: () => `
          <p class="tool-hint">${t('tool_dilution_hint')}</p>
          ${field('dilM1', 'tool_initial_molarity', 'M1 (mol/L)', 'number')}
          ${field('dilV1', 'tool_initial_volume', 'V1', 'number')}
          ${field('dilM2', 'tool_final_molarity', 'M2 (mol/L)', 'number')}
          ${field('dilV2', 'tool_final_volume', 'V2', 'number')}
        `,
        calc: (out) => {
          let M1 = num('dilM1'), V1 = num('dilV1'), M2 = num('dilM2'), V2 = num('dilV2');
          const filled = [M1, V1, M2, V2].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (M1 === null) M1 = (M2 * V2) / V1;
          else if (V1 === null) V1 = (M2 * V2) / M1;
          else if (M2 === null) M2 = (M1 * V1) / V2;
          else if (V2 === null) V2 = (M1 * V1) / M2;
          out.innerHTML =
            resultCell('M1', round(M1, 5)) +
            resultCell('V1', round(V1, 5)) +
            resultCell('M2', round(M2, 5)) +
            resultCell('V2', round(V2, 5));
        }
      },
      {
        id: 'percentComposition',
        label: 'tool_percent_composition',
        render: () => `
          <p class="tool-hint">${t('tool_percent_composition_hint')}</p>
          ${field('pcompFormula', 'tool_formula_label', 'e.g. H2O, C6H12O6')}
        `,
        calc: (out) => {
          const formula = str('pcompFormula');
          if (!formula) { out.innerHTML = errorBox(t('tool_err_formula')); return; }
          let mass, counts;
          try { ({ mass, counts } = molarMassOf(formula)); }
          catch (e) { out.innerHTML = errorBox(t('tool_err_element')); return; }
          let html = resultCell(t('tool_molar_mass'), round(mass, 3) + ' g/mol');
          Object.keys(counts).forEach(el => {
            const pct = (ATOMIC_WEIGHTS[el] * counts[el] / mass) * 100;
            html += resultCell(el, round(pct, 2) + '%');
          });
          out.innerHTML = html;
        }
      },
      {
        id: 'empiricalFormula',
        label: 'tool_empirical_formula',
        render: () => `
          <p class="tool-hint">${t('tool_empirical_formula_hint')}</p>
          <div class="tool-vector-row">
            ${field('efEl1', 'tool_element_symbol', 'e.g. C')}
            ${field('efPct1', 'tool_mass_percent', '%', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('efEl2', 'tool_element_symbol', 'e.g. H')}
            ${field('efPct2', 'tool_mass_percent', '%', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('efEl3', 'tool_element_symbol', 'optional')}
            ${field('efPct3', 'tool_mass_percent', '%', 'number')}
          </div>
        `,
        calc: (out) => {
          const entries = [
            [str('efEl1'), num('efPct1')],
            [str('efEl2'), num('efPct2')],
            [str('efEl3'), num('efPct3')]
          ].filter(([el, pct]) => el && pct !== null && pct > 0);
          if (entries.length < 2) { out.innerHTML = errorBox(t('tool_err_empirical')); return; }
          let moles;
          try {
            moles = entries.map(([el, pct]) => {
              if (!(el in ATOMIC_WEIGHTS)) throw new Error('bad_el');
              return { el, mol: pct / ATOMIC_WEIGHTS[el] };
            });
          } catch (e) { out.innerHTML = errorBox(t('tool_err_element')); return; }
          const minMol = Math.min(...moles.map(m => m.mol));
          const ratios = moles.map(m => ({ el: m.el, ratio: m.mol / minMol }));
          const roundedRatios = ratios.map(r => Math.round(r.ratio));
          const formulaStr = ratios.map((r, i) => r.el + (roundedRatios[i] === 1 ? '' : roundedRatios[i])).join('');
          out.innerHTML = resultCell(t('tool_empirical_formula_result'), formulaStr);
        }
      },
      {
        id: 'boylesLaw',
        label: 'tool_boyles_law',
        render: () => `
          <p class="tool-hint">${t('tool_boyles_hint')}</p>
          ${field('boyleP1', 'tool_p1', 'P1', 'number')}
          ${field('boyleV1', 'tool_v1', 'V1', 'number')}
          ${field('boyleP2', 'tool_p2', 'P2', 'number')}
          ${field('boyleV2', 'tool_v2', 'V2', 'number')}
        `,
        calc: (out) => {
          let P1 = num('boyleP1'), V1 = num('boyleV1'), P2 = num('boyleP2'), V2 = num('boyleV2');
          const filled = [P1, V1, P2, V2].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (P1 === null) P1 = (P2 * V2) / V1;
          else if (V1 === null) V1 = (P2 * V2) / P1;
          else if (P2 === null) P2 = (P1 * V1) / V2;
          else if (V2 === null) V2 = (P1 * V1) / P2;
          out.innerHTML =
            resultCell('P1', round(P1, 5)) + resultCell('V1', round(V1, 5)) +
            resultCell('P2', round(P2, 5)) + resultCell('V2', round(V2, 5));
        }
      },
      {
        id: 'charlesLaw',
        label: 'tool_charles_law',
        render: () => `
          <p class="tool-hint">${t('tool_charles_hint')}</p>
          ${field('charV1', 'tool_v1', 'V1', 'number')}
          ${field('charT1', 'tool_t1', 'T1 (K)', 'number')}
          ${field('charV2', 'tool_v2', 'V2', 'number')}
          ${field('charT2', 'tool_t2', 'T2 (K)', 'number')}
        `,
        calc: (out) => {
          let V1 = num('charV1'), T1 = num('charT1'), V2 = num('charV2'), T2 = num('charT2');
          const filled = [V1, T1, V2, T2].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (V1 === null) V1 = (V2 * T1) / T2;
          else if (T1 === null) T1 = (V1 * T2) / V2;
          else if (V2 === null) V2 = (V1 * T2) / T1;
          else if (T2 === null) T2 = (V2 * T1) / V1;
          out.innerHTML =
            resultCell('V1', round(V1, 5)) + resultCell('T1', round(T1, 5) + ' K') +
            resultCell('V2', round(V2, 5)) + resultCell('T2', round(T2, 5) + ' K');
        }
      },
      {
        id: 'halfLife',
        label: 'tool_half_life',
        render: () => `
          <p class="tool-hint">${t('tool_half_life_hint')}</p>
          ${field('hlN0', 'tool_initial_amount', 'N0', 'number')}
          ${field('hlN', 'tool_remaining_amount', 'N', 'number')}
          ${field('hlHalfLife', 'tool_half_life_value', 'half-life', 'number')}
          ${field('hlTime', 'tool_time_elapsed', 'time', 'number')}
        `,
        calc: (out) => {
          let N0 = num('hlN0'), N = num('hlN'), hl = num('hlHalfLife'), time = num('hlTime');
          const filled = [N0, N, hl, time].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (time === null) time = hl * (Math.log(N0 / N) / Math.log(2));
          else if (N === null) N = N0 * Math.pow(0.5, time / hl);
          else if (N0 === null) N0 = N / Math.pow(0.5, time / hl);
          else if (hl === null) hl = time / (Math.log(N0 / N) / Math.log(2));
          out.innerHTML =
            resultCell(t('tool_initial_amount'), round(N0, 5)) +
            resultCell(t('tool_remaining_amount'), round(N, 5)) +
            resultCell(t('tool_half_life_value'), round(hl, 5)) +
            resultCell(t('tool_time_elapsed'), round(time, 5));
        }
      },
      {
        id: 'combinedGasLaw',
        label: 'tool_combined_gas_law',
        render: () => `
          <p class="tool-hint">${t('tool_combined_gas_hint')}</p>
          ${field('cglP1', 'tool_p1', 'P1', 'number')}
          ${field('cglV1', 'tool_v1', 'V1', 'number')}
          ${field('cglT1', 'tool_t1', 'T1 (K)', 'number')}
          ${field('cglP2', 'tool_p2', 'P2', 'number')}
          ${field('cglV2', 'tool_v2', 'V2', 'number')}
          ${field('cglT2', 'tool_t2', 'T2 (K)', 'number')}
        `,
        calc: (out) => {
          let P1 = num('cglP1'), V1 = num('cglV1'), T1 = num('cglT1'),
              P2 = num('cglP2'), V2 = num('cglV2'), T2 = num('cglT2');
          const filled = [P1, V1, T1, P2, V2, T2].filter(x => x !== null).length;
          if (filled !== 5) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (P1 === null) P1 = (P2 * V2 * T1) / (V1 * T2);
          else if (V1 === null) V1 = (P2 * V2 * T1) / (P1 * T2);
          else if (T1 === null) T1 = (P1 * V1 * T2) / (P2 * V2);
          else if (P2 === null) P2 = (P1 * V1 * T2) / (V2 * T1);
          else if (V2 === null) V2 = (P1 * V1 * T2) / (P2 * T1);
          else if (T2 === null) T2 = (P2 * V2 * T1) / (P1 * V1);
          out.innerHTML =
            resultCell('P1', round(P1, 5)) + resultCell('V1', round(V1, 5)) + resultCell('T1', round(T1, 5) + ' K') +
            resultCell('P2', round(P2, 5)) + resultCell('V2', round(V2, 5)) + resultCell('T2', round(T2, 5) + ' K');
        }
      },
      {
        id: 'percentYield',
        label: 'tool_percent_yield',
        render: () => `
          <p class="tool-hint">${t('tool_percent_yield_hint')}</p>
          ${field('pyActual', 'tool_actual_yield', '', 'number')}
          ${field('pyTheoretical', 'tool_theoretical_yield', '', 'number')}
        `,
        calc: (out) => {
          const actual = num('pyActual'), theoretical = num('pyTheoretical');
          if (actual === null || theoretical === null || theoretical === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_percent_yield_result'), round((actual / theoretical) * 100, 2) + '%');
        }
      },
      {
        id: 'specificHeat',
        label: 'tool_specific_heat',
        render: () => `
          <p class="tool-hint">${t('tool_specific_heat_hint')}</p>
          ${field('shQ', 'tool_heat_q', 'J', 'number')}
          ${field('shMass', 'tool_mass_g', 'g', 'number')}
          ${field('shC', 'tool_specific_heat_c', 'J/g°C', 'number')}
          ${field('shDeltaT', 'tool_delta_t', '°C', 'number')}
        `,
        calc: (out) => {
          let q = num('shQ'), m = num('shMass'), c = num('shC'), dT = num('shDeltaT');
          const filled = [q, m, c, dT].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (q === null) q = m * c * dT;
          else if (m === null) m = q / (c * dT);
          else if (c === null) c = q / (m * dT);
          else if (dT === null) dT = q / (m * c);
          out.innerHTML =
            resultCell(t('tool_heat_q'), round(q, 4) + ' J') +
            resultCell(t('tool_mass_g'), round(m, 4) + ' g') +
            resultCell(t('tool_specific_heat_c'), round(c, 5) + ' J/g°C') +
            resultCell(t('tool_delta_t'), round(dT, 4) + ' °C');
        }
      },
      {
        id: 'avogadro',
        label: 'tool_avogadro',
        render: () => `
          <p class="tool-hint">${t('tool_avogadro_hint')}</p>
          ${field('avMoles', 'tool_moles', 'mol', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('avParticles', 'tool_particles', '', 'number')}
        `,
        calc: (out) => {
          const NA = 6.022e23;
          let moles = num('avMoles'), particles = num('avParticles');
          if (moles === null && particles === null) { out.innerHTML = errorBox(t('tool_err_avogadro')); return; }
          if (particles === null) particles = moles * NA;
          else if (moles === null) moles = particles / NA;
          out.innerHTML =
            resultCell(t('tool_moles'), moles.toExponential(4)) +
            resultCell(t('tool_particles'), particles.toExponential(4));
        }
      },
      {
        id: 'molality',
        label: 'tool_molality',
        render: () => `
          <p class="tool-hint">${t('tool_molality_hint')}</p>
          ${field('molFormula', 'tool_formula_label', 'e.g. NaCl')}
          ${field('molSoluteMass', 'tool_mass_g', 'g', 'number')}
          ${field('molSolventKg', 'tool_solvent_kg', 'kg', 'number')}
        `,
        calc: (out) => {
          const formula = str('molFormula'), soluteMass = num('molSoluteMass'), solventKg = num('molSolventKg');
          if (!formula || soluteMass === null || solventKg === null || solventKg === 0) { out.innerHTML = errorBox(t('tool_err_molality')); return; }
          let molarMass;
          try { ({ mass: molarMass } = molarMassOf(formula)); }
          catch (e) { out.innerHTML = errorBox(t('tool_err_element')); return; }
          const moles = soluteMass / molarMass;
          out.innerHTML = resultCell(t('tool_molality_result'), round(moles / solventKg, 5));
        }
      },
      {
        id: 'titration',
        label: 'tool_titration',
        render: () => `
          <p class="tool-hint">${t('tool_titration_hint')}</p>
          ${field('titMa', 'tool_acid_molarity', 'mol/L', 'number')}
          ${field('titVa', 'tool_acid_volume', 'L', 'number')}
          ${field('titNa', 'tool_acid_valence', 'default 1', 'number')}
          ${field('titMb', 'tool_base_molarity', 'mol/L', 'number')}
          ${field('titVb', 'tool_base_volume', 'L', 'number')}
          ${field('titNb', 'tool_base_valence', 'default 1', 'number')}
        `,
        calc: (out) => {
          let Ma = num('titMa'), Va = num('titVa'), Mb = num('titMb'), Vb = num('titVb');
          const na = num('titNa') || 1, nb = num('titNb') || 1;
          const filled = [Ma, Va, Mb, Vb].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_titration')); return; }
          if (Ma === null) Ma = (Mb * Vb * nb) / (Va * na);
          else if (Va === null) Va = (Mb * Vb * nb) / (Ma * na);
          else if (Mb === null) Mb = (Ma * Va * na) / (Vb * nb);
          else if (Vb === null) Vb = (Ma * Va * na) / (Mb * nb);
          out.innerHTML =
            resultCell(t('tool_acid_molarity'), round(Ma, 5)) +
            resultCell(t('tool_acid_volume'), round(Va, 5)) +
            resultCell(t('tool_base_molarity'), round(Mb, 5)) +
            resultCell(t('tool_base_volume'), round(Vb, 5));
        }
      },
      {
        id: 'freezingPointDepression',
        label: 'tool_freezing_point_depression',
        render: () => `
          <p class="tool-hint">${t('tool_fpd_hint')}</p>
          ${field('fpdI', 'tool_vant_hoff_factor', 'default 1', 'number')}
          ${field('fpdKf', 'tool_kf_constant', '°C·kg/mol', 'number')}
          ${field('fpdM', 'tool_molality_value', 'mol/kg', 'number')}
          ${field('fpdT0', 'tool_original_temp', '°C', 'number')}
        `,
        calc: (out) => {
          const i = num('fpdI') || 1, Kf = num('fpdKf'), m = num('fpdM'), T0 = num('fpdT0');
          if (Kf === null || m === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const deltaTf = i * Kf * m;
          let html = resultCell(t('tool_delta_tf'), round(deltaTf, 4) + ' °C');
          if (T0 !== null) html += resultCell(t('tool_new_freezing_point'), round(T0 - deltaTf, 4) + ' °C');
          out.innerHTML = html;
        }
      },
      {
        id: 'boilingPointElevation',
        label: 'tool_boiling_point_elevation',
        render: () => `
          <p class="tool-hint">${t('tool_bpe_hint')}</p>
          ${field('bpeI', 'tool_vant_hoff_factor', 'default 1', 'number')}
          ${field('bpeKb', 'tool_kb_constant', '°C·kg/mol', 'number')}
          ${field('bpeM', 'tool_molality_value', 'mol/kg', 'number')}
          ${field('bpeT0', 'tool_original_bp', '°C', 'number')}
        `,
        calc: (out) => {
          const i = num('bpeI') || 1, Kb = num('bpeKb'), m = num('bpeM'), T0 = num('bpeT0');
          if (Kb === null || m === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const deltaTb = i * Kb * m;
          let html = resultCell(t('tool_delta_tb'), round(deltaTb, 4) + ' °C');
          if (T0 !== null) html += resultCell(t('tool_new_boiling_point'), round(T0 + deltaTb, 4) + ' °C');
          out.innerHTML = html;
        }
      },
      {
        id: 'arrhenius',
        label: 'tool_arrhenius',
        render: () => `
          <p class="tool-hint">${t('tool_arrhenius_hint')}</p>
          ${field('arrK', 'tool_rate_constant_k', '1/s', 'number')}
          ${field('arrA', 'tool_pre_exponential_a', '', 'number')}
          ${field('arrEa', 'tool_activation_energy', 'J/mol', 'number')}
          ${field('arrT', 'tool_temp_kelvin', 'K', 'number')}
        `,
        calc: (out) => {
          const R = 8.314;
          let k = num('arrK'), A = num('arrA'), Ea = num('arrEa'), T = num('arrT');
          const filled = [k, A, Ea, T].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_arrhenius')); return; }
          try {
            if (k === null) k = A * Math.exp(-Ea / (R * T));
            else if (A === null) A = k * Math.exp(Ea / (R * T));
            else if (Ea === null) Ea = -R * T * Math.log(k / A);
            else if (T === null) T = -Ea / (R * Math.log(k / A));
            if (!isFinite(k) || !isFinite(A) || !isFinite(Ea) || !isFinite(T)) throw new Error('domain');
          } catch (e) { out.innerHTML = errorBox(t('tool_err_arrhenius')); return; }
          out.innerHTML =
            resultCell(t('tool_rate_constant_k'), k.toExponential(4)) +
            resultCell(t('tool_pre_exponential_a'), A.toExponential(4)) +
            resultCell(t('tool_activation_energy'), round(Ea, 2) + ' J/mol') +
            resultCell(t('tool_temp_kelvin'), round(T, 3) + ' K');
        }
      },
      {
        id: 'bufferPH',
        label: 'tool_buffer_ph',
        render: () => `
          <p class="tool-hint">${t('tool_buffer_ph_hint')}</p>
          ${field('bphPka', 'tool_pka', '', 'number')}
          ${field('bphConcA', 'tool_conjugate_base_conc', 'mol/L', 'number')}
          ${field('bphConcHA', 'tool_weak_acid_conc', 'mol/L', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('bphPh', 'tool_ph_value', '', 'number')}
        `,
        calc: (out) => {
          const pKa = num('bphPka'), concA = num('bphConcA'), concHA = num('bphConcHA'), ph = num('bphPh');
          if (pKa === null) { out.innerHTML = errorBox(t('tool_err_buffer')); return; }
          if (concA !== null && concHA !== null && concHA !== 0) {
            const pH = pKa + Math.log10(concA / concHA);
            out.innerHTML = resultCell(t('tool_ph_value'), round(pH, 3));
          } else if (ph !== null) {
            const ratio = Math.pow(10, ph - pKa);
            out.innerHTML = resultCell(t('tool_ratio_result'), round(ratio, 4));
          } else {
            out.innerHTML = errorBox(t('tool_err_buffer'));
          }
        }
      },
      {
        id: 'limitingReagent',
        label: 'tool_limiting_reagent',
        render: () => `
          <p class="tool-hint">${t('tool_limiting_reagent_hint')}</p>
          <div class="tool-vector-row">
            ${field('lrMolA', 'tool_moles_reactant_a', 'mol', 'number')}
            ${field('lrCoeffA', 'tool_coefficient_a', 'default 1', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('lrMolB', 'tool_moles_reactant_b', 'mol', 'number')}
            ${field('lrCoeffB', 'tool_coefficient_b', 'default 1', 'number')}
          </div>
        `,
        calc: (out) => {
          const molA = num('lrMolA'), molB = num('lrMolB');
          const coeffA = num('lrCoeffA') || 1, coeffB = num('lrCoeffB') || 1;
          if (molA === null || molB === null || coeffA <= 0 || coeffB <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const ratioA = molA / coeffA, ratioB = molB / coeffB;
          let html;
          if (ratioA < ratioB) {
            const excess = molB - ratioA * coeffB;
            html = resultCell(t('tool_limiting_reagent_result'), 'A') + resultCell(t('tool_excess_amount'), round(excess, 5) + ' mol (B)');
          } else if (ratioB < ratioA) {
            const excess = molA - ratioB * coeffA;
            html = resultCell(t('tool_limiting_reagent_result'), 'B') + resultCell(t('tool_excess_amount'), round(excess, 5) + ' mol (A)');
          } else {
            html = resultCell(t('tool_limiting_reagent_result'), t('tool_no_excess')) + resultCell(t('tool_excess_amount'), '0');
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'normality',
        label: 'tool_normality',
        render: () => `
          <p class="tool-hint">${t('tool_normality_hint')}</p>
          ${field('normN', 'tool_normality_value', 'N', 'number')}
          ${field('normM', 'tool_molarity', 'mol/L', 'number')}
          ${field('normFactor', 'tool_n_factor', 'e.g. 1, 2, 3', 'number')}
        `,
        calc: (out) => {
          let N = num('normN'), M = num('normM'), n = num('normFactor');
          const filled = [N, M, n].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (N === null) N = M * n;
          else if (M === null) M = N / n;
          else if (n === null) n = N / M;
          out.innerHTML =
            resultCell(t('tool_normality_value'), round(N, 5)) +
            resultCell(t('tool_molarity'), round(M, 5)) +
            resultCell(t('tool_n_factor'), round(n, 4));
        }
      },
      {
        id: 'equilibriumConstant',
        label: 'tool_equilibrium_constant',
        render: () => `
          <p class="tool-hint">${t('tool_equilibrium_hint')}</p>
          <div class="tool-vector-row">
            ${field('eqConcA', 'tool_conc_a', 'mol/L', 'number')}
            ${field('eqCoeffA', 'tool_coefficient_a', 'default 1', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('eqConcB', 'tool_conc_b', 'optional', 'number')}
            ${field('eqCoeffB', 'tool_coefficient_b', 'default 1', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('eqConcC', 'tool_conc_c', 'mol/L', 'number')}
            ${field('eqCoeffC', 'tool_coefficient_c', 'default 1', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('eqConcD', 'tool_conc_d', 'optional', 'number')}
            ${field('eqCoeffD', 'tool_coefficient_d', 'default 1', 'number')}
          </div>
        `,
        calc: (out) => {
          const concA = num('eqConcA'), concB = num('eqConcB'), concC = num('eqConcC'), concD = num('eqConcD');
          const coeffA = num('eqCoeffA') || 1, coeffB = num('eqCoeffB') || 1, coeffC = num('eqCoeffC') || 1, coeffD = num('eqCoeffD') || 1;
          if (concA === null || concC === null || concA <= 0 || concC <= 0) { out.innerHTML = errorBox(t('tool_err_equilibrium')); return; }
          const numerator = Math.pow(concC, coeffC) * (concD !== null ? Math.pow(concD, coeffD) : 1);
          const denominator = Math.pow(concA, coeffA) * (concB !== null ? Math.pow(concB, coeffB) : 1);
          const Kc = numerator / denominator;
          out.innerHTML = resultCell(t('tool_equilibrium_constant_result'), Kc.toExponential(4));
        }
      },
      {
        id: 'grahamsLaw',
        label: 'tool_grahams_law',
        render: () => `
          <p class="tool-hint">${t('tool_grahams_hint')}</p>
          ${field('glRate1', 'tool_rate1', '', 'number')}
          ${field('glRate2', 'tool_rate2', '', 'number')}
          ${field('glM1', 'tool_molar_mass1', 'g/mol', 'number')}
          ${field('glM2', 'tool_molar_mass2', 'g/mol', 'number')}
        `,
        calc: (out) => {
          let r1 = num('glRate1'), r2 = num('glRate2'), M1 = num('glM1'), M2 = num('glM2');
          const filled = [r1, r2, M1, M2].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (r1 === null) r1 = r2 * Math.sqrt(M2 / M1);
          else if (r2 === null) r2 = r1 * Math.sqrt(M1 / M2);
          else if (M1 === null) M1 = M2 * Math.pow(r2 / r1, 2);
          else if (M2 === null) M2 = M1 * Math.pow(r1 / r2, 2);
          out.innerHTML =
            resultCell(t('tool_rate1'), round(r1, 5)) +
            resultCell(t('tool_rate2'), round(r2, 5)) +
            resultCell(t('tool_molar_mass1'), round(M1, 4) + ' g/mol') +
            resultCell(t('tool_molar_mass2'), round(M2, 4) + ' g/mol');
        }
      },
      {
        id: 'osmoticPressure',
        label: 'tool_osmotic_pressure',
        render: () => `
          <p class="tool-hint">${t('tool_osmotic_hint')}</p>
          ${field('osPi', 'tool_osmotic_pressure_value', 'atm', 'number')}
          ${field('osI', 'tool_vant_hoff_factor', 'default 1', 'number')}
          ${field('osM', 'tool_molarity', 'mol/L', 'number')}
          ${field('osT', 'tool_temp_k', 'K', 'number')}
        `,
        calc: (out) => {
          const R = 0.0821;
          const i = num('osI') || 1;
          let pi = num('osPi'), M = num('osM'), T = num('osT');
          const filled = [pi, M, T].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (pi === null) pi = i * M * R * T;
          else if (M === null) M = pi / (i * R * T);
          else if (T === null) T = pi / (i * R * M);
          out.innerHTML =
            resultCell(t('tool_osmotic_pressure_value'), round(pi, 5) + ' atm') +
            resultCell(t('tool_molarity'), round(M, 5) + ' mol/L') +
            resultCell(t('tool_temp_k'), round(T, 3) + ' K');
        }
      },
      {
        id: 'solubilityProduct',
        label: 'tool_solubility_product',
        render: () => `
          <p class="tool-hint">${t('tool_ksp_hint')}</p>
          ${selectField('kspType', 'tool_salt_type', [
            { value: 'AB', label: t('tool_salt_type_ab') },
            { value: 'AB2', label: t('tool_salt_type_ab2') },
            { value: 'AB3', label: t('tool_salt_type_ab3') }
          ])}
          ${field('kspS', 'tool_molar_solubility', 'mol/L', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('kspKsp', 'tool_ksp_value', '', 'number')}
        `,
        calc: (out) => {
          const type = str('kspType');
          let s = num('kspS'), Ksp = num('kspKsp');
          if (s === null && Ksp === null) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
          if (s !== null) {
            if (type === 'AB') Ksp = s * s;
            else if (type === 'AB2') Ksp = 4 * Math.pow(s, 3);
            else Ksp = 27 * Math.pow(s, 4);
          } else {
            if (type === 'AB') s = Math.sqrt(Ksp);
            else if (type === 'AB2') s = Math.cbrt(Ksp / 4);
            else s = Math.pow(Ksp / 27, 0.25);
          }
          out.innerHTML =
            resultCell(t('tool_molar_solubility'), s.toExponential(4) + ' mol/L') +
            resultCell(t('tool_ksp_value'), Ksp.toExponential(4));
        }
      },
      {
        id: 'electrolysisFaraday',
        label: 'tool_electrolysis',
        render: () => `
          <p class="tool-hint">${t('tool_electrolysis_hint')}</p>
          ${field('elI', 'tool_current', 'A', 'number')}
          ${field('elT', 'tool_time_s', 's', 'number')}
          ${field('elMolarMass', 'tool_molar_mass_val', 'g/mol', 'number')}
          ${field('elN', 'tool_n_factor', 'valence', 'number')}
          ${field('elMass', 'tool_mass_deposited', 'g', 'number')}
        `,
        calc: (out) => {
          const F = 96500;
          const M = num('elMolarMass'), n = num('elN');
          let I = num('elI'), time = num('elT'), mass = num('elMass');
          if (M === null || n === null || n === 0) { out.innerHTML = errorBox(t('tool_err_electrolysis')); return; }
          const filled = [I, time, mass].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (mass === null) mass = (I * time * M) / (n * F);
          else if (I === null) I = (mass * n * F) / (time * M);
          else if (time === null) time = (mass * n * F) / (I * M);
          out.innerHTML =
            resultCell(t('tool_current'), round(I, 5) + ' A') +
            resultCell(t('tool_time_s'), round(time, 3) + ' s') +
            resultCell(t('tool_mass_deposited'), round(mass, 5) + ' g');
        }
      },
      {
        id: 'nernstEquation',
        label: 'tool_nernst',
        render: () => `
          <p class="tool-hint">${t('tool_nernst_hint')}</p>
          ${field('nsEStd', 'tool_standard_potential', 'V', 'number')}
          ${field('nsN', 'tool_electrons_transferred', 'n', 'number')}
          ${field('nsQ', 'tool_reaction_quotient', 'Q', 'number')}
          ${field('nsECell', 'tool_cell_potential', 'V', 'number')}
        `,
        calc: (out) => {
          const n = num('nsN'), Q = num('nsQ');
          let eStd = num('nsEStd'), eCell = num('nsECell');
          if (n === null || Q === null || Q <= 0 || n === 0) { out.innerHTML = errorBox(t('tool_err_nernst')); return; }
          if (eStd === null && eCell === null) { out.innerHTML = errorBox(t('tool_err_nernst')); return; }
          if (eCell === null) eCell = eStd - (0.0592 / n) * Math.log10(Q);
          else if (eStd === null) eStd = eCell + (0.0592 / n) * Math.log10(Q);
          out.innerHTML =
            resultCell(t('tool_standard_potential'), round(eStd, 5) + ' V') +
            resultCell(t('tool_cell_potential'), round(eCell, 5) + ' V');
        }
      },
      {
        id: 'pKaPkb',
        label: 'tool_pka_pkb',
        render: () => `
          <p class="tool-hint">${t('tool_pka_pkb_hint')}</p>
          ${field('pkKa', 'tool_ka_value', '', 'number')}
          ${field('pkPka', 'tool_pka', '', 'number')}
          ${field('pkKb', 'tool_kb_value', '', 'number')}
          ${field('pkPkb', 'tool_pkb', '', 'number')}
        `,
        calc: (out) => {
          const Ka = num('pkKa'), pKa0 = num('pkPka'), Kb = num('pkKb'), pKb0 = num('pkPkb');
          const filled = [Ka, pKa0, Kb, pKb0].filter(x => x !== null).length;
          if (filled !== 1) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
          let pKa, pKb, ka, kb;
          if (Ka !== null) { pKa = -Math.log10(Ka); pKb = 14 - pKa; kb = Math.pow(10, -pKb); ka = Ka; }
          else if (pKa0 !== null) { pKa = pKa0; ka = Math.pow(10, -pKa); pKb = 14 - pKa; kb = Math.pow(10, -pKb); }
          else if (Kb !== null) { pKb = -Math.log10(Kb); pKa = 14 - pKb; ka = Math.pow(10, -pKa); kb = Kb; }
          else { pKb = pKb0; kb = Math.pow(10, -pKb); pKa = 14 - pKb; ka = Math.pow(10, -pKa); }
          out.innerHTML =
            resultCell(t('tool_ka_value'), ka.toExponential(4)) +
            resultCell(t('tool_pka'), round(pKa, 4)) +
            resultCell(t('tool_kb_value'), kb.toExponential(4)) +
            resultCell(t('tool_pkb'), round(pKb, 4));
        }
      },
      {
        id: 'radioactiveActivity',
        label: 'tool_radioactive_activity',
        render: () => `
          <p class="tool-hint">${t('tool_radioactive_activity_hint')}</p>
          ${field('raHalfLife', 'tool_half_life_value', '', 'number')}
          ${field('raN', 'tool_num_atoms', 'mol or atoms', 'number')}
          ${field('raActivity', 'tool_activity_value', 'decays/s', 'number')}
        `,
        calc: (out) => {
          let hl = num('raHalfLife'), N = num('raN'), A = num('raActivity');
          const filled = [hl, N, A].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          let lambda;
          if (hl === null) { lambda = A / N; hl = Math.log(2) / lambda; }
          else if (N === null) { lambda = Math.log(2) / hl; N = A / lambda; }
          else { lambda = Math.log(2) / hl; A = lambda * N; }
          out.innerHTML =
            resultCell(t('tool_half_life_value'), round(hl, 5)) +
            resultCell(t('tool_num_atoms'), N.toExponential(4)) +
            resultCell(t('tool_activity_value'), A.toExponential(4)) +
            resultCell(t('tool_decay_constant'), lambda.toExponential(4));
        }
      },
      {
        id: 'molarVolumeSTP',
        label: 'tool_molar_volume_stp',
        render: () => `
          <p class="tool-hint">${t('tool_molar_volume_stp_hint')}</p>
          ${field('mvsN', 'tool_moles', 'mol', 'number')}
          ${field('mvsV', 'tool_volume_l', 'L', 'number')}
        `,
        calc: (out) => {
          let n = num('mvsN'), V = num('mvsV');
          if (n === null && V === null) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
          if (n === null) n = V / 22.4;
          else if (V === null) V = n * 22.4;
          out.innerHTML =
            resultCell(t('tool_moles'), round(n, 5) + ' mol') +
            resultCell(t('tool_volume_l'), round(V, 5) + ' L');
        }
      },
      {
        id: 'massPercentToMolarity',
        label: 'tool_mass_percent_to_molarity',
        render: () => `
          <p class="tool-hint">${t('tool_mass_percent_hint')}</p>
          ${field('mp2mDensity', 'tool_solution_density', 'g/mL', 'number')}
          ${field('mp2mPercent', 'tool_mass_percent_val', '%', 'number')}
          ${field('mp2mMolarMass', 'tool_molar_mass_val', 'g/mol', 'number')}
        `,
        calc: (out) => {
          const d = num('mp2mDensity'), p = num('mp2mPercent'), MM = num('mp2mMolarMass');
          if (d === null || p === null || MM === null || MM === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const M = (10 * d * p) / MM;
          out.innerHTML = resultCell(t('tool_molarity'), round(M, 5) + ' mol/L');
        }
      },
      {
        id: 'degreeOfUnsaturation',
        label: 'tool_degree_of_unsaturation',
        render: () => `
          <p class="tool-hint">${t('tool_dou_hint')}</p>
          ${field('douC', 'tool_carbon_count', 'C', 'number')}
          ${field('douH', 'tool_hydrogen_count', 'H', 'number')}
          ${field('douN', 'tool_nitrogen_count', 'N, default 0', 'number')}
          ${field('douX', 'tool_halogen_count', 'halogens, default 0', 'number')}
        `,
        calc: (out) => {
          const C = num('douC'), H = num('douH');
          const N = num('douN') || 0, X = num('douX') || 0;
          if (C === null || H === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const dou = (2 * C + 2 + N - H - X) / 2;
          out.innerHTML = resultCell(t('tool_dou_result'), round(dou, 2));
        }
      },
      {
        id: 'henrysLaw',
        label: 'tool_henrys_law',
        render: () => `
          <p class="tool-hint">${t('tool_henrys_hint')}</p>
          ${field('hlawC', 'tool_gas_concentration', 'mol/L', 'number')}
          ${field('hlawK', 'tool_henry_constant', 'mol/L·atm', 'number')}
          ${field('hlawP', 'tool_gas_pressure', 'atm', 'number')}
        `,
        calc: (out) => {
          let C = num('hlawC'), kH = num('hlawK'), P = num('hlawP');
          const filled = [C, kH, P].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (C === null) C = kH * P;
          else if (kH === null) kH = C / P;
          else if (P === null) P = C / kH;
          out.innerHTML =
            resultCell(t('tool_gas_concentration'), round(C, 6) + ' mol/L') +
            resultCell(t('tool_henry_constant'), round(kH, 6)) +
            resultCell(t('tool_gas_pressure'), round(P, 5) + ' atm');
        }
      },
      {
        id: 'empiricalToMolecular',
        label: 'tool_empirical_to_molecular',
        render: () => `
          <p class="tool-hint">${t('tool_e2m_hint')}</p>
          ${field('e2mFormula', 'tool_empirical_formula_label', 'e.g. CH2O')}
          ${field('e2mMolarMass', 'tool_actual_molar_mass', 'g/mol', 'number')}
        `,
        calc: (out) => {
          const formula = str('e2mFormula'), targetMass = num('e2mMolarMass');
          if (!formula || targetMass === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          let empMass, counts;
          try { ({ mass: empMass, counts } = molarMassOf(formula)); }
          catch (e) { out.innerHTML = errorBox(t('tool_err_element')); return; }
          const n = Math.round(targetMass / empMass);
          if (n < 1) { out.innerHTML = errorBox(t('tool_err_e2m')); return; }
          const molecularFormula = Object.keys(counts).map(el => el + (counts[el] * n === 1 ? '' : counts[el] * n)).join('');
          out.innerHTML =
            resultCell(t('tool_multiplier_n'), n) +
            resultCell(t('tool_molecular_formula_result'), molecularFormula);
        }
      },
      {
        id: 'ppmConcentration',
        label: 'tool_ppm_concentration',
        render: () => `
          <p class="tool-hint">${t('tool_ppm_hint')}</p>
          ${field('ppmMassSolute', 'tool_mass_solute_mg', 'mg', 'number')}
          ${field('ppmMassSolution', 'tool_mass_solution_kg', 'kg (or L for dilute aqueous)', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('ppmValue', 'tool_ppm_value', 'ppm', 'number')}
        `,
        calc: (out) => {
          const mSolute = num('ppmMassSolute'), mSolution = num('ppmMassSolution');
          const ppmIn = num('ppmValue');
          if (mSolute !== null && mSolution !== null) {
            if (mSolution === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
            const ppm = mSolute / mSolution;
            out.innerHTML =
              resultCell('ppm', round(ppm, 4)) +
              resultCell('ppb', round(ppm * 1000, 4));
          } else if (ppmIn !== null && mSolution !== null) {
            const mass = ppmIn * mSolution;
            out.innerHTML = resultCell(t('tool_mass_solute_mg'), round(mass, 5) + ' mg');
          } else {
            out.innerHTML = errorBox(t('tool_err_2fields'));
          }
        }
      },
      {
        id: 'electronConfiguration',
        label: 'tool_electron_configuration',
        render: () => `
          <p class="tool-hint">${t('tool_electron_config_hint')}</p>
          ${field('ecZ', 'tool_atomic_number', '1 - 118', 'number')}
        `,
        calc: (out) => {
          const z = num('ecZ');
          if (z === null || z < 1 || z > 118 || !Number.isInteger(z)) { out.innerHTML = errorBox(t('tool_err_atomic_number')); return; }
          const order = ['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p','6s','4f','5d','6p','7s','5f','6d','7p'];
          const capacity = { s: 2, p: 6, d: 10, f: 14 };
          let remaining = z, config = [];
          for (const orb of order) {
            if (remaining <= 0) break;
            const cap = capacity[orb.slice(-1)];
            const electrons = Math.min(cap, remaining);
            config.push(orb + electrons.toString().split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join(''));
            remaining -= electrons;
          }
          out.innerHTML = resultCell(t('tool_electron_configuration'), config.join(' '));
        }
      },
      {
        id: 'percentIonization',
        label: 'tool_percent_ionization',
        render: () => `
          <p class="tool-hint">${t('tool_percent_ionization_hint')}</p>
          ${field('piHConc', 'tool_h_conc', '[H+] mol/L', 'number')}
          ${field('piInitial', 'tool_initial_concentration', 'C0 mol/L', 'number')}
        `,
        calc: (out) => {
          const h = num('piHConc'), c0 = num('piInitial');
          if (h === null || c0 === null || c0 === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const pct = (h / c0) * 100;
          out.innerHTML = resultCell(t('tool_percent_ionization'), round(pct, 3) + '%');
        }
      },
      {
        id: 'vaporPressureLowering',
        label: 'tool_vapor_pressure_lowering',
        render: () => `
          <p class="tool-hint">${t('tool_vapor_pressure_hint')}</p>
          ${field('vplPure', 'tool_pure_vapor_pressure', 'P° (any unit)', 'number')}
          ${field('vplMoleFracSolute', 'tool_mole_fraction_solute', '0 - 1', 'number')}
        `,
        calc: (out) => {
          const p0 = num('vplPure'), xSolute = num('vplMoleFracSolute');
          if (p0 === null || xSolute === null || xSolute < 0 || xSolute > 1) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const deltaP = xSolute * p0;
          const pSolution = p0 - deltaP;
          out.innerHTML =
            resultCell(t('tool_vapor_pressure_lowering'), round(deltaP, 5)) +
            resultCell(t('tool_solution_vapor_pressure'), round(pSolution, 5));
        }
      },
      {
        id: 'percentError',
        label: 'tool_percent_error',
        render: () => `
          <p class="tool-hint">${t('tool_percent_error_hint')}</p>
          ${field('peExperimental', 'tool_experimental_value', '', 'number')}
          ${field('peTheoretical', 'tool_theoretical_value', '', 'number')}
        `,
        calc: (out) => {
          const exp = num('peExperimental'), theo = num('peTheoretical');
          if (exp === null || theo === null || theo === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const err = Math.abs(exp - theo) / Math.abs(theo) * 100;
          out.innerHTML = resultCell(t('tool_percent_error'), round(err, 3) + '%');
        }
      },
      {
        id: 'gibbsFreeEnergy',
        label: 'tool_gibbs_free_energy',
        render: () => `
          <p class="tool-hint">${t('tool_gibbs_free_energy_hint')}</p>
          ${field('gibbsDeltaH', 'tool_delta_h', 'kJ/mol', 'number')}
          ${field('gibbsDeltaS', 'tool_delta_s', 'J/(mol·K)', 'number')}
          ${field('gibbsTemp', 'tool_temp_k', 'K', 'number')}
        `,
        calc: (out) => {
          const dH = num('gibbsDeltaH'), dS = num('gibbsDeltaS'), T = num('gibbsTemp');
          if (dH === null || dS === null || T === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const dG = dH - T * (dS / 1000);
          const spontaneous = dG < 0 ? t('tool_spontaneous') : (dG > 0 ? t('tool_nonspontaneous') : t('tool_equilibrium_state'));
          out.innerHTML = resultCell(t('tool_delta_g'), round(dG, 4) + ' kJ/mol') + resultCell(t('tool_spontaneity'), spontaneous);
        }
      },
      {
        id: 'hessLawEnthalpy',
        label: 'tool_hess_law',
        render: () => `
          <p class="tool-hint">${t('tool_hess_law_hint')}</p>
          ${field('hessH1', 'tool_step_enthalpy_1', 'kJ/mol', 'number')}
          ${field('hessH2', 'tool_step_enthalpy_2', 'kJ/mol', 'number')}
          ${field('hessH3', 'tool_step_enthalpy_3', 'kJ/mol (optional)', 'number')}
        `,
        calc: (out) => {
          const h1 = num('hessH1'), h2 = num('hessH2'), h3 = num('hessH3');
          if (h1 === null || h2 === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const total = h1 + h2 + (h3 || 0);
          out.innerHTML = resultCell(t('tool_total_reaction_enthalpy'), round(total, 4) + ' kJ/mol');
        }
      },
      {
        id: 'vanDerWaalsPressure',
        label: 'tool_van_der_waals',
        render: () => `
          <p class="tool-hint">${t('tool_van_der_waals_hint')}</p>
          ${field('vdwMoles', 'tool_moles', 'mol', 'number')}
          ${field('vdwVolume', 'tool_volume_l', 'L', 'number')}
          ${field('vdwTemp', 'tool_temp_k', 'K', 'number')}
          ${field('vdwA', 'tool_vdw_a', 'L²·atm/mol²', 'number')}
          ${field('vdwB', 'tool_vdw_b', 'L/mol', 'number')}
        `,
        calc: (out) => {
          const n = num('vdwMoles'), V = num('vdwVolume'), T = num('vdwTemp'), a = num('vdwA'), b = num('vdwB');
          if ([n, V, T, a, b].some(v => v === null) || V <= n * b) { out.innerHTML = errorBox(t('tool_err_5fields')); return; }
          const R = 0.0821;
          const P = (n * R * T) / (V - n * b) - (a * n * n) / (V * V);
          out.innerHTML = resultCell(t('tool_pressure_atm'), round(P, 4) + ' atm');
        }
      },
      {
        id: 'idealGasDensity',
        label: 'tool_ideal_gas_density',
        render: () => `
          <p class="tool-hint">${t('tool_ideal_gas_density_hint')}</p>
          ${field('igdPressure', 'tool_pressure_atm_label', 'atm', 'number')}
          ${field('igdMolarMass', 'tool_molar_mass', 'g/mol', 'number')}
          ${field('igdTemp', 'tool_temp_k', 'K', 'number')}
        `,
        calc: (out) => {
          const P = num('igdPressure'), M = num('igdMolarMass'), T = num('igdTemp');
          if (P === null || M === null || T === null || T <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const R = 0.0821;
          const density = (P * M) / (R * T);
          out.innerHTML = resultCell(t('tool_gas_density'), round(density, 4) + ' g/L');
        }
      },
      {
        id: 'equivalentWeight',
        label: 'tool_equivalent_weight',
        render: () => `
          <p class="tool-hint">${t('tool_equivalent_weight_hint')}</p>
          ${field('ewMolarMass', 'tool_molar_mass', 'g/mol', 'number')}
          ${field('ewNFactor', 'tool_n_factor', 'e.g. 1, 2, 3', 'number')}
        `,
        calc: (out) => {
          const M = num('ewMolarMass'), n = num('ewNFactor');
          if (M === null || n === null || n <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_equivalent_weight'), round(M / n, 4) + ' g/eq');
        }
      },
      {
        id: 'averageReactionRate',
        label: 'tool_average_reaction_rate',
        render: () => `
          <p class="tool-hint">${t('tool_average_reaction_rate_hint')}</p>
          ${field('arrConcInitial', 'tool_conc_initial', 'mol/L', 'number')}
          ${field('arrConcFinal', 'tool_conc_final', 'mol/L', 'number')}
          ${field('arrTime', 'tool_time_interval_s', 's', 'number')}
        `,
        calc: (out) => {
          const c0 = num('arrConcInitial'), c1 = num('arrConcFinal'), dt = num('arrTime');
          if (c0 === null || c1 === null || dt === null || dt <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const rate = Math.abs(c1 - c0) / dt;
          out.innerHTML = resultCell(t('tool_average_reaction_rate_result'), rate.toExponential(4) + ' mol/(L·s)');
        }
      },
      {
        id: 'isotopicAtomicMass',
        label: 'tool_isotopic_atomic_mass',
        render: () => `
          <p class="tool-hint">${t('tool_isotopic_atomic_mass_hint')}</p>
          ${field('iamMass1', 'tool_isotope_mass_1', 'amu', 'number')}
          ${field('iamAbund1', 'tool_isotope_abundance_1', '%', 'number')}
          ${field('iamMass2', 'tool_isotope_mass_2', 'amu', 'number')}
          ${field('iamAbund2', 'tool_isotope_abundance_2', '%', 'number')}
          ${field('iamMass3', 'tool_isotope_mass_3', 'amu (optional)', 'number')}
          ${field('iamAbund3', 'tool_isotope_abundance_3', '% (optional)', 'number')}
        `,
        calc: (out) => {
          const m1 = num('iamMass1'), a1 = num('iamAbund1'), m2 = num('iamMass2'), a2 = num('iamAbund2');
          const m3 = num('iamMass3'), a3 = num('iamAbund3');
          if ([m1, a1, m2, a2].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          let totalAbund = a1 + a2, weighted = m1 * a1 + m2 * a2;
          if (m3 !== null && a3 !== null) { totalAbund += a3; weighted += m3 * a3; }
          const avg = weighted / totalAbund;
          out.innerHTML = resultCell(t('tool_average_atomic_mass'), round(avg, 4) + ' amu');
        }
      },
      {
        id: 'electronegativityBondType',
        label: 'tool_electronegativity_bond',
        render: () => `
          <p class="tool-hint">${t('tool_electronegativity_bond_hint')}</p>
          ${field('enA', 'tool_en_atom_a', 'e.g. 3.44', 'number')}
          ${field('enB', 'tool_en_atom_b', 'e.g. 2.20', 'number')}
        `,
        calc: (out) => {
          const enA = num('enA'), enB = num('enB');
          if (enA === null || enB === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const diff = Math.abs(enA - enB);
          let bondType;
          if (diff < 0.5) bondType = t('tool_bond_nonpolar');
          else if (diff < 1.7) bondType = t('tool_bond_polar');
          else bondType = t('tool_bond_ionic');
          out.innerHTML = resultCell(t('tool_en_difference'), round(diff, 2)) + resultCell(t('tool_bond_type_result'), bondType);
        }
      },
      {
        id: 'carbonDating',
        label: 'tool_carbon_dating',
        render: () => `
          <p class="tool-hint">${t('tool_carbon_dating_hint')}</p>
          ${field('cdPercent', 'tool_percent_c14_remaining', '%', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('cdAge', 'tool_sample_age_years', 'years', 'number')}
        `,
        calc: (out) => {
          const pct = num('cdPercent'), age = num('cdAge');
          const HALF_LIFE = 5730;
          if (pct === null && age === null) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
          if (pct !== null) {
            if (pct <= 0 || pct > 100) { out.innerHTML = errorBox(t('tool_err_percent_range')); return; }
            const t_years = HALF_LIFE * Math.log(100 / pct) / Math.LN2;
            out.innerHTML = resultCell(t('tool_estimated_age'), Math.round(t_years).toLocaleString() + ' ' + t('tool_years_unit'));
          } else {
            const remaining = 100 * Math.pow(0.5, age / HALF_LIFE);
            out.innerHTML = resultCell(t('tool_percent_c14_remaining'), round(remaining, 4) + '%');
          }
        }
      },
      {
        id: 'reactionQuotientQ',
        label: 'tool_reaction_quotient_kc',
        render: () => `
          <p class="tool-hint">${t('tool_reaction_quotient_hint')}</p>
          ${field('rqA', 'tool_q_conc_a', 'mol/L', 'number')}
          ${field('rqB', 'tool_q_conc_b', 'mol/L', 'number')}
          ${field('rqC', 'tool_q_conc_c', 'mol/L', 'number')}
          ${field('rqD', 'tool_q_conc_d', 'mol/L', 'number')}
          ${field('rqKc', 'tool_kc_value', '', 'number')}
        `,
        calc: (out) => {
          const A = num('rqA'), B = num('rqB'), C = num('rqC'), D = num('rqD'), Kc = num('rqKc');
          if ([A, B, C, D, Kc].some(v => v === null) || A <= 0 || B <= 0) { out.innerHTML = errorBox(t('tool_err_5fields')); return; }
          const Q = (C * D) / (A * B);
          let direction;
          if (Q < Kc) direction = t('tool_shifts_forward');
          else if (Q > Kc) direction = t('tool_shifts_reverse');
          else direction = t('tool_at_equilibrium');
          out.innerHTML = resultCell('Q', round(Q, 5)) + resultCell(t('tool_reaction_direction'), direction);
        }
      },
      {
        id: 'periodicTable',
        label: 'Periodic Table',
        render: () => `
          <p class="tool-hint">Tap any element to see its details, or search by symbol / name / atomic number.</p>
          ${field('ptSearch', 'tool_element_symbol', 'e.g. Na, Sodium, or 11')}
          <div class="periodic-grid" id="periodicGrid"></div>
          <div id="periodicDetail" class="periodic-detail-empty">Select an element above to see its details here.</div>
        `,
        calc: (out) => {
          const q = str('ptSearch').toLowerCase();
          if (!q) { out.innerHTML = ''; return; }
          const el = ELEMENTS.find(e =>
            e.symbol.toLowerCase() === q || e.name.toLowerCase() === q || String(e.z) === q
          );
          if (!el) { out.innerHTML = errorBox('Element not found. Try a symbol (Fe), name (Iron), or atomic number (26).'); return; }
          window.CalvoPeriodicTable.renderDetail(el);
          out.innerHTML = '';
        },
        afterRender: () => { window.CalvoPeriodicTable.init(); }
      }
    ],

    Physics: [
      {
        id: 'projectile',
        label: 'tool_projectile',
        render: () => `
          ${field('projV0', 'tool_initial_velocity', 'v0 (m/s)', 'number')}
          ${field('projAngle', 'tool_launch_angle', 'angle (degrees)', 'number')}
          ${field('projG', 'tool_gravity', 'g (default 9.8 m/s²)', 'number')}
        `,
        calc: (out) => {
          const v0 = num('projV0'), angleDeg = num('projAngle');
          const g = num('projG') || 9.8;
          if (v0 === null || angleDeg === null) { out.innerHTML = errorBox(t('tool_err_v0angle')); return; }
          const rad = angleDeg * Math.PI / 180;
          const range = (v0 * v0 * Math.sin(2 * rad)) / g;
          const maxHeight = (v0 * v0 * Math.sin(rad) * Math.sin(rad)) / (2 * g);
          const timeOfFlight = (2 * v0 * Math.sin(rad)) / g;
          out.innerHTML =
            resultCell(t('tool_range'), round(range, 3) + ' m') +
            resultCell(t('tool_max_height'), round(maxHeight, 3) + ' m') +
            resultCell(t('tool_time_flight'), round(timeOfFlight, 3) + ' s');
        }
      },
      {
        id: 'ohmsLaw',
        label: 'tool_ohms_law',
        render: () => `
          ${field('ohmV', 'tool_voltage', 'V (volts)', 'number')}
          ${field('ohmI', 'tool_current', 'I (amps)', 'number')}
          ${field('ohmR', 'tool_resistance', 'R (ohms)', 'number')}
          <p class="tool-hint">${t('tool_ohms_hint')}</p>
        `,
        calc: (out) => {
          let V = num('ohmV'), I = num('ohmI'), R = num('ohmR');
          const filled = [V, I, R].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (V === null) V = I * R;
          else if (I === null) I = V / R;
          else if (R === null) R = V / I;
          const P = V * I;
          out.innerHTML =
            resultCell('V', round(V, 4) + ' V') +
            resultCell('I', round(I, 4) + ' A') +
            resultCell('R', round(R, 4) + ' Ω') +
            resultCell('P', round(P, 4) + ' W');
        }
      },
      {
        id: 'kinematics',
        label: 'tool_kinematics',
        render: () => `
          <p class="tool-hint">${t('tool_kinematics_hint')}</p>
          ${field('kU', 'tool_u', 'u (m/s)', 'number')}
          ${field('kV', 'tool_v', 'v (m/s)', 'number')}
          ${field('kA', 'tool_a', 'a (m/s²)', 'number')}
          ${field('kT', 'tool_t', 't (s)', 'number')}
          ${field('kS', 'tool_s', 's (m)', 'number')}
        `,
        calc: (out) => {
          let u = num('kU'), v = num('kV'), a = num('kA'), t2 = num('kT'), s = num('kS');
          const has = (x) => x !== null;
          const filledCount = [u, v, a, t2, s].filter(has).length;
          if (filledCount < 3) { out.innerHTML = errorBox(t('tool_err_kinematics')); return; }

          if (has(u) && has(a) && has(t2) && !has(v)) v = u + a * t2;
          if (has(u) && has(a) && has(t2) && !has(s)) s = u * t2 + 0.5 * a * t2 * t2;
          if (has(u) && has(v) && has(t2) && !has(a)) a = (v - u) / t2;
          if (has(u) && has(v) && has(t2) && !has(s)) s = ((u + v) / 2) * t2;
          if (has(u) && has(v) && has(a) && a !== 0 && !has(t2)) t2 = (v - u) / a;
          if (has(u) && has(v) && has(a) && !has(s)) s = (v * v - u * u) / (2 * a);
          if (has(v) && has(a) && has(t2) && !has(u)) u = v - a * t2;
          if (has(v) && has(a) && has(t2) && !has(s)) s = v * t2 - 0.5 * a * t2 * t2;
          if (has(u) && has(a) && has(s) && !has(v)) {
            const disc = u * u + 2 * a * s;
            if (disc >= 0) v = Math.sqrt(disc);
          }
          if (has(u) && has(a) && has(s) && a !== 0 && !has(t2)) {
            const disc = u * u + 2 * a * s;
            if (disc >= 0) {
              const t1 = (-u + Math.sqrt(disc)) / a, t3 = (-u - Math.sqrt(disc)) / a;
              t2 = Math.max(t1, t3) >= 0 ? Math.max(t1, t3) : Math.min(t1, t3);
            }
          }
          if (has(u) && has(v) && has(s) && s !== 0 && !has(a)) a = (v * v - u * u) / (2 * s);
          if (has(u) && has(v) && has(s) && (u + v) !== 0 && !has(t2)) t2 = (2 * s) / (u + v);

          out.innerHTML =
            resultCell('u', has(u) ? round(u, 3) + ' m/s' : '—') +
            resultCell('v', has(v) ? round(v, 3) + ' m/s' : '—') +
            resultCell('a', has(a) ? round(a, 3) + ' m/s²' : '—') +
            resultCell('t', has(t2) ? round(t2, 3) + ' s' : '—') +
            resultCell('s', has(s) ? round(s, 3) + ' m' : '—');
        }
      },
      {
        id: 'workEnergy',
        label: 'tool_work_energy',
        render: () => `
          <p class="tool-hint">${t('tool_work_energy_hint')}</p>
          ${field('weForce', 'tool_force_n', 'N', 'number')}
          ${field('weDistance', 'tool_distance_m', 'm', 'number')}
          ${field('weTime', 'tool_time_s', 's', 'number')}
          ${field('weMass', 'tool_mass_kg', 'kg', 'number')}
          ${field('weVelocity', 'tool_velocity_ms', 'm/s', 'number')}
        `,
        calc: (out) => {
          const F = num('weForce'), d = num('weDistance'), time = num('weTime');
          const m = num('weMass'), v = num('weVelocity');
          let html = '';
          if (F !== null && d !== null) {
            const work = F * d;
            html += resultCell(t('tool_work'), round(work, 4) + ' J');
            if (time !== null && time !== 0) html += resultCell(t('tool_power'), round(work / time, 4) + ' W');
          }
          if (m !== null && v !== null) {
            html += resultCell(t('tool_kinetic_energy'), round(0.5 * m * v * v, 4) + ' J');
          }
          if (!html) { out.innerHTML = errorBox(t('tool_err_workenergy')); return; }
          out.innerHTML = html;
        }
      },
      {
        id: 'newtonSecondLaw',
        label: 'tool_newton_second_law',
        render: () => `
          <p class="tool-hint">${t('tool_newton_hint')}</p>
          ${field('nsF', 'tool_force_n', 'N', 'number')}
          ${field('nsM', 'tool_mass_kg', 'kg', 'number')}
          ${field('nsA', 'tool_acceleration', 'm/s²', 'number')}
        `,
        calc: (out) => {
          let F = num('nsF'), m = num('nsM'), a = num('nsA');
          const filled = [F, m, a].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (F === null) F = m * a;
          else if (m === null) m = F / a;
          else if (a === null) a = F / m;
          out.innerHTML =
            resultCell('F', round(F, 4) + ' N') +
            resultCell('m', round(m, 4) + ' kg') +
            resultCell('a', round(a, 4) + ' m/s²');
        }
      },
      {
        id: 'density',
        label: 'tool_density',
        render: () => `
          <p class="tool-hint">${t('tool_density_hint')}</p>
          ${field('densMass', 'tool_mass_val', 'e.g. kg or g', 'number')}
          ${field('densVolume', 'tool_volume_val', 'e.g. m³ or cm³', 'number')}
          ${field('densDensity', 'tool_density_val', '', 'number')}
        `,
        calc: (out) => {
          let m = num('densMass'), v = num('densVolume'), d = num('densDensity');
          const filled = [m, v, d].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (m === null) m = d * v;
          else if (v === null) v = m / d;
          else if (d === null) d = m / v;
          out.innerHTML =
            resultCell(t('tool_mass_val'), round(m, 5)) +
            resultCell(t('tool_volume_val'), round(v, 5)) +
            resultCell(t('tool_density_val'), round(d, 5));
        }
      },
      {
        id: 'pendulum',
        label: 'tool_pendulum',
        render: () => `
          <p class="tool-hint">${t('tool_pendulum_hint')}</p>
          ${field('pendLength', 'tool_pendulum_length', 'm', 'number')}
          ${field('pendG', 'tool_gravity', 'default 9.8', 'number')}
          ${field('pendPeriod', 'tool_pendulum_period', 's', 'number')}
        `,
        calc: (out) => {
          const g = num('pendG') || 9.8;
          let L = num('pendLength'), T = num('pendPeriod');
          if (L === null && T === null) { out.innerHTML = errorBox(t('tool_err_pendulum')); return; }
          if (T === null) T = 2 * Math.PI * Math.sqrt(L / g);
          else if (L === null) L = g * Math.pow(T / (2 * Math.PI), 2);
          out.innerHTML =
            resultCell(t('tool_pendulum_length'), round(L, 5) + ' m') +
            resultCell(t('tool_pendulum_period'), round(T, 5) + ' s');
        }
      },
      {
        id: 'waveSpeed',
        label: 'tool_wave_speed',
        render: () => `
          <p class="tool-hint">${t('tool_wave_speed_hint')}</p>
          ${field('waveV', 'tool_wave_speed_val', 'm/s', 'number')}
          ${field('waveF', 'tool_frequency', 'Hz', 'number')}
          ${field('waveL', 'tool_wavelength', 'm', 'number')}
        `,
        calc: (out) => {
          let v = num('waveV'), f = num('waveF'), lam = num('waveL');
          const filled = [v, f, lam].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (v === null) v = f * lam;
          else if (f === null) f = v / lam;
          else if (lam === null) lam = v / f;
          out.innerHTML =
            resultCell(t('tool_wave_speed_val'), round(v, 5) + ' m/s') +
            resultCell(t('tool_frequency'), round(f, 5) + ' Hz') +
            resultCell(t('tool_wavelength'), round(lam, 5) + ' m');
        }
      },
      {
        id: 'circularMotion',
        label: 'tool_circular_motion',
        render: () => `
          <p class="tool-hint">${t('tool_circular_motion_hint')}</p>
          ${field('cmVelocity', 'tool_velocity_ms', 'm/s', 'number')}
          ${field('cmRadius', 'tool_radius_m', 'm', 'number')}
          ${field('cmMass', 'tool_mass_kg', 'optional, kg', 'number')}
        `,
        calc: (out) => {
          const v = num('cmVelocity'), r = num('cmRadius'), m = num('cmMass');
          if (v === null || r === null) { out.innerHTML = errorBox(t('tool_err_circular')); return; }
          const accel = (v * v) / r;
          let html = resultCell(t('tool_centripetal_accel'), round(accel, 4) + ' m/s²');
          if (m !== null) html += resultCell(t('tool_centripetal_force'), round(m * accel, 4) + ' N');
          out.innerHTML = html;
        }
      },
      {
        id: 'lensMirror',
        label: 'tool_lens_mirror',
        render: () => `
          <p class="tool-hint">${t('tool_lens_mirror_hint')}</p>
          ${field('lmF', 'tool_focal_length', 'f', 'number')}
          ${field('lmU', 'tool_object_distance', 'u', 'number')}
          ${field('lmV', 'tool_image_distance', 'v', 'number')}
        `,
        calc: (out) => {
          let f = num('lmF'), u = num('lmU'), v = num('lmV');
          const filled = [f, u, v].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (f === null) f = (u * v) / (u + v);
          else if (u === null) u = (f * v) / (v - f);
          else if (v === null) v = (f * u) / (u - f);
          const mag = u !== 0 ? v / u : null;
          let html =
            resultCell(t('tool_focal_length'), round(f, 5)) +
            resultCell(t('tool_object_distance'), round(u, 5)) +
            resultCell(t('tool_image_distance'), round(v, 5));
          if (mag !== null) html += resultCell(t('tool_magnification'), round(mag, 4));
          out.innerHTML = html;
        }
      },
      {
        id: 'torque',
        label: 'tool_torque',
        render: () => `
          <p class="tool-hint">${t('tool_torque_hint')}</p>
          ${field('trqForce', 'tool_force_n', 'N', 'number')}
          ${field('trqLever', 'tool_lever_arm', 'm', 'number')}
          ${field('trqAngle', 'tool_angle_deg', 'default 90°', 'number')}
        `,
        calc: (out) => {
          const F = num('trqForce'), r = num('trqLever');
          const angle = num('trqAngle') === null ? 90 : num('trqAngle');
          if (F === null || r === null) { out.innerHTML = errorBox(t('tool_err_torque')); return; }
          const torque = F * r * Math.sin(angle * Math.PI / 180);
          out.innerHTML = resultCell(t('tool_torque_result'), round(torque, 4));
        }
      },
      {
        id: 'seriesParallel',
        label: 'tool_series_parallel',
        render: () => `
          <p class="tool-hint">${t('tool_series_parallel_hint')}</p>
          ${field('srResistors', 'tool_resistor_values', 'e.g. 10, 20, 30')}
          ${selectField('srMode', 'tool_resistance_mode', [
            { value: 'series', label: t('tool_series') },
            { value: 'parallel', label: t('tool_parallel') }
          ])}
        `,
        calc: (out) => {
          const raw = str('srResistors');
          const mode = str('srMode');
          const vals = raw.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x) && x > 0);
          if (vals.length < 2) { out.innerHTML = errorBox(t('tool_err_resistors')); return; }
          let total;
          if (mode === 'parallel') total = 1 / vals.reduce((sum, r) => sum + 1 / r, 0);
          else total = vals.reduce((sum, r) => sum + r, 0);
          out.innerHTML = resultCell(t('tool_total_resistance'), round(total, 4) + ' Ω');
        }
      },
      {
        id: 'momentumImpulse',
        label: 'tool_momentum_impulse',
        render: () => `
          <p class="tool-hint">${t('tool_momentum_impulse_hint')}</p>
          ${field('miMass', 'tool_mass_kg', 'kg', 'number')}
          ${field('miVelocity', 'tool_velocity_ms', 'm/s', 'number')}
          ${field('miForce', 'tool_force_n', 'N', 'number')}
          ${field('miTime', 'tool_time_s', 's', 'number')}
        `,
        calc: (out) => {
          const m = num('miMass'), v = num('miVelocity'), F = num('miForce'), time = num('miTime');
          let html = '';
          if (m !== null && v !== null) html += resultCell(t('tool_momentum_result'), round(m * v, 4) + ' kg·m/s');
          if (F !== null && time !== null) html += resultCell(t('tool_impulse_result'), round(F * time, 4) + ' N·s');
          if (!html) { out.innerHTML = errorBox(t('tool_err_momentum')); return; }
          out.innerHTML = html;
        }
      },
      {
        id: 'snellsLaw',
        label: 'tool_snells_law',
        render: () => `
          <p class="tool-hint">${t('tool_snells_law_hint')}</p>
          ${field('slN1', 'tool_refractive_index1', 'n1', 'number')}
          ${field('slAngle1', 'tool_incidence_angle1', 'θ1 (°)', 'number')}
          ${field('slN2', 'tool_refractive_index2', 'n2', 'number')}
          ${field('slAngle2', 'tool_refraction_angle2', 'θ2 (°)', 'number')}
        `,
        calc: (out) => {
          let n1 = num('slN1'), a1 = num('slAngle1'), n2 = num('slN2'), a2 = num('slAngle2');
          const filled = [n1, a1, n2, a2].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          try {
            if (n1 === null) n1 = (n2 * Math.sin(a2 * Math.PI / 180)) / Math.sin(a1 * Math.PI / 180);
            else if (a1 === null) {
              const s = (n2 * Math.sin(a2 * Math.PI / 180)) / n1;
              if (s < -1 || s > 1) throw new Error('domain');
              a1 = Math.asin(s) * 180 / Math.PI;
            } else if (n2 === null) n2 = (n1 * Math.sin(a1 * Math.PI / 180)) / Math.sin(a2 * Math.PI / 180);
            else if (a2 === null) {
              const s = (n1 * Math.sin(a1 * Math.PI / 180)) / n2;
              if (s < -1 || s > 1) throw new Error('domain');
              a2 = Math.asin(s) * 180 / Math.PI;
            }
          } catch (e) { out.innerHTML = errorBox(t('tool_err_snell')); return; }
          out.innerHTML =
            resultCell('n1', round(n1, 5)) + resultCell('θ1', round(a1, 4) + '°') +
            resultCell('n2', round(n2, 5)) + resultCell('θ2', round(a2, 4) + '°');
        }
      },
      {
        id: 'dopplerEffect',
        label: 'tool_doppler_effect',
        render: () => `
          <p class="tool-hint">${t('tool_doppler_effect_hint')}</p>
          ${field('deFreq', 'tool_source_frequency', 'Hz', 'number')}
          ${field('deSoundSpeed', 'tool_sound_speed', '343', 'number')}
          ${field('deSourceSpeed', 'tool_source_speed', 'm/s', 'number')}
          ${field('deObserverSpeed', 'tool_observer_speed', 'm/s', 'number')}
        `,
        calc: (out) => {
          const freq = num('deFreq');
          if (freq === null) { out.innerHTML = errorBox(t('tool_err_doppler')); return; }
          const v = num('deSoundSpeed') || 343;
          const vs = num('deSourceSpeed') || 0;
          const vo = num('deObserverSpeed') || 0;
          const observed = freq * (v + vo) / (v + vs);
          out.innerHTML = resultCell(t('tool_observed_frequency'), round(observed, 3) + ' Hz');
        }
      },
      {
        id: 'capacitor',
        label: 'tool_capacitor',
        render: () => `
          <p class="tool-hint">${t('tool_capacitor_hint')}</p>
          ${field('capQ', 'tool_charge_coulomb', 'C', 'number')}
          ${field('capC', 'tool_capacitance', 'F', 'number')}
          ${field('capV', 'tool_voltage', 'V', 'number')}
        `,
        calc: (out) => {
          let Q = num('capQ'), C = num('capC'), V = num('capV');
          const filled = [Q, C, V].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (Q === null) Q = C * V;
          else if (C === null) C = Q / V;
          else if (V === null) V = Q / C;
          const energy = 0.5 * C * V * V;
          out.innerHTML =
            resultCell(t('tool_charge_coulomb'), round(Q, 6) + ' C') +
            resultCell(t('tool_capacitance'), round(C, 6) + ' F') +
            resultCell(t('tool_voltage'), round(V, 4) + ' V') +
            resultCell(t('tool_capacitor_energy'), round(energy, 6) + ' J');
        }
      },
      {
        id: 'electricPower',
        label: 'tool_electric_power',
        render: () => `
          <p class="tool-hint">${t('tool_electric_power_hint')}</p>
          ${field('epV', 'tool_voltage', 'V', 'number')}
          ${field('epI', 'tool_current', 'A', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('epP', 'tool_power', 'W', 'number')}
          ${field('epTime', 'tool_time_hours', 'hours', 'number')}
          ${field('epRate', 'tool_rate_per_kwh', '', 'number')}
        `,
        calc: (out) => {
          const V = num('epV'), I = num('epI'), time = num('epTime'), rate = num('epRate');
          let P = num('epP');
          if (P === null && V !== null && I !== null) P = V * I;
          if (P === null) { out.innerHTML = errorBox(t('tool_err_electricpower')); return; }
          let html = resultCell(t('tool_power'), round(P, 4) + ' W');
          if (time !== null) {
            const kwh = (P * time) / 1000;
            html += resultCell(t('tool_energy_kwh'), round(kwh, 5) + ' kWh');
            if (rate !== null) html += resultCell(t('tool_estimated_cost'), round(kwh * rate, 2));
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'freeFall',
        label: 'tool_free_fall',
        render: () => `
          <p class="tool-hint">${t('tool_free_fall_hint')}</p>
          ${field('ffH', 'tool_height_m', 'm', 'number')}
          ${field('ffT', 'tool_time_s', 's', 'number')}
          ${field('ffV', 'tool_final_velocity', 'm/s', 'number')}
          ${field('ffG', 'tool_gravity', 'default 9.8', 'number')}
        `,
        calc: (out) => {
          const g = num('ffG') || 9.8;
          let h = num('ffH'), time = num('ffT'), v = num('ffV');
          if (h === null && time === null && v === null) { out.innerHTML = errorBox(t('tool_err_freefall')); return; }
          if (h !== null) { time = Math.sqrt((2 * h) / g); v = g * time; }
          else if (time !== null) { h = 0.5 * g * time * time; v = g * time; }
          else if (v !== null) { time = v / g; h = (v * v) / (2 * g); }
          out.innerHTML =
            resultCell(t('tool_height_m'), round(h, 4) + ' m') +
            resultCell(t('tool_time_s'), round(time, 4) + ' s') +
            resultCell(t('tool_final_velocity'), round(v, 4) + ' m/s');
        }
      },
      {
        id: 'buoyancy',
        label: 'tool_buoyancy',
        render: () => `
          <p class="tool-hint">${t('tool_buoyancy_hint')}</p>
          ${field('buoyRho', 'tool_fluid_density', 'kg/m³', 'number')}
          ${field('buoyV', 'tool_submerged_volume', 'm³', 'number')}
          ${field('buoyG', 'tool_gravity', 'default 9.8', 'number')}
          ${field('buoyW', 'tool_object_weight', 'N', 'number')}
        `,
        calc: (out) => {
          const rho = num('buoyRho'), V = num('buoyV'), g = num('buoyG') || 9.8, W = num('buoyW');
          if (rho === null || V === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const Fb = rho * V * g;
          let html = resultCell(t('tool_buoyant_force'), round(Fb, 4) + ' N');
          if (W !== null) html += resultCell(t('tool_category'), Fb >= W ? t('tool_will_float') : t('tool_will_sink'));
          out.innerHTML = html;
        }
      },
      {
        id: 'springSHM',
        label: 'tool_spring_shm',
        render: () => `
          <p class="tool-hint">${t('tool_spring_shm_hint')}</p>
          ${field('shmK', 'tool_spring_constant', 'N/m', 'number')}
          ${field('shmX', 'tool_displacement_m', 'm', 'number')}
          ${field('shmMass', 'tool_mass_kg', 'kg, optional', 'number')}
        `,
        calc: (out) => {
          const k = num('shmK'), x = num('shmX'), m = num('shmMass');
          if (k === null || x === null) { out.innerHTML = errorBox(t('tool_err_spring')); return; }
          const F = k * Math.abs(x);
          const pe = 0.5 * k * x * x;
          let html =
            resultCell(t('tool_restoring_force'), round(F, 4) + ' N') +
            resultCell(t('tool_elastic_pe'), round(pe, 4) + ' J');
          if (m !== null && m > 0) {
            const T = 2 * Math.PI * Math.sqrt(m / k);
            html += resultCell(t('tool_shm_period'), round(T, 4) + ' s');
            html += resultCell(t('tool_shm_frequency'), round(1 / T, 4) + ' Hz');
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'gravitationLaw',
        label: 'tool_gravitation_law',
        render: () => `
          <p class="tool-hint">${t('tool_gravitation_hint')}</p>
          ${field('gravF', 'tool_force_n', 'N', 'number')}
          ${field('gravM1', 'tool_mass1_kg', 'kg', 'number')}
          ${field('gravM2', 'tool_mass2_kg', 'kg', 'number')}
          ${field('gravR', 'tool_distance_m', 'm', 'number')}
        `,
        calc: (out) => {
          const G = 6.674e-11;
          let F = num('gravF'), m1 = num('gravM1'), m2 = num('gravM2'), r = num('gravR');
          const filled = [F, m1, m2, r].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (F === null) F = (G * m1 * m2) / (r * r);
          else if (m1 === null) m1 = (F * r * r) / (G * m2);
          else if (m2 === null) m2 = (F * r * r) / (G * m1);
          else if (r === null) r = Math.sqrt((G * m1 * m2) / F);
          out.innerHTML =
            resultCell(t('tool_force_n'), F.toExponential(4) + ' N') +
            resultCell(t('tool_mass1_kg'), m1.toExponential(4) + ' kg') +
            resultCell(t('tool_mass2_kg'), m2.toExponential(4) + ' kg') +
            resultCell(t('tool_distance_m'), r.toExponential(4) + ' m');
        }
      },
      {
        id: 'coulombsLaw',
        label: 'tool_coulombs_law',
        render: () => `
          <p class="tool-hint">${t('tool_coulombs_hint')}</p>
          ${field('coulF', 'tool_force_n', 'N', 'number')}
          ${field('coulQ1', 'tool_charge1_c', 'C', 'number')}
          ${field('coulQ2', 'tool_charge2_c', 'C', 'number')}
          ${field('coulR', 'tool_distance_m', 'm', 'number')}
        `,
        calc: (out) => {
          const k = 8.99e9;
          let F = num('coulF'), q1 = num('coulQ1'), q2 = num('coulQ2'), r = num('coulR');
          const filled = [F, q1, q2, r].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (F === null) F = (k * Math.abs(q1 * q2)) / (r * r);
          else if (q1 === null) q1 = (F * r * r) / (k * q2);
          else if (q2 === null) q2 = (F * r * r) / (k * q1);
          else if (r === null) r = Math.sqrt((k * Math.abs(q1 * q2)) / F);
          out.innerHTML =
            resultCell(t('tool_force_n'), F.toExponential(4) + ' N') +
            resultCell(t('tool_charge1_c'), q1.toExponential(4) + ' C') +
            resultCell(t('tool_charge2_c'), q2.toExponential(4) + ' C') +
            resultCell(t('tool_distance_m'), r.toExponential(4) + ' m');
        }
      },
      {
        id: 'escapeVelocity',
        label: 'tool_escape_velocity',
        render: () => `
          <p class="tool-hint">${t('tool_escape_velocity_hint')}</p>
          ${field('evMass', 'tool_planet_mass_kg', 'kg', 'number')}
          ${field('evRadius', 'tool_planet_radius_m', 'm', 'number')}
        `,
        calc: (out) => {
          const G = 6.674e-11;
          const M = num('evMass'), R = num('evRadius');
          if (M === null || R === null || R === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const ve = Math.sqrt((2 * G * M) / R);
          const vo = Math.sqrt((G * M) / R);
          out.innerHTML =
            resultCell(t('tool_escape_velocity_result'), round(ve, 2) + ' m/s') +
            resultCell(t('tool_orbital_velocity_result'), round(vo, 2) + ' m/s');
        }
      },
      {
        id: 'youngsModulus',
        label: 'tool_youngs_modulus',
        render: () => `
          <p class="tool-hint">${t('tool_youngs_modulus_hint')}</p>
          ${field('ymF', 'tool_force_n', 'N', 'number')}
          ${field('ymA', 'tool_cross_section_area', 'm²', 'number')}
          ${field('ymDeltaL', 'tool_length_change', 'm', 'number')}
          ${field('ymL0', 'tool_original_length', 'm', 'number')}
        `,
        calc: (out) => {
          const F = num('ymF'), A = num('ymA'), dL = num('ymDeltaL'), L0 = num('ymL0');
          if (F === null || A === null || dL === null || L0 === null || A === 0 || dL === 0) {
            out.innerHTML = errorBox(t('tool_err_youngs')); return;
          }
          const stress = F / A;
          const strain = dL / L0;
          const Y = stress / strain;
          out.innerHTML =
            resultCell(t('tool_stress_result'), stress.toExponential(4) + ' Pa') +
            resultCell(t('tool_strain_result'), strain.toExponential(4)) +
            resultCell(t('tool_youngs_modulus_result'), Y.toExponential(4) + ' Pa');
        }
      },
      {
        id: 'transformerTurns',
        label: 'tool_transformer',
        render: () => `
          <p class="tool-hint">${t('tool_transformer_hint')}</p>
          ${field('trVp', 'tool_primary_voltage', 'V', 'number')}
          ${field('trVs', 'tool_secondary_voltage', 'V', 'number')}
          ${field('trNp', 'tool_primary_turns', '', 'number')}
          ${field('trNs', 'tool_secondary_turns', '', 'number')}
        `,
        calc: (out) => {
          let Vp = num('trVp'), Vs = num('trVs'), Np = num('trNp'), Ns = num('trNs');
          const filled = [Vp, Vs, Np, Ns].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (Vp === null) Vp = (Vs * Np) / Ns;
          else if (Vs === null) Vs = (Vp * Ns) / Np;
          else if (Np === null) Np = (Vp * Ns) / Vs;
          else if (Ns === null) Ns = (Vs * Np) / Vp;
          out.innerHTML =
            resultCell(t('tool_primary_voltage'), round(Vp, 4) + ' V') +
            resultCell(t('tool_secondary_voltage'), round(Vs, 4) + ' V') +
            resultCell(t('tool_primary_turns'), round(Np, 3)) +
            resultCell(t('tool_secondary_turns'), round(Ns, 3));
        }
      },
      {
        id: 'photoelectricEffect',
        label: 'tool_photoelectric_effect',
        render: () => `
          <p class="tool-hint">${t('tool_photoelectric_hint')}</p>
          ${field('peFreq', 'tool_frequency', 'Hz', 'number')}
          ${field('peWork', 'tool_work_function_ev', 'eV', 'number')}
        `,
        calc: (out) => {
          const h = 6.626e-34, e = 1.602e-19;
          const f = num('peFreq'), phi = num('peWork');
          if (f === null || phi === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const photonEnergyEv = (h * f) / e;
          const keMax = photonEnergyEv - phi;
          const f0 = (phi * e) / h;
          let html =
            resultCell(t('tool_kinetic_energy_max'), round(keMax, 5) + ' eV') +
            resultCell(t('tool_threshold_frequency'), f0.toExponential(4) + ' Hz');
          if (keMax < 0) html += errorBox(t('tool_no_photoemission'));
          out.innerHTML = html;
        }
      },
      {
        id: 'deBroglie',
        label: 'tool_debroglie',
        render: () => `
          <p class="tool-hint">${t('tool_debroglie_hint')}</p>
          ${field('dbMass', 'tool_mass_kg', 'kg', 'number')}
          ${field('dbVelocity', 'tool_velocity_ms', 'm/s', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('dbMomentum', 'tool_momentum_kg_ms', 'kg·m/s', 'number')}
        `,
        calc: (out) => {
          const h = 6.626e-34;
          const m = num('dbMass'), v = num('dbVelocity');
          let p = num('dbMomentum');
          if (p === null) {
            if (m === null || v === null) { out.innerHTML = errorBox(t('tool_err_debroglie')); return; }
            p = m * v;
          }
          if (p === 0) { out.innerHTML = errorBox(t('tool_err_debroglie')); return; }
          const lambda = h / p;
          out.innerHTML =
            resultCell(t('tool_momentum_kg_ms'), p.toExponential(4) + ' kg·m/s') +
            resultCell(t('tool_debroglie_wavelength'), lambda.toExponential(4) + ' m');
        }
      },
      {
        id: 'criticalAngle',
        label: 'tool_critical_angle',
        render: () => `
          <p class="tool-hint">${t('tool_critical_angle_hint')}</p>
          ${field('caN1', 'tool_refractive_index1', 'n1 (denser)', 'number')}
          ${field('caN2', 'tool_refractive_index2', 'n2 (rarer)', 'number')}
        `,
        calc: (out) => {
          const n1 = num('caN1'), n2 = num('caN2');
          if (n1 === null || n2 === null || n1 <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          if (n2 >= n1) { out.innerHTML = errorBox(t('tool_err_critical_angle')); return; }
          const angle = Math.asin(n2 / n1) * 180 / Math.PI;
          out.innerHTML =
            resultCell(t('tool_critical_angle_result'), round(angle, 3) + '°') +
            resultCell(t('tool_category'), t('tool_tir_note'));
        }
      },
      {
        id: 'magneticForce',
        label: 'tool_magnetic_force',
        render: () => `
          <p class="tool-hint">${t('tool_magnetic_force_hint')}</p>
          ${field('mfF', 'tool_force_n', 'N', 'number')}
          ${field('mfQ', 'tool_charge_c', 'C', 'number')}
          ${field('mfV', 'tool_velocity_ms', 'm/s', 'number')}
          ${field('mfB', 'tool_magnetic_field_t', 'T', 'number')}
          ${field('mfAngle', 'tool_angle_deg', 'default 90°', 'number')}
        `,
        calc: (out) => {
          let F = num('mfF'), q = num('mfQ'), v = num('mfV'), B = num('mfB');
          const angle = num('mfAngle') === null ? 90 : num('mfAngle');
          const sinT = Math.sin(angle * Math.PI / 180);
          const filled = [F, q, v, B].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (sinT === 0) { out.innerHTML = errorBox(t('tool_err_magnetic_angle')); return; }
          if (F === null) F = q * v * B * sinT;
          else if (q === null) q = F / (v * B * sinT);
          else if (v === null) v = F / (q * B * sinT);
          else if (B === null) B = F / (q * v * sinT);
          out.innerHTML =
            resultCell(t('tool_force_n'), F.toExponential(4) + ' N') +
            resultCell(t('tool_charge_c'), q.toExponential(4) + ' C') +
            resultCell(t('tool_velocity_ms'), round(v, 4) + ' m/s') +
            resultCell(t('tool_magnetic_field_t'), round(B, 5) + ' T');
        }
      },
      {
        id: 'keplersThirdLaw',
        label: 'tool_keplers_third_law',
        render: () => `
          <p class="tool-hint">${t('tool_keplers_hint')}</p>
          ${field('kepM', 'tool_central_mass_kg', 'kg', 'number')}
          ${field('kepR', 'tool_orbital_radius_m', 'm', 'number')}
          ${field('kepT', 'tool_orbital_period_s', 's', 'number')}
        `,
        calc: (out) => {
          const G = 6.674e-11;
          let M = num('kepM'), r = num('kepR'), T = num('kepT');
          const filled = [M, r, T].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (T === null) T = Math.sqrt((4 * Math.PI * Math.PI * r * r * r) / (G * M));
          else if (r === null) r = Math.cbrt((G * M * T * T) / (4 * Math.PI * Math.PI));
          else if (M === null) M = (4 * Math.PI * Math.PI * r * r * r) / (G * T * T);
          out.innerHTML =
            resultCell(t('tool_central_mass_kg'), M.toExponential(4) + ' kg') +
            resultCell(t('tool_orbital_radius_m'), r.toExponential(4) + ' m') +
            resultCell(t('tool_orbital_period_s'), round(T, 2) + ' s') +
            resultCell(t('tool_orbital_period_days'), round(T / 86400, 4) + ' days');
        }
      },
      {
        id: 'planckPhotonEnergy',
        label: 'tool_photon_energy',
        render: () => `
          <p class="tool-hint">${t('tool_photon_energy_hint')}</p>
          ${field('peWavelength', 'tool_wavelength_nm', 'nm', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('peFrequency2', 'tool_frequency', 'Hz', 'number')}
        `,
        calc: (out) => {
          const c = 3e8, h = 6.626e-34, e = 1.602e-19;
          let lambdaNm = num('peWavelength'), f = num('peFrequency2');
          if (lambdaNm === null && f === null) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
          if (f === null) f = c / (lambdaNm * 1e-9);
          else lambdaNm = (c / f) * 1e9;
          const E = h * f;
          out.innerHTML =
            resultCell(t('tool_wavelength_nm'), round(lambdaNm, 4) + ' nm') +
            resultCell(t('tool_frequency'), f.toExponential(4) + ' Hz') +
            resultCell(t('tool_photon_energy_j'), E.toExponential(4) + ' J') +
            resultCell(t('tool_photon_energy_ev'), round(E / e, 5) + ' eV');
        }
      },
      {
        id: 'gravitationalPE',
        label: 'tool_gravitational_pe',
        render: () => `
          <p class="tool-hint">${t('tool_gravitational_pe_hint')}</p>
          ${field('gpeU', 'tool_potential_energy_j', 'J', 'number')}
          ${field('gpeM', 'tool_central_mass_kg', 'kg', 'number')}
          ${field('gpeMass', 'tool_mass_kg', 'kg', 'number')}
          ${field('gpeR', 'tool_distance_m', 'm', 'number')}
        `,
        calc: (out) => {
          const G = 6.674e-11;
          let U = num('gpeU'), M = num('gpeM'), m = num('gpeMass'), r = num('gpeR');
          const filled = [U, M, m, r].filter(x => x !== null).length;
          if (filled !== 3) { out.innerHTML = errorBox(t('tool_err_exactly3')); return; }
          if (U === null) U = -(G * M * m) / r;
          else if (M === null) M = -(U * r) / (G * m);
          else if (m === null) m = -(U * r) / (G * M);
          else if (r === null) r = -(G * M * m) / U;
          out.innerHTML =
            resultCell(t('tool_potential_energy_j'), U.toExponential(4) + ' J') +
            resultCell(t('tool_central_mass_kg'), M.toExponential(4) + ' kg') +
            resultCell(t('tool_mass_kg'), m.toExponential(4) + ' kg') +
            resultCell(t('tool_distance_m'), r.toExponential(4) + ' m');
        }
      },
      {
        id: 'capacitorSeriesParallel',
        label: 'tool_capacitor_combo',
        render: () => `
          <p class="tool-hint">${t('tool_capacitor_combo_hint')}</p>
          ${field('ccCapacitors', 'tool_capacitor_values', 'e.g. 2, 4, 6')}
          ${selectField('ccMode', 'tool_capacitance_mode', [
            { value: 'series', label: t('tool_series') },
            { value: 'parallel', label: t('tool_parallel') }
          ])}
        `,
        calc: (out) => {
          const raw = str('ccCapacitors');
          const mode = str('ccMode');
          const vals = raw.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x) && x > 0);
          if (vals.length < 2) { out.innerHTML = errorBox(t('tool_err_resistors')); return; }
          let total;
          if (mode === 'series') total = 1 / vals.reduce((sum, c) => sum + 1 / c, 0);
          else total = vals.reduce((sum, c) => sum + c, 0);
          out.innerHTML = resultCell(t('tool_total_capacitance'), round(total, 5));
        }
      },
      {
        id: 'angularMomentum',
        label: 'tool_angular_momentum',
        render: () => `
          <p class="tool-hint">${t('tool_angular_momentum_hint')}</p>
          ${field('amI', 'tool_moment_of_inertia', 'kg·m²', 'number')}
          ${field('amOmega', 'tool_angular_velocity', 'rad/s', 'number')}
          ${field('amL', 'tool_angular_momentum_val', 'kg·m²/s', 'number')}
        `,
        calc: (out) => {
          let I = num('amI'), omega = num('amOmega'), L = num('amL');
          const filled = [I, omega, L].filter(x => x !== null).length;
          if (filled !== 2) { out.innerHTML = errorBox(t('tool_err_exactly2')); return; }
          if (L === null) L = I * omega;
          else if (I === null) I = L / omega;
          else if (omega === null) omega = L / I;
          const keRot = 0.5 * I * omega * omega;
          out.innerHTML =
            resultCell(t('tool_moment_of_inertia'), round(I, 5) + ' kg·m²') +
            resultCell(t('tool_angular_velocity'), round(omega, 5) + ' rad/s') +
            resultCell(t('tool_angular_momentum_val'), round(L, 5) + ' kg·m²/s') +
            resultCell(t('tool_rotational_ke'), round(keRot, 5) + ' J');
        }
      },
      {
        id: 'relativisticTimeDilation',
        label: 'tool_time_dilation',
        render: () => `
          <p class="tool-hint">${t('tool_time_dilation_hint')}</p>
          ${field('tdProper', 'tool_proper_time', 's', 'number')}
          ${field('tdVelocity', 'tool_relative_velocity', 'm/s', 'number')}
        `,
        calc: (out) => {
          const c = 3e8;
          const t0 = num('tdProper'), v = num('tdVelocity');
          if (t0 === null || v === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          if (Math.abs(v) >= c) { out.innerHTML = errorBox(t('tool_err_time_dilation')); return; }
          const gamma = 1 / Math.sqrt(1 - (v * v) / (c * c));
          const dilated = t0 * gamma;
          out.innerHTML =
            resultCell(t('tool_lorentz_factor'), round(gamma, 6)) +
            resultCell(t('tool_dilated_time'), round(dilated, 6) + ' s');
        }
      },
      {
        id: 'terminalVelocity',
        label: 'tool_terminal_velocity',
        render: () => `
          <p class="tool-hint">${t('tool_terminal_velocity_hint')}</p>
          ${field('tvMass', 'tool_mass_kg', 'kg', 'number')}
          ${field('tvArea', 'tool_cross_area', 'm²', 'number')}
          ${field('tvDrag', 'tool_drag_coefficient', 'e.g. 0.47 (sphere)', 'number')}
          ${field('tvDensity', 'tool_fluid_density', 'kg/m³ (air ≈ 1.225)', 'number')}
        `,
        calc: (out) => {
          const m = num('tvMass'), A = num('tvArea'), Cd = num('tvDrag'), rho = num('tvDensity');
          const g = 9.8;
          if (m === null || A === null || Cd === null || rho === null || A <= 0 || Cd <= 0 || rho <= 0) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          const vt = Math.sqrt((2 * m * g) / (rho * A * Cd));
          out.innerHTML = resultCell(t('tool_terminal_velocity'), round(vt, 4) + ' m/s');
        }
      },
      {
        id: 'orbitalVelocity',
        label: 'tool_orbital_velocity',
        render: () => `
          <p class="tool-hint">${t('tool_orbital_velocity_hint')}</p>
          ${field('ovMass', 'tool_central_mass_kg', 'kg', 'number')}
          ${field('ovRadius', 'tool_orbital_radius_m', 'm', 'number')}
        `,
        calc: (out) => {
          const G = 6.674e-11;
          const M = num('ovMass'), r = num('ovRadius');
          if (M === null || r === null || r <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const v = Math.sqrt((G * M) / r);
          const T = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / (G * M));
          out.innerHTML =
            resultCell(t('tool_orbital_velocity'), v.toExponential(4) + ' m/s') +
            resultCell(t('tool_orbital_period'), T.toExponential(4) + ' s');
        }
      },
      {
        id: 'resistivity',
        label: 'tool_resistivity',
        render: () => `
          <p class="tool-hint">${t('tool_resistivity_hint')}</p>
          ${field('resR', 'tool_resistance_ohm', 'Ω', 'number')}
          ${field('resL', 'tool_wire_length_m', 'm', 'number')}
          ${field('resA', 'tool_cross_area_m2', 'm²', 'number')}
        `,
        calc: (out) => {
          const R = num('resR'), L = num('resL'), A = num('resA');
          if (R === null || L === null || A === null || A <= 0 || L <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const rho = (R * A) / L;
          out.innerHTML = resultCell(t('tool_resistivity'), rho.toExponential(4) + ' Ω·m');
        }
      },
      {
        id: 'latentHeat',
        label: 'tool_latent_heat',
        render: () => `
          <p class="tool-hint">${t('tool_latent_heat_hint')}</p>
          ${field('lhMass', 'tool_mass_kg', 'kg', 'number')}
          ${field('lhL', 'tool_specific_latent_heat', 'J/kg', 'number')}
        `,
        calc: (out) => {
          const m = num('lhMass'), L = num('lhL');
          if (m === null || L === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const Q = m * L;
          out.innerHTML = resultCell(t('tool_heat_energy'), Q.toExponential(4) + ' J');
        }
      },
      {
        id: 'mechanicalAdvantage',
        label: 'tool_mechanical_advantage',
        render: () => `
          <p class="tool-hint">${t('tool_mech_advantage_hint')}</p>
          ${field('maLoad', 'tool_load_force', 'N', 'number')}
          ${field('maEffort', 'tool_effort_force', 'N', 'number')}
          ${field('maDistEffort', 'tool_effort_distance', 'm (optional)', 'number')}
          ${field('maDistLoad', 'tool_load_distance', 'm (optional)', 'number')}
        `,
        calc: (out) => {
          const load = num('maLoad'), effort = num('maEffort');
          const dEffort = num('maDistEffort'), dLoad = num('maDistLoad');
          if (load === null || effort === null || effort === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const ma = load / effort;
          let html = resultCell(t('tool_mechanical_advantage'), round(ma, 4));
          if (dEffort !== null && dLoad !== null && dLoad !== 0) {
            const vr = dEffort / dLoad;
            const efficiency = (ma / vr) * 100;
            html += resultCell(t('tool_velocity_ratio'), round(vr, 4)) + resultCell(t('tool_efficiency'), round(efficiency, 2) + '%');
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'carnotEfficiency',
        label: 'tool_carnot_efficiency',
        render: () => `
          <p class="tool-hint">${t('tool_carnot_efficiency_hint')}</p>
          ${field('carnotTh', 'tool_hot_reservoir_temp', 'K', 'number')}
          ${field('carnotTc', 'tool_cold_reservoir_temp', 'K', 'number')}
          ${field('carnotQh', 'tool_heat_input_qh', 'J (optional)', 'number')}
        `,
        calc: (out) => {
          const Th = num('carnotTh'), Tc = num('carnotTc'), Qh = num('carnotQh');
          if (Th === null || Tc === null || Th <= 0 || Tc < 0 || Tc >= Th) { out.innerHTML = errorBox(t('tool_err_carnot')); return; }
          const eff = 1 - Tc / Th;
          let html = resultCell(t('tool_carnot_efficiency'), round(eff * 100, 3) + '%');
          if (Qh !== null) {
            const W = eff * Qh, Qc = Qh - W;
            html += resultCell(t('tool_work_output'), round(W, 4) + ' J') + resultCell(t('tool_heat_rejected_qc'), round(Qc, 4) + ' J');
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'refractiveIndex',
        label: 'tool_refractive_index',
        render: () => `
          <p class="tool-hint">${t('tool_refractive_index_hint')}</p>
          ${field('riSpeed', 'tool_speed_in_medium', 'm/s', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('riIndex', 'tool_refractive_index_n', 'e.g. 1.33', 'number')}
        `,
        calc: (out) => {
          const v = num('riSpeed'), n = num('riIndex');
          const c = 3e8;
          if (v === null && n === null) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
          if (v !== null) { out.innerHTML = resultCell(t('tool_refractive_index_n'), round(c / v, 4)); }
          else { out.innerHTML = resultCell(t('tool_speed_in_medium'), (c / n).toExponential(4) + ' m/s'); }
        }
      },
      {
        id: 'rlcImpedance',
        label: 'tool_rlc_impedance',
        render: () => `
          <p class="tool-hint">${t('tool_rlc_impedance_hint')}</p>
          ${field('rlcR', 'tool_resistance_ohm', 'Ω', 'number')}
          ${field('rlcL', 'tool_inductance_h', 'H', 'number')}
          ${field('rlcC', 'tool_capacitance_f', 'F', 'number')}
          ${field('rlcF', 'tool_frequency_hz', 'Hz', 'number')}
        `,
        calc: (out) => {
          const R = num('rlcR'), L = num('rlcL'), C = num('rlcC'), f = num('rlcF');
          if ([R, L, C, f].some(v => v === null) || R < 0 || C <= 0) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          const XL = 2 * Math.PI * f * L;
          const XC = 1 / (2 * Math.PI * f * C);
          const Z = Math.sqrt(R * R + Math.pow(XL - XC, 2));
          const phase = Math.atan2(XL - XC, R) * (180 / Math.PI);
          out.innerHTML = resultCell('X_L', round(XL, 4) + ' Ω') + resultCell('X_C', round(XC, 4) + ' Ω') +
            resultCell(t('tool_impedance_z'), round(Z, 4) + ' Ω') + resultCell(t('tool_phase_angle'), round(phase, 2) + '°');
        }
      },
      {
        id: 'faradaysLawEMF',
        label: 'tool_faradays_law_emf',
        render: () => `
          <p class="tool-hint">${t('tool_faradays_law_emf_hint')}</p>
          ${field('femfN', 'tool_num_turns', 'turns', 'number')}
          ${field('femfFlux', 'tool_delta_flux', 'Wb', 'number')}
          ${field('femfTime', 'tool_delta_time_s', 's', 'number')}
        `,
        calc: (out) => {
          const N = num('femfN'), dPhi = num('femfFlux'), dt = num('femfTime');
          if (N === null || dPhi === null || dt === null || dt === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const emf = Math.abs(N * dPhi / dt);
          out.innerHTML = resultCell(t('tool_induced_emf'), round(emf, 5) + ' V');
        }
      },
      {
        id: 'thermalExpansion',
        label: 'tool_thermal_expansion',
        render: () => `
          <p class="tool-hint">${t('tool_thermal_expansion_hint')}</p>
          ${field('teLength', 'tool_initial_length', 'm', 'number')}
          ${field('teAlpha', 'tool_linear_expansion_coeff', 'per °C', 'number')}
          ${field('teDeltaT', 'tool_delta_temp_c', '°C', 'number')}
        `,
        calc: (out) => {
          const L0 = num('teLength'), alpha = num('teAlpha'), dT = num('teDeltaT');
          if (L0 === null || alpha === null || dT === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const deltaL = alpha * L0 * dT;
          out.innerHTML = resultCell(t('tool_change_in_length'), round(deltaL, 6) + ' m') + resultCell(t('tool_new_length'), round(L0 + deltaL, 6) + ' m');
        }
      },
      {
        id: 'stefanBoltzmannLaw',
        label: 'tool_stefan_boltzmann',
        render: () => `
          <p class="tool-hint">${t('tool_stefan_boltzmann_hint')}</p>
          ${field('sbEmissivity', 'tool_emissivity', '0 - 1', 'number')}
          ${field('sbArea', 'tool_surface_area_m2', 'm²', 'number')}
          ${field('sbTemp', 'tool_temp_k', 'K', 'number')}
        `,
        calc: (out) => {
          const e = num('sbEmissivity'), A = num('sbArea'), T = num('sbTemp');
          if (e === null || A === null || T === null || e < 0 || e > 1) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const sigma = 5.670374419e-8;
          const P = e * sigma * A * Math.pow(T, 4);
          out.innerHTML = resultCell(t('tool_radiated_power'), P.toExponential(4) + ' W');
        }
      },
      {
        id: 'bernoullisEquation',
        label: 'tool_bernoullis_equation',
        render: () => `
          <p class="tool-hint">${t('tool_bernoullis_equation_hint')}</p>
          ${field('bqP1', 'tool_pressure_1_pa', 'Pa', 'number')}
          ${field('bqDensity', 'tool_fluid_density', 'kg/m³', 'number')}
          ${field('bqV1', 'tool_velocity_1', 'm/s', 'number')}
          ${field('bqV2', 'tool_velocity_2', 'm/s', 'number')}
          ${field('bqH1', 'tool_height_1', 'm (optional)', 'number')}
          ${field('bqH2', 'tool_height_2', 'm (optional)', 'number')}
        `,
        calc: (out) => {
          const P1 = num('bqP1'), rho = num('bqDensity'), v1 = num('bqV1'), v2 = num('bqV2');
          const h1 = num('bqH1') || 0, h2 = num('bqH2') || 0;
          if ([P1, rho, v1, v2].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          const g = 9.8;
          const P2 = P1 + 0.5 * rho * (v1 * v1 - v2 * v2) + rho * g * (h1 - h2);
          out.innerHTML = resultCell(t('tool_pressure_2_pa'), round(P2, 3) + ' Pa');
        }
      },
      {
        id: 'centerOfMass',
        label: 'tool_center_of_mass',
        render: () => `
          <p class="tool-hint">${t('tool_center_of_mass_hint')}</p>
          ${field('comM1', 'tool_mass_1_kg', 'kg', 'number')}
          ${field('comX1', 'tool_position_1', 'm', 'number')}
          ${field('comM2', 'tool_mass_2_kg', 'kg', 'number')}
          ${field('comX2', 'tool_position_2', 'm', 'number')}
        `,
        calc: (out) => {
          const m1 = num('comM1'), x1 = num('comX1'), m2 = num('comM2'), x2 = num('comX2');
          if ([m1, x1, m2, x2].some(v => v === null) || (m1 + m2) === 0) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          const xcm = (m1 * x1 + m2 * x2) / (m1 + m2);
          out.innerHTML = resultCell(t('tool_center_of_mass_position'), round(xcm, 4) + ' m');
        }
      },
      {
        id: 'wiensLaw',
        label: 'tool_wiens_law',
        render: () => `
          <p class="tool-hint">${t('tool_wiens_law_hint')}</p>
          ${field('wienTemp', 'tool_temp_k', 'K', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('wienLambda', 'tool_peak_wavelength_nm', 'nm', 'number')}
        `,
        calc: (out) => {
          const T = num('wienTemp'), lambdaNm = num('wienLambda');
          const b = 2.897771955e-3;
          if (T === null && lambdaNm === null) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
          if (T !== null) {
            if (T <= 0) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
            const lambdaMax = (b / T) * 1e9;
            out.innerHTML = resultCell(t('tool_peak_wavelength_nm'), round(lambdaMax, 2) + ' nm');
          } else {
            const T_result = b / (lambdaNm * 1e-9);
            out.innerHTML = resultCell(t('tool_temp_k'), round(T_result, 2) + ' K');
          }
        }
      },
      {
        id: 'massEnergyEquivalence',
        label: 'tool_mass_energy_equivalence',
        render: () => `
          <p class="tool-hint">${t('tool_mass_energy_equivalence_hint')}</p>
          ${field('meeMass', 'tool_mass_kg_sci', 'kg (e.g. 1e-27)', 'number')}
        `,
        calc: (out) => {
          const m = num('meeMass');
          if (m === null || m < 0) { out.innerHTML = errorBox(t('tool_err_1field')); return; }
          const c = 3e8;
          const E = m * c * c;
          const eV = E / 1.602176634e-19;
          out.innerHTML = resultCell(t('tool_energy_joules'), E.toExponential(4) + ' J') + resultCell(t('tool_energy_mev'), (eV / 1e6).toExponential(4) + ' MeV');
        }
      }
    ],

    Biology: [
      {
        id: 'bmi',
        label: 'tool_bmi',
        render: () => `
          ${field('bmiWeight', 'tool_weight_kg', 'weight (kg)', 'number')}
          ${field('bmiHeight', 'tool_height_cm', 'height (cm)', 'number')}
        `,
        calc: (out) => {
          const w = num('bmiWeight'), hcm = num('bmiHeight');
          if (w === null || hcm === null) { out.innerHTML = errorBox(t('tool_err_weightheight')); return; }
          const hm = hcm / 100;
          const bmi = w / (hm * hm);
          let category = t('tool_bmi_normal');
          if (bmi < 18.5) category = t('tool_bmi_under');
          else if (bmi >= 25 && bmi < 30) category = t('tool_bmi_over');
          else if (bmi >= 30) category = t('tool_bmi_obese');
          out.innerHTML = resultCell('BMI', round(bmi, 1)) + resultCell(t('tool_category'), category);
        }
      },
      {
        id: 'punnett',
        label: 'tool_punnett',
        render: () => `
          <p class="tool-hint">${t('tool_punnett_hint')}</p>
          ${field('punnettP1', 'tool_parent1', 'e.g. Aa', 'text')}
          ${field('punnettP2', 'tool_parent2', 'e.g. Aa', 'text')}
        `,
        calc: (out) => {
          const p1 = str('punnettP1'), p2 = str('punnettP2');
          if (!p1 || !p2 || p1.length !== p2.length || p1.length % 2 !== 0) {
            out.innerHTML = errorBox(t('tool_err_punnett'));
            return;
          }
          // Split into gene pairs, e.g. "AaBb" -> ["Aa","Bb"]
          function toPairs(s) { const out = []; for (let i = 0; i < s.length; i += 2) out.push(s.slice(i, i + 2)); return out; }
          function gametes(pairs) {
            let combos = [''];
            pairs.forEach(pair => {
              const alleles = pair.split('');
              const next = [];
              combos.forEach(c => alleles.forEach(a => next.push(c + a)));
              combos = next;
            });
            return combos;
          }
          const pairs1 = toPairs(p1), pairs2 = toPairs(p2);
          const g1 = gametes(pairs1), g2 = gametes(pairs2);

          let tableHtml = '<table class="punnett-table"><thead><tr><th></th>' +
            g2.map(g => `<th>${g}</th>`).join('') + '</tr></thead><tbody>';
          const phenotypeCounts = {};
          g1.forEach(a => {
            tableHtml += `<tr><th>${a}</th>`;
            g2.forEach(b => {
              // Combine per-gene: sort each gene pair so uppercase comes first (dominant shown first)
              const nGenes = a.length;
              let genotype = '';
              for (let i = 0; i < nGenes; i++) {
                const pairChars = [a[i], b[i]].sort((x, y) => x === x.toUpperCase() ? -1 : 1);
                genotype += pairChars.join('');
              }
              tableHtml += `<td>${genotype}</td>`;
              // Phenotype: dominant if any uppercase present in that gene, else recessive
              let phenotype = '';
              for (let i = 0; i < nGenes; i++) {
                const g = genotype.slice(i * 2, i * 2 + 2);
                phenotype += /[A-Z]/.test(g) ? g[0].toUpperCase() + '_' : g.toLowerCase();
              }
              phenotypeCounts[genotype] = (phenotypeCounts[genotype] || 0) + 1;
            });
            tableHtml += '</tr>';
          });
          tableHtml += '</tbody></table>';

          let ratioHtml = '<div class="punnett-ratio">';
          Object.keys(phenotypeCounts).sort().forEach(gt => {
            ratioHtml += `<span class="punnett-ratio-item">${gt}: ${phenotypeCounts[gt]}/${g1.length * g2.length}</span>`;
          });
          ratioHtml += '</div>';

          out.innerHTML = tableHtml + ratioHtml;
        }
      },
      {
        id: 'hardyWeinberg',
        label: 'tool_hardy_weinberg',
        render: () => `
          <p class="tool-hint">${t('tool_hardy_weinberg_hint')}</p>
          ${field('hwP', 'tool_allele_p', '0 - 1', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('hwQ', 'tool_allele_q', '0 - 1', 'number')}
        `,
        calc: (out) => {
          let p = num('hwP'), q = num('hwQ');
          if (p === null && q === null) { out.innerHTML = errorBox(t('tool_err_hardyweinberg')); return; }
          if (p === null) p = 1 - q;
          if (q === null) q = 1 - p;
          if (p < 0 || p > 1 || q < 0 || q > 1) { out.innerHTML = errorBox(t('tool_err_hardyweinberg')); return; }
          out.innerHTML =
            resultCell('p', round(p, 4)) +
            resultCell('q', round(q, 4)) +
            resultCell(t('tool_freq_aa'), round(p * p, 4)) +
            resultCell(t('tool_freq_aa2'), round(2 * p * q, 4)) +
            resultCell(t('tool_freq_aabb'), round(q * q, 4));
        }
      },
      {
        id: 'bmr',
        label: 'tool_bmr',
        render: () => `
          <p class="tool-hint">${t('tool_bmr_hint')}</p>
          ${field('bmrWeight', 'tool_weight_kg', 'kg', 'number')}
          ${field('bmrHeight', 'tool_height_cm', 'cm', 'number')}
          ${field('bmrAge', 'tool_age_years', 'years', 'number')}
          ${selectField('bmrGender', 'tool_gender', [
            { value: 'male', label: t('tool_male') },
            { value: 'female', label: t('tool_female') }
          ])}
        `,
        calc: (out) => {
          const w = num('bmrWeight'), h = num('bmrHeight'), age = num('bmrAge');
          const gender = str('bmrGender');
          if (w === null || h === null || age === null) { out.innerHTML = errorBox(t('tool_err_bmr')); return; }
          const bmr = gender === 'female'
            ? (10 * w + 6.25 * h - 5 * age - 161)
            : (10 * w + 6.25 * h - 5 * age + 5);
          out.innerHTML = resultCell(t('tool_bmr_result'), round(bmr, 1));
        }
      },
      {
        id: 'gcContent',
        label: 'tool_gc_content',
        render: () => `
          <p class="tool-hint">${t('tool_gc_content_hint')}</p>
          ${field('gcSeq', 'tool_dna_sequence', 'e.g. ATGCGCTA')}
        `,
        calc: (out) => {
          const seq = str('gcSeq').toUpperCase().replace(/\s+/g, '');
          if (!seq || /[^ATGC]/.test(seq)) { out.innerHTML = errorBox(t('tool_err_dna')); return; }
          const gcCount = (seq.match(/[GC]/g) || []).length;
          const pct = (gcCount / seq.length) * 100;
          out.innerHTML =
            resultCell(t('tool_gc_percent'), round(pct, 2) + '%') +
            resultCell(t('tool_total_bases'), seq.length);
        }
      },
      {
        id: 'populationGrowth',
        label: 'tool_population_growth',
        render: () => `
          <p class="tool-hint">${t('tool_population_growth_hint')}</p>
          ${field('popN0', 'tool_initial_population', '', 'number')}
          ${field('popRate', 'tool_growth_rate', '%', 'number')}
          ${field('popTime', 'tool_time_elapsed', '', 'number')}
        `,
        calc: (out) => {
          const N0 = num('popN0'), rate = num('popRate'), time = num('popTime');
          if (N0 === null || rate === null || time === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const N = N0 * Math.exp((rate / 100) * time);
          out.innerHTML = resultCell(t('tool_final_population'), round(N, 2));
        }
      },
      {
        id: 'bodySurfaceArea',
        label: 'tool_body_surface_area',
        render: () => `
          <p class="tool-hint">${t('tool_bsa_hint')}</p>
          ${field('bsaWeight', 'tool_weight_kg', 'kg', 'number')}
          ${field('bsaHeight', 'tool_height_cm', 'cm', 'number')}
        `,
        calc: (out) => {
          const w = num('bsaWeight'), h = num('bsaHeight');
          if (w === null || h === null) { out.innerHTML = errorBox(t('tool_err_weightheight')); return; }
          const bsa = 0.007184 * Math.pow(w, 0.425) * Math.pow(h, 0.725);
          out.innerHTML = resultCell(t('tool_bsa_result'), round(bsa, 3));
        }
      },
      {
        id: 'targetHeartRate',
        label: 'tool_target_heart_rate',
        render: () => `
          <p class="tool-hint">${t('tool_thr_hint')}</p>
          ${field('thrAge', 'tool_age_years', 'years', 'number')}
        `,
        calc: (out) => {
          const age = num('thrAge');
          if (age === null) { out.innerHTML = errorBox(t('tool_err_bmr')); return; }
          const maxHR = 220 - age;
          out.innerHTML =
            resultCell(t('tool_max_hr'), round(maxHR, 0)) +
            resultCell(t('tool_hr_zone'), round(maxHR * 0.5, 0) + ' - ' + round(maxHR * 0.85, 0));
        }
      },
      {
        id: 'serialDilution',
        label: 'tool_serial_dilution',
        render: () => `
          <p class="tool-hint">${t('tool_serial_dilution_hint')}</p>
          ${field('sdC0', 'tool_initial_concentration', '', 'number')}
          ${field('sdFactor', 'tool_dilution_factor', 'e.g. 10', 'number')}
          ${field('sdSteps', 'tool_dilution_steps', 'e.g. 3', 'number')}
        `,
        calc: (out) => {
          const C0 = num('sdC0'), factor = num('sdFactor'), steps = num('sdSteps');
          if (C0 === null || factor === null || steps === null || factor === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const final = C0 / Math.pow(factor, steps);
          out.innerHTML = resultCell(t('tool_final_concentration'), final.toExponential(4));
        }
      },
      {
        id: 'waterPotential',
        label: 'tool_water_potential',
        render: () => `
          <p class="tool-hint">${t('tool_water_potential_hint')}</p>
          ${field('wpSolute', 'tool_solute_potential', '', 'number')}
          ${field('wpPressure', 'tool_pressure_potential', '', 'number')}
        `,
        calc: (out) => {
          const psiS = num('wpSolute'), psiP = num('wpPressure');
          if (psiS === null || psiP === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_water_potential_result'), round(psiS + psiP, 4));
        }
      },
      {
        id: 'idealBodyWeight',
        label: 'tool_ideal_body_weight',
        render: () => `
          <p class="tool-hint">${t('tool_ibw_hint')}</p>
          ${field('ibwHeight', 'tool_height_cm', 'cm', 'number')}
          ${selectField('ibwGender', 'tool_gender', [
            { value: 'male', label: t('tool_male') },
            { value: 'female', label: t('tool_female') }
          ])}
        `,
        calc: (out) => {
          const h = num('ibwHeight');
          const gender = str('ibwGender');
          if (h === null) { out.innerHTML = errorBox(t('tool_err_heightgender')); return; }
          const heightIn = h / 2.54;
          const over5ft = heightIn - 60;
          const base = gender === 'female' ? 45.5 : 50;
          const ibw = base + 2.3 * over5ft;
          out.innerHTML = resultCell(t('tool_ibw_result'), round(ibw, 1));
        }
      },
      {
        id: 'michaelisMenten',
        label: 'tool_michaelis_menten',
        render: () => `
          <p class="tool-hint">${t('tool_michaelis_menten_hint')}</p>
          ${field('mmVmax', 'tool_vmax', '', 'number')}
          ${field('mmKm', 'tool_km', '', 'number')}
          ${field('mmS', 'tool_substrate_conc', '', 'number')}
        `,
        calc: (out) => {
          const Vmax = num('mmVmax'), Km = num('mmKm'), S = num('mmS');
          if (Vmax === null || Km === null || S === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const v = (Vmax * S) / (Km + S);
          out.innerHTML = resultCell(t('tool_reaction_velocity'), round(v, 5));
        }
      },
      {
        id: 'respiratoryQuotient',
        label: 'tool_respiratory_quotient',
        render: () => `
          <p class="tool-hint">${t('tool_rq_hint')}</p>
          ${field('rqCO2', 'tool_co2_produced', '', 'number')}
          ${field('rqO2', 'tool_o2_consumed', '', 'number')}
        `,
        calc: (out) => {
          const co2 = num('rqCO2'), o2 = num('rqO2');
          if (co2 === null || o2 === null || o2 === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_rq_result'), round(co2 / o2, 3));
        }
      },
      {
        id: 'osmolarity',
        label: 'tool_osmolarity',
        render: () => `
          <p class="tool-hint">${t('tool_osmolarity_hint')}</p>
          ${field('osMolarity', 'tool_molarity_val', 'mol/L', 'number')}
          ${field('osParticles', 'tool_particles_i', 'default 1', 'number')}
        `,
        calc: (out) => {
          const M = num('osMolarity');
          const i = num('osParticles') === null ? 1 : num('osParticles');
          if (M === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_osmolarity_result'), round(M * i, 4));
        }
      },
      {
        id: 'surfaceAreaVolumeRatio',
        label: 'tool_sa_vol_ratio',
        render: () => `
          <p class="tool-hint">${t('tool_sa_vol_ratio_hint')}</p>
          ${selectField('savShape', 'tool_shape', [
            { value: 'cube', label: t('tool_cube') },
            { value: 'sphere', label: t('tool_sphere') }
          ])}
          ${field('savSize', 'tool_size_value', '', 'number')}
        `,
        calc: (out) => {
          const shape = str('savShape'), s = num('savSize');
          if (s === null || s <= 0) { out.innerHTML = errorBox(t('tool_err_size')); return; }
          let SA, V;
          if (shape === 'sphere') { SA = 4 * Math.PI * s * s; V = (4 / 3) * Math.PI * Math.pow(s, 3); }
          else { SA = 6 * s * s; V = Math.pow(s, 3); }
          out.innerHTML =
            resultCell(t('tool_surface_area'), round(SA, 4)) +
            resultCell(t('tool_volume_result'), round(V, 4)) +
            resultCell(t('tool_sa_vol_ratio_result'), round(SA / V, 5));
        }
      },
      {
        id: 'dnaMeltingTemp',
        label: 'tool_dna_melting_temp',
        render: () => `
          <p class="tool-hint">${t('tool_dna_melting_temp_hint')}</p>
          ${field('tmSeq', 'tool_dna_sequence', 'e.g. ATGCGCTA')}
        `,
        calc: (out) => {
          const seq = str('tmSeq').toUpperCase().replace(/\s+/g, '');
          if (!seq || /[^ATGC]/.test(seq)) { out.innerHTML = errorBox(t('tool_err_dna')); return; }
          const gc = (seq.match(/[GC]/g) || []).length;
          const at = (seq.match(/[AT]/g) || []).length;
          const tm = 4 * gc + 2 * at;
          out.innerHTML =
            resultCell(t('tool_melting_temp_result'), tm + ' °C') +
            resultCell(t('tool_total_bases'), seq.length);
        }
      },
      {
        id: 'trophicEnergy',
        label: 'tool_trophic_energy',
        render: () => `
          <p class="tool-hint">${t('tool_trophic_energy_hint')}</p>
          ${field('teEnergy', 'tool_producer_energy', '', 'number')}
          ${field('teEff', 'tool_transfer_efficiency', 'default 10', 'number')}
        `,
        calc: (out) => {
          const energy = num('teEnergy');
          const eff = (num('teEff') === null ? 10 : num('teEff')) / 100;
          if (energy === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const l2 = energy * eff, l3 = l2 * eff, l4 = l3 * eff;
          out.innerHTML =
            resultCell(t('tool_primary_consumer_energy'), round(l2, 4)) +
            resultCell(t('tool_secondary_consumer_energy'), round(l3, 4)) +
            resultCell(t('tool_tertiary_consumer_energy'), round(l4, 4));
        }
      },
      {
        id: 'bodyFatPercentage',
        label: 'tool_body_fat_percentage',
        render: () => `
          <p class="tool-hint">${t('tool_body_fat_hint')}</p>
          ${field('bfWaist', 'tool_waist_cm', 'cm', 'number')}
          ${field('bfNeck', 'tool_neck_cm', 'cm', 'number')}
          ${field('bfHeight', 'tool_height_cm', 'cm', 'number')}
          ${field('bfHip', 'tool_hip_cm', 'cm, females only', 'number')}
          ${selectField('bfGender', 'tool_gender', [
            { value: 'male', label: t('tool_male') },
            { value: 'female', label: t('tool_female') }
          ])}
        `,
        calc: (out) => {
          const waistCm = num('bfWaist'), neckCm = num('bfNeck'), heightCm = num('bfHeight'), hipCm = num('bfHip');
          const gender = str('bfGender');
          if (waistCm === null || neckCm === null || heightCm === null || (gender === 'female' && hipCm === null)) {
            out.innerHTML = errorBox(t('tool_err_bodyfat')); return;
          }
          const waist = waistCm / 2.54, neck = neckCm / 2.54, height = heightCm / 2.54, hip = hipCm !== null ? hipCm / 2.54 : null;
          let bf;
          try {
            if (gender === 'female') {
              bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
            } else {
              bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
            }
            if (!isFinite(bf)) throw new Error('domain');
          } catch (e) { out.innerHTML = errorBox(t('tool_err_bodyfat')); return; }
          out.innerHTML = resultCell(t('tool_body_fat_result'), round(bf, 1) + '%');
        }
      },
      {
        id: 'cardiacOutput',
        label: 'tool_cardiac_output',
        render: () => `
          <p class="tool-hint">${t('tool_cardiac_output_hint')}</p>
          ${field('coHR', 'tool_heart_rate_bpm', 'bpm', 'number')}
          ${field('coSV', 'tool_stroke_volume_ml', 'mL', 'number')}
        `,
        calc: (out) => {
          const hr = num('coHR'), sv = num('coSV');
          if (hr === null || sv === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const co = (hr * sv) / 1000;
          out.innerHTML = resultCell(t('tool_cardiac_output_result'), round(co, 3) + ' L/min');
        }
      },
      {
        id: 'meanArterialPressure',
        label: 'tool_mean_arterial_pressure',
        render: () => `
          <p class="tool-hint">${t('tool_map_hint')}</p>
          ${field('mapSys', 'tool_systolic_bp', 'mmHg', 'number')}
          ${field('mapDia', 'tool_diastolic_bp', 'mmHg', 'number')}
        `,
        calc: (out) => {
          const sys = num('mapSys'), dia = num('mapDia');
          if (sys === null || dia === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const map = dia + (sys - dia) / 3;
          out.innerHTML = resultCell(t('tool_map_result'), round(map, 2) + ' mmHg');
        }
      },
      {
        id: 'chiSquareGenetics',
        label: 'tool_chi_square',
        render: () => `
          <p class="tool-hint">${t('tool_chi_square_hint')}</p>
          <div class="tool-vector-row">
            ${field('csO1', 'tool_observed', 'O1', 'number')}
            ${field('csE1', 'tool_expected', 'E1', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('csO2', 'tool_observed', 'O2', 'number')}
            ${field('csE2', 'tool_expected', 'E2', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('csO3', 'tool_observed', 'O3, optional', 'number')}
            ${field('csE3', 'tool_expected', 'E3, optional', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('csO4', 'tool_observed', 'O4, optional', 'number')}
            ${field('csE4', 'tool_expected', 'E4, optional', 'number')}
          </div>
        `,
        calc: (out) => {
          const pairs = [
            [num('csO1'), num('csE1')], [num('csO2'), num('csE2')],
            [num('csO3'), num('csE3')], [num('csO4'), num('csE4')]
          ].filter(([o, e]) => o !== null && e !== null && e !== 0);
          if (pairs.length < 2) { out.innerHTML = errorBox(t('tool_err_chisquare')); return; }
          const chiSq = pairs.reduce((sum, [o, e]) => sum + Math.pow(o - e, 2) / e, 0);
          const df = pairs.length - 1;
          out.innerHTML =
            resultCell(t('tool_chi_square_result'), round(chiSq, 4)) +
            resultCell(t('tool_degrees_of_freedom'), df);
        }
      },
      {
        id: 'recombinationFrequency',
        label: 'tool_recombination_frequency',
        render: () => `
          <p class="tool-hint">${t('tool_recombination_hint')}</p>
          ${field('rfRecombinants', 'tool_recombinant_offspring', '', 'number')}
          ${field('rfTotal', 'tool_total_offspring', '', 'number')}
        `,
        calc: (out) => {
          const rec = num('rfRecombinants'), total = num('rfTotal');
          if (rec === null || total === null || total === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const pct = (rec / total) * 100;
          out.innerHTML =
            resultCell(t('tool_recombination_percent'), round(pct, 3) + '%') +
            resultCell(t('tool_map_distance'), round(pct, 3) + ' cM');
        }
      },
      {
        id: 'shannonDiversityIndex',
        label: 'tool_shannon_diversity',
        render: () => `
          <p class="tool-hint">${t('tool_shannon_hint')}</p>
          ${field('shdCounts', 'tool_species_counts', 'e.g. 12, 8, 5, 3')}
        `,
        calc: (out) => {
          const vals = str('shdCounts').split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x) && x > 0);
          if (vals.length < 2) { out.innerHTML = errorBox(t('tool_err_species')); return; }
          const N = vals.reduce((a, b) => a + b, 0);
          const H = -vals.reduce((sum, n) => { const p = n / N; return sum + p * Math.log(p); }, 0);
          const evenness = H / Math.log(vals.length);
          out.innerHTML =
            resultCell(t('tool_shannon_index_result'), round(H, 4)) +
            resultCell(t('tool_species_evenness'), round(evenness, 4));
        }
      },
      {
        id: 'simpsonsDiversityIndex',
        label: 'tool_simpsons_diversity',
        render: () => `
          <p class="tool-hint">${t('tool_simpsons_hint')}</p>
          ${field('sdiCounts', 'tool_species_counts', 'e.g. 12, 8, 5, 3')}
        `,
        calc: (out) => {
          const vals = str('sdiCounts').split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x) && x > 0);
          if (vals.length < 2) { out.innerHTML = errorBox(t('tool_err_species')); return; }
          const N = vals.reduce((a, b) => a + b, 0);
          const sumTerm = vals.reduce((sum, n) => sum + n * (n - 1), 0);
          const D = 1 - (sumTerm / (N * (N - 1)));
          out.innerHTML = resultCell(t('tool_simpsons_index_result'), round(D, 4));
        }
      },
      {
        id: 'logisticPopulationGrowth',
        label: 'tool_logistic_growth',
        render: () => `
          <p class="tool-hint">${t('tool_logistic_growth_hint')}</p>
          ${field('lgN0', 'tool_initial_population', '', 'number')}
          ${field('lgK', 'tool_carrying_capacity', '', 'number')}
          ${field('lgR', 'tool_growth_rate_decimal', 'e.g. 0.1', 'number')}
          ${field('lgT', 'tool_time_elapsed', '', 'number')}
        `,
        calc: (out) => {
          const N0 = num('lgN0'), K = num('lgK'), r = num('lgR'), time = num('lgT');
          if (N0 === null || K === null || r === null || time === null || N0 === 0) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          const N = K / (1 + ((K - N0) / N0) * Math.exp(-r * time));
          out.innerHTML = resultCell(t('tool_final_population'), round(N, 3));
        }
      },
      {
        id: 'doublingTime',
        label: 'tool_doubling_time',
        render: () => `
          <p class="tool-hint">${t('tool_doubling_time_hint')}</p>
          ${field('dtRate', 'tool_growth_rate_percent', '%', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('dtTime', 'tool_doubling_time_value', '', 'number')}
        `,
        calc: (out) => {
          let rate = num('dtRate'), dTime = num('dtTime');
          if (rate === null && dTime === null) { out.innerHTML = errorBox(t('tool_err_onefield')); return; }
          if (dTime === null) dTime = (100 * Math.log(2)) / rate;
          else rate = (100 * Math.log(2)) / dTime;
          out.innerHTML =
            resultCell(t('tool_growth_rate_percent'), round(rate, 4) + '%') +
            resultCell(t('tool_doubling_time_value'), round(dTime, 4));
        }
      },
      {
        id: 'proteinSynthesisLength',
        label: 'tool_protein_synthesis',
        render: () => `
          <p class="tool-hint">${t('tool_protein_synthesis_hint')}</p>
          ${field('psMrnaLength', 'tool_mrna_length', 'nucleotides', 'number')}
        `,
        calc: (out) => {
          const length = num('psMrnaLength');
          if (length === null || length < 6) { out.innerHTML = errorBox(t('tool_err_mrna')); return; }
          const codons = Math.floor(length / 3);
          const aminoAcids = Math.max(codons - 1, 0);
          out.innerHTML =
            resultCell(t('tool_total_codons'), codons) +
            resultCell(t('tool_amino_acids_result'), aminoAcids);
        }
      },
      {
        id: 'pulsePressure',
        label: 'tool_pulse_pressure',
        render: () => `
          <p class="tool-hint">${t('tool_pulse_pressure_hint')}</p>
          ${field('ppSys', 'tool_systolic_bp', 'mmHg', 'number')}
          ${field('ppDia', 'tool_diastolic_bp', 'mmHg', 'number')}
        `,
        calc: (out) => {
          const sys = num('ppSys'), dia = num('ppDia');
          if (sys === null || dia === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_pulse_pressure_result'), round(sys - dia, 2) + ' mmHg');
        }
      },
      {
        id: 'minuteVentilation',
        label: 'tool_minute_ventilation',
        render: () => `
          <p class="tool-hint">${t('tool_minute_ventilation_hint')}</p>
          ${field('mvTidal', 'tool_tidal_volume', 'mL', 'number')}
          ${field('mvRate', 'tool_respiratory_rate', 'breaths/min', 'number')}
        `,
        calc: (out) => {
          const tv = num('mvTidal'), rr = num('mvRate');
          if (tv === null || rr === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const mv = tv * rr;
          out.innerHTML =
            resultCell(t('tool_minute_ventilation_result'), round(mv, 1) + ' mL/min') +
            resultCell(t('tool_minute_ventilation_liters'), round(mv / 1000, 3) + ' L/min');
        }
      },
      {
        id: 'q10TemperatureCoefficient',
        label: 'tool_q10',
        render: () => `
          <p class="tool-hint">${t('tool_q10_hint')}</p>
          ${field('q10R1', 'tool_rate_r1', '', 'number')}
          ${field('q10R2', 'tool_rate_r2', '', 'number')}
          ${field('q10T1', 'tool_temp_t1', '°C', 'number')}
          ${field('q10T2', 'tool_temp_t2', '°C', 'number')}
        `,
        calc: (out) => {
          const R1 = num('q10R1'), R2 = num('q10R2'), T1 = num('q10T1'), T2 = num('q10T2');
          if (R1 === null || R2 === null || T1 === null || T2 === null || R1 === 0 || T2 === T1) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          const q10 = Math.pow(R2 / R1, 10 / (T2 - T1));
          out.innerHTML = resultCell(t('tool_q10_result'), round(q10, 4));
        }
      },
      {
        id: 'markRecapture',
        label: 'tool_mark_recapture',
        render: () => `
          <p class="tool-hint">${t('tool_mark_recapture_hint')}</p>
          ${field('mrMarked', 'tool_marked_first_catch', '', 'number')}
          ${field('mrTotalSecond', 'tool_total_second_catch', '', 'number')}
          ${field('mrRecaptured', 'tool_recaptured_marked', '', 'number')}
        `,
        calc: (out) => {
          const M = num('mrMarked'), C = num('mrTotalSecond'), R = num('mrRecaptured');
          if (M === null || C === null || R === null || M <= 0 || C <= 0 || R <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          if (R > C || R > M) { out.innerHTML = errorBox(t('tool_err_mark_recapture')); return; }
          const N = (M * C) / R;
          out.innerHTML = resultCell(t('tool_estimated_population'), Math.round(N));
        }
      },
      {
        id: 'atpYield',
        label: 'tool_atp_yield',
        render: () => `
          <p class="tool-hint">${t('tool_atp_yield_hint')}</p>
          ${field('atpGlucose', 'tool_glucose_moles', 'mol', 'number')}
          ${selectField('atpType', 'tool_respiration_type', [
            { value: 'aerobic', label: t('tool_aerobic') },
            { value: 'anaerobic', label: t('tool_anaerobic') }
          ])}
        `,
        calc: (out) => {
          const glucose = num('atpGlucose');
          const type = str('atpType');
          if (glucose === null || glucose <= 0) { out.innerHTML = errorBox(t('tool_err_glucose')); return; }
          const perGlucose = type === 'anaerobic' ? 2 : 36;
          const total = glucose * perGlucose;
          out.innerHTML =
            resultCell(t('tool_atp_per_glucose'), perGlucose + ' ATP') +
            resultCell(t('tool_total_atp'), round(total, 3) + ' ATP');
        }
      },
      {
        id: 'predictedVitalCapacity',
        label: 'tool_vital_capacity',
        render: () => `
          <p class="tool-hint">${t('tool_vital_capacity_hint')}</p>
          ${field('vcAge', 'tool_age_years', 'years', 'number')}
          ${field('vcHeight', 'tool_height_cm', 'cm', 'number')}
          ${selectField('vcGender', 'tool_gender', [
            { value: 'male', label: t('tool_male') },
            { value: 'female', label: t('tool_female') }
          ])}
        `,
        calc: (out) => {
          const age = num('vcAge'), height = num('vcHeight');
          const gender = str('vcGender');
          if (age === null || height === null || age <= 0 || height <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const factor = gender === 'female' ? (21.78 - 0.101 * age) : (27.63 - 0.112 * age);
          const vcML = factor * height;
          out.innerHTML =
            resultCell(t('tool_predicted_vc'), round(vcML, 1) + ' mL') +
            resultCell(t('tool_predicted_vc_liters'), round(vcML / 1000, 3) + ' L');
        }
      },
      {
        id: 'bloodTypeInheritance',
        label: 'tool_blood_type_inheritance',
        render: () => `
          <p class="tool-hint">${t('tool_blood_type_hint')}</p>
          ${selectField('btParent1', 'tool_parent1_genotype', [
            { value: 'AA', label: t('tool_genotype_aa') },
            { value: 'AO', label: t('tool_genotype_ao') },
            { value: 'BB', label: t('tool_genotype_bb') },
            { value: 'BO', label: t('tool_genotype_bo') },
            { value: 'AB', label: t('tool_genotype_ab') },
            { value: 'OO', label: t('tool_genotype_oo') }
          ])}
          ${selectField('btParent2', 'tool_parent2_genotype', [
            { value: 'AA', label: t('tool_genotype_aa') },
            { value: 'AO', label: t('tool_genotype_ao') },
            { value: 'BB', label: t('tool_genotype_bb') },
            { value: 'BO', label: t('tool_genotype_bo') },
            { value: 'AB', label: t('tool_genotype_ab') },
            { value: 'OO', label: t('tool_genotype_oo') }
          ])}
        `,
        calc: (out) => {
          const alleleMap = {
            AA: ['A', 'A'], AO: ['A', 'O'], BB: ['B', 'B'],
            BO: ['B', 'O'], AB: ['A', 'B'], OO: ['O', 'O']
          };
          const g1 = alleleMap[str('btParent1')];
          const g2 = alleleMap[str('btParent2')];
          if (!g1 || !g2) { out.innerHTML = errorBox(t('tool_err_blood_type')); return; }
          function phenotype(pair) {
            const s = pair.slice().sort().join('');
            if (s === 'AA' || s === 'AO') return 'A';
            if (s === 'BB' || s === 'BO') return 'B';
            if (s === 'AB') return 'AB';
            return 'O';
          }
          const counts = {};
          g1.forEach(a => g2.forEach(b => {
            const p = phenotype([a, b]);
            counts[p] = (counts[p] || 0) + 1;
          }));
          const order = ['A', 'B', 'AB', 'O'];
          out.innerHTML = order
            .filter(p => counts[p])
            .map(p => resultCell(t('tool_blood_type') + ' ' + p, counts[p] + '/4'))
            .join('');
        }
      },
      {
        id: 'karvonenHeartRate',
        label: 'tool_karvonen_hr',
        render: () => `
          <p class="tool-hint">${t('tool_karvonen_hint')}</p>
          ${field('khrAge', 'tool_age_years', 'years', 'number')}
          ${field('khrResting', 'tool_resting_heart_rate', 'bpm', 'number')}
        `,
        calc: (out) => {
          const age = num('khrAge'), resting = num('khrResting');
          if (age === null || resting === null || age <= 0 || resting <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const maxHR = 220 - age;
          const hrr = maxHR - resting;
          const low = hrr * 0.5 + resting;
          const high = hrr * 0.85 + resting;
          out.innerHTML =
            resultCell(t('tool_max_hr'), round(maxHR, 0)) +
            resultCell(t('tool_heart_rate_reserve'), round(hrr, 0)) +
            resultCell(t('tool_karvonen_target_range'), round(low, 0) + ' - ' + round(high, 0));
        }
      },
      {
        id: 'dnaComplementTranscription',
        label: 'tool_dna_complement',
        render: () => `
          <p class="tool-hint">${t('tool_dna_complement_hint')}</p>
          ${field('dcStrand', 'tool_dna_strand', 'e.g. ATGCATTG', 'text')}
        `,
        calc: (out) => {
          const strand = str('dcStrand').toUpperCase().replace(/\s+/g, '');
          if (!strand || !/^[ATGC]+$/.test(strand)) { out.innerHTML = errorBox(t('tool_err_dna_strand')); return; }
          const compMap = { A: 'T', T: 'A', G: 'C', C: 'G' };
          const mrnaMap = { A: 'U', T: 'A', G: 'C', C: 'G' };
          const complement = strand.split('').map(b => compMap[b]).join('');
          const mrna = strand.split('').map(b => mrnaMap[b]).join('');
          out.innerHTML =
            resultCell(t('tool_complementary_strand'), complement) +
            resultCell(t('tool_mrna_transcript'), mrna);
        }
      },
      {
        id: 'codonTranslation',
        label: 'tool_codon_translation',
        render: () => `
          <p class="tool-hint">${t('tool_codon_translation_hint')}</p>
          ${field('ctCodon', 'tool_mrna_codon', 'e.g. AUG', 'text')}
        `,
        calc: (out) => {
          const codon = str('ctCodon').toUpperCase().replace(/\s+/g, '');
          const table = {
            UUU:'Phe',UUC:'Phe',UUA:'Leu',UUG:'Leu',CUU:'Leu',CUC:'Leu',CUA:'Leu',CUG:'Leu',
            AUU:'Ile',AUC:'Ile',AUA:'Ile',AUG:'Met (Start)',GUU:'Val',GUC:'Val',GUA:'Val',GUG:'Val',
            UCU:'Ser',UCC:'Ser',UCA:'Ser',UCG:'Ser',CCU:'Pro',CCC:'Pro',CCA:'Pro',CCG:'Pro',
            ACU:'Thr',ACC:'Thr',ACA:'Thr',ACG:'Thr',GCU:'Ala',GCC:'Ala',GCA:'Ala',GCG:'Ala',
            UAU:'Tyr',UAC:'Tyr',UAA:'Stop',UAG:'Stop',CAU:'His',CAC:'His',CAA:'Gln',CAG:'Gln',
            AAU:'Asn',AAC:'Asn',AAA:'Lys',AAG:'Lys',GAU:'Asp',GAC:'Asp',GAA:'Glu',GAG:'Glu',
            UGU:'Cys',UGC:'Cys',UGA:'Stop',UGG:'Trp',CGU:'Arg',CGC:'Arg',CGA:'Arg',CGG:'Arg',
            AGU:'Ser',AGC:'Ser',AGA:'Arg',AGG:'Arg',GGU:'Gly',GGC:'Gly',GGA:'Gly',GGG:'Gly'
          };
          if (!codon || codon.length !== 3 || !(codon in table)) { out.innerHTML = errorBox(t('tool_err_codon')); return; }
          out.innerHTML = resultCell(t('tool_amino_acid'), table[codon]);
        }
      },
      {
        id: 'tonicityClassifier',
        label: 'tool_tonicity',
        render: () => `
          <p class="tool-hint">${t('tool_tonicity_hint')}</p>
          ${field('tcInside', 'tool_solute_conc_inside', 'mol/L', 'number')}
          ${field('tcOutside', 'tool_solute_conc_outside', 'mol/L', 'number')}
        `,
        calc: (out) => {
          const inside = num('tcInside'), outside = num('tcOutside');
          if (inside === null || outside === null || inside < 0 || outside < 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          let result;
          if (Math.abs(inside - outside) < 1e-9) result = t('tool_isotonic');
          else if (outside > inside) result = t('tool_hypertonic_outside');
          else result = t('tool_hypotonic_outside');
          out.innerHTML = resultCell(t('tool_tonicity_result'), result);
        }
      },
      {
        id: 'creatinineClearance',
        label: 'tool_creatinine_clearance',
        render: () => `
          <p class="tool-hint">${t('tool_creatinine_clearance_hint')}</p>
          ${field('ccAge', 'tool_age_years', 'years', 'number')}
          ${field('ccWeight', 'tool_weight_kg', 'kg', 'number')}
          ${field('ccCreatinine', 'tool_serum_creatinine', 'mg/dL', 'number')}
          ${selectField('ccGender', 'tool_gender', [
            { value: 'male', label: t('tool_male') },
            { value: 'female', label: t('tool_female') }
          ])}
        `,
        calc: (out) => {
          const age = num('ccAge'), weight = num('ccWeight'), scr = num('ccCreatinine');
          const gender = str('ccGender');
          if (age === null || weight === null || scr === null || scr <= 0 || age <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          let crcl = ((140 - age) * weight) / (72 * scr);
          if (gender === 'female') crcl *= 0.85;
          out.innerHTML = resultCell(t('tool_creatinine_clearance'), round(crcl, 2) + ' mL/min');
        }
      },
      {
        id: 'bloodAlcoholConcentration',
        label: 'tool_bac',
        render: () => `
          <p class="tool-hint">${t('tool_bac_hint')}</p>
          ${field('bacGrams', 'tool_alcohol_grams', 'g', 'number')}
          ${field('bacWeight', 'tool_weight_kg', 'kg', 'number')}
          ${selectField('bacGender', 'tool_gender', [
            { value: 'male', label: t('tool_male') },
            { value: 'female', label: t('tool_female') }
          ])}
          ${field('bacHours', 'tool_hours_elapsed', 'hours', 'number')}
        `,
        calc: (out) => {
          const grams = num('bacGrams'), weight = num('bacWeight'), hours = num('bacHours') || 0;
          const gender = str('bacGender');
          if (grams === null || weight === null || weight <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const r = gender === 'female' ? 0.55 : 0.68;
          let bac = (grams / (weight * 1000 * r)) * 100 - (0.015 * hours);
          bac = Math.max(0, bac);
          out.innerHTML = resultCell(t('tool_bac_result'), round(bac, 4) + '%');
        }
      },
      {
        id: 'alleleFrequency',
        label: 'tool_allele_frequency',
        render: () => `
          <p class="tool-hint">${t('tool_allele_frequency_hint')}</p>
          ${field('afAA', 'tool_count_aa', 'e.g. 320', 'number')}
          ${field('afAa', 'tool_count_aa_het', 'e.g. 160', 'number')}
          ${field('afaa', 'tool_count_lowercase_aa', 'e.g. 20', 'number')}
        `,
        calc: (out) => {
          const AA = num('afAA'), Aa = num('afAa'), aa = num('afaa');
          if ([AA, Aa, aa].some(v => v === null) || AA < 0 || Aa < 0 || aa < 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const N = AA + Aa + aa;
          if (N === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const p = (2 * AA + Aa) / (2 * N);
          const q = (2 * aa + Aa) / (2 * N);
          out.innerHTML = resultCell(t('tool_allele_freq_p'), round(p, 4)) + resultCell(t('tool_allele_freq_q'), round(q, 4));
        }
      },
      {
        id: 'dihybridCross',
        label: 'tool_dihybrid_cross',
        render: () => `
          <p class="tool-hint">${t('tool_dihybrid_cross_hint')}</p>
          ${field('dhcTotal', 'tool_total_offspring', 'e.g. 160', 'number')}
        `,
        calc: (out) => {
          const total = num('dhcTotal');
          if (total === null || total <= 0) { out.innerHTML = errorBox(t('tool_err_1field')); return; }
          out.innerHTML =
            resultCell(t('tool_phenotype_dominant_dominant'), round(total * 9 / 16, 2)) +
            resultCell(t('tool_phenotype_dominant_recessive'), round(total * 3 / 16, 2)) +
            resultCell(t('tool_phenotype_recessive_dominant'), round(total * 3 / 16, 2)) +
            resultCell(t('tool_phenotype_recessive_recessive'), round(total * 1 / 16, 2));
        }
      },
      {
        id: 'enzymeTurnoverNumber',
        label: 'tool_enzyme_turnover',
        render: () => `
          <p class="tool-hint">${t('tool_enzyme_turnover_hint')}</p>
          ${field('etnVmax', 'tool_vmax_value', 'e.g. µmol/min', 'number')}
          ${field('etnEnzyme', 'tool_enzyme_conc', 'e.g. µmol', 'number')}
        `,
        calc: (out) => {
          const vmax = num('etnVmax'), enz = num('etnEnzyme');
          if (vmax === null || enz === null || enz <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_kcat_result'), round(vmax / enz, 4));
        }
      },
      {
        id: 'ejectionFraction',
        label: 'tool_ejection_fraction',
        render: () => `
          <p class="tool-hint">${t('tool_ejection_fraction_hint')}</p>
          ${field('efEdv', 'tool_end_diastolic_volume', 'mL', 'number')}
          ${field('efEsv', 'tool_end_systolic_volume', 'mL', 'number')}
        `,
        calc: (out) => {
          const edv = num('efEdv'), esv = num('efEsv');
          if (edv === null || esv === null || edv <= 0 || esv > edv) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const sv = edv - esv;
          const ef = (sv / edv) * 100;
          out.innerHTML = resultCell(t('tool_stroke_volume'), round(sv, 2) + ' mL') + resultCell(t('tool_ejection_fraction_result'), round(ef, 2) + '%');
        }
      },
      {
        id: 'netPrimaryProductivity',
        label: 'tool_net_primary_productivity',
        render: () => `
          <p class="tool-hint">${t('tool_net_primary_productivity_hint')}</p>
          ${field('nppGpp', 'tool_gross_primary_productivity', 'g/m²/yr', 'number')}
          ${field('nppR', 'tool_respiration_loss', 'g/m²/yr', 'number')}
        `,
        calc: (out) => {
          const gpp = num('nppGpp'), r = num('nppR');
          if (gpp === null || r === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_npp_result'), round(gpp - r, 3) + ' g/m²/yr');
        }
      },
      {
        id: 'effectivePopulationSize',
        label: 'tool_effective_population_size',
        render: () => `
          <p class="tool-hint">${t('tool_effective_population_size_hint')}</p>
          ${field('epsMales', 'tool_num_males', 'e.g. 40', 'number')}
          ${field('epsFemales', 'tool_num_females', 'e.g. 60', 'number')}
        `,
        calc: (out) => {
          const nm = num('epsMales'), nf = num('epsFemales');
          if (nm === null || nf === null || nm < 0 || nf < 0 || (nm + nf) === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const ne = (4 * nm * nf) / (nm + nf);
          out.innerHTML = resultCell(t('tool_effective_population_size_result'), round(ne, 2));
        }
      },
      {
        id: 'drugHalfLifeClearance',
        label: 'tool_drug_half_life',
        render: () => `
          <p class="tool-hint">${t('tool_drug_half_life_hint')}</p>
          ${field('dhlVd', 'tool_volume_of_distribution', 'L', 'number')}
          ${field('dhlCl', 'tool_drug_clearance', 'L/hr', 'number')}
        `,
        calc: (out) => {
          const Vd = num('dhlVd'), CL = num('dhlCl');
          if (Vd === null || CL === null || CL <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const halfLife = 0.693 * Vd / CL;
          const k = 0.693 / halfLife;
          out.innerHTML = resultCell(t('tool_drug_half_life_result'), round(halfLife, 3) + ' hr') + resultCell(t('tool_elimination_rate_constant'), round(k, 4) + ' /hr');
        }
      },
      {
        id: 'magnificationCalculator',
        label: 'tool_microscope_magnification',
        render: () => `
          <p class="tool-hint">${t('tool_microscope_magnification_hint')}</p>
          ${field('magObjective', 'tool_objective_power', 'e.g. 40', 'number')}
          ${field('magEyepiece', 'tool_eyepiece_power', 'e.g. 10', 'number')}
          ${field('magImageSize', 'tool_image_size_um', 'µm (optional)', 'number')}
        `,
        calc: (out) => {
          const obj = num('magObjective'), eye = num('magEyepiece'), imgSize = num('magImageSize');
          if (obj === null || eye === null || obj <= 0 || eye <= 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const totalMag = obj * eye;
          let html = resultCell(t('tool_total_magnification'), round(totalMag, 2) + 'x');
          if (imgSize !== null) html += resultCell(t('tool_actual_size'), round(imgSize / totalMag, 4) + ' µm');
          out.innerHTML = html;
        }
      },
      {
        id: 'totalDailyEnergyExpenditure',
        label: 'tool_tdee',
        render: () => `
          <p class="tool-hint">${t('tool_tdee_hint')}</p>
          ${field('tdeeBmr', 'tool_bmr_value', 'kcal/day', 'number')}
          ${selectField('tdeeActivity', 'tool_activity_level', [
            { value: '1.2', label: t('tool_activity_sedentary') },
            { value: '1.375', label: t('tool_activity_light') },
            { value: '1.55', label: t('tool_activity_moderate') },
            { value: '1.725', label: t('tool_activity_active') },
            { value: '1.9', label: t('tool_activity_very_active') }
          ])}
        `,
        calc: (out) => {
          const bmr = num('tdeeBmr'), factor = parseFloat(str('tdeeActivity'));
          if (bmr === null || bmr <= 0) { out.innerHTML = errorBox(t('tool_err_1field')); return; }
          out.innerHTML = resultCell(t('tool_tdee_result'), round(bmr * factor, 0) + ' kcal/day');
        }
      },
      {
        id: 'glycemicLoad',
        label: 'tool_glycemic_load',
        render: () => `
          <p class="tool-hint">${t('tool_glycemic_load_hint')}</p>
          ${field('glGi', 'tool_glycemic_index', '0 - 100', 'number')}
          ${field('glCarbs', 'tool_carbs_grams', 'g', 'number')}
        `,
        calc: (out) => {
          const gi = num('glGi'), carbs = num('glCarbs');
          if (gi === null || carbs === null || gi < 0 || gi > 100 || carbs < 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const gl = (gi * carbs) / 100;
          let category;
          if (gl < 10) category = t('tool_gl_low');
          else if (gl < 20) category = t('tool_gl_medium');
          else category = t('tool_gl_high');
          out.innerHTML = resultCell(t('tool_glycemic_load_result'), round(gl, 2)) + resultCell(t('tool_glycemic_load_category'), category);
        }
      }
    ],

    Commerce: [
      {
        id: 'interest',
        label: 'tool_interest',
        render: () => `
          ${field('intPrincipal', 'tool_principal', 'principal amount', 'number')}
          ${field('intRate', 'tool_rate_percent', 'annual rate (%)', 'number')}
          ${field('intTime', 'tool_time_years', 'time (years)', 'number')}
          ${selectField('intType', 'tool_interest_type', [
            { value: 'simple', label: t('tool_simple_interest') },
            { value: 'compound', label: t('tool_compound_interest') }
          ])}
        `,
        calc: (out) => {
          const P = num('intPrincipal'), r = num('intRate'), tYrs = num('intTime');
          const type = str('intType');
          if (P === null || r === null || tYrs === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          let interest, amount;
          if (type === 'compound') {
            amount = P * Math.pow(1 + r / 100, tYrs);
            interest = amount - P;
          } else {
            interest = (P * r * tYrs) / 100;
            amount = P + interest;
          }
          out.innerHTML = resultCell(t('tool_interest_earned'), round(interest, 2)) + resultCell(t('tool_total_amount'), round(amount, 2));
        }
      },
      {
        id: 'profitLoss',
        label: 'tool_profit_loss',
        render: () => `
          ${field('plCost', 'tool_cost_price', 'cost price', 'number')}
          ${field('plSell', 'tool_selling_price', 'selling price', 'number')}
        `,
        calc: (out) => {
          const cp = num('plCost'), sp = num('plSell');
          if (cp === null || sp === null || cp === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const diff = sp - cp;
          const pct = (diff / cp) * 100;
          const label = diff >= 0 ? t('tool_profit') : t('tool_loss');
          out.innerHTML = resultCell(label, round(Math.abs(diff), 2)) + resultCell(t('tool_percentage'), round(Math.abs(pct), 2) + '%');
        }
      },
      {
        id: 'depreciation',
        label: 'tool_depreciation',
        render: () => `
          ${field('depCost', 'tool_asset_cost', 'original cost', 'number')}
          ${field('depSalvage', 'tool_salvage_value', 'salvage value', 'number')}
          ${field('depLife', 'tool_useful_life', 'useful life (years)', 'number')}
          ${field('depRate', 'tool_dep_rate', 'declining balance rate % (optional)', 'number')}
        `,
        calc: (out) => {
          const cost = num('depCost'), salvage = num('depSalvage'), life = num('depLife');
          const rate = num('depRate');
          if (cost === null || life === null || life === 0) { out.innerHTML = errorBox(t('tool_err_costlife')); return; }
          let html = '';
          if (salvage !== null) {
            const slAnnual = (cost - salvage) / life;
            html += resultCell(t('tool_straight_line'), round(slAnnual, 2) + '/yr');
          }
          if (rate !== null) {
            const valueAfter = cost * Math.pow(1 - rate / 100, life);
            html += resultCell(t('tool_declining_balance'), round(valueAfter, 2));
          }
          if (!html) html = errorBox(t('tool_err_deprecation_fields'));
          out.innerHTML = html;
        }
      },
      {
        id: 'breakeven',
        label: 'tool_breakeven',
        render: () => `
          <p class="tool-hint">${t('tool_breakeven_hint')}</p>
          ${field('beFixed', 'tool_fixed_cost', '', 'number')}
          ${field('bePrice', 'tool_price_per_unit', '', 'number')}
          ${field('beVar', 'tool_variable_cost', '', 'number')}
        `,
        calc: (out) => {
          const fixed = num('beFixed'), price = num('bePrice'), varCost = num('beVar');
          if (fixed === null || price === null || varCost === null || price <= varCost) { out.innerHTML = errorBox(t('tool_err_breakeven')); return; }
          const units = fixed / (price - varCost);
          out.innerHTML =
            resultCell(t('tool_breakeven_units'), round(units, 2)) +
            resultCell(t('tool_breakeven_revenue'), round(units * price, 2));
        }
      },
      {
        id: 'markupMargin',
        label: 'tool_markup_margin',
        render: () => `
          <p class="tool-hint">${t('tool_markup_margin_hint')}</p>
          ${field('mmCost', 'tool_cost_price', '', 'number')}
          ${field('mmMarkup', 'tool_markup_percent', '%', 'number')}
          ${field('mmSell', 'tool_selling_price', '', 'number')}
        `,
        calc: (out) => {
          const cost = num('mmCost');
          let markup = num('mmMarkup'), sp = num('mmSell');
          if (cost === null || (markup === null && sp === null)) { out.innerHTML = errorBox(t('tool_err_markup')); return; }
          if (sp === null) sp = cost * (1 + markup / 100);
          else if (markup === null) markup = ((sp - cost) / cost) * 100;
          const margin = ((sp - cost) / sp) * 100;
          out.innerHTML =
            resultCell(t('tool_selling_price'), round(sp, 2)) +
            resultCell(t('tool_markup_percent'), round(markup, 2) + '%') +
            resultCell(t('tool_margin_percent'), round(margin, 2) + '%');
        }
      },
      {
        id: 'discount',
        label: 'tool_discount',
        render: () => `
          <p class="tool-hint">${t('tool_discount_hint')}</p>
          ${field('discOriginal', 'tool_original_price', '', 'number')}
          ${field('discPercent', 'tool_discount_percent', '%', 'number')}
        `,
        calc: (out) => {
          const orig = num('discOriginal'), pct = num('discPercent');
          if (orig === null || pct === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const amt = orig * pct / 100;
          out.innerHTML =
            resultCell(t('tool_discount_amount'), round(amt, 2)) +
            resultCell(t('tool_final_price'), round(orig - amt, 2));
        }
      },
      {
        id: 'salesTax',
        label: 'tool_sales_tax',
        render: () => `
          <p class="tool-hint">${t('tool_sales_tax_hint')}</p>
          ${field('taxAmount', 'tool_amount', '', 'number')}
          ${field('taxRate', 'tool_tax_rate', '%', 'number')}
        `,
        calc: (out) => {
          const amt = num('taxAmount'), rate = num('taxRate');
          if (amt === null || rate === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const taxVal = amt * rate / 100;
          out.innerHTML =
            resultCell(t('tool_tax_amount'), round(taxVal, 2)) +
            resultCell(t('tool_total_amount'), round(amt + taxVal, 2));
        }
      },
      {
        id: 'loanEMI',
        label: 'tool_loan_emi',
        render: () => `
          <p class="tool-hint">${t('tool_loan_emi_hint')}</p>
          ${field('emiPrincipal', 'tool_loan_principal', '', 'number')}
          ${field('emiRate', 'tool_annual_rate', '%', 'number')}
          ${field('emiTenure', 'tool_tenure_years', 'years', 'number')}
        `,
        calc: (out) => {
          const P = num('emiPrincipal'), annualRate = num('emiRate'), years = num('emiTenure');
          if (P === null || annualRate === null || years === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const r = annualRate / 12 / 100;
          const n = years * 12;
          let emi;
          if (r === 0) emi = P / n;
          else emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          const totalPayment = emi * n;
          out.innerHTML =
            resultCell(t('tool_monthly_emi'), round(emi, 2)) +
            resultCell(t('tool_total_payment'), round(totalPayment, 2)) +
            resultCell(t('tool_total_interest'), round(totalPayment - P, 2));
        }
      },
      {
        id: 'presentValue',
        label: 'tool_present_value',
        render: () => `
          <p class="tool-hint">${t('tool_present_value_hint')}</p>
          ${field('pvPV', 'tool_present_val', '', 'number')}
          ${field('pvFV', 'tool_future_val', '', 'number')}
          ${field('pvRate', 'tool_rate_percent', '%', 'number')}
          ${field('pvTime', 'tool_time_years', 'years', 'number')}
        `,
        calc: (out) => {
          let PV = num('pvPV'), FV = num('pvFV');
          const rate = num('pvRate'), years = num('pvTime');
          if (rate === null || years === null || (PV === null && FV === null)) { out.innerHTML = errorBox(t('tool_err_presentvalue')); return; }
          const factor = Math.pow(1 + rate / 100, years);
          if (FV === null) FV = PV * factor;
          else if (PV === null) PV = FV / factor;
          out.innerHTML =
            resultCell(t('tool_present_val'), round(PV, 2)) +
            resultCell(t('tool_future_val'), round(FV, 2));
        }
      },
      {
        id: 'currentRatio',
        label: 'tool_current_ratio',
        render: () => `
          <p class="tool-hint">${t('tool_current_ratio_hint')}</p>
          ${field('crAssets', 'tool_current_assets', '', 'number')}
          ${field('crLiabilities', 'tool_current_liabilities', '', 'number')}
          ${field('crInventory', 'tool_inventory', 'optional', 'number')}
        `,
        calc: (out) => {
          const assets = num('crAssets'), liabilities = num('crLiabilities'), inventory = num('crInventory');
          if (assets === null || liabilities === null || liabilities === 0) { out.innerHTML = errorBox(t('tool_err_currentratio')); return; }
          let html = resultCell(t('tool_current_ratio_result'), round(assets / liabilities, 3));
          if (inventory !== null) html += resultCell(t('tool_quick_ratio'), round((assets - inventory) / liabilities, 3));
          out.innerHTML = html;
        }
      },
      {
        id: 'cagr',
        label: 'tool_cagr',
        render: () => `
          <p class="tool-hint">${t('tool_cagr_hint')}</p>
          ${field('cagrBegin', 'tool_beginning_value', '', 'number')}
          ${field('cagrEnd', 'tool_ending_value', '', 'number')}
          ${field('cagrYears', 'tool_time_years', 'years', 'number')}
        `,
        calc: (out) => {
          const begin = num('cagrBegin'), end = num('cagrEnd'), years = num('cagrYears');
          if (begin === null || end === null || years === null || begin <= 0 || years === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const cagr = (Math.pow(end / begin, 1 / years) - 1) * 100;
          out.innerHTML = resultCell(t('tool_cagr_result'), round(cagr, 3) + '%');
        }
      },
      {
        id: 'inventoryTurnover',
        label: 'tool_inventory_turnover',
        render: () => `
          <p class="tool-hint">${t('tool_inventory_turnover_hint')}</p>
          ${field('itCogs', 'tool_cogs', '', 'number')}
          ${field('itAvgInv', 'tool_avg_inventory', '', 'number')}
        `,
        calc: (out) => {
          const cogs = num('itCogs'), avgInv = num('itAvgInv');
          if (cogs === null || avgInv === null || avgInv === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const turnover = cogs / avgInv;
          out.innerHTML =
            resultCell(t('tool_turnover_ratio'), round(turnover, 3)) +
            resultCell(t('tool_days_inventory'), round(365 / turnover, 1));
        }
      },
      {
        id: 'roi',
        label: 'tool_roi',
        render: () => `
          <p class="tool-hint">${t('tool_roi_hint')}</p>
          ${field('roiProfit', 'tool_net_profit', '', 'number')}
          ${field('roiCost', 'tool_investment_cost', '', 'number')}
        `,
        calc: (out) => {
          const profit = num('roiProfit'), cost = num('roiCost');
          if (profit === null || cost === null || cost === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_roi_result'), round((profit / cost) * 100, 2) + '%');
        }
      },
      {
        id: 'debtEquity',
        label: 'tool_debt_equity',
        render: () => `
          <p class="tool-hint">${t('tool_debt_equity_hint')}</p>
          ${field('deLiabilities', 'tool_total_liabilities', '', 'number')}
          ${field('deEquity', 'tool_shareholders_equity', '', 'number')}
        `,
        calc: (out) => {
          const liab = num('deLiabilities'), equity = num('deEquity');
          if (liab === null || equity === null || equity === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_debt_equity_result'), round(liab / equity, 3));
        }
      },
      {
        id: 'paybackPeriod',
        label: 'tool_payback_period',
        render: () => `
          <p class="tool-hint">${t('tool_payback_period_hint')}</p>
          ${field('ppInvestment', 'tool_initial_investment', '', 'number')}
          ${field('ppCashFlow', 'tool_annual_cash_flow', '', 'number')}
        `,
        calc: (out) => {
          const investment = num('ppInvestment'), cashFlow = num('ppCashFlow');
          if (investment === null || cashFlow === null || cashFlow === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_payback_result'), round(investment / cashFlow, 2));
        }
      },
      {
        id: 'futureValueAnnuity',
        label: 'tool_future_value_annuity',
        render: () => `
          <p class="tool-hint">${t('tool_fva_hint')}</p>
          ${field('fvaPmt', 'tool_payment_amount', '', 'number')}
          ${field('fvaRate', 'tool_rate_per_period', '%', 'number')}
          ${field('fvaN', 'tool_number_periods', '', 'number')}
        `,
        calc: (out) => {
          const pmt = num('fvaPmt'), ratePct = num('fvaRate'), n = num('fvaN');
          if (pmt === null || ratePct === null || n === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const r = ratePct / 100;
          const fv = r === 0 ? pmt * n : pmt * ((Math.pow(1 + r, n) - 1) / r);
          const contributions = pmt * n;
          out.innerHTML =
            resultCell(t('tool_future_value_result'), round(fv, 2)) +
            resultCell(t('tool_total_contributions'), round(contributions, 2)) +
            resultCell(t('tool_interest_earned'), round(fv - contributions, 2));
        }
      },
      {
        id: 'effectiveAnnualRate',
        label: 'tool_effective_annual_rate',
        render: () => `
          <p class="tool-hint">${t('tool_ear_hint')}</p>
          ${field('earNominal', 'tool_nominal_rate', '%', 'number')}
          ${field('earN', 'tool_compounding_periods', 'e.g. 12', 'number')}
        `,
        calc: (out) => {
          const nominal = num('earNominal'), n = num('earN');
          if (nominal === null || n === null || n === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const i = nominal / 100;
          const ear = (Math.pow(1 + i / n, n) - 1) * 100;
          out.innerHTML = resultCell(t('tool_ear_result'), round(ear, 4) + '%');
        }
      },
      {
        id: 'bondValuation',
        label: 'tool_bond_valuation',
        render: () => `
          <p class="tool-hint">${t('tool_bond_valuation_hint')}</p>
          ${field('bondFace', 'tool_face_value', '', 'number')}
          ${field('bondCoupon', 'tool_coupon_rate', '%', 'number')}
          ${field('bondMarket', 'tool_market_rate', '%', 'number')}
          ${field('bondYears', 'tool_years_maturity', 'years', 'number')}
        `,
        calc: (out) => {
          const F = num('bondFace'), couponPct = num('bondCoupon'), marketPct = num('bondMarket'), n = num('bondYears');
          if (F === null || couponPct === null || marketPct === null || n === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const C = F * (couponPct / 100);
          const r = marketPct / 100;
          const price = r === 0
            ? C * n + F
            : C * ((1 - Math.pow(1 + r, -n)) / r) + F / Math.pow(1 + r, n);
          out.innerHTML = resultCell(t('tool_bond_price_result'), round(price, 2));
        }
      },
      {
        id: 'netPresentValue',
        label: 'tool_net_present_value',
        render: () => `
          <p class="tool-hint">${t('tool_npv_hint')}</p>
          ${field('npvInvestment', 'tool_initial_investment', '', 'number')}
          ${field('npvCashFlow', 'tool_future_cash_flow', '', 'number')}
          ${field('npvRate', 'tool_discount_rate', '%', 'number')}
          ${field('npvYears', 'tool_time_years', 'years', 'number')}
        `,
        calc: (out) => {
          const investment = num('npvInvestment'), fv = num('npvCashFlow'), ratePct = num('npvRate'), years = num('npvYears');
          if (investment === null || fv === null || ratePct === null || years === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const pv = fv / Math.pow(1 + ratePct / 100, years);
          const npv = pv - investment;
          out.innerHTML =
            resultCell(t('tool_present_val'), round(pv, 2)) +
            resultCell(t('tool_npv_result'), round(npv, 2));
        }
      },
      {
        id: 'returnOnEquity',
        label: 'tool_return_on_equity',
        render: () => `
          <p class="tool-hint">${t('tool_roe_hint')}</p>
          ${field('roeIncome', 'tool_net_income', '', 'number')}
          ${field('roeEquity', 'tool_shareholders_equity', '', 'number')}
        `,
        calc: (out) => {
          const income = num('roeIncome'), equity = num('roeEquity');
          if (income === null || equity === null || equity === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_roe_result'), round((income / equity) * 100, 2) + '%');
        }
      },
      {
        id: 'returnOnAssets',
        label: 'tool_return_on_assets',
        render: () => `
          <p class="tool-hint">${t('tool_roa_hint')}</p>
          ${field('roaIncome', 'tool_net_income', '', 'number')}
          ${field('roaAssets', 'tool_total_assets', '', 'number')}
        `,
        calc: (out) => {
          const income = num('roaIncome'), assets = num('roaAssets');
          if (income === null || assets === null || assets === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_roa_result'), round((income / assets) * 100, 2) + '%');
        }
      },
      {
        id: 'grossProfitMargin',
        label: 'tool_gross_profit_margin',
        render: () => `
          <p class="tool-hint">${t('tool_gpm_hint')}</p>
          ${field('gpmSales', 'tool_net_sales', '', 'number')}
          ${field('gpmCogs', 'tool_cogs', '', 'number')}
        `,
        calc: (out) => {
          const sales = num('gpmSales'), cogs = num('gpmCogs');
          if (sales === null || cogs === null || sales === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const gp = sales - cogs;
          out.innerHTML =
            resultCell(t('tool_gross_profit'), round(gp, 2)) +
            resultCell(t('tool_gpm_result'), round((gp / sales) * 100, 2) + '%');
        }
      },
      {
        id: 'netProfitMargin',
        label: 'tool_net_profit_margin',
        render: () => `
          <p class="tool-hint">${t('tool_npm_hint')}</p>
          ${field('npmIncome', 'tool_net_income', '', 'number')}
          ${field('npmSales', 'tool_net_sales', '', 'number')}
        `,
        calc: (out) => {
          const income = num('npmIncome'), sales = num('npmSales');
          if (income === null || sales === null || sales === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_npm_result'), round((income / sales) * 100, 2) + '%');
        }
      },
      {
        id: 'workingCapital',
        label: 'tool_working_capital',
        render: () => `
          <p class="tool-hint">${t('tool_working_capital_hint')}</p>
          ${field('wcAssets', 'tool_current_assets', '', 'number')}
          ${field('wcLiabilities', 'tool_current_liabilities', '', 'number')}
        `,
        calc: (out) => {
          const assets = num('wcAssets'), liabilities = num('wcLiabilities');
          if (assets === null || liabilities === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_working_capital_result'), round(assets - liabilities, 2));
        }
      },
      {
        id: 'earningsPerShare',
        label: 'tool_eps',
        render: () => `
          <p class="tool-hint">${t('tool_eps_hint')}</p>
          ${field('epsIncome', 'tool_net_income', '', 'number')}
          ${field('epsPreferred', 'tool_preferred_dividends', 'optional', 'number')}
          ${field('epsShares', 'tool_shares_outstanding', '', 'number')}
        `,
        calc: (out) => {
          const income = num('epsIncome'), shares = num('epsShares');
          let preferred = num('epsPreferred');
          if (preferred === null) preferred = 0;
          if (income === null || shares === null || shares === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const eps = (income - preferred) / shares;
          out.innerHTML = resultCell(t('tool_eps_result'), round(eps, 3));
        }
      },
      {
        id: 'priceEarningsRatio',
        label: 'tool_pe_ratio',
        render: () => `
          <p class="tool-hint">${t('tool_pe_hint')}</p>
          ${field('peMarketPrice', 'tool_market_price', '', 'number')}
          ${field('peEps', 'tool_eps_value', '', 'number')}
        `,
        calc: (out) => {
          const price = num('peMarketPrice'), eps = num('peEps');
          if (price === null || eps === null || eps === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_pe_result'), round(price / eps, 2));
        }
      },
      {
        id: 'dividendYield',
        label: 'tool_dividend_yield',
        render: () => `
          <p class="tool-hint">${t('tool_dy_hint')}</p>
          ${field('dyDividend', 'tool_dividend_per_share', '', 'number')}
          ${field('dyPrice', 'tool_market_price', '', 'number')}
        `,
        calc: (out) => {
          const div = num('dyDividend'), price = num('dyPrice');
          if (div === null || price === null || price === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_dy_result'), round((div / price) * 100, 2) + '%');
        }
      },
      {
        id: 'receivablesTurnover',
        label: 'tool_receivables_turnover',
        render: () => `
          <p class="tool-hint">${t('tool_rt_hint')}</p>
          ${field('rtSales', 'tool_net_credit_sales', '', 'number')}
          ${field('rtAvgAR', 'tool_avg_receivables', '', 'number')}
        `,
        calc: (out) => {
          const sales = num('rtSales'), avgAR = num('rtAvgAR');
          if (sales === null || avgAR === null || avgAR === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const turnover = sales / avgAR;
          out.innerHTML =
            resultCell(t('tool_turnover_ratio'), round(turnover, 3)) +
            resultCell(t('tool_dso_result'), round(365 / turnover, 1));
        }
      },
      {
        id: 'assetTurnover',
        label: 'tool_asset_turnover',
        render: () => `
          <p class="tool-hint">${t('tool_at_hint')}</p>
          ${field('atSales', 'tool_net_sales', '', 'number')}
          ${field('atAssets', 'tool_total_assets', '', 'number')}
        `,
        calc: (out) => {
          const sales = num('atSales'), assets = num('atAssets');
          if (sales === null || assets === null || assets === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_at_result'), round(sales / assets, 3));
        }
      },
      {
        id: 'contributionMargin',
        label: 'tool_contribution_margin',
        render: () => `
          <p class="tool-hint">${t('tool_cm_hint')}</p>
          ${field('cmPrice', 'tool_price_per_unit', '', 'number')}
          ${field('cmVar', 'tool_variable_cost', '', 'number')}
        `,
        calc: (out) => {
          const price = num('cmPrice'), varCost = num('cmVar');
          if (price === null || varCost === null || price === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const cm = price - varCost;
          out.innerHTML =
            resultCell(t('tool_cm_per_unit'), round(cm, 2)) +
            resultCell(t('tool_cm_ratio'), round((cm / price) * 100, 2) + '%');
        }
      },
      {
        id: 'interestCoverageRatio',
        label: 'tool_interest_coverage',
        render: () => `
          <p class="tool-hint">${t('tool_icr_hint')}</p>
          ${field('icrEbit', 'tool_ebit', '', 'number')}
          ${field('icrInterest', 'tool_interest_expense', '', 'number')}
        `,
        calc: (out) => {
          const ebit = num('icrEbit'), interest = num('icrInterest');
          if (ebit === null || interest === null || interest === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_icr_result'), round(ebit / interest, 3));
        }
      },
      {
        id: 'ruleOf72',
        label: 'tool_rule_of_72',
        render: () => `
          <p class="tool-hint">${t('tool_rule72_hint')}</p>
          ${field('r72Rate', 'tool_rate_percent', '%', 'number')}
        `,
        calc: (out) => {
          const rate = num('r72Rate');
          if (rate === null || rate <= 0) { out.innerHTML = errorBox(t('tool_err_rate')); return; }
          out.innerHTML = resultCell(t('tool_years_to_double'), round(72 / rate, 2));
        }
      },
      {
        id: 'perpetuityValue',
        label: 'tool_perpetuity_value',
        render: () => `
          <p class="tool-hint">${t('tool_perpetuity_hint')}</p>
          ${field('perpPmt', 'tool_payment_amount', '', 'number')}
          ${field('perpRate', 'tool_discount_rate', '%', 'number')}
          ${field('perpGrowth', 'tool_perpetuity_growth_rate', 'optional, %', 'number')}
        `,
        calc: (out) => {
          const pmt = num('perpPmt'), ratePct = num('perpRate');
          let growthPct = num('perpGrowth');
          if (growthPct === null) growthPct = 0;
          if (pmt === null || ratePct === null || ratePct <= growthPct) { out.innerHTML = errorBox(t('tool_err_perpetuity')); return; }
          const r = ratePct / 100, g = growthPct / 100;
          const pv = pmt / (r - g);
          out.innerHTML = resultCell(t('tool_present_val'), round(pv, 2));
        }
      },
      {
        id: 'wacc',
        label: 'tool_wacc',
        render: () => `
          <p class="tool-hint">${t('tool_wacc_hint')}</p>
          ${field('waccEquity', 'tool_equity_value', '', 'number')}
          ${field('waccDebt', 'tool_debt_value', '', 'number')}
          ${field('waccCostEquity', 'tool_cost_of_equity', '%', 'number')}
          ${field('waccCostDebt', 'tool_cost_of_debt', '%', 'number')}
          ${field('waccTax', 'tool_tax_rate', '%', 'number')}
        `,
        calc: (out) => {
          const E = num('waccEquity'), D = num('waccDebt'), Re = num('waccCostEquity'), Rd = num('waccCostDebt'), tax = num('waccTax');
          if (E === null || D === null || Re === null || Rd === null || tax === null || (E + D) === 0) { out.innerHTML = errorBox(t('tool_err_5fields')); return; }
          const V = E + D;
          const wacc = (E / V) * Re + (D / V) * Rd * (1 - tax / 100);
          out.innerHTML = resultCell(t('tool_wacc_result'), round(wacc, 3) + '%');
        }
      },
      {
        id: 'realInterestRate',
        label: 'tool_real_interest_rate',
        render: () => `
          <p class="tool-hint">${t('tool_rir_hint')}</p>
          ${field('rirNominal', 'tool_nominal_rate', '%', 'number')}
          ${field('rirInflation', 'tool_inflation_rate', '%', 'number')}
        `,
        calc: (out) => {
          const nominalPct = num('rirNominal'), inflationPct = num('rirInflation');
          if (nominalPct === null || inflationPct === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const nominal = nominalPct / 100, inflation = inflationPct / 100;
          const real = ((1 + nominal) / (1 + inflation) - 1) * 100;
          out.innerHTML = resultCell(t('tool_rir_result'), round(real, 3) + '%');
        }
      },
      {
        id: 'zakatCalculator',
        label: 'tool_zakat',
        render: () => `
          <p class="tool-hint">${t('tool_zakat_hint')}</p>
          ${field('zkAssets', 'tool_total_zakatable_assets', '', 'number')}
          ${field('zkLiabilities', 'tool_deductible_liabilities', 'optional', 'number')}
          ${field('zkNisab', 'tool_nisab_threshold', 'optional', 'number')}
        `,
        calc: (out) => {
          const assets = num('zkAssets'), liabilities = num('zkLiabilities') || 0, nisab = num('zkNisab');
          if (assets === null) { out.innerHTML = errorBox(t('tool_err_1field')); return; }
          const net = assets - liabilities;
          let html = '';
          if (nisab !== null) {
            if (net < nisab) { out.innerHTML = resultCell(t('tool_zakat_below_nisab'), '0'); return; }
          }
          const zakat = net * 0.025;
          html = resultCell(t('tool_net_zakatable_wealth'), round(net, 2)) + resultCell(t('tool_zakat_payable'), round(zakat, 2));
          out.innerHTML = html;
        }
      },
      {
        id: 'marginOfSafety',
        label: 'tool_margin_of_safety',
        render: () => `
          <p class="tool-hint">${t('tool_mos_hint')}</p>
          ${field('mosActual', 'tool_actual_sales', '', 'number')}
          ${field('mosBreakeven', 'tool_breakeven_sales', '', 'number')}
        `,
        calc: (out) => {
          const actual = num('mosActual'), be = num('mosBreakeven');
          if (actual === null || be === null || actual === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const mos = actual - be;
          const mosPct = (mos / actual) * 100;
          out.innerHTML =
            resultCell(t('tool_margin_of_safety_result'), round(mos, 2)) +
            resultCell(t('tool_margin_of_safety_percent'), round(mosPct, 2) + '%');
        }
      },
      {
        id: 'sinkingFundPayment',
        label: 'tool_sinking_fund',
        render: () => `
          <p class="tool-hint">${t('tool_sinking_fund_hint')}</p>
          ${field('sfGoal', 'tool_future_value_goal', '', 'number')}
          ${field('sfRate', 'tool_rate_per_period', '%', 'number')}
          ${field('sfN', 'tool_number_periods', '', 'number')}
        `,
        calc: (out) => {
          const fv = num('sfGoal'), ratePct = num('sfRate'), n = num('sfN');
          if (fv === null || ratePct === null || n === null || n === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const r = ratePct / 100;
          const payment = r === 0 ? fv / n : fv * (r / (Math.pow(1 + r, n) - 1));
          out.innerHTML = resultCell(t('tool_sinking_fund_result'), round(payment, 2));
        }
      },
      {
        id: 'cashConversionCycle',
        label: 'tool_cash_conversion_cycle',
        render: () => `
          <p class="tool-hint">${t('tool_ccc_hint')}</p>
          ${field('cccDIO', 'tool_days_inventory_outstanding', 'days', 'number')}
          ${field('cccDSO', 'tool_days_sales_outstanding', 'days', 'number')}
          ${field('cccDPO', 'tool_days_payable_outstanding', 'days', 'number')}
        `,
        calc: (out) => {
          const dio = num('cccDIO'), dso = num('cccDSO'), dpo = num('cccDPO');
          if (dio === null || dso === null || dpo === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const ccc = dio + dso - dpo;
          out.innerHTML = resultCell(t('tool_ccc_result'), round(ccc, 1) + ' ' + t('tool_days_unit'));
        }
      },
      {
        id: 'degreeOperatingLeverage',
        label: 'tool_dol',
        render: () => `
          <p class="tool-hint">${t('tool_dol_hint')}</p>
          ${field('dolContribution', 'tool_total_contribution_margin', '', 'number')}
          ${field('dolEBIT', 'tool_operating_income', '', 'number')}
        `,
        calc: (out) => {
          const cm = num('dolContribution'), ebit = num('dolEBIT');
          if (cm === null || ebit === null || ebit === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const dol = cm / ebit;
          out.innerHTML = resultCell(t('tool_dol_result'), round(dol, 3));
        }
      },
      {
        id: 'economicOrderQuantity',
        label: 'tool_eoq',
        render: () => `
          <p class="tool-hint">${t('tool_eoq_hint')}</p>
          ${field('eoqDemand', 'tool_annual_demand_units', '', 'number')}
          ${field('eoqOrderCost', 'tool_ordering_cost_per_order', '', 'number')}
          ${field('eoqHoldingCost', 'tool_holding_cost_per_unit', '', 'number')}
        `,
        calc: (out) => {
          const D = num('eoqDemand'), S = num('eoqOrderCost'), H = num('eoqHoldingCost');
          if (D === null || S === null || H === null || D <= 0 || S <= 0 || H <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const eoq = Math.sqrt((2 * D * S) / H);
          const ordersPerYear = D / eoq;
          out.innerHTML = resultCell(t('tool_eoq_result'), round(eoq, 2)) + resultCell(t('tool_orders_per_year'), round(ordersPerYear, 2));
        }
      },
      {
        id: 'targetProfitBreakeven',
        label: 'tool_target_profit_breakeven',
        render: () => `
          <p class="tool-hint">${t('tool_target_profit_breakeven_hint')}</p>
          ${field('tpbFixed', 'tool_fixed_cost', '', 'number')}
          ${field('tpbTargetProfit', 'tool_target_profit', '', 'number')}
          ${field('tpbPrice', 'tool_price_per_unit', '', 'number')}
          ${field('tpbVar', 'tool_variable_cost', '', 'number')}
        `,
        calc: (out) => {
          const fixed = num('tpbFixed'), target = num('tpbTargetProfit'), price = num('tpbPrice'), varCost = num('tpbVar');
          if ([fixed, target, price, varCost].some(v => v === null) || price <= varCost) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          const units = (fixed + target) / (price - varCost);
          out.innerHTML = resultCell(t('tool_target_profit_units'), round(units, 2)) + resultCell(t('tool_target_profit_revenue'), round(units * price, 2));
        }
      },
      {
        id: 'effectiveTaxRate',
        label: 'tool_effective_tax_rate',
        render: () => `
          <p class="tool-hint">${t('tool_effective_tax_rate_hint')}</p>
          ${field('etrTax', 'tool_total_tax_paid', '', 'number')}
          ${field('etrIncome', 'tool_taxable_income', '', 'number')}
        `,
        calc: (out) => {
          const tax = num('etrTax'), income = num('etrIncome');
          if (tax === null || income === null || income === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_effective_tax_rate_result'), round((tax / income) * 100, 3) + '%');
        }
      },
      {
        id: 'operatingMargin',
        label: 'tool_operating_margin',
        render: () => `
          <p class="tool-hint">${t('tool_operating_margin_hint')}</p>
          ${field('omIncome', 'tool_operating_income', '', 'number')}
          ${field('omSales', 'tool_net_sales', '', 'number')}
        `,
        calc: (out) => {
          const income = num('omIncome'), sales = num('omSales');
          if (income === null || sales === null || sales === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_operating_margin_result'), round((income / sales) * 100, 2) + '%');
        }
      },
      {
        id: 'freeCashFlow',
        label: 'tool_free_cash_flow',
        render: () => `
          <p class="tool-hint">${t('tool_free_cash_flow_hint')}</p>
          ${field('fcfOperating', 'tool_operating_cash_flow', '', 'number')}
          ${field('fcfCapex', 'tool_capital_expenditures', '', 'number')}
        `,
        calc: (out) => {
          const ocf = num('fcfOperating'), capex = num('fcfCapex');
          if (ocf === null || capex === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell(t('tool_free_cash_flow_result'), round(ocf - capex, 2));
        }
      },
      {
        id: 'costOfGoodsSold',
        label: 'tool_cogs',
        render: () => `
          <p class="tool-hint">${t('tool_cogs_hint')}</p>
          ${field('cogsBeginInv', 'tool_beginning_inventory', '', 'number')}
          ${field('cogsPurchases', 'tool_purchases', '', 'number')}
          ${field('cogsEndInv', 'tool_ending_inventory', '', 'number')}
        `,
        calc: (out) => {
          const begin = num('cogsBeginInv'), purchases = num('cogsPurchases'), end = num('cogsEndInv');
          if (begin === null || purchases === null || end === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          out.innerHTML = resultCell(t('tool_cogs_result'), round(begin + purchases - end, 2));
        }
      },
      {
        id: 'weightedAverageCost',
        label: 'tool_weighted_avg_cost',
        render: () => `
          <p class="tool-hint">${t('tool_weighted_avg_cost_hint')}</p>
          ${field('wacQty1', 'tool_batch_qty_1', '', 'number')}
          ${field('wacCost1', 'tool_batch_unit_cost_1', '', 'number')}
          ${field('wacQty2', 'tool_batch_qty_2', '', 'number')}
          ${field('wacCost2', 'tool_batch_unit_cost_2', '', 'number')}
          ${field('wacQty3', 'tool_batch_qty_3', 'optional', 'number')}
          ${field('wacCost3', 'tool_batch_unit_cost_3', 'optional', 'number')}
        `,
        calc: (out) => {
          const q1 = num('wacQty1'), c1 = num('wacCost1'), q2 = num('wacQty2'), c2 = num('wacCost2');
          const q3 = num('wacQty3'), c3 = num('wacCost3');
          if ([q1, c1, q2, c2].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          let totalQty = q1 + q2, totalCost = q1 * c1 + q2 * c2;
          if (q3 !== null && c3 !== null) { totalQty += q3; totalCost += q3 * c3; }
          if (totalQty === 0) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          out.innerHTML = resultCell(t('tool_weighted_avg_cost_result'), round(totalCost / totalQty, 4));
        }
      },
      {
        id: 'priceElasticityOfDemand',
        label: 'tool_ped',
        render: () => `
          <p class="tool-hint">${t('tool_ped_hint')}</p>
          ${field('pedPriceInitial', 'tool_initial_price', '', 'number')}
          ${field('pedPriceFinal', 'tool_final_price', '', 'number')}
          ${field('pedQtyInitial', 'tool_initial_quantity', '', 'number')}
          ${field('pedQtyFinal', 'tool_final_quantity', '', 'number')}
        `,
        calc: (out) => {
          const p0 = num('pedPriceInitial'), p1 = num('pedPriceFinal'), q0 = num('pedQtyInitial'), q1 = num('pedQtyFinal');
          if ([p0, p1, q0, q1].some(v => v === null) || p0 === 0 || q0 === 0) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          const pctQty = ((q1 - q0) / q0) * 100;
          const pctPrice = ((p1 - p0) / p0) * 100;
          if (pctPrice === 0) { out.innerHTML = errorBox(t('tool_err_ped_price')); return; }
          const ped = pctQty / pctPrice;
          const absPed = Math.abs(ped);
          let classification;
          if (absPed > 1) classification = t('tool_ped_elastic');
          else if (absPed < 1) classification = t('tool_ped_inelastic');
          else classification = t('tool_ped_unit_elastic');
          out.innerHTML = resultCell(t('tool_ped_result'), round(ped, 4)) + resultCell(t('tool_ped_classification'), classification);
        }
      },
      {
        id: 'loanAmortizationSplit',
        label: 'tool_amortization_split',
        render: () => `
          <p class="tool-hint">${t('tool_amortization_split_hint')}</p>
          ${field('lasPrincipal', 'tool_loan_principal', '', 'number')}
          ${field('lasRate', 'tool_annual_rate_percent', '%', 'number')}
          ${field('lasTotalMonths', 'tool_loan_term_months', '', 'number')}
          ${field('lasPaymentNum', 'tool_payment_number', 'e.g. 12', 'number')}
        `,
        calc: (out) => {
          const P = num('lasPrincipal'), annualRate = num('lasRate'), N = num('lasTotalMonths'), n = num('lasPaymentNum');
          if ([P, annualRate, N, n].some(v => v === null) || N <= 0 || n < 1 || n > N) { out.innerHTML = errorBox(t('tool_err_4fields')); return; }
          const i = annualRate / 100 / 12;
          let interestPortion, principalPortion, payment;
          if (i === 0) {
            payment = P / N;
            interestPortion = 0;
            principalPortion = payment;
          } else {
            payment = P * i / (1 - Math.pow(1 + i, -N));
            const balanceBefore = P * Math.pow(1 + i, n - 1) - payment * ((Math.pow(1 + i, n - 1) - 1) / i);
            interestPortion = balanceBefore * i;
            principalPortion = payment - interestPortion;
          }
          out.innerHTML =
            resultCell(t('tool_monthly_payment'), round(payment, 2)) +
            resultCell(t('tool_principal_portion'), round(principalPortion, 2)) +
            resultCell(t('tool_interest_portion'), round(interestPortion, 2));
        }
      },
      {
        id: 'realValueOfMoney',
        label: 'tool_real_value_money',
        render: () => `
          <p class="tool-hint">${t('tool_real_value_money_hint')}</p>
          ${field('rvmFuture', 'tool_future_amount', '', 'number')}
          ${field('rvmInflation', 'tool_inflation_rate_percent', '%', 'number')}
          ${field('rvmYears', 'tool_num_years', '', 'number')}
        `,
        calc: (out) => {
          const fv = num('rvmFuture'), infl = num('rvmInflation'), years = num('rvmYears');
          if (fv === null || infl === null || years === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const realValue = fv / Math.pow(1 + infl / 100, years);
          out.innerHTML = resultCell(t('tool_real_value_result'), round(realValue, 2));
        }
      }
    ],

    Math: [
      {
        id: 'permcomb',
        label: 'tool_permcomb',
        render: () => `
          ${field('pcN', 'tool_n_value', 'n', 'number')}
          ${field('pcR', 'tool_r_value', 'r', 'number')}
        `,
        calc: (out) => {
          const n = num('pcN'), r = num('pcR');
          if (n === null || r === null || n < 0 || r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) {
            out.innerHTML = errorBox(t('tool_err_nr'));
            return;
          }
          if (n > 170) { out.innerHTML = errorBox(t('tool_err_toolarge')); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const nPr = fact(n) / fact(n - r);
          const nCr = nPr / fact(r);
          out.innerHTML = resultCell('nPr', nPr) + resultCell('nCr', nCr);
        }
      },
      {
        id: 'baseConv',
        label: 'tool_base_converter',
        render: () => `
          ${field('bcValue', 'tool_value_to_convert', 'e.g. 255')}
          ${selectField('bcFrom', 'tool_from_base', [
            { value: '10', label: t('tool_decimal') },
            { value: '2', label: t('tool_binary') },
            { value: '8', label: t('tool_octal') },
            { value: '16', label: t('tool_hex') }
          ])}
        `,
        calc: (out) => {
          const val = str('bcValue');
          const fromBase = parseInt(str('bcFrom'), 10);
          if (!val) { out.innerHTML = errorBox(t('tool_err_value')); return; }
          const dec = parseInt(val, fromBase);
          if (isNaN(dec)) { out.innerHTML = errorBox(t('tool_err_invalid_for_base')); return; }
          out.innerHTML =
            resultCell(t('tool_decimal'), dec.toString(10)) +
            resultCell(t('tool_binary'), dec.toString(2)) +
            resultCell(t('tool_octal'), dec.toString(8)) +
            resultCell(t('tool_hex'), dec.toString(16).toUpperCase());
        }
      },
      {
        id: 'vector',
        label: 'tool_vector',
        render: () => `
          <p class="tool-hint">${t('tool_vector_hint')}</p>
          <div class="tool-vector-row">
            ${field('vAx', 'tool_ax', 'Ax', 'number')}
            ${field('vAy', 'tool_ay', 'Ay', 'number')}
            ${field('vAz', 'tool_az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('vBx', 'tool_bx', 'Bx', 'number')}
            ${field('vBy', 'tool_by', 'By', 'number')}
            ${field('vBz', 'tool_bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('vAx'), ay = num('vAy'), az = num('vAz') || 0;
          const bx = num('vBx'), by = num('vBy'), bz = num('vBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const dot = ax * bx + ay * by + az * bz;
          const cross = { x: ay * bz - az * by, y: az * bx - ax * bz, z: ax * by - ay * bx };
          const magA = Math.sqrt(ax * ax + ay * ay + az * az);
          const magB = Math.sqrt(bx * bx + by * by + bz * bz);
          const cosAngle = dot / (magA * magB);
          const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
          out.innerHTML =
            resultCell(t('tool_dot_product'), round(dot, 4)) +
            resultCell(t('tool_cross_product'), `(${round(cross.x, 3)}, ${round(cross.y, 3)}, ${round(cross.z, 3)})`) +
            resultCell('|A|', round(magA, 4)) +
            resultCell('|B|', round(magB, 4)) +
            resultCell(t('tool_angle_between'), round(angle, 2) + '°');
        }
      },
      {
        id: 'quadratic',
        label: 'tool_quadratic',
        render: () => `
          <p class="tool-hint">${t('tool_quadratic_hint')}</p>
          ${field('qA', 'tool_coeff_a', 'a', 'number')}
          ${field('qB', 'tool_coeff_b', 'b', 'number')}
          ${field('qC', 'tool_coeff_c', 'c', 'number')}
        `,
        calc: (out) => {
          const a = num('qA'), b = num('qB'), c = num('qC');
          if (a === null || b === null || c === null || a === 0) { out.innerHTML = errorBox(t('tool_err_quadratic')); return; }
          const disc = b * b - 4 * a * c;
          let html = resultCell(t('tool_discriminant'), round(disc, 4));
          if (disc >= 0) {
            const sqrtDisc = Math.sqrt(disc);
            html += resultCell(t('tool_root1'), round((-b + sqrtDisc) / (2 * a), 5));
            html += resultCell(t('tool_root2'), round((-b - sqrtDisc) / (2 * a), 5));
          } else {
            const re = round(-b / (2 * a), 5);
            const im = round(Math.sqrt(-disc) / (2 * a), 5);
            html += resultCell(t('tool_root1'), `${re} + ${im}i`);
            html += resultCell(t('tool_root2'), `${re} - ${im}i`);
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'matrix2x2',
        label: 'tool_matrix2x2',
        render: () => `
          <p class="tool-hint">${t('tool_matrix2x2_hint')}</p>
          <div class="tool-vector-row">
            ${field('m11', 'tool_m11', '', 'number')}
            ${field('m12', 'tool_m12', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('m21', 'tool_m21', '', 'number')}
            ${field('m22', 'tool_m22', '', 'number')}
          </div>
        `,
        calc: (out) => {
          const a = num('m11'), b = num('m12'), c = num('m21'), d = num('m22');
          if (a === null || b === null || c === null || d === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const det = a * d - b * c;
          let html = resultCell(t('tool_determinant'), round(det, 5));
          if (det === 0) html += errorBox(t('tool_err_matrix_singular'));
          else {
            const inv = `[${round(d / det, 4)}, ${round(-b / det, 4)}; ${round(-c / det, 4)}, ${round(a / det, 4)}]`;
            html += resultCell(t('tool_inverse'), inv);
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'statsCalc',
        label: 'tool_stats_calc',
        render: () => `
          <p class="tool-hint">${t('tool_stats_hint')}</p>
          ${field('statsData', 'tool_data_values', 'e.g. 4, 8, 15, 16, 23, 42')}
        `,
        calc: (out) => {
          const raw = str('statsData');
          const nums = raw.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
          if (nums.length < 2) { out.innerHTML = errorBox(t('tool_err_statsdata')); return; }
          const n = nums.length;
          const mean = nums.reduce((a, b) => a + b, 0) / n;
          const sorted = [...nums].sort((a, b) => a - b);
          const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2];
          const freq = {};
          nums.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
          let modeVal = nums[0], modeCount = 0;
          Object.keys(freq).forEach(k => { if (freq[k] > modeCount) { modeCount = freq[k]; modeVal = k; } });
          const variance = nums.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
          const stdDev = Math.sqrt(variance);
          out.innerHTML =
            resultCell(t('tool_mean'), round(mean, 4)) +
            resultCell(t('tool_median'), round(median, 4)) +
            resultCell(t('tool_mode'), modeCount > 1 ? modeVal : '—') +
            resultCell(t('tool_std_dev'), round(stdDev, 4));
        }
      },
      {
        id: 'logExp',
        label: 'tool_log_exp',
        render: () => `
          <p class="tool-hint">${t('tool_log_exp_hint')}</p>
          ${field('leValue', 'tool_log_value', '', 'number')}
          ${field('leBase', 'tool_log_base', '10', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('lePowerBase', 'tool_exp_base', '', 'number')}
          ${field('lePowerExp', 'tool_exp_exponent', '', 'number')}
        `,
        calc: (out) => {
          const value = num('leValue'), base = num('leBase') || 10;
          const powerBase = num('lePowerBase'), powerExp = num('lePowerExp');
          let html = '';
          if (value !== null && value > 0) html += resultCell(t('tool_log_result'), round(Math.log(value) / Math.log(base), 5));
          if (powerBase !== null && powerExp !== null) html += resultCell(t('tool_exp_result'), round(Math.pow(powerBase, powerExp), 5));
          if (!html) { out.innerHTML = errorBox(t('tool_err_logexp')); return; }
          out.innerHTML = html;
        }
      },
      {
        id: 'trigRatios',
        label: 'tool_trig_ratios',
        render: () => `
          <p class="tool-hint">${t('tool_trig_ratios_hint')}</p>
          ${field('trAngle', 'tool_angle_deg', 'e.g. 30', 'number')}
        `,
        calc: (out) => {
          const angle = num('trAngle');
          if (angle === null) { out.innerHTML = errorBox(t('tool_err_angle')); return; }
          const rad = angle * Math.PI / 180;
          const sin = Math.sin(rad), cos = Math.cos(rad), tan = Math.tan(rad);
          out.innerHTML =
            resultCell(t('tool_sin'), round(sin, 5)) +
            resultCell(t('tool_cos'), round(cos, 5)) +
            resultCell(t('tool_tan'), Math.abs(cos) < 1e-10 ? '∞' : round(tan, 5)) +
            resultCell(t('tool_cot'), Math.abs(sin) < 1e-10 ? '∞' : round(cos / sin, 5)) +
            resultCell(t('tool_sec'), Math.abs(cos) < 1e-10 ? '∞' : round(1 / cos, 5)) +
            resultCell(t('tool_cosec'), Math.abs(sin) < 1e-10 ? '∞' : round(1 / sin, 5));
        }
      },
      {
        id: 'sequence',
        label: 'tool_sequence',
        render: () => `
          <p class="tool-hint">${t('tool_sequence_hint')}</p>
          ${field('seqFirst', 'tool_first_term', 'a', 'number')}
          ${field('seqCommon', 'tool_common_diff_ratio', 'd or r', 'number')}
          ${field('seqN', 'tool_term_number', 'n', 'number')}
          ${selectField('seqType', 'tool_sequence_type', [
            { value: 'arithmetic', label: t('tool_arithmetic') },
            { value: 'geometric', label: t('tool_geometric') }
          ])}
        `,
        calc: (out) => {
          const a = num('seqFirst'), d = num('seqCommon'), n = num('seqN');
          const type = str('seqType');
          if (a === null || d === null || n === null || !Number.isInteger(n) || n < 1) { out.innerHTML = errorBox(t('tool_err_sequence')); return; }
          let nthTerm, sum;
          if (type === 'geometric') {
            nthTerm = a * Math.pow(d, n - 1);
            sum = d === 1 ? a * n : a * (1 - Math.pow(d, n)) / (1 - d);
          } else {
            nthTerm = a + (n - 1) * d;
            sum = (n / 2) * (2 * a + (n - 1) * d);
          }
          out.innerHTML =
            resultCell(t('tool_nth_term'), round(nthTerm, 5)) +
            resultCell(t('tool_sum_n_terms'), round(sum, 5));
        }
      },
      {
        id: 'complexNumber',
        label: 'tool_complex_number',
        render: () => `
          <p class="tool-hint">${t('tool_complex_number_hint')}</p>
          <div class="tool-vector-row">
            ${field('c1Re', 'tool_re1', '', 'number')}
            ${field('c1Im', 'tool_im1', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('c2Re', 'tool_re2', 'optional', 'number')}
            ${field('c2Im', 'tool_im2', 'optional', 'number')}
          </div>
        `,
        calc: (out) => {
          const re1 = num('c1Re'), im1 = num('c1Im');
          const re2 = num('c2Re'), im2 = num('c2Im');
          if (re1 === null || im1 === null) { out.innerHTML = errorBox(t('tool_err_complex')); return; }
          const modulus = Math.sqrt(re1 * re1 + im1 * im1);
          const argument = Math.atan2(im1, re1) * 180 / Math.PI;
          let html =
            resultCell(t('tool_modulus'), round(modulus, 5)) +
            resultCell(t('tool_argument'), round(argument, 3) + '°');
          if (re2 !== null && im2 !== null) {
            const sumRe = re1 + re2, sumIm = im1 + im2;
            const prodRe = re1 * re2 - im1 * im2, prodIm = re1 * im2 + im1 * re2;
            html += resultCell(t('tool_sum'), `${round(sumRe, 4)} + ${round(sumIm, 4)}i`);
            html += resultCell(t('tool_product'), `${round(prodRe, 4)} + ${round(prodIm, 4)}i`);
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'gcdLcm',
        label: 'tool_gcd_lcm',
        render: () => `
          <p class="tool-hint">${t('tool_gcd_lcm_hint')}</p>
          ${field('glA', 'tool_number_a', '', 'number')}
          ${field('glB', 'tool_number_b', '', 'number')}
        `,
        calc: (out) => {
          const a = num('glA'), b = num('glB');
          if (a === null || b === null || !Number.isInteger(a) || !Number.isInteger(b) || a === 0 || b === 0) { out.innerHTML = errorBox(t('tool_err_gcdlcm')); return; }
          out.innerHTML =
            resultCell(t('tool_gcd_result'), gcd(a, b)) +
            resultCell(t('tool_lcm_result'), lcm(a, b));
        }
      },
      {
        id: 'primeFactorization',
        label: 'tool_prime_factorization',
        render: () => `
          <p class="tool-hint">${t('tool_prime_factorization_hint')}</p>
          ${field('pfNumber', 'tool_number_value', '', 'number')}
        `,
        calc: (out) => {
          let n = num('pfNumber');
          if (n === null || !Number.isInteger(n) || n < 2) { out.innerHTML = errorBox(t('tool_err_prime')); return; }
          const factors = [];
          let d = 2;
          while (d * d <= n) {
            while (n % d === 0) { factors.push(d); n /= d; }
            d++;
          }
          if (n > 1) factors.push(n);
          const grouped = {};
          factors.forEach(f => { grouped[f] = (grouped[f] || 0) + 1; });
          const formatted = Object.keys(grouped).map(f => grouped[f] > 1 ? `${f}<sup>${grouped[f]}</sup>` : f).join(' × ');
          out.innerHTML = resultCell(t('tool_prime_factors'), formatted);
        }
      },
      {
        id: 'distanceMidpoint',
        label: 'tool_distance_midpoint',
        render: () => `
          <p class="tool-hint">${t('tool_distance_midpoint_hint')}</p>
          <div class="tool-vector-row">
            ${field('dmX1', 'tool_x1', '', 'number')}
            ${field('dmY1', 'tool_y1', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('dmX2', 'tool_x2', '', 'number')}
            ${field('dmY2', 'tool_y2', '', 'number')}
          </div>
        `,
        calc: (out) => {
          const x1 = num('dmX1'), y1 = num('dmY1'), x2 = num('dmX2'), y2 = num('dmY2');
          if (x1 === null || y1 === null || x2 === null || y2 === null) { out.innerHTML = errorBox(t('tool_err_coords')); return; }
          const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          out.innerHTML =
            resultCell(t('tool_distance_result'), round(dist, 5)) +
            resultCell(t('tool_midpoint_result'), `(${round((x1 + x2) / 2, 4)}, ${round((y1 + y2) / 2, 4)})`);
        }
      },
      {
        id: 'lineEquation',
        label: 'tool_line_equation',
        render: () => `
          <p class="tool-hint">${t('tool_line_equation_hint')}</p>
          <div class="tool-vector-row">
            ${field('leX1', 'tool_x1', '', 'number')}
            ${field('leY1', 'tool_y1', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('leX2', 'tool_x2', '', 'number')}
            ${field('leY2', 'tool_y2', '', 'number')}
          </div>
        `,
        calc: (out) => {
          const x1 = num('leX1'), y1 = num('leY1'), x2 = num('leX2'), y2 = num('leY2');
          if (x1 === null || y1 === null || x2 === null || y2 === null) { out.innerHTML = errorBox(t('tool_err_coords')); return; }
          if (x2 === x1) {
            out.innerHTML = resultCell(t('tool_line_eq_result'), `x = ${round(x1, 4)}`);
            return;
          }
          const slope = (y2 - y1) / (x2 - x1);
          const intercept = y1 - slope * x1;
          const sign = intercept >= 0 ? '+' : '-';
          out.innerHTML =
            resultCell(t('tool_slope'), round(slope, 5)) +
            resultCell(t('tool_y_intercept'), round(intercept, 5)) +
            resultCell(t('tool_line_eq_result'), `y = ${round(slope, 4)}x ${sign} ${round(Math.abs(intercept), 4)}`);
        }
      },
      {
        id: 'areaPerimeter',
        label: 'tool_area_perimeter',
        render: () => `
          <p class="tool-hint">${t('tool_area_perimeter_hint')}</p>
          ${selectField('apShape', 'tool_shape', [
            { value: 'circle', label: t('tool_circle') },
            { value: 'rectangle', label: t('tool_rectangle') },
            { value: 'triangle', label: t('tool_triangle_equilateral') }
          ])}
          ${field('apDim1', 'tool_dimension1', '', 'number')}
          ${field('apDim2', 'tool_dimension2', '', 'number')}
        `,
        calc: (out) => {
          const shape = str('apShape'), d1 = num('apDim1'), d2 = num('apDim2');
          if (d1 === null || d1 <= 0) { out.innerHTML = errorBox(t('tool_err_dimension')); return; }
          let area, perimeter;
          if (shape === 'rectangle') {
            if (d2 === null || d2 <= 0) { out.innerHTML = errorBox(t('tool_err_dimension')); return; }
            area = d1 * d2; perimeter = 2 * (d1 + d2);
          } else if (shape === 'triangle') {
            area = (Math.sqrt(3) / 4) * d1 * d1; perimeter = 3 * d1;
          } else {
            area = Math.PI * d1 * d1; perimeter = 2 * Math.PI * d1;
          }
          out.innerHTML =
            resultCell(t('tool_area_result'), round(area, 4)) +
            resultCell(t('tool_perimeter_result'), round(perimeter, 4));
        }
      },
      {
        id: 'percentageCalc',
        label: 'tool_percentage_calc',
        render: () => `
          <p class="tool-hint">${t('tool_percentage_calc_hint')}</p>
          ${field('pctX', 'tool_percent_x', '%', 'number')}
          ${field('pctY', 'tool_percent_y', '', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('pctOld', 'tool_old_value', '', 'number')}
          ${field('pctNew', 'tool_new_value', '', 'number')}
        `,
        calc: (out) => {
          const x = num('pctX'), y = num('pctY'), oldV = num('pctOld'), newV = num('pctNew');
          let html = '';
          if (x !== null && y !== null) html += resultCell(t('tool_percent_of_result'), round((x / 100) * y, 4));
          if (oldV !== null && newV !== null && oldV !== 0) html += resultCell(t('tool_percent_change_result'), round(((newV - oldV) / oldV) * 100, 3) + '%');
          if (!html) { out.innerHTML = errorBox(t('tool_err_percentage')); return; }
          out.innerHTML = html;
        }
      },
      {
        id: 'fractionCalc',
        label: 'tool_fraction_calc',
        render: () => `
          <p class="tool-hint">${t('tool_fraction_calc_hint')}</p>
          <div class="tool-vector-row">
            ${field('fcN1', 'tool_numerator1', '', 'number')}
            ${field('fcD1', 'tool_denominator1', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('fcN2', 'tool_numerator2', '', 'number')}
            ${field('fcD2', 'tool_denominator2', '', 'number')}
          </div>
          ${selectField('fcOp', 'tool_fraction_operation', [
            { value: 'add', label: '+' },
            { value: 'sub', label: '−' },
            { value: 'mul', label: '×' },
            { value: 'div', label: '÷' }
          ])}
        `,
        calc: (out) => {
          const n1 = num('fcN1'), d1 = num('fcD1'), n2 = num('fcN2'), d2 = num('fcD2');
          const op = str('fcOp');
          if (n1 === null || d1 === null || n2 === null || d2 === null || d1 === 0 || d2 === 0) {
            out.innerHTML = errorBox(t('tool_err_fraction')); return;
          }
          let rn, rd;
          if (op === 'add') { rn = n1 * d2 + n2 * d1; rd = d1 * d2; }
          else if (op === 'sub') { rn = n1 * d2 - n2 * d1; rd = d1 * d2; }
          else if (op === 'mul') { rn = n1 * n2; rd = d1 * d2; }
          else { if (n2 === 0) { out.innerHTML = errorBox(t('tool_err_fraction')); return; } rn = n1 * d2; rd = d1 * n2; }
          const g = gcd(rn, rd) || 1;
          let sn = rn / g, sd = rd / g;
          if (sd < 0) { sn = -sn; sd = -sd; }
          out.innerHTML =
            resultCell(t('tool_fraction_result'), `${sn}/${sd}`) +
            resultCell(t('tool_decimal_result'), round(sn / sd, 6));
        }
      },
      {
        id: 'triangleSolver',
        label: 'tool_triangle_solver',
        render: () => `
          <p class="tool-hint">${t('tool_triangle_solver_hint')}</p>
          ${field('triA', 'tool_side_a', '', 'number')}
          ${field('triB', 'tool_side_b', '', 'number')}
          ${field('triC', 'tool_side_c', '', 'number')}
          ${field('triAngleC', 'tool_included_angle', '°', 'number')}
        `,
        calc: (out) => {
          const a = num('triA'), b = num('triB');
          let c = num('triC');
          const angleCdeg = num('triAngleC');
          if (a === null || b === null) { out.innerHTML = errorBox(t('tool_err_triangle')); return; }
          let html = '';
          if (c === null && angleCdeg !== null) {
            const C = angleCdeg * Math.PI / 180;
            c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(C));
            html += resultCell(t('tool_side_c_result'), round(c, 5));
          }
          if (c === null) { out.innerHTML = errorBox(t('tool_err_triangle')); return; }
          const angleA = Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c)))) * 180 / Math.PI;
          const angleB = Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c)))) * 180 / Math.PI;
          const angleC = 180 - angleA - angleB;
          html +=
            resultCell(t('tool_angle_a_result'), round(angleA, 3) + '°') +
            resultCell(t('tool_angle_b_result'), round(angleB, 3) + '°') +
            resultCell(t('tool_angle_c_result'), round(angleC, 3) + '°');
          out.innerHTML = html;
        }
      },
      {
        id: 'circleEquation',
        label: 'tool_circle_equation',
        render: () => `
          <p class="tool-hint">${t('tool_circle_equation_hint')}</p>
          ${field('ceH', 'tool_center_h', '', 'number')}
          ${field('ceK', 'tool_center_k', '', 'number')}
          ${field('ceR', 'tool_radius', '', 'number')}
        `,
        calc: (out) => {
          const h = num('ceH'), k = num('ceK'), r = num('ceR');
          if (h === null || k === null || r === null || r <= 0) { out.innerHTML = errorBox(t('tool_err_circle')); return; }
          const hSign = h >= 0 ? '-' : '+';
          const kSign = k >= 0 ? '-' : '+';
          const eq = `(x ${hSign} ${Math.abs(h)})² + (y ${kSign} ${Math.abs(k)})² = ${round(r * r, 4)}`;
          out.innerHTML =
            resultCell(t('tool_circle_eq_result'), eq) +
            resultCell(t('tool_circle_area_result'), round(Math.PI * r * r, 4)) +
            resultCell(t('tool_circumference_result'), round(2 * Math.PI * r, 4));
        }
      },
      {
        id: 'polynomialEval',
        label: 'tool_polynomial_eval',
        render: () => `
          <p class="tool-hint">${t('tool_polynomial_eval_hint')}</p>
          ${field('peCoeffs', 'tool_coefficients', 'e.g. 1,-3,2')}
          ${field('peX', 'tool_x_value', '', 'number')}
        `,
        calc: (out) => {
          const raw = str('peCoeffs');
          const coeffs = raw.split(',').map(s => parseFloat(s.trim()));
          const x = num('peX');
          if (!raw || coeffs.some(c => isNaN(c)) || x === null) { out.innerHTML = errorBox(t('tool_err_polynomial')); return; }
          let result = 0;
          coeffs.forEach(c => { result = result * x + c; });
          out.innerHTML = resultCell(t('tool_polynomial_result'), round(result, 6));
        }
      },
      {
        id: 'setOperations',
        label: 'tool_set_operations',
        render: () => `
          <p class="tool-hint">${t('tool_set_operations_hint')}</p>
          ${field('setA', 'tool_set_a', 'e.g. 1, 2, 3, 4')}
          ${field('setB', 'tool_set_b', 'e.g. 3, 4, 5, 6')}
        `,
        calc: (out) => {
          const rawA = str('setA'), rawB = str('setB');
          const a = rawA.split(',').map(s => parseFloat(s.trim())).filter(x => !isNaN(x));
          const b = rawB.split(',').map(s => parseFloat(s.trim())).filter(x => !isNaN(x));
          if (!a.length || !b.length) { out.innerHTML = errorBox(t('tool_err_sets')); return; }
          const setA = [...new Set(a)], setB = [...new Set(b)];
          const union = [...new Set([...setA, ...setB])].sort((x, y) => x - y);
          const intersection = setA.filter(x => setB.includes(x)).sort((x, y) => x - y);
          const difference = setA.filter(x => !setB.includes(x)).sort((x, y) => x - y);
          out.innerHTML =
            resultCell(t('tool_union_result'), '{' + union.join(', ') + '}') +
            resultCell(t('tool_intersection_result'), '{' + intersection.join(', ') + '}') +
            resultCell(t('tool_difference_result'), '{' + difference.join(', ') + '}');
        }
      },
      {
        id: 'probabilityCalc',
        label: 'tool_probability_calc',
        render: () => `
          <p class="tool-hint">${t('tool_probability_calc_hint')}</p>
          ${field('probA', 'tool_prob_a', '0 - 1', 'number')}
          ${field('probB', 'tool_prob_b', '0 - 1', 'number')}
        `,
        calc: (out) => {
          const pa = num('probA'), pb = num('probB');
          if (pa === null || pa < 0 || pa > 1) { out.innerHTML = errorBox(t('tool_err_probability')); return; }
          let html = resultCell('P(A)', round(pa, 4));
          if (pb !== null && pb >= 0 && pb <= 1) {
            html += resultCell('P(B)', round(pb, 4));
            html += resultCell(t('tool_prob_and_result'), round(pa * pb, 4));
            html += resultCell(t('tool_prob_or_result'), round(pa + pb - pa * pb, 4));
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'pointLineDistance',
        label: 'tool_point_line_distance',
        render: () => `
          <p class="tool-hint">${t('tool_point_line_distance_hint')}</p>
          <div class="tool-vector-row">
            ${field('pldA', 'tool_coeff_a_line', 'A', 'number')}
            ${field('pldB', 'tool_coeff_b_line', 'B', 'number')}
            ${field('pldC', 'tool_coeff_c_line', 'C', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('pldX0', 'tool_point_x0', '', 'number')}
            ${field('pldY0', 'tool_point_y0', '', 'number')}
          </div>
        `,
        calc: (out) => {
          const A = num('pldA'), B = num('pldB'), C = num('pldC'), x0 = num('pldX0'), y0 = num('pldY0');
          if (A === null || B === null || C === null || x0 === null || y0 === null || (A === 0 && B === 0)) {
            out.innerHTML = errorBox(t('tool_err_pointline')); return;
          }
          const dist = Math.abs(A * x0 + B * y0 + C) / Math.sqrt(A * A + B * B);
          out.innerHTML = resultCell(t('tool_distance_result'), round(dist, 5));
        }
      },
      {
        id: 'angleBetweenLines',
        label: 'tool_angle_between_lines',
        render: () => `
          <p class="tool-hint">${t('tool_angle_between_lines_hint')}</p>
          ${field('ablM1', 'tool_slope1', '', 'number')}
          ${field('ablM2', 'tool_slope2', '', 'number')}
        `,
        calc: (out) => {
          const m1 = num('ablM1'), m2 = num('ablM2');
          if (m1 === null || m2 === null) { out.innerHTML = errorBox(t('tool_err_slopes')); return; }
          const denom = 1 + m1 * m2;
          let angle;
          if (denom === 0) angle = 90;
          else angle = Math.atan(Math.abs((m2 - m1) / denom)) * 180 / Math.PI;
          out.innerHTML = resultCell(t('tool_angle_between'), round(angle, 3) + '°');
        }
      },
      {
        id: 'distance3D',
        label: 'tool_distance_3d',
        render: () => `
          <p class="tool-hint">${t('tool_distance_3d_hint')}</p>
          <div class="tool-vector-row">
            ${field('d3X1', 'tool_x1', '', 'number')}
            ${field('d3Y1', 'tool_y1', '', 'number')}
            ${field('d3Z1', 'tool_z1', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('d3X2', 'tool_x2', '', 'number')}
            ${field('d3Y2', 'tool_y2', '', 'number')}
            ${field('d3Z2', 'tool_z2', '', 'number')}
          </div>
        `,
        calc: (out) => {
          const x1 = num('d3X1'), y1 = num('d3Y1'), z1 = num('d3Z1');
          const x2 = num('d3X2'), y2 = num('d3Y2'), z2 = num('d3Z2');
          if ([x1, y1, z1, x2, y2, z2].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_coords3d')); return; }
          const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
          out.innerHTML =
            resultCell(t('tool_distance_result'), round(dist, 5)) +
            resultCell(t('tool_midpoint_result'), `(${round((x1 + x2) / 2, 4)}, ${round((y1 + y2) / 2, 4)}, ${round((z1 + z2) / 2, 4)})`);
        }
      },
      {
        id: 'matrixMultiply2x2',
        label: 'tool_matrix_multiply',
        render: () => `
          <p class="tool-hint">${t('tool_matrix_multiply_hint')}</p>
          <p class="tool-hint">Matrix A</p>
          <div class="tool-vector-row">
            ${field('mmA11', 'tool_m11', '', 'number')}
            ${field('mmA12', 'tool_m12', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('mmA21', 'tool_m21', '', 'number')}
            ${field('mmA22', 'tool_m22', '', 'number')}
          </div>
          <p class="tool-hint">Matrix B</p>
          <div class="tool-vector-row">
            ${field('mmB11', 'tool_m11', '', 'number')}
            ${field('mmB12', 'tool_m12', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('mmB21', 'tool_m21', '', 'number')}
            ${field('mmB22', 'tool_m22', '', 'number')}
          </div>
        `,
        calc: (out) => {
          const a11 = num('mmA11'), a12 = num('mmA12'), a21 = num('mmA21'), a22 = num('mmA22');
          const b11 = num('mmB11'), b12 = num('mmB12'), b21 = num('mmB21'), b22 = num('mmB22');
          const vals = [a11, a12, a21, a22, b11, b12, b21, b22];
          if (vals.some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const c11 = a11 * b11 + a12 * b21, c12 = a11 * b12 + a12 * b22;
          const c21 = a21 * b11 + a22 * b21, c22 = a21 * b12 + a22 * b22;
          const product = `[${round(c11, 4)}, ${round(c12, 4)}; ${round(c21, 4)}, ${round(c22, 4)}]`;
          out.innerHTML = resultCell(t('tool_product_matrix'), product);
        }
      },
      {
        id: 'linearSystem2',
        label: 'tool_linear_system2',
        render: () => `
          <p class="tool-hint">${t('tool_linear_system2_hint')}</p>
          <div class="tool-vector-row">
            ${field('lsA1', 'a₁', '', 'number')}
            ${field('lsB1', 'b₁', '', 'number')}
            ${field('lsC1', 'c₁', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('lsA2', 'a₂', '', 'number')}
            ${field('lsB2', 'b₂', '', 'number')}
            ${field('lsC2', 'c₂', '', 'number')}
          </div>
        `,
        calc: (out) => {
          const a1 = num('lsA1'), b1 = num('lsB1'), c1 = num('lsC1');
          const a2 = num('lsA2'), b2 = num('lsB2'), c2 = num('lsC2');
          if ([a1, b1, c1, a2, b2, c2].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const D = a1 * b2 - a2 * b1;
          if (D === 0) { out.innerHTML = errorBox(t('tool_err_nosolution')); return; }
          const x = (c1 * b2 - c2 * b1) / D;
          const y = (a1 * c2 - a2 * c1) / D;
          out.innerHTML = resultCell(t('tool_solution_x'), round(x, 5)) + resultCell(t('tool_solution_y'), round(y, 5));
        }
      },
      {
        id: 'matrix3x3Det',
        label: 'tool_matrix3x3',
        render: () => `
          <p class="tool-hint">${t('tool_matrix3x3_hint')}</p>
          <div class="tool-vector-row">
            ${field('m3_11', 'a₁₁', '', 'number')}
            ${field('m3_12', 'a₁₂', '', 'number')}
            ${field('m3_13', 'a₁₃', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('m3_21', 'a₂₁', '', 'number')}
            ${field('m3_22', 'a₂₂', '', 'number')}
            ${field('m3_23', 'a₂₃', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('m3_31', 'a₃₁', '', 'number')}
            ${field('m3_32', 'a₃₂', '', 'number')}
            ${field('m3_33', 'a₃₃', '', 'number')}
          </div>
        `,
        calc: (out) => {
          const ids = ['m3_11','m3_12','m3_13','m3_21','m3_22','m3_23','m3_31','m3_32','m3_33'];
          const v = ids.map(num);
          if (v.some(x => x === null)) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const [a11,a12,a13,a21,a22,a23,a31,a32,a33] = v;
          const det = a11 * (a22 * a33 - a23 * a32) - a12 * (a21 * a33 - a23 * a31) + a13 * (a21 * a32 - a22 * a31);
          out.innerHTML = resultCell(t('tool_determinant'), round(det, 5));
        }
      },
      {
        id: 'binomialProbability',
        label: 'tool_binomial_probability',
        render: () => `
          <p class="tool-hint">${t('tool_binomial_hint')}</p>
          ${field('bpN', 'tool_trials_n', '', 'number')}
          ${field('bpK', 'tool_successes_k', '', 'number')}
          ${field('bpP', 'tool_success_prob_p', '0 - 1', 'number')}
        `,
        calc: (out) => {
          const n = num('bpN'), k = num('bpK'), p = num('bpP');
          if (n === null || k === null || p === null || k < 0 || k > n || p < 0 || p > 1 ||
              !Number.isInteger(n) || !Number.isInteger(k)) {
            out.innerHTML = errorBox(t('tool_err_binomial')); return;
          }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const nCk = fact(n) / (fact(k) * fact(n - k));
          const prob = nCk * Math.pow(p, k) * Math.pow(1 - p, n - k);
          out.innerHTML =
            resultCell(t('tool_probability_result'), round(prob, 6)) +
            resultCell(t('tool_expected_value'), round(n * p, 3));
        }
      },
      {
        id: 'zScore',
        label: 'tool_z_score',
        render: () => `
          <p class="tool-hint">${t('tool_z_score_hint')}</p>
          ${field('zX', 'tool_value_x', '', 'number')}
          ${field('zMean', 'tool_mean_mu', '', 'number')}
          ${field('zStd', 'tool_stddev_sigma', '', 'number')}
        `,
        calc: (out) => {
          const x = num('zX'), mean = num('zMean'), std = num('zStd');
          if (x === null || mean === null || std === null || std === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          out.innerHTML = resultCell(t('tool_z_score_result'), round((x - mean) / std, 4));
        }
      },
      {
        id: 'polynomialDerivative',
        label: 'tool_polynomial_derivative',
        render: () => `
          <p class="tool-hint">${t('tool_poly_deriv_hint')}</p>
          ${field('pdCoeffs', 'tool_poly_coefficients', 'e.g. 3,2,-5')}
        `,
        calc: (out) => {
          const raw = str('pdCoeffs');
          const coeffs = raw.split(',').map(c => parseFloat(c.trim()));
          if (coeffs.length < 2 || coeffs.some(isNaN)) { out.innerHTML = errorBox(t('tool_err_polynomial')); return; }
          const degree = coeffs.length - 1;
          const derivCoeffs = coeffs.slice(0, -1).map((c, i) => c * (degree - i));
          function toPolyStr(cs, startDeg) {
            const terms = cs.map((c, i) => {
              const deg = startDeg - i;
              if (c === 0) return null;
              const coefStr = (Math.abs(c) === 1 && deg !== 0) ? (c < 0 ? '-' : (i > 0 ? '+' : '')) : (c > 0 && i > 0 ? '+' + c : c.toString());
              if (deg === 0) return coefStr;
              if (deg === 1) return coefStr + 'x';
              return coefStr + 'x^' + deg;
            }).filter(t => t !== null);
            return terms.length ? terms.join('').replace(/\+\-/g, '-') : '0';
          }
          out.innerHTML = resultCell(t('tool_derivative_result'), toPolyStr(derivCoeffs, degree - 1));
        }
      },
      {
        id: 'polynomialIntegral',
        label: 'tool_polynomial_integral',
        render: () => `
          <p class="tool-hint">${t('tool_poly_integral_hint')}</p>
          ${field('piCoeffs', 'tool_poly_coefficients', 'e.g. 3,2,-5')}
          ${field('piLower', 'tool_lower_bound', '', 'number')}
          ${field('piUpper', 'tool_upper_bound', '', 'number')}
        `,
        calc: (out) => {
          const raw = str('piCoeffs');
          const coeffs = raw.split(',').map(c => parseFloat(c.trim()));
          if (coeffs.length < 1 || coeffs.some(isNaN)) { out.innerHTML = errorBox(t('tool_err_polynomial')); return; }
          const degree = coeffs.length - 1;
          const integCoeffs = coeffs.map((c, i) => c / (degree - i + 1));
          function toPolyStr(cs, startDeg) {
            const terms = cs.map((c, i) => {
              const deg = startDeg - i + 1;
              if (c === 0) return null;
              const coefStr = (Math.abs(c) === 1 && deg !== 0) ? (c < 0 ? '-' : (i > 0 ? '+' : '')) : (c > 0 && i > 0 ? '+' + round(c, 5) : round(c, 5));
              if (deg === 0) return coefStr;
              if (deg === 1) return coefStr + 'x';
              return coefStr + 'x^' + deg;
            }).filter(t => t !== null);
            return (terms.length ? terms.join('').replace(/\+\-/g, '-') : '0') + ' + C';
          }
          function evalPoly(cs, deg, xVal) {
            return cs.reduce((sum, c, i) => sum + c * Math.pow(xVal, deg - i + 1), 0);
          }
          let html = resultCell(t('tool_integral_result'), toPolyStr(integCoeffs, degree));
          const lower = num('piLower'), upper = num('piUpper');
          if (lower !== null && upper !== null) {
            const definite = evalPoly(coeffs.map((c, i) => c / (degree - i + 1)), degree, upper) -
                              evalPoly(coeffs.map((c, i) => c / (degree - i + 1)), degree, lower);
            html += resultCell(t('tool_definite_integral_result'), round(definite, 5));
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'modularArithmetic',
        label: 'tool_modular_arithmetic',
        render: () => `
          <p class="tool-hint">${t('tool_modular_hint')}</p>
          ${field('modA', 'tool_value_a', '', 'number')}
          ${field('modN', 'tool_modulus_n', '', 'number')}
        `,
        calc: (out) => {
          const a = num('modA'), n = num('modN');
          if (a === null || n === null || n <= 0 || !Number.isInteger(a) || !Number.isInteger(n)) {
            out.innerHTML = errorBox(t('tool_err_modular')); return;
          }
          const mod = ((a % n) + n) % n;
          function extGcd(a, b) {
            if (b === 0) return [a, 1, 0];
            const [g, x1, y1] = extGcd(b, a % b);
            return [g, y1, x1 - Math.floor(a / b) * y1];
          }
          const [g, x] = extGcd(mod, n);
          let html = resultCell(t('tool_mod_result'), mod);
          if (g === 1) html += resultCell(t('tool_mod_inverse_result'), ((x % n) + n) % n);
          else html += errorBox(t('tool_no_inverse'));
          out.innerHTML = html;
        }
      },
      {
        id: 'polarRectangular',
        label: 'tool_polar_rectangular',
        render: () => `
          <p class="tool-hint">${t('tool_polar_rect_hint')}</p>
          ${field('prX', 'tool_x_coord', '', 'number')}
          ${field('prY', 'tool_y_coord', '', 'number')}
          <div class="tool-or">${t('tool_or')}</div>
          ${field('prR', 'tool_radius_r', '', 'number')}
          ${field('prTheta', 'tool_angle_theta', '', 'number')}
        `,
        calc: (out) => {
          const x = num('prX'), y = num('prY'), r = num('prR'), thetaDeg = num('prTheta');
          if (x !== null && y !== null) {
            const rCalc = Math.sqrt(x * x + y * y);
            const thetaCalc = Math.atan2(y, x) * 180 / Math.PI;
            out.innerHTML = resultCell(t('tool_radius_r'), round(rCalc, 5)) + resultCell(t('tool_angle_theta'), round(thetaCalc, 3));
          } else if (r !== null && thetaDeg !== null) {
            const rad = thetaDeg * Math.PI / 180;
            out.innerHTML = resultCell(t('tool_x_coord'), round(r * Math.cos(rad), 5)) + resultCell(t('tool_y_coord'), round(r * Math.sin(rad), 5));
          } else {
            out.innerHTML = errorBox(t('tool_err_polarrect'));
          }
        }
      },
      {
        id: 'inverseTrig',
        label: 'tool_inverse_trig',
        render: () => `
          <p class="tool-hint">${t('tool_inverse_trig_hint')}</p>
          ${field('itVal', 'tool_input_value', '', 'number')}
        `,
        calc: (out) => {
          const v = num('itVal');
          if (v === null) { out.innerHTML = errorBox(t('tool_err_inversetrig')); return; }
          let html = resultCell(t('tool_arctan_result'), round(Math.atan(v) * 180 / Math.PI, 4));
          if (v >= -1 && v <= 1) {
            html += resultCell(t('tool_arcsin_result'), round(Math.asin(v) * 180 / Math.PI, 4));
            html += resultCell(t('tool_arccos_result'), round(Math.acos(v) * 180 / Math.PI, 4));
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'solidGeometry',
        label: 'tool_solid_geometry',
        render: () => `
          <p class="tool-hint">${t('tool_solid_geometry_hint')}</p>
          ${selectField('sgShape', 'tool_shape', [
            { value: 'sphere', label: t('tool_shape_sphere') },
            { value: 'cube', label: t('tool_shape_cube') },
            { value: 'cylinder', label: t('tool_shape_cylinder') },
            { value: 'cone', label: t('tool_shape_cone') }
          ])}
          ${field('sgR', 'tool_radius_or_side', 'r (or side for cube)', 'number')}
          ${field('sgH', 'tool_height_optional', 'height (optional)', 'number')}
        `,
        calc: (out) => {
          const shape = str('sgShape');
          const r = num('sgR'), h = num('sgH');
          if (r === null || r <= 0) { out.innerHTML = errorBox(t('tool_err_1field')); return; }
          let volume, surfaceArea;
          if (shape === 'sphere') {
            volume = (4 / 3) * Math.PI * Math.pow(r, 3);
            surfaceArea = 4 * Math.PI * r * r;
          } else if (shape === 'cube') {
            volume = Math.pow(r, 3);
            surfaceArea = 6 * r * r;
          } else if (shape === 'cylinder') {
            if (h === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
            volume = Math.PI * r * r * h;
            surfaceArea = 2 * Math.PI * r * (r + h);
          } else if (shape === 'cone') {
            if (h === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
            volume = (1 / 3) * Math.PI * r * r * h;
            const slant = Math.sqrt(r * r + h * h);
            surfaceArea = Math.PI * r * (r + slant);
          }
          out.innerHTML =
            resultCell(t('tool_volume_result'), round(volume, 4)) +
            resultCell(t('tool_surface_area_result'), round(surfaceArea, 4));
        }
      },
      {
        id: 'poissonDistribution',
        label: 'tool_poisson',
        render: () => `
          <p class="tool-hint">${t('tool_poisson_hint')}</p>
          ${field('poLambda', 'tool_average_rate', 'λ', 'number')}
          ${field('poK', 'tool_number_events', 'k', 'number')}
        `,
        calc: (out) => {
          const lambda = num('poLambda'), k = num('poK');
          if (lambda === null || k === null || lambda < 0 || k < 0 || !Number.isInteger(k)) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const prob = (Math.pow(lambda, k) * Math.exp(-lambda)) / fact(k);
          out.innerHTML = resultCell(t('tool_poisson_result'), round(prob, 6));
        }
      },
      {
        id: 'exponentialGrowthDecay',
        label: 'tool_exponential_growth',
        render: () => `
          <p class="tool-hint">${t('tool_exponential_growth_hint')}</p>
          ${field('egInitial', 'tool_initial_amount', 'A0', 'number')}
          ${field('egRate', 'tool_growth_rate_k', 'k (per unit time, %)', 'number')}
          ${field('egTime', 'tool_time_elapsed', 't', 'number')}
        `,
        calc: (out) => {
          const A0 = num('egInitial'), kPct = num('egRate'), t2 = num('egTime');
          if (A0 === null || kPct === null || t2 === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const k = kPct / 100;
          const A = A0 * Math.exp(k * t2);
          out.innerHTML = resultCell(t('tool_final_amount_result'), round(A, 5));
        }
      },
      {
        id: 'normalDistributionProbability',
        label: 'tool_normal_distribution',
        render: () => `
          <p class="tool-hint">${t('tool_normal_dist_hint')}</p>
          ${field('ndZ', 'tool_z_score', 'z', 'number')}
        `,
        calc: (out) => {
          const z = num('ndZ');
          if (z === null) { out.innerHTML = errorBox(t('tool_err_1field')); return; }
          function erf(x) {
            const sign = x < 0 ? -1 : 1;
            x = Math.abs(x);
            const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
            const tt = 1 / (1 + p * x);
            const y = 1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-x * x);
            return sign * y;
          }
          const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
          out.innerHTML =
            resultCell(t('tool_cumulative_probability'), round(cdf, 5)) +
            resultCell(t('tool_upper_tail_probability'), round(1 - cdf, 5));
        }
      },
      {
        id: 'heronsFormula',
        label: 'tool_herons_formula',
        render: () => `
          <p class="tool-hint">${t('tool_herons_hint')}</p>
          ${field('hfA', 'tool_side_a', '', 'number')}
          ${field('hfB', 'tool_side_b', '', 'number')}
          ${field('hfC', 'tool_side_c', '', 'number')}
        `,
        calc: (out) => {
          const a = num('hfA'), b = num('hfB'), c = num('hfC');
          if (a === null || b === null || c === null || a <= 0 || b <= 0 || c <= 0 || a + b <= c || a + c <= b || b + c <= a) { out.innerHTML = errorBox(t('tool_err_triangle')); return; }
          const s = (a + b + c) / 2;
          const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
          out.innerHTML =
            resultCell(t('tool_semi_perimeter'), round(s, 4)) +
            resultCell(t('tool_triangle_area_result'), round(area, 5));
        }
      },
      {
        id: 'multinomialCoefficient',
        label: 'tool_multinomial_coefficient',
        render: () => `
          <p class="tool-hint">${t('tool_multinomial_coefficient_hint')}</p>
          ${field('mcGroups', 'tool_group_sizes', 'e.g. 2, 3, 4')}
        `,
        calc: (out) => {
          const raw = str('mcGroups');
          const groups = raw.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
          if (groups.length < 2 || groups.some(g => g < 0)) { out.innerHTML = errorBox(t('tool_err_multinomial')); return; }
          const n = groups.reduce((a, b) => a + b, 0);
          if (n > 170) { out.innerHTML = errorBox(t('tool_err_toolarge')); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const coeff = groups.reduce((acc, g) => acc / fact(g), fact(n));
          out.innerHTML = resultCell('n', n) + resultCell(t('tool_multinomial_result'), Math.round(coeff).toLocaleString());
        }
      },
      {
        id: 'meansCalculator',
        label: 'tool_means_calculator',
        render: () => `
          <p class="tool-hint">${t('tool_means_calculator_hint')}</p>
          ${field('mnA', 'tool_value_a', '', 'number')}
          ${field('mnB', 'tool_value_b', '', 'number')}
        `,
        calc: (out) => {
          const a = num('mnA'), b = num('mnB');
          if (a === null || b === null || a <= 0 || b <= 0) { out.innerHTML = errorBox(t('tool_err_means')); return; }
          const am = (a + b) / 2;
          const gm = Math.sqrt(a * b);
          const hm = (2 * a * b) / (a + b);
          out.innerHTML =
            resultCell(t('tool_arithmetic_mean'), round(am, 5)) +
            resultCell(t('tool_geometric_mean'), round(gm, 5)) +
            resultCell(t('tool_harmonic_mean'), round(hm, 5));
        }
      },
      {
        id: 'eigenvalues2x2',
        label: 'tool_eigenvalues',
        render: () => `
          <p class="tool-hint">${t('tool_eigenvalues_hint')}</p>
          <div class="tool-vector-row">
            ${field('evA', 'tool_m11', '', 'number')}
            ${field('evB', 'tool_m12', '', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('evC', 'tool_m21', '', 'number')}
            ${field('evD', 'tool_m22', '', 'number')}
          </div>
        `,
        calc: (out) => {
          const a = num('evA'), b = num('evB'), c = num('evC'), d = num('evD');
          if ([a, b, c, d].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const trace = a + d, det = a * d - b * c;
          const disc = trace * trace - 4 * det;
          let html;
          if (disc >= 0) {
            const sq = Math.sqrt(disc);
            html = resultCell('λ₁', round((trace + sq) / 2, 5)) + resultCell('λ₂', round((trace - sq) / 2, 5));
          } else {
            const re = round(trace / 2, 5), im = round(Math.sqrt(-disc) / 2, 5);
            html = resultCell('λ₁', `${re} + ${im}i`) + resultCell('λ₂', `${re} - ${im}i`);
          }
          out.innerHTML = html;
        }
      },
      {
        id: 'bitwiseOperations',
        label: 'tool_bitwise_operations',
        render: () => `
          <p class="tool-hint">${t('tool_bitwise_operations_hint')}</p>
          ${field('bwA', 'tool_integer_a', 'e.g. 12', 'number')}
          ${field('bwB', 'tool_integer_b', 'e.g. 10', 'number')}
        `,
        calc: (out) => {
          const a = num('bwA'), b = num('bwB');
          if (a === null || b === null || !Number.isInteger(a) || !Number.isInteger(b)) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML =
            resultCell('AND', (a & b).toString()) +
            resultCell('OR', (a | b).toString()) +
            resultCell('XOR', (a ^ b).toString()) +
            resultCell('NOT A', (~a).toString()) +
            resultCell('A << 1', (a << 1).toString()) +
            resultCell('A >> 1', (a >> 1).toString());
        }
      },
      {
        id: 'sumOfDivisors',
        label: 'tool_sum_of_divisors',
        render: () => `
          <p class="tool-hint">${t('tool_sum_of_divisors_hint')}</p>
          ${field('sodN', 'tool_positive_integer', 'e.g. 28', 'number')}
        `,
        calc: (out) => {
          const n = num('sodN');
          if (n === null || n < 1 || !Number.isInteger(n)) { out.innerHTML = errorBox(t('tool_err_1field')); return; }
          let properSum = 0;
          for (let i = 1; i <= Math.floor(n / 2); i++) { if (n % i === 0) properSum += i; }
          let classification;
          if (n > 1 && properSum === n) classification = t('tool_perfect_number');
          else if (properSum > n) classification = t('tool_abundant_number');
          else classification = t('tool_deficient_number');
          out.innerHTML =
            resultCell(t('tool_sum_proper_divisors'), properSum) +
            resultCell(t('tool_sum_all_divisors'), properSum + n) +
            resultCell(t('tool_number_classification'), classification);
        }
      },
      {
        id: 'confidenceInterval',
        label: 'tool_confidence_interval',
        render: () => `
          <p class="tool-hint">${t('tool_confidence_interval_hint')}</p>
          ${field('ciMean', 'tool_sample_mean', '', 'number')}
          ${field('ciStdDev', 'tool_sample_std_dev', '', 'number')}
          ${field('ciSampleSize', 'tool_sample_size', '', 'number')}
          ${selectField('ciLevel', 'tool_confidence_level', [
            { value: '1.645', label: '90%' },
            { value: '1.96', label: '95%' },
            { value: '2.576', label: '99%' }
          ])}
        `,
        calc: (out) => {
          const mean = num('ciMean'), sd = num('ciStdDev'), n = num('ciSampleSize');
          const z = parseFloat(str('ciLevel'));
          if (mean === null || sd === null || n === null || n <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const margin = z * (sd / Math.sqrt(n));
          out.innerHTML =
            resultCell(t('tool_margin_of_error'), round(margin, 4)) +
            resultCell(t('tool_confidence_interval_result'), `${round(mean - margin, 4)} – ${round(mean + margin, 4)}`);
        }
      },
      {
        id: 'regularPolygonCalculator',
        label: 'tool_regular_polygon',
        render: () => `
          <p class="tool-hint">${t('tool_regular_polygon_hint')}</p>
          ${field('rpSides', 'tool_num_sides', 'e.g. 6', 'number')}
          ${field('rpSideLength', 'tool_side_length', '', 'number')}
        `,
        calc: (out) => {
          const n = num('rpSides'), s = num('rpSideLength');
          if (n === null || s === null || n < 3 || s <= 0 || !Number.isInteger(n)) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const perimeter = n * s;
          const apothem = s / (2 * Math.tan(Math.PI / n));
          const area = (perimeter * apothem) / 2;
          out.innerHTML =
            resultCell(t('tool_perimeter_result'), round(perimeter, 4)) +
            resultCell(t('tool_apothem_result'), round(apothem, 4)) +
            resultCell(t('tool_polygon_area_result'), round(area, 4));
        }
      },
      {
        id: 'limitAtInfinityRational',
        label: 'tool_limit_at_infinity',
        render: () => `
          <p class="tool-hint">${t('tool_limit_at_infinity_hint')}</p>
          ${field('laiNum', 'tool_numerator_coefficients', 'e.g. 3, 2, -1')}
          ${field('laiDen', 'tool_denominator_coefficients', 'e.g. 1, 0, 5')}
        `,
        calc: (out) => {
          const numCoeffs = str('laiNum').split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
          const denCoeffs = str('laiDen').split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
          if (numCoeffs.length === 0 || denCoeffs.length === 0 || denCoeffs.every(c => c === 0)) { out.innerHTML = errorBox(t('tool_err_polynomial')); return; }
          const degNum = numCoeffs.length - 1, degDen = denCoeffs.length - 1;
          const leadNum = numCoeffs[0], leadDen = denCoeffs[0];
          let result;
          if (degNum < degDen) result = '0';
          else if (degNum === degDen) result = round(leadNum / leadDen, 6).toString();
          else result = (leadNum / leadDen > 0) ? '+∞' : '-∞';
          out.innerHTML = resultCell(t('tool_limit_result'), result);
        }
      },
      {
        id: 'modularInverse',
        label: 'tool_modular_inverse',
        render: () => `
          <p class="tool-hint">${t('tool_modular_inverse_hint')}</p>
          ${field('miA', 'tool_value_a', 'e.g. 3', 'number')}
          ${field('miM', 'tool_modulus_m', 'e.g. 11', 'number')}
        `,
        calc: (out) => {
          const a = num('miA'), m = num('miM');
          if (a === null || m === null || m <= 0 || !Number.isInteger(a) || !Number.isInteger(m)) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          function extGcd(a, b) {
            if (b === 0) return [a, 1, 0];
            const [g, x1, y1] = extGcd(b, a % b);
            return [g, y1, x1 - Math.floor(a / b) * y1];
          }
          const aMod = ((a % m) + m) % m;
          const [g, x] = extGcd(aMod, m);
          if (g !== 1) { out.innerHTML = errorBox(t('tool_err_no_inverse')); return; }
          const inv = ((x % m) + m) % m;
          out.innerHTML = resultCell(t('tool_modular_inverse_result'), inv);
        }
      },
      {
        id: 'sphericalCoordinates',
        label: 'tool_spherical_coordinates',
        render: () => `
          <p class="tool-hint">${t('tool_spherical_coordinates_hint')}</p>
          ${field('scX', 'tool_x_coord', '', 'number')}
          ${field('scY', 'tool_y_coord', '', 'number')}
          ${field('scZ', 'tool_z_coord', '', 'number')}
        `,
        calc: (out) => {
          const x = num('scX'), y = num('scY'), z = num('scZ');
          if (x === null || y === null || z === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const r = Math.sqrt(x * x + y * y + z * z);
          if (r === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const theta = Math.atan2(y, x) * 180 / Math.PI;
          const phi = Math.acos(z / r) * 180 / Math.PI;
          out.innerHTML =
            resultCell('r', round(r, 5)) +
            resultCell(t('tool_azimuth_angle'), round(theta, 3) + '°') +
            resultCell(t('tool_polar_angle'), round(phi, 3) + '°');
        }
      }
    ],

    Finance: [
      {
        id: 'amortizationSchedule',
        label: 'Amortization Schedule',
        render: () => `
          <p class="tool-hint">Full month-by-month loan breakdown — principal, interest and remaining balance.</p>
          ${field('amPrincipal', 'tool_loan_principal', 'e.g. 500000', 'number')}
          ${field('amRate', 'tool_annual_rate', '% per year, e.g. 12', 'number')}
          ${field('amMonths', 'tool_loan_term_months', 'e.g. 24', 'number')}
        `,
        calc: (out) => {
          const P = num('amPrincipal'), annualRate = num('amRate'), N = num('amMonths');
          if (P === null || annualRate === null || N === null || N <= 0 || !Number.isInteger(N)) {
            out.innerHTML = errorBox(t('tool_err_3fields')); return;
          }
          const i = annualRate / 100 / 12;
          const payment = i === 0 ? P / N : (P * i) / (1 - Math.pow(1 + i, -N));
          let balance = P, totalInterest = 0;
          let rows = '';
          const showRows = Math.min(N, 360);
          for (let m = 1; m <= showRows; m++) {
            const interest = balance * i;
            const principalPart = payment - interest;
            balance = Math.max(0, balance - principalPart);
            totalInterest += interest;
            rows += `<tr><td>${m}</td><td>${round(payment, 2)}</td><td>${round(principalPart, 2)}</td><td>${round(interest, 2)}</td><td>${round(balance, 2)}</td></tr>`;
          }
          out.innerHTML =
            resultCell(t('tool_monthly_payment'), round(payment, 2)) +
            resultCell(t('tool_total_payment'), round(payment * N, 2)) +
            resultCell(t('tool_total_interest'), round(totalInterest, 2)) +
            `<div class="amort-table-wrap"><table class="amort-table">
              <thead><tr><th>#</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>`;
        }
      },
      {
        id: 'npvCalculator',
        label: 'NPV Calculator',
        render: () => `
          <p class="tool-hint">Net Present Value of a series of cash flows. Enter the initial outlay as a negative number, then comma-separated future cash flows.</p>
          ${field('npvRate', 'tool_rate_percent', 'discount rate %, e.g. 10', 'number')}
          ${field('npvFlows', 'Cash flows', 'e.g. -100000,30000,40000,50000,20000')}
        `,
        calc: (out) => {
          const rate = num('npvRate');
          const flows = str('npvFlows').split(',').map(v => parseFloat(v.trim()));
          if (rate === null || flows.length < 2 || flows.some(isNaN)) { out.innerHTML = errorBox('Enter a discount rate and at least 2 comma-separated cash flows.'); return; }
          const r = rate / 100;
          let npv = 0;
          flows.forEach((cf, t2) => { npv += cf / Math.pow(1 + r, t2); });
          out.innerHTML =
            resultCell('NPV', round(npv, 2)) +
            resultCell('Verdict', npv >= 0 ? 'Accept (NPV ≥ 0)' : 'Reject (NPV < 0)');
        }
      },
      {
        id: 'irrCalculator',
        label: 'IRR Calculator',
        render: () => `
          <p class="tool-hint">Internal Rate of Return — the discount rate that makes NPV = 0. Enter the initial outlay as negative, then comma-separated future cash flows.</p>
          ${field('irrFlows', 'Cash flows', 'e.g. -100000,30000,40000,50000,20000')}
        `,
        calc: (out) => {
          const flows = str('irrFlows').split(',').map(v => parseFloat(v.trim()));
          if (flows.length < 2 || flows.some(isNaN) || flows[0] >= 0) { out.innerHTML = errorBox('Enter an initial negative outlay followed by comma-separated future cash flows.'); return; }
          function npvAt(r) { return flows.reduce((sum, cf, t2) => sum + cf / Math.pow(1 + r, t2), 0); }
          // bisection between -0.99 and 10 (i.e. -99% to 1000%)
          let lo = -0.99, hi = 10;
          let npvLo = npvAt(lo), npvHi = npvAt(hi);
          if (npvLo * npvHi > 0) { out.innerHTML = errorBox('No IRR found in a reasonable range for these cash flows.'); return; }
          let mid = 0;
          for (let iter = 0; iter < 200; iter++) {
            mid = (lo + hi) / 2;
            const npvMid = npvAt(mid);
            if (Math.abs(npvMid) < 1e-7) break;
            if (npvLo * npvMid < 0) { hi = mid; } else { lo = mid; npvLo = npvMid; }
          }
          out.innerHTML = resultCell('IRR', round(mid * 100, 4) + '%');
        }
      },
      {
        id: 'breakEvenPoint',
        label: 'Break-Even Point',
        render: () => `
          <p class="tool-hint">Units and revenue needed to cover all costs.</p>
          ${field('bepFixed', 'Fixed costs', '', 'number')}
          ${field('bepPrice', 'Price per unit', '', 'number')}
          ${field('bepVarCost', 'Variable cost per unit', '', 'number')}
        `,
        calc: (out) => {
          const fixed = num('bepFixed'), price = num('bepPrice'), varCost = num('bepVarCost');
          if (fixed === null || price === null || varCost === null || price <= varCost) { out.innerHTML = errorBox('Price per unit must be greater than variable cost per unit.'); return; }
          const contribution = price - varCost;
          const units = fixed / contribution;
          out.innerHTML =
            resultCell('Contribution Margin', round(contribution, 2) + '/unit') +
            resultCell('Break-Even Units', Math.ceil(units)) +
            resultCell('Break-Even Revenue', round(units * price, 2));
        }
      },
      {
        id: 'cagrCalculator',
        label: 'CAGR Calculator',
        render: () => `
          <p class="tool-hint">Compound Annual Growth Rate between a starting and ending value.</p>
          ${field('cagrStart', 'Starting Value', '', 'number')}
          ${field('cagrEnd', 'Ending Value', '', 'number')}
          ${field('cagrYears', 'Number of Years', '', 'number')}
        `,
        calc: (out) => {
          const start = num('cagrStart'), end = num('cagrEnd'), years = num('cagrYears');
          if (start === null || end === null || years === null || start <= 0 || years <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const cagr = (Math.pow(end / start, 1 / years) - 1) * 100;
          out.innerHTML =
            resultCell('CAGR', round(cagr, 3) + '%') +
            resultCell('Total Growth', round(((end - start) / start) * 100, 2) + '%');
        }
      },
      {
        id: 'debtRatio',
        label: 'Debt Ratio',
        render: () => `
          <p class="tool-hint">Debt Ratio = Total Debt / Total Assets — share of assets financed by debt.</p>
          ${field('drDebt', 'Total Debt', '', 'number')}
          ${field('drAssets', 'Total Assets', '', 'number')}
        `,
        calc: (out) => {
          const debt = num('drDebt'), assets = num('drAssets');
          if (debt === null || assets === null || assets === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Debt Ratio', round(debt / assets, 4)) +
            resultCell('Debt %', round((debt / assets) * 100, 2) + '%');
        }
      },
      {
        id: 'equityMultiplier',
        label: 'Equity Multiplier',
        render: () => `
          <p class="tool-hint">Equity Multiplier = Total Assets / Total Equity — how much assets are leveraged relative to equity.</p>
          ${field('emAssets', 'Total Assets', '', 'number')}
          ${field('emEquity', 'Total Equity', '', 'number')}
        `,
        calc: (out) => {
          const assets = num('emAssets'), equity = num('emEquity');
          if (assets === null || equity === null || equity === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Equity Multiplier', round(assets / equity, 4) + '×');
        }
      },
      {
        id: 'timesInterestEarned',
        label: 'Times Interest Earned',
        render: () => `
          <p class="tool-hint">TIE = EBIT / Interest Expense — how many times operating income covers interest payments.</p>
          ${field('tieEbit', 'EBIT (Operating Income)', '', 'number')}
          ${field('tieInterest', 'Interest Expense', '', 'number')}
        `,
        calc: (out) => {
          const ebit = num('tieEbit'), interest = num('tieInterest');
          if (ebit === null || interest === null || interest === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Times Interest Earned', round(ebit / interest, 3) + '×');
        }
      },
      {
        id: 'degreeFinancialLeverage',
        label: 'Degree of Financial Leverage',
        render: () => `
          <p class="tool-hint">DFL = EBIT / (EBIT − Interest) — sensitivity of EPS to a change in operating income.</p>
          ${field('dflEbit', 'EBIT (Operating Income)', '', 'number')}
          ${field('dflInterest', 'Interest Expense', '', 'number')}
        `,
        calc: (out) => {
          const ebit = num('dflEbit'), interest = num('dflInterest');
          if (ebit === null || interest === null || (ebit - interest) === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('DFL', round(ebit / (ebit - interest), 4) + '×');
        }
      },
      {
        id: 'degreeCombinedLeverage',
        label: 'Degree of Combined Leverage',
        render: () => `
          <p class="tool-hint">DCL = DOL × DFL — total sensitivity of EPS to a change in sales, combining operating and financial leverage.</p>
          ${field('dclCM', 'Contribution Margin (Sales − Variable Costs)', '', 'number')}
          ${field('dclEbit', 'EBIT (Operating Income)', '', 'number')}
          ${field('dclInterest', 'Interest Expense', '', 'number')}
        `,
        calc: (out) => {
          const cm = num('dclCM'), ebit = num('dclEbit'), interest = num('dclInterest');
          if (cm === null || ebit === null || interest === null || ebit === 0 || (ebit - interest) === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const dol = cm / ebit;
          const dfl = ebit / (ebit - interest);
          out.innerHTML =
            resultCell('DOL', round(dol, 4) + '×') +
            resultCell('DFL', round(dfl, 4) + '×') +
            resultCell('DCL', round(dol * dfl, 4) + '×');
        }
      },
      {
        id: 'costOfEquityCAPM',
        label: 'Cost of Equity (CAPM)',
        render: () => `
          <p class="tool-hint">Re = Rf + β(Rm − Rf) — required return on equity via the Capital Asset Pricing Model.</p>
          ${field('capmRf', 'Risk-Free Rate (%)', 'e.g. 6', 'number')}
          ${field('capmBeta', 'Beta (β)', 'e.g. 1.2', 'number')}
          ${field('capmRm', 'Expected Market Return (%)', 'e.g. 14', 'number')}
        `,
        calc: (out) => {
          const rf = num('capmRf'), beta = num('capmBeta'), rm = num('capmRm');
          if (rf === null || beta === null || rm === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const re = rf + beta * (rm - rf);
          out.innerHTML = resultCell('Cost of Equity (Re)', round(re, 3) + '%');
        }
      },
      {
        id: 'costOfDebtAfterTax',
        label: 'Cost of Debt (After-Tax)',
        render: () => `
          <p class="tool-hint">Kd = Rd(1 − T) — the effective cost of debt once the tax shield on interest is applied.</p>
          ${field('kdRate', 'Pre-Tax Cost of Debt (%)', 'e.g. 10', 'number')}
          ${field('kdTax', 'Tax Rate (%)', 'e.g. 30', 'number')}
        `,
        calc: (out) => {
          const rd = num('kdRate'), tax = num('kdTax');
          if (rd === null || tax === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const kd = rd * (1 - tax / 100);
          out.innerHTML = resultCell('After-Tax Cost of Debt', round(kd, 3) + '%');
        }
      },
      {
        id: 'dupontROE',
        label: 'DuPont ROE Breakdown',
        render: () => `
          <p class="tool-hint">ROE = Net Margin × Asset Turnover × Equity Multiplier — breaks return on equity into its three drivers.</p>
          ${field('duNetIncome', 'Net Income', '', 'number')}
          ${field('duRevenue', 'Revenue (Sales)', '', 'number')}
          ${field('duAssets', 'Total Assets', '', 'number')}
          ${field('duEquity', 'Total Equity', '', 'number')}
        `,
        calc: (out) => {
          const ni = num('duNetIncome'), rev = num('duRevenue'), assets = num('duAssets'), equity = num('duEquity');
          if (ni === null || rev === null || assets === null || equity === null || rev === 0 || assets === 0 || equity === 0) { out.innerHTML = errorBox(t('tool_err_costlife')); return; }
          const netMargin = ni / rev;
          const assetTurnover = rev / assets;
          const equityMultiplier = assets / equity;
          const roe = netMargin * assetTurnover * equityMultiplier;
          out.innerHTML =
            resultCell('Net Profit Margin', round(netMargin * 100, 2) + '%') +
            resultCell('Asset Turnover', round(assetTurnover, 3) + '×') +
            resultCell('Equity Multiplier', round(equityMultiplier, 3) + '×') +
            resultCell('ROE', round(roe * 100, 2) + '%');
        }
      },
      {
        id: 'bookValuePerShare',
        label: 'Book Value per Share',
        render: () => `
          <p class="tool-hint">BVPS = Total Equity / Shares Outstanding — accounting value of one share.</p>
          ${field('bvpsEquity', 'Total Equity', '', 'number')}
          ${field('bvpsShares', 'Shares Outstanding', '', 'number')}
        `,
        calc: (out) => {
          const equity = num('bvpsEquity'), shares = num('bvpsShares');
          if (equity === null || shares === null || shares === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Book Value per Share', round(equity / shares, 4));
        }
      },
      {
        id: 'marketToBookRatio',
        label: 'Market-to-Book Ratio',
        render: () => `
          <p class="tool-hint">M/B = Market Price per Share / Book Value per Share — how the market values the company relative to its book value.</p>
          ${field('mbPrice', 'Market Price per Share', '', 'number')}
          ${field('mbBVPS', 'Book Value per Share', '', 'number')}
        `,
        calc: (out) => {
          const price = num('mbPrice'), bvps = num('mbBVPS');
          if (price === null || bvps === null || bvps === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Market-to-Book Ratio', round(price / bvps, 4) + '×');
        }
      },
      {
        id: 'quickRatio',
        label: 'Quick Ratio (Acid-Test)',
        render: () => `
          <p class="tool-hint">Quick Ratio = (Current Assets − Inventory) / Current Liabilities — liquidity excluding inventory.</p>
          ${field('qrCA', 'Current Assets', '', 'number')}
          ${field('qrInv', 'Inventory', '', 'number')}
          ${field('qrCL', 'Current Liabilities', '', 'number')}
        `,
        calc: (out) => {
          const ca = num('qrCA'), inv = num('qrInv'), cl = num('qrCL');
          if (ca === null || inv === null || cl === null || cl === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          out.innerHTML = resultCell('Quick Ratio', round((ca - inv) / cl, 4));
        }
      },
      {
        id: 'cashRatio',
        label: 'Cash Ratio',
        render: () => `
          <p class="tool-hint">Cash Ratio = Cash &amp; Cash Equivalents / Current Liabilities — strictest measure of short-term liquidity.</p>
          ${field('crCash', 'Cash & Cash Equivalents', '', 'number')}
          ${field('crCL', 'Current Liabilities', '', 'number')}
        `,
        calc: (out) => {
          const cash = num('crCash'), cl = num('crCL');
          if (cash === null || cl === null || cl === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Cash Ratio', round(cash / cl, 4));
        }
      },
      {
        id: 'profitabilityIndex',
        label: 'Profitability Index',
        render: () => `
          <p class="tool-hint">PI = PV of Future Cash Flows / Initial Investment. Enter the discount rate and comma-separated future cash flows (not including the initial outlay).</p>
          ${field('piRate', 'Discount Rate (%)', 'e.g. 10', 'number')}
          ${field('piInvestment', 'Initial Investment', 'e.g. 100000', 'number')}
          ${field('piFlows', 'Future Cash Flows', 'e.g. 30000,40000,50000,20000')}
        `,
        calc: (out) => {
          const rate = num('piRate'), investment = num('piInvestment');
          const flows = str('piFlows').split(',').map(v => parseFloat(v.trim()));
          if (rate === null || investment === null || investment === 0 || flows.length < 1 || flows.some(isNaN)) { out.innerHTML = errorBox('Enter a rate, an initial investment and at least 1 comma-separated cash flow.'); return; }
          const r = rate / 100;
          let pv = 0;
          flows.forEach((cf, idx) => { pv += cf / Math.pow(1 + r, idx + 1); });
          const pi = pv / investment;
          out.innerHTML =
            resultCell('PV of Cash Flows', round(pv, 2)) +
            resultCell('Profitability Index', round(pi, 4)) +
            resultCell('Verdict', pi >= 1 ? 'Accept (PI ≥ 1)' : 'Reject (PI < 1)');
        }
      },
      {
        id: 'discountedPaybackPeriod',
        label: 'Discounted Payback Period',
        render: () => `
          <p class="tool-hint">Years to recover the initial investment using discounted cash flows. Enter the initial outlay as negative, then comma-separated future cash flows.</p>
          ${field('dppRate', 'Discount Rate (%)', 'e.g. 10', 'number')}
          ${field('dppFlows', 'Cash Flows', 'e.g. -100000,30000,40000,50000,20000')}
        `,
        calc: (out) => {
          const rate = num('dppRate');
          const flows = str('dppFlows').split(',').map(v => parseFloat(v.trim()));
          if (rate === null || flows.length < 2 || flows.some(isNaN) || flows[0] >= 0) { out.innerHTML = errorBox('Enter a discount rate and an initial negative outlay followed by comma-separated future cash flows.'); return; }
          const r = rate / 100;
          let cumulative = flows[0];
          let payback = null;
          for (let i = 1; i < flows.length; i++) {
            const disc = flows[i] / Math.pow(1 + r, i);
            const prevCumulative = cumulative;
            cumulative += disc;
            if (payback === null && cumulative >= 0) {
              payback = (i - 1) + (-prevCumulative / disc);
            }
          }
          if (payback === null) { out.innerHTML = resultCell('Verdict', 'Not recovered within the given cash flows'); return; }
          out.innerHTML = resultCell('Discounted Payback Period', round(payback, 2) + ' years');
        }
      },
      {
        id: 'mirrCalculator',
        label: 'Modified IRR (MIRR)',
        render: () => `
          <p class="tool-hint">MIRR — assumes negative flows are financed at the finance rate and positive flows are reinvested at the reinvestment rate. Enter the initial outlay as negative, then comma-separated future cash flows.</p>
          ${field('mirrFinRate', 'Finance Rate (%)', 'e.g. 8', 'number')}
          ${field('mirrReinvestRate', 'Reinvestment Rate (%)', 'e.g. 12', 'number')}
          ${field('mirrFlows', 'Cash Flows', 'e.g. -100000,30000,40000,50000,20000')}
        `,
        calc: (out) => {
          const finRate = num('mirrFinRate'), reinvestRate = num('mirrReinvestRate');
          const flows = str('mirrFlows').split(',').map(v => parseFloat(v.trim()));
          if (finRate === null || reinvestRate === null || flows.length < 2 || flows.some(isNaN)) { out.innerHTML = errorBox('Enter both rates and at least 2 comma-separated cash flows.'); return; }
          const n = flows.length - 1;
          const fr = finRate / 100, rr = reinvestRate / 100;
          let pvNeg = 0, fvPos = 0;
          flows.forEach((cf, idx) => {
            if (cf < 0) pvNeg += cf / Math.pow(1 + fr, idx);
            else if (cf > 0) fvPos += cf * Math.pow(1 + rr, n - idx);
          });
          if (pvNeg === 0 || fvPos === 0) { out.innerHTML = errorBox('Cash flows must include at least one negative and one positive value.'); return; }
          const mirr = Math.pow(fvPos / -pvNeg, 1 / n) - 1;
          out.innerHTML = resultCell('MIRR', round(mirr * 100, 4) + '%');
        }
      },
      {
        id: 'dividendDiscountModel',
        label: 'Dividend Discount Model (Gordon Growth)',
        render: () => `
          <p class="tool-hint">P = D₁ / (r − g) — intrinsic stock value from next year's expected dividend, required return and growth rate.</p>
          ${field('ddmD1', "Next Year's Dividend (D₁)", '', 'number')}
          ${field('ddmR', 'Required Return (%)', 'e.g. 12', 'number')}
          ${field('ddmG', 'Dividend Growth Rate (%)', 'e.g. 5', 'number')}
        `,
        calc: (out) => {
          const d1 = num('ddmD1'), r = num('ddmR'), g = num('ddmG');
          if (d1 === null || r === null || g === null || r <= g) { out.innerHTML = errorBox('Required return must be greater than the growth rate.'); return; }
          const price = d1 / ((r - g) / 100);
          out.innerHTML = resultCell('Intrinsic Value per Share', round(price, 2));
        }
      },
      {
        id: 'freeCashFlowToEquity',
        label: 'Free Cash Flow to Equity (FCFE)',
        render: () => `
          <p class="tool-hint">FCFE = Net Income + Depreciation − CapEx − ΔWorking Capital + Net Borrowing — cash available to equity holders.</p>
          ${field('fcfeNI', 'Net Income', '', 'number')}
          ${field('fcfeDep', 'Depreciation & Amortization', '', 'number')}
          ${field('fcfeCapex', 'Capital Expenditure', '', 'number')}
          ${field('fcfeWC', 'Change in Working Capital', '', 'number')}
          ${field('fcfeBorrow', 'Net Borrowing', '', 'number')}
        `,
        calc: (out) => {
          const ni = num('fcfeNI'), dep = num('fcfeDep'), capex = num('fcfeCapex'), wc = num('fcfeWC'), borrow = num('fcfeBorrow');
          if (ni === null || dep === null || capex === null || wc === null || borrow === null) { out.innerHTML = errorBox('Please fill in all fields.'); return; }
          const fcfe = ni + dep - capex - wc + borrow;
          out.innerHTML = resultCell('FCFE', round(fcfe, 2));
        }
      },
      {
        id: 'freeCashFlowToFirm',
        label: 'Free Cash Flow to Firm (FCFF)',
        render: () => `
          <p class="tool-hint">FCFF = EBIT×(1 − Tax) + Depreciation − CapEx − ΔWorking Capital — cash available to all capital providers.</p>
          ${field('fcffEbit', 'EBIT', '', 'number')}
          ${field('fcffTax', 'Tax Rate (%)', '', 'number')}
          ${field('fcffDep', 'Depreciation & Amortization', '', 'number')}
          ${field('fcffCapex', 'Capital Expenditure', '', 'number')}
          ${field('fcffWC', 'Change in Working Capital', '', 'number')}
        `,
        calc: (out) => {
          const ebit = num('fcffEbit'), tax = num('fcffTax'), dep = num('fcffDep'), capex = num('fcffCapex'), wc = num('fcffWC');
          if (ebit === null || tax === null || dep === null || capex === null || wc === null) { out.innerHTML = errorBox('Please fill in all fields.'); return; }
          const fcff = ebit * (1 - tax / 100) + dep - capex - wc;
          out.innerHTML = resultCell('FCFF', round(fcff, 2));
        }
      },
      {
        id: 'costOfPreferredStock',
        label: 'Cost of Preferred Stock',
        render: () => `
          <p class="tool-hint">Kp = Preferred Dividend / Preferred Stock Price — required return on preferred shares.</p>
          ${field('kpDividend', 'Annual Preferred Dividend', '', 'number')}
          ${field('kpPrice', 'Preferred Stock Price', '', 'number')}
        `,
        calc: (out) => {
          const div = num('kpDividend'), price = num('kpPrice');
          if (div === null || price === null || price === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Cost of Preferred Stock (Kp)', round((div / price) * 100, 3) + '%');
        }
      },
      {
        id: 'sustainableGrowthRate',
        label: 'Sustainable Growth Rate',
        render: () => `
          <p class="tool-hint">SGR = ROE × (1 − Dividend Payout Ratio) — max growth rate a firm can sustain without new equity or extra debt.</p>
          ${field('sgrROE', 'Return on Equity (%)', 'e.g. 18', 'number')}
          ${field('sgrPayout', 'Dividend Payout Ratio (%)', 'e.g. 30', 'number')}
        `,
        calc: (out) => {
          const roe = num('sgrROE'), payout = num('sgrPayout');
          if (roe === null || payout === null) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const sgr = (roe / 100) * (1 - payout / 100);
          out.innerHTML = resultCell('Sustainable Growth Rate', round(sgr * 100, 3) + '%');
        }
      },
      {
        id: 'growingPerpetuityValue',
        label: 'Growing Perpetuity Value',
        render: () => `
          <p class="tool-hint">PV = C / (r − g) — value of an infinite cash flow stream that grows at a constant rate.</p>
          ${field('gpvC', 'Next Cash Flow (C)', '', 'number')}
          ${field('gpvR', 'Discount Rate (%)', 'e.g. 10', 'number')}
          ${field('gpvG', 'Growth Rate (%)', 'e.g. 4', 'number')}
        `,
        calc: (out) => {
          const c = num('gpvC'), r = num('gpvR'), g = num('gpvG');
          if (c === null || r === null || g === null || r <= g) { out.innerHTML = errorBox('Discount rate must be greater than the growth rate.'); return; }
          out.innerHTML = resultCell('Growing Perpetuity Value', round(c / ((r - g) / 100), 2));
        }
      },
      {
        id: 'annuityDuePV',
        label: 'Present Value of Annuity Due',
        render: () => `
          <p class="tool-hint">Annuity due — payments occur at the start of each period (e.g. rent). PV = PMT × [1−(1+r)⁻ⁿ]/r × (1+r).</p>
          ${field('advPmt', 'Payment per Period', '', 'number')}
          ${field('advR', 'Rate per Period (%)', 'e.g. 10', 'number')}
          ${field('advN', 'Number of Periods', '', 'number')}
        `,
        calc: (out) => {
          const pmt = num('advPmt'), rate = num('advR'), n = num('advN');
          if (pmt === null || rate === null || n === null || n <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const r = rate / 100;
          const pv = r === 0 ? pmt * n : pmt * ((1 - Math.pow(1 + r, -n)) / r) * (1 + r);
          out.innerHTML = resultCell('Present Value (Annuity Due)', round(pv, 2));
        }
      },
      {
        id: 'annuityDueFV',
        label: 'Future Value of Annuity Due',
        render: () => `
          <p class="tool-hint">Annuity due — payments occur at the start of each period. FV = PMT × [(1+r)ⁿ−1]/r × (1+r).</p>
          ${field('afvPmt', 'Payment per Period', '', 'number')}
          ${field('afvR', 'Rate per Period (%)', 'e.g. 10', 'number')}
          ${field('afvN', 'Number of Periods', '', 'number')}
        `,
        calc: (out) => {
          const pmt = num('afvPmt'), rate = num('afvR'), n = num('afvN');
          if (pmt === null || rate === null || n === null || n <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const r = rate / 100;
          const fv = r === 0 ? pmt * n : pmt * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
          out.innerHTML = resultCell('Future Value (Annuity Due)', round(fv, 2));
        }
      },
      {
        id: 'zeroCouponBondPrice',
        label: 'Zero-Coupon Bond Price',
        render: () => `
          <p class="tool-hint">Price = Face Value / (1 + r)ⁿ — value of a bond that pays no periodic interest.</p>
          ${field('zcbFace', 'Face Value', '', 'number')}
          ${field('zcbRate', 'Required Yield (%)', 'e.g. 9', 'number')}
          ${field('zcbYears', 'Years to Maturity', '', 'number')}
        `,
        calc: (out) => {
          const face = num('zcbFace'), rate = num('zcbRate'), years = num('zcbYears');
          if (face === null || rate === null || years === null || years <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          out.innerHTML = resultCell('Bond Price', round(face / Math.pow(1 + rate / 100, years), 2));
        }
      },
      {
        id: 'yieldToMaturityApprox',
        label: 'Approximate Yield to Maturity',
        render: () => `
          <p class="tool-hint">YTM ≈ [C + (F − P)/n] / [(F + P)/2] — quick estimate of a bond's yield to maturity.</p>
          ${field('ytmCoupon', 'Annual Coupon Payment (C)', '', 'number')}
          ${field('ytmFace', 'Face Value (F)', '', 'number')}
          ${field('ytmPrice', 'Current Price (P)', '', 'number')}
          ${field('ytmYears', 'Years to Maturity (n)', '', 'number')}
        `,
        calc: (out) => {
          const c = num('ytmCoupon'), face = num('ytmFace'), price = num('ytmPrice'), n = num('ytmYears');
          if (c === null || face === null || price === null || n === null || n <= 0) { out.innerHTML = errorBox(t('tool_err_costlife')); return; }
          const ytm = (c + (face - price) / n) / ((face + price) / 2);
          out.innerHTML = resultCell('Approx. YTM', round(ytm * 100, 3) + '%');
        }
      },
      {
        id: 'returnOnInvestedCapital',
        label: 'Return on Invested Capital (ROIC)',
        render: () => `
          <p class="tool-hint">ROIC = NOPAT / Invested Capital — how efficiently a company turns invested capital into profit.</p>
          ${field('roicNOPAT', 'NOPAT (Net Operating Profit After Tax)', '', 'number')}
          ${field('roicCapital', 'Invested Capital', '', 'number')}
        `,
        calc: (out) => {
          const nopat = num('roicNOPAT'), capital = num('roicCapital');
          if (nopat === null || capital === null || capital === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('ROIC', round((nopat / capital) * 100, 3) + '%');
        }
      },
      {
        id: 'economicValueAdded',
        label: 'Economic Value Added (EVA)',
        render: () => `
          <p class="tool-hint">EVA = NOPAT − (WACC × Invested Capital) — profit left after paying for the cost of all capital used.</p>
          ${field('evaNOPAT', 'NOPAT (Net Operating Profit After Tax)', '', 'number')}
          ${field('evaWACC', 'WACC (%)', 'e.g. 11', 'number')}
          ${field('evaCapital', 'Invested Capital', '', 'number')}
        `,
        calc: (out) => {
          const nopat = num('evaNOPAT'), wacc = num('evaWACC'), capital = num('evaCapital');
          if (nopat === null || wacc === null || capital === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const eva = nopat - (wacc / 100) * capital;
          out.innerHTML = resultCell('EVA', round(eva, 2));
        }
      },
      {
        id: 'altmanZScore',
        label: 'Altman Z-Score',
        render: () => `
          <p class="tool-hint">Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E — bankruptcy-risk score for manufacturing/public firms. Z &gt; 2.99 safe, 1.81–2.99 grey zone, &lt; 1.81 distress.</p>
          ${field('zWC', 'Working Capital / Total Assets (A)', 'e.g. 0.2', 'number')}
          ${field('zRE', 'Retained Earnings / Total Assets (B)', 'e.g. 0.15', 'number')}
          ${field('zEBIT', 'EBIT / Total Assets (C)', 'e.g. 0.18', 'number')}
          ${field('zMVE', 'Market Value of Equity / Total Liabilities (D)', 'e.g. 1.5', 'number')}
          ${field('zSales', 'Sales / Total Assets (E)', 'e.g. 1.1', 'number')}
        `,
        calc: (out) => {
          const a = num('zWC'), b = num('zRE'), c = num('zEBIT'), d = num('zMVE'), e = num('zSales');
          if ([a, b, c, d, e].some(v => v === null)) { out.innerHTML = errorBox('Please fill in all fields.'); return; }
          const z = 1.2 * a + 1.4 * b + 3.3 * c + 0.6 * d + 1.0 * e;
          let zone;
          if (z > 2.99) zone = 'Safe Zone';
          else if (z >= 1.81) zone = 'Grey Zone';
          else zone = 'Distress Zone';
          out.innerHTML = resultCell('Altman Z-Score', round(z, 3)) + resultCell('Zone', zone);
        }
      },
      {
        id: 'operatingCashFlowRatio',
        label: 'Operating Cash Flow Ratio',
        render: () => `
          <p class="tool-hint">OCF Ratio = Operating Cash Flow / Current Liabilities — ability to cover short-term liabilities from core operations.</p>
          ${field('ocfrOCF', 'Operating Cash Flow', '', 'number')}
          ${field('ocfrCL', 'Current Liabilities', '', 'number')}
        `,
        calc: (out) => {
          const ocf = num('ocfrOCF'), cl = num('ocfrCL');
          if (ocf === null || cl === null || cl === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Operating Cash Flow Ratio', round(ocf / cl, 4));
        }
      },
      {
        id: 'retentionRatio',
        label: 'Retention (Plowback) Ratio',
        render: () => `
          <p class="tool-hint">Retention Ratio = 1 − Dividend Payout Ratio — share of earnings a company reinvests rather than pays out.</p>
          ${field('rrPayout', 'Dividend Payout Ratio (%)', 'e.g. 30', 'number')}
        `,
        calc: (out) => {
          const payout = num('rrPayout');
          if (payout === null) { out.innerHTML = errorBox(t('tool_err_1field')); return; }
          out.innerHTML = resultCell('Retention Ratio', round(100 - payout, 3) + '%');
        }
      },
      {
        id: 'daysSalesOutstanding',
        label: 'Days Sales Outstanding (DSO)',
        render: () => `
          <p class="tool-hint">DSO = (Accounts Receivable / Credit Sales) × 365 — average days to collect payment after a sale.</p>
          ${field('dsoAR', 'Accounts Receivable', '', 'number')}
          ${field('dsoSales', 'Annual Credit Sales', '', 'number')}
        `,
        calc: (out) => {
          const ar = num('dsoAR'), sales = num('dsoSales');
          if (ar === null || sales === null || sales === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('DSO', round((ar / sales) * 365, 1) + ' days');
        }
      },
      {
        id: 'daysPayableOutstanding',
        label: 'Days Payable Outstanding (DPO)',
        render: () => `
          <p class="tool-hint">DPO = (Accounts Payable / COGS) × 365 — average days a company takes to pay its suppliers.</p>
          ${field('dpoAP', 'Accounts Payable', '', 'number')}
          ${field('dpoCOGS', 'Cost of Goods Sold (Annual)', '', 'number')}
        `,
        calc: (out) => {
          const ap = num('dpoAP'), cogs = num('dpoCOGS');
          if (ap === null || cogs === null || cogs === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('DPO', round((ap / cogs) * 365, 1) + ' days');
        }
      },
      {
        id: 'daysInventoryOutstanding',
        label: 'Days Inventory Outstanding (DIO)',
        render: () => `
          <p class="tool-hint">DIO = (Average Inventory / COGS) × 365 — average days inventory sits before being sold.</p>
          ${field('dioInv', 'Average Inventory', '', 'number')}
          ${field('dioCOGS', 'Cost of Goods Sold (Annual)', '', 'number')}
        `,
        calc: (out) => {
          const inv = num('dioInv'), cogs = num('dioCOGS');
          if (inv === null || cogs === null || cogs === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('DIO', round((inv / cogs) * 365, 1) + ' days');
        }
      },
      {
        id: 'debtServiceCoverageRatio',
        label: 'Debt Service Coverage Ratio (DSCR)',
        render: () => `
          <p class="tool-hint">DSCR = Net Operating Income / Total Debt Service — ability to cover loan principal and interest from operating income.</p>
          ${field('dscrNOI', 'Net Operating Income', '', 'number')}
          ${field('dscrDebtService', 'Total Debt Service (Principal + Interest)', '', 'number')}
        `,
        calc: (out) => {
          const noi = num('dscrNOI'), ds = num('dscrDebtService');
          if (noi === null || ds === null || ds === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          const dscr = noi / ds;
          out.innerHTML = resultCell('DSCR', round(dscr, 3) + '×') +
            resultCell('Verdict', dscr >= 1 ? 'Healthy (≥ 1×)' : 'Shortfall (< 1×)');
        }
      },
      {
        id: 'fixedChargeCoverageRatio',
        label: 'Fixed Charge Coverage Ratio',
        render: () => `
          <p class="tool-hint">FCCR = (EBIT + Fixed Charges) / (Fixed Charges + Interest Expense) — ability to cover fixed obligations like lease payments and interest.</p>
          ${field('fccrEbit', 'EBIT', '', 'number')}
          ${field('fccrFixed', 'Fixed Charges (e.g. Lease Payments)', '', 'number')}
          ${field('fccrInterest', 'Interest Expense', '', 'number')}
        `,
        calc: (out) => {
          const ebit = num('fccrEbit'), fixed = num('fccrFixed'), interest = num('fccrInterest');
          if (ebit === null || fixed === null || interest === null || (fixed + interest) === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          out.innerHTML = resultCell('Fixed Charge Coverage Ratio', round((ebit + fixed) / (fixed + interest), 3) + '×');
        }
      },
      {
        id: 'loanToValueRatio',
        label: 'Loan-to-Value Ratio (LTV)',
        render: () => `
          <p class="tool-hint">LTV = (Loan Amount / Appraised Value) × 100 — lender's risk measure on a secured loan.</p>
          ${field('ltvLoan', 'Loan Amount', '', 'number')}
          ${field('ltvValue', 'Appraised Property Value', '', 'number')}
        `,
        calc: (out) => {
          const loan = num('ltvLoan'), value = num('ltvValue');
          if (loan === null || value === null || value === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('LTV', round((loan / value) * 100, 2) + '%');
        }
      },
      {
        id: 'netInterestMargin',
        label: 'Net Interest Margin (NIM)',
        render: () => `
          <p class="tool-hint">NIM = (Interest Income − Interest Expense) / Average Earning Assets — a bank's core lending profitability.</p>
          ${field('nimIncome', 'Interest Income', '', 'number')}
          ${field('nimExpense', 'Interest Expense', '', 'number')}
          ${field('nimAssets', 'Average Earning Assets', '', 'number')}
        `,
        calc: (out) => {
          const income = num('nimIncome'), expense = num('nimExpense'), assets = num('nimAssets');
          if (income === null || expense === null || assets === null || assets === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          out.innerHTML = resultCell('Net Interest Margin', round(((income - expense) / assets) * 100, 3) + '%');
        }
      },
      {
        id: 'costOfEquityDGM',
        label: 'Cost of Equity (Dividend Growth Model)',
        render: () => `
          <p class="tool-hint">Ke = D₁/P₀ + g — required return on equity from expected dividend yield plus growth.</p>
          ${field('dgmD1', "Next Year's Dividend (D₁)", '', 'number')}
          ${field('dgmP0', 'Current Share Price (P₀)', '', 'number')}
          ${field('dgmG', 'Dividend Growth Rate (%)', 'e.g. 5', 'number')}
        `,
        calc: (out) => {
          const d1 = num('dgmD1'), p0 = num('dgmP0'), g = num('dgmG');
          if (d1 === null || p0 === null || g === null || p0 === 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const ke = (d1 / p0) * 100 + g;
          out.innerHTML = resultCell('Cost of Equity (Ke)', round(ke, 3) + '%');
        }
      },
      {
        id: 'weightedAverageInterestRate',
        label: 'Weighted Average Interest Rate',
        render: () => `
          <p class="tool-hint">Blended interest rate across multiple loans, weighted by principal. Enter matching comma-separated lists.</p>
          ${field('wairPrincipals', 'Loan Principals', 'e.g. 500000,300000,200000')}
          ${field('wairRates', 'Interest Rates (%)', 'e.g. 12,9,15')}
        `,
        calc: (out) => {
          const principals = str('wairPrincipals').split(',').map(v => parseFloat(v.trim()));
          const rates = str('wairRates').split(',').map(v => parseFloat(v.trim()));
          if (principals.length === 0 || principals.length !== rates.length || principals.some(isNaN) || rates.some(isNaN)) { out.innerHTML = errorBox('Enter matching comma-separated lists of principals and rates.'); return; }
          const totalPrincipal = principals.reduce((s, p) => s + p, 0);
          if (totalPrincipal === 0) { out.innerHTML = errorBox('Total principal cannot be zero.'); return; }
          let weightedSum = 0;
          principals.forEach((p, idx) => { weightedSum += p * rates[idx]; });
          out.innerHTML = resultCell('Weighted Average Rate', round(weightedSum / totalPrincipal, 3) + '%') +
            resultCell('Total Principal', round(totalPrincipal, 2));
        }
      },
      {
        id: 'financialBreakEvenEBIT',
        label: 'Financial Break-Even (EBIT*)',
        render: () => `
          <p class="tool-hint">EBIT* = Interest + [Preferred Dividends / (1 − Tax Rate)] — the EBIT level at which EPS is exactly zero.</p>
          ${field('fbeInterest', 'Interest Expense', '', 'number')}
          ${field('fbePreferred', 'Preferred Dividends', '0 if none', 'number')}
          ${field('fbeTax', 'Tax Rate (%)', 'e.g. 30', 'number')}
        `,
        calc: (out) => {
          const interest = num('fbeInterest'), preferred = num('fbePreferred'), tax = num('fbeTax');
          if (interest === null || preferred === null || tax === null || tax >= 100) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const ebitStar = interest + preferred / (1 - tax / 100);
          out.innerHTML = resultCell('Financial Break-Even EBIT', round(ebitStar, 2));
        }
      },
      {
        id: 'pvGrowingAnnuity',
        label: 'Present Value of Growing Annuity',
        render: () => `
          <p class="tool-hint">PV = PMT × [1 − ((1+g)/(1+r))ⁿ] / (r − g) — value of a series of payments that grow each period.</p>
          ${field('pvgaPmt', 'First Payment (PMT)', '', 'number')}
          ${field('pvgaR', 'Discount Rate (%)', 'e.g. 10', 'number')}
          ${field('pvgaG', 'Growth Rate (%)', 'e.g. 4', 'number')}
          ${field('pvgaN', 'Number of Periods', '', 'number')}
        `,
        calc: (out) => {
          const pmt = num('pvgaPmt'), rate = num('pvgaR'), g = num('pvgaG'), n = num('pvgaN');
          if (pmt === null || rate === null || g === null || n === null || n <= 0 || rate === g) { out.innerHTML = errorBox('Please fill in all fields; rate and growth rate cannot be equal.'); return; }
          const r = rate / 100, gr = g / 100;
          const pv = pmt * (1 - Math.pow((1 + gr) / (1 + r), n)) / (r - gr);
          out.innerHTML = resultCell('Present Value', round(pv, 2));
        }
      },
      {
        id: 'fvGrowingAnnuity',
        label: 'Future Value of Growing Annuity',
        render: () => `
          <p class="tool-hint">FV = PMT × [(1+r)ⁿ − (1+g)ⁿ] / (r − g) — future value of a series of payments that grow each period.</p>
          ${field('fvgaPmt', 'First Payment (PMT)', '', 'number')}
          ${field('fvgaR', 'Growth-Adjusted Return Rate (%)', 'e.g. 10', 'number')}
          ${field('fvgaG', 'Growth Rate (%)', 'e.g. 4', 'number')}
          ${field('fvgaN', 'Number of Periods', '', 'number')}
        `,
        calc: (out) => {
          const pmt = num('fvgaPmt'), rate = num('fvgaR'), g = num('fvgaG'), n = num('fvgaN');
          if (pmt === null || rate === null || g === null || n === null || n <= 0 || rate === g) { out.innerHTML = errorBox('Please fill in all fields; rate and growth rate cannot be equal.'); return; }
          const r = rate / 100, gr = g / 100;
          const fv = pmt * (Math.pow(1 + r, n) - Math.pow(1 + gr, n)) / (r - gr);
          out.innerHTML = resultCell('Future Value', round(fv, 2));
        }
      },
      {
        id: 'cashFlowMargin',
        label: 'Cash Flow Margin',
        render: () => `
          <p class="tool-hint">Cash Flow Margin = Operating Cash Flow / Sales — how efficiently sales convert into actual cash.</p>
          ${field('cfmOCF', 'Operating Cash Flow', '', 'number')}
          ${field('cfmSales', 'Sales (Revenue)', '', 'number')}
        `,
        calc: (out) => {
          const ocf = num('cfmOCF'), sales = num('cfmSales');
          if (ocf === null || sales === null || sales === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Cash Flow Margin', round((ocf / sales) * 100, 3) + '%');
        }
      },
      {
        id: 'costOfTradeCredit',
        label: 'Effective Cost of Trade Credit',
        render: () => `
          <p class="tool-hint">Annualized cost of giving up an early-payment discount (e.g. "2/10 net 30"). Cost = [d/(100−d)] × [365/(Full Period − Discount Period)].</p>
          ${field('ctcDiscount', 'Discount Offered (%)', 'e.g. 2', 'number')}
          ${field('ctcDiscountDays', 'Discount Period (days)', 'e.g. 10', 'number')}
          ${field('ctcFullDays', 'Full Credit Period (days)', 'e.g. 30', 'number')}
        `,
        calc: (out) => {
          const d = num('ctcDiscount'), discDays = num('ctcDiscountDays'), fullDays = num('ctcFullDays');
          if (d === null || discDays === null || fullDays === null || d >= 100 || fullDays <= discDays) { out.innerHTML = errorBox('Full credit period must be greater than the discount period, and discount must be under 100%.'); return; }
          const cost = (d / (100 - d)) * (365 / (fullDays - discDays)) * 100;
          out.innerHTML = resultCell('Effective Annual Cost', round(cost, 2) + '%');
        }
      },
      {
        id: 'preferredStockValue',
        label: 'Preferred Stock Value',
        render: () => `
          <p class="tool-hint">Value = Dividend / Required Rate of Return — price of a preferred share given its fixed dividend and the investor's required return.</p>
          ${field('psvDividend', 'Annual Preferred Dividend', '', 'number')}
          ${field('psvRate', 'Required Rate of Return (%)', 'e.g. 8', 'number')}
        `,
        calc: (out) => {
          const div = num('psvDividend'), rate = num('psvRate');
          if (div === null || rate === null || rate === 0) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('Preferred Stock Value', round(div / (rate / 100), 2));
        }
      }
    ],

    Vectors: [
      {
        id: 'vectorAddSub',
        label: 'Vector Addition / Subtraction',
        render: () => `
          <p class="tool-hint">Works in 2D or 3D — leave the z-fields blank for 2D vectors.</p>
          <div class="tool-vector-row">
            ${field('vasAx', 'Ax', 'Ax', 'number')}
            ${field('vasAy', 'Ay', 'Ay', 'number')}
            ${field('vasAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('vasBx', 'Bx', 'Bx', 'number')}
            ${field('vasBy', 'By', 'By', 'number')}
            ${field('vasBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('vasAx'), ay = num('vasAy'), az = num('vasAz') || 0;
          const bx = num('vasBx'), by = num('vasBy'), bz = num('vasBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          out.innerHTML =
            resultCell('A + B', `(${round(ax + bx, 4)}, ${round(ay + by, 4)}, ${round(az + bz, 4)})`) +
            resultCell('A − B', `(${round(ax - bx, 4)}, ${round(ay - by, 4)}, ${round(az - bz, 4)})`);
        }
      },
      {
        id: 'unitVector',
        label: 'Unit Vector & Magnitude',
        render: () => `
          ${field('uvX', 'x', 'x', 'number')}
          ${field('uvY', 'y', 'y', 'number')}
          ${field('uvZ', 'z', 'z (optional)', 'number')}
        `,
        calc: (out) => {
          const x = num('uvX'), y = num('uvY'), z = num('uvZ') || 0;
          if (x === null || y === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const mag = Math.sqrt(x * x + y * y + z * z);
          if (mag === 0) { out.innerHTML = errorBox('The zero vector has no direction.'); return; }
          out.innerHTML =
            resultCell('Magnitude |v|', round(mag, 5)) +
            resultCell('Unit Vector', `(${round(x / mag, 5)}, ${round(y / mag, 5)}, ${round(z / mag, 5)})`);
        }
      },
      {
        id: 'vectorProjection',
        label: 'Vector Projection',
        render: () => `
          <p class="tool-hint">Projection of vector A onto vector B.</p>
          <div class="tool-vector-row">
            ${field('vpAx', 'Ax', 'Ax', 'number')}
            ${field('vpAy', 'Ay', 'Ay', 'number')}
            ${field('vpAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('vpBx', 'Bx', 'Bx', 'number')}
            ${field('vpBy', 'By', 'By', 'number')}
            ${field('vpBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('vpAx'), ay = num('vpAy'), az = num('vpAz') || 0;
          const bx = num('vpBx'), by = num('vpBy'), bz = num('vpBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const dot = ax * bx + ay * by + az * bz;
          const magBsq = bx * bx + by * by + bz * bz;
          if (magBsq === 0) { out.innerHTML = errorBox('Vector B cannot be the zero vector.'); return; }
          const scalarProj = dot / Math.sqrt(magBsq);
          const k = dot / magBsq;
          out.innerHTML =
            resultCell('Scalar Projection', round(scalarProj, 5)) +
            resultCell('Vector Projection', `(${round(k * bx, 5)}, ${round(k * by, 5)}, ${round(k * bz, 5)})`);
        }
      },
      {
        id: 'directionCosines',
        label: 'Direction Cosines',
        render: () => `
          ${field('dcX', 'x', 'x', 'number')}
          ${field('dcY', 'y', 'y', 'number')}
          ${field('dcZ', 'z', 'z', 'number')}
        `,
        calc: (out) => {
          const x = num('dcX'), y = num('dcY'), z = num('dcZ');
          if (x === null || y === null || z === null) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const mag = Math.sqrt(x * x + y * y + z * z);
          if (mag === 0) { out.innerHTML = errorBox('The zero vector has no direction.'); return; }
          out.innerHTML =
            resultCell('cos α (x-axis)', round(x / mag, 5)) +
            resultCell('cos β (y-axis)', round(y / mag, 5)) +
            resultCell('cos γ (z-axis)', round(z / mag, 5)) +
            resultCell('|v|', round(mag, 5));
        }
      },
      {
        id: 'scalarTripleProduct',
        label: 'Scalar Triple Product',
        render: () => `
          <p class="tool-hint">A·(B×C) — signed volume of the parallelepiped formed by three vectors. Zero means the vectors are coplanar.</p>
          <div class="tool-vector-row">
            ${field('stpAx', 'Ax', 'Ax', 'number')}${field('stpAy', 'Ay', 'Ay', 'number')}${field('stpAz', 'Az', 'Az', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('stpBx', 'Bx', 'Bx', 'number')}${field('stpBy', 'By', 'By', 'number')}${field('stpBz', 'Bz', 'Bz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('stpCx', 'Cx', 'Cx', 'number')}${field('stpCy', 'Cy', 'Cy', 'number')}${field('stpCz', 'Cz', 'Cz', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('stpAx'), ay = num('stpAy'), az = num('stpAz');
          const bx = num('stpBx'), by = num('stpBy'), bz = num('stpBz');
          const cx = num('stpCx'), cy = num('stpCy'), cz = num('stpCz');
          if ([ax, ay, az, bx, by, bz, cx, cy, cz].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const crossX = by * cz - bz * cy, crossY = bz * cx - bx * cz, crossZ = bx * cy - by * cx;
          const triple = ax * crossX + ay * crossY + az * crossZ;
          out.innerHTML =
            resultCell('A·(B×C)', round(triple, 4)) +
            resultCell('Coplanar?', Math.abs(triple) < 1e-9 ? 'Yes (volume = 0)' : 'No');
        }
      },
      {
        id: 'vectorTripleProduct',
        label: 'Vector Triple Product',
        render: () => `
          <p class="tool-hint">A×(B×C) — a vector perpendicular to A and lying in the plane of B and C.</p>
          <div class="tool-vector-row">
            ${field('vtpAx', 'Ax', 'Ax', 'number')}${field('vtpAy', 'Ay', 'Ay', 'number')}${field('vtpAz', 'Az', 'Az', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('vtpBx', 'Bx', 'Bx', 'number')}${field('vtpBy', 'By', 'By', 'number')}${field('vtpBz', 'Bz', 'Bz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('vtpCx', 'Cx', 'Cx', 'number')}${field('vtpCy', 'Cy', 'Cy', 'number')}${field('vtpCz', 'Cz', 'Cz', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('vtpAx'), ay = num('vtpAy'), az = num('vtpAz');
          const bx = num('vtpBx'), by = num('vtpBy'), bz = num('vtpBz');
          const cx = num('vtpCx'), cy = num('vtpCy'), cz = num('vtpCz');
          if ([ax, ay, az, bx, by, bz, cx, cy, cz].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const bcx = by * cz - bz * cy, bcy = bz * cx - bx * cz, bcz = bx * cy - by * cx;
          const rx = ay * bcz - az * bcy, ry = az * bcx - ax * bcz, rz = ax * bcy - ay * bcx;
          out.innerHTML = resultCell('A×(B×C)', `(${round(rx, 4)}, ${round(ry, 4)}, ${round(rz, 4)})`);
        }
      },
      {
        id: 'parallelogramArea',
        label: 'Area of Parallelogram (Vectors)',
        render: () => `
          <p class="tool-hint">Area = |A × B| — area of the parallelogram spanned by two vectors.</p>
          <div class="tool-vector-row">
            ${field('paAx', 'Ax', 'Ax', 'number')}${field('paAy', 'Ay', 'Ay', 'number')}${field('paAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('paBx', 'Bx', 'Bx', 'number')}${field('paBy', 'By', 'By', 'number')}${field('paBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('paAx'), ay = num('paAy'), az = num('paAz') || 0;
          const bx = num('paBx'), by = num('paBy'), bz = num('paBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
          out.innerHTML = resultCell('Area', round(Math.sqrt(cx * cx + cy * cy + cz * cz), 5));
        }
      },
      {
        id: 'triangleAreaVectors',
        label: 'Area of Triangle (Vectors)',
        render: () => `
          <p class="tool-hint">Area = ½|A × B| — area of the triangle spanned by two vectors from a common vertex.</p>
          <div class="tool-vector-row">
            ${field('tavAx', 'Ax', 'Ax', 'number')}${field('tavAy', 'Ay', 'Ay', 'number')}${field('tavAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('tavBx', 'Bx', 'Bx', 'number')}${field('tavBy', 'By', 'By', 'number')}${field('tavBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('tavAx'), ay = num('tavAy'), az = num('tavAz') || 0;
          const bx = num('tavBx'), by = num('tavBy'), bz = num('tavBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
          out.innerHTML = resultCell('Area', round(0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz), 5));
        }
      },
      {
        id: 'planeEquationFromPointNormal',
        label: 'Plane Equation (Point & Normal)',
        render: () => `
          <p class="tool-hint">Plane through point (x₀,y₀,z₀) with normal vector (a,b,c): a(x−x₀) + b(y−y₀) + c(z−z₀) = 0.</p>
          <div class="tool-vector-row">
            ${field('pePx', 'x₀', 'x₀', 'number')}${field('pePy', 'y₀', 'y₀', 'number')}${field('pePz', 'z₀', 'z₀', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('peNx', 'a (normal x)', 'a', 'number')}${field('peNy', 'b (normal y)', 'b', 'number')}${field('peNz', 'c (normal z)', 'c', 'number')}
          </div>
        `,
        calc: (out) => {
          const px = num('pePx'), py = num('pePy'), pz = num('pePz');
          const a = num('peNx'), b = num('peNy'), c = num('peNz');
          if ([px, py, pz, a, b, c].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const d = a * px + b * py + c * pz;
          out.innerHTML = resultCell('Plane Equation', `${round(a, 3)}x + ${round(b, 3)}y + ${round(c, 3)}z = ${round(d, 3)}`);
        }
      },
      {
        id: 'lineEquationParametric3D',
        label: 'Line Equation (Point & Direction)',
        render: () => `
          <p class="tool-hint">Parametric line through point (x₀,y₀,z₀) with direction vector (a,b,c): x = x₀+at, y = y₀+bt, z = z₀+ct.</p>
          <div class="tool-vector-row">
            ${field('lePx', 'x₀', 'x₀', 'number')}${field('lePy', 'y₀', 'y₀', 'number')}${field('lePz', 'z₀', 'z₀', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('leDx', 'a (dir x)', 'a', 'number')}${field('leDy', 'b (dir y)', 'b', 'number')}${field('leDz', 'c (dir z)', 'c', 'number')}
          </div>
        `,
        calc: (out) => {
          const px = num('lePx'), py = num('lePy'), pz = num('lePz');
          const a = num('leDx'), b = num('leDy'), c = num('leDz');
          if ([px, py, pz, a, b, c].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          out.innerHTML =
            resultCell('Parametric Form', `x = ${round(px, 3)} + ${round(a, 3)}t,  y = ${round(py, 3)} + ${round(b, 3)}t,  z = ${round(pz, 3)} + ${round(c, 3)}t`) +
            resultCell('Symmetric Form', `(x−${round(px, 3)})/${round(a, 3)} = (y−${round(py, 3)})/${round(b, 3)} = (z−${round(pz, 3)})/${round(c, 3)}`);
        }
      },
      {
        id: 'pointToPlaneDistance',
        label: 'Distance: Point to Plane',
        render: () => `
          <p class="tool-hint">Distance from point (x₀,y₀,z₀) to plane ax+by+cz+d=0: |ax₀+by₀+cz₀+d| / √(a²+b²+c²).</p>
          <div class="tool-vector-row">
            ${field('ptpX', 'x₀', 'x₀', 'number')}${field('ptpY', 'y₀', 'y₀', 'number')}${field('ptpZ', 'z₀', 'z₀', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('ptpA', 'a', 'a', 'number')}${field('ptpB', 'b', 'b', 'number')}${field('ptpC', 'c', 'c', 'number')}${field('ptpD', 'd', 'd', 'number')}
          </div>
        `,
        calc: (out) => {
          const x0 = num('ptpX'), y0 = num('ptpY'), z0 = num('ptpZ');
          const a = num('ptpA'), b = num('ptpB'), c = num('ptpC'), d = num('ptpD');
          if ([x0, y0, z0, a, b, c, d].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const denom = Math.sqrt(a * a + b * b + c * c);
          if (denom === 0) { out.innerHTML = errorBox('Normal vector (a,b,c) cannot be zero.'); return; }
          out.innerHTML = resultCell('Distance', round(Math.abs(a * x0 + b * y0 + c * z0 + d) / denom, 5));
        }
      },
      {
        id: 'pointToLineDistance3D',
        label: 'Distance: Point to Line (3D)',
        render: () => `
          <p class="tool-hint">Shortest distance from point P to the line through point Q with direction vector D.</p>
          <div class="tool-vector-row">
            ${field('pldPx', 'Px', 'Px', 'number')}${field('pldPy', 'Py', 'Py', 'number')}${field('pldPz', 'Pz', 'Pz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('pldQx', 'Qx', 'Qx', 'number')}${field('pldQy', 'Qy', 'Qy', 'number')}${field('pldQz', 'Qz', 'Qz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('pldDx', 'Dx', 'Dx', 'number')}${field('pldDy', 'Dy', 'Dy', 'number')}${field('pldDz', 'Dz', 'Dz', 'number')}
          </div>
        `,
        calc: (out) => {
          const px = num('pldPx'), py = num('pldPy'), pz = num('pldPz');
          const qx = num('pldQx'), qy = num('pldQy'), qz = num('pldQz');
          const dx = num('pldDx'), dy = num('pldDy'), dz = num('pldDz');
          if ([px, py, pz, qx, qy, qz, dx, dy, dz].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const wx = px - qx, wy = py - qy, wz = pz - qz;
          const crossX = wy * dz - wz * dy, crossY = wz * dx - wx * dz, crossZ = wx * dy - wy * dx;
          const magCross = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
          const magD = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (magD === 0) { out.innerHTML = errorBox('Direction vector D cannot be zero.'); return; }
          out.innerHTML = resultCell('Distance', round(magCross / magD, 5));
        }
      },
      {
        id: 'angleBetweenPlanes',
        label: 'Angle Between Two Planes',
        render: () => `
          <p class="tool-hint">Angle between planes with normal vectors N₁=(a₁,b₁,c₁) and N₂=(a₂,b₂,c₂): cos θ = |N₁·N₂| / (|N₁||N₂|).</p>
          <div class="tool-vector-row">
            ${field('abpA1', 'a₁', 'a₁', 'number')}${field('abpB1', 'b₁', 'b₁', 'number')}${field('abpC1', 'c₁', 'c₁', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('abpA2', 'a₂', 'a₂', 'number')}${field('abpB2', 'b₂', 'b₂', 'number')}${field('abpC2', 'c₂', 'c₂', 'number')}
          </div>
        `,
        calc: (out) => {
          const a1 = num('abpA1'), b1 = num('abpB1'), c1 = num('abpC1');
          const a2 = num('abpA2'), b2 = num('abpB2'), c2 = num('abpC2');
          if ([a1, b1, c1, a2, b2, c2].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const dot = a1 * a2 + b1 * b2 + c1 * c2;
          const mag1 = Math.sqrt(a1 * a1 + b1 * b1 + c1 * c1), mag2 = Math.sqrt(a2 * a2 + b2 * b2 + c2 * c2);
          if (mag1 === 0 || mag2 === 0) { out.innerHTML = errorBox('Normal vectors cannot be zero.'); return; }
          const cosTheta = Math.abs(dot) / (mag1 * mag2);
          out.innerHTML = resultCell('Angle Between Planes', round(Math.acos(Math.max(-1, Math.min(1, cosTheta))) * 180 / Math.PI, 3) + '°');
        }
      },
      {
        id: 'angleLinePlane',
        label: 'Angle Between Line and Plane',
        render: () => `
          <p class="tool-hint">Line direction D=(dx,dy,dz), plane normal N=(a,b,c): sin θ = |D·N| / (|D||N|).</p>
          <div class="tool-vector-row">
            ${field('alpDx', 'dx', 'dx', 'number')}${field('alpDy', 'dy', 'dy', 'number')}${field('alpDz', 'dz', 'dz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('alpA', 'a (normal x)', 'a', 'number')}${field('alpB', 'b (normal y)', 'b', 'number')}${field('alpC', 'c (normal z)', 'c', 'number')}
          </div>
        `,
        calc: (out) => {
          const dx = num('alpDx'), dy = num('alpDy'), dz = num('alpDz');
          const a = num('alpA'), b = num('alpB'), c = num('alpC');
          if ([dx, dy, dz, a, b, c].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const dot = dx * a + dy * b + dz * c;
          const magD = Math.sqrt(dx * dx + dy * dy + dz * dz), magN = Math.sqrt(a * a + b * b + c * c);
          if (magD === 0 || magN === 0) { out.innerHTML = errorBox('Direction and normal vectors cannot be zero.'); return; }
          const sinTheta = Math.abs(dot) / (magD * magN);
          out.innerHTML = resultCell('Angle Between Line and Plane', round(Math.asin(Math.max(-1, Math.min(1, sinTheta))) * 180 / Math.PI, 3) + '°');
        }
      },
      {
        id: 'dotProduct',
        label: 'Dot Product',
        render: () => `
          <p class="tool-hint">A·B = AxBx + AyBy + AzBz — leave z-fields blank for 2D vectors.</p>
          <div class="tool-vector-row">
            ${field('dpAx', 'Ax', 'Ax', 'number')}${field('dpAy', 'Ay', 'Ay', 'number')}${field('dpAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('dpBx', 'Bx', 'Bx', 'number')}${field('dpBy', 'By', 'By', 'number')}${field('dpBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('dpAx'), ay = num('dpAy'), az = num('dpAz') || 0;
          const bx = num('dpBx'), by = num('dpBy'), bz = num('dpBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          out.innerHTML = resultCell('A·B', round(ax * bx + ay * by + az * bz, 5));
        }
      },
      {
        id: 'crossProduct',
        label: 'Cross Product',
        render: () => `
          <p class="tool-hint">A×B — a vector perpendicular to both A and B (3D vectors).</p>
          <div class="tool-vector-row">
            ${field('cpAx', 'Ax', 'Ax', 'number')}${field('cpAy', 'Ay', 'Ay', 'number')}${field('cpAz', 'Az', 'Az', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('cpBx', 'Bx', 'Bx', 'number')}${field('cpBy', 'By', 'By', 'number')}${field('cpBz', 'Bz', 'Bz', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('cpAx'), ay = num('cpAy'), az = num('cpAz');
          const bx = num('cpBx'), by = num('cpBy'), bz = num('cpBz');
          if ([ax, ay, az, bx, by, bz].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
          out.innerHTML = resultCell('A×B', `(${round(cx, 4)}, ${round(cy, 4)}, ${round(cz, 4)})`) +
            resultCell('|A×B|', round(Math.sqrt(cx * cx + cy * cy + cz * cz), 5));
        }
      },
      {
        id: 'angleBetweenVectors',
        label: 'Angle Between Two Vectors',
        render: () => `
          <p class="tool-hint">cos θ = (A·B) / (|A||B|) — leave z-fields blank for 2D vectors.</p>
          <div class="tool-vector-row">
            ${field('abvAx', 'Ax', 'Ax', 'number')}${field('abvAy', 'Ay', 'Ay', 'number')}${field('abvAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('abvBx', 'Bx', 'Bx', 'number')}${field('abvBy', 'By', 'By', 'number')}${field('abvBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('abvAx'), ay = num('abvAy'), az = num('abvAz') || 0;
          const bx = num('abvBx'), by = num('abvBy'), bz = num('abvBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const dot = ax * bx + ay * by + az * bz;
          const magA = Math.sqrt(ax * ax + ay * ay + az * az), magB = Math.sqrt(bx * bx + by * by + bz * bz);
          if (magA === 0 || magB === 0) { out.innerHTML = errorBox('Neither vector can be the zero vector.'); return; }
          const cosTheta = Math.max(-1, Math.min(1, dot / (magA * magB)));
          out.innerHTML = resultCell('Angle Between Vectors', round(Math.acos(cosTheta) * 180 / Math.PI, 3) + '°');
        }
      },
      {
        id: 'vectorDecomposition',
        label: 'Resolve Vector (Parallel & Perpendicular)',
        render: () => `
          <p class="tool-hint">Splits A into a component parallel to B and a component perpendicular to B.</p>
          <div class="tool-vector-row">
            ${field('vdAx', 'Ax', 'Ax', 'number')}${field('vdAy', 'Ay', 'Ay', 'number')}${field('vdAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('vdBx', 'Bx', 'Bx', 'number')}${field('vdBy', 'By', 'By', 'number')}${field('vdBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('vdAx'), ay = num('vdAy'), az = num('vdAz') || 0;
          const bx = num('vdBx'), by = num('vdBy'), bz = num('vdBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const dot = ax * bx + ay * by + az * bz;
          const magBsq = bx * bx + by * by + bz * bz;
          if (magBsq === 0) { out.innerHTML = errorBox('Vector B cannot be the zero vector.'); return; }
          const k = dot / magBsq;
          const parX = k * bx, parY = k * by, parZ = k * bz;
          const perpX = ax - parX, perpY = ay - parY, perpZ = az - parZ;
          out.innerHTML =
            resultCell('Parallel Component', `(${round(parX, 4)}, ${round(parY, 4)}, ${round(parZ, 4)})`) +
            resultCell('Perpendicular Component', `(${round(perpX, 4)}, ${round(perpY, 4)}, ${round(perpZ, 4)})`);
        }
      },
      {
        id: 'vectorReflection',
        label: 'Reflection of Vector Across a Plane',
        render: () => `
          <p class="tool-hint">Reflects vector V across a plane with normal N: V' = V − 2(V·N̂)N̂.</p>
          <div class="tool-vector-row">
            ${field('vrVx', 'Vx', 'Vx', 'number')}${field('vrVy', 'Vy', 'Vy', 'number')}${field('vrVz', 'Vz', 'Vz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('vrNx', 'Nx (normal)', 'Nx', 'number')}${field('vrNy', 'Ny (normal)', 'Ny', 'number')}${field('vrNz', 'Nz (normal)', 'Nz', 'number')}
          </div>
        `,
        calc: (out) => {
          const vx = num('vrVx'), vy = num('vrVy'), vz = num('vrVz');
          const nx = num('vrNx'), ny = num('vrNy'), nz = num('vrNz');
          if ([vx, vy, vz, nx, ny, nz].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const magN = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (magN === 0) { out.innerHTML = errorBox('Normal vector cannot be zero.'); return; }
          const ux = nx / magN, uy = ny / magN, uz = nz / magN;
          const dot = vx * ux + vy * uy + vz * uz;
          const rx = vx - 2 * dot * ux, ry = vy - 2 * dot * uy, rz = vz - 2 * dot * uz;
          out.innerHTML = resultCell("Reflected Vector V'", `(${round(rx, 4)}, ${round(ry, 4)}, ${round(rz, 4)})`);
        }
      },
      {
        id: 'midpointDistance3D',
        label: 'Midpoint & Distance Between Two Points',
        render: () => `
          <p class="tool-hint">Works in 2D or 3D — leave the z-fields blank for 2D points.</p>
          <div class="tool-vector-row">
            ${field('mdP1x', 'x₁', 'x₁', 'number')}${field('mdP1y', 'y₁', 'y₁', 'number')}${field('mdP1z', 'z₁', 'z₁ (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('mdP2x', 'x₂', 'x₂', 'number')}${field('mdP2y', 'y₂', 'y₂', 'number')}${field('mdP2z', 'z₂', 'z₂ (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const x1 = num('mdP1x'), y1 = num('mdP1y'), z1 = num('mdP1z') || 0;
          const x2 = num('mdP2x'), y2 = num('mdP2y'), z2 = num('mdP2z') || 0;
          if (x1 === null || y1 === null || x2 === null || y2 === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, mz = (z1 + z2) / 2;
          const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
          out.innerHTML =
            resultCell('Midpoint', `(${round(mx, 4)}, ${round(my, 4)}, ${round(mz, 4)})`) +
            resultCell('Distance', round(dist, 5));
        }
      },
      {
        id: 'lineFromTwoPoints3D',
        label: 'Line Equation (Two Points)',
        render: () => `
          <p class="tool-hint">Parametric line through points P₁ and P₂: direction D = P₂ − P₁.</p>
          <div class="tool-vector-row">
            ${field('l2pP1x', 'x₁', 'x₁', 'number')}${field('l2pP1y', 'y₁', 'y₁', 'number')}${field('l2pP1z', 'z₁', 'z₁', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('l2pP2x', 'x₂', 'x₂', 'number')}${field('l2pP2y', 'y₂', 'y₂', 'number')}${field('l2pP2z', 'z₂', 'z₂', 'number')}
          </div>
        `,
        calc: (out) => {
          const x1 = num('l2pP1x'), y1 = num('l2pP1y'), z1 = num('l2pP1z');
          const x2 = num('l2pP2x'), y2 = num('l2pP2y'), z2 = num('l2pP2z');
          if ([x1, y1, z1, x2, y2, z2].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const a = x2 - x1, b = y2 - y1, c = z2 - z1;
          if (a === 0 && b === 0 && c === 0) { out.innerHTML = errorBox('The two points must be different.'); return; }
          out.innerHTML =
            resultCell('Direction Vector', `(${round(a, 4)}, ${round(b, 4)}, ${round(c, 4)})`) +
            resultCell('Parametric Form', `x = ${round(x1, 3)} + ${round(a, 3)}t,  y = ${round(y1, 3)} + ${round(b, 3)}t,  z = ${round(z1, 3)} + ${round(c, 3)}t`);
        }
      },
      {
        id: 'planeFromThreePoints',
        label: 'Plane Equation (Three Points)',
        render: () => `
          <p class="tool-hint">Finds the plane ax+by+cz=d passing through three non-collinear points.</p>
          <div class="tool-vector-row">
            ${field('p3P1x', 'x₁', 'x₁', 'number')}${field('p3P1y', 'y₁', 'y₁', 'number')}${field('p3P1z', 'z₁', 'z₁', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('p3P2x', 'x₂', 'x₂', 'number')}${field('p3P2y', 'y₂', 'y₂', 'number')}${field('p3P2z', 'z₂', 'z₂', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('p3P3x', 'x₃', 'x₃', 'number')}${field('p3P3y', 'y₃', 'y₃', 'number')}${field('p3P3z', 'z₃', 'z₃', 'number')}
          </div>
        `,
        calc: (out) => {
          const x1 = num('p3P1x'), y1 = num('p3P1y'), z1 = num('p3P1z');
          const x2 = num('p3P2x'), y2 = num('p3P2y'), z2 = num('p3P2z');
          const x3 = num('p3P3x'), y3 = num('p3P3y'), z3 = num('p3P3z');
          if ([x1, y1, z1, x2, y2, z2, x3, y3, z3].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const ux = x2 - x1, uy = y2 - y1, uz = z2 - z1;
          const vx = x3 - x1, vy = y3 - y1, vz = z3 - z1;
          const a = uy * vz - uz * vy, b = uz * vx - ux * vz, c = ux * vy - uy * vx;
          if (a === 0 && b === 0 && c === 0) { out.innerHTML = errorBox('The three points must not be collinear.'); return; }
          const d = a * x1 + b * y1 + c * z1;
          out.innerHTML = resultCell('Plane Equation', `${round(a, 3)}x + ${round(b, 3)}y + ${round(c, 3)}z = ${round(d, 3)}`);
        }
      },
      {
        id: 'angleBetweenLines3D',
        label: 'Angle Between Two Lines (3D)',
        render: () => `
          <p class="tool-hint">For lines with direction vectors D₁ and D₂: cos θ = |D₁·D₂| / (|D₁||D₂|).</p>
          <div class="tool-vector-row">
            ${field('abl1x', 'D₁x', 'D₁x', 'number')}${field('abl1y', 'D₁y', 'D₁y', 'number')}${field('abl1z', 'D₁z', 'D₁z', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('abl2x', 'D₂x', 'D₂x', 'number')}${field('abl2y', 'D₂y', 'D₂y', 'number')}${field('abl2z', 'D₂z', 'D₂z', 'number')}
          </div>
        `,
        calc: (out) => {
          const d1x = num('abl1x'), d1y = num('abl1y'), d1z = num('abl1z');
          const d2x = num('abl2x'), d2y = num('abl2y'), d2z = num('abl2z');
          if ([d1x, d1y, d1z, d2x, d2y, d2z].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const dot = d1x * d2x + d1y * d2y + d1z * d2z;
          const mag1 = Math.sqrt(d1x * d1x + d1y * d1y + d1z * d1z), mag2 = Math.sqrt(d2x * d2x + d2y * d2y + d2z * d2z);
          if (mag1 === 0 || mag2 === 0) { out.innerHTML = errorBox('Direction vectors cannot be zero.'); return; }
          const cosTheta = Math.abs(dot) / (mag1 * mag2);
          out.innerHTML = resultCell('Angle Between Lines', round(Math.acos(Math.max(-1, Math.min(1, cosTheta))) * 180 / Math.PI, 3) + '°');
        }
      },
      {
        id: 'lineLineDistance3D',
        label: 'Shortest Distance Between Two Lines (3D)',
        render: () => `
          <p class="tool-hint">For skew lines through points P₁, P₂ with directions D₁, D₂: distance = |(P₂−P₁)·(D₁×D₂)| / |D₁×D₂|.</p>
          <div class="tool-vector-row">
            ${field('lldP1x', 'P₁x', 'P₁x', 'number')}${field('lldP1y', 'P₁y', 'P₁y', 'number')}${field('lldP1z', 'P₁z', 'P₁z', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('lldD1x', 'D₁x', 'D₁x', 'number')}${field('lldD1y', 'D₁y', 'D₁y', 'number')}${field('lldD1z', 'D₁z', 'D₁z', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('lldP2x', 'P₂x', 'P₂x', 'number')}${field('lldP2y', 'P₂y', 'P₂y', 'number')}${field('lldP2z', 'P₂z', 'P₂z', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('lldD2x', 'D₂x', 'D₂x', 'number')}${field('lldD2y', 'D₂y', 'D₂y', 'number')}${field('lldD2z', 'D₂z', 'D₂z', 'number')}
          </div>
        `,
        calc: (out) => {
          const p1x = num('lldP1x'), p1y = num('lldP1y'), p1z = num('lldP1z');
          const d1x = num('lldD1x'), d1y = num('lldD1y'), d1z = num('lldD1z');
          const p2x = num('lldP2x'), p2y = num('lldP2y'), p2z = num('lldP2z');
          const d2x = num('lldD2x'), d2y = num('lldD2y'), d2z = num('lldD2z');
          if ([p1x, p1y, p1z, d1x, d1y, d1z, p2x, p2y, p2z, d2x, d2y, d2z].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const crossX = d1y * d2z - d1z * d2y, crossY = d1z * d2x - d1x * d2z, crossZ = d1x * d2y - d1y * d2x;
          const magCross = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
          const wx = p2x - p1x, wy = p2y - p1y, wz = p2z - p1z;
          if (magCross === 0) {
            // Parallel lines — distance from P1 to line 2
            const crossX2 = wy * d1z - wz * d1y, crossY2 = wz * d1x - wx * d1z, crossZ2 = wx * d1y - wy * d1x;
            const magD1 = Math.sqrt(d1x * d1x + d1y * d1y + d1z * d1z);
            if (magD1 === 0) { out.innerHTML = errorBox('Direction vectors cannot be zero.'); return; }
            out.innerHTML = resultCell('Distance (Parallel Lines)', round(Math.sqrt(crossX2 * crossX2 + crossY2 * crossY2 + crossZ2 * crossZ2) / magD1, 5));
            return;
          }
          const dist = Math.abs(wx * crossX + wy * crossY + wz * crossZ) / magCross;
          out.innerHTML = resultCell('Shortest Distance', round(dist, 5));
        }
      },
      {
        id: 'scalarMultVector',
        label: 'Scalar Multiplication of a Vector',
        render: () => `
          <p class="tool-hint">Works in 2D or 3D — leave the z-field blank for 2D vectors.</p>
          ${field('smvK', 'Scalar k', 'e.g. 3', 'number')}
          <div class="tool-vector-row">
            ${field('smvX', 'Ax', 'Ax', 'number')}${field('smvY', 'Ay', 'Ay', 'number')}${field('smvZ', 'Az', 'Az (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const k = num('smvK'), x = num('smvX'), y = num('smvY'), z = num('smvZ') || 0;
          if (k === null || x === null || y === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const rx = k * x, ry = k * y, rz = k * z;
          out.innerHTML =
            resultCell('k·A', `(${round(rx, 5)}, ${round(ry, 5)}, ${round(rz, 5)})`) +
            resultCell('Magnitude', round(Math.sqrt(rx * rx + ry * ry + rz * rz), 5));
        }
      },
      {
        id: 'resultantVectors',
        label: 'Resultant of Multiple Vectors',
        render: () => `
          <p class="tool-hint">Sum of two or three vectors. Leave Vector C blank to add only A and B. Works in 2D or 3D — leave z-fields blank for 2D.</p>
          <div class="tool-vector-row">
            ${field('rvAx', 'Ax', 'Ax', 'number')}${field('rvAy', 'Ay', 'Ay', 'number')}${field('rvAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('rvBx', 'Bx', 'Bx', 'number')}${field('rvBy', 'By', 'By', 'number')}${field('rvBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('rvCx', 'Cx', 'Cx (optional)', 'number')}${field('rvCy', 'Cy', 'Cy (optional)', 'number')}${field('rvCz', 'Cz', 'Cz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('rvAx'), ay = num('rvAy'), az = num('rvAz') || 0;
          const bx = num('rvBx'), by = num('rvBy'), bz = num('rvBz') || 0;
          const cx = num('rvCx'), cy = num('rvCy'), cz = num('rvCz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const hasC = num('rvCx') !== null || num('rvCy') !== null;
          if (hasC && (cx === null || cy === null)) { out.innerHTML = errorBox('Please enter both Cx and Cy, or leave Vector C blank entirely.'); return; }
          const rx = ax + bx + (hasC ? cx : 0), ry = ay + by + (hasC ? cy : 0), rz = az + bz + (hasC ? cz : 0);
          out.innerHTML =
            resultCell('Resultant Vector', `(${round(rx, 5)}, ${round(ry, 5)}, ${round(rz, 5)})`) +
            resultCell('Magnitude', round(Math.sqrt(rx * rx + ry * ry + rz * rz), 5));
        }
      },
      {
        id: 'equilibrantVector',
        label: 'Equilibrant of Multiple Vectors',
        render: () => `
          <p class="tool-hint">The equilibrant is the vector that balances the given vectors — equal in magnitude but opposite in direction to their resultant. Leave Vector C blank to use only A and B.</p>
          <div class="tool-vector-row">
            ${field('eqAx', 'Ax', 'Ax', 'number')}${field('eqAy', 'Ay', 'Ay', 'number')}${field('eqAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('eqBx', 'Bx', 'Bx', 'number')}${field('eqBy', 'By', 'By', 'number')}${field('eqBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('eqCx', 'Cx', 'Cx (optional)', 'number')}${field('eqCy', 'Cy', 'Cy (optional)', 'number')}${field('eqCz', 'Cz', 'Cz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('eqAx'), ay = num('eqAy'), az = num('eqAz') || 0;
          const bx = num('eqBx'), by = num('eqBy'), bz = num('eqBz') || 0;
          const cx = num('eqCx'), cy = num('eqCy'), cz = num('eqCz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const hasC = num('eqCx') !== null || num('eqCy') !== null;
          if (hasC && (cx === null || cy === null)) { out.innerHTML = errorBox('Please enter both Cx and Cy, or leave Vector C blank entirely.'); return; }
          const rx = ax + bx + (hasC ? cx : 0), ry = ay + by + (hasC ? cy : 0), rz = az + bz + (hasC ? cz : 0);
          out.innerHTML =
            resultCell('Equilibrant Vector', `(${round(-rx, 5)}, ${round(-ry, 5)}, ${round(-rz, 5)})`) +
            resultCell('Magnitude', round(Math.sqrt(rx * rx + ry * ry + rz * rz), 5));
        }
      },
      {
        id: 'vectorComponentsFromAngle',
        label: 'Resolve Vector into Components',
        render: () => `
          <p class="tool-hint">Given a vector's magnitude and the angle it makes with the positive x-axis, find its rectangular (x, y) components.</p>
          ${field('vcfaMag', 'Magnitude', 'e.g. 10', 'number')}
          ${field('vcfaAngle', 'Angle with x-axis (°)', 'e.g. 30', 'number')}
        `,
        calc: (out) => {
          const mag = num('vcfaMag'), angle = num('vcfaAngle');
          if (mag === null || angle === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const rad = angle * Math.PI / 180;
          out.innerHTML =
            resultCell('x-component', round(mag * Math.cos(rad), 5)) +
            resultCell('y-component', round(mag * Math.sin(rad), 5));
        }
      },
      {
        id: 'displacementVector',
        label: 'Displacement Vector Between Two Points',
        render: () => `
          <p class="tool-hint">Vector from point A to point B. Works in 2D or 3D — leave the z-fields blank for 2D points.</p>
          <div class="tool-vector-row">
            ${field('dvAx', 'Ax', 'Ax', 'number')}${field('dvAy', 'Ay', 'Ay', 'number')}${field('dvAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('dvBx', 'Bx', 'Bx', 'number')}${field('dvBy', 'By', 'By', 'number')}${field('dvBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('dvAx'), ay = num('dvAy'), az = num('dvAz') || 0;
          const bx = num('dvBx'), by = num('dvBy'), bz = num('dvBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const dx = bx - ax, dy = by - ay, dz = bz - az;
          const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (mag === 0) { out.innerHTML = errorBox('Points A and B cannot be the same.'); return; }
          out.innerHTML =
            resultCell('Displacement Vector (A→B)', `(${round(dx, 5)}, ${round(dy, 5)}, ${round(dz, 5)})`) +
            resultCell('Magnitude', round(mag, 5)) +
            resultCell('Unit Vector', `(${round(dx / mag, 5)}, ${round(dy / mag, 5)}, ${round(dz / mag, 5)})`);
        }
      },
      {
        id: 'sectionFormula3D',
        label: 'Section Formula (Divides Line in Ratio m:n)',
        render: () => `
          <p class="tool-hint">Point P divides segment AB internally in the ratio m:n. Works in 2D or 3D — leave the z-fields blank for 2D points.</p>
          <div class="tool-vector-row">
            ${field('sfAx', 'Ax', 'Ax', 'number')}${field('sfAy', 'Ay', 'Ay', 'number')}${field('sfAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('sfBx', 'Bx', 'Bx', 'number')}${field('sfBy', 'By', 'By', 'number')}${field('sfBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('sfM', 'm', 'e.g. 2', 'number')}${field('sfN', 'n', 'e.g. 3', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('sfAx'), ay = num('sfAy'), az = num('sfAz') || 0;
          const bx = num('sfBx'), by = num('sfBy'), bz = num('sfBz') || 0;
          const m = num('sfM'), n = num('sfN');
          if (ax === null || ay === null || bx === null || by === null || m === null || n === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          if (m + n === 0) { out.innerHTML = errorBox('m + n cannot be zero.'); return; }
          const px = (m * bx + n * ax) / (m + n), py = (m * by + n * ay) / (m + n), pz = (m * bz + n * az) / (m + n);
          out.innerHTML = resultCell('Point P', `(${round(px, 5)}, ${round(py, 5)}, ${round(pz, 5)})`);
        }
      },
      {
        id: 'collinearityTest3D',
        label: 'Collinearity Test of Three Points',
        render: () => `
          <p class="tool-hint">Checks whether points A, B, C lie on the same straight line using vectors AB and AC.</p>
          <div class="tool-vector-row">
            ${field('ctAx', 'Ax', 'Ax', 'number')}${field('ctAy', 'Ay', 'Ay', 'number')}${field('ctAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('ctBx', 'Bx', 'Bx', 'number')}${field('ctBy', 'By', 'By', 'number')}${field('ctBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('ctCx', 'Cx', 'Cx', 'number')}${field('ctCy', 'Cy', 'Cy', 'number')}${field('ctCz', 'Cz', 'Cz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('ctAx'), ay = num('ctAy'), az = num('ctAz') || 0;
          const bx = num('ctBx'), by = num('ctBy'), bz = num('ctBz') || 0;
          const cx = num('ctCx'), cy = num('ctCy'), cz = num('ctCz') || 0;
          if ([ax, ay, bx, by, cx, cy].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const abx = bx - ax, aby = by - ay, abz = bz - az;
          const acx = cx - ax, acy = cy - ay, acz = cz - az;
          const crossX = aby * acz - abz * acy, crossY = abz * acx - abx * acz, crossZ = abx * acy - aby * acx;
          const magCross = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
          out.innerHTML = magCross < 1e-9
            ? resultCell('Result', 'Collinear — the points lie on the same straight line.')
            : resultCell('Result', 'Not collinear — |AB × AC| = ' + round(magCross, 5));
        }
      },
      {
        id: 'coplanarityTest4Points',
        label: 'Coplanarity Test of Four Points',
        render: () => `
          <p class="tool-hint">Checks whether points A, B, C, D lie in the same plane using the scalar triple product AB·(AC×AD).</p>
          <div class="tool-vector-row">
            ${field('cp4Ax', 'Ax', 'Ax', 'number')}${field('cp4Ay', 'Ay', 'Ay', 'number')}${field('cp4Az', 'Az', 'Az', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('cp4Bx', 'Bx', 'Bx', 'number')}${field('cp4By', 'By', 'By', 'number')}${field('cp4Bz', 'Bz', 'Bz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('cp4Cx', 'Cx', 'Cx', 'number')}${field('cp4Cy', 'Cy', 'Cy', 'number')}${field('cp4Cz', 'Cz', 'Cz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('cp4Dx', 'Dx', 'Dx', 'number')}${field('cp4Dy', 'Dy', 'Dy', 'number')}${field('cp4Dz', 'Dz', 'Dz', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('cp4Ax'), ay = num('cp4Ay'), az = num('cp4Az');
          const bx = num('cp4Bx'), by = num('cp4By'), bz = num('cp4Bz');
          const cx = num('cp4Cx'), cy = num('cp4Cy'), cz = num('cp4Cz');
          const dx = num('cp4Dx'), dy = num('cp4Dy'), dz = num('cp4Dz');
          if ([ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const abx = bx - ax, aby = by - ay, abz = bz - az;
          const acx = cx - ax, acy = cy - ay, acz = cz - az;
          const adx = dx - ax, ady = dy - ay, adz = dz - az;
          const crossX = acy * adz - acz * ady, crossY = acz * adx - acx * adz, crossZ = acx * ady - acy * adx;
          const triple = abx * crossX + aby * crossY + abz * crossZ;
          out.innerHTML = Math.abs(triple) < 1e-9
            ? resultCell('Result', 'Coplanar — the four points lie in the same plane.')
            : resultCell('Result', 'Not coplanar — scalar triple product = ' + round(triple, 5));
        }
      },
      {
        id: 'vectorOrthogonalParallelTest',
        label: 'Orthogonal / Parallel Vector Test',
        render: () => `
          <p class="tool-hint">Checks whether two vectors are perpendicular (dot product = 0), parallel (cross product = 0), or neither.</p>
          <div class="tool-vector-row">
            ${field('optAx', 'Ax', 'Ax', 'number')}${field('optAy', 'Ay', 'Ay', 'number')}${field('optAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('optBx', 'Bx', 'Bx', 'number')}${field('optBy', 'By', 'By', 'number')}${field('optBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('optAx'), ay = num('optAy'), az = num('optAz') || 0;
          const bx = num('optBx'), by = num('optBy'), bz = num('optBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const dot = ax * bx + ay * by + az * bz;
          const crossX = ay * bz - az * by, crossY = az * bx - ax * bz, crossZ = ax * by - ay * bx;
          const magCross = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
          let verdict;
          if (Math.abs(dot) < 1e-9) verdict = 'Orthogonal (perpendicular) — dot product is 0.';
          else if (magCross < 1e-9) verdict = 'Parallel — cross product is the zero vector.';
          else verdict = 'Neither orthogonal nor parallel.';
          out.innerHTML =
            resultCell('Result', verdict) +
            resultCell('Dot Product', round(dot, 5)) +
            resultCell('|Cross Product|', round(magCross, 5));
        }
      },
      {
        id: 'angleVectorWithAxes',
        label: 'Angles a Vector Makes with the Axes',
        render: () => `
          <p class="tool-hint">Gives the angles α, β, γ that a vector makes with the positive x, y and z axes. Leave z blank for a 2D vector.</p>
          <div class="tool-vector-row">
            ${field('avaX', 'Ax', 'Ax', 'number')}${field('avaY', 'Ay', 'Ay', 'number')}${field('avaZ', 'Az', 'Az (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const x = num('avaX'), y = num('avaY'), z = num('avaZ') || 0;
          if (x === null || y === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const mag = Math.sqrt(x * x + y * y + z * z);
          if (mag === 0) { out.innerHTML = errorBox('The zero vector has no direction.'); return; }
          const toDeg = 180 / Math.PI;
          out.innerHTML =
            resultCell('α (with x-axis)', round(Math.acos(x / mag) * toDeg, 3) + '°') +
            resultCell('β (with y-axis)', round(Math.acos(y / mag) * toDeg, 3) + '°') +
            resultCell('γ (with z-axis)', round(Math.acos(z / mag) * toDeg, 3) + '°');
        }
      },
      {
        id: 'angleBisectorVector',
        label: 'Angle Bisector Vector of Two Vectors',
        render: () => `
          <p class="tool-hint">Direction of the vector that bisects the angle between A and B: unit(A) + unit(B).</p>
          <div class="tool-vector-row">
            ${field('abvAx', 'Ax', 'Ax', 'number')}${field('abvAy', 'Ay', 'Ay', 'number')}${field('abvAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('abvBx', 'Bx', 'Bx', 'number')}${field('abvBy', 'By', 'By', 'number')}${field('abvBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('abvAx'), ay = num('abvAy'), az = num('abvAz') || 0;
          const bx = num('abvBx'), by = num('abvBy'), bz = num('abvBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const magA = Math.sqrt(ax * ax + ay * ay + az * az), magB = Math.sqrt(bx * bx + by * by + bz * bz);
          if (magA === 0 || magB === 0) { out.innerHTML = errorBox('Neither vector can be the zero vector.'); return; }
          const rx = ax / magA + bx / magB, ry = ay / magA + by / magB, rz = az / magA + bz / magB;
          const magR = Math.sqrt(rx * rx + ry * ry + rz * rz);
          if (magR === 0) { out.innerHTML = errorBox('A and B point in exactly opposite directions — no unique bisector.'); return; }
          out.innerHTML =
            resultCell('Bisector Vector', `(${round(rx, 5)}, ${round(ry, 5)}, ${round(rz, 5)})`) +
            resultCell('Unit Bisector Vector', `(${round(rx / magR, 5)}, ${round(ry / magR, 5)}, ${round(rz / magR, 5)})`);
        }
      },
      {
        id: 'workDoneVector',
        label: 'Work Done by a Force (W = F·d)',
        render: () => `
          <p class="tool-hint">Work done by a constant force F over a displacement d, using the dot product W = F·d.</p>
          <div class="tool-vector-row">
            ${field('wdvFx', 'Fx', 'Fx', 'number')}${field('wdvFy', 'Fy', 'Fy', 'number')}${field('wdvFz', 'Fz', 'Fz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('wdvDx', 'dx', 'dx', 'number')}${field('wdvDy', 'dy', 'dy', 'number')}${field('wdvDz', 'dz', 'dz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const fx = num('wdvFx'), fy = num('wdvFy'), fz = num('wdvFz') || 0;
          const dx = num('wdvDx'), dy = num('wdvDy'), dz = num('wdvDz') || 0;
          if (fx === null || fy === null || dx === null || dy === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const work = fx * dx + fy * dy + fz * dz;
          out.innerHTML = resultCell('Work Done (F·d)', round(work, 5));
        }
      },
      {
        id: 'torqueVector',
        label: 'Torque / Moment of a Force (τ = r×F)',
        render: () => `
          <p class="tool-hint">Torque of a force F applied at position r (from the pivot), using the cross product τ = r × F.</p>
          <div class="tool-vector-row">
            ${field('tvRx', 'rx', 'rx', 'number')}${field('tvRy', 'ry', 'ry', 'number')}${field('tvRz', 'rz', 'rz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('tvFx', 'Fx', 'Fx', 'number')}${field('tvFy', 'Fy', 'Fy', 'number')}${field('tvFz', 'Fz', 'Fz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const rx = num('tvRx'), ry = num('tvRy'), rz = num('tvRz') || 0;
          const fx = num('tvFx'), fy = num('tvFy'), fz = num('tvFz') || 0;
          if (rx === null || ry === null || fx === null || fy === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const tx = ry * fz - rz * fy, ty = rz * fx - rx * fz, tz = rx * fy - ry * fx;
          out.innerHTML =
            resultCell('Torque Vector (τ)', `(${round(tx, 5)}, ${round(ty, 5)}, ${round(tz, 5)})`) +
            resultCell('Magnitude', round(Math.sqrt(tx * tx + ty * ty + tz * tz), 5));
        }
      },
      {
        id: 'planeInterceptForm',
        label: 'Plane Equation from Intercepts',
        render: () => `
          <p class="tool-hint">Plane cutting the axes at (a,0,0), (0,b,0), (0,0,c): x/a + y/b + z/c = 1.</p>
          <div class="tool-vector-row">
            ${field('pifA', 'x-intercept (a)', 'a', 'number')}${field('pifB', 'y-intercept (b)', 'b', 'number')}${field('pifC', 'z-intercept (c)', 'c', 'number')}
          </div>
        `,
        calc: (out) => {
          const a = num('pifA'), b = num('pifB'), c = num('pifC');
          if (a === null || b === null || c === null || a === 0 || b === 0 || c === 0) { out.innerHTML = errorBox('Please enter three non-zero intercepts a, b, c.'); return; }
          const bc = round(b * c, 5), ac = round(a * c, 5), ab = round(a * b, 5), abc = round(a * b * c, 5);
          out.innerHTML =
            resultCell('Intercept Form', `x/${round(a, 5)} + y/${round(b, 5)} + z/${round(c, 5)} = 1`) +
            resultCell('Standard Form', `${bc}x + ${ac}y + ${ab}z = ${abc}`);
        }
      },
      {
        id: 'distanceBetweenParallelPlanes',
        label: 'Distance Between Two Parallel Planes',
        render: () => `
          <p class="tool-hint">For planes ax+by+cz=d₁ and ax+by+cz=d₂ (same normal vector): distance = |d₁−d₂| / √(a²+b²+c²).</p>
          <div class="tool-vector-row">
            ${field('dpp_a', 'a', 'a', 'number')}${field('dpp_b', 'b', 'b', 'number')}${field('dpp_c', 'c', 'c', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('dpp_d1', 'd₁', 'd₁', 'number')}${field('dpp_d2', 'd₂', 'd₂', 'number')}
          </div>
        `,
        calc: (out) => {
          const a = num('dpp_a'), b = num('dpp_b'), c = num('dpp_c'), d1 = num('dpp_d1'), d2 = num('dpp_d2');
          if ([a, b, c, d1, d2].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const magN = Math.sqrt(a * a + b * b + c * c);
          if (magN === 0) { out.innerHTML = errorBox('Normal vector (a,b,c) cannot be zero.'); return; }
          out.innerHTML = resultCell('Distance Between Planes', round(Math.abs(d1 - d2) / magN, 5));
        }
      },
      {
        id: 'quadrilateralAreaVectors',
        label: 'Area of Quadrilateral (Vectors)',
        render: () => `
          <p class="tool-hint">Area of quadrilateral ABCD (vertices in order) using its diagonals: Area = ½|AC × BD|. Works in 2D or 3D.</p>
          <div class="tool-vector-row">
            ${field('qavAx', 'Ax', 'Ax', 'number')}${field('qavAy', 'Ay', 'Ay', 'number')}${field('qavAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('qavBx', 'Bx', 'Bx', 'number')}${field('qavBy', 'By', 'By', 'number')}${field('qavBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('qavCx', 'Cx', 'Cx', 'number')}${field('qavCy', 'Cy', 'Cy', 'number')}${field('qavCz', 'Cz', 'Cz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('qavDx', 'Dx', 'Dx', 'number')}${field('qavDy', 'Dy', 'Dy', 'number')}${field('qavDz', 'Dz', 'Dz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('qavAx'), ay = num('qavAy'), az = num('qavAz') || 0;
          const bx = num('qavBx'), by = num('qavBy'), bz = num('qavBz') || 0;
          const cx = num('qavCx'), cy = num('qavCy'), cz = num('qavCz') || 0;
          const dx = num('qavDx'), dy = num('qavDy'), dz = num('qavDz') || 0;
          if ([ax, ay, bx, by, cx, cy, dx, dy].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const acx = cx - ax, acy = cy - ay, acz = cz - az;
          const bdx = dx - bx, bdy = dy - by, bdz = dz - bz;
          const crossX = acy * bdz - acz * bdy, crossY = acz * bdx - acx * bdz, crossZ = acx * bdy - acy * bdx;
          const area = 0.5 * Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
          out.innerHTML = resultCell('Area of Quadrilateral', round(area, 5));
        }
      },
      {
        id: 'scalarProjection',
        label: 'Scalar Projection of A onto B',
        render: () => `
          <p class="tool-hint">Scalar (signed) length of A's shadow along B: (A·B)/|B|. Works in 2D or 3D.</p>
          <div class="tool-vector-row">
            ${field('spAx', 'Ax', 'Ax', 'number')}${field('spAy', 'Ay', 'Ay', 'number')}${field('spAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('spBx', 'Bx', 'Bx', 'number')}${field('spBy', 'By', 'By', 'number')}${field('spBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('spAx'), ay = num('spAy'), az = num('spAz') || 0;
          const bx = num('spBx'), by = num('spBy'), bz = num('spBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const magB = Math.sqrt(bx * bx + by * by + bz * bz);
          if (magB === 0) { out.innerHTML = errorBox('Vector B cannot be the zero vector.'); return; }
          const dot = ax * bx + ay * by + az * bz;
          out.innerHTML = resultCell('Scalar Projection of A onto B', round(dot / magB, 5));
        }
      },
      {
        id: 'vectorRejection',
        label: 'Component of Vector Perpendicular to Another',
        render: () => `
          <p class="tool-hint">The rejection of A from B: the part of A perpendicular to B, A − proj_B(A).</p>
          <div class="tool-vector-row">
            ${field('vrAx', 'Ax', 'Ax', 'number')}${field('vrAy', 'Ay', 'Ay', 'number')}${field('vrAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('vrBx', 'Bx', 'Bx', 'number')}${field('vrBy', 'By', 'By', 'number')}${field('vrBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('vrAx'), ay = num('vrAy'), az = num('vrAz') || 0;
          const bx = num('vrBx'), by = num('vrBy'), bz = num('vrBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const magBsq = bx * bx + by * by + bz * bz;
          if (magBsq === 0) { out.innerHTML = errorBox('Vector B cannot be the zero vector.'); return; }
          const k = (ax * bx + ay * by + az * bz) / magBsq;
          const rx = ax - k * bx, ry = ay - k * by, rz = az - k * bz;
          out.innerHTML =
            resultCell('Rejection Vector', `(${round(rx, 5)}, ${round(ry, 5)}, ${round(rz, 5)})`) +
            resultCell('Magnitude', round(Math.sqrt(rx * rx + ry * ry + rz * rz), 5));
        }
      },
      {
        id: 'centroidTriangleVectors',
        label: 'Centroid of a Triangle (Vectors)',
        render: () => `
          <p class="tool-hint">Centroid = (A + B + C) / 3, the average of the three vertex position vectors.</p>
          <div class="tool-vector-row">
            ${field('ctgAx', 'Ax', 'Ax', 'number')}${field('ctgAy', 'Ay', 'Ay', 'number')}${field('ctgAz', 'Az', 'Az (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('ctgBx', 'Bx', 'Bx', 'number')}${field('ctgBy', 'By', 'By', 'number')}${field('ctgBz', 'Bz', 'Bz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('ctgCx', 'Cx', 'Cx', 'number')}${field('ctgCy', 'Cy', 'Cy', 'number')}${field('ctgCz', 'Cz', 'Cz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('ctgAx'), ay = num('ctgAy'), az = num('ctgAz') || 0;
          const bx = num('ctgBx'), by = num('ctgBy'), bz = num('ctgBz') || 0;
          const cx = num('ctgCx'), cy = num('ctgCy'), cz = num('ctgCz') || 0;
          if ([ax, ay, bx, by, cx, cy].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          out.innerHTML = resultCell('Centroid', `(${round((ax + bx + cx) / 3, 5)}, ${round((ay + by + cy) / 3, 5)}, ${round((az + bz + cz) / 3, 5)})`);
        }
      },
      {
        id: 'centerOfMassTwoParticles',
        label: 'Center of Mass of Two Particles (Vectors)',
        render: () => `
          <p class="tool-hint">R꜀ₘ = (m₁r₁ + m₂r₂) / (m₁ + m₂). Works in 2D or 3D.</p>
          <div class="tool-vector-row">
            ${field('comM1', 'm₁', 'mass 1', 'number')}${field('comM2', 'm₂', 'mass 2', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('comR1x', 'r₁x', 'r₁x', 'number')}${field('comR1y', 'r₁y', 'r₁y', 'number')}${field('comR1z', 'r₁z', 'r₁z (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('comR2x', 'r₂x', 'r₂x', 'number')}${field('comR2y', 'r₂y', 'r₂y', 'number')}${field('comR2z', 'r₂z', 'r₂z (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const m1 = num('comM1'), m2 = num('comM2');
          const r1x = num('comR1x'), r1y = num('comR1y'), r1z = num('comR1z') || 0;
          const r2x = num('comR2x'), r2y = num('comR2y'), r2z = num('comR2z') || 0;
          if (m1 === null || m2 === null || r1x === null || r1y === null || r2x === null || r2y === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          if (m1 + m2 === 0) { out.innerHTML = errorBox('Total mass (m₁ + m₂) cannot be zero.'); return; }
          const rx = (m1 * r1x + m2 * r2x) / (m1 + m2), ry = (m1 * r1y + m2 * r2y) / (m1 + m2), rz = (m1 * r1z + m2 * r2z) / (m1 + m2);
          out.innerHTML = resultCell('Center of Mass', `(${round(rx, 5)}, ${round(ry, 5)}, ${round(rz, 5)})`);
        }
      },
      {
        id: 'relativeVelocityVector',
        label: 'Relative Velocity Vector (V_AB = V_A − V_B)',
        render: () => `
          <p class="tool-hint">Velocity of A relative to B. Works in 2D or 3D.</p>
          <div class="tool-vector-row">
            ${field('rvvAx', 'V_A x', 'V_A x', 'number')}${field('rvvAy', 'V_A y', 'V_A y', 'number')}${field('rvvAz', 'V_A z', 'V_A z (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('rvvBx', 'V_B x', 'V_B x', 'number')}${field('rvvBy', 'V_B y', 'V_B y', 'number')}${field('rvvBz', 'V_B z', 'V_B z (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const ax = num('rvvAx'), ay = num('rvvAy'), az = num('rvvAz') || 0;
          const bx = num('rvvBx'), by = num('rvvBy'), bz = num('rvvBz') || 0;
          if (ax === null || ay === null || bx === null || by === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const rx = ax - bx, ry = ay - by, rz = az - bz;
          out.innerHTML =
            resultCell('Relative Velocity (V_AB)', `(${round(rx, 5)}, ${round(ry, 5)}, ${round(rz, 5)})`) +
            resultCell('Magnitude (Speed)', round(Math.sqrt(rx * rx + ry * ry + rz * rz), 5));
        }
      },
      {
        id: 'momentAboutAxis',
        label: 'Moment of a Force About an Axis',
        render: () => `
          <p class="tool-hint">Scalar moment of force F applied at position r about an axis through the origin with direction n: M = (r×F)·n̂.</p>
          <div class="tool-vector-row">
            ${field('maaRx', 'rx', 'rx', 'number')}${field('maaRy', 'ry', 'ry', 'number')}${field('maaRz', 'rz', 'rz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('maaFx', 'Fx', 'Fx', 'number')}${field('maaFy', 'Fy', 'Fy', 'number')}${field('maaFz', 'Fz', 'Fz (optional)', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('maaNx', 'Axis nx', 'nx', 'number')}${field('maaNy', 'Axis ny', 'ny', 'number')}${field('maaNz', 'Axis nz', 'nz (optional)', 'number')}
          </div>
        `,
        calc: (out) => {
          const rx = num('maaRx'), ry = num('maaRy'), rz = num('maaRz') || 0;
          const fx = num('maaFx'), fy = num('maaFy'), fz = num('maaFz') || 0;
          const nx = num('maaNx'), ny = num('maaNy'), nz = num('maaNz') || 0;
          if (rx === null || ry === null || fx === null || fy === null || nx === null || ny === null) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const magN = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (magN === 0) { out.innerHTML = errorBox('Axis direction vector cannot be zero.'); return; }
          const tx = ry * fz - rz * fy, ty = rz * fx - rx * fz, tz = rx * fy - ry * fx;
          const moment = (tx * nx + ty * ny + tz * nz) / magN;
          out.innerHTML = resultCell('Moment About Axis', round(moment, 5));
        }
      },
      {
        id: 'footOfPerpendicularToLine3D',
        label: 'Foot of Perpendicular from a Point to a Line',
        render: () => `
          <p class="tool-hint">Line through point P₀ with direction D. Finds the foot of the perpendicular dropped from an external point Q onto that line.</p>
          <div class="tool-vector-row">
            ${field('foplP0x', 'P₀x', 'P₀x', 'number')}${field('foplP0y', 'P₀y', 'P₀y', 'number')}${field('foplP0z', 'P₀z', 'P₀z', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('foplDx', 'Dx', 'Dx', 'number')}${field('foplDy', 'Dy', 'Dy', 'number')}${field('foplDz', 'Dz', 'Dz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('foplQx', 'Qx', 'Qx', 'number')}${field('foplQy', 'Qy', 'Qy', 'number')}${field('foplQz', 'Qz', 'Qz', 'number')}
          </div>
        `,
        calc: (out) => {
          const p0x = num('foplP0x'), p0y = num('foplP0y'), p0z = num('foplP0z');
          const dx = num('foplDx'), dy = num('foplDy'), dz = num('foplDz');
          const qx = num('foplQx'), qy = num('foplQy'), qz = num('foplQz');
          if ([p0x, p0y, p0z, dx, dy, dz, qx, qy, qz].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const magDsq = dx * dx + dy * dy + dz * dz;
          if (magDsq === 0) { out.innerHTML = errorBox('Direction vector D cannot be zero.'); return; }
          const wx = qx - p0x, wy = qy - p0y, wz = qz - p0z;
          const tParam = (wx * dx + wy * dy + wz * dz) / magDsq;
          const fx = p0x + tParam * dx, fy = p0y + tParam * dy, fz = p0z + tParam * dz;
          const dist = Math.sqrt(Math.pow(qx - fx, 2) + Math.pow(qy - fy, 2) + Math.pow(qz - fz, 2));
          out.innerHTML =
            resultCell('Foot of Perpendicular', `(${round(fx, 5)}, ${round(fy, 5)}, ${round(fz, 5)})`) +
            resultCell('Distance from Q', round(dist, 5));
        }
      },
      {
        id: 'footOfPerpendicularToPlane3D',
        label: 'Foot of Perpendicular from a Point to a Plane',
        render: () => `
          <p class="tool-hint">Plane ax+by+cz=d. Finds the foot of the perpendicular dropped from an external point Q onto that plane.</p>
          <div class="tool-vector-row">
            ${field('foppA', 'a', 'a', 'number')}${field('foppB', 'b', 'b', 'number')}${field('foppC', 'c', 'c', 'number')}${field('foppD', 'd', 'd', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('foppQx', 'Qx', 'Qx', 'number')}${field('foppQy', 'Qy', 'Qy', 'number')}${field('foppQz', 'Qz', 'Qz', 'number')}
          </div>
        `,
        calc: (out) => {
          const a = num('foppA'), b = num('foppB'), c = num('foppC'), d = num('foppD');
          const qx = num('foppQx'), qy = num('foppQy'), qz = num('foppQz');
          if ([a, b, c, d, qx, qy, qz].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const magNsq = a * a + b * b + c * c;
          if (magNsq === 0) { out.innerHTML = errorBox('Normal vector (a,b,c) cannot be zero.'); return; }
          const k = (a * qx + b * qy + c * qz - d) / magNsq;
          const fx = qx - k * a, fy = qy - k * b, fz = qz - k * c;
          const dist = Math.sqrt(Math.pow(qx - fx, 2) + Math.pow(qy - fy, 2) + Math.pow(qz - fz, 2));
          out.innerHTML =
            resultCell('Foot of Perpendicular', `(${round(fx, 5)}, ${round(fy, 5)}, ${round(fz, 5)})`) +
            resultCell('Distance from Q', round(dist, 5));
        }
      },
      {
        id: 'lineIntersectionPoint3D',
        label: 'Intersection Point of Two Lines (3D)',
        render: () => `
          <p class="tool-hint">Lines P₁+tD₁ and P₂+sD₂. Finds their intersection point, if one exists (parallel or skew lines have no unique intersection).</p>
          <div class="tool-vector-row">
            ${field('lipP1x', 'P₁x', 'P₁x', 'number')}${field('lipP1y', 'P₁y', 'P₁y', 'number')}${field('lipP1z', 'P₁z', 'P₁z', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('lipD1x', 'D₁x', 'D₁x', 'number')}${field('lipD1y', 'D₁y', 'D₁y', 'number')}${field('lipD1z', 'D₁z', 'D₁z', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('lipP2x', 'P₂x', 'P₂x', 'number')}${field('lipP2y', 'P₂y', 'P₂y', 'number')}${field('lipP2z', 'P₂z', 'P₂z', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('lipD2x', 'D₂x', 'D₂x', 'number')}${field('lipD2y', 'D₂y', 'D₂y', 'number')}${field('lipD2z', 'D₂z', 'D₂z', 'number')}
          </div>
        `,
        calc: (out) => {
          const p1x = num('lipP1x'), p1y = num('lipP1y'), p1z = num('lipP1z');
          const d1x = num('lipD1x'), d1y = num('lipD1y'), d1z = num('lipD1z');
          const p2x = num('lipP2x'), p2y = num('lipP2y'), p2z = num('lipP2z');
          const d2x = num('lipD2x'), d2y = num('lipD2y'), d2z = num('lipD2z');
          if ([p1x, p1y, p1z, d1x, d1y, d1z, p2x, p2y, p2z, d2x, d2y, d2z].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const crossX = d1y * d2z - d1z * d2y, crossY = d1z * d2x - d1x * d2z, crossZ = d1x * d2y - d1y * d2x;
          const magCrossSq = crossX * crossX + crossY * crossY + crossZ * crossZ;
          if (magCrossSq < 1e-12) { out.innerHTML = errorBox('The lines are parallel — no unique intersection point.'); return; }
          const wx = p2x - p1x, wy = p2y - p1y, wz = p2z - p1z;
          const wxD2x = wy * d2z - wz * d2y, wxD2y = wz * d2x - wx * d2z, wxD2z = wx * d2y - wy * d2x;
          const wxD1x = wy * d1z - wz * d1y, wxD1y = wz * d1x - wx * d1z, wxD1z = wx * d1y - wy * d1x;
          const t1 = (wxD2x * crossX + wxD2y * crossY + wxD2z * crossZ) / magCrossSq;
          const t2 = (wxD1x * crossX + wxD1y * crossY + wxD1z * crossZ) / magCrossSq;
          const pt1x = p1x + t1 * d1x, pt1y = p1y + t1 * d1y, pt1z = p1z + t1 * d1z;
          const pt2x = p2x + t2 * d2x, pt2y = p2y + t2 * d2y, pt2z = p2z + t2 * d2z;
          const gap = Math.sqrt(Math.pow(pt1x - pt2x, 2) + Math.pow(pt1y - pt2y, 2) + Math.pow(pt1z - pt2z, 2));
          if (gap > 1e-6) { out.innerHTML = errorBox('The lines are skew — they do not intersect.'); return; }
          out.innerHTML = resultCell('Intersection Point', `(${round(pt1x, 5)}, ${round(pt1y, 5)}, ${round(pt1z, 5)})`);
        }
      },
      {
        id: 'planeLineIntersectionPoint',
        label: 'Intersection of a Line and a Plane',
        render: () => `
          <p class="tool-hint">Line P₀+tD and plane ax+by+cz=d. Finds their point of intersection.</p>
          <div class="tool-vector-row">
            ${field('pliP0x', 'P₀x', 'P₀x', 'number')}${field('pliP0y', 'P₀y', 'P₀y', 'number')}${field('pliP0z', 'P₀z', 'P₀z', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('pliDx', 'Dx', 'Dx', 'number')}${field('pliDy', 'Dy', 'Dy', 'number')}${field('pliDz', 'Dz', 'Dz', 'number')}
          </div>
          <div class="tool-vector-row">
            ${field('pliA', 'a', 'a', 'number')}${field('pliB', 'b', 'b', 'number')}${field('pliC', 'c', 'c', 'number')}${field('pliD', 'd', 'd', 'number')}
          </div>
        `,
        calc: (out) => {
          const p0x = num('pliP0x'), p0y = num('pliP0y'), p0z = num('pliP0z');
          const dx = num('pliDx'), dy = num('pliDy'), dz = num('pliDz');
          const a = num('pliA'), b = num('pliB'), c = num('pliC'), d = num('pliD');
          if ([p0x, p0y, p0z, dx, dy, dz, a, b, c, d].some(v => v === null)) { out.innerHTML = errorBox(t('tool_err_vectors')); return; }
          const denom = a * dx + b * dy + c * dz;
          const numerator = d - (a * p0x + b * p0y + c * p0z);
          if (Math.abs(denom) < 1e-9) {
            out.innerHTML = Math.abs(numerator) < 1e-9
              ? errorBox('The line lies entirely within the plane — infinitely many intersection points.')
              : errorBox('The line is parallel to the plane — no intersection.');
            return;
          }
          const tParam = numerator / denom;
          const ix = p0x + tParam * dx, iy = p0y + tParam * dy, iz = p0z + tParam * dz;
          out.innerHTML = resultCell('Intersection Point', `(${round(ix, 5)}, ${round(iy, 5)}, ${round(iz, 5)})`);
        }
      }
    ],

    Calculus: [
      {
        id: 'derivativeAtPoint',
        label: 'Derivative at a Point',
        render: () => `
          <p class="tool-hint">Numeric derivative f'(x) using functions of x: sin, cos, tan, sqrt, log (ln), exp, abs, ^ for powers.</p>
          ${field('daFn', 'f(x)', 'e.g. sin(x)*x^2', 'text')}
          ${field('daX', 'x =', 'point to evaluate at', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('daFn'));
          const x0 = num('daX');
          if (!fn || x0 === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point x.'); return; }
          const h = 1e-5;
          try {
            const deriv = (fn(x0 + h) - fn(x0 - h)) / (2 * h);
            const deriv2 = (fn(x0 + h) - 2 * fn(x0) + fn(x0 - h)) / (h * h);
            out.innerHTML =
              resultCell("f'(x)", round(deriv, 6)) +
              resultCell("f''(x)", round(deriv2, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'definiteIntegralNumeric',
        label: 'Definite Integral (numeric)',
        render: () => `
          <p class="tool-hint">Computes ∫f(x)dx from a to b using Simpson's Rule.</p>
          ${field('diFn', 'f(x)', 'e.g. sin(x), x^2+1, exp(-x^2)', 'text')}
          ${field('diA', 'Lower bound a', '', 'number')}
          ${field('diB', 'Upper bound b', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('diFn'));
          const a = num('diA'), b = num('diB');
          if (!fn || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid f(x) and distinct bounds a, b.'); return; }
          const n = 1000; // even number of intervals for Simpson's rule
          const h = (b - a) / n;
          let sum;
          try {
            sum = fn(a) + fn(b);
            for (let i = 1; i < n; i++) {
              const x = a + i * h;
              sum += fn(x) * (i % 2 === 0 ? 2 : 4);
            }
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); return; }
          const integral = (h / 3) * sum;
          if (!isFinite(integral)) { out.innerHTML = errorBox('The function is undefined somewhere in that range.'); return; }
          out.innerHTML = resultCell('∫f(x)dx', round(integral, 6));
        }
      },
      {
        id: 'limitAtPoint',
        label: 'Limit at a Point (numeric)',
        render: () => `
          <p class="tool-hint">Approaches x → a from both sides numerically.</p>
          ${field('laFn', 'f(x)', 'e.g. sin(x)/x', 'text')}
          ${field('laA', 'a =', 'the point x approaches', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('laFn'));
          const a = num('laA');
          if (!fn || a === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point a.'); return; }
          let left = NaN, right = NaN;
          try { left = fn(a - 1e-6); } catch (e) {}
          try { right = fn(a + 1e-6); } catch (e) {}
          if (!isFinite(left) || !isFinite(right)) { out.innerHTML = errorBox('The function appears undefined or unbounded near that point.'); return; }
          const agree = Math.abs(left - right) < 1e-3;
          out.innerHTML =
            resultCell('Left-hand limit', round(left, 6)) +
            resultCell('Right-hand limit', round(right, 6)) +
            resultCell('Limit exists?', agree ? 'Yes ≈ ' + round((left + right) / 2, 6) : 'No (one-sided limits differ)');
        }
      },
      {
        id: 'tangentLineEquation',
        label: 'Equation of Tangent Line',
        render: () => `
          <p class="tool-hint">Finds the tangent line to y=f(x) at x=x₀ using the numeric derivative.</p>
          ${field('telFn', 'f(x)', 'e.g. x^2+3*x', 'text')}
          ${field('telX0', 'x₀ =', 'point of tangency', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('telFn'));
          const x0 = num('telX0');
          if (!fn || x0 === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point x₀.'); return; }
          try {
            const y0 = fn(x0);
            const m = numDeriv1(fn, x0);
            if (!isFinite(y0) || !isFinite(m)) throw new Error('bad');
            const c = y0 - m * x0;
            out.innerHTML =
              resultCell('Slope (m)', round(m, 6)) +
              resultCell('Point', `(${round(x0, 5)}, ${round(y0, 5)})`) +
              resultCell('Tangent Line', `y = ${round(m, 5)}x ${c >= 0 ? '+' : '−'} ${round(Math.abs(c), 5)}`);
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'normalLineEquation',
        label: 'Equation of Normal Line',
        render: () => `
          <p class="tool-hint">Finds the line perpendicular to the tangent of y=f(x) at x=x₀.</p>
          ${field('nelFn', 'f(x)', 'e.g. x^2+3*x', 'text')}
          ${field('nelX0', 'x₀ =', 'point on the curve', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('nelFn'));
          const x0 = num('nelX0');
          if (!fn || x0 === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point x₀.'); return; }
          try {
            const y0 = fn(x0);
            const m = numDeriv1(fn, x0);
            if (!isFinite(y0) || !isFinite(m)) throw new Error('bad');
            if (Math.abs(m) < 1e-9) { out.innerHTML = errorBox('The tangent is horizontal — the normal line is vertical: x = ' + round(x0, 5)); return; }
            const mn = -1 / m;
            const c = y0 - mn * x0;
            out.innerHTML =
              resultCell('Tangent Slope', round(m, 6)) +
              resultCell('Normal Slope', round(mn, 6)) +
              resultCell('Normal Line', `y = ${round(mn, 5)}x ${c >= 0 ? '+' : '−'} ${round(Math.abs(c), 5)}`);
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'avgRateOfChange',
        label: 'Average Rate of Change',
        render: () => `
          <p class="tool-hint">Computes [f(b) − f(a)] / (b − a) over an interval.</p>
          ${field('arcFn', 'f(x)', 'e.g. x^3-2*x', 'text')}
          ${field('arcA', 'a =', '', 'number')}
          ${field('arcB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('arcFn'));
          const a = num('arcA'), b = num('arcB');
          if (!fn || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid f(x) and distinct points a, b.'); return; }
          try {
            const fa = fn(a), fb = fn(b);
            if (!isFinite(fa) || !isFinite(fb)) throw new Error('bad');
            out.innerHTML =
              resultCell('f(a)', round(fa, 6)) +
              resultCell('f(b)', round(fb, 6)) +
              resultCell('Average Rate of Change', round((fb - fa) / (b - a), 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at a or b.'); }
        }
      },
      {
        id: 'newtonRaphsonRoot',
        label: 'Newton–Raphson Root Finder',
        render: () => `
          <p class="tool-hint">Finds a root of f(x)=0 starting from an initial guess, using x₍ₙ₊₁₎ = xₙ − f(xₙ)/f'(xₙ).</p>
          ${field('nrFn', 'f(x)', 'e.g. x^3-2*x-5', 'text')}
          ${field('nrX0', 'Initial guess x₀', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('nrFn'));
          let x0 = num('nrX0');
          if (!fn || x0 === null) { out.innerHTML = errorBox('Enter a valid f(x) and an initial guess.'); return; }
          let x = x0, iterations = 0, converged = false;
          try {
            for (let i = 0; i < 100; i++) {
              const fx = fn(x);
              const dfx = numDeriv1(fn, x);
              if (!isFinite(fx) || !isFinite(dfx)) break;
              if (Math.abs(dfx) < 1e-12) break;
              const xNext = x - fx / dfx;
              iterations++;
              if (Math.abs(xNext - x) < 1e-10) { x = xNext; converged = true; break; }
              x = xNext;
            }
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function during iteration.'); return; }
          if (!converged || !isFinite(x)) { out.innerHTML = errorBox('Did not converge from that starting guess — try a different x₀.'); return; }
          out.innerHTML =
            resultCell('Root (x)', round(x, 8)) +
            resultCell('f(root)', round(fn(x), 8)) +
            resultCell('Iterations', iterations);
        }
      },
      {
        id: 'criticalPointsInterval',
        label: 'Critical Points in an Interval',
        render: () => `
          <p class="tool-hint">Scans [a, b] for points where f'(x) = 0 (numerically).</p>
          ${field('cpiFn', 'f(x)', 'e.g. x^3-3*x', 'text')}
          ${field('cpiA', 'a =', 'interval start', 'number')}
          ${field('cpiB', 'b =', 'interval end', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('cpiFn'));
          const a = num('cpiA'), b = num('cpiB');
          if (!fn || a === null || b === null || a >= b) { out.innerHTML = errorBox('Enter a valid f(x) and a < b.'); return; }
          const n = 2000, h = (b - a) / n;
          const points = [];
          let prevX = a, prevD;
          try { prevD = numDeriv1(fn, prevX); } catch (e) { prevD = NaN; }
          for (let i = 1; i <= n; i++) {
            const xi = a + i * h;
            let di;
            try { di = numDeriv1(fn, xi); } catch (e) { di = NaN; }
            if (isFinite(prevD) && isFinite(di) && prevD * di < 0) {
              // bisect between prevX and xi for a sign change of f'
              let lo = prevX, hi = xi, dlo = prevD;
              for (let k = 0; k < 40; k++) {
                const mid = (lo + hi) / 2;
                let dmid; try { dmid = numDeriv1(fn, mid); } catch (e) { dmid = NaN; }
                if (!isFinite(dmid)) break;
                if (dlo * dmid <= 0) { hi = mid; } else { lo = mid; dlo = dmid; }
              }
              const c = (lo + hi) / 2;
              if (points.length === 0 || Math.abs(points[points.length - 1] - c) > 1e-4) points.push(c);
            }
            prevX = xi; prevD = di;
          }
          if (points.length === 0) { out.innerHTML = resultCell('Critical Points', 'None found in this interval'); return; }
          const list = points.slice(0, 10).map(c => `x = ${round(c, 5)} (f = ${round(fn(c), 5)})`).join('<br>');
          out.innerHTML = resultCell('Critical Points Found', list);
        }
      },
      {
        id: 'concavityInflectionTest',
        label: 'Concavity Test at a Point',
        render: () => `
          <p class="tool-hint">Uses f''(x) to determine concavity, and checks nearby points for a possible inflection.</p>
          ${field('citFn', 'f(x)', 'e.g. x^3-3*x', 'text')}
          ${field('citX', 'x =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('citFn'));
          const x0 = num('citX');
          if (!fn || x0 === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point x.'); return; }
          try {
            const d2 = numDeriv2(fn, x0);
            const d2Left = numDeriv2(fn, x0 - 0.05);
            const d2Right = numDeriv2(fn, x0 + 0.05);
            let shape = Math.abs(d2) < 1e-6 ? 'Possibly an inflection point (f\'\'≈0)' : (d2 > 0 ? 'Concave Up' : 'Concave Down');
            const signChange = isFinite(d2Left) && isFinite(d2Right) && (d2Left * d2Right < 0);
            out.innerHTML =
              resultCell("f''(x)", round(d2, 6)) +
              resultCell('Concavity', shape) +
              resultCell('Inflection nearby?', signChange ? 'Yes — concavity changes sign near this x' : 'No sign change detected nearby');
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'secondDerivativeTest',
        label: 'Local Extrema Classifier (2nd Derivative Test)',
        render: () => `
          <p class="tool-hint">Given a candidate critical point x, classifies it as a local max, local min, or inconclusive.</p>
          ${field('sdtFn', 'f(x)', 'e.g. x^3-3*x', 'text')}
          ${field('sdtX', 'Candidate x =', 'where f\'(x)≈0', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('sdtFn'));
          const x0 = num('sdtX');
          if (!fn || x0 === null) { out.innerHTML = errorBox('Enter a valid f(x) and a candidate point x.'); return; }
          try {
            const d1 = numDeriv1(fn, x0);
            const d2 = numDeriv2(fn, x0);
            let verdict;
            if (Math.abs(d1) > 1e-2) verdict = 'Not a critical point — f\'(x) is not close to 0 here';
            else if (d2 > 1e-6) verdict = 'Local Minimum (f\'\'>0)';
            else if (d2 < -1e-6) verdict = 'Local Maximum (f\'\'<0)';
            else verdict = 'Inconclusive (f\'\'≈0) — try the first derivative test';
            out.innerHTML =
              resultCell("f'(x)", round(d1, 6)) +
              resultCell("f''(x)", round(d2, 6)) +
              resultCell('Classification', verdict);
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'increasingDecreasingTest',
        label: 'Increasing or Decreasing at a Point',
        render: () => `
          <p class="tool-hint">Uses the sign of f'(x) to tell whether the function is rising or falling at x.</p>
          ${field('idtFn', 'f(x)', 'e.g. x^2-4*x', 'text')}
          ${field('idtX', 'x =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('idtFn'));
          const x0 = num('idtX');
          if (!fn || x0 === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point x.'); return; }
          try {
            const d1 = numDeriv1(fn, x0);
            const verdict = Math.abs(d1) < 1e-6 ? 'Stationary (f\'(x)≈0)' : (d1 > 0 ? 'Increasing' : 'Decreasing');
            out.innerHTML = resultCell("f'(x)", round(d1, 6)) + resultCell('Behavior', verdict);
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'riemannSum',
        label: 'Riemann Sum Approximation',
        render: () => `
          <p class="tool-hint">Approximates ∫f(x)dx from a to b as a sum of n rectangles.</p>
          ${field('rsFn', 'f(x)', 'e.g. x^2', 'text')}
          ${field('rsA', 'a =', '', 'number')}
          ${field('rsB', 'b =', '', 'number')}
          ${field('rsN', 'n (subintervals)', 'e.g. 100', 'number')}
          ${selectField('rsMethod', 'Sample point', [
            { value: 'left', label: 'Left endpoint' },
            { value: 'right', label: 'Right endpoint' },
            { value: 'mid', label: 'Midpoint' }
          ])}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('rsFn'));
          const a = num('rsA'), b = num('rsB');
          let n = num('rsN');
          const method = str('rsMethod') || document.getElementById('rsMethod')?.value;
          if (!fn || a === null || b === null || a === b || !n || n <= 0) { out.innerHTML = errorBox('Enter a valid f(x), distinct bounds a,b, and a positive n.'); return; }
          n = Math.max(1, Math.round(n));
          const h = (b - a) / n;
          let sum = 0;
          try {
            for (let i = 0; i < n; i++) {
              let xi;
              if (method === 'right') xi = a + (i + 1) * h;
              else if (method === 'mid') xi = a + (i + 0.5) * h;
              else xi = a + i * h;
              sum += fn(xi) * h;
            }
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); return; }
          if (!isFinite(sum)) { out.innerHTML = errorBox('The function is undefined somewhere in that range.'); return; }
          out.innerHTML = resultCell('Riemann Sum ≈', round(sum, 6));
        }
      },
      {
        id: 'trapezoidalRule',
        label: 'Trapezoidal Rule Integral',
        render: () => `
          <p class="tool-hint">Approximates ∫f(x)dx from a to b using n trapezoids.</p>
          ${field('trFn', 'f(x)', 'e.g. sqrt(x)', 'text')}
          ${field('trA', 'a =', '', 'number')}
          ${field('trB', 'b =', '', 'number')}
          ${field('trN', 'n (subintervals)', 'e.g. 100', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('trFn'));
          const a = num('trA'), b = num('trB');
          let n = num('trN');
          if (!fn || a === null || b === null || a === b || !n || n <= 0) { out.innerHTML = errorBox('Enter a valid f(x), distinct bounds a,b, and a positive n.'); return; }
          n = Math.max(1, Math.round(n));
          const h = (b - a) / n;
          let sum;
          try {
            sum = (fn(a) + fn(b)) / 2;
            for (let i = 1; i < n; i++) sum += fn(a + i * h);
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); return; }
          const integral = sum * h;
          if (!isFinite(integral)) { out.innerHTML = errorBox('The function is undefined somewhere in that range.'); return; }
          out.innerHTML = resultCell('Trapezoidal Estimate', round(integral, 6));
        }
      },
      {
        id: 'arcLengthCurve',
        label: 'Arc Length of a Curve',
        render: () => `
          <p class="tool-hint">Computes the arc length of y=f(x) from x=a to x=b: ∫√(1+f'(x)²)dx.</p>
          ${field('alcFn', 'f(x)', 'e.g. x^2', 'text')}
          ${field('alcA', 'a =', '', 'number')}
          ${field('alcB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('alcFn'));
          const a = num('alcA'), b = num('alcB');
          if (!fn || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid f(x) and distinct bounds a, b.'); return; }
          try {
            const integrand = (x) => Math.sqrt(1 + Math.pow(numDeriv1(fn, x), 2));
            const length = simpsonIntegral(integrand, a, b, 500);
            if (!isFinite(length)) throw new Error('bad');
            out.innerHTML = resultCell('Arc Length', round(length, 6));
          } catch (e) { out.innerHTML = errorBox('Could not compute the arc length over that range.'); }
        }
      },
      {
        id: 'areaBetweenCurves',
        label: 'Area Between Two Curves',
        render: () => `
          <p class="tool-hint">Computes ∫|f(x) − g(x)|dx from a to b — the area trapped between the two curves.</p>
          ${field('abcFnF', 'f(x)', 'e.g. x^2', 'text')}
          ${field('abcFnG', 'g(x)', 'e.g. x', 'text')}
          ${field('abcA', 'a =', '', 'number')}
          ${field('abcB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const f = compileCalcFn(str('abcFnF'));
          const g = compileCalcFn(str('abcFnG'));
          const a = num('abcA'), b = num('abcB');
          if (!f || !g || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter valid f(x), g(x), and distinct bounds a, b.'); return; }
          try {
            const diff = (x) => Math.abs(f(x) - g(x));
            const area = simpsonIntegral(diff, a, b, 1000);
            if (!isFinite(area)) throw new Error('bad');
            out.innerHTML = resultCell('Area Between Curves', round(area, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the functions over that range.'); }
        }
      },
      {
        id: 'volumeDiskMethod',
        label: 'Volume of Revolution — Disk Method',
        render: () => `
          <p class="tool-hint">Revolves y=f(x) around the x-axis from x=a to x=b: V = π∫f(x)²dx.</p>
          ${field('vdmFn', 'f(x)', 'e.g. sqrt(x)', 'text')}
          ${field('vdmA', 'a =', '', 'number')}
          ${field('vdmB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('vdmFn'));
          const a = num('vdmA'), b = num('vdmB');
          if (!fn || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid f(x) and distinct bounds a, b.'); return; }
          try {
            const integrand = (x) => Math.pow(fn(x), 2);
            const volume = Math.PI * simpsonIntegral(integrand, a, b, 1000);
            if (!isFinite(volume)) throw new Error('bad');
            out.innerHTML = resultCell('Volume (Disk Method)', round(volume, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); }
        }
      },
      {
        id: 'volumeShellMethod',
        label: 'Volume of Revolution — Shell Method',
        render: () => `
          <p class="tool-hint">Revolves y=f(x) around the y-axis from x=a to x=b (a≥0): V = 2π∫x·f(x)dx.</p>
          ${field('vsmFn', 'f(x)', 'e.g. x^2', 'text')}
          ${field('vsmA', 'a =', '≥ 0', 'number')}
          ${field('vsmB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('vsmFn'));
          const a = num('vsmA'), b = num('vsmB');
          if (!fn || a === null || b === null || a === b || a < 0) { out.innerHTML = errorBox('Enter a valid f(x) and bounds with a ≥ 0, a ≠ b.'); return; }
          try {
            const integrand = (x) => x * fn(x);
            const volume = 2 * Math.PI * simpsonIntegral(integrand, a, b, 1000);
            if (!isFinite(volume)) throw new Error('bad');
            out.innerHTML = resultCell('Volume (Shell Method)', round(volume, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); }
        }
      },
      {
        id: 'surfaceAreaRevolution',
        label: 'Surface Area of Revolution',
        render: () => `
          <p class="tool-hint">Surface area of y=f(x) revolved around the x-axis from a to b: S = 2π∫f(x)√(1+f'(x)²)dx.</p>
          ${field('sarFn', 'f(x)', 'e.g. sqrt(x)', 'text')}
          ${field('sarA', 'a =', '', 'number')}
          ${field('sarB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('sarFn'));
          const a = num('sarA'), b = num('sarB');
          if (!fn || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid f(x) and distinct bounds a, b.'); return; }
          try {
            const integrand = (x) => fn(x) * Math.sqrt(1 + Math.pow(numDeriv1(fn, x), 2));
            const area = 2 * Math.PI * simpsonIntegral(integrand, a, b, 500);
            if (!isFinite(area)) throw new Error('bad');
            out.innerHTML = resultCell('Surface Area', round(area, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); }
        }
      },
      {
        id: 'curvatureAtPoint',
        label: 'Curvature at a Point',
        render: () => `
          <p class="tool-hint">Computes κ = |f''(x)| / (1+f'(x)²)^1.5 and the radius of curvature.</p>
          ${field('capFn', 'f(x)', 'e.g. x^2', 'text')}
          ${field('capX', 'x =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('capFn'));
          const x0 = num('capX');
          if (!fn || x0 === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point x.'); return; }
          try {
            const d1 = numDeriv1(fn, x0);
            const d2 = numDeriv2(fn, x0);
            const kappa = Math.abs(d2) / Math.pow(1 + d1 * d1, 1.5);
            if (!isFinite(kappa)) throw new Error('bad');
            out.innerHTML =
              resultCell('Curvature (κ)', round(kappa, 8)) +
              resultCell('Radius of Curvature', kappa < 1e-9 ? '∞ (nearly straight)' : round(1 / kappa, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'oneSidedLimit',
        label: 'One-Sided Limit',
        render: () => `
          <p class="tool-hint">Approaches x → a from a single side only, using progressively smaller steps.</p>
          ${field('oslFn', 'f(x)', 'e.g. 1/(x-2)', 'text')}
          ${field('oslA', 'a =', 'the point x approaches', 'number')}
          ${selectField('oslDir', 'Approach from', [
            { value: 'left', label: 'Left (a⁻)' },
            { value: 'right', label: 'Right (a⁺)' }
          ])}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('oslFn'));
          const a = num('oslA');
          const dir = document.getElementById('oslDir')?.value || 'right';
          if (!fn || a === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point a.'); return; }
          const sign = dir === 'left' ? -1 : 1;
          const steps = [1e-2, 1e-4, 1e-6, 1e-8];
          const vals = steps.map(h => { try { return fn(a + sign * h); } catch (e) { return NaN; } });
          const last = vals[vals.length - 1];
          if (!vals.every(v => isFinite(v))) { out.innerHTML = errorBox('The function appears undefined or unbounded from that side.'); return; }
          const stable = Math.abs(vals[vals.length - 1] - vals[vals.length - 2]) < 1e-4;
          out.innerHTML =
            resultCell('Approaching values', vals.map(v => round(v, 6)).join(' → ')) +
            resultCell(dir === 'left' ? 'Left-hand limit' : 'Right-hand limit', stable ? ('≈ ' + round(last, 6)) : 'Does not appear to converge');
        }
      },
      {
        id: 'limitAtInfinity',
        label: 'Limit at Infinity',
        render: () => `
          <p class="tool-hint">Evaluates the trend of f(x) as x → +∞ or x → −∞.</p>
          ${field('liFn', 'f(x)', 'e.g. (2*x+1)/(x-3)', 'text')}
          ${selectField('liDir', 'Direction', [
            { value: 'pos', label: 'x → +∞' },
            { value: 'neg', label: 'x → −∞' }
          ])}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('liFn'));
          const dir = document.getElementById('liDir')?.value || 'pos';
          if (!fn) { out.innerHTML = errorBox('Enter a valid f(x).'); return; }
          const sign = dir === 'neg' ? -1 : 1;
          const xs = [1e3, 1e5, 1e7].map(v => sign * v);
          const vals = xs.map(x => { try { return fn(x); } catch (e) { return NaN; } });
          if (!vals.every(v => isFinite(v))) {
            out.innerHTML = resultCell('Limit', 'Diverges (unbounded or undefined)');
            return;
          }
          const stable = Math.abs(vals[2] - vals[1]) < 1e-4 * (Math.abs(vals[2]) + 1);
          out.innerHTML =
            resultCell('Sampled values', vals.map(v => round(v, 6)).join(' → ')) +
            resultCell('Limit', stable ? ('≈ ' + round(vals[2], 6)) : 'Does not appear to converge (may diverge or oscillate)');
        }
      },
      {
        id: 'taylorPolynomial',
        label: 'Taylor Polynomial Approximation',
        render: () => `
          <p class="tool-hint">Builds the Taylor polynomial of f(x) centered at a, up to the chosen order, and evaluates it at x.</p>
          ${field('tpFn', 'f(x)', 'e.g. exp(x)', 'text')}
          ${field('tpA', 'Center a =', '', 'number')}
          ${field('tpX', 'Evaluate at x =', '', 'number')}
          ${selectField('tpOrder', 'Order', [
            { value: '1', label: '1 (linear)' },
            { value: '2', label: '2 (quadratic)' },
            { value: '3', label: '3 (cubic)' },
            { value: '4', label: '4 (quartic)' }
          ])}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('tpFn'));
          const a = num('tpA'), x = num('tpX');
          const order = parseInt(document.getElementById('tpOrder')?.value || '2', 10);
          if (!fn || a === null || x === null) { out.innerHTML = errorBox('Enter a valid f(x), center a, and evaluation point x.'); return; }
          try {
            const fa = fn(a);
            const d1 = numDeriv1(fn, a);
            const d2 = numDeriv2(fn, a);
            const d3 = order >= 3 ? numDeriv3(fn, a) : 0;
            const d4 = order >= 4 ? numDeriv4(fn, a) : 0;
            const dx = x - a;
            let approx = fa;
            if (order >= 1) approx += d1 * dx;
            if (order >= 2) approx += (d2 * Math.pow(dx, 2)) / 2;
            if (order >= 3) approx += (d3 * Math.pow(dx, 3)) / 6;
            if (order >= 4) approx += (d4 * Math.pow(dx, 4)) / 24;
            const actual = fn(x);
            if (!isFinite(approx)) throw new Error('bad');
            out.innerHTML =
              resultCell(`Taylor Approximation (order ${order})`, round(approx, 6)) +
              resultCell('Actual f(x)', isFinite(actual) ? round(actual, 6) : 'undefined') +
              resultCell('Error', isFinite(actual) ? round(Math.abs(actual - approx), 6) : '—');
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function near that center.'); }
        }
      },
      {
        id: 'meanValueTheorem',
        label: 'Mean Value Theorem Solver',
        render: () => `
          <p class="tool-hint">Finds c in (a, b) such that f'(c) equals the average rate of change of f over [a, b].</p>
          ${field('mvtFn', 'f(x)', 'e.g. x^3-x', 'text')}
          ${field('mvtA', 'a =', '', 'number')}
          ${field('mvtB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('mvtFn'));
          const a = num('mvtA'), b = num('mvtB');
          if (!fn || a === null || b === null || a >= b) { out.innerHTML = errorBox('Enter a valid f(x) and a < b.'); return; }
          try {
            const avgRate = (fn(b) - fn(a)) / (b - a);
            const g = (x) => numDeriv1(fn, x) - avgRate;
            const n = 500, h = (b - a) / n;
            let found = null, prevX = a, prevG = g(a);
            for (let i = 1; i <= n && found === null; i++) {
              const xi = a + i * h;
              const gi = g(xi);
              if (isFinite(prevG) && isFinite(gi) && prevG * gi <= 0) {
                let lo = prevX, hi = xi, glo = prevG;
                for (let k = 0; k < 40; k++) {
                  const mid = (lo + hi) / 2;
                  const gmid = g(mid);
                  if (glo * gmid <= 0) hi = mid; else { lo = mid; glo = gmid; }
                }
                found = (lo + hi) / 2;
              }
              prevX = xi; prevG = gi;
            }
            if (found === null) { out.innerHTML = errorBox('No point c found — check that f is well-behaved on [a, b].'); return; }
            out.innerHTML =
              resultCell('Average Rate of Change', round(avgRate, 6)) +
              resultCell('c (in the interval)', round(found, 6)) +
              resultCell("f'(c)", round(numDeriv1(fn, found), 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that interval.'); }
        }
      },
      {
        id: 'lhopitalRule',
        label: "L'Hôpital's Rule Evaluator",
        render: () => `
          <p class="tool-hint">Evaluates lim(x→a) f(x)/g(x) for a 0/0 or ∞/∞ form using f'(a)/g'(a).</p>
          ${field('lhFnF', 'f(x)', 'e.g. sin(x)', 'text')}
          ${field('lhFnG', 'g(x)', 'e.g. x', 'text')}
          ${field('lhA', 'a =', 'point x approaches', 'number')}
        `,
        calc: (out) => {
          const f = compileCalcFn(str('lhFnF'));
          const g = compileCalcFn(str('lhFnG'));
          const a = num('lhA');
          if (!f || !g || a === null) { out.innerHTML = errorBox('Enter valid f(x), g(x), and a point a.'); return; }
          let fa = NaN, ga = NaN;
          try { fa = f(a); } catch (e) {}
          try { ga = g(a); } catch (e) {}
          const indeterminate = (Math.abs(fa) < 1e-6 && Math.abs(ga) < 1e-6) || (!isFinite(fa) && !isFinite(ga));
          if (!indeterminate) {
            out.innerHTML = errorBox('This does not look like a 0/0 or ∞/∞ form at that point — direct substitution may already work: f(a)=' + (isFinite(fa) ? round(fa, 6) : 'undefined') + ', g(a)=' + (isFinite(ga) ? round(ga, 6) : 'undefined'));
            return;
          }
          try {
            const df = numDeriv1(f, a);
            const dg = numDeriv1(g, a);
            if (!isFinite(df) || !isFinite(dg) || Math.abs(dg) < 1e-10) throw new Error('bad');
            out.innerHTML =
              resultCell("f'(a)", round(df, 6)) +
              resultCell("g'(a)", round(dg, 6)) +
              resultCell("Limit (by L'Hôpital)", round(df / dg, 6));
          } catch (e) { out.innerHTML = errorBox("Could not apply L'Hôpital's Rule — check that the derivatives exist near a."); }
        }
      },
      {
        id: 'absoluteExtrema',
        label: 'Absolute Max/Min on an Interval',
        render: () => `
          <p class="tool-hint">Scans [a, b] for the absolute maximum and minimum values of f(x).</p>
          ${field('aeFn', 'f(x)', 'e.g. x^3-3*x', 'text')}
          ${field('aeA', 'a =', 'interval start', 'number')}
          ${field('aeB', 'b =', 'interval end', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('aeFn'));
          const a = num('aeA'), b = num('aeB');
          if (!fn || a === null || b === null || a >= b) { out.innerHTML = errorBox('Enter a valid f(x) and a < b.'); return; }
          const n = 2000, h = (b - a) / n;
          let maxV = -Infinity, minV = Infinity, maxX = a, minX = a;
          try {
            for (let i = 0; i <= n; i++) {
              const xi = a + i * h;
              const yi = fn(xi);
              if (!isFinite(yi)) continue;
              if (yi > maxV) { maxV = yi; maxX = xi; }
              if (yi < minV) { minV = yi; minX = xi; }
            }
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); return; }
          if (!isFinite(maxV) || !isFinite(minV)) { out.innerHTML = errorBox('The function appears undefined across this interval.'); return; }
          out.innerHTML =
            resultCell('Absolute Maximum', `f(${round(maxX, 5)}) = ${round(maxV, 6)}`) +
            resultCell('Absolute Minimum', `f(${round(minX, 5)}) = ${round(minV, 6)}`);
        }
      },
      {
        id: 'inflectionPointsInterval',
        label: 'Inflection Points in an Interval',
        render: () => `
          <p class="tool-hint">Scans [a, b] for points where f''(x) changes sign (concavity flips).</p>
          ${field('ipiFn', 'f(x)', 'e.g. x^3-3*x^2', 'text')}
          ${field('ipiA', 'a =', 'interval start', 'number')}
          ${field('ipiB', 'b =', 'interval end', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('ipiFn'));
          const a = num('ipiA'), b = num('ipiB');
          if (!fn || a === null || b === null || a >= b) { out.innerHTML = errorBox('Enter a valid f(x) and a < b.'); return; }
          const n = 1500, h = (b - a) / n;
          const points = [];
          let prevX = a, prevD2;
          try { prevD2 = numDeriv2(fn, prevX); } catch (e) { prevD2 = NaN; }
          for (let i = 1; i <= n; i++) {
            const xi = a + i * h;
            let d2i;
            try { d2i = numDeriv2(fn, xi); } catch (e) { d2i = NaN; }
            if (isFinite(prevD2) && isFinite(d2i) && prevD2 * d2i < 0) {
              let lo = prevX, hi = xi, dlo = prevD2;
              for (let k = 0; k < 30; k++) {
                const mid = (lo + hi) / 2;
                let dmid; try { dmid = numDeriv2(fn, mid); } catch (e) { dmid = NaN; }
                if (!isFinite(dmid)) break;
                if (dlo * dmid <= 0) { hi = mid; } else { lo = mid; dlo = dmid; }
              }
              const c = (lo + hi) / 2;
              if (points.length === 0 || Math.abs(points[points.length - 1] - c) > 1e-3) points.push(c);
            }
            prevX = xi; prevD2 = d2i;
          }
          if (points.length === 0) { out.innerHTML = resultCell('Inflection Points', 'None found in this interval'); return; }
          const list = points.slice(0, 10).map(c => `x = ${round(c, 5)} (f = ${round(fn(c), 5)})`).join('<br>');
          out.innerHTML = resultCell('Inflection Points Found', list);
        }
      },
      {
        id: 'continuityTest',
        label: 'Continuity Test at a Point',
        render: () => `
          <p class="tool-hint">Checks whether f(a), the left-hand limit, and the right-hand limit all agree at x = a.</p>
          ${field('ctFn', 'f(x)', 'e.g. x^2+1', 'text')}
          ${field('ctA', 'a =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('ctFn'));
          const a = num('ctA');
          if (!fn || a === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point a.'); return; }
          let fa = NaN, left = NaN, right = NaN;
          try { fa = fn(a); } catch (e) {}
          try { left = fn(a - 1e-6); } catch (e) {}
          try { right = fn(a + 1e-6); } catch (e) {}
          const limitExists = isFinite(left) && isFinite(right) && Math.abs(left - right) < 1e-3;
          const continuous = limitExists && isFinite(fa) && Math.abs(fa - (left + right) / 2) < 1e-3;
          out.innerHTML =
            resultCell('f(a)', isFinite(fa) ? round(fa, 6) : 'undefined') +
            resultCell('Left-hand limit', isFinite(left) ? round(left, 6) : 'undefined') +
            resultCell('Right-hand limit', isFinite(right) ? round(right, 6) : 'undefined') +
            resultCell('Continuous at a?', continuous ? 'Yes' : 'No');
        }
      },
      {
        id: 'differentiabilityTest',
        label: 'Differentiability Test at a Point',
        render: () => `
          <p class="tool-hint">Compares the left-hand and right-hand derivatives at x = a to check for a sharp corner.</p>
          ${field('dtFn', 'f(x)', 'e.g. abs(x)', 'text')}
          ${field('dtA', 'a =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('dtFn'));
          const a = num('dtA');
          if (!fn || a === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point a.'); return; }
          const h = 1e-5;
          let leftD = NaN, rightD = NaN;
          try { leftD = (fn(a) - fn(a - h)) / h; } catch (e) {}
          try { rightD = (fn(a + h) - fn(a)) / h; } catch (e) {}
          if (!isFinite(leftD) || !isFinite(rightD)) { out.innerHTML = errorBox('Could not evaluate one-sided derivatives near that point.'); return; }
          const differentiable = Math.abs(leftD - rightD) < 1e-2;
          out.innerHTML =
            resultCell('Left-hand derivative', round(leftD, 6)) +
            resultCell('Right-hand derivative', round(rightD, 6)) +
            resultCell('Differentiable at a?', differentiable ? ('Yes ≈ ' + round((leftD + rightD) / 2, 6)) : 'No — the one-sided derivatives disagree (a corner or cusp)');
        }
      },
      {
        id: 'linearApproximation',
        label: 'Linear (Tangent Line) Approximation',
        render: () => `
          <p class="tool-hint">Approximates f(x) near x = a using L(x) = f(a) + f'(a)(x − a).</p>
          ${field('laxFn', 'f(x)', 'e.g. sqrt(x)', 'text')}
          ${field('laxA', 'a =', 'known point', 'number')}
          ${field('laxX', 'Approximate at x =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('laxFn'));
          const a = num('laxA'), x = num('laxX');
          if (!fn || a === null || x === null) { out.innerHTML = errorBox('Enter a valid f(x), point a, and target x.'); return; }
          try {
            const fa = fn(a);
            const m = numDeriv1(fn, a);
            if (!isFinite(fa) || !isFinite(m)) throw new Error('bad');
            const approx = fa + m * (x - a);
            const actual = fn(x);
            out.innerHTML =
              resultCell('L(x) Approximation', round(approx, 6)) +
              resultCell('Actual f(x)', isFinite(actual) ? round(actual, 6) : 'undefined') +
              resultCell('Error', isFinite(actual) ? round(Math.abs(actual - approx), 6) : '—');
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function near that point.'); }
        }
      },
      {
        id: 'differentialApprox',
        label: 'Differential Approximation (dy)',
        render: () => `
          <p class="tool-hint">Estimates the change in y using dy = f'(x)·dx, and compares it to the actual Δy.</p>
          ${field('daxFn', 'f(x)', 'e.g. x^2', 'text')}
          ${field('daxX', 'x =', '', 'number')}
          ${field('daxDx', 'dx (small change) =', 'e.g. 0.01', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('daxFn'));
          const x = num('daxX'), dx = num('daxDx');
          if (!fn || x === null || dx === null) { out.innerHTML = errorBox('Enter a valid f(x), point x, and dx.'); return; }
          try {
            const fx = fn(x);
            const m = numDeriv1(fn, x);
            if (!isFinite(fx) || !isFinite(m)) throw new Error('bad');
            const dy = m * dx;
            const actualDelta = fn(x + dx) - fx;
            out.innerHTML =
              resultCell("f'(x)", round(m, 6)) +
              resultCell('dy (approx. change)', round(dy, 6)) +
              resultCell('Actual Δy', isFinite(actualDelta) ? round(actualDelta, 6) : 'undefined');
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'motionAnalysis',
        label: 'Velocity & Acceleration from Position',
        render: () => `
          <p class="tool-hint">Given a position function s(x) (x represents time t), computes velocity v = s'(x) and acceleration a = s''(x) at a given time.</p>
          ${field('maSt', 's(x)', 'e.g. x^3-6*x^2+9*x', 'text')}
          ${field('maT', 'x = (time)', '', 'number')}
        `,
        calc: (out) => {
          const s = compileCalcFn(str('maSt'));
          const t0 = num('maT');
          if (!s || t0 === null) { out.innerHTML = errorBox('Enter a valid s(x) and a time.'); return; }
          try {
            const pos = s(t0);
            const v = numDeriv1(s, t0);
            const acc = numDeriv2(s, t0);
            if (!isFinite(pos) || !isFinite(v) || !isFinite(acc)) throw new Error('bad');
            out.innerHTML =
              resultCell('Position s(t)', round(pos, 6)) +
              resultCell('Velocity v(t)', round(v, 6)) +
              resultCell('Speed |v(t)|', round(Math.abs(v), 6)) +
              resultCell('Acceleration a(t)', round(acc, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the position function at that time.'); }
        }
      },
      {
        id: 'netChangeTheorem',
        label: 'Displacement vs. Total Distance',
        render: () => `
          <p class="tool-hint">Given a velocity function v(x) (x represents time t), computes net displacement ∫v dt and total distance ∫|v| dt from x=a to x=b.</p>
          ${field('nctVt', 'v(x)', 'e.g. x^2-4*x+3', 'text')}
          ${field('nctA', 'a =', 'start time', 'number')}
          ${field('nctB', 'b =', 'end time', 'number')}
        `,
        calc: (out) => {
          const v = compileCalcFn(str('nctVt'));
          const a = num('nctA'), b = num('nctB');
          if (!v || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid v(x) and distinct bounds a, b.'); return; }
          try {
            const displacement = simpsonIntegral(v, a, b, 1000);
            const distance = simpsonIntegral((t) => Math.abs(v(t)), a, b, 1000);
            if (!isFinite(displacement) || !isFinite(distance)) throw new Error('bad');
            out.innerHTML =
              resultCell('Net Displacement', round(displacement, 6)) +
              resultCell('Total Distance Traveled', round(distance, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the velocity function over that range.'); }
        }
      },
      {
        id: 'averageValueFunction',
        label: 'Average Value of a Function',
        render: () => `
          <p class="tool-hint">Computes the average value of f(x) on [a, b]: (1/(b−a))∫f(x)dx.</p>
          ${field('avfFn', 'f(x)', 'e.g. x^2', 'text')}
          ${field('avfA', 'a =', '', 'number')}
          ${field('avfB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('avfFn'));
          const a = num('avfA'), b = num('avfB');
          if (!fn || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid f(x) and distinct bounds a, b.'); return; }
          try {
            const integral = simpsonIntegral(fn, a, b, 1000);
            if (!isFinite(integral)) throw new Error('bad');
            const avg = integral / (b - a);
            out.innerHTML =
              resultCell('∫f(x)dx', round(integral, 6)) +
              resultCell('Average Value', round(avg, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); }
        }
      },
      {
        id: 'improperIntegral',
        label: 'Improper Integral (to ∞) Estimator',
        render: () => `
          <p class="tool-hint">Estimates ∫f(x)dx from a to ∞ by evaluating with progressively larger upper bounds.</p>
          ${field('impFn', 'f(x)', 'e.g. 1/x^2', 'text')}
          ${field('impA', 'a =', 'lower bound', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('impFn'));
          const a = num('impA');
          if (!fn || a === null) { out.innerHTML = errorBox('Enter a valid f(x) and a lower bound a.'); return; }
          try {
            const bounds = [a + 10, a + 100, a + 1000, a + 10000];
            const vals = bounds.map(bUpper => {
              const n = Math.min(200000, Math.max(2000, Math.ceil((bUpper - a) * 20)));
              return simpsonIntegral(fn, a, bUpper, n);
            });
            const last = vals[vals.length - 1];
            const converging = vals.every(v => isFinite(v)) && Math.abs(vals[3] - vals[2]) < 1e-3;
            out.innerHTML =
              resultCell('Partial integrals', vals.map(v => isFinite(v) ? round(v, 5) : '—').join(' → ')) +
              resultCell('Result', converging ? ('Converges ≈ ' + round(last, 6)) : 'Appears to diverge (does not settle to a finite value)');
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); }
        }
      },
      {
        id: 'arcLengthParametric',
        label: 'Arc Length of a Parametric Curve',
        render: () => `
          <p class="tool-hint">Computes the arc length of a parametric curve X(t), Y(t) from t=a to t=b. Enter both as functions of x (used as the parameter t).</p>
          ${field('alpXt', 'X(x) — x is the parameter t', 'e.g. cos(x)', 'text')}
          ${field('alpYt', 'Y(x) — x is the parameter t', 'e.g. sin(x)', 'text')}
          ${field('alpA', 't start (a) =', '', 'number')}
          ${field('alpB', 't end (b) =', '', 'number')}
        `,
        calc: (out) => {
          const X = compileCalcFn(str('alpXt'));
          const Y = compileCalcFn(str('alpYt'));
          const a = num('alpA'), b = num('alpB');
          if (!X || !Y || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter valid X(t), Y(t), and distinct bounds a, b.'); return; }
          try {
            const integrand = (t) => Math.sqrt(Math.pow(numDeriv1(X, t), 2) + Math.pow(numDeriv1(Y, t), 2));
            const length = simpsonIntegral(integrand, a, b, 800);
            if (!isFinite(length)) throw new Error('bad');
            out.innerHTML = resultCell('Arc Length', round(length, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the parametric functions over that range.'); }
        }
      },
      {
        id: 'polarArea',
        label: 'Area Enclosed by a Polar Curve',
        render: () => `
          <p class="tool-hint">Computes the area enclosed by r(θ) from θ=a to θ=b: A = ½∫r(θ)²dθ. Enter r as a function of x (used as θ, in radians).</p>
          ${field('paRTheta', 'r(x) — x is θ (radians)', 'e.g. 1+cos(x)', 'text')}
          ${field('paA', 'θ start (a) =', '', 'number')}
          ${field('paB', 'θ end (b) =', '', 'number')}
        `,
        calc: (out) => {
          const r = compileCalcFn(str('paRTheta'));
          const a = num('paA'), b = num('paB');
          if (!r || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid r(θ) and distinct bounds a, b.'); return; }
          try {
            const integrand = (theta) => Math.pow(r(theta), 2);
            const area = 0.5 * simpsonIntegral(integrand, a, b, 1000);
            if (!isFinite(area)) throw new Error('bad');
            out.innerHTML = resultCell('Enclosed Area', round(area, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the polar function over that range.'); }
        }
      },
      {
        id: 'powerRuleDerivative',
        label: 'Power Rule — Derivative of a·xⁿ',
        render: () => `
          <p class="tool-hint">For a single term a·xⁿ, finds the derivative using the power rule: d/dx[a·xⁿ] = n·a·x^(n−1).</p>
          ${field('prdA', 'Coefficient a', 'e.g. 3', 'number')}
          ${field('prdN', 'Exponent n', 'e.g. 4', 'number')}
        `,
        calc: (out) => {
          const a = num('prdA'), n = num('prdN');
          if (a === null || n === null) { out.innerHTML = errorBox('Enter a valid coefficient a and exponent n.'); return; }
          const newCoeff = a * n;
          const newExp = n - 1;
          const term = newExp === 0 ? `${round(newCoeff, 6)}` : (newExp === 1 ? `${round(newCoeff, 6)}x` : `${round(newCoeff, 6)}x^${round(newExp, 6)}`);
          out.innerHTML =
            resultCell('Original Term', `${round(a, 6)}x^${round(n, 6)}`) +
            resultCell('Derivative', term);
        }
      },
      {
        id: 'powerRuleAntiderivative',
        label: 'Power Rule — Antiderivative of a·xⁿ',
        render: () => `
          <p class="tool-hint">For a single term a·xⁿ (n ≠ −1), finds the antiderivative: ∫a·xⁿ dx = a/(n+1)·x^(n+1) + C.</p>
          ${field('praA', 'Coefficient a', 'e.g. 3', 'number')}
          ${field('praN', 'Exponent n', 'e.g. 4', 'number')}
        `,
        calc: (out) => {
          const a = num('praA'), n = num('praN');
          if (a === null || n === null) { out.innerHTML = errorBox('Enter a valid coefficient a and exponent n.'); return; }
          if (Math.abs(n + 1) < 1e-12) { out.innerHTML = errorBox('For n = −1, the antiderivative is a·ln|x| + C, not covered by the power rule.'); return; }
          const newCoeff = a / (n + 1);
          const newExp = n + 1;
          out.innerHTML =
            resultCell('Original Term', `${round(a, 6)}x^${round(n, 6)}`) +
            resultCell('Antiderivative', `${round(newCoeff, 6)}x^${round(newExp, 6)} + C`);
        }
      },
      {
        id: 'firstDerivativeTest',
        label: 'First Derivative Test — Local Extrema in an Interval',
        render: () => `
          <p class="tool-hint">Scans [a, b] for critical points and classifies each as a local max, local min, or neither using the sign change of f'(x).</p>
          ${field('fdtFn', 'f(x)', 'e.g. x^3-3*x', 'text')}
          ${field('fdtA', 'a =', 'interval start', 'number')}
          ${field('fdtB', 'b =', 'interval end', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('fdtFn'));
          const a = num('fdtA'), b = num('fdtB');
          if (!fn || a === null || b === null || a >= b) { out.innerHTML = errorBox('Enter a valid f(x) and a < b.'); return; }
          const n = 2000, h = (b - a) / n;
          const points = [];
          let prevX = a, prevD;
          try { prevD = numDeriv1(fn, prevX); } catch (e) { prevD = NaN; }
          for (let i = 1; i <= n; i++) {
            const xi = a + i * h;
            let di;
            try { di = numDeriv1(fn, xi); } catch (e) { di = NaN; }
            if (isFinite(prevD) && isFinite(di) && prevD * di < 0) {
              let lo = prevX, hi = xi, dlo = prevD;
              for (let k = 0; k < 40; k++) {
                const mid = (lo + hi) / 2;
                let dmid; try { dmid = numDeriv1(fn, mid); } catch (e) { dmid = NaN; }
                if (!isFinite(dmid)) break;
                if (dlo * dmid <= 0) { hi = mid; } else { lo = mid; dlo = dmid; }
              }
              const c = (lo + hi) / 2;
              if (points.length === 0 || Math.abs(points[points.length - 1] - c) > 1e-3) points.push(c);
            }
            prevX = xi; prevD = di;
          }
          if (points.length === 0) { out.innerHTML = resultCell('Local Extrema', 'None found in this interval'); return; }
          const list = points.slice(0, 10).map(c => {
            let before = NaN, after = NaN;
            try { before = numDeriv1(fn, c - 0.01); } catch (e) {}
            try { after = numDeriv1(fn, c + 0.01); } catch (e) {}
            let kind = 'Neither (no sign change)';
            if (before > 0 && after < 0) kind = 'Local Maximum';
            else if (before < 0 && after > 0) kind = 'Local Minimum';
            return `x = ${round(c, 5)} (f = ${round(fn(c), 5)}) — ${kind}`;
          }).join('<br>');
          out.innerHTML = resultCell('Local Extrema Found', list);
        }
      },
      {
        id: 'relatedRatesChainRule',
        label: 'Related Rates (Chain Rule)',
        render: () => `
          <p class="tool-hint">Given y = f(x) and the rate dx/dt at a point, finds dy/dt = f'(x)·(dx/dt).</p>
          ${field('rrcFn', 'f(x)', 'e.g. x^2', 'text')}
          ${field('rrcX', 'x =', 'point of interest', 'number')}
          ${field('rrcDxdt', 'dx/dt =', 'known rate', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('rrcFn'));
          const x0 = num('rrcX'), dxdt = num('rrcDxdt');
          if (!fn || x0 === null || dxdt === null) { out.innerHTML = errorBox('Enter a valid f(x), point x, and dx/dt.'); return; }
          try {
            const m = numDeriv1(fn, x0);
            if (!isFinite(m)) throw new Error('bad');
            const dydt = m * dxdt;
            out.innerHTML =
              resultCell("dy/dx = f'(x)", round(m, 6)) +
              resultCell('dy/dt', round(dydt, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'chainRuleDerivative',
        label: 'Chain Rule Derivative of f(g(x))',
        render: () => `
          <p class="tool-hint">Computes the derivative of the composite function f(g(x)) at x = x₀ using the chain rule: f'(g(x₀))·g'(x₀).</p>
          ${field('crdF', 'f(x) — outer function', 'e.g. sin(x)', 'text')}
          ${field('crdG', 'g(x) — inner function', 'e.g. x^2', 'text')}
          ${field('crdX', 'x₀ =', '', 'number')}
        `,
        calc: (out) => {
          const f = compileCalcFn(str('crdF'));
          const g = compileCalcFn(str('crdG'));
          const x0 = num('crdX');
          if (!f || !g || x0 === null) { out.innerHTML = errorBox('Enter valid f(x), g(x), and a point x₀.'); return; }
          try {
            const gx0 = g(x0);
            const dg = numDeriv1(g, x0);
            const df = numDeriv1(f, gx0);
            if (!isFinite(gx0) || !isFinite(dg) || !isFinite(df)) throw new Error('bad');
            out.innerHTML =
              resultCell('g(x₀)', round(gx0, 6)) +
              resultCell("g'(x₀)", round(dg, 6)) +
              resultCell("f'(g(x₀))", round(df, 6)) +
              resultCell("[f(g(x))]' at x₀", round(df * dg, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the functions at that point.'); }
        }
      },
      {
        id: 'productRuleDerivative',
        label: 'Product Rule Derivative at a Point',
        render: () => `
          <p class="tool-hint">Computes the derivative of f(x)·g(x) at x = x₀ using the product rule: f'g + fg'.</p>
          ${field('prdfF', 'f(x)', 'e.g. x^2', 'text')}
          ${field('prdfG', 'g(x)', 'e.g. sin(x)', 'text')}
          ${field('prdfX', 'x₀ =', '', 'number')}
        `,
        calc: (out) => {
          const f = compileCalcFn(str('prdfF'));
          const g = compileCalcFn(str('prdfG'));
          const x0 = num('prdfX');
          if (!f || !g || x0 === null) { out.innerHTML = errorBox('Enter valid f(x), g(x), and a point x₀.'); return; }
          try {
            const fx = f(x0), gx = g(x0);
            const df = numDeriv1(f, x0), dg = numDeriv1(g, x0);
            if (!isFinite(fx) || !isFinite(gx) || !isFinite(df) || !isFinite(dg)) throw new Error('bad');
            const result = df * gx + fx * dg;
            out.innerHTML =
              resultCell("f'(x₀)", round(df, 6)) +
              resultCell("g'(x₀)", round(dg, 6)) +
              resultCell("[f·g]'(x₀)", round(result, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the functions at that point.'); }
        }
      },
      {
        id: 'quotientRuleDerivative',
        label: 'Quotient Rule Derivative at a Point',
        render: () => `
          <p class="tool-hint">Computes the derivative of f(x)/g(x) at x = x₀ using the quotient rule: (f'g − fg')/g².</p>
          ${field('qrdF', 'f(x) — numerator', 'e.g. x^2', 'text')}
          ${field('qrdG', 'g(x) — denominator', 'e.g. x+1', 'text')}
          ${field('qrdX', 'x₀ =', '', 'number')}
        `,
        calc: (out) => {
          const f = compileCalcFn(str('qrdF'));
          const g = compileCalcFn(str('qrdG'));
          const x0 = num('qrdX');
          if (!f || !g || x0 === null) { out.innerHTML = errorBox('Enter valid f(x), g(x), and a point x₀.'); return; }
          try {
            const fx = f(x0), gx = g(x0);
            const df = numDeriv1(f, x0), dg = numDeriv1(g, x0);
            if (!isFinite(fx) || !isFinite(gx) || !isFinite(df) || !isFinite(dg) || Math.abs(gx) < 1e-10) throw new Error('bad');
            const result = (df * gx - fx * dg) / (gx * gx);
            out.innerHTML =
              resultCell("f'(x₀)", round(df, 6)) +
              resultCell("g'(x₀)", round(dg, 6)) +
              resultCell("[f/g]'(x₀)", round(result, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the functions at that point (check g(x₀) ≠ 0).'); }
        }
      },
      {
        id: 'polarArcLength',
        label: 'Arc Length of a Polar Curve',
        render: () => `
          <p class="tool-hint">Computes the arc length of r(θ) from θ=a to θ=b: L = ∫√(r² + (dr/dθ)²)dθ. Enter r as a function of x (used as θ, in radians).</p>
          ${field('palR', 'r(x) — x is θ (radians)', 'e.g. 1+cos(x)', 'text')}
          ${field('palA', 'θ start (a) =', '', 'number')}
          ${field('palB', 'θ end (b) =', '', 'number')}
        `,
        calc: (out) => {
          const r = compileCalcFn(str('palR'));
          const a = num('palA'), b = num('palB');
          if (!r || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid r(θ) and distinct bounds a, b.'); return; }
          try {
            const integrand = (theta) => Math.sqrt(Math.pow(r(theta), 2) + Math.pow(numDeriv1(r, theta), 2));
            const length = simpsonIntegral(integrand, a, b, 1000);
            if (!isFinite(length)) throw new Error('bad');
            out.innerHTML = resultCell('Arc Length', round(length, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the polar function over that range.'); }
        }
      },
      {
        id: 'volumeCrossSections',
        label: 'Volume by Cross-Sections',
        render: () => `
          <p class="tool-hint">Given a cross-sectional area function A(x) perpendicular to the x-axis, computes the solid's volume: V = ∫A(x)dx from a to b.</p>
          ${field('vcsAreaFn', 'A(x) — cross-section area', 'e.g. x^2 or pi*x^2/4', 'text')}
          ${field('vcsBoundA', 'a =', '', 'number')}
          ${field('vcsBoundB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const A = compileCalcFn(str('vcsAreaFn'));
          const a = num('vcsBoundA'), b = num('vcsBoundB');
          if (!A || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter a valid A(x) and distinct bounds a, b.'); return; }
          try {
            const volume = simpsonIntegral(A, a, b, 1000);
            if (!isFinite(volume)) throw new Error('bad');
            out.innerHTML = resultCell('Volume', round(volume, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate A(x) over that range.'); }
        }
      },
      {
        id: 'volumeWasherMethod',
        label: 'Volume of Revolution — Washer Method',
        render: () => `
          <p class="tool-hint">Revolves the region between y=f(x) (outer) and y=g(x) (inner) around the x-axis from a to b: V = π∫[f(x)² − g(x)²]dx.</p>
          ${field('vwmF', 'f(x) — outer radius', 'e.g. x', 'text')}
          ${field('vwmG', 'g(x) — inner radius', 'e.g. x^2', 'text')}
          ${field('vwmA', 'a =', '', 'number')}
          ${field('vwmB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const f = compileCalcFn(str('vwmF'));
          const g = compileCalcFn(str('vwmG'));
          const a = num('vwmA'), b = num('vwmB');
          if (!f || !g || a === null || b === null || a === b) { out.innerHTML = errorBox('Enter valid f(x), g(x), and distinct bounds a, b.'); return; }
          try {
            const integrand = (x) => Math.pow(f(x), 2) - Math.pow(g(x), 2);
            const volume = Math.PI * simpsonIntegral(integrand, a, b, 1000);
            if (!isFinite(volume)) throw new Error('bad');
            out.innerHTML = resultCell('Volume (Washer Method)', round(volume, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the functions over that range.'); }
        }
      },
      {
        id: 'nthDerivativeAtPoint',
        label: 'nth Derivative at a Point',
        render: () => `
          <p class="tool-hint">Computes f'(x), f''(x), f'''(x), and f⁗(x) at a chosen point using numeric differentiation.</p>
          ${field('ndpFn', 'f(x)', 'e.g. sin(x)*x^2', 'text')}
          ${field('ndpX', 'x =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('ndpFn'));
          const x0 = num('ndpX');
          if (!fn || x0 === null) { out.innerHTML = errorBox('Enter a valid f(x) and a point x.'); return; }
          try {
            const d1 = numDeriv1(fn, x0);
            const d2 = numDeriv2(fn, x0);
            const d3 = numDeriv3(fn, x0);
            const d4 = numDeriv4(fn, x0);
            if (!isFinite(d1) || !isFinite(d2)) throw new Error('bad');
            out.innerHTML =
              resultCell("f'(x)", round(d1, 6)) +
              resultCell("f''(x)", round(d2, 6)) +
              resultCell("f'''(x)", isFinite(d3) ? round(d3, 4) : '—') +
              resultCell("f⁗(x)", isFinite(d4) ? round(d4, 4) : '—');
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function at that point.'); }
        }
      },
      {
        id: 'rolleTheorem',
        label: "Rolle's Theorem Solver",
        render: () => `
          <p class="tool-hint">Checks f(a) = f(b), then finds c in (a, b) where f'(c) = 0.</p>
          ${field('rtFn', 'f(x)', 'e.g. x^2-4*x+3', 'text')}
          ${field('rtA', 'a =', '', 'number')}
          ${field('rtB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('rtFn'));
          const a = num('rtA'), b = num('rtB');
          if (!fn || a === null || b === null || a >= b) { out.innerHTML = errorBox('Enter a valid f(x) and a < b.'); return; }
          try {
            const fa = fn(a), fb = fn(b);
            if (!isFinite(fa) || !isFinite(fb)) throw new Error('bad');
            if (Math.abs(fa - fb) > 1e-3) {
              out.innerHTML = errorBox(`Rolle's Theorem does not apply — f(a) = ${round(fa, 5)} ≠ f(b) = ${round(fb, 5)}.`);
              return;
            }
            const n = 500, h = (b - a) / n;
            let found = null, prevX = a, prevD = numDeriv1(fn, a);
            for (let i = 1; i <= n && found === null; i++) {
              const xi = a + i * h;
              const di = numDeriv1(fn, xi);
              if (isFinite(prevD) && isFinite(di) && prevD * di <= 0) {
                let lo = prevX, hi = xi, dlo = prevD;
                for (let k = 0; k < 40; k++) {
                  const mid = (lo + hi) / 2;
                  const dmid = numDeriv1(fn, mid);
                  if (dlo * dmid <= 0) hi = mid; else { lo = mid; dlo = dmid; }
                }
                found = (lo + hi) / 2;
              }
              prevX = xi; prevD = di;
            }
            if (found === null) { out.innerHTML = errorBox('No point c found — check that f is well-behaved on [a, b].'); return; }
            out.innerHTML =
              resultCell('f(a) = f(b)', round(fa, 6)) +
              resultCell('c (in the interval)', round(found, 6)) +
              resultCell("f'(c)", round(numDeriv1(fn, found), 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that interval.'); }
        }
      },
      {
        id: 'surfaceAreaRevolutionYAxis',
        label: 'Surface Area of Revolution (about y-axis)',
        render: () => `
          <p class="tool-hint">Surface area of y=f(x) revolved around the y-axis from x=a to x=b (a≥0): S = 2π∫x√(1+f'(x)²)dx.</p>
          ${field('saryF', 'f(x)', 'e.g. x^2', 'text')}
          ${field('saryA', 'a =', '≥ 0', 'number')}
          ${field('saryB', 'b =', '', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('saryF'));
          const a = num('saryA'), b = num('saryB');
          if (!fn || a === null || b === null || a === b || a < 0) { out.innerHTML = errorBox('Enter a valid f(x) and bounds with a ≥ 0, a ≠ b.'); return; }
          try {
            const integrand = (x) => x * Math.sqrt(1 + Math.pow(numDeriv1(fn, x), 2));
            const area = 2 * Math.PI * simpsonIntegral(integrand, a, b, 500);
            if (!isFinite(area)) throw new Error('bad');
            out.innerHTML = resultCell('Surface Area', round(area, 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); }
        }
      },
      {
        id: 'integrationMethodCompare',
        label: 'Compare Integration Methods (Trapezoidal vs Simpson)',
        render: () => `
          <p class="tool-hint">Computes ∫f(x)dx from a to b using both the Trapezoidal Rule and Simpson's Rule with n subintervals, and compares them.</p>
          ${field('imcFn', 'f(x)', 'e.g. sin(x)', 'text')}
          ${field('imcA', 'a =', '', 'number')}
          ${field('imcB', 'b =', '', 'number')}
          ${field('imcN', 'n (subintervals)', 'e.g. 10', 'number')}
        `,
        calc: (out) => {
          const fn = compileCalcFn(str('imcFn'));
          const a = num('imcA'), b = num('imcB');
          let n = num('imcN');
          if (!fn || a === null || b === null || a === b || !n || n <= 0) { out.innerHTML = errorBox('Enter a valid f(x), distinct bounds a,b, and a positive n.'); return; }
          n = Math.max(2, Math.round(n));
          try {
            const h = (b - a) / n;
            let trapSum = (fn(a) + fn(b)) / 2;
            for (let i = 1; i < n; i++) trapSum += fn(a + i * h);
            const trapezoidal = trapSum * h;
            const simpson = simpsonIntegral(fn, a, b, n);
            if (!isFinite(trapezoidal) || !isFinite(simpson)) throw new Error('bad');
            out.innerHTML =
              resultCell('Trapezoidal Estimate', round(trapezoidal, 6)) +
              resultCell("Simpson's Estimate", round(simpson, 6)) +
              resultCell('Difference', round(Math.abs(trapezoidal - simpson), 6));
          } catch (e) { out.innerHTML = errorBox('Could not evaluate the function over that range.'); }
        }
      }
    ],

    Probability: [
      {
        id: 'permutations',
        label: 'Permutations (nPr)',
        render: () => `
          ${field('permN', 'n', 'total items', 'number')}
          ${field('permR', 'r', 'items chosen', 'number')}
        `,
        calc: (out) => {
          const n = num('permN'), r = num('permR');
          if (n === null || r === null || r > n || n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          out.innerHTML = resultCell('nPr', fact(n) / fact(n - r));
        }
      },
      {
        id: 'combinations',
        label: 'Combinations (nCr)',
        render: () => `
          ${field('combN', 'n', 'total items', 'number')}
          ${field('combR', 'r', 'items chosen', 'number')}
        `,
        calc: (out) => {
          const n = num('combN'), r = num('combR');
          if (n === null || r === null || r > n || n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          out.innerHTML = resultCell('nCr', fact(n) / (fact(r) * fact(n - r)));
        }
      },
      {
        id: 'normalDistribution',
        label: 'Normal Distribution Probability',
        render: () => `
          <p class="tool-hint">P(X ≤ x) for a normal distribution with the given mean and standard deviation.</p>
          ${field('ndX', 'x', '', 'number')}
          ${field('ndMean', 'Mean (μ)', '', 'number')}
          ${field('ndStd', 'Std Dev (σ)', '', 'number')}
        `,
        calc: (out) => {
          const x = num('ndX'), mean = num('ndMean'), std = num('ndStd');
          if (x === null || mean === null || std === null || std <= 0) { out.innerHTML = errorBox(t('tool_err_3fields')); return; }
          const z = (x - mean) / std;
          // Abramowitz & Stegun erf approximation
          function erf(v) {
            const sign = v < 0 ? -1 : 1; v = Math.abs(v);
            const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
            const t2 = 1 / (1 + p * v);
            const y = 1 - (((((a5*t2+a4)*t2)+a3)*t2+a2)*t2+a1)*t2*Math.exp(-v*v);
            return sign * y;
          }
          const cdf = 0.5 * (1 + erf(z / Math.sqrt(2)));
          out.innerHTML =
            resultCell('z-score', round(z, 4)) +
            resultCell('P(X ≤ x)', round(cdf, 6)) +
            resultCell('P(X > x)', round(1 - cdf, 6));
        }
      },
      {
        id: 'simpleProbability',
        label: 'Simple Event Probability',
        render: () => `
          ${field('spFav', 'Favorable outcomes', '', 'number')}
          ${field('spTotal', 'Total outcomes', '', 'number')}
        `,
        calc: (out) => {
          const fav = num('spFav'), total = num('spTotal');
          if (fav === null || total === null || total <= 0 || fav < 0 || fav > total) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML =
            resultCell('P(Event)', round(fav / total, 6)) +
            resultCell('As Percent', round((fav / total) * 100, 3) + '%') +
            resultCell('Odds', `${fav} : ${total - fav}`);
        }
      },
      {
        id: 'binomialPMF',
        label: 'Binomial Probability P(X = k)',
        render: () => `
          <p class="tool-hint">P(X = k) for a binomial distribution with n trials and success probability p.</p>
          ${field('bpmN', 'n (trials)', '', 'number')}
          ${field('bpmP', 'p (success probability)', 'e.g. 0.5', 'number')}
          ${field('bpmK', 'k (successes)', '', 'number')}
        `,
        calc: (out) => {
          const n = num('bpmN'), p = num('bpmP'), k = num('bpmK');
          if (n === null || p === null || k === null || n < 0 || !Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n || p < 0 || p > 1) { out.innerHTML = errorBox('Enter a valid n, p (0–1), and k (0 ≤ k ≤ n).'); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const nCk = fact(n) / (fact(k) * fact(n - k));
          const prob = nCk * Math.pow(p, k) * Math.pow(1 - p, n - k);
          out.innerHTML =
            resultCell('C(n,k)', nCk) +
            resultCell('P(X = k)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'binomialCumulative',
        label: 'Binomial Cumulative Probability P(X ≤ k)',
        render: () => `
          <p class="tool-hint">P(X ≤ k) for a binomial distribution with n trials and success probability p.</p>
          ${field('bcN', 'n (trials)', '', 'number')}
          ${field('bcP', 'p (success probability)', 'e.g. 0.5', 'number')}
          ${field('bcK', 'k (at most this many successes)', '', 'number')}
        `,
        calc: (out) => {
          const n = num('bcN'), p = num('bcP'), k = num('bcK');
          if (n === null || p === null || k === null || n < 0 || !Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n || p < 0 || p > 1) { out.innerHTML = errorBox('Enter a valid n, p (0–1), and k (0 ≤ k ≤ n).'); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          let cdf = 0;
          for (let i = 0; i <= k; i++) {
            const nCi = fact(n) / (fact(i) * fact(n - i));
            cdf += nCi * Math.pow(p, i) * Math.pow(1 - p, n - i);
          }
          out.innerHTML =
            resultCell('P(X ≤ k)', round(cdf, 6)) +
            resultCell('P(X > k)', round(1 - cdf, 6)) +
            resultCell('As Percent', round(cdf * 100, 4) + '%');
        }
      },
      {
        id: 'poissonProbability',
        label: 'Poisson Probability P(X = k)',
        render: () => `
          <p class="tool-hint">P(X = k) for a Poisson distribution with mean rate λ (average occurrences).</p>
          ${field('ppLambda', 'λ (average rate)', 'e.g. 4', 'number')}
          ${field('ppK', 'k (occurrences)', '', 'number')}
        `,
        calc: (out) => {
          const lambda = num('ppLambda'), k = num('ppK');
          if (lambda === null || k === null || lambda < 0 || k < 0 || !Number.isInteger(k)) { out.innerHTML = errorBox('Enter a valid λ ≥ 0 and integer k ≥ 0.'); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const prob = Math.exp(-lambda) * Math.pow(lambda, k) / fact(k);
          out.innerHTML =
            resultCell('P(X = k)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'geometricProbability',
        label: 'Geometric Distribution — First Success on Trial k',
        render: () => `
          <p class="tool-hint">Probability that the first success happens exactly on trial k: P(X = k) = (1−p)^(k−1)·p.</p>
          ${field('gpP', 'p (success probability)', 'e.g. 0.2', 'number')}
          ${field('gpK', 'k (trial number)', '', 'number')}
        `,
        calc: (out) => {
          const p = num('gpP'), k = num('gpK');
          if (p === null || k === null || p <= 0 || p > 1 || k < 1 || !Number.isInteger(k)) { out.innerHTML = errorBox('Enter a valid p (0 < p ≤ 1) and integer k ≥ 1.'); return; }
          const prob = Math.pow(1 - p, k - 1) * p;
          const expectedTrials = 1 / p;
          out.innerHTML =
            resultCell('P(X = k)', round(prob, 6)) +
            resultCell('Expected Trials to First Success', round(expectedTrials, 4));
        }
      },
      {
        id: 'bayesTheorem',
        label: "Bayes' Theorem Calculator",
        render: () => `
          <p class="tool-hint">Computes P(A|B) given P(A), P(B|A), and P(B|not A), using P(B) = P(B|A)P(A) + P(B|A')P(A').</p>
          ${field('btPA', 'P(A)', 'e.g. 0.3', 'number')}
          ${field('btPBA', 'P(B|A)', 'e.g. 0.9', 'number')}
          ${field('btPBnotA', "P(B|A')", 'e.g. 0.1', 'number')}
        `,
        calc: (out) => {
          const pA = num('btPA'), pBA = num('btPBA'), pBnotA = num('btPBnotA');
          if (pA === null || pBA === null || pBnotA === null || pA < 0 || pA > 1 || pBA < 0 || pBA > 1 || pBnotA < 0 || pBnotA > 1) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1.'); return; }
          const pNotA = 1 - pA;
          const pB = pBA * pA + pBnotA * pNotA;
          if (pB <= 0) { out.innerHTML = errorBox('P(B) computes to 0 — check your inputs.'); return; }
          const pAB = (pBA * pA) / pB;
          out.innerHTML =
            resultCell('P(B)', round(pB, 6)) +
            resultCell('P(A|B)', round(pAB, 6)) +
            resultCell('As Percent', round(pAB * 100, 4) + '%');
        }
      },
      {
        id: 'conditionalProbability',
        label: 'Conditional Probability P(A|B)',
        render: () => `
          <p class="tool-hint">Computes P(A|B) = P(A∩B) / P(B).</p>
          ${field('cpAandB', 'P(A ∩ B)', 'e.g. 0.15', 'number')}
          ${field('cpB', 'P(B)', 'e.g. 0.4', 'number')}
        `,
        calc: (out) => {
          const pAandB = num('cpAandB'), pB = num('cpB');
          if (pAandB === null || pB === null || pB <= 0 || pAandB < 0 || pAandB > pB) { out.innerHTML = errorBox('Enter valid probabilities with 0 < P(B) and P(A∩B) ≤ P(B).'); return; }
          const pAB = pAandB / pB;
          out.innerHTML =
            resultCell('P(A|B)', round(pAB, 6)) +
            resultCell('As Percent', round(pAB * 100, 4) + '%');
        }
      },
      {
        id: 'unionOfEvents',
        label: 'Union of Two Events P(A∪B)',
        render: () => `
          <p class="tool-hint">Computes P(A∪B) = P(A) + P(B) − P(A∩B).</p>
          ${field('ueA', 'P(A)', '', 'number')}
          ${field('ueB', 'P(B)', '', 'number')}
          ${field('ueAandB', 'P(A ∩ B)', '0 if mutually exclusive', 'number')}
        `,
        calc: (out) => {
          const pA = num('ueA'), pB = num('ueB'), pAandB = num('ueAandB');
          if (pA === null || pB === null || pAandB === null || pA < 0 || pA > 1 || pB < 0 || pB > 1 || pAandB < 0) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1.'); return; }
          const pUnion = pA + pB - pAandB;
          out.innerHTML =
            resultCell('P(A∪B)', round(pUnion, 6)) +
            resultCell('Mutually Exclusive?', pAandB === 0 ? 'Yes (P(A∩B) = 0)' : 'No');
        }
      },
      {
        id: 'complementProbability',
        label: "Complement of an Event P(A')",
        render: () => `
          ${field('compA', 'P(A)', 'e.g. 0.35', 'number')}
        `,
        calc: (out) => {
          const pA = num('compA');
          if (pA === null || pA < 0 || pA > 1) { out.innerHTML = errorBox('Enter a valid probability between 0 and 1.'); return; }
          out.innerHTML =
            resultCell("P(A')", round(1 - pA, 6)) +
            resultCell('As Percent', round((1 - pA) * 100, 4) + '%');
        }
      },
      {
        id: 'independentEventsCheck',
        label: 'Independent Events Check',
        render: () => `
          <p class="tool-hint">Checks whether A and B are independent: P(A∩B) should equal P(A)·P(B).</p>
          ${field('iecA', 'P(A)', '', 'number')}
          ${field('iecB', 'P(B)', '', 'number')}
          ${field('iecAandB', 'P(A ∩ B) — observed', '', 'number')}
        `,
        calc: (out) => {
          const pA = num('iecA'), pB = num('iecB'), pAandB = num('iecAandB');
          if (pA === null || pB === null || pAandB === null || pA < 0 || pA > 1 || pB < 0 || pB > 1 || pAandB < 0) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1.'); return; }
          const expected = pA * pB;
          const independent = Math.abs(expected - pAandB) < 1e-6;
          out.innerHTML =
            resultCell('P(A)·P(B)', round(expected, 6)) +
            resultCell('P(A ∩ B) given', round(pAandB, 6)) +
            resultCell('Independent?', independent ? 'Yes' : 'No — the events are dependent');
        }
      },
      {
        id: 'expectedValueVariance',
        label: 'Expected Value & Variance (Discrete Random Variable)',
        render: () => `
          <p class="tool-hint">Enter matching comma-separated values and probabilities, e.g. values "1,2,3" and probabilities "0.2,0.5,0.3".</p>
          ${field('evvValues', 'Values (x)', 'e.g. 1,2,3', 'text')}
          ${field('evvProbs', 'Probabilities P(x)', 'e.g. 0.2,0.5,0.3', 'text')}
        `,
        calc: (out) => {
          const valuesStr = str('evvValues'), probsStr = str('evvProbs');
          const values = valuesStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
          const probs = probsStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
          if (values.length === 0 || probs.length === 0 || values.length !== probs.length) { out.innerHTML = errorBox('Enter matching lists of values and probabilities, separated by commas.'); return; }
          const probSum = probs.reduce((a, b) => a + b, 0);
          if (Math.abs(probSum - 1) > 0.01 || probs.some(p => p < 0)) { out.innerHTML = errorBox('Probabilities must be non-negative and sum to 1 (got ' + round(probSum, 4) + ').'); return; }
          let mean = 0;
          for (let i = 0; i < values.length; i++) mean += values[i] * probs[i];
          let variance = 0;
          for (let i = 0; i < values.length; i++) variance += probs[i] * Math.pow(values[i] - mean, 2);
          out.innerHTML =
            resultCell('E(X) — Mean', round(mean, 6)) +
            resultCell('Var(X)', round(variance, 6)) +
            resultCell('SD(X)', round(Math.sqrt(variance), 6));
        }
      },
      {
        id: 'oddsToProbability',
        label: 'Odds to Probability Converter',
        render: () => `
          <p class="tool-hint">Converts odds in favor (a : b) into a probability: P = a / (a + b).</p>
          ${field('otpFor', 'Odds in Favor (a)', 'e.g. 3', 'number')}
          ${field('otpAgainst', 'Odds Against (b)', 'e.g. 5', 'number')}
        `,
        calc: (out) => {
          const a = num('otpFor'), b = num('otpAgainst');
          if (a === null || b === null || a < 0 || b < 0 || a + b === 0) { out.innerHTML = errorBox('Enter valid non-negative odds, not both zero.'); return; }
          const prob = a / (a + b);
          out.innerHTML =
            resultCell('P(Event)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%') +
            resultCell('Odds', `${a} : ${b}`);
        }
      },
      {
        id: 'probabilityToOdds',
        label: 'Probability to Odds Converter',
        render: () => `
          <p class="tool-hint">Converts a probability into odds in favor and odds against.</p>
          ${field('ptoP', 'P(Event)', 'e.g. 0.6', 'number')}
        `,
        calc: (out) => {
          const p = num('ptoP');
          if (p === null || p < 0 || p > 1) { out.innerHTML = errorBox('Enter a valid probability between 0 and 1.'); return; }
          if (p === 0) { out.innerHTML = resultCell('Odds in Favor', '0 : 1 (event impossible)'); return; }
          if (p === 1) { out.innerHTML = resultCell('Odds in Favor', '1 : 0 (event certain)'); return; }
          const oddsFor = p / (1 - p);
          const oddsAgainst = (1 - p) / p;
          out.innerHTML =
            resultCell('Odds in Favor', round(oddsFor, 6) + ' : 1') +
            resultCell('Odds Against', round(oddsAgainst, 6) + ' : 1');
        }
      },
      {
        id: 'multiplicationIndependent',
        label: 'Multiplication Rule — Independent Events',
        render: () => `
          <p class="tool-hint">For independent events, P(A∩B) = P(A) × P(B).</p>
          ${field('miA', 'P(A)', '', 'number')}
          ${field('miB', 'P(B)', '', 'number')}
        `,
        calc: (out) => {
          const pA = num('miA'), pB = num('miB');
          if (pA === null || pB === null || pA < 0 || pA > 1 || pB < 0 || pB > 1) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1.'); return; }
          const prob = pA * pB;
          out.innerHTML =
            resultCell('P(A∩B)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'multiplicationDependent',
        label: 'Multiplication Rule — Dependent Events',
        render: () => `
          <p class="tool-hint">For dependent events, P(A∩B) = P(A) × P(B|A).</p>
          ${field('mdA', 'P(A)', '', 'number')}
          ${field('mdBgivenA', 'P(B|A)', '', 'number')}
        `,
        calc: (out) => {
          const pA = num('mdA'), pBA = num('mdBgivenA');
          if (pA === null || pBA === null || pA < 0 || pA > 1 || pBA < 0 || pBA > 1) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1.'); return; }
          const prob = pA * pBA;
          out.innerHTML =
            resultCell('P(A∩B)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'mutuallyExclusiveUnion',
        label: 'Mutually Exclusive Events — P(A∪B)',
        render: () => `
          <p class="tool-hint">For mutually exclusive events (P(A∩B) = 0), P(A∪B) = P(A) + P(B).</p>
          ${field('meuA', 'P(A)', '', 'number')}
          ${field('meuB', 'P(B)', '', 'number')}
        `,
        calc: (out) => {
          const pA = num('meuA'), pB = num('meuB');
          if (pA === null || pB === null || pA < 0 || pA > 1 || pB < 0 || pB > 1) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1.'); return; }
          const sum = pA + pB;
          if (sum > 1) { out.innerHTML = errorBox('P(A) + P(B) exceeds 1 — these cannot be mutually exclusive probabilities.'); return; }
          out.innerHTML =
            resultCell('P(A∪B)', round(sum, 6)) +
            resultCell('As Percent', round(sum * 100, 4) + '%');
        }
      },
      {
        id: 'hypergeometricProbability',
        label: 'Hypergeometric Probability',
        render: () => `
          <p class="tool-hint">P(X = k) for drawing a sample of size n without replacement from a population of size N containing K successes.</p>
          ${field('hgN', 'N (population size)', '', 'number')}
          ${field('hgK', 'K (successes in population)', '', 'number')}
          ${field('hgn', 'n (sample size)', '', 'number')}
          ${field('hgk', 'k (successes drawn)', '', 'number')}
        `,
        calc: (out) => {
          const N = num('hgN'), K = num('hgK'), n = num('hgn'), k = num('hgk');
          if (N === null || K === null || n === null || k === null ||
              !Number.isInteger(N) || !Number.isInteger(K) || !Number.isInteger(n) || !Number.isInteger(k) ||
              N < 0 || K < 0 || K > N || n < 0 || n > N || k < 0 || k > K || (n - k) > (N - K)) {
            out.innerHTML = errorBox('Enter valid integers with 0 ≤ K ≤ N, 0 ≤ n ≤ N, and a reachable k.'); return;
          }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          function C(a, b) { if (b < 0 || b > a) return 0; return fact(a) / (fact(b) * fact(a - b)); }
          const prob = (C(K, k) * C(N - K, n - k)) / C(N, n);
          out.innerHTML =
            resultCell('P(X = k)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'negativeBinomialProbability',
        label: 'Negative Binomial Probability',
        render: () => `
          <p class="tool-hint">Probability that the r-th success occurs on trial k: P(X = k) = C(k−1, r−1)·p^r·(1−p)^(k−r).</p>
          ${field('nbR', 'r (target number of successes)', '', 'number')}
          ${field('nbP', 'p (success probability)', 'e.g. 0.3', 'number')}
          ${field('nbK', 'k (trial of r-th success)', '', 'number')}
        `,
        calc: (out) => {
          const r = num('nbR'), p = num('nbP'), k = num('nbK');
          if (r === null || p === null || k === null || !Number.isInteger(r) || !Number.isInteger(k) || r < 1 || k < r || p <= 0 || p > 1) {
            out.innerHTML = errorBox('Enter integer r ≥ 1, integer k ≥ r, and p in (0, 1].'); return;
          }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const nCk = fact(k - 1) / (fact(r - 1) * fact(k - r));
          const prob = nCk * Math.pow(p, r) * Math.pow(1 - p, k - r);
          out.innerHTML =
            resultCell('P(X = k)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'binomialMeanVariance',
        label: 'Binomial Distribution — Mean, Variance & SD',
        render: () => `
          ${field('bmvN', 'n (trials)', '', 'number')}
          ${field('bmvP', 'p (success probability)', 'e.g. 0.5', 'number')}
        `,
        calc: (out) => {
          const n = num('bmvN'), p = num('bmvP');
          if (n === null || p === null || n < 0 || !Number.isInteger(n) || p < 0 || p > 1) { out.innerHTML = errorBox('Enter a valid n ≥ 0 and p between 0 and 1.'); return; }
          const mean = n * p, variance = n * p * (1 - p);
          out.innerHTML =
            resultCell('Mean (μ)', round(mean, 6)) +
            resultCell('Variance (σ²)', round(variance, 6)) +
            resultCell('SD (σ)', round(Math.sqrt(variance), 6));
        }
      },
      {
        id: 'poissonMeanVariance',
        label: 'Poisson Distribution — Mean, Variance & SD',
        render: () => `
          ${field('pmvLambda', 'λ (average rate)', 'e.g. 4', 'number')}
        `,
        calc: (out) => {
          const lambda = num('pmvLambda');
          if (lambda === null || lambda < 0) { out.innerHTML = errorBox('Enter a valid λ ≥ 0.'); return; }
          out.innerHTML =
            resultCell('Mean (μ)', round(lambda, 6)) +
            resultCell('Variance (σ²)', round(lambda, 6)) +
            resultCell('SD (σ)', round(Math.sqrt(lambda), 6));
        }
      },
      {
        id: 'geometricMeanVariance',
        label: 'Geometric Distribution — Mean & Variance',
        render: () => `
          ${field('gmvP', 'p (success probability)', 'e.g. 0.2', 'number')}
        `,
        calc: (out) => {
          const p = num('gmvP');
          if (p === null || p <= 0 || p > 1) { out.innerHTML = errorBox('Enter a valid p between 0 (exclusive) and 1.'); return; }
          const mean = 1 / p, variance = (1 - p) / (p * p);
          out.innerHTML =
            resultCell('Mean (μ)', round(mean, 6)) +
            resultCell('Variance (σ²)', round(variance, 6)) +
            resultCell('SD (σ)', round(Math.sqrt(variance), 6));
        }
      },
      {
        id: 'circularPermutations',
        label: 'Circular Permutations',
        render: () => `
          <p class="tool-hint">Ways to arrange n distinct objects around a circle.</p>
          ${field('cpN', 'n (distinct objects)', '', 'number')}
        `,
        calc: (out) => {
          const n = num('cpN');
          if (n === null || n < 1 || !Number.isInteger(n)) { out.innerHTML = errorBox('Enter a valid integer n ≥ 1.'); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const arrangements = fact(n - 1);
          out.innerHTML =
            resultCell('Circular Arrangements', arrangements) +
            resultCell('If Reflections Also Match', n > 2 ? arrangements / 2 : arrangements);
        }
      },
      {
        id: 'permutationsWithRepetition',
        label: 'Permutations with Repetition (nʳ)',
        render: () => `
          <p class="tool-hint">Ways to arrange r selections from n items when repetition is allowed: n^r.</p>
          ${field('pwrN', 'n (types available)', '', 'number')}
          ${field('pwrR', 'r (selections made)', '', 'number')}
        `,
        calc: (out) => {
          const n = num('pwrN'), r = num('pwrR');
          if (n === null || r === null || n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          out.innerHTML = resultCell('n^r', Math.pow(n, r));
        }
      },
      {
        id: 'multisetPermutations',
        label: 'Permutations of a Multiset',
        render: () => `
          <p class="tool-hint">Distinguishable arrangements when items repeat: n! / (n₁!·n₂!·...). Enter total items and each group's repeat count.</p>
          ${field('mpN', 'Total items (n)', '', 'number')}
          ${field('mpCounts', 'Repeat counts (comma-separated)', 'e.g. 2,3,1', 'text')}
        `,
        calc: (out) => {
          const n = num('mpN'), countsStr = str('mpCounts');
          const counts = countsStr.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
          if (n === null || n < 1 || !Number.isInteger(n) || counts.length === 0 || counts.some(c => c < 1 || !Number.isInteger(c))) { out.innerHTML = errorBox('Enter a valid n and positive integer repeat counts.'); return; }
          const sumCounts = counts.reduce((a, b) => a + b, 0);
          if (sumCounts !== n) { out.innerHTML = errorBox('Repeat counts must add up to n (currently sum to ' + sumCounts + ').'); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          let denom = 1;
          for (const c of counts) denom *= fact(c);
          out.innerHTML = resultCell('Distinguishable Arrangements', fact(n) / denom);
        }
      },
      {
        id: 'combinationsWithRepetition',
        label: 'Combinations with Repetition (Stars and Bars)',
        render: () => `
          <p class="tool-hint">Ways to choose r items from n types when repetition is allowed: C(n + r − 1, r).</p>
          ${field('cwrN', 'n (types available)', '', 'number')}
          ${field('cwrR', 'r (items chosen)', '', 'number')}
        `,
        calc: (out) => {
          const n = num('cwrN'), r = num('cwrR');
          if (n === null || r === null || n < 1 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) { out.innerHTML = errorBox('Enter a valid n ≥ 1 and integer r ≥ 0.'); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const a = n + r - 1;
          out.innerHTML = resultCell('C(n+r−1, r)', fact(a) / (fact(r) * fact(a - r)));
        }
      },
      {
        id: 'diceSumProbability',
        label: 'Dice Sum Probability (Two Dice)',
        render: () => `
          <p class="tool-hint">Probability of rolling a given sum with two standard six-sided dice.</p>
          ${field('dsSum', 'Target Sum (2–12)', '', 'number')}
        `,
        calc: (out) => {
          const sum = num('dsSum');
          if (sum === null || !Number.isInteger(sum) || sum < 2 || sum > 12) { out.innerHTML = errorBox('Enter a valid integer sum between 2 and 12.'); return; }
          const ways = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1][sum - 2];
          const prob = ways / 36;
          out.innerHTML =
            resultCell('Favorable Outcomes', ways) +
            resultCell('P(Sum = k)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'cardDrawProbability',
        label: 'Card Draw Probability (Standard Deck)',
        render: () => `
          <p class="tool-hint">Probability that a single card drawn from the deck matches a category (e.g. 4 for Aces, 13 for Hearts).</p>
          ${field('cdK', 'Matching Cards in Deck', 'e.g. 4', 'number')}
          ${field('cdN', 'Deck Size', '52', 'number')}
        `,
        calc: (out) => {
          const k = num('cdK'), n = num('cdN');
          if (k === null || n === null || n <= 0 || k < 0 || k > n) { out.innerHTML = errorBox('Enter a valid deck size and matching-card count (0 ≤ K ≤ N).'); return; }
          const prob = k / n;
          out.innerHTML =
            resultCell('P(Match)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'discreteUniformProbability',
        label: 'Discrete Uniform Distribution',
        render: () => `
          <p class="tool-hint">For integers a to b, each equally likely: P(X = k) = 1 / (b − a + 1).</p>
          ${field('duA', 'a (lowest value)', '', 'number')}
          ${field('duB', 'b (highest value)', '', 'number')}
        `,
        calc: (out) => {
          const a = num('duA'), b = num('duB');
          if (a === null || b === null || !Number.isInteger(a) || !Number.isInteger(b) || b < a) { out.innerHTML = errorBox('Enter valid integers with b ≥ a.'); return; }
          const nVals = b - a + 1;
          const prob = 1 / nVals;
          const mean = (a + b) / 2;
          const variance = (nVals * nVals - 1) / 12;
          out.innerHTML =
            resultCell('P(X = k), any k', round(prob, 6)) +
            resultCell('Mean (μ)', round(mean, 6)) +
            resultCell('Variance (σ²)', round(variance, 6)) +
            resultCell('SD (σ)', round(Math.sqrt(variance), 6));
        }
      },
      {
        id: 'bernoulliDistribution',
        label: 'Bernoulli Distribution — Mean & Variance',
        render: () => `
          <p class="tool-hint">A single trial with success probability p: P(X=1) = p, P(X=0) = 1 − p.</p>
          ${field('bdP', 'p (success probability)', 'e.g. 0.5', 'number')}
        `,
        calc: (out) => {
          const p = num('bdP');
          if (p === null || p < 0 || p > 1) { out.innerHTML = errorBox('Enter a valid probability between 0 and 1.'); return; }
          out.innerHTML =
            resultCell('P(X = 1)', round(p, 6)) +
            resultCell('P(X = 0)', round(1 - p, 6)) +
            resultCell('Mean (μ)', round(p, 6)) +
            resultCell('Variance (σ²)', round(p * (1 - p), 6));
        }
      },
      {
        id: 'poissonCumulative',
        label: 'Poisson Cumulative Probability P(X ≤ k)',
        render: () => `
          <p class="tool-hint">P(X ≤ k) for a Poisson distribution with mean rate λ.</p>
          ${field('pcLambda', 'λ (average rate)', 'e.g. 4', 'number')}
          ${field('pcK', 'k (at most this many occurrences)', '', 'number')}
        `,
        calc: (out) => {
          const lambda = num('pcLambda'), k = num('pcK');
          if (lambda === null || k === null || lambda < 0 || k < 0 || !Number.isInteger(k)) { out.innerHTML = errorBox('Enter a valid λ ≥ 0 and integer k ≥ 0.'); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          let cdf = 0;
          for (let i = 0; i <= k; i++) cdf += Math.exp(-lambda) * Math.pow(lambda, i) / fact(i);
          out.innerHTML =
            resultCell('P(X ≤ k)', round(cdf, 6)) +
            resultCell('P(X > k)', round(1 - cdf, 6)) +
            resultCell('As Percent', round(cdf * 100, 4) + '%');
        }
      },
      {
        id: 'geometricCumulative',
        label: 'Geometric Cumulative Probability P(X ≤ k)',
        render: () => `
          <p class="tool-hint">Probability the first success happens on or before trial k: P(X ≤ k) = 1 − (1−p)^k.</p>
          ${field('gcP', 'p (success probability)', 'e.g. 0.2', 'number')}
          ${field('gcK', 'k (trial number)', '', 'number')}
        `,
        calc: (out) => {
          const p = num('gcP'), k = num('gcK');
          if (p === null || k === null || p <= 0 || p > 1 || k < 1 || !Number.isInteger(k)) { out.innerHTML = errorBox('Enter a valid p (0 < p ≤ 1) and integer k ≥ 1.'); return; }
          const cdf = 1 - Math.pow(1 - p, k);
          out.innerHTML =
            resultCell('P(X ≤ k)', round(cdf, 6)) +
            resultCell('P(X > k)', round(1 - cdf, 6));
        }
      },
      {
        id: 'lawOfTotalProbability',
        label: 'Law of Total Probability (Three-Branch Partition)',
        render: () => `
          <p class="tool-hint">For a partition A₁, A₂, A₃ of the sample space: P(B) = ΣP(Aᵢ)·P(B|Aᵢ). Leave the third branch as 0 to use only two.</p>
          ${field('ltpA1', 'P(A₁)', '', 'number')}
          ${field('ltpB1', 'P(B|A₁)', '', 'number')}
          ${field('ltpA2', 'P(A₂)', '', 'number')}
          ${field('ltpB2', 'P(B|A₂)', '', 'number')}
          ${field('ltpA3', 'P(A₃)', '0 if unused', 'number')}
          ${field('ltpB3', 'P(B|A₃)', '0 if unused', 'number')}
        `,
        calc: (out) => {
          const a1 = num('ltpA1'), b1 = num('ltpB1'), a2 = num('ltpA2'), b2 = num('ltpB2'), a3 = num('ltpA3'), b3 = num('ltpB3');
          const vals = [a1, b1, a2, b2, a3, b3];
          if (vals.some(v => v === null || v < 0 || v > 1)) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1 (use 0 for an unused branch).'); return; }
          const partitionSum = a1 + a2 + a3;
          if (Math.abs(partitionSum - 1) > 0.01) { out.innerHTML = errorBox('P(A₁) + P(A₂) + P(A₃) must sum to 1 (currently ' + round(partitionSum, 4) + ').'); return; }
          const pB = a1 * b1 + a2 * b2 + a3 * b3;
          out.innerHTML =
            resultCell('P(B)', round(pB, 6)) +
            resultCell('As Percent', round(pB * 100, 4) + '%');
        }
      },
      {
        id: 'atLeastOneSuccess',
        label: 'Probability of At Least One Success',
        render: () => `
          <p class="tool-hint">For n independent trials each with success probability p: P(at least one success) = 1 − (1−p)^n.</p>
          ${field('alosP', 'p (success probability)', 'e.g. 0.1', 'number')}
          ${field('alosN', 'n (number of trials)', '', 'number')}
        `,
        calc: (out) => {
          const p = num('alosP'), n = num('alosN');
          if (p === null || n === null || p < 0 || p > 1 || n < 0 || !Number.isInteger(n)) { out.innerHTML = errorBox('Enter a valid p between 0 and 1 and integer n ≥ 0.'); return; }
          const prob = 1 - Math.pow(1 - p, n);
          out.innerHTML =
            resultCell('P(At Least One Success)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'sampleSpaceSize',
        label: 'Sample Space Size',
        render: () => `
          <p class="tool-hint">Total number of ways to choose r items from n items, depending on whether order matters and repetition is allowed.</p>
          ${field('sssN', 'n (items available)', '', 'number')}
          ${field('sssR', 'r (items chosen)', '', 'number')}
          ${selectField('sssMode', 'Mode', [
            { value: 'orderedRep', label: 'Ordered, With Repetition (n^r)' },
            { value: 'orderedNoRep', label: 'Ordered, Without Repetition (nPr)' },
            { value: 'unorderedNoRep', label: 'Unordered, Without Repetition (nCr)' },
            { value: 'unorderedRep', label: 'Unordered, With Repetition (C(n+r-1,r))' }
          ])}
        `,
        calc: (out) => {
          const n = num('sssN'), r = num('sssR'), mode = str('sssMode');
          if (n === null || r === null || n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) { out.innerHTML = errorBox(t('tool_err_2fields')); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          let result;
          if (mode === 'orderedRep') {
            result = Math.pow(n, r);
          } else if (mode === 'orderedNoRep') {
            if (r > n) { out.innerHTML = errorBox('r cannot exceed n without repetition.'); return; }
            result = fact(n) / fact(n - r);
          } else if (mode === 'unorderedNoRep') {
            if (r > n) { out.innerHTML = errorBox('r cannot exceed n without repetition.'); return; }
            result = fact(n) / (fact(r) * fact(n - r));
          } else {
            if (n < 1) { out.innerHTML = errorBox('n must be at least 1 for this mode.'); return; }
            const a = n + r - 1;
            result = fact(a) / (fact(r) * fact(a - r));
          }
          out.innerHTML = resultCell('Sample Space Size', result);
        }
      },
      {
        id: 'unionOfThreeEvents',
        label: 'Union of Three Events P(A∪B∪C)',
        render: () => `
          <p class="tool-hint">P(A∪B∪C) = P(A)+P(B)+P(C) − P(A∩B) − P(A∩C) − P(B∩C) + P(A∩B∩C).</p>
          ${field('u3A', 'P(A)', '', 'number')}
          ${field('u3B', 'P(B)', '', 'number')}
          ${field('u3C', 'P(C)', '', 'number')}
          ${field('u3AB', 'P(A ∩ B)', '', 'number')}
          ${field('u3AC', 'P(A ∩ C)', '', 'number')}
          ${field('u3BC', 'P(B ∩ C)', '', 'number')}
          ${field('u3ABC', 'P(A ∩ B ∩ C)', '', 'number')}
        `,
        calc: (out) => {
          const a = num('u3A'), b = num('u3B'), c = num('u3C'), ab = num('u3AB'), ac = num('u3AC'), bc = num('u3BC'), abc = num('u3ABC');
          const vals = [a, b, c, ab, ac, bc, abc];
          if (vals.some(v => v === null || v < 0 || v > 1)) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1 for every field.'); return; }
          const union = a + b + c - ab - ac - bc + abc;
          if (union < 0 || union > 1) { out.innerHTML = errorBox('These values give an impossible result (outside 0–1) — check your inputs.'); return; }
          out.innerHTML =
            resultCell('P(A∪B∪C)', round(union, 6)) +
            resultCell('As Percent', round(union * 100, 4) + '%');
        }
      },
      {
        id: 'normalBetween',
        label: 'Normal Distribution — Probability Between Two Values',
        render: () => `
          <p class="tool-hint">P(a < X < b) for a normal distribution with the given mean and standard deviation.</p>
          ${field('nbtA', 'a (lower value)', '', 'number')}
          ${field('nbtB', 'b (upper value)', '', 'number')}
          ${field('nbtMean', 'Mean (μ)', '', 'number')}
          ${field('nbtStd', 'Std Dev (σ)', '', 'number')}
        `,
        calc: (out) => {
          const a = num('nbtA'), b = num('nbtB'), mean = num('nbtMean'), std = num('nbtStd');
          if (a === null || b === null || mean === null || std === null || std <= 0 || b <= a) { out.innerHTML = errorBox('Enter valid values with b > a and σ > 0.'); return; }
          function erf(v) {
            const sign = v < 0 ? -1 : 1; v = Math.abs(v);
            const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
            const t2 = 1 / (1 + p * v);
            const y = 1 - (((((a5*t2+a4)*t2)+a3)*t2+a2)*t2+a1)*t2*Math.exp(-v*v);
            return sign * y;
          }
          function cdf(x) { const z = (x - mean) / std; return 0.5 * (1 + erf(z / Math.sqrt(2))); }
          const prob = cdf(b) - cdf(a);
          out.innerHTML =
            resultCell('P(a < X < b)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'zToPercentile',
        label: 'Z-score to Percentile Rank',
        render: () => `
          <p class="tool-hint">Converts a standard normal z-score into a percentile rank.</p>
          ${field('ztpZ', 'z-score', 'e.g. 1.28', 'number')}
        `,
        calc: (out) => {
          const z = num('ztpZ');
          if (z === null) { out.innerHTML = errorBox('Enter a valid z-score.'); return; }
          function erf(v) {
            const sign = v < 0 ? -1 : 1; v = Math.abs(v);
            const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
            const t2 = 1 / (1 + p * v);
            const y = 1 - (((((a5*t2+a4)*t2)+a3)*t2+a2)*t2+a1)*t2*Math.exp(-v*v);
            return sign * y;
          }
          const cdf = 0.5 * (1 + erf(z / Math.sqrt(2)));
          out.innerHTML =
            resultCell('Percentile Rank', round(cdf * 100, 4) + '%') +
            resultCell('P(X ≤ z)', round(cdf, 6));
        }
      },
      {
        id: 'intersectionFromUnion',
        label: 'Intersection from Union P(A∩B)',
        render: () => `
          <p class="tool-hint">P(A∩B) = P(A) + P(B) − P(A∪B).</p>
          ${field('ifuA', 'P(A)', '', 'number')}
          ${field('ifuB', 'P(B)', '', 'number')}
          ${field('ifuUnion', 'P(A∪B)', '', 'number')}
        `,
        calc: (out) => {
          const pA = num('ifuA'), pB = num('ifuB'), pUnion = num('ifuUnion');
          if (pA === null || pB === null || pUnion === null || pA < 0 || pA > 1 || pB < 0 || pB > 1 || pUnion < 0 || pUnion > 1) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1.'); return; }
          const result = pA + pB - pUnion;
          if (result < 0 || result > Math.min(pA, pB) + 1e-9) { out.innerHTML = errorBox('These values give an impossible result — check your inputs.'); return; }
          out.innerHTML =
            resultCell('P(A∩B)', round(result, 6)) +
            resultCell('As Percent', round(result * 100, 4) + '%');
        }
      },
      {
        id: 'exactlyOneOfTwoEvents',
        label: 'Probability of Exactly One of Two Events',
        render: () => `
          <p class="tool-hint">P(exactly one of A, B) = P(A) + P(B) − 2·P(A∩B).</p>
          ${field('eooA', 'P(A)', '', 'number')}
          ${field('eooB', 'P(B)', '', 'number')}
          ${field('eooAB', 'P(A ∩ B)', '', 'number')}
        `,
        calc: (out) => {
          const pA = num('eooA'), pB = num('eooB'), pAB = num('eooAB');
          if (pA === null || pB === null || pAB === null || pA < 0 || pA > 1 || pB < 0 || pB > 1 || pAB < 0 || pAB > Math.min(pA, pB)) { out.innerHTML = errorBox('Enter valid probabilities with 0 ≤ P(A∩B) ≤ min(P(A), P(B)).'); return; }
          const result = pA + pB - 2 * pAB;
          out.innerHTML =
            resultCell('P(Exactly One)', round(result, 6)) +
            resultCell('As Percent', round(result * 100, 4) + '%');
        }
      },
      {
        id: 'neitherEventProbability',
        label: 'Probability of Neither Event',
        render: () => `
          <p class="tool-hint">P(neither A nor B) = 1 − P(A) − P(B) + P(A∩B).</p>
          ${field('neA', 'P(A)', '', 'number')}
          ${field('neB', 'P(B)', '', 'number')}
          ${field('neAB', 'P(A ∩ B)', '0 if mutually exclusive', 'number')}
        `,
        calc: (out) => {
          const pA = num('neA'), pB = num('neB'), pAB = num('neAB');
          if (pA === null || pB === null || pAB === null || pA < 0 || pA > 1 || pB < 0 || pB > 1 || pAB < 0) { out.innerHTML = errorBox('Enter valid probabilities between 0 and 1.'); return; }
          const pUnion = pA + pB - pAB;
          if (pUnion > 1 || pUnion < 0) { out.innerHTML = errorBox('These values give an impossible result — check your inputs.'); return; }
          const result = 1 - pUnion;
          out.innerHTML =
            resultCell('P(Neither)', round(result, 6)) +
            resultCell('As Percent', round(result * 100, 4) + '%');
        }
      },
      {
        id: 'conditionalComplement',
        label: "Conditional Probability Complement P(A'|B)",
        render: () => `
          <p class="tool-hint">P(A'|B) = 1 − P(A|B).</p>
          ${field('ccpAB', 'P(A|B)', '', 'number')}
        `,
        calc: (out) => {
          const p = num('ccpAB');
          if (p === null || p < 0 || p > 1) { out.innerHTML = errorBox('Enter a valid probability between 0 and 1.'); return; }
          out.innerHTML =
            resultCell("P(A'|B)", round(1 - p, 6)) +
            resultCell('As Percent', round((1 - p) * 100, 4) + '%');
        }
      },
      {
        id: 'birthdayProblem',
        label: 'Birthday Problem — Shared Birthday Probability',
        render: () => `
          <p class="tool-hint">Probability that at least two people in a group share a birthday (365 equally likely days, no leap years).</p>
          ${field('bpN', 'Number of People', '', 'number')}
        `,
        calc: (out) => {
          const n = num('bpN');
          if (n === null || n < 0 || !Number.isInteger(n)) { out.innerHTML = errorBox('Enter a valid integer number of people ≥ 0.'); return; }
          if (n > 365) { out.innerHTML = resultCell('P(Shared Birthday)', '1 (certain — more people than days)'); return; }
          let noMatch = 1;
          for (let i = 0; i < n; i++) noMatch *= (365 - i) / 365;
          const prob = 1 - noMatch;
          out.innerHTML =
            resultCell('P(Shared Birthday)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%') +
            resultCell('P(All Different)', round(noMatch, 6));
        }
      },
      {
        id: 'couponCollector',
        label: "Coupon Collector's Problem",
        render: () => `
          <p class="tool-hint">Expected number of random draws (with replacement) needed to collect all n distinct coupon types: E[T] = n·(1 + 1/2 + ... + 1/n).</p>
          ${field('ccN', 'n (distinct coupon types)', '', 'number')}
        `,
        calc: (out) => {
          const n = num('ccN');
          if (n === null || n < 1 || !Number.isInteger(n)) { out.innerHTML = errorBox('Enter a valid integer n ≥ 1.'); return; }
          let harmonic = 0;
          for (let i = 1; i <= n; i++) harmonic += 1 / i;
          const expected = n * harmonic;
          out.innerHTML =
            resultCell('Expected Draws', round(expected, 4)) +
            resultCell('Harmonic Sum (Hₙ)', round(harmonic, 6));
        }
      },
      {
        id: 'hypergeometricMeanVariance',
        label: 'Hypergeometric Distribution — Mean, Variance & SD',
        render: () => `
          ${field('hmvN', 'N (population size)', '', 'number')}
          ${field('hmvK', 'K (successes in population)', '', 'number')}
          ${field('hmvn', 'n (sample size)', '', 'number')}
        `,
        calc: (out) => {
          const N = num('hmvN'), K = num('hmvK'), n = num('hmvn');
          if (N === null || K === null || n === null || !Number.isInteger(N) || !Number.isInteger(K) || !Number.isInteger(n) || N < 2 || K < 0 || K > N || n < 0 || n > N) { out.innerHTML = errorBox('Enter valid integers with N ≥ 2, 0 ≤ K ≤ N, and 0 ≤ n ≤ N.'); return; }
          const mean = n * (K / N);
          const variance = n * (K / N) * (1 - K / N) * ((N - n) / (N - 1));
          out.innerHTML =
            resultCell('Mean (μ)', round(mean, 6)) +
            resultCell('Variance (σ²)', round(variance, 6)) +
            resultCell('SD (σ)', round(Math.sqrt(variance), 6));
        }
      },
      {
        id: 'multinomialProbability',
        label: 'Multinomial Probability (Three Categories)',
        render: () => `
          <p class="tool-hint">P = n! / (n₁!n₂!n₃!) · p₁^n₁·p₂^n₂·p₃^n₃, where n = n₁+n₂+n₃.</p>
          ${field('mnN1', 'n₁ (count in category 1)', '', 'number')}
          ${field('mnN2', 'n₂ (count in category 2)', '', 'number')}
          ${field('mnN3', 'n₃ (count in category 3)', '', 'number')}
          ${field('mnP1', 'p₁ (probability of category 1)', '', 'number')}
          ${field('mnP2', 'p₂ (probability of category 2)', '', 'number')}
          ${field('mnP3', 'p₃ (probability of category 3)', '', 'number')}
        `,
        calc: (out) => {
          const n1 = num('mnN1'), n2 = num('mnN2'), n3 = num('mnN3'), p1 = num('mnP1'), p2 = num('mnP2'), p3 = num('mnP3');
          const counts = [n1, n2, n3];
          const probs = [p1, p2, p3];
          if (counts.some(v => v === null || v < 0 || !Number.isInteger(v)) || probs.some(v => v === null || v < 0 || v > 1)) { out.innerHTML = errorBox('Enter valid non-negative integer counts and probabilities between 0 and 1.'); return; }
          const probSum = p1 + p2 + p3;
          if (Math.abs(probSum - 1) > 0.01) { out.innerHTML = errorBox('p₁ + p₂ + p₃ must sum to 1 (currently ' + round(probSum, 4) + ').'); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const n = n1 + n2 + n3;
          const coeff = fact(n) / (fact(n1) * fact(n2) * fact(n3));
          const prob = coeff * Math.pow(p1, n1) * Math.pow(p2, n2) * Math.pow(p3, n3);
          out.innerHTML =
            resultCell('Multinomial Coefficient', coeff) +
            resultCell('P(Outcome)', round(prob, 6)) +
            resultCell('As Percent', round(prob * 100, 4) + '%');
        }
      },
      {
        id: 'standardErrorProportion',
        label: 'Standard Error of a Sample Proportion',
        render: () => `
          <p class="tool-hint">SE = √(p(1−p) / n), used when estimating a population proportion from a sample.</p>
          ${field('sepP', 'p (sample proportion)', 'e.g. 0.4', 'number')}
          ${field('sepN', 'n (sample size)', '', 'number')}
        `,
        calc: (out) => {
          const p = num('sepP'), n = num('sepN');
          if (p === null || n === null || p < 0 || p > 1 || n < 1 || !Number.isInteger(n)) { out.innerHTML = errorBox('Enter a valid p between 0 and 1 and integer n ≥ 1.'); return; }
          const se = Math.sqrt((p * (1 - p)) / n);
          out.innerHTML = resultCell('Standard Error', round(se, 6));
        }
      },
      {
        id: 'poissonApproxBinomial',
        label: 'Poisson Approximation to Binomial',
        render: () => `
          <p class="tool-hint">For large n and small p, Binomial(n, p) ≈ Poisson(λ = n·p). Compares the exact binomial P(X = k) with the Poisson approximation.</p>
          ${field('pabN', 'n (trials)', '', 'number')}
          ${field('pabP', 'p (success probability)', 'e.g. 0.01', 'number')}
          ${field('pabK', 'k (successes)', '', 'number')}
        `,
        calc: (out) => {
          const n = num('pabN'), p = num('pabP'), k = num('pabK');
          if (n === null || p === null || k === null || n < 0 || !Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n || p < 0 || p > 1) { out.innerHTML = errorBox('Enter a valid n, p (0–1), and integer k (0 ≤ k ≤ n).'); return; }
          function fact(x) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; }
          const nCk = fact(n) / (fact(k) * fact(n - k));
          const exact = nCk * Math.pow(p, k) * Math.pow(1 - p, n - k);
          const lambda = n * p;
          const approx = Math.exp(-lambda) * Math.pow(lambda, k) / fact(k);
          out.innerHTML =
            resultCell('Exact Binomial P(X = k)', round(exact, 6)) +
            resultCell('Poisson Approximation', round(approx, 6)) +
            resultCell('λ = np', round(lambda, 6)) +
            resultCell('Difference', round(Math.abs(exact - approx), 6));
        }
      }
    ]
  };

  window.CalvoSubjectTools = { TOOLS, molarMassOf, balanceEquation, parseFormula, ATOMIC_WEIGHTS };
})();
