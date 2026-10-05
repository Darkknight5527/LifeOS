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
export const syncScale = () => (set({ busy: true }), sendToApp("health-sync"));
export const openHealthSettings = () => sendToApp("health-settings");

const latestByDate = (list) => {
  const m = {};
  for (const x of list) if (!m[x.date] || (x.updatedAt || x.createdAt || 0) > (m[x.date].updatedAt || m[x.date].createdAt || 0)) m[x.date] = x;
  return m;
};

// Save readings: new days are created, changed days updated, the rest skipped.
export async function saveReadings(readings) {
  const byDate = latestByDate(await api.list("body-logs"));
  const create = [];
  let updated = 0;
  for (const r of readings) {
    const cur = byDate[r.date];
    const patch = { weight: r.weight, ...(r.bodyFat ? { bodyFat: r.bodyFat } : {}) };
    if (!cur) create.push({ date: r.date, ...patch, notes: `From ${r.source}` });
    else if (Math.abs((cur.weight || 0) - r.weight) >= 0.05 || (r.bodyFat && cur.bodyFat !== r.bodyFat)) {
      await api.update("body-logs", cur._id, patch);
      updated++;
    }
  }
  for (let i = 0; i < create.length; i += 200) await api.bulkCreate("body-logs", create.slice(i, i + 200));
  return { added: create.length, updated };
}

export function HealthSyncHost() {
  const showToast = useToast();
  useEffect(() => {
    if (!IN_APP) return;
    const off = onAppMessage(async (m) => {
      if (m.type === "health-status") return set({ ...m, busy: false });
      if (m.type !== "health") return;
      set({ ...m, readings: undefined, busy: m.status === "connected" && m.readings?.length > 0 });
      if (m.status !== "connected" || !m.readings?.length) return;
      try {
        const { added, updated } = await saveReadings(m.readings);
        sendToApp("health-saved");
        set({ busy: false, lastSync: Date.now(), lastResult: { added, updated } });
        if (added || updated) {
          const from = [...new Set(m.readings.map((r) => r.source))].join(", ");
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
