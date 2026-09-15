/* Service worker — app usable sin internet (shell; datos siempre frescos en red) */
const CACHE = 'qb-rendimientos-m333';
const PRECACHE = [
  './',
  './index.html',
  './css/app.css?v=m333',
  './js/config.js?v=m333',
  './js/workers.js?v=m333',
  './js/api.js?v=m333',
  './js/icons.js?v=m333',
  './js/avatars.js?v=m333',
  './js/supervisors.js?v=m333',
  './js/descartes.js?v=m333',
  './js/charts.js?v=m333',
  './js/select.js?v=m333',
  './js/export.js?v=m333',
  './js/app.js?v=m333',
  './vendor/echarts.min.js',
  './vendor/jspdf.umd.min.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/logo-qberries.png',
  './assets/logo.png',
  './assets/FONDO.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        Promise.all(
          PRECACHE.map((url) =>
            c.add(url).catch(function () {
              /* ignore missing optional assets */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHtml =
    req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html');

  const isData =
    url.pathname.indexOf('/data/') >= 0 ||
    url.pathname.indexOf('produccion_agg.json') >= 0 ||
    url.pathname.indexOf('/api/') >= 0;

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() =>
          caches.match('./index.html').then((r) => r || caches.match('./'))
        )
    );
    return;
  }

  /* Datos Excel/JSON: siempre red primero; caché solo si no hay internet */
  if (isData) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => res)
        .catch(() =>
          caches.match('./data/produccion_agg.json').then((cached) => {
            return cached || new Response('[]', { headers: { 'Content-Type': 'application/json' } });
          })
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
