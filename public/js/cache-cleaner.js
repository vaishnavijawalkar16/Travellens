// 1. CLEAR ALL STORAGE ON EVERY LOAD
if (typeof localStorage !== 'undefined') localStorage.clear();
if (typeof sessionStorage !== 'undefined') sessionStorage.clear();

// 2. UNREGISTER ANY OLD SERVICE WORKERS
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
  // Register cleaner to wipe caches
  navigator.serviceWorker.register('/sw.js').then(() => {
    console.log('Cache cleaner active');
  });
}
