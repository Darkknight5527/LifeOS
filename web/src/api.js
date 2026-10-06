import { createApiClient } from "lifeos-shared";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "lifeos_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked */
  }
}

/** Forget the login and every browser copy of LifeOS data on this device. */
export function clearLocalData() {
  setToken(null);
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("lifeos_") || k.startsWith("lifeos-"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  // Downloaded book PDFs kept for offline reading.
  try {
    window.caches?.delete("lifeos-books-v1");
  } catch {
    /* ignore */
  }
}

// When the server rejects our token (expired, or signed out everywhere),
// tell the app so it can show the login screen.
export const api = createApiClient(BASE_URL, getToken, {
  onUnauthorized: () => window.dispatchEvent(new Event("lifeos:signed-out")),
});

/** Swap the token for a fresh one if it's more than a day old (keeps regular users logged in). */
export async function refreshTokenIfOld() {
  const t = getToken();
  if (!t) return;
  try {
    const { iat } = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (Date.now() / 1000 - iat < 86400) return;
    const res = await api.refreshToken();
    if (res?.token && getToken() === t) setToken(res.token);
  } catch {
    /* offline or old server — try again next time */
  }
}
