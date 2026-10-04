// Turn a FitNotes spreadsheet export (Settings → Spreadsheet Export → Export
// Workouts) into LifeOS workouts, cardio entries and custom exercises.
// Columns: Date, Exercise, Category, Weight, Weight Unit, Reps, Distance,
// Distance Unit, Time, Comment. Older exports use "Weight (kgs)" / "Weight (lbs)".
import { LIBRARY } from "./lib";

// FitNotes name → the same exercise in the LifeOS library, so old numbers show
// up as "previous" when you train from your plan.
const SAME_AS = {
  "barbell squat": "Squat",
  "flat barbell bench press": "Bench Press",
  "incline barbell bench press": "Incline Bench Press",
  "decline barbell bench press": "Decline Bench Press",
  "flat dumbbell bench press": "Dumbbell Press",
  "incline dumbbell bench press": "Incline Dumbbell Press",
  "lying leg curl machine": "Leg Curl",
  "leg extension machine": "Leg Extension",
  "ez-bar preacher curl": "Preacher Curl",
  "cable overhead triceps extension": "Overhead Tricep Extension",
  "arnold dumbbell press": "Arnold Press",
  "lateral dumbbell raise": "Lateral Raise",
  "dumbbell hammer curl": "Hammer Curl",
  "pull up": "Pull-ups",
  "chin up": "Chin-ups",
  "push up": "Push-ups",
  "cable face pull": "Face Pull",
  "dumbbell shrugs": "Shrugs",
  "ez-bar skullcrusher": "Skull Crushers",
  "parallel bar triceps dip": "Dips",
  "standing calf raise machine": "Calf Raise",
  "crunch": "Crunches",
  "barbell row": "Barbell Row",
  "bent over row": "Barbell Row",
  "barbell curl": "Barbell Curl",
  "seated dumbbell press": "Dumbbell Shoulder Press",
  "plank": "Plank",
  "hanging": "Dead Hang",
  "barbell hip thrust": "Hip Thrust",
};

const CATEGORY_GROUP = { chest: "chest", shoulders: "shoulders", triceps: "triceps", back: "back", biceps: "biceps", forearms: "biceps", legs: "legs", abs: "core", core: "core" };
const SPLIT_OF = { chest: "Push", shoulders: "Push", triceps: "Push", back: "Pull", biceps: "Pull", legs: "Legs" };

// Small CSV reader that understands quoted fields.
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") row.push(field), (field = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

const num = (v) => {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};
const seconds = (t) => {
  const s = String(t || "").trim();
  if (!s) return 0;
  return s.split(":").map(Number).reduce((a, x) => a * 60 + (x || 0), 0);
};
const toKm = (d, unit) => {
  if (!d) return 0;
  const u = String(unit || "").toLowerCase();
  if (u === "km" || u === "kms") return d;
  if (u.startsWith("mi")) return d * 1.609;
  // "m" — but small values were almost certainly typed in km (e.g. 1.6 on a treadmill).
  return d < 50 ? d : d / 1000;
};
const r2 = (n) => Math.round(n * 100) / 100;

/**
 * @returns {{ sessions, cardio, customs, stats }} ready to save. `existing` is
 * the current LifeOS data, used to skip days that are already there.
 */
