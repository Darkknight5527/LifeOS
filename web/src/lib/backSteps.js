// Back steps inside a page. Switching a domain's tab or view, or opening a
// pop-up sheet, adds a step to the browser history, so the phone's back
// gesture (and the browser's back button) undoes that first — instead of
// jumping straight out of the domain to the page you came from.
//
// Entries we add keep React Router's own fields (same URL, same key), so the
// router doesn't see a page change; our fields sit alongside them:
//   [domainKey]: the domain's tab/view state
//   lifeosSheet: id of the pop-up sheet this entry belongs to
//   lifeosDead:  a step that no longer shows anything (skipped on back)
import { useEffect, useRef } from "react";

const OURS = ["lifeosSheet", "lifeosDead"];
const clean = (st) => {
  const out = { ...(st || {}) };
  for (const k of OURS) delete out[k];
  return out;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- pop-up sheets ----------
const openSheets = new Set();
let seq = 0;

/** Call when a sheet opens. Returns a function to call when it closes. */
export function sheetOpened(onBack) {
  if (typeof window === "undefined") return () => {};
  const id = `s${++seq}`;
  openSheets.add(id);
  let closedByBack = false;
  window.history.pushState({ ...clean(window.history.state), lifeosSheet: id }, "");
  const onPop = () => {
    // Back left this sheet's step (to the page, or to a sheet underneath).
    if (window.history.state?.lifeosSheet === id || closedByBack) return;
    closedByBack = true;
    onBack();
  };
  window.addEventListener("popstate", onPop);
  return () => {
    window.removeEventListener("popstate", onPop);
    openSheets.delete(id);
    // Closed with ✕, a swipe or a button: its step would now show nothing, so
    // mark it to be skipped (going back here could race with a new step).
    if (!closedByBack && window.history.state?.lifeosSheet === id) {
      window.history.replaceState({ ...clean(window.history.state), lifeosDead: true }, "");
    }
  };
}

// Skip steps that no longer show anything.
if (typeof window !== "undefined") {
  window.addEventListener("popstate", (e) => {
    const st = e.state || {};
    if (st.lifeosDead || (st.lifeosSheet && !openSheets.has(st.lifeosSheet))) window.history.back();
  });
}

// ---------- domain tabs / views ----------
/**
 * Make changes to `state` (a domain's current tab / view) into back steps.
 * key: a name unique to the domain, e.g. "fitnessView".
 */
export function useBackSteps(key, state, setState) {
  const shown = useRef(null); // what the page shows, as JSON
  const fromBack = useRef(false);
  const setRef = useRef(setState);
  setRef.current = setState;

  useEffect(() => {
    const cur = window.history.state || {};
    const json = JSON.stringify(state);
    if (shown.current == null) {
      shown.current = json;
      // Came back to this page with back/forward: show where you were.
      if (cur[key] != null && !same(cur[key], state)) {
        fromBack.current = true;
        setRef.current(cur[key]);
        return;
      }
      window.history.replaceState({ ...cur, [key]: state }, "");
      return;
    }
    if (json === shown.current) return;
    shown.current = json;
    if (fromBack.current) {
      fromBack.current = false;
      return;
    }
    if (!same(cur[key], state)) window.history.pushState({ ...clean(cur), [key]: state }, "");
  }, [key, state]);

  useEffect(() => {
    const onPop = (e) => {
      const st = e.state || {};
      if (st.lifeosDead || st[key] == null) return;
      if (JSON.stringify(st[key]) === shown.current) return;
      fromBack.current = true;
      setRef.current(st[key]);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [key]);
}
