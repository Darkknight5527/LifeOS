// LifeOS service worker: keeps a copy of the website on the device so it
// opens instantly (and without signal). It never touches API data — the app
// keeps its own saved copies of that.
//
// - Pages: shown from the saved copy straight away; a fresh copy is fetched
//   in the background. If it changed, open pages are told so they can switch
//   to the new version the next time you leave them.
// - /assets/* (file names change on every build): saved once, reused forever.
// - Other files (icons, manifest): saved copy now, refreshed in the background.
const SHELL = "lifeos-shell-v1";
const ASSETS = "lifeos-assets-v1";
const PAGE = "/index.html";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.add(new Request("/", { cache: "reload" })).then(() => c.match("/")).then((r) => r && c.put(PAGE, r)))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("lifeos-") && ![SHELL, ASSETS, "lifeos-books-v1"].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function tell(type) {
  const list = await self.clients.matchAll({ type: "window" });
  list.forEach((c) => c.postMessage({ type }));
}

async function refreshPage() {
  try {
    const res = await fetch("/", { cache: "no-store" });
    if (!res.ok || !(res.headers.get("content-type") || "").includes("text/html")) return null;
    const cache = await caches.open(SHELL);
    const old = await cache.match(PAGE);
    const [a, b] = await Promise.all([old ? old.clone().text() : "", res.clone().text()]);
    await cache.put(PAGE, res.clone());
    if (old && a !== b) {
      // New build: old asset files will never be asked for again.
      await caches.delete(ASSETS);
      tell("lifeos-update");
    }
    return res;
  } catch {
    return null;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API, videos, news… go straight to the network

  // Every page address is the same single-page app.
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const cached = await caches.match(PAGE);
        const fresh = refreshPage();
        if (cached) {
          e.waitUntil(fresh);
          return cached;
        }
        return (await fresh) || fetch(req);
      })()
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.open(ASSETS).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (url.pathname === "/sw.js") return;
  e.respondWith(
    caches.open(SHELL).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req)
        .then((res) => {
          if (res.ok) c.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      if (hit) {
        e.waitUntil(net);
        return hit;
      }
      return net;
    })
  );
});
