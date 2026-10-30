const CACHE_NAME = 'watch-party-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/room.html',
  '/style.css',
  '/room.css',
  '/app.js',
  '/room.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
