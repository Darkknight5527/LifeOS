// LifeOS notifications, scheduled on the phone itself (no server needed).
//
// The website sends two things:
//   config — which reminders are on and at what times (set in Account)
//   status — what's already done today (skincare ticked, water drunk, what's logged)
// Each time either changes, the next 14 days are rescheduled from scratch,
// skipping anything already done today. The phone fires them on time even
// with no signal; opening the app at least once every two weeks keeps them going.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { readPrefs, writePrefs } from "./prefs";

const DAYS = 14;
const CHANNEL = "lifeos-reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (day, hhmm) => {
  const [h, m] = String(hhmm || "00:00").split(":").map(Number);
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const minutes = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const litres = (ml) => `${Math.round((ml || 0) / 100) / 10} L`;

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: "Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#f27a2c",
  });
}

export async function permissionState() {
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? "granted" : p.canAskAgain ? "ask" : "blocked";
}

/** Everything to schedule for the next DAYS days, given the settings and today's status. */
function plan(config, status, now = new Date()) {
  const out = [];
  const today = isoOf(now);
  const st = status?.date === today ? status : {};
  for (let i = 0; i < DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const iso = isoOf(day);
    const isToday = iso === today;
    const add = (id, when, title, body, path) => {
      if (when > now) out.push({ id: `${id}-${iso}`, when, title, body, path });
    };

    if (config.skinAm?.on && !(isToday && st.skinAmDone)) {
      add("skin-am", at(day, config.skinAm.time), "Morning skincare", isToday && st.skinAmLeft ? `Still to do: ${st.skinAmLeft}` : "Time for your morning routine.", "/grooming");
    }
    if (config.skinPm?.on && !(isToday && st.skinPmDone)) {
      add("skin-pm", at(day, config.skinPm.time), "Evening skincare", isToday && st.skinPmLeft ? `Still to do: ${st.skinPmLeft}` : "Time for your evening routine.", "/grooming");
    }
    if (config.checkin?.on && !(isToday && st.checkinMissing === "")) {
      const missing = isToday && st.checkinMissing ? st.checkinMissing : "expenses, food and today's skin rating";
      add("checkin", at(day, config.checkin.time), "Evening check-in", `Still to log today: ${missing}.`, isToday && st.checkinPath ? st.checkinPath : "/paper");
    }
    if (config.mind?.on && !(isToday && st.mindDone)) {
      add("mind", at(day, config.mind.time), "A few minutes for you 🧘", "Breathe, meditate or just sit for 2 minutes.", "/mental#mind");
    }
    if (config.journal?.on && !(isToday && st.journalDone)) {
      add("journal", at(day, config.journal.time), "Journal 📝", "How was today? A few lines before bed.", "/mental#journal");
    }
    if (config.water?.on && !(isToday && st.waterDone)) {
      const from = minutes(config.water.from || "09:00");
      const to = minutes(config.water.to || "21:00");
      const every = Math.max(30, Number(config.water.every) || 120);
      for (let t = from; t <= to; t += every) {
        const body = isToday && st.waterMl != null ? `You've had ${litres(st.waterMl)} of ${litres(st.waterTarget || 3000)} today. Have a glass now.` : "Have a glass of water.";
        add(`water${t}`, at(day, `${Math.floor(t / 60)}:${t % 60}`), "Drink water 💧", body, "/fitness#nutrition");
      }
    }
  }
  return out;
}

/**
 * Save new settings and/or today's status, then reschedule everything.
 * Returns { permission, scheduled }.
 */
export async function applyNotifications({ config, status, askPermission = false } = {}) {
  const prefs = readPrefs();
  const next = {
    notifyConfig: config !== undefined ? config : prefs.notifyConfig || null,
    notifyStatus: status !== undefined ? status : prefs.notifyStatus || null,
  };
  writePrefs(next);

  await Notifications.cancelAllScheduledNotificationsAsync();
  const cfg = next.notifyConfig;
  const anyOn = cfg && ["skinAm", "skinPm", "checkin", "water", "mind", "journal"].some((k) => cfg[k]?.on);
  if (!anyOn) return { permission: await permissionState(), scheduled: 0 };

  let perm = await permissionState();
  if (perm === "ask" && askPermission) {
    const r = await Notifications.requestPermissionsAsync();
    perm = r.granted ? "granted" : r.canAskAgain ? "ask" : "blocked";
  }
  if (perm !== "granted") return { permission: perm, scheduled: 0 };

  await ensureChannel();
  const items = plan(cfg, next.notifyStatus);
  for (const n of items) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: { path: n.path }, ...(Platform.OS === "android" ? { color: "#f27a2c" } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.when, channelId: CHANNEL },
    });
  }
  return { permission: perm, scheduled: items.length };
}

/** Re-plan from saved settings (on app start / return), so the 14-day window keeps rolling. */
export const refreshNotifications = () => applyNotifications({});

/** Calls back with the page to open when a notification is tapped (including the one that launched the app). */
export function onNotificationTap(cb) {
  // The tap that opened the app: handle it once, then forget it.
  Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      if (!r) return;
      cb(r.notification.request.content.data?.path);
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    })
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => cb(r.notification.request.content.data?.path));
  return () => sub.remove();
}
