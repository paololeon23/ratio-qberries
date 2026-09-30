/* Service worker — app usable sin internet (shell; datos siempre frescos en red) */
const CACHE = 'qb-rendimientos-m455';
const PRECACHE = [
  './',
  './index.html',
  './css/app.css?v=m455',
  './js/config.js?v=m455',
  './js/workers.js?v=m455',
  './js/plano.js?v=m455',
  './js/api.js?v=m455',
  './js/icons.js?v=m455',
  './js/avatars.js?v=m455',
  './js/jefes-dia.js?v=m455',
  './js/supervisors.js?v=m455',
  './js/historial-data.js?v=m455',
  './js/historial-nombres.js?v=m455',
  './js/historial.js?v=m455',
  './js/descartes.js?v=m455',
  './js/charts.js?v=m455',
  './js/select.js?v=m455',
  './js/export.js?v=m455',
  './js/app.js?v=m455',
  './vendor/echarts.min.js',
  './vendor/jspdf.umd.min.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/logo-qberries.png',
  './assets/FONDO.jpg',
  './data/plano-cosecha.json'
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