export function fromFitNotes(text, { sessions: have = [], cardio: haveCardio = [], customs = [] } = {}) {
  const rows = parseCSV(text.replace(/^﻿/, ""));
  if (rows.length < 2) throw new Error("That file is empty.");
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => head.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
  const C = {
    date: col("date"),
    ex: col("exercise"),
    cat: col("category"),
    w: col("weight"),
    wu: col("weight unit"),
    reps: col("reps"),
    dist: col("distance"),
    du: col("distance unit"),
    time: col("time"),
    note: col("comment", "notes"),
  };
  if (C.date < 0 || C.ex < 0) throw new Error("This doesn't look like a FitNotes export — it needs Date and Exercise columns.");
  // Weight column may be "Weight", "Weight (kgs)" or "Weight (lbs)"; its unit column is separate.
  C.w = head.findIndex((h) => h === "weight" || h.startsWith("weight ("));
  const lbsHeader = C.w >= 0 && head[C.w].includes("lb");

  const libName = (name) => {
    const n = name.trim();
    const mapped = SAME_AS[n.toLowerCase()];
    if (mapped) return mapped;
    const lib = LIBRARY.find((x) => x.exercise.toLowerCase() === n.toLowerCase());
    return lib ? lib.exercise : n;
  };

  // First pass: what each exercise is (type, group) across all of its rows.
  const info = {};
  for (const r of rows.slice(1)) {
    const name = (r[C.ex] || "").trim();
    if (!name) continue;
    const cat = (r[C.cat] || "").trim().toLowerCase();
    const i = (info[name] ||= { cat, weighted: false, reps: false, time: false, dist: false });
    if (num(r[C.w]) > 0) i.weighted = true;
    if (num(r[C.reps]) > 0) i.reps = true;
    if (seconds(r[C.time]) > 0) i.time = true;
    if (num(r[C.dist]) > 0) i.dist = true;
  }
  const kindOf = (name) => {
    const i = info[name];
    if (i.cat === "cardio") return "cardio";
    if (i.dist) return "distance_time";
    if (i.time && !i.reps) return "time";
    if (!i.weighted && i.reps) return "reps";
    return "weight_reps";
  };

  // Second pass: group by date, keeping exercise order.
  const days = new Map();
  for (const r of rows.slice(1)) {
    const date = (r[C.date] || "").trim();
    const name = (r[C.ex] || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name) continue;
    const kind = kindOf(name);
    const day = days.get(date) || { exercises: new Map(), cardio: new Map() };
    days.set(date, day);
    const lbs = lbsHeader || /lb/i.test(r[C.wu] || "");
    const weight = r2(num(r[C.w]) * (lbs ? 0.4536 : 1));
    const time = seconds(r[C.time]);
    const distance = r2(toKm(num(r[C.dist]), r[C.du]));
    const note = (r[C.note] || "").trim();
    if (kind === "cardio") {
      const c = day.cardio.get(name) || { activity: name.replace(/\s*\(.*\)\s*/, "") || name, duration: 0, distance: 0, notes: [] };
      c.duration += time / 60;
      c.distance += distance;
      if (note) c.notes.push(note);
      day.cardio.set(name, c);
      continue;
    }
    const ex = libName(name);
    const e = day.exercises.get(ex) || { exercise: ex, group: CATEGORY_GROUP[info[name].cat] || "", type: kind, note: "", superset: "", sets: [] };
    e.sets.push({ reps: Math.round(num(r[C.reps])), weight, done: true, warmup: false, rpe: null, time, distance, note });
    day.exercises.set(ex, e);
  }

  // Skip days already in LifeOS.
  const haveDates = new Set(have.map((s) => s.date));
  const haveCardioKeys = new Set(haveCardio.map((c) => `${c.date}|${String(c.activity).toLowerCase()}`));
  const sessions = [];
  const cardio = [];
  let skipped = 0;
  for (const [date, day] of [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const exercises = [...day.exercises.values()];
    if (exercises.length) {
      if (haveDates.has(date)) skipped++;
      else {
        const tally = {};
        for (const e of exercises) if (SPLIT_OF[e.group]) tally[SPLIT_OF[e.group]] = (tally[SPLIT_OF[e.group]] || 0) + e.sets.length;
        const splitDay = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
        sessions.push({ date, splitDay, exercises, duration: 0, notes: "Imported from FitNotes", createdAt: Date.parse(`${date}T12:00:00`) });
      }
    }
    for (const c of day.cardio.values()) {
      if (haveCardioKeys.has(`${date}|${c.activity.toLowerCase()}`)) continue;
      cardio.push({ date, activity: c.activity, duration: Math.round(c.duration), distance: r2(c.distance), source: "FitNotes", notes: c.notes.join(" · "), createdAt: Date.parse(`${date}T12:00:00`) });
    }
  }

  // Exercises LifeOS doesn't know yet become your own custom exercises.
  const known = new Set([...LIBRARY.map((x) => x.exercise.toLowerCase()), ...customs.map((c) => c.exercise.toLowerCase())]);
  const newCustoms = [];
  for (const s of sessions)
    for (const e of s.exercises) {
      const k = e.exercise.toLowerCase();
      if (known.has(k)) continue;
      known.add(k);
      newCustoms.push({ exercise: e.exercise, group: e.group, type: e.type });
    }

  const all = [...days.keys()].sort();
  return {
    sessions,
    cardio,
    customs: newCustoms,
    stats: {
      days: days.size,
      sets: sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.length, 0), 0),
      exercises: new Set(sessions.flatMap((s) => s.exercises.map((e) => e.exercise))).size,
      from: all[0],
      to: all[all.length - 1],
      skipped,
    },
  };
}
