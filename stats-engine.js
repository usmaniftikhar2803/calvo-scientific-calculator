/* ============================================================
   CALVO — Statistics engine (no dependencies)
   Distributions: Normal, Student t, Chi-square, F
   Tests: z, t (1-sample, 2-sample Welch/pooled, paired), chi-square
          (goodness of fit, independence), one-way ANOVA
   Also: correlation (Pearson, Spearman) and linear regression
   Exposed as window.CalvoStats
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------- special functions ---------- */
  function lgamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5, s = 1.000000000190015, j;
    t -= (x + 0.5) * Math.log(t);
    for (j = 0; j < 6; j++) { y += 1; s += c[j] / y; }
    return -t + Math.log(2.5066282746310005 * s / x);
  }

  /* regularized lower incomplete gamma P(a,x) */
  function gammaP(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) {
      var ap = a, sum = 1 / a, del = sum, n;
      for (n = 0; n < 500; n++) {
        ap += 1; del *= x / ap; sum += del;
        if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
    }
    return 1 - gammaQcf(a, x);
  }
  function gammaQcf(a, x) {
    var tiny = 1e-300, b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d, i, an, del;
    for (i = 1; i < 500; i++) {
      an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
      c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d; del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  function gammaQ(a, x) {
    if (x <= 0) return 1;
    if (x < a + 1) return 1 - gammaP(a, x);
    return gammaQcf(a, x);
  }

  /* regularized incomplete beta I_x(a,b) */
  function betacf(a, b, x) {
    var tiny = 1e-300, qab = a + b, qap = a + 1, qam = a - 1, c = 1,
      d = 1 - qab * x / qap, m, m2, aa, del, h;
    if (Math.abs(d) < tiny) d = tiny;
    d = 1 / d; h = d;
    for (m = 1; m <= 500; m++) {
      m2 = 2 * m;
      aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
      c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
      c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d; del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }
  function betaI(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }

  /* ---------- distributions ---------- */
  function erfc(x) {
    /* high-precision via incomplete gamma: erfc(x)=Q(1/2,x^2) for x>=0 */
    if (x >= 0) return gammaQ(0.5, x * x);
    return 1 + gammaP(0.5, x * x);
  }
  function normCdf(z) { return 0.5 * erfc(-z / Math.SQRT2); }
  function normSf(z) { return 0.5 * erfc(z / Math.SQRT2); }

  function tCdf(t, df) {
    var x = df / (df + t * t), p = 0.5 * betaI(x, df / 2, 0.5);
    return t > 0 ? 1 - p : p;
  }
  function tSf(t, df) { return tCdf(-t, df); }
  function chiCdf(x, df) { return x <= 0 ? 0 : gammaP(df / 2, x / 2); }
  function chiSf(x, df) { return x <= 0 ? 1 : gammaQ(df / 2, x / 2); }
  function fCdf(x, d1, d2) { return x <= 0 ? 0 : betaI(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2); }
  function fSf(x, d1, d2) { return x <= 0 ? 1 : betaI(d2 / (d2 + d1 * x), d2 / 2, d1 / 2); }

  /* inverse by bisection on a monotone cdf */
  function invert(cdf, p, lo, hi) {
    var i, mid;
    for (i = 0; i < 200; i++) {
      mid = (lo + hi) / 2;
      if (cdf(mid) < p) lo = mid; else hi = mid;
      if (hi - lo < 1e-12 * Math.max(1, Math.abs(mid))) break;
    }
    return (lo + hi) / 2;
  }
  function normInv(p) { return invert(normCdf, p, -40, 40); }
  function tInv(p, df) { return invert(function (x) { return tCdf(x, df); }, p, -1e4, 1e4); }
  function chiInv(p, df) { return invert(function (x) { return chiCdf(x, df); }, p, 0, 1e4 + 10 * df); }
  function fInv(p, d1, d2) { return invert(function (x) { return fCdf(x, d1, d2); }, p, 0, 1e6); }

  /* ---------- descriptive helpers ---------- */
  function sum(a) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i]; return s; }
  function mean(a) { return sum(a) / a.length; }
  function variance(a) {
    var m = mean(a), s = 0, i;
    for (i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return s / (a.length - 1);
  }
  function sd(a) { return Math.sqrt(variance(a)); }

  /* parse "1, 2 3\n4" -> [1,2,3,4]; returns {data, bad} */
  function parseList(str) {
    var parts = String(str).split(/[\s,;]+/).filter(function (s) { return s !== ''; }),
      out = [], bad = [], i, v;
    for (i = 0; i < parts.length; i++) {
      v = Number(parts[i]);
      if (isFinite(v)) out.push(v); else bad.push(parts[i]);
    }
    return { data: out, bad: bad };
  }

  /* ---------- hypothesis tests ---------- */
  /* alt: 'two' | 'greater' | 'less' */
  function pFromStat(stat, alt, cdf, sf) {
    if (alt === 'greater') return sf(stat);
    if (alt === 'less') return cdf(stat);
    return Math.min(1, 2 * Math.min(cdf(stat), sf(stat)));
  }

  function zTestFromStats(xbar, mu0, sigma, n, alt) {
    var se = sigma / Math.sqrt(n), z = (xbar - mu0) / se;
    return {
      test: 'z', stat: z, se: se, df: null,
      p: pFromStat(z, alt, normCdf, normSf), alt: alt
    };
  }

  function tOneSample(xbar, mu0, s, n, alt) {
    var se = s / Math.sqrt(n), t = (xbar - mu0) / se, df = n - 1;
    return {
      test: 't', stat: t, se: se, df: df,
      p: pFromStat(t, alt, function (x) { return tCdf(x, df); }, function (x) { return tSf(x, df); }), alt: alt
    };
  }

  function tTwoSample(m1, s1, n1, m2, s2, n2, alt, pooled) {
    var diff = m1 - m2, se, df, v1 = s1 * s1, v2 = s2 * s2, sp2;
    if (pooled) {
      df = n1 + n2 - 2;
      sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / df;
      se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    } else {
      se = Math.sqrt(v1 / n1 + v2 / n2);
      df = Math.pow(v1 / n1 + v2 / n2, 2) /
        (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
    }
    var t = diff / se;
    return {
      test: 't', stat: t, se: se, df: df, diff: diff,
      p: pFromStat(t, alt, function (x) { return tCdf(x, df); }, function (x) { return tSf(x, df); }), alt: alt
    };
  }

  function chiGoodnessOfFit(obs, exp) {
    var chi = 0, i;
    for (i = 0; i < obs.length; i++) chi += Math.pow(obs[i] - exp[i], 2) / exp[i];
    var df = obs.length - 1;
    return { test: 'chi', stat: chi, df: df, p: chiSf(chi, df) };
  }

  function chiIndependence(table) {
    var r = table.length, c = table[0].length, rows = [], cols = [], tot = 0, i, j;
    for (i = 0; i < r; i++) rows.push(sum(table[i]));
    for (j = 0; j < c; j++) { var cs = 0; for (i = 0; i < r; i++) cs += table[i][j]; cols.push(cs); }
    tot = sum(rows);
    var exp = [], chi = 0, minExp = Infinity;
    for (i = 0; i < r; i++) {
      exp.push([]);
      for (j = 0; j < c; j++) {
        var e = rows[i] * cols[j] / tot;
        exp[i].push(e);
        if (e < minExp) minExp = e;
        if (e > 0) chi += Math.pow(table[i][j] - e, 2) / e;
      }
    }
    var df = (r - 1) * (c - 1);
    var cramer = Math.sqrt(chi / (tot * Math.min(r - 1, c - 1)));
    return { test: 'chi', stat: chi, df: df, p: chiSf(chi, df), expected: exp, rows: rows, cols: cols, total: tot, minExpected: minExp, cramersV: cramer };
  }

  /* ---------- one-way ANOVA ---------- */
  function anovaOneWay(groups) {
    var k = groups.length, N = 0, all = [], i, j;
    for (i = 0; i < k; i++) { N += groups[i].length; all = all.concat(groups[i]); }
    var grand = mean(all), ssb = 0, ssw = 0, stats = [];
    for (i = 0; i < k; i++) {
      var g = groups[i], m = mean(g), v = g.length > 1 ? variance(g) : 0;
      ssb += g.length * (m - grand) * (m - grand);
      for (j = 0; j < g.length; j++) ssw += (g[j] - m) * (g[j] - m);
      stats.push({ n: g.length, mean: m, sd: Math.sqrt(v), sum: sum(g) });
    }
    var dfb = k - 1, dfw = N - k, msb = ssb / dfb, msw = ssw / dfw, F = msb / msw;
    var sst = ssb + ssw;
    return {
      k: k, N: N, grand: grand, groups: stats,
      ssb: ssb, ssw: ssw, sst: sst, dfb: dfb, dfw: dfw, dft: N - 1,
      msb: msb, msw: msw, F: F, p: fSf(F, dfb, dfw),
      etaSq: ssb / sst,
      omegaSq: Math.max(0, (ssb - dfb * msw) / (sst + msw))
    };
  }

  /* Tukey-style pairwise comparisons are heavy; offer Bonferroni-adjusted t tests */
  function pairwiseBonferroni(groups, anova) {
    var out = [], k = groups.length, m = k * (k - 1) / 2, i, j;
    for (i = 0; i < k; i++) {
      for (j = i + 1; j < k; j++) {
        var a = anova.groups[i], b = anova.groups[j];
        var diff = a.mean - b.mean, se = Math.sqrt(anova.msw * (1 / a.n + 1 / b.n)),
          t = diff / se, praw = 2 * tSf(Math.abs(t), anova.dfw);
        out.push({ i: i, j: j, diff: diff, t: t, p: praw, padj: Math.min(1, praw * m) });
      }
    }
    return out;
  }

  /* ---------- correlation & regression ---------- */
  function pearson(x, y) {
    var n = x.length, mx = mean(x), my = mean(y), sxy = 0, sxx = 0, syy = 0, i;
    for (i = 0; i < n; i++) {
      sxy += (x[i] - mx) * (y[i] - my);
      sxx += (x[i] - mx) * (x[i] - mx);
      syy += (y[i] - my) * (y[i] - my);
    }
    var r = sxy / Math.sqrt(sxx * syy), df = n - 2, t, p;
    if (Math.abs(r) >= 1) { t = Infinity; p = 0; }
    else { t = r * Math.sqrt(df / (1 - r * r)); p = 2 * tSf(Math.abs(t), df); }
    return { r: r, r2: r * r, n: n, df: df, t: t, p: p, sxy: sxy, sxx: sxx, syy: syy };
  }

  function ranks(a) {
    var idx = a.map(function (v, i) { return [v, i]; }).sort(function (p, q) { return p[0] - q[0]; }),
      r = new Array(a.length), i = 0, j, avg, k;
    while (i < idx.length) {
      j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      avg = (i + j) / 2 + 1;
      for (k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  }
  function spearman(x, y) {
    var res = pearson(ranks(x), ranks(y));
    return res;
  }

  function linearRegression(x, y) {
    var n = x.length, pr = pearson(x, y), mx = mean(x), my = mean(y),
      b = pr.sxy / pr.sxx, a = my - b * mx, sse = 0, i, fit = [], res = [];
    for (i = 0; i < n; i++) {
      var yh = a + b * x[i];
      fit.push(yh); res.push(y[i] - yh);
      sse += (y[i] - yh) * (y[i] - yh);
    }
    var df = n - 2, mse = df > 0 ? sse / df : NaN, se = Math.sqrt(mse),
      seB = se / Math.sqrt(pr.sxx), seA = se * Math.sqrt(1 / n + mx * mx / pr.sxx),
      tB = b / seB, tA = a / seA, ssr = pr.syy - sse, F = ssr / mse;
    return {
      n: n, slope: b, intercept: a, r: pr.r, r2: pr.r2,
      adjR2: 1 - (1 - pr.r2) * (n - 1) / df,
      sse: sse, ssr: ssr, sst: pr.syy, df: df, mse: mse, se: se,
      seSlope: seB, seInt: seA, tSlope: tB, tInt: tA,
      pSlope: 2 * tSf(Math.abs(tB), df), pInt: 2 * tSf(Math.abs(tA), df),
      F: F, pF: fSf(F, 1, df), mx: mx, my: my, sxx: pr.sxx,
      fitted: fit, residuals: res
    };
  }
  function predict(reg, x0) {
    var yh = reg.intercept + reg.slope * x0,
      t = tInv(0.975, reg.df),
      seMean = reg.se * Math.sqrt(1 / reg.n + Math.pow(x0 - reg.mx, 2) / reg.sxx),
      sePred = reg.se * Math.sqrt(1 + 1 / reg.n + Math.pow(x0 - reg.mx, 2) / reg.sxx);
    return { yhat: yh, ci: [yh - t * seMean, yh + t * seMean], pi: [yh - t * sePred, yh + t * sePred] };
  }

  /* confidence interval for r via Fisher z */
  function fisherCI(r, n, conf) {
    if (n < 4 || Math.abs(r) >= 1) return null;
    var z = 0.5 * Math.log((1 + r) / (1 - r)), se = 1 / Math.sqrt(n - 3),
      zc = normInv(1 - (1 - conf) / 2);
    return [Math.tanh(z - zc * se), Math.tanh(z + zc * se)];
  }

  /* ---------- formatting ---------- */
  function fmtP(p) {
    if (!isFinite(p)) return 'n/a';
    if (p < 0.0001) return '< 0.0001';
    return String(Math.round(p * 1e6) / 1e6);
  }
  function R(x, d) {
    if (!isFinite(x)) return String(x);
    d = d === undefined ? 4 : d;
    var p = Math.pow(10, d), v = Math.round(x * p) / p;
    return String(Object.is(v, -0) ? 0 : v);
  }

  root.CalvoStats = {
    lgamma: lgamma, gammaP: gammaP, gammaQ: gammaQ, betaI: betaI,
    normCdf: normCdf, normSf: normSf, normInv: normInv,
    tCdf: tCdf, tSf: tSf, tInv: tInv,
    chiCdf: chiCdf, chiSf: chiSf, chiInv: chiInv,
    fCdf: fCdf, fSf: fSf, fInv: fInv,
    mean: mean, variance: variance, sd: sd, sum: sum, parseList: parseList,
    zTestFromStats: zTestFromStats, tOneSample: tOneSample, tTwoSample: tTwoSample,
    chiGoodnessOfFit: chiGoodnessOfFit, chiIndependence: chiIndependence,
    anovaOneWay: anovaOneWay, pairwiseBonferroni: pairwiseBonferroni,
    pearson: pearson, spearman: spearman, ranks: ranks,
    linearRegression: linearRegression, predict: predict, fisherCI: fisherCI,
    fmtP: fmtP, R: R
  };
})(typeof window !== 'undefined' ? window : globalThis);
