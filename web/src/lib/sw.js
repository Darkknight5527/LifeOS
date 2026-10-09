// Registers the service worker (public/sw.js) that keeps the site on the
// device for instant, offline-friendly opening. When a new version of the
// site is out, it switches over quietly the next time you leave the page,
// so nothing reloads under your finger.
let updateWaiting = false;

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "lifeos-update") updateWaiting = true;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && updateWaiting) {
      updateWaiting = false;
      setTimeout(() => window.location.reload(), 50);
    }
  });
}

/** After a new version is out, an old page may ask for a code file that no
 *  longer exists. Reload once to pick up the new version instead of failing. */
export function reloadOnChunkError(load) {
  return () =>
    load().catch((err) => {
      const key = "lifeos-chunk-reload";
      let tried = false;
      try {
        tried = sessionStorage.getItem(key) === "1";
        sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      if (!tried) {
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    });
}
