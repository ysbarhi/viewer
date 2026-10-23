/*!
 * Application : Finjat 3D Viewer
 * Organisation : YassineSbarhiApps
 * Développé par : Yassine Sbarhi
 * Region ID : MA
 * Copyright : All rights reserved to Yassine Sbarhi 2026
 */

const APP_CACHE = 'viewer-cao-v24';
const SHARE_CACHE = 'shared-file-cache';
const SCOPE = self.registration.scope;
const SHARED_KEY = new URL('./shared-file.glb', SCOPE).href;
const PRECACHE = ['./', './index.html', './manifest.json', './logo.png', './logo-192.png', './logo-maskable-512.png', './splash-cgi.mp4'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
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
          return Response.redirect(new URL('./index.html?shared=1', SCOPE).href, 303);
        }
      } catch (e) { }
      return Response.redirect(new URL('./index.html', SCOPE).href, 303);
    })());
    return;
  }

  if (req.method !== 'GET') return;

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
