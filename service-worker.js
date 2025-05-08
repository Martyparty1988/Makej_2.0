// service-worker.js
const CACHE_NAME = 'vykazy-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/db.js',
  '/js/timer.js',
  '/js/charts.js',
  '/js/export.js',
  '/js/ui.js',
  '/js/enhancements.js',
  '/js/main.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js/dist/chart.esm.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log(`Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith('http')) {
    return;
  }
  
  // Skip third-party requests except for required CDN resources
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAllowedCDN = 
    url.hostname === 'cdnjs.cloudflare.com' || 
    url.hostname === 'fonts.googleapis.com' || 
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdn.jsdelivr.net';
  
  if (!isSameOrigin && !isAllowedCDN) {
    return;
  }
  
  // Stale-while-revalidate caching strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response immediately if available
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Update cache with fresh response
            if (networkResponse.ok && networkResponse.status === 200) {
              const clonedResponse = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clonedResponse));
            }
            return networkResponse;
          })
          .catch(error => {
            console.log('Fetch failed:', error);
            // If offline and no cached response, show offline page
            if (!cachedResponse) {
              return caches.match('/index.html');
            }
          });
        
        return cachedResponse || fetchPromise;
      })
  );
});

// Background sync for offline work logs
self.addEventListener('sync', event => {
  if (event.tag === 'sync-worklogs') {
    event.waitUntil(syncWorkLogs());
  }
});

// Push notifications for reminders
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nová notifikace',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Pracovní Výkazy', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(clientList => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});

// Utility function to sync work logs when back online
async function syncWorkLogs() {
  try {
    // This would be implemented to sync any offline-saved work logs
    // Would require additional offline storage mechanism
    return Promise.resolve();
  } catch (error) {
    console.error('Error syncing work logs:', error);
    return Promise.reject(error);
  }
}