/* Calvo: real 3D (WebGL) hero for phones and desktops.
   - Loads vendor/calvo-3d.js only when the browser is idle (never blocks the calculator).
   - Runs only while the Home tab is open and the hero is on screen, so other tabs cost nothing.
   - Falls back silently to the existing CSS keys if WebGL is missing, the device is slow, or data saver is on. */
(function () {
  'use strict';
  var home = document.getElementById('tab-home');
  var hero = home && home.querySelector('.p-hero');
  if (!hero) return;

  var ua = navigator.userAgent || '';
  if (/bot|crawl|spider|lighthouse|pagespeed|headless/i.test(ua)) return;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var lite = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');

  /* ---------- 3D reveal for the tool grid (CSS only, runs once per block) ---------- */
  (function reveal() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var blocks = home.querySelectorAll('.home-primary, .p-foryou, .home-groups');
    if (!blocks.length) return;
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    blocks.forEach(function (b) { b.classList.add('c3d-reveal'); io.observe(b); });
    setTimeout(function () { blocks.forEach(function (b) { b.classList.add('in'); }); }, 4500); // safety net
  })();

  /* Low-end phones (<=3 GB RAM or <=4 CPU cores): skip WebGL, it makes scrolling choppy */
  var weak = (navigator.deviceMemory && navigator.deviceMemory <= 3) ||
             (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 && matchMedia('(pointer: coarse)').matches);
  if (weak) document.documentElement.classList.add('perf-lite');

  if (lite || weak) return;

  function hasGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  if (!hasGL()) return;

  var host, canvas, ctl, heroVisible = true, tabOpen = true, docVisible = true, scrolling = false, scrollT = 0;
  var coarse = matchMedia('(pointer: coarse)').matches;

  function sync() {
    if (!ctl) return;
    var go = heroVisible && tabOpen && docVisible && !scrolling;
    if (go) { host.classList.add('on'); if (!reduce) ctl.start(); else ctl.renderOnce(); }
    else ctl.stop();
  }

  function fail() {
    if (ctl) { try { ctl.dispose(); } catch (e) {} ctl = null; }
    if (host && host.parentNode) host.parentNode.removeChild(host);
    home.classList.remove('has-c3d');
  }

  function mount() {
    if (ctl || !window.Calvo3D) return;
    host = document.createElement('div');
    host.className = 'c3d';
    host.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas');
    host.appendChild(canvas);
    hero.insertBefore(host, hero.firstChild);
    home.classList.add('has-c3d');

    var phone = Math.min(screen.width, screen.height) < 700 || (matchMedia('(pointer: coarse)').matches && innerWidth < 900);
    ctl = window.Calvo3D.create(canvas, host, { phone: phone, onFail: fail, onSlow: fail });
    if (!ctl) { fail(); return; }

    tabOpen = home.classList.contains('active');
    new MutationObserver(function () {
      var open = home.classList.contains('active');
      if (open !== tabOpen) { tabOpen = open; if (open && ctl) ctl.resize(); sync(); }
    }).observe(home, { attributes: true, attributeFilter: ['class'] });

    // follow the site's colour theme / light-dark mode
    new MutationObserver(function () { if (ctl) { ctl.setTheme(); if (reduce) ctl.renderOnce(); } })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (l) { heroVisible = l[0].isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { docVisible = !document.hidden; sync(); });
    if (coarse) {
      addEventListener('scroll', function () {
        if (!scrolling) { scrolling = true; sync(); }
        clearTimeout(scrollT);
        scrollT = setTimeout(function () { scrolling = false; sync(); }, 160);
      }, { passive: true });
    }

    // fonts for the key glyphs: draw once they are ready (the keys build after this anyway)
    sync();
  }

  function load() {
    var s = document.createElement('script');
    s.src = 'vendor/calvo-3d.js';
    s.async = true;
    s.onload = function () {
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(mount, mount); else mount();
    };
    s.onerror = fail;
    document.head.appendChild(s);
  }

  function schedule() {
    var wait = coarse ? 1500 : 0;
    setTimeout(function () {
      if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2500 });
      else setTimeout(load, 900);
    }, wait);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
