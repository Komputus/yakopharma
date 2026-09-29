// Service worker basique : cache des dernières données consultées.
const SHELL = "yako-shell-v2";
const DATA = "yako-data-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/", "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => ![SHELL, DATA].includes(k)).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/admin")) return; // jamais de cache pour l'admin

  // API + tuiles OSM : réseau d'abord, repli sur le cache (connexion faible).
  if (url.pathname.startsWith("/api/") || url.hostname.endsWith("tile.openstreetmap.org")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(DATA).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Reste (pages, JS, CSS) : cache d'abord, mise à jour en arrière-plan.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            caches.open(SHELL).then((c) => c.put(req, res.clone()));
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
