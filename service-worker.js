/* Service worker — app usable sin internet (shell; datos siempre frescos en red) */
const CACHE = 'qb-rendimientos-m530';
const PRECACHE = [
  './',
  './index.html',
  './css/app.css?v=m530',
  './js/config.js?v=m530',
  './js/workers.js?v=m530',
  './js/plano.js?v=m530',
  './js/api.js?v=m530',
  './js/icons.js?v=m530',
  './js/avatars.js?v=m530',
  './js/jefes-dia.js?v=m530',
  './js/supervisors.js?v=m530',
  './js/historial-data.js?v=m530',
  './js/historial-nombres.js?v=m530',
  './js/historial.js?v=m530',
  './js/descartes.js?v=m530',
  './js/charts.js?v=m530',
  './js/select.js?v=m530',
  './js/export.js?v=m530',
  './js/app.js?v=m530',
  './vendor/echarts.min.js',
  './vendor/jspdf.umd.min.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/logo-qberries.png',
  './assets/FONDO.jpg',
  './data/plano-cosecha.json',
  './data/trabajadores.json'
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

  const shell = () =>
    caches.match('./index.html').then((r) => r || caches.match('./'));

  if (isHtml) {
    event.respondWith(
      shell().then((cached) => {
        const offline = self.navigator && self.navigator.onLine === false;
        if (offline && cached) return cached;
        const net = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put('./index.html', copy));
            }
            return res;
          });
        const timed = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 2500);
        });
        return Promise.race([net, timed]).catch(() => cached || net);
      })
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
        .catch(() => caches.match(req, { ignoreSearch: true }));
    })
  );
});
