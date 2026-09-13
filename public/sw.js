/**
 * InstaReels — Advanced Service Worker
 * ─────────────────────────────────────────────────────────────────────────────
 * Caching strategies:
 *
 *  CACHE-FIRST        /assets/*.json (local DB files)
 *                     Static app shell (JS/CSS bundles, fonts)
 *
 *  STALE-WHILE-REVALIDATE
 *                     xvideos API responses  → instant from cache,
 *                     revalidated in background (max-age 1 h)
 *
 *  NETWORK-FIRST (5 s timeout)
 *                     All other requests — fall back to cache on offline
 *
 * Video URLs are NOT cached here (streaming media handles its own range
 * requests via HTTP 206; caching those in CacheStorage causes double-buffering
 * and wasted storage).
 */

const STATIC_CACHE = "reels-static-v4";
const API_CACHE = "reels-api-v4";
const DB_CACHE = "reels-db-v4";

const STATIC_URLS = ["/", "/manifest.json", "/logo.png", "/PWA_ICON.png"];

const API_ORIGIN = "xvideos-backend-reels.vercel.app";

// ─── Install: Pre-cache static assets ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_URLS).catch(() => {
        /* Offline install — best effort */
      }),
    ),
  );
});

// ─── Activate: Clean up stale caches ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            const isKnown = [STATIC_CACHE, API_CACHE, DB_CACHE].includes(key);
            if (!isKnown) return caches.delete(key);
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch handler ─────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // ── Skip non-HTTP(S) ────────────────────────────────────────────────────────
  if (!url.protocol.startsWith("http")) return;

  // ── Skip video / streaming URLs (identified by .mp4 / .m3u8 / common CDN patterns) ──
  // Let the browser handle range requests natively — SW caching breaks streaming.
  const isVideoUrl =
    /\.(mp4|webm|m3u8|ts|mov|avi|mkv)(\?|\/|$)/i.test(url.pathname) ||
    url.hostname.includes("cdn") ||
    url.hostname.includes("media") ||
    url.searchParams.has("range");
  if (isVideoUrl) return;

  // ── Local JSON databases → Cache-First (very long TTL) ──────────────────────
  if (url.pathname.startsWith("/assets/") && url.pathname.endsWith(".json")) {
    event.respondWith(cacheFirst(request, DB_CACHE, 7 * 24 * 60 * 60)); // 7 days
    return;
  }

  // ── Static assets (JS/CSS bundles — immutable hashed filenames) ─────────────
  if (url.pathname.startsWith("/assets/") && !url.pathname.endsWith(".json")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 365 * 24 * 60 * 60));
    return;
  }

  // ── API calls (xvideos backend) → Stale-While-Revalidate ────────────────────
  if (url.hostname === API_ORIGIN) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE, 60 * 60)); // 1 hour max-age
    return;
  }

  // ── App shell navigation requests → Network-First ────────────────────────────
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, STATIC_CACHE, 5000));
    return;
  }

  // ── Everything else → Network-First with 5s timeout ─────────────────────────
  event.respondWith(networkFirst(request, STATIC_CACHE, 5000));
});

// ─── Strategy implementations ─────────────────────────────────────────────────

/**
 * Cache-First: return cached version immediately if present & fresh.
 * Falls back to network, then caches the fresh response.
 */
async function cacheFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get("date");
    if (dateHeader) {
      const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
      if (age < maxAgeSeconds) return cached;
    } else {
      return cached; // No date header — trust the cache
    }
  }

  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    if (cached) return cached; // Offline fallback
    return Response.error();
  }
}

/**
 * Stale-While-Revalidate: return cached immediately, then update cache in background.
 * If no cache exists, fetch from network.
 */
async function staleWhileRevalidate(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Check if cached response is still within max-age
  if (cached) {
    const dateHeader = cached.headers.get("date");
    const isFresh =
      !dateHeader || (Date.now() - new Date(dateHeader).getTime()) / 1000 < maxAgeSeconds;

    if (isFresh) {
      // Return stale immediately, revalidate in background
      fetch(request)
        .then((fresh) => {
          if (fresh.ok) cache.put(request, fresh).catch(() => {});
        })
        .catch(() => {});
      return cached;
    }
  }

  // No fresh cache — go to network
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    if (cached) return cached; // Offline fallback
    return Response.error();
  }
}

/**
 * Network-First: try network with a timeout, fall back to cache.
 */
async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);

  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs),
    );

    const fresh = await Promise.race([networkPromise, timeoutPromise]);
    if (fresh.ok && request.mode === "navigate") {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // For navigate requests, fall back to the app shell
    if (request.mode === "navigate") {
      const shell = await cache.match("/");
      if (shell) return shell;
    }
    return Response.error();
  }
}
