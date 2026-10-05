// True when this page load came from the browser's refresh button (or F5),
// as opposed to opening the site fresh (typed URL, bookmark, new tab).
// Worked out once at startup: in-app navigation never changes it.
export const IS_RELOAD = (() => {
  try {
    const entry = performance.getEntriesByType("navigation")[0];
    if (entry) return entry.type === "reload";
    return performance.navigation?.type === 1; // older browsers
  } catch {
    return false;
  }
})();

// The page that was open when the browser refreshed (null if it wasn't a
// refresh). A domain only restores its last tab after a refresh of itself —
// arriving from another domain always starts on the first tab.
export const RELOAD_PATH = IS_RELOAD ? window.location.pathname : null;
export const reloadedHere = (path) => IS_RELOAD && RELOAD_PATH === path;
