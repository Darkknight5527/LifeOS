// Small wrapper around AsyncStorage for JSON values.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const KEYS = {
  auth: "lifeos_auth_v1", // { server, token, email }
  reminders: "lifeos_reminders_v1", // reminder settings
  water: "lifeos_water_v1", // { date, ml, target, lastDrinkAt, glass }
  queue: "lifeos_water_queue_v1", // [{ id, date, delta }] waiting to reach the server
  next: "lifeos_next_reminder_v1", // time of the next planned reminder
  handled: "lifeos_handled_v1", // notification taps already processed
};

export async function load(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function save(key, value) {
  try {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — not critical */
  }
}
