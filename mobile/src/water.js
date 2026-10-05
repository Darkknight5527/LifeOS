// Today's water: shown instantly from the phone, synced with the website's
// food log (one document per day in `food-logs`, field `water` in ml).
// Glasses added offline wait in a queue and are sent when the server answers.
import { request } from "./api";
import { KEYS, load, save } from "./store";

export function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Same rule as the website: automatic target from body weight (35 ml/kg,
// rounded to 250 ml) unless you've set your own; 3 L if nothing is known.
export function waterTarget(settings) {
  const p = settings?.profile;
  const auto = p?.weightKg && p?.heightCm && p?.age ? Math.round((p.weightKg * 35) / 250) * 250 : null;
  if (settings?.autoTargets !== false && auto) return auto;
  return settings?.targets?.water || auto || 3000;
}

const latestFor = (logs, date) =>
  logs.filter((l) => l.date === date).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0];

export async function getWater() {
  const w = await load(KEYS.water, null);
  const today = todayISO();
  if (!w || w.date !== today) return { date: today, ml: 0, target: w?.target || 3000, lastDrinkAt: null, glass: w?.glass || 250 };
  return w;
}

async function setWater(w) {
  await save(KEYS.water, w);
  return w;
}

// Add (or with a negative number, remove) water for today. Updates the phone
// immediately, then tries to send it.
export async function addWater(delta) {
  const w = await getWater();
  const next = { ...w, ml: Math.max(0, w.ml + delta), lastDrinkAt: delta > 0 ? Date.now() : w.lastDrinkAt };
  await setWater(next);
  const queue = await load(KEYS.queue, []);
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: w.date, delta });
  await save(KEYS.queue, queue);
  flush().catch(() => {});
  return next;
}

let flushing = null;
// Send queued glasses to the server, oldest first.
export function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      let queue = await load(KEYS.queue, []);
      while (queue.length) {
        const op = queue[0];
        const logs = await request("/food-logs");
        const doc = latestFor(logs, op.date);
        if (doc) await request(`/food-logs/${doc._id}`, { method: "PATCH", body: { water: Math.max(0, (doc.water || 0) + op.delta) } });
        else await request("/food-logs", { method: "POST", body: { date: op.date, entries: [], water: Math.max(0, op.delta) } });
        queue = (await load(KEYS.queue, [])).filter((x) => x.id !== op.id);
        await save(KEYS.queue, queue);
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

// Pull today's total and target from the server (after sending anything queued).
export async function refreshWater() {
  await flush().catch(() => {});
  const queue = await load(KEYS.queue, []);
  const [logs, settingsList] = await Promise.all([request("/food-logs"), request("/fit-settings")]);
  const today = todayISO();
  const doc = latestFor(logs, today);
  const pending = queue.filter((q) => q.date === today).reduce((a, q) => a + q.delta, 0);
  const w = await getWater();
  return setWater({ ...w, date: today, ml: Math.max(0, (doc?.water || 0) + pending), target: waterTarget(settingsList[0]) });
}

export async function setGlass(ml) {
  const w = await getWater();
  return setWater({ ...w, glass: ml });
}
