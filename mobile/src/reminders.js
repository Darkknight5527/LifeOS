// Water reminders, scheduled on the phone itself (no server needed).
// We plan one-off notifications for the next 7 days and re-plan whenever you
// open the app or log a glass — so a reminder never nags right after you drank,
// and today's reminders stop once you reach your target.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { addWater, getWater } from "./water";
import { KEYS, load, save } from "./store";

export const CHANNEL = "water";
export const CATEGORY = "water";
export const DAYS_AHEAD = 7;

export const DEFAULT_REMINDERS = { enabled: true, everyMin: 120, start: 8 * 60, end: 22 * 60 };

export async function getReminderSettings() {
  return { ...DEFAULT_REMINDERS, ...(await load(KEYS.reminders, {})) };
}
export async function saveReminderSettings(patch) {
  const next = { ...(await getReminderSettings()), ...patch };
  await save(KEYS.reminders, next);
  await planReminders();
  return next;
}

export const fmtL = (ml) => `${+(ml / 1000).toFixed(2)} L`;
export const fmtClock = (min) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// Channel + action buttons. Safe to call many times.
export async function setupNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Water reminders",
      description: "Regular nudges to drink water",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: "#60a5fa",
    });
  }
  const w = await getWater();
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: "add", buttonTitle: `+${w.glass || 250} ml`, options: { opensAppToForeground: false } },
    { identifier: "snooze", buttonTitle: "Snooze 30 min", options: { opensAppToForeground: false } },
  ]);
}

export async function askPermission() {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

async function cancelWaterReminders() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.content?.data?.kind === "water").map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

function at(dayOffset, minutes) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setMinutes(minutes);
  return d;
}

// Re-plan every water reminder from scratch. Returns the next reminder time.
export async function planReminders() {
  await cancelWaterReminders();
  const s = await getReminderSettings();
  if (!s.enabled) return null;
  const w = await getWater();
  const now = Date.now();
  const earliestToday = Math.max(now + 60 * 1000, (w.lastDrinkAt || 0) + s.everyMin * 60 * 1000);
  const doneToday = w.ml >= w.target;
  const glass = w.glass || 250;
  const jobs = [];
  const times = [];
  for (let day = 0; day < DAYS_AHEAD; day++) {
    if (day === 0 && doneToday) continue;
    for (let m = s.start; m <= s.end; m += s.everyMin) {
      const when = at(day, m);
      if (day === 0 && when.getTime() < earliestToday) continue;
      const body =
        day === 0
          ? `${fmtL(w.ml)} of ${fmtL(w.target)} so far — have a glass (${glass} ml).`
          : `Aim for ${fmtL(w.target)} today. Tap +${glass} ml when you've had a glass.`;
      times.push(when.getTime());
      jobs.push(
        Notifications.scheduleNotificationAsync({
          content: { title: "💧 Time for water", body, categoryIdentifier: CATEGORY, data: { kind: "water" } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
        })
      );
    }
  }
  await Promise.all(jobs);
  const first = times.length ? new Date(Math.min(...times)) : null;
  await save(KEYS.next, first ? first.getTime() : null);
  return first;
}

export async function nextReminder() {
  const t = await load(KEYS.next, null);
  return t && t > Date.now() ? new Date(t) : null;
}

export async function snooze(minutes = 30) {
  await Notifications.scheduleNotificationAsync({
    content: { title: "💧 Water reminder", body: "Snoozed reminder — time for a glass.", categoryIdentifier: CATEGORY, data: { kind: "water" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + minutes * 60 * 1000), channelId: CHANNEL },
  });
}

export async function testReminder() {
  await setupNotifications();
  const w = await getWater();
  await Notifications.scheduleNotificationAsync({
    content: { title: "💧 Time for water", body: `Test: ${fmtL(w.ml)} of ${fmtL(w.target)} so far.`, categoryIdentifier: CATEGORY, data: { kind: "water-test" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL },
  });
}

// Runs for taps on the notification's buttons — even when the app is closed.
// Each tap is handled once, even if both the background task and the open app see it.
export async function handleResponse(response) {
  const action = response?.actionIdentifier;
  const id = response?.notification?.request?.identifier;
  if (action !== "add" && action !== "snooze") return false;
  const key = `${id}|${action}|${response?.notification?.date || ""}`;
  const seen = await load(KEYS.handled, []);
  if (seen.includes(key)) return true;
  await save(KEYS.handled, [...seen, key].slice(-50));
  if (action === "add") {
    const w = await getWater();
    await addWater(w.glass || 250);
    await planReminders();
  } else {
    await snooze(30);
  }
  if (id) await Notifications.dismissNotificationAsync(id).catch(() => {});
  return true;
}
