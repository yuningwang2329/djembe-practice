const CACHE_PREFIX = "djembe-practice-";
const CACHE_NAME = `${CACHE_PREFIX}__CACHE_VERSION__`;
const SCOPE_URL = new URL("./", self.registration.scope);
const INDEX_URL = new URL("index.html", SCOPE_URL).href;
const REQUIRED_ASSETS = [
  new URL("manifest.webmanifest", SCOPE_URL).href,
  new URL("audio/demo-groove.wav", SCOPE_URL).href,
  new URL("icons/apple-touch-icon.png", SCOPE_URL).href,
  new URL("icons/icon-192.png", SCOPE_URL).href,
  new URL("icons/icon-512.png", SCOPE_URL).href,
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const indexResponse = await fetch(INDEX_URL, { cache: "reload" });
    await cache.put(INDEX_URL, indexResponse.clone());

    const html = await indexResponse.text();
    const linkedAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => new URL(match[1], INDEX_URL).href)
      .filter((url) => url.startsWith(SCOPE_URL.href));
    const assetUrls = [...new Set([...REQUIRED_ASSETS, ...linkedAssets])];
    await Promise.all(assetUrls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response.ok) await cache.put(url, response);
      } catch {
        // One optional asset must not prevent the already-cached app shell installing.
      }
    }));
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE_URL.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(caches.match(INDEX_URL, { ignoreVary: true }).then((cached) => cached ?? fetch(request)));
    return;
  }

  event.respondWith(caches.match(request, { ignoreVary: true }).then(async (cached) => {
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  }));
});
