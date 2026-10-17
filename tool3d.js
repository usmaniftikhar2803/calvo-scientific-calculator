/* Calvo: 3D for tool / calculator / formula pages.
   - Reuses vendor/calvo-3d.js (same WebGL scene as the home page), loaded only when the browser is idle.
   - 3D reveal + pointer tilt are CSS-only and work even without WebGL.
   - Falls back silently if WebGL is missing, data saver is on, the device is slow, or reduced motion is set. */
(function () {
  'use strict';
  var doc = document.querySelector('main.doc');
  if (!doc) return;
  var ua = navigator.userAgent || '';
  if (/bot|crawl|spider|lighthouse|pagespeed|headless/i.test(ua)) return;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var lite = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 3D reveal on scroll ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var blocks = doc.querySelectorAll('.tool, .lead, h2, .related, details, table.f, .doc > ul, .doc > ol');
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -5% 0px' });
    blocks.forEach(function (b) { b.classList.add('t3d-reveal'); io.observe(b); });
    setTimeout(function () { blocks.forEach(function (b) { b.classList.add('in'); }); }, 4500);
  }

  /* ---------- pointer tilt on tool cards (mouse devices only) ---------- */
  if (!reduce && fine) {
    doc.querySelectorAll('.tool').forEach(function (el) {
      el.classList.add('t3d-tilt');
      var raf = 0;
      el.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = el.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
          el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          el.style.setProperty('--my', (e.clientY - r.top) + 'px');
          el.classList.add('tilting');
          el.style.transform = 'perspective(900px) rotateX(' + (-y * 3.2).toFixed(2) + 'deg) rotateY(' + (x * 4).toFixed(2) + 'deg)';
        });
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('tilting'); el.style.transform = '';
      });
    });
  }

  /* ---------- scroll progress bar ---------- */
  if (!reduce) {
    var bar = document.createElement('div');
    bar.className = 't3d-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var pr = 0;
    var upd = function () {
      pr = 0;
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
    };
    addEventListener('scroll', function () { if (!pr) pr = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd, { passive: true });
    upd();
  }

  if (lite) return;

  /* ---------- WebGL banner ---------- */
  function hasGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  if (!hasGL()) return;

  var host, canvas, ctl, vis = true, docVis = true;

  function sync() {
    if (!ctl) return;
    if (vis && docVis) { host.classList.add('on'); if (!reduce) ctl.start(); else ctl.renderOnce(); }
    else ctl.stop();
  }
  function fail() {
    if (ctl) { try { ctl.dispose(); } catch (e) {} ctl = null; }
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }
  function mount() {
    if (ctl || !window.Calvo3D) return;
    host = document.createElement('div');
    host.className = 't3d';
    host.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas');
    host.appendChild(canvas);
    doc.insertBefore(host, doc.firstChild);

    var phone = Math.min(screen.width, screen.height) < 700 || (matchMedia('(pointer: coarse)').matches && innerWidth < 900);
    ctl = window.Calvo3D.create(canvas, host, { phone: phone, onFail: fail, onSlow: fail });
    if (!ctl) { fail(); return; }

    // follow light / dark mode set by light-pages.js
    new MutationObserver(function () { if (ctl) { ctl.setTheme(); if (reduce) ctl.renderOnce(); } })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme'] });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (l) { vis = l[0].isIntersecting; sync(); }, { threshold: 0 }).observe(host);
    }
    document.addEventListener('visibilitychange', function () { docVis = !document.hidden; sync(); });
    sync();
  }
  function load() {
    var s = document.createElement('script');
    s.src = '/vendor/calvo-3d.js';
    s.async = true;
    s.onload = function () {
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(mount, mount); else mount();
    };
    s.onerror = fail;
    document.head.appendChild(s);
  }
  function schedule() {
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2500 });
    else setTimeout(load, 900);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
