// Service worker: permite instalar el sitio como app y abrirlo sin conexión.
//
// - Páginas, estilos, código y datos: primero la red (los cambios se ven al
//   publicar) y, si no hay conexión, la copia guardada.
// - Imágenes y fuentes: primero la copia guardada (no cambian); se guardan a
//   medida que se ven, así que sin conexión está disponible lo ya visitado.
//
// Si reemplazas una imagen conservando su nombre, sube IMAGES_CACHE (p. ej.
// 'imagenes-v2') para que los celulares descarguen la nueva.

const SHELL_CACHE = 'sitio-v1';
const IMAGES_CACHE = 'imagenes-v1';
const FONTS_CACHE = 'fuentes-v1';

const SHELL_FILES = [
  './',
  'manifest.webmanifest',
  'assets/css/styles.css',
  'assets/js/app.js',
  'assets/js/data.js',
  'assets/js/gallery.js',
  'assets/js/install.js',
  'assets/js/search.js',
  'assets/js/ui.js',
  'assets/js/viewer.js',
  'assets/icons/favicon.svg',
  'assets/icons/icon-192.png',
  'data/cards.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  const current = [SHELL_CACHE, IMAGES_CACHE, FONTS_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !current.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONTS_CACHE));
  } else if (url.origin === self.location.origin) {
    event.respondWith(url.pathname.includes('/images/') ? cacheFirst(request, IMAGES_CACHE) : networkFirst(request));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // Sin conexión, cualquier página del sitio abre la app (con su #/tarjeta).
    if (request.mode === 'navigate') {
      const home = await cache.match('./');
      if (home) return home;
    }
    throw error;
  }
}
