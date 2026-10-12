// Phone notifications (Android app only): settings live on this device, and
// "what's already done today" is worked out here and handed to the app, which
// schedules the reminders itself and skips the ones you no longer need.
import { api } from "../api";
import { IN_APP, sendToApp } from "./inApp.js";
import { completion, scheduledSteps } from "../pages/grooming/skin/lib";
import { computeTargets } from "../pages/fitness/lib";
import { todayISO } from "../pages/finances/lib";

const KEY = "lifeos_notify_v1";

export const DEFAULT_NOTIFY = {
  water: { on: true, from: "09:00", to: "21:00", every: 120 },
  skinAm: { on: true, time: "08:00" },
  skinPm: { on: true, time: "21:30" },
  checkin: { on: true, time: "21:00" },
};

export function readNotify() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v ? { ...v, saved: true } : null;
  } catch {
    return null;
  }
}

/** Save settings on this device and hand them to the app (asks for permission the first time). */
export function saveNotify(config, { ask = true } = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    /* not critical */
  }
  sendToApp("notify-config", { config, ask });
  pushNotifyStatus();
}

// ---------- today's status ----------
async function todayStatus() {
  const today = todayISO();
  const [steps, skinLogs, food, fitSettings, tx] = await Promise.all([
    api.list("skincare-steps").catch(() => []),
    api.list("skin-logs").catch(() => []),
    api.list("food-logs").catch(() => []),
    api.list("fit-settings").catch(() => []),
    api.list("finance-transactions").catch(() => []),
  ]);
  const latest = (list) => list.filter((x) => x.date === today).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  const skinLog = latest(skinLogs);
  const foodLog = latest(food);

  const c = completion(steps, skinLog, today);
  const left = (period) => {
    const done = new Set(skinLog?.doneSteps || []);
    return scheduledSteps(steps, today, period)
      .filter((s) => !done.has(s.key))
      .map((s) => s.name)
      .join(", ");
  };

  const settings = fitSettings[0];
  const auto = settings?.profile ? computeTargets(settings.profile) : null;
  const waterTarget = (settings?.autoTargets !== false && auto ? auto.water : settings?.targets?.water || auto?.water) || 3000;
  const waterMl = foodLog?.water || 0;

  // Evening check-in: what hasn't been logged today yet.
  const missing = [];
  let path = "/paper";
  if (!tx.some((t) => t.date === today)) {
    missing.push("expenses");
    path = "/finances";
  }
  if (!(foodLog?.entries || []).length) {
    missing.push("food");
    if (path === "/paper") path = "/fitness#nutrition";
  }
  if (!skinLog?.condition) {
    missing.push("today's skin rating");
    if (path === "/paper") path = "/grooming";
  }

  return {
    date: today,
    skinAmDone: c.am.done >= c.am.total,
    skinAmLeft: left("am"),
    skinPmDone: c.pm.done >= c.pm.total,
    skinPmLeft: left("pm"),
    waterMl,
    waterTarget,
    waterDone: waterMl >= waterTarget,
    checkinMissing: missing.length ? missing.join(", ").replace(/, ([^,]*)$/, " and $1") : "",
    checkinPath: path,
  };
}

let timer = null;
/** Recalculate today's status and send it to the app (debounced; app only). */
export function pushNotifyStatus(delay = 1500) {
  if (!IN_APP || !readNotify()) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      sendToApp("notify-status", { status: await todayStatus() });
    } catch {
      /* offline — the phone keeps its last plan */
    }
  }, delay);
}
