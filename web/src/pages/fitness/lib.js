// Fitness & Nutrition maths and defaults.
import { addDays, isoDate, parseISO, todayISO } from "../finances/lib";
import { MUSCLE_GROUPS } from "../physical/workouts/constants.js";

export { addDays, isoDate, parseISO, todayISO };

export const SPLITS = [
  { id: "push", label: "Push", color: "#60a5fa", focus: "Chest · shoulders · triceps" },
  { id: "pull", label: "Pull", color: "#a78bfa", focus: "Back · biceps" },
  { id: "legs", label: "Legs", color: "#34d399", focus: "Quads · hamstrings · glutes · calves" },
  { id: "rest", label: "Rest", color: "#9b9ba5", focus: "Recover — walk, stretch, sleep" },
];
export const SPLIT = Object.fromEntries(SPLITS.map((s) => [s.id, s]));
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Exercise library: name -> muscle group.
export const LIBRARY = (() => {
  const out = [];
  for (const groups of Object.values(MUSCLE_GROUPS)) for (const g of groups) for (const e of g.exercises) out.push({ exercise: e, group: g.id, label: g.label });
  return out;
})();
export const GROUP_LABEL = { chest: "Chest", shoulders: "Shoulders", triceps: "Triceps", back: "Back", biceps: "Biceps", legs: "Legs", core: "Core" };
export const groupOf = (name) => LIBRARY.find((x) => x.exercise.toLowerCase() === String(name).toLowerCase())?.group || "";

// Starting Push / Pull / Legs programme: [exercise, sets, reps].
export const DEFAULT_PROGRAM = {
  push: [["Bench Press", 4, 8], ["Overhead Press", 3, 8], ["Incline Dumbbell Press", 3, 10], ["Lateral Raise", 3, 15], ["Tricep Pushdown", 3, 12], ["Overhead Tricep Extension", 3, 12]],
  pull: [["Deadlift", 3, 5], ["Pull-ups", 3, 8], ["Barbell Row", 3, 8], ["Face Pull", 3, 15], ["Barbell Curl", 3, 10], ["Hammer Curl", 3, 12]],
  legs: [["Squat", 4, 6], ["Romanian Deadlift", 3, 8], ["Leg Press", 3, 10], ["Leg Curl", 3, 12], ["Calf Raise", 4, 15], ["Hanging Leg Raise", 3, 12]],
};
export function defaultProgram() {
  const out = {};
  for (const [k, list] of Object.entries(DEFAULT_PROGRAM)) out[k] = list.map(([exercise, sets, reps]) => ({ exercise, group: groupOf(exercise), sets, reps }));
  return out;
}

export const DEFAULT_SCHEDULE = ["rest", "push", "pull", "legs", "push", "pull", "legs"]; // Sun..Sat

export const MEALS = [
  { id: "breakfast", label: "Breakfast", icon: "sun" },
  { id: "lunch", label: "Lunch", icon: "flame" },
  { id: "snacks", label: "Snacks", icon: "sparkle" },
  { id: "dinner", label: "Dinner", icon: "moon" },
];
export const MACROS = [
  { id: "p", label: "Protein", unit: "g", color: "#60a5fa", kcal: 4 },
  { id: "c", label: "Carbs", unit: "g", color: "#fbbf24", kcal: 4 },
  { id: "f", label: "Fat", unit: "g", color: "#f472b6", kcal: 9 },
];

export const ACTIVITY = [
  { value: 1.2, label: "Desk job, little exercise" },
  { value: 1.375, label: "Light: 1–3 workouts / week" },
  { value: 1.55, label: "Moderate: 3–5 workouts / week" },
  { value: 1.725, label: "Very active: 6–7 workouts / week" },
];
export const GOALS = [
  { value: "lose", label: "Lose fat", delta: -0.2 },
  { value: "maintain", label: "Maintain", delta: 0 },
  { value: "gain", label: "Build muscle", delta: 0.1 },
];

/* ---------- strength maths ---------- */
// Epley estimate of one-rep max.
export const e1rm = (w, r) => (w > 0 && r > 0 ? (r === 1 ? w : w * (1 + r / 30)) : 0);
export const setVolume = (s) => (s.weight || 0) * (s.reps || 0);
export function sessionVolume(session) {
  let v = 0;
  for (const ex of session.exercises || []) for (const s of ex.sets || []) if (s.done !== false) v += setVolume(s);
  return v;
}
export function bestSet(sets) {
  let best = null;
  for (const s of sets || []) if (s.done !== false && e1rm(s.weight, s.reps) > (best ? e1rm(best.weight, best.reps) : 0)) best = s;
  return best;
}

/* ---------- nutrition maths ---------- */
// Mifflin–St Jeor BMR → TDEE → goal calories; protein ~1.8 g/kg (2.0 when cutting).
export function computeTargets(p) {
  if (!p?.weightKg || !p?.heightCm || !p?.age) return null;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "female" ? -161 : 5);
  const tdee = bmr * (p.activity || 1.375);
  const goal = GOALS.find((g) => g.value === p.goal) || GOALS[1];
  const calories = Math.round((tdee * (1 + goal.delta)) / 10) * 10;
  const protein = Math.round(p.weightKg * (p.goal === "lose" ? 2.0 : 1.8));
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const water = Math.round((p.weightKg * 35) / 250) * 250;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs, fat, water };
}

export function dayTotals(log) {
  const t = { cal: 0, p: 0, c: 0, f: 0 };
  for (const e of log?.entries || []) {
    t.cal += e.cal || 0;
    t.p += e.p || 0;
    t.c += e.c || 0;
    t.f += e.f || 0;
  }
  return t;
}

/* ---------- body maths ---------- */
// Exponentially smoothed weight trend (like Happy Scale / MacroFactor).
export function weightTrend(logs) {
  const pts = logs.filter((l) => l.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
  let t = null;
  return pts.map((l) => {
    t = t == null ? l.weight : t + 0.1 * (l.weight - t);
    return { date: l.date, weight: l.weight, trend: Math.round(t * 100) / 100 };
  });
}

export function lastNDays(n, end = todayISO()) {
  const out = [];
  const e = parseISO(end);
  for (let i = n - 1; i >= 0; i--) out.push(isoDate(addDays(e, -i)));
  return out;
}
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
export const prettyDate = (iso, opts = { weekday: "short", day: "numeric", month: "short" }) => parseISO(iso).toLocaleDateString("en-IN", opts);
export const r1 = (n) => Math.round(n * 10) / 10;
export const fmtKg = (n) => `${r1(n).toLocaleString("en-IN")} kg`;
export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
