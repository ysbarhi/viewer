self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installé');
});
self.addEventListener('fetch', (e) => {
  // Laisse passer les requêtes normalement
});
