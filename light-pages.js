/* Applies the saved light/dark choice (set from the main app menu) to
   tool, formula and blog pages. Runs before the page paints, so there is
   no dark flash. Dark mode = does nothing. */
(function () {
  try {
    if (localStorage.getItem('calvo_color_mode') !== 'light') return;
    document.documentElement.setAttribute('data-mode', 'light');
    document.write('<link rel="stylesheet" href="/light-pages.css?v=1">');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', '#f3f5fb');
  } catch (e) {}
})();
