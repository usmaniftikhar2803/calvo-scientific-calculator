/* Calvo home: extra premium behaviour (cosmetic only, never touches calculator logic).
   formula ticker, count-up numbers, tile tilt, cursor glow, scroll progress bar. */
(function () {
  'use strict';
  var home = document.getElementById('tab-home');
  if (!home) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- formula ticker ---------- */
  var hero = home.querySelector('.p-hero');
  if (hero && !home.querySelector('.h-ticker')) {
    var F = ['E = mc\u00B2', 'a\u00B2 + b\u00B2 = c\u00B2', 'x = (\u2212b \u00B1 \u221A(b\u00B2\u22124ac)) / 2a', 'F = ma', 'V = IR',
      'PV = nRT', 'sin\u00B2\u03B8 + cos\u00B2\u03B8 = 1', '\u222B x dx = x\u00B2/2', 'd/dx x\u207F = n\u00B7x\u207F\u207B\u00B9', 'A = \u03C0r\u00B2',
      's = ut + \u00BDat\u00B2', 'e^(i\u03C0) + 1 = 0', 'CGPA = \u03A3(GP\u00D7CH) / \u03A3CH', 'KE = \u00BDmv\u00B2', 'log(ab) = log a + log b'];
    var html = '';
    for (var r = 0; r < 2; r++) F.forEach(function (t) { html += '<span>' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>'; });
    var tk = document.createElement('div');
    tk.className = 'h-ticker';
    tk.setAttribute('aria-hidden', 'true');
    tk.innerHTML = '<div class="h-track">' + html + '</div>';
    hero.parentNode.insertBefore(tk, hero.nextSibling);
  }

  /* ---------- count-up for the trust numbers ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var nums = home.querySelectorAll('.p-proof b');
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, m = /^(\d+)(.*)$/.exec(el.textContent.trim());
        if (!m || +m[1] < 2) return;
        var to = +m[1], suf = m[2], t0 = 0, dur = 1300;
        el.style.minWidth = el.offsetWidth + 'px';
        (function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * e) + suf;
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- tile tilt toward the pointer (mouse only) ---------- */
  if (!reduce && fine) {
    var cur = null, raf = 0, last = null;
    function clear(t) { if (!t) return; t.classList.remove('h-tilting'); t.style.removeProperty('--rx'); t.style.removeProperty('--ry'); }
    home.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('.home-big');
      if (t !== cur) { clear(cur); cur = t; }
      if (!t) return;
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!cur || !last) return;
        var b = cur.getBoundingClientRect();
        var x = (last.clientX - b.left) / b.width - .5, y = (last.clientY - b.top) / b.height - .5;
        cur.classList.add('h-tilting');
        cur.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
        cur.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      });
    }, { passive: true });
    home.addEventListener('pointerleave', function () { clear(cur); cur = null; }, true);
  }

  /* ---------- cursor glow ---------- */
  if (!reduce && fine) {
    var g = document.createElement('div');
    g.className = 'h-cursor';
    g.setAttribute('aria-hidden', 'true');
    document.body.appendChild(g);
    var gx = 0, gy = 0, graf = 0;
    addEventListener('pointermove', function (e) {
      gx = e.clientX; gy = e.clientY;
      if (graf) return;
      graf = requestAnimationFrame(function () {
        graf = 0;
        g.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
        g.classList.toggle('on', home.classList.contains('active'));
      });
    }, { passive: true });
    document.addEventListener('mouseleave', function () { g.classList.remove('on'); });
  }

  /* ---------- scroll progress bar ---------- */
  if (!reduce) {
    var bar = document.createElement('div');
    bar.className = 'h-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var pr = 0;
    var upd = function () {
      pr = 0;
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 && home.classList.contains('active') ? Math.min(1, scrollY / h) : 0) + ')';
    };
    addEventListener('scroll', function () { if (!pr) pr = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd, { passive: true });
    upd();
  }
})();
