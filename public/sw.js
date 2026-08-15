/* Studio OS minimal service worker (Module 7).
 *
 * Scope is deliberately conservative: navigation to the site diary
 * pages is network-first with a cache fallback (so an offline site
 * engineer still sees the last loaded diary), and static assets are
 * cache-first. Auth-gated API responses are never cached.
 */
const CACHE = "studio-os-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/admin"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isDiaryPath(url) {
  return /^\/admin\/client-projects\/[^/]+\/diary(\/|$)/.test(url.pathname);
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Diary navigation: network first, cache the successful response,
  // fall back to the cache when offline.
  if (req.mode === "navigate" && isDiaryPath(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/admin"))
        )
    );
    return;
  }

  // Static assets: cache first, then network, caching on success.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
