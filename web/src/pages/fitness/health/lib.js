// Health: the common blood tests with typical adult reference ranges, plus
// helpers for medicine schedules and regular check-ups.
// Ranges are typical values used by Indian labs. Your own lab's printed range
// always wins — it can be typed in per result.
import { addDays, isoDate, parseISO, todayISO } from "../lib";

export { todayISO };

// [key, name, unit, low, high, group, female override {low, high}, note]
// low or high may be null (only one side matters).
const T = [
  // Sugar
  ["fbs", "Fasting blood sugar", "mg/dL", 70, 99, "Sugar", null, "100–125 is prediabetes, 126+ diabetes"],
  ["ppbs", "Post-meal sugar (PPBS)", "mg/dL", null, 139, "Sugar", null, "140–199 is prediabetes"],
  ["rbs", "Random blood sugar", "mg/dL", null, 139, "Sugar"],
  ["hba1c", "HbA1c", "%", null, 5.6, "Sugar", null, "5.7–6.4 is prediabetes, 6.5+ diabetes"],
  ["insulin", "Fasting insulin", "µIU/mL", 2, 25, "Sugar"],
  // Lipids
  ["chol", "Total cholesterol", "mg/dL", null, 199, "Lipid profile"],
  ["ldl", "LDL cholesterol", "mg/dL", null, 99, "Lipid profile", null, "Lower is better; 130+ is high"],
  ["hdl", "HDL cholesterol", "mg/dL", 40, null, "Lipid profile", { low: 50, high: null }, "Higher is better"],
  ["tg", "Triglycerides", "mg/dL", null, 149, "Lipid profile"],
  ["vldl", "VLDL", "mg/dL", null, 30, "Lipid profile"],
  // Blood count
  ["hb", "Haemoglobin", "g/dL", 13, 17, "Blood count (CBC)", { low: 12, high: 15 }],
  ["rbc", "RBC count", "million/µL", 4.5, 5.5, "Blood count (CBC)", { low: 3.8, high: 4.8 }],
  ["wbc", "WBC (total count)", "×10³/µL", 4, 11, "Blood count (CBC)"],
  ["plt", "Platelets", "×10³/µL", 150, 410, "Blood count (CBC)"],
  ["hct", "Haematocrit (PCV)", "%", 40, 50, "Blood count (CBC)", { low: 36, high: 46 }],
  ["mcv", "MCV", "fL", 83, 101, "Blood count (CBC)"],
  ["esr", "ESR", "mm/hr", null, 15, "Blood count (CBC)", { low: null, high: 20 }],
  // Thyroid
  ["tsh", "TSH", "µIU/mL", 0.4, 4.0, "Thyroid"],
  ["ft4", "Free T4", "ng/dL", 0.8, 1.8, "Thyroid"],
  ["ft3", "Free T3", "pg/mL", 2.3, 4.2, "Thyroid"],
  // Liver
  ["alt", "SGPT (ALT)", "U/L", null, 45, "Liver (LFT)", { low: null, high: 35 }],
  ["ast", "SGOT (AST)", "U/L", null, 40, "Liver (LFT)", { low: null, high: 35 }],
  ["alp", "Alkaline phosphatase", "U/L", 44, 147, "Liver (LFT)"],
  ["ggt", "GGT", "U/L", null, 55, "Liver (LFT)", { low: null, high: 38 }],
  ["bili", "Total bilirubin", "mg/dL", 0.3, 1.2, "Liver (LFT)"],
  ["alb", "Albumin", "g/dL", 3.5, 5.0, "Liver (LFT)"],
  // Kidney
  ["creat", "Creatinine", "mg/dL", 0.7, 1.3, "Kidney (KFT)", { low: 0.5, high: 1.1 }],
  ["urea", "Blood urea", "mg/dL", 15, 40, "Kidney (KFT)"],
  ["uric", "Uric acid", "mg/dL", 3.5, 7.2, "Kidney (KFT)", { low: 2.6, high: 6.0 }],
  ["na", "Sodium", "mmol/L", 135, 145, "Kidney (KFT)"],
  ["k", "Potassium", "mmol/L", 3.5, 5.1, "Kidney (KFT)"],
  ["ca", "Calcium", "mg/dL", 8.5, 10.5, "Kidney (KFT)"],
  // Vitamins & iron
  ["vitd", "Vitamin D (25-OH)", "ng/mL", 30, 100, "Vitamins & iron", null, "20–29 is insufficient, under 20 deficient"],
  ["b12", "Vitamin B12", "pg/mL", 200, 900, "Vitamins & iron"],
  ["ferritin", "Ferritin", "ng/mL", 30, 400, "Vitamins & iron", { low: 15, high: 150 }],
  ["iron", "Serum iron", "µg/dL", 60, 170, "Vitamins & iron"],
  // Other
  ["crp", "CRP", "mg/L", null, 5, "Inflammation"],
  ["hscrp", "hs-CRP", "mg/L", null, 1, "Inflammation", null, "1–3 average heart risk, 3+ high"],
];

