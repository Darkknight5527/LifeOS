// Hair & Body care: routine scheduling, periodic tasks, completion, streaks.
import { addDays, isoDate, parseISO, todayISO } from "../../finances/lib";
import { PERIOD, PERIODS, WEEKDAYS, daysLabel, prettyDate, lastNDays } from "../skin/lib";

export { addDays, isoDate, parseISO, todayISO, PERIOD, PERIODS, WEEKDAYS, daysLabel, prettyDate, lastNDays };

export const AREAS = {
  hair: {
    id: "hair",
    label: "Hair",
    icon: "hair",
    dailyTitle: "Wash-day routine",
    suggestions: { daily: ["Oil massage", "Shampoo", "Conditioner", "Hair serum", "Leave-in cream", "Scalp tonic"], periodic: ["Haircut", "Hair mask", "Wash comb & brush", "Scalp scrub", "Hair spa"] },
  },
  body: {
    id: "body",
    label: "Body care",
    icon: "scissors",
    dailyTitle: "Daily routine",
    suggestions: {
      daily: ["Brush teeth", "Floss", "Clean tongue", "Mouthwash", "Shower", "Deodorant", "Body lotion", "Foot cream"],
      periodic: ["Beard trim", "Nails", "Underarm trim", "Body scrub", "Clean ears", "Nose hair trim", "Replace toothbrush", "Dental check-up"],
    },
  },
};

// Starting routines. Keys of periodic tasks match the old grooming-task ids so
// earlier history carries over.
export const DEFAULT_ITEMS = [
  // Hair: wash days Wednesday & Sunday, oil the night before
  { key: "h-oil", area: "hair", kind: "daily", name: "Oil massage", period: "pm", days: [2, 6] },
  { key: "h-shampoo", area: "hair", kind: "daily", name: "Shampoo", period: "am", days: [0, 3] },
  { key: "h-conditioner", area: "hair", kind: "daily", name: "Conditioner", period: "am", days: [0, 3] },
  { key: "h-cut", area: "hair", kind: "periodic", name: "Haircut", every: 35 },
  { key: "h-mask", area: "hair", kind: "periodic", name: "Hair mask", every: 14 },
  { key: "h-comb", area: "hair", kind: "periodic", name: "Wash comb & brush", every: 14 },
  // Body: daily hygiene
  { key: "b-brush-am", area: "body", kind: "daily", name: "Brush teeth", period: "am" },
  { key: "b-tongue", area: "body", kind: "daily", name: "Clean tongue", period: "am" },
  { key: "b-shower", area: "body", kind: "daily", name: "Shower", period: "am" },
  { key: "b-deo", area: "body", kind: "daily", name: "Deodorant", period: "am" },
  { key: "b-brush-pm", area: "body", kind: "daily", name: "Brush teeth", period: "pm" },
  { key: "b-floss", area: "body", kind: "daily", name: "Floss", period: "pm" },
  { key: "b-lotion", area: "body", kind: "daily", name: "Body lotion", period: "pm" },
  // Body: every few days / weeks / months
  { key: "facial-hair", area: "body", kind: "periodic", name: "Beard / facial hair trim", every: 7 },
  { key: "underarm", area: "body", kind: "periodic", name: "Underarm trim", every: 7 },
  { key: "nails", area: "body", kind: "periodic", name: "Nails (hands & feet)", every: 10 },
  { key: "pubic", area: "body", kind: "periodic", name: "Intimate grooming", every: 14 },
  { key: "b-scrub", area: "body", kind: "periodic", name: "Body scrub", every: 7 },
  { key: "bath-oil", area: "body", kind: "periodic", name: "Oil bath", every: 7 },
  { key: "b-ears", area: "body", kind: "periodic", name: "Clean ears", every: 14 },
  { key: "b-nose", area: "body", kind: "periodic", name: "Nose hair trim", every: 14 },
  { key: "b-brows", area: "body", kind: "periodic", name: "Eyebrow tidy", every: 21 },
  { key: "b-towels", area: "body", kind: "periodic", name: "Wash towels & bedsheets", every: 7 },
  { key: "b-toothbrush", area: "body", kind: "periodic", name: "Replace toothbrush", every: 90 },
  { key: "b-dentist", area: "body", kind: "periodic", name: "Dental check-up", every: 180 },
];

