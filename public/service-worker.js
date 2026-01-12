/**
 * CARE ACADEMY SERVICE WORKER
 * * 💡 TIP: Whenever you push a UI change to Git, increment CACHE_VERSION.
 * This forces the user's browser to recognize a "new" worker and clear old files.
 */
const CACHE_VERSION = "v1.0.3"; // Increment this (e.g., v1.0.2 -> v1.0.3) for every Git push
const CACHE_NAME = `care-academy-cache-${CACHE_VERSION}`;

// These core assets are cached immediately on "Install"
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/site.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/logo.png",
  "/og.jpg"
];

/* ==========================================================
   INSTALL: Happens when the browser detects a new SW file
   ========================================================== */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`[SW] Pre-caching version: ${CACHE_VERSION}`);
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Forces the waiting service worker to become the active service worker
  self.skipWaiting();
});

/* ==========================================================
   ACTIVATE: Clean up old caches from previous versions
   ========================================================== */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // If the cache name doesn't match the current version, delete it
          if (key !== CACHE_NAME) {
            console.log(`[SW] Purging old cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Ensures that updates to the service worker take effect immediately
  self.clients.claim();
});

/* ==========================================================
   FETCH: Network-First with Cache Fallback
   ========================================================== */
self.addEventListener("fetch", (event) => {
  // We only cache GET requests (prevents issues with Firestore/POST)
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // ✅ Success: Clone the network response and save to cache
        // This ensures the next time the user is offline, they have the latest version
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // ❌ Offline: Try to find the file in the cache
        return caches.match(event.request).then((cachedResponse) => {
          // If the specific file isn't in cache, return the homepage (SPA support)
          return cachedResponse || caches.match("/");
        });
      })
  );
});