export const TESTS = T.map(([key, name, unit, low, high, group, female, note]) => ({ key, name, unit, low, high, group, female, note: note || "" }));
export const TEST = Object.fromEntries(TESTS.map((t) => [t.key, t]));
export const GROUPS = [...new Set(TESTS.map((t) => t.group))];

/** The range for a result: the lab's own if typed, else the typical one (by sex). */
export function rangeOf(r, sex) {
  const t = TEST[r.key];
  const has = (v) => v !== null && v !== undefined && v !== "";
  if (has(r.low) || has(r.high)) return { low: has(r.low) ? Number(r.low) : null, high: has(r.high) ? Number(r.high) : null, own: true };
  if (!t) return { low: null, high: null };
  const base = sex === "female" && t.female ? t.female : t;
  return { low: base.low, high: base.high };
}

/** "low" | "high" | "ok" | "" (no range) */
export function flagOf(r, sex) {
  const v = Number(r.value);
  if (r.value === "" || r.value == null || !Number.isFinite(v)) return "";
  const { low, high } = rangeOf(r, sex);
  if (low == null && high == null) return "";
  if (low != null && v < low) return "low";
  if (high != null && v > high) return "high";
  return "ok";
}

export const rangeText = ({ low, high }) => (low != null && high != null ? `${low}–${high}` : low != null ? `≥ ${low}` : high != null ? `≤ ${high}` : "");
export const FLAG = { low: { label: "Low", color: "#fbbf24" }, high: { label: "High", color: "#f87171" }, ok: { label: "Normal", color: "#34d399" } };

/** Every value of one test across reports, oldest first. */
export function seriesOf(reports, key) {
  const out = [];
  for (const rep of reports) for (const r of rep.results || []) if (r.key === key && r.value !== "" && Number.isFinite(Number(r.value))) out.push({ date: rep.date, value: Number(r.value), r });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- medicines ----------
export const FORMS = ["tablet", "capsule", "syrup", "drops", "injection", "cream", "inhaler", "other"];
export const FOOD = [
  { value: "", label: "Any time" },
  { value: "before", label: "Before food" },
  { value: "with", label: "With food" },
  { value: "after", label: "After food" },
];
export const WEEK = ["S", "M", "T", "W", "T", "F", "S"];
export const WEEK_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Is this medicine scheduled on that day (ignores "as needed" ones)? */
const startOf = (m) => m.start || (m.createdAt ? isoDate(new Date(m.createdAt)) : "");
export function onDay(m, iso) {
  if (!m.active || !m.times?.length) return false;
  const start = startOf(m);
  if (start && iso < start) return false;
  if (m.end && iso > m.end) return false;
  return !m.days?.length || m.days.includes(parseISO(iso).getDay());
}
export const doseKey = (m, time) => `${m._id}@${time}`;

/** Today's doses in time order: [{ med, time, key, state }]. */
export function dosesFor(meds, log, iso) {
  const out = [];
  for (const m of meds) if (onDay(m, iso)) for (const t of [...m.times].sort()) out.push({ med: m, time: t, key: doseKey(m, t), state: log?.doses?.[doseKey(m, t)]?.status || "" });
  return out.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name));
}

