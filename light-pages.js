/* Applies the saved light/dark choice AND colour theme (both set from the main
   app menu) to tool, formula and blog pages. Runs before the page paints, so
   there is no flash. Dark + default theme = does nothing. */
(function () {
  var T = {"midnight":{"a":"#ff8a1f","d":"#e16b00","r":"255,138,31","p":"#ac5c15","pd":"#754113","pt":"#714218","pr":"172,92,21"},"ocean":{"a":"#3a9aff","d":"#007bfc","r":"58,154,255","p":"#1971ca","pd":"#164e87","pt":"#1c4f83","pr":"25,113,202"},"rose":{"a":"#e8548b","d":"#e11e66","r":"232,84,139","p":"#da1b64","pd":"#951848","pt":"#911f4b","pr":"218,27,100"},"slate":{"a":"#5b9dff","d":"#1e78ff","r":"91,157,255","p":"#306ae5","pd":"#1b47a7","pt":"#21499d","pr":"48,106,229"},"forest":{"a":"#3fa34d","d":"#2e7738","r":"63,163,77","p":"#108320","pd":"#0f5a19","pt":"#13591c","pr":"16,131,32"},"grape":{"a":"#8a4fe0","d":"#6924ce","r":"138,79,224","p":"#8b4ce9","pd":"#6120c3","pt":"#6227b9","pr":"139,76,233"},"mint":{"a":"#1fbf9a","d":"#168a70","r":"31,191,154","p":"#108066","pd":"#0e5746","pt":"#135747","pr":"16,128,102"},"ember":{"a":"#e34b3a","d":"#c42d1c","r":"227,75,58","p":"#d82e1b","pd":"#932418","pt":"#8f291e","pr":"216,46,27"},"sunflower":{"a":"#e0b220","d":"#ab8818","r":"224,178,32","p":"#8b6d11","pd":"#5f4b10","pt":"#5e4b14","pr":"139,109,17"},"coral":{"a":"#ff7a54","d":"#ff4a17","r":"255,122,84","p":"#cb4019","pd":"#8a2f16","pt":"#86331c","pr":"203,64,25"},"lavender":{"a":"#9b8ce0","d":"#715cd3","r":"155,140,224","p":"#7159ea","pd":"#4224da","pt":"#462bcd","pr":"113,89,234"}};
  try {
    var light = localStorage.getItem('calvo_color_mode') === 'light';
    var c = T[localStorage.getItem('calvo_theme')];
    var s = document.documentElement.style;
    if (c) {
      if (light) {
        s.setProperty('--lt-p', c.p); s.setProperty('--lt-pd', c.pd); s.setProperty('--lt-pt', c.pt);
        s.setProperty('--lt-p-rgb', c.pr);
        s.setProperty('--brand-orange', c.p); s.setProperty('--brand-orange-deep', c.pd);
        s.setProperty('--p-amber-rgb', c.pr);
      } else {
        s.setProperty('--brand-orange', c.a); s.setProperty('--brand-orange-deep', c.d);
        s.setProperty('--p-amber-rgb', c.r);
        var mt = document.querySelector('meta[name="theme-color"]');
        if (mt) mt.setAttribute('content', c.a);
      }
    }
    if (!light) return;
    document.documentElement.setAttribute('data-mode', 'light');
    document.write('<link rel="stylesheet" href="/light-pages.css?v=2">');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', '#f3f5fb');
  } catch (e) {}
})();

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
  if (!nav || (nav.type !== 'back_forward' && nav.type !== 'reload')) return;
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
