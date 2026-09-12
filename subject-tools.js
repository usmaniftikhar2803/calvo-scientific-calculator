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
    // Fields marked 'number' still get the mobile decimal keypad as the
    // default (inputmode="decimal"), but the actual input stays type="text"
    // so it's never locked to digits only — users can still type a minus
    // sign, scientific notation ('e'), or letters (e.g. pasting a value)
    // instead of being stuck with a numbers-only keyboard.
    const htmlType = type === 'number' ? 'text' : type;
    const inputmode = type === 'number' ? ' inputmode="decimal"' : '';
    return `<div class="tool-field">
      <label for="${id}">${t(labelKey)}</label>
      <input type="${htmlType}"${inputmode} id="${id}" class="formula-search convert-input tool-input" placeholder="${placeholder || ''}" style="padding-left:14px;background-image:none;">
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
      }
    ]
  };

  window.CalvoSubjectTools = { TOOLS, molarMassOf, balanceEquation, parseFormula, ATOMIC_WEIGHTS };
})();
