/* 
  Service Worker Kill-Switch (CLEANER)
  This file ensures that any previously registered service worker is unregistered
  and that all browser caches are cleared, preventing the "old page" from reappearing.
*/

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach(client => {
          if (client.url && "navigate" in client) {
              client.navigate(client.url);
          }
      });
    })
  );
});
