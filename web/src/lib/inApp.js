// Helpers for when the website runs inside the LifeOS Android app (a WebView).
// The app's WebView can't download blob: files or show PDFs itself, so we hand
// files to the app instead, and show PDFs with our own reader.

export const IN_APP = typeof window !== "undefined" && Boolean(window.ReactNativeWebView);

/** Version of the Android app (from its user agent, "LifeOSApp/1.5.1"); "1.0" for apps before 1.5.1. */
export const APP_VERSION = (typeof navigator !== "undefined" && navigator.userAgent.match(/LifeOSApp\/([\d.]+)/)?.[1]) || null;
export function appVersionBelow(v) {
  if (!APP_VERSION) return false;
  const a = APP_VERSION.split(".").map(Number);
  const b = v.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  return false;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Save a file: a normal download in a browser, "save to phone" in the app. */
export async function saveFile(blob, name) {
  if (IN_APP) {
    const data = await blobToBase64(blob);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "save-file", name, mime: blob.type || "application/octet-stream", data }));
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Show a PDF in the built-in reader (used inside the app). `blob` may be a
 *  promise, so the reader can open straight away with a spinner. */
export function openPdfReader(blob, { page = 1, title = "" } = {}) {
  window.dispatchEvent(new CustomEvent("lifeos:pdf", { detail: { blob, page, title, id: Date.now() } }));
}
export function closePdfReader() {
  window.dispatchEvent(new CustomEvent("lifeos:pdf", { detail: null }));
}

/** Send a message to the Android app (no-op in a normal browser). */
export function sendToApp(type, data = {}) {
  if (IN_APP) window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
}

/** Listen for messages from the Android app. Returns an unsubscribe function. */
export function onAppMessage(handler) {
  const on = (e) => e.detail && handler(e.detail);
  window.addEventListener("lifeos:native", on);
  return () => window.removeEventListener("lifeos:native", on);
}

/** A light tap of vibration for taps that change something (app only; quiet in browsers). */
export function haptic(style = "light") {
  if (IN_APP) window.ReactNativeWebView.postMessage(JSON.stringify({ type: "haptic", style }));
}
