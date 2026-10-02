// Pure helpers for skincare: routine scheduling, day completion, streaks.
import { addDays, isoDate, parseISO, todayISO } from "../../finances/lib";

export { addDays, isoDate, parseISO, todayISO };

export const PERIODS = [
  { id: "am", label: "Morning", icon: "sun", color: "#fbbf24", soft: "rgba(251,191,36,0.14)" },
  { id: "pm", label: "Evening", icon: "moon", color: "#a78bfa", soft: "rgba(167,139,250,0.16)" },
];
export const PERIOD = Object.fromEntries(PERIODS.map((p) => [p.id, p]));

// The original fixed routine; their keys match the old true/false fields.
export const DEFAULT_STEPS = [
  { key: "am-cleanser", name: "Cleanser", period: "am" },
  { key: "am-moisturizer", name: "Moisturizer", period: "am" },
  { key: "am-sunscreen", name: "Sunscreen", period: "am" },
  { key: "pm-cleanser", name: "Cleanser", period: "pm" },
  { key: "pm-moisturizer", name: "Moisturizer", period: "pm" },
];
const LEGACY_FIELDS = {
  amCleanser: "am-cleanser",
  amMoisturizer: "am-moisturizer",
  amSunscreen: "am-sunscreen",
  pmCleanser: "pm-cleanser",
  pmMoisturizer: "pm-moisturizer",
};

export const STEP_SUGGESTIONS = ["Cleanser", "Toner", "Serum", "Moisturizer", "Sunscreen", "Retinol", "Exfoliant", "Eye cream", "Face mask", "Lip balm"];
export const CONCERNS = ["acne", "dryness", "oiliness", "redness", "irritation", "tan", "dark circles", "pores"];
export const CONDITIONS = [
  { value: 1, face: "😣", label: "Bad", color: "#f87171" },
  { value: 2, face: "😕", label: "Meh", color: "#fb923c" },
  { value: 3, face: "😐", label: "Okay", color: "#facc15" },
  { value: 4, face: "🙂", label: "Good", color: "#5eead4" },
  { value: 5, face: "😄", label: "Great", color: "#2dd4bf" },
];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function newKey() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Which steps were done in a log (new list, or the old true/false fields).
export function doneOf(log) {
  if (!log) return [];
  if (Array.isArray(log.doneSteps)) return log.doneSteps;
  return Object.entries(LEGACY_FIELDS)
    .filter(([field]) => log[field])
    .map(([, key]) => key);
}

export function conditionOf(log) {
  const n = parseInt(log?.condition, 10);
  return n >= 1 && n <= 5 ? n : null;
}

export function isScheduled(step, dateISO) {
  if (!step.days || step.days.length === 0) return true;
  return step.days.includes(parseISO(dateISO).getDay());
}

export function scheduledSteps(steps, dateISO, period) {
  return steps.filter((s) => (!period || s.period === period) && isScheduled(s, dateISO));
}

export function completion(steps, log, dateISO) {
  const done = new Set(doneOf(log));
  const part = (period) => {
    const list = scheduledSteps(steps, dateISO, period);
    return { total: list.length, done: list.filter((s) => done.has(s.key)).length };
  };
  const am = part("am");
  const pm = part("pm");
  const total = am.total + pm.total;
  const doneCount = am.done + pm.done;
  return { am, pm, total, done: doneCount, pct: total ? doneCount / total : 0, full: total > 0 && doneCount === total };
}

// Consecutive fully-completed days. Today only counts once it's complete,
// so the streak isn't "broken" in the middle of the day.
export function streak(steps, byDate) {
  const today = todayISO();
  let n = completion(steps, byDate[today], today).full ? 1 : 0;
  let d = addDays(parseISO(today), -1);
  for (let i = 0; i < 3650; i++) {
    const iso = isoDate(d);
    if (!completion(steps, byDate[iso], iso).full) break;
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function lastNDays(n, end = todayISO()) {
  const out = [];
  const e = parseISO(end);
  for (let i = n - 1; i >= 0; i--) out.push(isoDate(addDays(e, -i)));
  return out;
}

export function daysLabel(days) {
  if (!days || days.length === 0 || days.length === 7) return "Every day";
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAYS[d]).join(", ");
}

export function prettyDate(iso, opts = { weekday: "short", day: "numeric", month: "short" }) {
  return parseISO(iso).toLocaleDateString("en-IN", opts);
}
