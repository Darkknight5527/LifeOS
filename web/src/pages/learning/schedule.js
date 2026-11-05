// Scheduling rules for the plan (pure functions, no React):
// - Study days are Monday–Saturday; Sunday is rest. Days inside a pause don't count.
// - One lesson per study day. A missed day never doubles up: every remaining
//   lesson simply moves on to the next study day.
// - Today's lesson is the first lesson not yet marked done (at any level).
// - A lesson is fully done only at L4; done below L4 counts as partial.
import { LESSONS } from "./plan.js";

const pad = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const todayISO = () => iso(new Date());
export const weekday = (s) => parse(s).getDay(); // 0 = Sunday

export const inPause = (s, pauses = []) => pauses.some((p) => p.from && p.to && s >= p.from && s <= p.to);
export const isStudyDay = (s, pauses = []) => weekday(s) !== 0 && !inPause(s, pauses);

/** The first study day on or after `s`. */
export function nextStudyDay(s, pauses = []) {
  let d = s;
  for (let i = 0; i < 4000 && !isStudyDay(d, pauses); i++) d = addDays(d, 1);
  return d;
}

/** Study days from `from` to `to` (both included). */
export function studyDaysBetween(from, to, pauses = []) {
  if (to < from) return 0;
  let n = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) if (isStudyDay(d, pauses)) n++;
  return n;
}

export const isDone = (p) => p?.status === "done";
export const isFull = (p) => isDone(p) && (p.level || 0) >= 4;

/**
 * Where every lesson sits.
 * progress: { [lessonId]: { status, level, doneOn, ... } }
 * Returns { dates: {id → YYYY-MM-DD}, today: lesson|null, todayDone: lesson done today|null,
 *           next: lesson after today's, finish: last lesson's date }.
 */
export function buildSchedule({ progress = {}, startDate, pauses = [], today = todayISO() }) {
  const dates = {};
  const remaining = [];
  for (const l of LESSONS) {
    const p = progress[l.id];
    if (isDone(p)) dates[l.id] = p.doneOn || "";
    else remaining.push(l);
  }
  // Lessons already finished today use up today's slot.
  const doneToday = LESSONS.filter((l) => isDone(progress[l.id]) && progress[l.id].doneOn === today);
  let day = today < startDate ? startDate : today;
  if (doneToday.length && day === today) day = addDays(day, 1);
  day = nextStudyDay(day, pauses);
  for (const l of remaining) {
    dates[l.id] = day;
    day = nextStudyDay(addDays(day, 1), pauses);
  }
  const first = remaining[0] || null;
  return {
    dates,
    current: first, // the next lesson to do
    isToday: Boolean(first && dates[first.id] === today), // is it scheduled for today?
    doneToday: doneToday[doneToday.length - 1] || null,
    finish: remaining.length ? dates[remaining[remaining.length - 1].id] : null,
    remaining: remaining.length,
  };
}

/** Lessons that should be done by `today` if nothing had been missed (counted from the start date). */
export const plannedBy = ({ startDate, pauses = [], today = todayISO() }) => Math.min(LESSONS.length, studyDaysBetween(startDate, today, pauses));

/**
 * Finish date at the pace actually achieved so far (lessons done per study day
 * since the start). Falls back to the on-plan finish until there is a week of data.
 */
export function paceFinish({ progress = {}, startDate, pauses = [], today = todayISO(), planFinish }) {
  const done = LESSONS.filter((l) => isDone(progress[l.id])).length;
  const remaining = LESSONS.length - done;
  if (!remaining) return { date: null, pace: null };
  const elapsed = studyDaysBetween(startDate, addDays(today, -1), pauses) + (LESSONS.some((l) => progress[l.id]?.doneOn === today) ? 1 : 0);
  if (elapsed < 6 || done === 0) return { date: planFinish, pace: null };
  const pace = Math.min(1, done / elapsed); // a lesson a day is the most the plan allows
  const need = Math.ceil(remaining / pace);
  let d = nextStudyDay(addDays(today, 1), pauses);
  for (let i = 1; i < need; i++) d = nextStudyDay(addDays(d, 1), pauses);
  return { date: d, pace };
}

/**
 * Study streak: consecutive study days with some study (a session or a lesson
 * finished). Sundays and paused days are skipped, never breaking it. Today
 * only counts once you've studied; until then the streak runs to yesterday.
 */
export function streak({ activeDays = new Set(), pauses = [], today = todayISO(), startDate }) {
  let n = 0;
  let d = today;
  if (!activeDays.has(d)) d = addDays(d, -1);
  for (let i = 0; i < 1000; i++) {
    if (startDate && d < startDate && !activeDays.has(d)) break;
    if (!isStudyDay(d, pauses)) {
      d = addDays(d, -1);
      continue;
    }
    if (!activeDays.has(d)) break;
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Monday of the week containing `s`. */
export function mondayOf(s) {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}

export const pretty = (s, opts = { weekday: "short", day: "numeric", month: "short" }) => (s ? parse(s).toLocaleDateString("en-IN", opts) : "");
