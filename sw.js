self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Interception du fichier partagé par Android
    if (event.request.method === 'POST' && event.request.url.includes('index.html')) {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                const file = formData.get('shared_file');
                
                if (file) {
                    const cache = await caches.open('shared-file-cache');
                    await cache.put('/shared-file.glb', new Response(file));
                }
                // Redirige vers l'appli avec le signal que le fichier est prêt
                return Response.redirect('./index.html?shared=true', 303);
            } catch (error) {
                return Response.redirect('./index.html', 303);
            }
        })());
        return;
    }

    // Fonctionnement normal hors-ligne
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
