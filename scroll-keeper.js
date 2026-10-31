/* Calvo scroll keeper: when the person comes Back to a page, put the page (and any inner scrolling panel) exactly where they left it. */
(function () {
  'use strict';
  var KEY = 'calvo_scroll_v1:', touched = [], restoring = false, timer = 0;
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { }
  function pk() { return KEY + location.pathname + location.search; }
  function path(el) {
    var p = [], b = document.body;
    while (el && el !== b && el.parentElement) {
      if (el.id) { p.unshift('#' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id)); return p.join('>'); }
      p.unshift(el.tagName.toLowerCase() + ':nth-child(' + (Array.prototype.indexOf.call(el.parentElement.children, el) + 1) + ')');
      el = el.parentElement;
    }
    return 'body>' + p.join('>');
  }
  function save() {
    if (restoring) return;
    try {
      var d = { w: Math.round(window.pageYOffset || 0), e: [] };
      touched.forEach(function (el) { if (el.isConnected && el.scrollTop > 0) d.e.push([path(el), Math.round(el.scrollTop)]); });
      sessionStorage.setItem(pk(), JSON.stringify(d));
    } catch (e) { }
  }
  document.addEventListener('scroll', function (e) {
    if (restoring) return;
    var t = e.target; if (t && t !== document && t.nodeType === 1 && touched.indexOf(t) < 0) touched.push(t);
    clearTimeout(timer); timer = setTimeout(save, 250);
  }, true);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') save(); });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a[href]')) save(); }, true);

  var nav; try { nav = performance.getEntriesByType('navigation')[0]; } catch (e) { }
  if (!nav || nav.type !== 'back_forward') return;
  var d; try { d = JSON.parse(sessionStorage.getItem(pk()) || 'null'); } catch (e) { }
  if (!d || (!d.w && !d.e.length)) return;
  restoring = true;
  var root = document.documentElement, n = 0, iv = 0, evs = ['touchstart', 'wheel', 'pointerdown', 'keydown', 'mousedown'];
  root.style.overflowAnchor = 'none';
  function apply() {
    if (d.w) window.scrollTo(0, d.w);
    d.e.forEach(function (a) { var el; try { el = document.querySelector(a[0]); } catch (x) { } if (el) { el.style.overflowAnchor = 'none'; el.scrollTop = a[1]; } });
  }
  function stop() {
    clearInterval(iv); root.style.overflowAnchor = ''; restoring = false;
    d.e.forEach(function (a) { try { var el = document.querySelector(a[0]); if (el) el.style.overflowAnchor = ''; } catch (x) { } });
    evs.forEach(function (ev) { window.removeEventListener(ev, stop, true); });
  }
  apply(); iv = setInterval(function () { apply(); if (++n > 40) stop(); }, 50);
  evs.forEach(function (ev) { window.addEventListener(ev, stop, true); });
})();
