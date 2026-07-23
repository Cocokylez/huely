const CACHE_PREFIX = "huely-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const GUEST_PAGES = ["/", "/history"];
const CORE_ASSETS = [
  "/manifest.webmanifest",
  "/pwa/icon?size=192",
  "/pwa/icon?size=512",
  "/pwa/icon?size=512&maskable=1",
];

async function cacheResponse(cache, url, options) {
  try {
    const response = await fetch(url, options);
    if (response.ok) await cache.put(url, response.clone());
    return response;
  } catch {
    return null;
  }
}

async function cacheGuestPage(cache, path) {
  const response = await cacheResponse(cache, path, {
    credentials: "omit",
    cache: "reload",
  });
  if (!response) return;

  const html = await response.text();
  const assets = new Set();
  const pattern = /(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(pattern)) {
    try {
      const url = new URL(match[1], self.location.origin);
      if (url.origin === self.location.origin && url.pathname.startsWith("/_next/")) {
        assets.add(url.href);
      }
    } catch {
      // Ignore malformed or non-web URLs.
    }
  }

  await Promise.allSettled(
    [...assets].map((url) => cacheResponse(cache, url, { cache: "reload" })),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled([
        ...CORE_ASSETS.map((url) => cacheResponse(cache, url, { cache: "reload" })),
        ...GUEST_PAGES.map((path) => cacheGuestPage(cache, path)),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/auth/")) return;

  const staticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/pwa/icon") ||
    url.pathname === "/manifest.webmanifest" ||
    ["script", "style", "font", "image", "worker"].includes(request.destination);

  if (staticAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request, { ignoreVary: true });
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return (
            (await caches.match(url.pathname, { ignoreSearch: true, ignoreVary: true })) ||
            (await caches.match("/")) ||
            Response.error()
          );
        }
      })(),
    );
  }
});
