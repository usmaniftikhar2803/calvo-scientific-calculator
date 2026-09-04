/* ============================================
   CALVO — SUBJECT TOOLS
   15 subject-specific calculators covering
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
    const inputmode = type === 'number' ? ' inputmode="decimal"' : '';
    return `<div class="tool-field">
      <label for="${id}">${t(labelKey)}</label>
      <input type="${type}"${inputmode} id="${id}" class="formula-search convert-input tool-input" placeholder="${placeholder || ''}" style="padding-left:14px;background-image:none;">
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
      }
    ]
  };

  window.CalvoSubjectTools = { TOOLS, molarMassOf, balanceEquation, parseFormula, ATOMIC_WEIGHTS };
})();
