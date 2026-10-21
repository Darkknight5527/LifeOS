// Smart scale → LifeOS. Inside the Android app, weigh-ins read from Health
// Connect (FitDays → Google Fit / Samsung Health → Health Connect) arrive here
// and are saved as Body weigh-ins. Mounted once near the root.
import { useEffect, useSyncExternalStore } from "react";
import { api } from "../api";
import { IN_APP, onAppMessage, sendToApp } from "../lib/inApp.js";
import { useToast } from "./Toast.jsx";

// Small shared store so the Body tab can show the scale's status.
let state = { status: IN_APP ? "checking" : "web", busy: false };
const subs = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
};
export const useHealthState = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state
  );
export const connectScale = () => (set({ busy: true }), sendToApp("health-connect"));
// A sync the person asked for (Sync now) gets a message even when nothing is new.
let manual = false;
export const syncScale = () => ((manual = true), set({ busy: true }), sendToApp("health-sync"));
export const openHealthSettings = () => sendToApp("health-settings");

const latestByDate = (list) => {
  const m = {};
  for (const x of list) if (!m[x.date] || (x.updatedAt || x.createdAt || 0) > (m[x.date].updatedAt || m[x.date].createdAt || 0)) m[x.date] = x;
  return m;
};

// Friendly names for the apps that write to Health Connect (the phone app
// sends package names it doesn't know, e.g. "com.hevy").
const APPS = {
  "com.hevy": "Hevy",
  "cn.fitdays.fitdays": "FitDays",
  "com.fitdays.fitdays": "FitDays",
  "com.noisefit": "NoiseFit",
  "com.strava": "Strava",
  "fit.cure.android": "cult.fit",
  "com.google.android.apps.fitness": "Google Fit",
  "com.sec.android.app.shealth": "Samsung Health",
  "com.fitbit.FitbitMobile": "Fitbit",
  "com.xiaomi.wearable": "Mi Fitness",
  "com.mi.health": "Mi Fitness",
  "com.huawei.health": "Huawei Health",
};
export function appName(name) {
  if (!name) return "another app";
  if (APPS[name]) return APPS[name];
  if (/fitdays/i.test(name)) return "FitDays";
  if (!/^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(name)) return name; // already a name
  const part = name.split(".").filter((x) => !/^(com|android|app|apps|mobile|cn|in|co|org|net|fit)$/i.test(x)).pop() || name;
  return part.charAt(0).toUpperCase() + part.slice(1);
}

// Body readings the scale may share alongside weight.
const EXTRA = ["bodyFat", "leanMass", "boneMass", "waterMass", "bmr", "heartRate"];

// Save readings: new days are created, changed days updated, the rest skipped.
export async function saveReadings(readings) {
  const byDate = latestByDate(await api.list("body-logs"));
  const create = [];
  let updated = 0;
  for (const r of readings) {
    const cur = byDate[r.date];
    const patch = { weight: r.weight };
    for (const k of EXTRA) if (r[k]) patch[k] = r[k];
    if (!cur) create.push({ date: r.date, ...patch, notes: `From ${appName(r.source)}` });
    else if (Math.abs((cur.weight || 0) - r.weight) >= 0.05 || EXTRA.some((k) => r[k] && cur[k] !== r[k])) {
      await api.update("body-logs", cur._id, patch);
      updated++;
    }
  }
  for (let i = 0; i < create.length; i += 200) await api.bulkCreate("body-logs", create.slice(i, i + 200));
  return { added: create.length, updated };
}

// Tell the server when the phone last synced, so the website can show it.
async function recordSync(info) {
  try {
    const [s] = await api.list("fit-settings");
    if (s) await api.update("fit-settings", s._id, { scaleSync: { at: Date.now(), ...info } });
  } catch {
    /* only a status note — ignore */
  }
}

export function HealthSyncHost() {
  const showToast = useToast();
  useEffect(() => {
    if (!IN_APP) return;
    const off = onAppMessage(async (m) => {
      const named = (x) => (x.sources ? { ...x, sources: [...new Set(x.sources.map(appName))] } : x);
      if (m.type === "health-status") return set({ ...named(m), busy: false });
      if (m.type !== "health") return;
      set({ ...named(m), readings: undefined, busy: m.status === "connected" && m.readings?.length > 0 });
      if (m.status !== "connected") return;
      if (!m.readings?.length) {
        // Nothing new in Health Connect: still a successful sync, so say so.
        sendToApp("health-saved");
        set({ busy: false, lastSync: Date.now(), lastResult: { added: 0, updated: 0 } });
        recordSync({ sources: state.sources || [], added: 0, updated: 0 });
        if (manual) showToast("Synced — no new weigh-ins in Health Connect yet");
        manual = false;
        return;
      }
      manual = false;
      try {
        const { added, updated } = await saveReadings(m.readings);
        sendToApp("health-saved");
        set({ busy: false, lastSync: Date.now(), lastResult: { added, updated } });
        recordSync({ sources: [...new Set(m.readings.map((r) => appName(r.source)))], added, updated });
        if (added || updated) {
          const from = [...new Set(m.readings.map((r) => appName(r.source)))].join(", ");
          showToast(`Scale: ${added ? `${added} new weigh-in${added === 1 ? "" : "s"}` : ""}${added && updated ? ", " : ""}${updated ? `${updated} updated` : ""} from ${from}`);
          window.dispatchEvent(new CustomEvent("lifeos:data-changed", { detail: { what: "body" } }));
        }
      } catch (e) {
        set({ busy: false, error: e.message || "Couldn't save weigh-ins" });
      }
    });
    sendToApp("health-status");
    return off;
  }, [showToast]);
  return null;
}
