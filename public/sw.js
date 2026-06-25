function isAppCache(name) {
  return /workbox|precache|runtime|googleAnalytics|vite|pwa|louder|app-shell|start-url|offline|pages|static|assets/i.test(name);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.filter(isAppCache).map((name) => caches.delete(name)));
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(
          clients.map((client) => {
            const url = new URL(client.url);
            url.searchParams.set("cache-reset", Date.now().toString());
            return client.navigate(url.toString());
          }),
        );
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);