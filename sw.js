const CACHE_NAME = 'pov-translate-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/scanner.js',
  './js/card-renderer.js',
  './js/data-loader.js',
  './lib/html5-qrcode.min.js',
  './data/cards.json',
  './assets/icon.png',
  './assets/icon_round.png',
  './assets/lp_bg.jpg',
  './assets/sf_bg.jpg',
  './assets/ci_bg.jpg',
  './manifest.json'
];

// In a real scenario with many images, you might use a separate cache or lazily cache them.
// But based on requirements "Усе закешовано", we could theoretically add all images to the initial list.
// For now, we will cache them dynamically as they are requested, or we can hardcode if preferred.
// Using Cache First strategy for all requests to ensure offline works.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch and put in cache (Cache First)
      return fetch(event.request).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
