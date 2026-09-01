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
      }
    ]
  };

  window.CalvoSubjectTools = { TOOLS, molarMassOf, balanceEquation, parseFormula, ATOMIC_WEIGHTS };
})();
