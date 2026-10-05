// Saves files the website hands over (CSV export, Finances backup…) into a
// folder on the phone. The first time, Android asks you to pick the folder
// (e.g. Download); LifeOS remembers it after that.
import { Alert, Platform, ToastAndroid } from "react-native";
import { Directory, File, Paths } from "expo-file-system";

const PREFS = new File(Paths.document, "lifeos-prefs.json");

function readPrefs() {
  try {
    return PREFS.exists ? JSON.parse(PREFS.textSync()) : {};
  } catch {
    return {};
  }
}
function writePrefs(p) {
  try {
    if (!PREFS.exists) PREFS.create();
    PREFS.write(JSON.stringify(p));
  } catch {
    /* not critical */
  }
}

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
    writePrefs({ ...readPrefs(), saveDir: dir.uri });
    return dir;
  } catch {
    return null; // picker closed
  }
}

export async function saveIncomingFile({ name, mime, data }) {
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
      prefs = { ...prefs, saveDir: null };
      writePrefs(prefs);
    }
  }
  toast("Couldn't save the file");
}
