// Saves files the website hands over (CSV export, Finances backup…) into a
// folder on the phone. The first time, Android asks you to pick the folder
// (e.g. Download); LifeOS remembers it after that.
import { Alert, Platform, ToastAndroid } from "react-native";
import { Directory } from "expo-file-system";
import { readPrefs, writePrefs } from "./prefs";

function toast(msg) {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.LONG);
  else Alert.alert(msg);
}

const ask = (title, message) =>
  new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Choose folder", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) })
  );

async function pickFolder() {
  const ok = await ask("Where should LifeOS save files?", "Pick a folder once — for example Download. Exports and backups will be saved there from now on.");
  if (!ok) return null;
  try {
    const dir = await Directory.pickDirectoryAsync();
    writePrefs({ saveDir: dir.uri });
    return dir;
  } catch {
    return null; // picker closed
  }
}

const MAX_BYTES = 25 * 1024 * 1024;
const MIMES = ["text/csv", "application/json", "application/pdf", "text/plain", "application/octet-stream"];

export async function saveIncomingFile({ name, mime, data }) {
  if (typeof data !== "string" || data.length > (MAX_BYTES * 4) / 3) return toast("Couldn't save the file");
  // A plain file name only — no folders, no hidden files.
  name = String(name || "LifeOS-file").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+/, "").slice(0, 120) || "LifeOS-file";
  mime = MIMES.includes(String(mime).split(";")[0].trim()) ? String(mime).split(";")[0].trim() : "application/octet-stream";
  let prefs = readPrefs();
  for (let attempt = 0; attempt < 2; attempt++) {
    let dir = prefs.saveDir ? new Directory(prefs.saveDir) : await pickFolder();
    if (!dir) return toast("Not saved");
    try {
      const file = dir.createFile(name, mime || null);
      file.write(data, { encoding: "base64" });
      return toast(`Saved ${name}`);
    } catch {
      // The remembered folder may be gone or no longer allowed — ask again once.
      prefs = writePrefs({ saveDir: null });
    }
  }
  toast("Couldn't save the file");
}
