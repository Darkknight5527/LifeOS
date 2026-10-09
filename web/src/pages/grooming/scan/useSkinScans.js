// The list of AI skin checks, shared by every screen that shows them.
// Results (not photos) are kept on the device so they show instantly.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "../../../api";

const CACHE = "lifeos_scans_cache_v1";
let state = { scans: read(), loading: true, error: null };
let started = false;
const subs = new Set();

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE) || "null");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function set(patch) {
  state = { ...state, ...patch };
  if (patch.scans) {
    state.scans = [...patch.scans].sort((a, b) => (a.date < b.date ? 1 : -1));
    try {
      localStorage.setItem(CACHE, JSON.stringify(state.scans));
    } catch {
      /* not critical */
    }
  }
  subs.forEach((f) => f());
}

async function load() {
  set({ loading: true, error: null });
  try {
    set({ scans: await api.skinScans(), loading: false });
  } catch (e) {
    set({ loading: false, error: e.message || "Couldn't load skin checks" });
  }
}

export function useSkinScans() {
  const snap = useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state
  );
  useEffect(() => {
    if (!started) {
      started = true;
      load();
    }
  }, []);

  const create = useCallback(async (date, photos) => {
    const scan = await api.createSkinScan(date, photos);
    set({ scans: [scan, ...state.scans.filter((s) => s.date !== date)] });
    return scan;
  }, []);
  const reanalyze = useCallback(async (id) => {
    const scan = await api.reanalyzeSkinScan(id);
    set({ scans: state.scans.map((s) => (s._id === id ? scan : s)) });
    return scan;
  }, []);
  const remove = useCallback(async (id) => {
    await api.deleteSkinScan(id);
    set({ scans: state.scans.filter((s) => s._id !== id) });
  }, []);

  return { ...snap, reload: load, create, reanalyze, remove };
}

// Photos are private, so they're fetched with your login and shown as blob URLs.
const photoCache = new Map(); // "id/angle" -> Promise<url>
export function photoUrl(id, angle) {
  const k = `${id}/${angle}`;
  if (!photoCache.has(k)) {
    const p = api
      .skinPhoto(id, angle)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("Photo not found"))))
      .then((b) => URL.createObjectURL(b));
    p.catch(() => photoCache.delete(k));
    photoCache.set(k, p);
  }
  return photoCache.get(k);
}
