const CACHE_NAME = 'zt-cache-v1.3';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Simple pass-through for now, required for PWA installation
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
