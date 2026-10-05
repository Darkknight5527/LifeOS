// Talks to the same LifeOS backend as the website (Express + MongoDB on Render).
import { KEYS, load, save } from "./store";

// "lifeos-xyz.onrender.com" → "https://lifeos-xyz.onrender.com/api"
export function normaliseServer(input) {
  let s = String(input || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  if (!/\/api$/i.test(s)) s = `${s}/api`;
  return s;
}

export async function getAuth() {
  return load(KEYS.auth, null);
}

export async function request(path, { method = "GET", body, auth } = {}) {
  const a = auth || (await getAuth());
  if (!a?.server) throw new Error("Not signed in");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000); // Render's free tier can take ~50 s to wake
  try {
    const res = await fetch(`${a.server}${path}`, {
      method,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(a.token ? { Authorization: `Bearer ${a.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        msg = (await res.json()).error || msg;
      } catch {
        /* ignore */
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function signIn(serverInput, email, password) {
  const server = normaliseServer(serverInput);
  if (!server) throw new Error("Enter your LifeOS server address");
  const { token } = await request("/auth/login", { method: "POST", body: { email, password }, auth: { server } });
  const auth = { server, token, email };
  await save(KEYS.auth, auth);
  return auth;
}

export async function signOut() {
  await save(KEYS.auth, null);
}