export const HAIR_FALL = [
  { value: "low", label: "Low", color: "#2dd4bf" },
  { value: "normal", label: "Normal", color: "#facc15" },
  { value: "high", label: "High", color: "#f87171" },
];
export const SCALP = ["healthy", "dry", "oily", "itchy", "dandruff", "flaky", "irritated"];

export const EVERY_PRESETS = [
  { value: 7, label: "Weekly" },
  { value: 14, label: "2 weeks" },
  { value: 30, label: "Monthly" },
  { value: 90, label: "3 months" },
];

export function newKey(area) {
  return `${area[0]}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function isScheduled(item, iso) {
  if (item.kind !== "daily") return false;
  if (!item.days || item.days.length === 0) return true;
  return item.days.includes(parseISO(iso).getDay());
}

export const dailyFor = (items, iso, period) => items.filter((i) => i.kind === "daily" && (!period || i.period === period) && isScheduled(i, iso));

export function completion(items, done, iso) {
  const part = (period) => {
    const list = dailyFor(items, iso, period);
    return { total: list.length, done: list.filter((i) => done.has(i.key)).length };
  };
  const am = part("am");
  const pm = part("pm");
  const total = am.total + pm.total;
  const d = am.done + pm.done;
  return { am, pm, total, done: d, pct: total ? d / total : 0, full: total > 0 && d === total };
}

// Days in a row with every scheduled daily step done. Days with nothing
// scheduled (e.g. a non-wash day for hair) don't break the streak.
export function streak(items, doneOn) {
  const today = todayISO();
  let n = 0;
  const c0 = completion(items, doneOn(today), today);
  if (c0.full) n = 1;
  let d = addDays(parseISO(today), -1);
  for (let i = 0; i < 3650; i++) {
    const iso = isoDate(d);
    const c = completion(items, doneOn(iso), iso);
    if (c.total > 0) {
      if (!c.full) break;
      n++;
    }
    d = addDays(d, -1);
  }
  return n;
}

const DAY = 86400000;
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / DAY);

// Status of a periodic task given the dates it was done (sorted, newest last).
export function periodicStatus(item, dates, today = todayISO()) {
  const last = dates.length ? dates[dates.length - 1] : null;
  if (!last) return { last: null, since: null, left: null, due: null, state: "never", frac: 1 };
  const since = daysBetween(last, today);
  const left = item.every - since;
  const due = isoDate(addDays(parseISO(last), item.every));
  const state = left < 0 ? "overdue" : left === 0 ? "today" : left <= Math.max(1, Math.round(item.every * 0.2)) ? "soon" : "ok";
  return { last, since, left, due, state, frac: Math.min(1, since / item.every) };
}

export function dueLabel(st) {
  if (st.state === "never") return "Not logged yet";
  if (st.state === "overdue") return `${-st.left} day${st.left === -1 ? "" : "s"} overdue`;
  if (st.state === "today") return "Due today";
  if (st.left === 1) return "Due tomorrow";
  if (st.left < 14) return `Due in ${st.left} days`;
  if (st.left < 60) return `Due in ${Math.round(st.left / 7)} weeks`;
  return `Due in ${Math.round(st.left / 30)} months`;
}

export const STATE_COLOR = { overdue: "#f87171", today: "#fbbf24", soon: "#fbbf24", ok: "#2dd4bf", never: "#9b9ba5" };

export function everyLabel(n) {
  if (n === 1) return "Every day";
  if (n % 30 === 0) return n === 30 ? "Monthly" : `Every ${n / 30} months`;
  if (n % 7 === 0) return n === 7 ? "Weekly" : `Every ${n / 7} weeks`;
  return `Every ${n} days`;
}

export function agoLabel(iso, today = todayISO()) {
  const n = daysBetween(iso, today);
  if (n === 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 14) return `${n} days ago`;
  if (n < 60) return `${Math.round(n / 7)} weeks ago`;
  return prettyDate(iso, { day: "numeric", month: "short", year: "numeric" });
}

// Next date (from tomorrow) when any daily item of this area is scheduled —
// for hair this is "next wash day".
export function nextScheduled(items, fromISO = todayISO()) {
  const daily = items.filter((i) => i.kind === "daily" && i.days?.length);
  if (!daily.length) return null;
  let d = parseISO(fromISO);
  for (let i = 1; i <= 7; i++) {
    d = addDays(d, 1);
    const iso = isoDate(d);
    if (daily.some((it) => isScheduled(it, iso))) return { iso, inDays: i };
  }
  return null;
}
