// Spoken guidance and "keep the screen on" for Mind sessions.
// In the Android app (1.7+) the phone's own text-to-speech speaks (the app's
// built-in browser can't); on a computer the browser speaks.
import { APP_VERSION, IN_APP, appVersionBelow, sendToApp } from "../../../lib/inApp.js";

const NATIVE = IN_APP && Boolean(APP_VERSION) && !appVersionBelow("1.7.0");
const BROWSER = !IN_APP && typeof window !== "undefined" && "speechSynthesis" in window;
export const CAN_SPEAK = NATIVE || BROWSER;
/** In the app but too old for voice: say "update the app". */
export const NEEDS_UPDATE = IN_APP && !NATIVE;

// ---------- settings (this device) ----------
const KEY = "lifeos_mind_prefs";
export const ACCENTS = [
  { value: "en-IN", label: "Indian" },
  { value: "en-GB", label: "British" },
  { value: "en-US", label: "American" },
];
const DEFAULTS = { voice: true, accent: "en-IN", bells: true };
export function readPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}
export function writePrefs(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* not critical */
  }
}

// ---------- speaking ----------
function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices() || [];
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const exact = en.filter((v) => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase());
  const nice = (list) => list.find((v) => /female|natural|google|samantha|serena|veena|rishi/i.test(v.name)) || list[0];
  return nice(exact) || nice(en) || null;
}
if (BROWSER) window.speechSynthesis.getVoices(); // starts loading the voice list

/** Say `text` (slowly). `rate` 1 = normal. */
export function speak(text, { rate = 0.9 } = {}) {
  const p = readPrefs();
  if (!p.voice || !text) return;
  if (NATIVE) return sendToApp("speak", { text, lang: p.accent, rate });
  if (!BROWSER) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = p.accent;
  const v = pickVoice(p.accent);
  if (v) u.voice = v;
  u.rate = rate;
  u.pitch = 0.95;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (NATIVE) sendToApp("speak-stop");
  else if (BROWSER) window.speechSynthesis.cancel();
}

// ---------- keep the screen on ----------
let lock = null;
let wanted = false;
async function grab() {
  try {
    lock = await navigator.wakeLock?.request("screen");
  } catch {
    lock = null;
  }
}
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (wanted && !NATIVE && document.visibilityState === "visible") grab();
  });
}
export function keepAwake(on) {
  wanted = on;
  if (NATIVE) return sendToApp("keep-awake", { on });
  if (on) grab();
  else {
    lock?.release?.().catch?.(() => {});
    lock = null;
  }
}
