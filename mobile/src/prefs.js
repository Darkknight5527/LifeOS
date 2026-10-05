// Tiny settings file kept on the phone (save folder, last health sync, …).
import { File, Paths } from "expo-file-system";

const PREFS = new File(Paths.document, "lifeos-prefs.json");

export function readPrefs() {
  try {
    return PREFS.exists ? JSON.parse(PREFS.textSync()) : {};
  } catch {
    return {};
  }
}

export function writePrefs(patch) {
  try {
    const next = { ...readPrefs(), ...patch };
    if (!PREFS.exists) PREFS.create();
    PREFS.write(JSON.stringify(next));
    return next;
  } catch {
    return readPrefs();
  }
}
