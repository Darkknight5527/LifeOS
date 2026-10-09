// Train: shared constants and helpers for the Train views.
import { useMemo } from "react";
import { useFit } from "../FitContext.jsx";
import { bestSet, e1rm, fmtTime, groupOf, newId, r1, todayISO, typeOf, working } from "../lib";

export const ACTIVE_KEY = "lifeos_fit_active_v1";
export const H = "lg:h-[calc(100dvh-178px)] lg:min-h-[380px]";
export const CARDIO = ["Walking", "Running", "Cycling", "Swimming", "Football", "Badminton", "Cricket", "Yoga", "Stretching", "HIIT", "Other"];
export const RPES = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10];
export const LETTERS = "ABCDEFGH";

export const fmtDur = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
};
export const kg = (n) => `${r1(n).toLocaleString("en-IN")} kg`;
export const volumeOf = (session) => (session.exercises || []).reduce((a, e) => a + working(e.sets).reduce((b, s) => b + (s.weight || 0) * (s.reps || 0), 0), 0);
export const counts = (s) => s.done !== false && !s.warmup && ((s.reps || 0) > 0 || (s.weight || 0) > 0 || (s.time || 0) > 0 || (s.distance || 0) > 0);

export function setLabel(s, type) {
  if (type === "time") return fmtTime(s.time);
  if (type === "distance_time") return `${s.distance || 0} km${s.time ? ` · ${fmtTime(s.time)}` : ""}`;
  if (type === "reps") return s.weight ? `+${s.weight}×${s.reps}` : `${s.reps} reps`;
  return `${s.weight}×${s.reps}`;
}

/* ---------- history helpers ---------- */
export function useExerciseHistory() {
  const { sessions } = useFit();
  return useMemo(() => {
    // exercise -> [{date, sets, best, e1rm, id, type}] oldest first (working sets only)
    const m = {};
    for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0))) {
      for (const ex of s.exercises || []) {
        const sets = (ex.sets || []).filter(counts);
        if (!sets.length) continue;
        const best = bestSet(sets);
        (m[ex.exercise] ||= []).push({ date: s.date, sets, best, e1rm: best ? e1rm(best.weight, best.reps) : 0, id: s._id, type: ex.type || "weight_reps", group: ex.group || "" });
      }
    }
    return m;
  }, [sessions]);
}

// Which (sessionId, exercise, setIndex) were PRs at the time (best est. 1RM so far).
export function usePRSets() {
  const { sessions } = useFit();
  return useMemo(() => {
    const best = {};
    const flags = new Set();
    for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0))) {
      for (const ex of s.exercises || []) {
        (ex.sets || []).forEach((set, i) => {
          if (!counts(set) || !(set.weight > 0)) return;
          const v = e1rm(set.weight, set.reps);
          if (best[ex.exercise] != null && v > best[ex.exercise] + 0.01) flags.add(`${s._id}|${ex.exercise}|${i}`);
          if (best[ex.exercise] == null || v > best[ex.exercise]) best[ex.exercise] = v;
        });
      }
    }
    return flags;
  }, [sessions]);
}

export function lastTrained(sessions) {
  const m = {};
  for (const s of sessions) for (const ex of s.exercises || []) {
    const g = ex.group || groupOf(ex.exercise);
    if (g && (!m[g] || s.date > m[g])) m[g] = s.date;
  }
  return m;
}

// Build a session for the logger from a list of {exercise, group, type, sets, reps}.
export function makeSession({ split, list, history, customs, date = todayISO(), fromSession = null, editingId = null }) {
  const exercises = fromSession
    ? fromSession.exercises.map((e) => ({
        id: newId(),
        exercise: e.exercise,
        group: e.group || groupOf(e.exercise),
        type: e.type || typeOf(e.exercise, customs),
        note: editingId ? e.note || "" : "",
        superset: e.superset || "",
        sets: (e.sets || []).map((s) => ({ weight: s.weight ?? "", reps: s.reps ?? "", time: s.time || "", distance: s.distance || "", warmup: !!s.warmup, rpe: s.rpe ?? null, note: editingId ? s.note || "" : "", done: !!editingId })),
      }))
    : list.map((p) => {
        const prev = history[p.exercise]?.slice(-1)[0];
        return {
          id: newId(),
          exercise: p.exercise,
          group: p.group || groupOf(p.exercise),
          type: p.type || typeOf(p.exercise, customs),
          note: "",
          superset: "",
          sets: Array.from({ length: p.sets || 3 }, (_, i) => ({ weight: prev?.sets[i]?.weight ?? prev?.sets.slice(-1)[0]?.weight ?? "", reps: "", time: "", distance: "", target: p.reps, warmup: false, rpe: null, note: "", done: false })),
        };
      });
  return { split, date, startedAt: Date.now(), note: editingId ? fromSession?.notes || "" : "", editingId, exercises };
}

export function openSessionLater(session) {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Today                                                               */
/* ------------------------------------------------------------------ */
