/* ============================================
   CALVO — SERVICE WORKER (Offline PWA support)
   Strategy: pages, scripts, styles and data files are NETWORK-FIRST
   (a new deploy shows on the very next reload); the cache is only used
   when offline. Other same-origin files (images, icons) use
   stale-while-revalidate.
   Cross-origin requests (Gemini API, exchange
   rates, Google Fonts) are left untouched and
   always go straight to the network.
   ============================================ */

/* Bump this version string every time you deploy
   a new version of the app so old caches get
   cleared and users pick up the update. */
const CACHE_VERSION = 'calvo-cache-v87';

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './i18n.js',
  './question-bank.js',
  './subject-tools.js',
  './ai-solver.js',
  './urdu-notes.js',
  './solved-examples.js',
  './share-card.js',
  './manifest.json',
  './privacy.html',
  './how-to-use.html',
  './tools.css',
  './cgpa-calculator.html',
  './gpa-calculator.html',
  './cgpa-to-percentage-calculator.html',
  './target-cgpa-calculator.html',
  './aggregate-calculator.html',
  './mdcat-aggregate-calculator.html',
  './ecat-aggregate-calculator.html',
  './nust-aggregate-calculator.html',
  './fast-aggregate-calculator.html',
  './merit-presets.js',
  './chemical-equation-balancer.html',
  './molar-mass-calculator.html',
  './chem-tools.js',
  './derivative-calculator.html',
  './integral-calculator.html',
  './calculus-engine.js',
  './algebra-engine.js',
  './simple-steps.js',
  './limit-calculator.html',
  './laplace-ode-solver.html',
  './ode-laplace-engine.js',
  './algebra-simplifier.html',
  './age-calculator.html',
  './date-difference-calculator.html',
  './attendance-calculator.html',
  './complex-number-calculator.html',
  './vector-calculator.html',
  './hypothesis-test-calculator.html',
  './anova-calculator.html',
  './correlation-regression-calculator.html',
  './stats-engine.js',
  './truth-table-kmap.html',
  './logic-engine.js',
  './word-counter.html',
  './image-to-pdf.html',
  './compress-pdf.html',
  './pdf-tools.js',
  './doc-scanner.js',
  './photo-resizer.html',
  './photo-tools.js',
  './merge-split-pdf.html',
  './pdf-organizer.js',
  './title-page-generator.html',
  './title-page.js',
  './cv-builder.html',
  './cv-builder.js',
  './notes-todo.html',
  './notes-todo.js',
  './class-wise-formulas.html',
  './periodic-table.html',
  './projectile-motion-calculator.html',
  './resistor-calculator.html',
  './physical-constants.html',
  './physics-tools.js',
  './trigonometry-cheat-sheet.html',
  './lcm-hcf-calculator.html',
  './fraction-calculator.html',
  './average-calculator.html',
  './quadratic-equation-solver.html',
  './matrix-calculator.html',
  './percentage-calculator.html',
  './marks-percentage-calculator.html',
  './ohms-law-calculator.html',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './favicon-48x48.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './10th-class-chemistry-formulas.html',
  './1st-year-math-formulas.html',
  './9th-10th-class-biology-formulas.html',
  './9th-class-physics-formulas.html',
  './10th-class-physics-formulas.html',
  './9th-class-math-formulas.html',
  './fsc-computer-science-formulas.html',
  './9th-class-chemistry-formulas.html',
  './fsc-biology-formulas.html',
  './2nd-year-math-formulas.html',
  './2nd-year-physics-formulas.html',
  './1st-year-physics-formulas.html',
  './9th-10th-class-computer-science-formulas.html',
  './fsc-chemistry-formulas.html',
  './10th-class-math-formulas.html',
  './contact.html',
  './terms.html',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './vendor/pdf-lib.min.js',
  './data/formulas/accounting-finance.json',
  './data/formulas/biology.json',
  './data/formulas/chemical-engineering.json',
  './data/formulas/chemistry.json',
  './data/formulas/civil-engineering.json',
  './data/formulas/commerce.json',
  './data/formulas/computer-science.json',
  './data/formulas/cost-accounting.json',
  './data/formulas/data-science.json',
  './data/formulas/economics.json',
  './data/formulas/electrical-engineering.json',
  './data/formulas/environmental-science.json',
  './data/formulas/financial-management.json',
  './data/formulas/mathematics.json',
  './data/formulas/mechanical-engineering.json',
  './data/formulas/pharmacy-pharmacology.json',
  './data/formulas/physics.json',
  './data/formulas/psychology.json',
  './data/formulas/software-engineering.json',
  './data/formulas/statistics.json',
  './data/formulas/textile-engineering.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => { /* don't block install if one asset 404s */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GET requests — everything else (Gemini API,
  // ExchangeRate-API, Google Fonts) passes straight through to the network.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations (i.e. loading/reloading an HTML document, which is
  // what a manual or pull-to-refresh triggers) go NETWORK-FIRST, so a
  // refresh always shows the latest deployed version instead of a
  // possibly-stale cached copy. Falls back to cache only when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Scripts, styles and data files are also NETWORK-FIRST. If they were served
  // from cache first, a fresh index.html could run with an old script.js after
  // a deploy. The cache is only a fallback for offline use.
  if (/\.(js|css|json|webmanifest|html)$/i.test(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (images, icons) keeps the fast stale-while-revalidate
  // strategy: serve cached instantly, refresh cache in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
