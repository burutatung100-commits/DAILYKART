// DailyKart - Service Worker v2.0 - Offline + Fast Cache
const CACHE_NAME = 'dailykart-v2-bb335';
const OFFLINE_URL = '/index.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Install - Precache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('DailyKart SW: Precaching');
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, {mode: 'no-cors'}))).catch(()=>{});
    })
  );
  self.skipWaiting();
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first, fallback to cache (for Firestore always network)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip Firebase, Firestore, WA - always network
  if (url.hostname.includes('firestore') || url.hostname.includes('firebase') || url.hostname.includes('wa.me') || url.hostname.includes('googleapis')) {
    return; // Let browser handle
  }

  // For HTML pages - Network first
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // For images, css, js - Cache first, then network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(()=> cached);
    })
  );
});

// Push notification support (future)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'DailyKart', body: 'New update!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/3081/3081648.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3081/3081648.png',
      vibrate: [200, 100, 200]
    })
  );
});
