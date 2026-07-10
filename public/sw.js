// Minimal service worker: network-first with cache fallback.
// Network-first keeps the app fresh (no stale JS after a deploy / dev reload)
// while still serving from cache when offline. API calls are never cached.
const CACHE = "finance-ai-v2";
const SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Never cache API calls.
  if (url.pathname.startsWith("/api/")) return;

  // Network-first: try the network, cache a copy, fall back to cache offline.
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() =>
        caches.match(request).then((r) => r || (request.mode === "navigate" ? caches.match("/") : undefined)),
      ),
  );
});