export function scheduleText(m) {
  if (!m.times?.length) return "As needed";
  const t = m.times.map(time12).join(", ");
  const d = !m.days?.length || m.days.length === 7 ? "Daily" : m.days.map((x) => WEEK_LONG[x]).join(", ");
  return `${d} · ${t}`;
}
export function time12(hhmm) {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
/** How well you've kept to the schedule over the last n days (doses taken / due), or null. */
export function adherence(meds, logs, n = 7, end = todayISO()) {
  let due = 0;
  let taken = 0;
  const byDate = Object.fromEntries(logs.map((l) => [l.date, l]));
  for (let i = 0; i < n; i++) {
    const iso = isoDate(addDays(parseISO(end), -i));
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    for (const d of dosesFor(meds, byDate[iso], iso)) {
      if (i === 0 && end === todayISO() && d.time > hm && !d.state) continue; // later today: not due yet
      due++;
      if (d.state === "taken") taken++;
    }
  }
  return due ? { due, taken, pct: Math.round((taken / due) * 100) } : null;
}

// ---------- visits & regular check-ups ----------
export const KINDS = [
  { value: "doctor", label: "Doctor", icon: "info" },
  { value: "blood", label: "Blood test", icon: "drop" },
  { value: "dentist", label: "Dentist", icon: "sparkle" },
  { value: "eye", label: "Eye", icon: "sun" },
  { value: "scan", label: "Scan / X-ray", icon: "grid" },
  { value: "vaccine", label: "Vaccine", icon: "check" },
  { value: "therapy", label: "Therapy", icon: "brain" },
  { value: "other", label: "Other", icon: "clipboard" },
];
export const KIND = Object.fromEntries(KINDS.map((k) => [k.value, k]));

export const ISSUE_KINDS = [
  { value: "condition", label: "Condition" },
  { value: "symptom", label: "Symptom" },
  { value: "injury", label: "Injury" },
  { value: "allergy", label: "Allergy" },
];
export const ISSUE_STATUS = [
  { value: "active", label: "Active", color: "#f87171" },
  { value: "managed", label: "Managed", color: "#fbbf24" },
  { value: "resolved", label: "Resolved", color: "#34d399" },
];
export const STATUS = Object.fromEntries(ISSUE_STATUS.map((s) => [s.value, s]));

export const addMonths = (iso, n) => {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + Number(n || 0));
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return isoDate(d);
};

/** Last time a regular check-up was done: by hand, or a done visit / report linked to it. */
export function lastDoneOf(plan, visits, reports) {
  const dates = [plan.lastDone, ...visits.filter((v) => v.planId === plan._id && v.status === "done").map((v) => v.date), ...reports.filter((r) => r.planId === plan._id).map((r) => r.date)].filter(Boolean);
  return dates.sort().pop() || "";
}
/** { last, due, days } — days until due (negative = overdue); due "" = never done. */
export function planStatus(plan, visits, reports, today = todayISO()) {
  const last = lastDoneOf(plan, visits, reports);
  const due = last ? addMonths(last, plan.everyMonths) : "";
  const days = due ? Math.round((parseISO(due) - parseISO(today)) / 86400000) : null;
  return { last, due, days };
}

export const SUGGESTED_PLANS = [
  { title: "Full body check-up", kind: "blood", everyMonths: 12 },
  { title: "Lipid profile & sugar (HbA1c)", kind: "blood", everyMonths: 6 },
  { title: "Vitamin D & B12", kind: "blood", everyMonths: 12 },
  { title: "Dental check-up", kind: "dentist", everyMonths: 6 },
  { title: "Eye test", kind: "eye", everyMonths: 24 },
];

export function relDays(days) {
  if (days == null) return "";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${-days} days ago`;
  if (days < 45) return `in ${days} days`;
  return `in ${Math.round(days / 30)} months`;
}
export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
