// Izdosh Academy service worker — minimal offline support.
// Bump this on every meaningful change so old clients pick up the new SW
// (activate() below deletes any cache whose name doesn't match).
const CACHE_VERSION = "izdosh-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses, payment/webhook routes, or anything
  // auth-sensitive — those must always reflect the current server state.
  if (url.pathname.startsWith("/api/")) return;

  // Full-page navigations: try the network first (so logged-in content is
  // always fresh), fall back to the offline page only when the network is
  // truly unreachable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((res) => res ?? Response.error()))
    );
    return;
  }

  // Static build assets and icons are content-hashed / rarely change —
  // safe to serve from cache first and refresh in the background.
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico";
  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => undefined);
      return cached ?? (await network) ?? Response.error();
    })
  );
});
