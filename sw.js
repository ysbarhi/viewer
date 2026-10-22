const APP_CACHE = 'viewer-cao-v22';
const SHARE_CACHE = 'shared-file-cache';
const SCOPE = self.registration.scope;
const SHARED_KEY = new URL('./shared-file.glb', SCOPE).href;
const PRECACHE = ['./', './index.html', './manifest.json', './logo.png', './logo-192.png', './logo-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    // allSettled : un fichier manquant ne fait pas échouer l'installation
    await Promise.allSettled(PRECACHE.map((u) => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k !== APP_CACHE && k !== SHARE_CACHE)
      .map((k) => caches.delete(k)));
    await clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Fichier reçu via le menu Partager (doit correspondre à share_target.action)
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith((async () => {
      try {
        const formData = await req.formData();
        const file = formData.get('shared_file');
        if (file && file.size) {
          const cache = await caches.open(SHARE_CACHE);
          await cache.put(SHARED_KEY, new Response(file, {
            headers: { 'Content-Type': 'model/gltf-binary' }
          }));
          // Response.redirect exige une URL ABSOLUE dans un service worker
          return Response.redirect(new URL('./index.html?shared=1', SCOPE).href, 303);
        }
      } catch (e) { /* on retombe sur la page d'accueil */ }
      return Response.redirect(new URL('./index.html', SCOPE).href, 303);
    })());
    return;
  }

  if (req.method !== 'GET') return;

  // Pages : réseau d'abord (mises à jour), cache en secours (hors-ligne)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(APP_CACHE);
        cache.put(new URL('./index.html', SCOPE).href, res.clone());
        return res;
      } catch (e) {
        return (await caches.match(new URL('./index.html', SCOPE).href)) || Response.error();
      }
    })());
    return;
  }

  // Le reste (dont three.js / html5-qrcode sur unpkg) : cache d'abord + mise en cache à la volée
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        const cache = await caches.open(APP_CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});
