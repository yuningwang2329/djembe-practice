const CACHE_PREFIX = "djembe-practice-";
const CACHE_NAME = `${CACHE_PREFIX}__CACHE_VERSION__`;
const SCOPE_URL = new URL("./", self.registration.scope);
const INDEX_URL = new URL("index.html", SCOPE_URL).href;
const REQUIRED_ASSETS = [
  new URL("manifest.webmanifest", SCOPE_URL).href,
  new URL("audio/demo-groove.wav", SCOPE_URL).href,
  new URL("audio/drums/bass.mp3", SCOPE_URL).href,
  new URL("audio/drums/tone.mp3", SCOPE_URL).href,
  new URL("audio/drums/slap.mp3", SCOPE_URL).href,
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
    if (cached) {
      const range = request.headers.get("Range");
      if (!range || cached.status !== 200) return cached;
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return cached;
      const bytes = await cached.arrayBuffer();
      const length = bytes.byteLength;
      const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), length - 1) : length - 1;
      if (start >= length || start > end) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${length}` } });
      }
      const headers = new Headers(cached.headers);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Range", `bytes ${start}-${end}/${length}`);
      headers.set("Content-Length", String(end - start + 1));
      return new Response(bytes.slice(start, end + 1), { status: 206, headers });
    }
    const response = await fetch(request);
    // Cache API 不接受 206，不能把一次局部读取误存成完整音频。
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  }));
});
