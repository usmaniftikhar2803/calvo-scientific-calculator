/* ============================================
   CALVO — SERVICE WORKER (Offline PWA support)
   Strategy: cache-first app shell, then
   stale-while-revalidate for same-origin GETs.
   Cross-origin requests (Gemini API, exchange
   rates, Google Fonts) are left untouched and
   always go straight to the network.
   ============================================ */

/* Bump this version string every time you deploy
   a new version of the app so old caches get
   cleared and users pick up the update. */
const CACHE_VERSION = 'calvo-cache-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './i18n.js',
  './question-bank.js',
  './subject-tools.js',
  './ai-solver.js',
  './manifest.json',
  './privacy.html',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './favicon-48x48.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
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
        .catch(() => {
          // Offline and not cached — fall back to the app shell for
          // page navigations so the app still opens.
          if (req.mode === 'navigate') return caches.match('./index.html');
          return cached;
        });

      // Serve cached copy instantly if we have one, refresh it in the
      // background (stale-while-revalidate); otherwise wait for network.
      return cached || networkFetch;
    })
  );
});
