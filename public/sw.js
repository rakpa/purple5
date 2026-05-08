// Service Worker for PWA
const CACHE_NAME = 'finance-2-v3';
const STATIC_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        // Cache static resources
        return cache.addAll(STATIC_CACHE).catch((err) => {
          console.log('[SW] Cache addAll failed:', err);
        });
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for same-origin)
  if (url.origin !== location.origin) {
    return;
  }

  // Handle navigation requests (HTML pages) - always serve index.html for SPA routes
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fetched response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, return cached index.html
          return caches.match('/').then((cachedResponse) => {
            return cachedResponse || new Response('Offline', { 
              status: 503,
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }

  // Handle static assets (JS, CSS, images, etc.) - Cache First strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Clone the response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      }).catch(() => {
        // If it's an image, return a placeholder
        if (request.destination === 'image') {
          return caches.match('/icon-192.png').then((icon) => {
            return icon || new Response('', { status: 404 });
          });
        }
        // For other assets, return offline response
        return new Response('Offline', { 
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

