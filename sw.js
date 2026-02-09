/* Tactical Mission Log – Service Worker (Offline + Auto-Update)
   - Network-first (so updates stick)
   - Cache fallback (so offline works)
   - Versioned cache name (bump on every release)
*/

const CACHE_NAME = "tml-cache-v1.2.2"; // 🔁 CHANGE THIS EACH TIME YOU UPDATE FILES

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./xlsx.full.min.js",
  "./icon-192.png",
  "./icon-512.png"
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first, fallback to cache
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // only handle GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin requests (your GitHub Pages files)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        // Cache successful responses
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return resp;
      })
      .catch(async () => {
        // Offline: serve from cache
        const cached = await caches.match(req);
        if (cached) return cached;

        // Fallback: if navigating (opening the app), serve index.html
        if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
          return caches.match("./index.html");
        }

        // Nothing cached
        return new Response("OFFLINE", { status: 503, statusText: "Offline" });
      })
  );
});