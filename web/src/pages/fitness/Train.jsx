// Train: today's plan, a live workout logger (Strong / Hevy / FitNotes style)
// with rest timer, warm-ups, RPE, notes, supersets and live PRs; history with
// edit / repeat / CSV export; progress graphs, rep maxes and goals (FitNotes /
// JEFIT); muscle recovery (Fitbod); programme and custom exercises.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFit } from "./FitContext.jsx";
import {
  EX_TYPES,
  GROUP_LABEL,
  REP_MAX,
  SPLIT,
  SPLITS,
  WEEKDAYS,
  addDays,
  bestSet,
  daysBetween,
  e1rm,
  fmtTime,
  groupOf,
  isoDate,
  lastNDays,
  metricsFor,
  newId,
  parseISO,
  prettyDate,
  r1,
  repMaxes,
  todayISO,
  trendLine,
  typeOf,
  working,
} from "./lib";
import { Bars, ExercisePicker, LineChart, NumberBox, kicker } from "./fit-ui.jsx";
import { PlateCalculator, TimersSheet } from "./Tools.jsx";
import { daysInMonth, monthKey, monthLabel, shiftMonth } from "../finances/lib";
import { EmptyState, FinCard, GhostButton, Icon, IconButton, Pill, PrimaryButton, Ring, Segmented, Sheet, TextField } from "../finances/fin-ui.jsx";
import { useToast } from "../../components/Toast.jsx";

export const ACTIVE_KEY = "lifeos_fit_active_v1";
const H = "lg:h-[calc(100dvh-178px)] lg:min-h-[380px]";
const CARDIO = ["Walking", "Running", "Cycling", "Swimming", "Football", "Badminton", "Cricket", "Yoga", "Stretching", "HIIT", "Other"];
const RPES = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const LETTERS = "ABCDEFGH";

const fmtDur = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
};
const kg = (n) => `${r1(n).toLocaleString("en-IN")} kg`;
const volumeOf = (session) => (session.exercises || []).reduce((a, e) => a + working(e.sets).reduce((b, s) => b + (s.weight || 0) * (s.reps || 0), 0), 0);
const counts = (s) => s.done !== false && !s.warmup && ((s.reps || 0) > 0 || (s.weight || 0) > 0 || (s.time || 0) > 0 || (s.distance || 0) > 0);

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
        (m[ex.exercise] ||= []).push({ date: s.date, sets, best, e1rm: best ? e1rm(best.weight, best.reps) : 0, id: s._id, type: ex.type || "weight_reps" });
      }
    }
    return m;
  }, [sessions]);
}

// Which (sessionId, exercise, setIndex) were PRs at the time (best est. 1RM so far).
function usePRSets() {
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

function lastTrained(sessions) {
  const m = {};
  for (const s of sessions) for (const ex of s.exercises || []) {
    const g = ex.group || groupOf(ex.exercise);
    if (g && (!m[g] || s.date > m[g])) m[g] = s.date;
  }
  return m;
}

// Build a session for the logger from a list of {exercise, group, type, sets, reps}.
function makeSession({ split, list, history, customs, date = todayISO(), fromSession = null, editingId = null }) {
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
export function TrainToday() {
  const fit = useFit();
  const today = todayISO();
  const [active, setActive] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [pickSplit, setPickSplit] = useState(null);
  const [cardioOpen, setCardioOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [tool, setTool] = useState(null); // "plates" | "timers"
  const history = useExerciseHistory();
  const customs = fit.settings?.customExercises || [];
  const goals = fit.settings?.goals || {};
  const schedule = fit.settings?.schedule || [];
  const todaySplit = schedule[new Date().getDay()] || "rest";
  const split = pickSplit || todaySplit;
  const plan = fit.settings?.program?.[split] || [];

  useEffect(() => {
    try {
      active ? localStorage.setItem(ACTIVE_KEY, JSON.stringify(active)) : localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  }, [active]);

  const start = (s = split, date = today) => setActive(makeSession({ split: s, list: fit.settings?.program?.[s] || [], history, customs, date }));

  if (active) return <WorkoutSession active={active} setActive={setActive} history={history} onFinished={setSummary} />;

  const ws = addDays(parseISO(today), -((new Date().getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => isoDate(addDays(ws, i)));
  const doneDates = new Set(fit.sessions.map((s) => s.date));
  const cardioDates = new Set(fit.cardio.map((c) => c.date));
  const weekSessions = fit.sessions.filter((s) => s.date >= week[0] && s.date <= week[6]);
  const weekVol = weekSessions.reduce((a, s) => a + volumeOf(s), 0);
  const weekCardio = fit.cardio.filter((c) => c.date >= week[0] && c.date <= week[6]).reduce((a, c) => a + (c.duration || 0), 0);
  const doneToday = fit.sessions.find((s) => s.date === today);
  const sp = SPLIT[split] || SPLIT.rest;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
        <section className="relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6cb2ff] via-[#3b82f6] to-[#1d4ed8] p-6 shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3 text-[15px] font-semibold text-white/90">
              {prettyDate(today, { weekday: "long", day: "numeric", month: "long" })}
              <span className="rounded-full bg-black/15 px-3 py-1 text-[13px] font-bold">{weekSessions.length} this week</span>
            </div>
            <div className="mt-1 text-[32px] font-extrabold leading-tight tracking-tight">{split === "rest" ? "Rest day" : `${sp.label} day`}</div>
            <div className="text-[14px] text-white/85">{doneToday ? `Done: ${doneToday.splitDay || "workout"} · ${kg(volumeOf(doneToday))} lifted` : sp.focus}</div>
            <div className="mt-3 flex gap-1.5">
              {week.map((iso, i) => (
                <div key={iso} className="flex flex-1 flex-col items-center gap-1">
                  <span className={`grid h-7 w-full place-items-center rounded-lg text-[11px] font-bold ${doneDates.has(iso) ? "bg-white text-[#1d4ed8]" : cardioDates.has(iso) ? "bg-white/35" : iso === today ? "bg-black/25 ring-1 ring-white/60" : "bg-black/15 text-white/60"}`}>
                    {doneDates.has(iso) ? <Icon name="check" size={14} stroke={3} /> : (SPLIT[schedule[(i + 1) % 7]]?.label || "")[0]}
                  </span>
                  <span className="text-[10.5px] text-white/70">{WEEKDAYS[(i + 1) % 7].slice(0, 2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-black/15 p-1" role="radiogroup" aria-label="Workout">
              {SPLITS.filter((s) => s.id !== "rest").map((s) => {
                const on = split === s.id;
                return (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPickSplit(s.id)}
                    className={`relative rounded-xl py-2 text-[14.5px] font-bold transition ${on ? "bg-white text-[#1d4ed8] shadow" : "text-white/85 hover:bg-white/10"}`}
                  >
                    {s.label}
                    {todaySplit === s.id && <span className={`absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full ${on ? "bg-[#1d4ed8]" : "bg-white/70"}`} title="Today's plan" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={() => split !== "rest" && start()}
                disabled={split === "rest"}
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-2.5 text-[15px] font-bold text-[#1d4ed8] shadow-lg transition hover:brightness-95 active:scale-[0.99] disabled:bg-white/25 disabled:text-white/85 disabled:shadow-none"
              >
                <Icon name="dumbbell" size={18} stroke={2.2} />
                <span className="truncate">{split === "rest" ? "Pick a workout above" : doneToday ? "Start another workout" : "Start workout"}</span>
              </button>
              <button onClick={() => setTool("plates")} title="Plate calculator" className="rounded-2xl bg-black/15 px-3 text-[13px] font-semibold hover:bg-black/25">Plates</button>
              <button onClick={() => setTool("timers")} title="Timers: stopwatch, EMOM, AMRAP, Tabata" className="rounded-2xl bg-black/15 px-3 text-[13px] font-semibold hover:bg-black/25">Timers</button>
              <button onClick={() => start(split !== "rest" ? split : "push", isoDate(addDays(parseISO(today), -1)))} title="Log a workout for an earlier day (change the date at the top)" className="rounded-2xl bg-black/15 px-3 text-[13px] font-semibold hover:bg-black/25">Past</button>
            </div>
          </div>
        </section>
        <Recovery />
      </div>

      <FinCard
        delay={40}
        className={`flex flex-col ${H}`}
        title={<span className="flex items-center gap-2"><Icon name="list" size={15} /> {split === "rest" ? "Rest day" : `${sp.label} plan`}</span>}
        action={
          split !== "rest" && (
            <button onClick={() => setTool("add")} className="flex items-center gap-1.5 rounded-xl bg-fin-accent/15 px-3 py-1.5 text-[13.5px] font-semibold text-fin-accent hover:bg-fin-accent/25" title={`Add an exercise to your ${sp.label} plan`}>
              <Icon name="plus" size={14} stroke={2.6} /> Add exercise
            </button>
          )
        }
      >
        {split === "rest" ? (
          <div className="rounded-2xl bg-fin-input p-4 text-[14px] leading-relaxed text-white/75">
            Muscles grow while you rest. A walk, some stretching and 7–8 hours of sleep count as training today. Pick Push, Pull or Legs on the left if you still want to lift.
          </div>
        ) : (
          <div className="fin-scroll -mx-1 space-y-1.5 px-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {plan.map((p) => {
              const h = history[p.exercise];
              const last = h?.slice(-1)[0];
              const type = p.type || typeOf(p.exercise, customs);
              const pr = h ? Math.max(...h.map((x) => x.e1rm)) : 0;
              const goal = goals[p.exercise];
              return (
                <div key={p.exercise} className="rounded-2xl bg-fin-input px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold">{p.exercise}</span>
                    <span className="tabular shrink-0 text-[13px] text-fin-muted">{p.sets} × {p.reps}</span>
                  </div>
                  <div className="mt-0.5 flex justify-between gap-2 text-[12.5px] text-fin-faint">
                    <span className="truncate">{last ? `Last: ${setLabel(last.best || last.sets[0], type)} · ${prettyDate(last.date, { day: "numeric", month: "short" })}` : "No history yet"}</span>
                    {goal ? <span className="shrink-0 text-amber-300">Goal {goal.weight}×{goal.reps}</span> : pr > 0 && <span className="shrink-0 text-fin-accent">1RM ~{Math.round(pr)} kg</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FinCard>

      <div className="space-y-5 lg:col-span-2 lg:space-y-4 xl:col-span-1">
        <FinCard title="This week" delay={80}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Workouts", weekSessions.length],
              ["Lifted", weekVol >= 1000 ? `${r1(weekVol / 1000)} t` : kg(weekVol)],
              ["Cardio", `${weekCardio} min`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-fin-input px-2 py-3">
                <div className="text-[12px] text-fin-muted">{k}</div>
                <div className="tabular mt-0.5 text-[19px] font-extrabold">{v}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setCardioOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-fin-tile py-2.5 text-[14px] font-semibold transition hover:bg-[#30303a]">
            <Icon name="plus" size={15} stroke={2.4} /> Log cardio or sport
          </button>
        </FinCard>
        <RecentPRs history={history} />
      </div>
      <CardioSheet open={cardioOpen} onClose={() => setCardioOpen(false)} />
      <SummarySheet summary={summary} onClose={() => setSummary(null)} />
      <PlateCalculator open={tool === "plates"} onClose={() => setTool(null)} />
      <TimersSheet open={tool === "timers"} onClose={() => setTool(null)} />
      <ExercisePicker
        open={tool === "add"}
        onClose={() => setTool(null)}
        customs={customs}
        onCreate={(x) => fit.saveSettings({ customExercises: [...customs, x] }, `Created ${x.exercise}`)}
        exclude={plan.map((p) => p.exercise)}
        onPick={(x) => {
          fit.saveSettings({ program: { ...(fit.settings?.program || {}), [split]: [...plan, { exercise: x.exercise, group: x.group || groupOf(x.exercise), type: x.type, sets: 3, reps: 10 }] } }, `Added ${x.exercise} to ${sp.label}`);
          setTool(null);
        }}
      />
    </div>
  );
}

// Fitbod-style recovery: how rested each muscle group is.
function Recovery() {
  const { sessions } = useFit();
  const last = lastTrained(sessions);
  const today = todayISO();
  const groups = ["chest", "shoulders", "triceps", "back", "biceps", "legs", "core"];
  return (
    <FinCard title="Muscle recovery" delay={60}>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4">
        {groups.map((g) => {
          const d = last[g] ? daysBetween(last[g], today) : null;
          const pct = d == null ? 1 : Math.min(1, d / 2.5);
          const color = pct >= 1 ? "#34d399" : pct >= 0.5 ? "#fbbf24" : "#f87171";
          return (
            <div key={g} className="flex flex-col items-center gap-1" title={d == null ? "Not trained yet" : `Last trained ${d === 0 ? "today" : `${d} day${d === 1 ? "" : "s"} ago`}`}>
              <Ring value={pct} max={1} color={color} size={40} stroke={5}>
                <span className="tabular text-[10.5px] font-bold">{Math.round(pct * 100)}</span>
              </Ring>
              <span className="text-[11.5px] font-semibold text-fin-muted">{GROUP_LABEL[g]}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[12px] text-fin-faint">100 = fully recovered (about 48–72 h after training).</div>
    </FinCard>
  );
}

function RecentPRs({ history }) {
  const prs = useMemo(() => {
    const out = [];
    for (const [name, h] of Object.entries(history)) {
      let best = 0;
      h.forEach((x, i) => {
        if (x.e1rm > best + 0.01) {
          if (i > 0) out.push({ name, date: x.date, e1rm: x.e1rm, set: x.best });
          best = x.e1rm;
        }
      });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [history]);
  return (
    <FinCard title={<span className="flex items-center gap-2"><Icon name="flame" size={15} /> Personal records</span>} delay={100}>
      {prs.length ? (
        <div className="space-y-2">
          {prs.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="min-w-0">
                <span className="block truncate font-semibold">🏆 {p.name}</span>
                <span className="text-[12.5px] text-fin-muted">{p.set.weight} kg × {p.set.reps} · {prettyDate(p.date, { day: "numeric", month: "short" })}</span>
              </span>
              <span className="tabular shrink-0 rounded-full bg-fin-accent/15 px-2.5 py-0.5 text-[13px] font-bold text-fin-accent">~{Math.round(p.e1rm)} kg</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[14px] text-fin-muted">Beat your best on any lift and it shows up here.</div>
      )}
    </FinCard>
  );
}

/* ------------------------------------------------------------------ */
/* Live workout                                                        */
/* ------------------------------------------------------------------ */
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    navigator.vibrate?.([120, 80, 120]);
  } catch {
    /* no audio */
  }
}

function WorkoutSession({ active, setActive, history, onFinished }) {
  const fit = useFit();
  const showToast = useToast();
  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState(null);
  const [picker, setPicker] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [tool, setTool] = useState(null); // { kind: "plates", weight } | { kind: "timers" }
  const [noteOpen, setNoteOpen] = useState(!!active.note);
  const restSec = fit.settings?.restSec || 90;
  const customs = fit.settings?.customExercises || [];
  const beeped = useRef(false);
  const editing = !!active.editingId;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (rest && now >= rest && !beeped.current) {
      beeped.current = true;
      beep();
    }
  }, [now, rest]);

  // Best est. 1RM per exercise before this workout (excluding the one being edited).
  const priorBest = useMemo(() => {
    const m = {};
    for (const [name, h] of Object.entries(history)) m[name] = Math.max(0, ...h.filter((x) => x.id !== active.editingId).map((x) => x.e1rm));
    return m;
  }, [history, active.editingId]);

  const update = useCallback((fn) => setActive((a) => ({ ...a, exercises: fn(a.exercises) })), [setActive]);
  const setEx = (exId, patch) => update((list) => list.map((e) => (e.id === exId ? { ...e, ...patch } : e)));
  const setSet = (exId, i, patch) => update((list) => list.map((e) => (e.id === exId ? { ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : e)));
  const toggleDone = (ex, i) => {
    const s = ex.sets[i];
    const on = !s.done;
    const patch = { done: on };
    if (on && s.reps === "" && s.target && ex.type !== "time" && ex.type !== "distance_time") patch.reps = s.target;
    setSet(ex.id, i, patch);
    if (on && !editing) {
      beeped.current = false;
      setRest(Date.now() + restSec * 1000);
    }
  };
  const toggleSuperset = (idx) =>
    update((list) => {
      const l = list.map((e) => ({ ...e }));
      const a = l[idx];
      const b = l[idx + 1];
      if (!b) return l;
      if (a.superset && a.superset === b.superset) {
        b.superset = "";
        if (!l.some((e, j) => j !== idx && e.superset === a.superset)) a.superset = "";
      } else {
        const used = new Set(l.map((e) => e.superset).filter(Boolean));
        const label = a.superset || [...LETTERS].find((c) => !used.has(c)) || "S";
        a.superset = label;
        b.superset = label;
      }
      return l;
    });

  const doneSets = active.exercises.flatMap((e) => e.sets.filter((s) => s.done && !s.warmup));
  const volume = doneSets.reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

  async function finish() {
    const exercises = active.exercises
      .map((e) => ({
        exercise: e.exercise,
        group: e.group,
        type: e.type,
        note: (e.note || "").trim(),
        superset: e.superset || "",
        sets: e.sets
          .filter((s) => s.done && ((Number(s.reps) || 0) > 0 || (Number(s.weight) || 0) > 0 || (Number(s.time) || 0) > 0 || (Number(s.distance) || 0) > 0))
          .map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, time: Number(s.time) || 0, distance: Number(s.distance) || 0, warmup: !!s.warmup, rpe: s.rpe ?? null, note: (s.note || "").trim(), done: true })),
      }))
      .filter((e) => e.sets.length);
    if (!exercises.length) return showToast("Tick at least one set before saving", true);
    const duration = editing ? undefined : Math.round((Date.now() - active.startedAt) / 60000);
    const prs = exercises
      .map((e) => {
        const best = bestSet(working(e.sets).filter((s) => s.weight > 0));
        const prev = priorBest[e.exercise] || 0;
        const v = best ? e1rm(best.weight, best.reps) : 0;
        return prev > 0 && v > prev + 0.01 ? { name: e.exercise, set: best, e1rm: v, prev } : null;
      })
      .filter(Boolean);
    const data = { date: active.date || todayISO(), splitDay: SPLIT[active.split]?.label || "", exercises, notes: (active.note || "").trim(), ...(duration != null ? { duration } : {}) };
    const doc = editing ? await fit.sessionOps.update({ _id: active.editingId }, data, "Workout updated") : await fit.sessionOps.add(data, null);
    if (doc) {
      if (!editing) onFinished({ duration, volume, sets: exercises.reduce((a, e) => a + working(e.sets).length, 0), exercises: exercises.length, prs });
      setActive(null);
    }
  }

  const left = rest ? Math.ceil((rest - now) / 1000) : 0;

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[22px] bg-fin-card px-5 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-fin-accent/15 text-fin-accent">
          <Icon name="dumbbell" size={20} stroke={2.2} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[17px] font-bold">
            {editing ? "Editing" : ""} {SPLIT[active.split]?.label || ""} workout
            <input
              type="date"
              value={active.date || todayISO()}
              max={todayISO()}
              onChange={(e) => e.target.value && setActive((a) => ({ ...a, date: e.target.value }))}
              className="rounded-lg bg-fin-input px-2 py-0.5 text-[13px] font-semibold text-white outline-none [color-scheme:dark]"
              aria-label="Workout date"
            />
          </div>
          <div className="tabular text-[13px] text-fin-muted">
            {editing ? "Change anything, then save" : fmtDur(now - active.startedAt)} · {doneSets.length} sets · {kg(volume)}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={() => setNoteOpen((v) => !v)} className={`rounded-2xl px-3 py-2.5 text-[13.5px] font-semibold ${noteOpen ? "bg-fin-accent/15 text-fin-accent" : "bg-fin-tile"}`}>Note</button>
          <button onClick={() => setTool({ kind: "plates" })} className="rounded-2xl bg-fin-tile px-3 py-2.5 text-[13.5px] font-semibold">Plates</button>
          <button onClick={() => setTool({ kind: "timers" })} className="rounded-2xl bg-fin-tile px-3 py-2.5 text-[13.5px] font-semibold">Timers</button>
          <GhostButton className="!px-4 !py-2.5 text-[14px]" onClick={() => setConfirmDiscard(true)}>{editing ? "Cancel" : "Discard"}</GhostButton>
          <PrimaryButton className="!py-2.5 text-[15px]" onClick={finish}>{editing ? "Save changes" : "Finish"}</PrimaryButton>
        </div>
        {noteOpen && (
          <textarea
            value={active.note || ""}
            onChange={(e) => setActive((a) => ({ ...a, note: e.target.value }))}
            placeholder="How did it feel? Sleep, energy, anything to remember…"
            rows={2}
            className="w-full resize-none rounded-2xl bg-fin-input px-4 py-2.5 text-[14px] text-white outline-none placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50"
          />
        )}
      </div>

      <div className={`fin-scroll grid grid-cols-1 gap-3 lg:grid-cols-2 lg:overflow-y-auto lg:pr-1 xl:grid-cols-3 [&>*]:min-w-0 ${noteOpen ? "lg:h-[calc(100dvh-314px)]" : "lg:h-[calc(100dvh-242px)]"}`}>
        {active.exercises.map((ex, idx) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            idx={idx}
            last={idx === active.exercises.length - 1}
            prev={history[ex.exercise]?.filter((x) => x.id !== active.editingId).slice(-1)[0]}
            priorBest={priorBest[ex.exercise] || 0}
            setEx={setEx}
            setSet={setSet}
            toggleDone={toggleDone}
            onRemove={() => update((l) => l.filter((e) => e.id !== ex.id))}
            onSuperset={() => toggleSuperset(idx)}
            onPlates={(w) => setTool({ kind: "plates", weight: w })}
            update={update}
          />
        ))}
        <button onClick={() => setPicker(true)} className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-white/10 text-[15px] font-semibold text-fin-muted transition hover:border-fin-accent/50 hover:text-fin-accent">
          <Icon name="plus" size={22} stroke={2.2} /> Add exercise
        </button>
      </div>

      {rest && left > -30 && (
        <div className="fixed bottom-24 right-5 z-50 flex items-center gap-3 rounded-2xl bg-[#101c33] px-4 py-3 shadow-2xl ring-1 ring-fin-accent/40 lg:bottom-6">
          <Ring value={Math.max(0, left)} max={restSec} color={left > 0 ? "rgb(var(--fin-accent))" : "#34d399"} size={46} stroke={5}>
            <Icon name="clock" size={16} />
          </Ring>
          <div>
            <div className="text-[12px] text-fin-muted">{left > 0 ? "Rest" : "Go!"}</div>
            <div className="tabular text-[22px] font-extrabold leading-none">{left > 0 ? fmtDur(left * 1000) : "0:00"}</div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setRest((r) => r - 15000)} className="rounded-lg bg-white/10 px-2 py-1 text-[12px] font-semibold">−15</button>
            <button onClick={() => setRest((r) => Math.max(r, Date.now()) + 15000)} className="rounded-lg bg-white/10 px-2 py-1 text-[12px] font-semibold">+15</button>
            <button onClick={() => setRest(null)} className="rounded-lg bg-white/10 px-2 py-1 text-[12px] font-semibold">Skip</button>
          </div>
        </div>
      )}

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        customs={customs}
        onCreate={(x) => fit.saveSettings({ customExercises: [...customs, x] }, `Created ${x.exercise}`)}
        exclude={active.exercises.map((e) => e.exercise)}
        onPick={(x) => {
          const prev = history[x.exercise]?.slice(-1)[0];
          update((l) => [...l, { id: newId(), exercise: x.exercise, group: x.group || groupOf(x.exercise), type: x.type || typeOf(x.exercise, customs), note: "", superset: "", sets: [0, 1, 2].map((i) => ({ weight: prev?.sets[i]?.weight ?? "", reps: "", time: "", distance: "", target: 10, warmup: false, rpe: null, note: "", done: false })) }]);
          setPicker(false);
        }}
      />
      <Sheet
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title={editing ? "Stop editing?" : "Discard this workout?"}
        footer={
          <>
            <GhostButton className="flex-1" onClick={() => setConfirmDiscard(false)}>Keep going</GhostButton>
            <PrimaryButton className="flex-1 !bg-none !bg-red-500" onClick={() => { setActive(null); setConfirmDiscard(false); }}>{editing ? "Stop editing" : "Discard"}</PrimaryButton>
          </>
        }
      >
        <p className="text-[15px] text-fin-muted">{editing ? "Your changes won't be saved — the workout stays as it was." : "The sets you've logged in this session won't be saved."}</p>
      </Sheet>
      <PlateCalculator open={tool?.kind === "plates"} initial={tool?.weight} onClose={() => setTool(null)} />
      <TimersSheet open={tool?.kind === "timers"} onClose={() => setTool(null)} />
    </div>
  );
}

function ExerciseCard({ ex, idx, last, prev, priorBest, setEx, setSet, toggleDone, onRemove, onSuperset, onPlates, update }) {
  const [details, setDetails] = useState(false);
  const t = ex.type || "weight_reps";
  const cols = t === "time" ? "grid-cols-[30px_1fr_1fr_40px]" : "grid-cols-[30px_1fr_1fr_1fr_40px]";
  // running best within this workout, for live trophies
  let running = priorBest;
  const prFlags = ex.sets.map((s) => {
    if (!s.done || s.warmup || !(Number(s.weight) > 0)) return false;
    const v = e1rm(Number(s.weight), Number(s.reps));
    const pr = priorBest > 0 && v > running + 0.01;
    if (v > running) running = v;
    return pr;
  });
  const nextWeight = ex.sets.find((s) => !s.done)?.weight || ex.sets.slice(-1)[0]?.weight;

  return (
    <section className={`h-max rounded-[22px] bg-fin-card p-4 ${ex.superset ? "ring-1 ring-amber-300/40" : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {ex.superset && <span className="rounded-md bg-amber-300/15 px-1.5 text-[11px] font-bold text-amber-300">SS {ex.superset}</span>}
            <span className="truncate text-[16px] font-bold text-fin-accent">{ex.exercise}</span>
          </div>
          <div className="text-[12px] text-fin-faint">
            {GROUP_LABEL[ex.group] || "Exercise"} · {EX_TYPES.find((x) => x.value === t)?.label}
            {prev ? ` · last ${prettyDate(prev.date, { day: "numeric", month: "short" })}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          {t === "weight_reps" && <IconButton icon="pie" label="Plate calculator" onClick={() => onPlates(nextWeight)} className="!h-8 !w-8" size={15} />}
          <IconButton icon="edit" label="RPE and notes" onClick={() => setDetails((v) => !v)} className={`!h-8 !w-8 ${details ? "!text-fin-accent" : ""}`} size={15} />
          {!last && <IconButton icon="copy" label={ex.superset ? "Unlink superset" : "Superset with next exercise"} onClick={onSuperset} className={`!h-8 !w-8 ${ex.superset ? "!text-amber-300" : ""}`} size={15} />}
          <IconButton icon="trash" label={`Remove ${ex.exercise}`} onClick={onRemove} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />
        </div>
      </div>
      {details && (
        <input value={ex.note || ""} onChange={(e) => setEx(ex.id, { note: e.target.value })} placeholder="Exercise note (seat height, grip, form cue…)" className="mb-2 w-full rounded-xl bg-fin-input px-3 py-2 text-[13.5px] text-white outline-none placeholder:text-fin-faint" />
      )}
      <div className={`grid ${cols} items-center gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-fin-faint`}>
        <span>Set</span>
        <span>Previous</span>
        {t === "weight_reps" && (<><span>kg</span><span>Reps</span></>)}
        {t === "reps" && (<><span>+kg</span><span>Reps</span></>)}
        {t === "time" && <span>Seconds</span>}
        {t === "distance_time" && (<><span>km</span><span>Min</span></>)}
        <span />
      </div>
      <div className="mt-1 space-y-1.5">
        {ex.sets.map((s, i) => {
          const p = prev?.sets[i];
          return (
            <div key={i}>
              <div className={`grid ${cols} items-center gap-1.5 rounded-xl transition ${s.done ? "bg-fin-accent/10" : ""}`}>
                <button
                  onClick={() => setSet(ex.id, i, { warmup: !s.warmup })}
                  title={s.warmup ? "Warm-up set (tap to make it a working set)" : "Tap to mark as warm-up"}
                  className={`tabular h-8 rounded-lg text-center text-[13px] font-bold ${s.warmup ? "bg-amber-300/15 text-amber-300" : "text-fin-muted hover:bg-white/5"}`}
                >
                  {s.warmup ? "W" : prFlags[i] ? "🏆" : i + 1 - ex.sets.slice(0, i).filter((x) => x.warmup).length}
                </button>
                <button className="tabular truncate text-center text-[12.5px] text-fin-faint hover:text-white" title="Copy previous" onClick={() => p && setSet(ex.id, i, { weight: p.weight, reps: p.reps, time: p.time || "", distance: p.distance || "" })}>
                  {p ? setLabel(p, t) : "—"}
                </button>
                {(t === "weight_reps" || t === "reps") && (
                  <>
                    <NumberBox value={s.weight} step={t === "reps" ? 1 : 0.5} placeholder={p ? String(p.weight || 0) : "0"} onChange={(v) => setSet(ex.id, i, { weight: v })} label={`Set ${i + 1} weight`} />
                    <NumberBox value={s.reps} placeholder={s.target ? String(s.target) : "0"} onChange={(v) => setSet(ex.id, i, { reps: v })} label={`Set ${i + 1} reps`} />
                  </>
                )}
                {t === "time" && <NumberBox value={s.time} placeholder={p ? String(p.time || 0) : "60"} onChange={(v) => setSet(ex.id, i, { time: v })} label={`Set ${i + 1} seconds`} />}
                {t === "distance_time" && (
                  <>
                    <NumberBox value={s.distance} step={0.1} placeholder={p ? String(p.distance || 0) : "0"} onChange={(v) => setSet(ex.id, i, { distance: v })} label={`Set ${i + 1} km`} />
                    <NumberBox value={s.time ? r1(s.time / 60) : ""} step={0.5} placeholder={p ? String(r1((p.time || 0) / 60)) : "0"} onChange={(v) => setSet(ex.id, i, { time: v === "" ? "" : Math.round(v * 60) })} label={`Set ${i + 1} minutes`} />
                  </>
                )}
                <button onClick={() => toggleDone(ex, i)} aria-pressed={s.done} aria-label={`Set ${i + 1} done`} className={`grid h-9 w-9 place-items-center rounded-xl transition active:scale-90 ${s.done ? "bg-fin-accent text-white" : "bg-fin-input text-white/40 hover:text-white"}`}>
                  <Icon name="check" size={16} stroke={3} />
                </button>
              </div>
              {details && (
                <div className="mb-1 mt-1 flex items-center gap-1.5 pl-[36px]">
                  <select value={s.rpe ?? ""} onChange={(e) => setSet(ex.id, i, { rpe: e.target.value === "" ? null : Number(e.target.value) })} className="rounded-lg bg-fin-input px-1.5 py-1 text-[12.5px] text-white outline-none [color-scheme:dark]" aria-label={`Set ${i + 1} RPE`} title="RPE: how hard (10 = nothing left)">
                    <option value="">RPE</option>
                    {RPES.map((r) => <option key={r} value={r}>@{r}</option>)}
                  </select>
                  <input value={s.note || ""} onChange={(e) => setSet(ex.id, i, { note: e.target.value })} placeholder="Set note" className="min-w-0 flex-1 rounded-lg bg-fin-input px-2 py-1 text-[12.5px] text-white outline-none placeholder:text-fin-faint" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={() => update((l) => l.map((e) => (e.id === ex.id ? { ...e, sets: [...e.sets, { ...(e.sets.slice(-1)[0] || {}), done: false, warmup: false, note: "" }] } : e)))} className="flex-1 rounded-xl bg-fin-tile py-2 text-[13.5px] font-semibold text-white/85 hover:bg-[#30303a]">
          + Add set
        </button>
        <button onClick={() => update((l) => l.map((e) => (e.id === ex.id ? { ...e, sets: [{ weight: e.sets[0]?.weight ? Math.round((Number(e.sets[0].weight) * 0.5) / 2.5) * 2.5 : "", reps: 10, time: "", distance: "", warmup: true, done: false, note: "" }, ...e.sets] } : e)))} className="rounded-xl bg-amber-300/10 px-3 text-[13px] font-semibold text-amber-300 hover:bg-amber-300/20" title="Add a warm-up set at 50%">
          + Warm-up
        </button>
        {ex.sets.length > 1 && (
          <button onClick={() => update((l) => l.map((e) => (e.id === ex.id ? { ...e, sets: e.sets.slice(0, -1) } : e)))} className="rounded-xl bg-fin-input px-3 text-[13.5px] text-fin-muted hover:text-white">
            − Set
          </button>
        )}
      </div>
    </section>
  );
}

function SummarySheet({ summary, onClose }) {
  if (!summary) return null;
  return (
    <Sheet open onClose={onClose} title="Workout saved 💪" footer={<PrimaryButton className="flex-1" onClick={onClose}>Done</PrimaryButton>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Time", `${summary.duration} min`],
          ["Exercises", summary.exercises],
          ["Sets", summary.sets],
          ["Volume", kg(summary.volume)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-fin-input px-3 py-3 text-center">
            <div className="text-[12px] text-fin-muted">{k}</div>
            <div className="tabular text-[18px] font-extrabold">{v}</div>
          </div>
        ))}
      </div>
      <div className={`${kicker} mt-5`}>New personal records</div>
      {summary.prs.length ? (
        <div className="space-y-2">
          {summary.prs.map((p) => (
            <div key={p.name} className="flex items-center justify-between rounded-2xl bg-fin-accent/10 px-4 py-2.5 text-[14px]">
              <span className="font-semibold">🏆 {p.name}</span>
              <span className="text-fin-muted">
                {p.set.weight} kg × {p.set.reps} · 1RM {Math.round(p.prev)} → <b className="text-fin-accent">{Math.round(p.e1rm)} kg</b>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[14px] text-fin-muted">No new records this time — consistency is what builds them.</div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Cardio                                                              */
/* ------------------------------------------------------------------ */
export function CardioSheet({ open, onClose }) {
  const fit = useFit();
  const [f, setF] = useState({ activity: "Walking", duration: "", distance: "", calories: "", date: todayISO() });
  useEffect(() => {
    if (open) setF({ activity: "Walking", duration: "", distance: "", calories: "", date: todayISO() });
  }, [open]);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const valid = Number(f.duration) > 0;
  async function save() {
    if (!valid) return;
    const ok = await fit.cardioOps.add({ activity: f.activity, duration: Number(f.duration), distance: Number(f.distance) || 0, calories: Number(f.calories) || 0, date: f.date, source: "Manual" });
    if (ok) onClose();
  }
  return (
    <Sheet open={open} onClose={onClose} title="Log cardio or sport" footer={<><GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton><PrimaryButton className="flex-1" disabled={!valid} onClick={save}>Save</PrimaryButton></>}>
      <div className={kicker}>Activity</div>
      <div className="flex flex-wrap gap-1.5">
        {CARDIO.map((a) => <Pill key={a} active={f.activity === a} onClick={() => set("activity")(a)}>{a}</Pill>)}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[["duration", "Minutes"], ["distance", "Km (optional)"], ["calories", "Calories (optional)"]].map(([k, l]) => (
          <label key={k}>
            <div className="mb-1 text-[12.5px] text-fin-muted">{l}</div>
            <NumberBox value={f[k]} onChange={set(k)} step={k === "distance" ? 0.1 : 1} label={l} className="!py-2.5" />
          </label>
        ))}
      </div>
      <div className={`${kicker} mt-4`}>Date</div>
      <input type="date" value={f.date} max={todayISO()} onChange={(e) => e.target.value && set("date")(e.target.value)} className="w-full rounded-2xl bg-fin-input px-4 py-2.5 text-white outline-none [color-scheme:dark]" />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function exportCSV(sessions) {
  const rows = [["Date", "Workout", "Exercise", "Set", "Warm-up", "Weight (kg)", "Reps", "Time (s)", "Distance (km)", "RPE", "Note"]];
  for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date)))
    for (const e of s.exercises || []) (e.sets || []).forEach((x, i) => rows.push([s.date, s.splitDay || "", e.exercise, i + 1, x.warmup ? "yes" : "", x.weight || 0, x.reps || 0, x.time || 0, x.distance || 0, x.rpe ?? "", (x.note || e.note || "").replace(/"/g, "'")]));
  const csv = rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${v}"` : v)).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `lifeos-workouts-${todayISO()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function TrainHistory({ onOpenSession }) {
  const fit = useFit();
  const history = useExerciseHistory();
  const prSets = usePRSets();
  const customs = fit.settings?.customExercises || [];
  const today = todayISO();
  const [month, setMonth] = useState(monthKey());
  const [selected, setSelected] = useState(fit.sessions[0]?.date || today);
  const byDate = useMemo(() => {
    const m = {};
    for (const s of fit.sessions) (m[s.date] ||= { s: [], c: [] }).s.push(s);
    for (const c of fit.cardio) (m[c.date] ||= { s: [], c: [] }).c.push(c);
    return m;
  }, [fit.sessions, fit.cardio]);
  const cells = useMemo(() => {
    const lead = (parseISO(`${month}-01`).getDay() + 6) % 7;
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth(month); d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    return out;
  }, [month]);
  const day = byDate[selected] || { s: [], c: [] };
  const monthCount = fit.sessions.filter((s) => s.date.startsWith(month)).length;
  const splitId = (label) => SPLITS.find((x) => x.label === label)?.id || "push";
  const open = (s, edit) => {
    openSessionLater(makeSession({ split: splitId(s.splitDay), list: [], history, customs, date: edit ? s.date : todayISO(), fromSession: s, editingId: edit ? s._id : null }));
    onOpenSession?.();
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(340px,420px)_1fr] lg:gap-4 [&>*]:min-w-0">
      <FinCard
        title={monthLabel(month)}
        action={
          <div className="flex items-center">
            <button onClick={() => exportCSV(fit.sessions)} className="mr-1 rounded-lg bg-fin-tile px-2.5 py-1 text-[12.5px] font-semibold text-white/80 hover:text-white" title="Download all workouts as a CSV file">
              Export CSV
            </button>
            <IconButton icon="left" label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))} />
            <IconButton icon="right" label="Next month" onClick={() => setMonth((m) => shiftMonth(m, 1))} className={month >= monthKey() ? "pointer-events-none opacity-25" : ""} />
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11.5px] font-semibold text-fin-faint">{WEEK.map((w) => <div key={w}>{w}</div>)}</div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`b${i}`} />;
            const e = byDate[iso];
            const sp = e?.s[0] && SPLITS.find((x) => x.label === e.s[0].splitDay);
            const future = iso > today;
            return (
              <button
                key={iso}
                disabled={future}
                onClick={() => setSelected(iso)}
                className={`relative aspect-square rounded-xl text-[13px] font-semibold transition ${future ? "opacity-25" : "hover:ring-1 hover:ring-white/20"} ${selected === iso ? "ring-2 ring-white" : iso === today ? "ring-1 ring-fin-accent" : ""}`}
                style={{ background: e?.s.length ? `${sp?.color || "#60a5fa"}cc` : "#121215", color: e?.s.length ? "#0b1220" : undefined }}
              >
                {Number(iso.slice(8))}
                {e?.c.length > 0 && <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#fbbf24]" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-fin-muted">
          <span>{monthCount} workout{monthCount === 1 ? "" : "s"} this month</span>
          <span className="flex items-center gap-2">
            {SPLITS.filter((s) => s.id !== "rest").map((s) => (
              <span key={s.id} className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.label}</span>
            ))}
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#fbbf24]" />Cardio</span>
          </span>
        </div>
      </FinCard>

      <div className="space-y-4">
        <div className="text-[20px] font-bold">{prettyDate(selected, { weekday: "long", day: "numeric", month: "long" })}</div>
        {!day.s.length && !day.c.length && <div className="rounded-[22px] bg-fin-card p-6 text-center text-[14px] text-fin-muted">No training logged on this day.</div>}
        <div className="fin-scroll grid grid-cols-1 gap-4 lg:max-h-[calc(100dvh-230px)] lg:overflow-y-auto lg:pr-1 xl:grid-cols-2">
          {day.s.map((s) => (
            <FinCard
              key={s._id}
              title={`${s.splitDay || "Workout"}${s.duration ? ` · ${s.duration} min` : ""}`}
              action={
                <div className="flex items-center gap-1">
                  <button onClick={() => open(s, false)} className="rounded-lg bg-fin-tile px-2.5 py-1 text-[12.5px] font-semibold hover:bg-[#30303a]" title="Start a new workout with these exercises">Repeat</button>
                  <button onClick={() => open(s, true)} className="rounded-lg bg-fin-tile px-2.5 py-1 text-[12.5px] font-semibold hover:bg-[#30303a]">Edit</button>
                  <IconButton icon="trash" label="Delete workout" onClick={() => fit.sessionOps.remove(s)} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />
                </div>
              }
            >
              <div className="mb-2 text-[13px] text-fin-muted">{kg(volumeOf(s))} lifted · {(s.exercises || []).reduce((a, e) => a + working(e.sets).length, 0)} working sets</div>
              {s.notes && <div className="mb-2 rounded-xl bg-fin-input px-3 py-2 text-[13px] italic text-white/75">“{s.notes}”</div>}
              <div className="space-y-2">
                {(s.exercises || []).map((e, i) => (
                  <div key={i} className={`rounded-2xl bg-fin-input px-3 py-2 ${e.superset ? "border-l-2 border-amber-300/60" : ""}`}>
                    <div className="flex items-center gap-2 text-[14.5px] font-semibold">
                      {e.superset && <span className="rounded bg-amber-300/15 px-1 text-[10.5px] font-bold text-amber-300">SS {e.superset}</span>}
                      {e.exercise}
                    </div>
                    <div className="tabular mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[13px] text-fin-muted">
                      {e.sets.map((x, j) => (
                        <span key={j} className={x.warmup ? "text-amber-300/80" : prSets.has(`${s._id}|${e.exercise}|${j}`) ? "font-semibold text-fin-accent" : ""} title={x.note || undefined}>
                          {x.warmup ? "W " : prSets.has(`${s._id}|${e.exercise}|${j}`) ? "🏆 " : ""}
                          {setLabel(x, e.type || "weight_reps")}
                          {x.rpe ? ` @${x.rpe}` : ""}
                          {x.note ? " ✎" : ""}
                        </span>
                      ))}
                    </div>
                    {e.note && <div className="mt-0.5 text-[12px] text-fin-faint">{e.note}</div>}
                  </div>
                ))}
              </div>
            </FinCard>
          ))}
          {day.c.map((c) => (
            <FinCard key={c._id} title={c.activity} action={<IconButton icon="trash" label="Delete" onClick={() => fit.cardioOps.remove(c)} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />}>
              <div className="text-[15px]">
                {c.duration} min{c.distance ? ` · ${c.distance} km` : ""}{c.calories ? ` · ${c.calories} kcal` : ""}
              </div>
            </FinCard>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */
const RANGES = [
  { value: 90, label: "3M" },
  { value: 180, label: "6M" },
  { value: 365, label: "1Y" },
  { value: 0, label: "All" },
];

export function TrainProgress() {
  const fit = useFit();
  const history = useExerciseHistory();
  const names = Object.keys(history).sort((a, b) => history[b].length - history[a].length);
  const [ex, setEx] = useState(names[0] || "");
  const [metric, setMetric] = useState("e1rm");
  const [range, setRange] = useState(0);
  const [statRange, setStatRange] = useState(30);
  const all = history[ex] || [];
  const type = all.slice(-1)[0]?.type || typeOf(ex, fit.settings?.customExercises || []);
  const metrics = metricsFor(type);
  const m = metrics.find((x) => x.value === metric) || metrics[0];
  const today = todayISO();
  const h = range ? all.filter((x) => daysBetween(x.date, today) <= range) : all;
  const ys = h.map((x) => m.of(x));
  const trend = trendLine(ys);
  const best = all.length ? all.reduce((a, b) => (b.e1rm > a.e1rm ? b : a)) : null;
  const rm = repMaxes(all);
  const goals = fit.settings?.goals || {};
  const goal = goals[ex];
  const [gw, setGw] = useState("");
  const [gr, setGr] = useState("");
  useEffect(() => {
    setGw(goal?.weight ?? "");
    setGr(goal?.reps ?? "");
    if (!metrics.some((x) => x.value === metric)) setMetric(metrics[0].value);
  }, [ex]); // eslint-disable-line react-hooks/exhaustive-deps
  const goalHit = goal && all.find((x) => x.sets.some((s) => s.weight >= goal.weight && s.reps >= goal.reps));
  const goalPct = goal && best ? Math.min(1, best.e1rm / e1rm(goal.weight, goal.reps)) : 0;

  // Stats over a period (FitNotes "analysis")
  const stats = useMemo(() => {
    const from = lastNDays(statRange)[0];
    const list = fit.sessions.filter((s) => s.date >= from);
    const byGroup = {};
    let sets = 0;
    for (const s of list) for (const e of s.exercises || []) {
      const n = working(e.sets).length;
      sets += n;
      const g = e.group || groupOf(e.exercise) || "other";
      byGroup[g] = (byGroup[g] || 0) + n;
    }
    const dur = list.filter((s) => s.duration);
    return {
      workouts: list.length,
      volume: list.reduce((a, s) => a + volumeOf(s), 0),
      sets,
      avgDur: dur.length ? Math.round(dur.reduce((a, s) => a + s.duration, 0) / dur.length) : 0,
      groups: ["chest", "shoulders", "triceps", "back", "biceps", "legs", "core"].map((g) => ({ g, n: byGroup[g] || 0 })),
    };
  }, [fit.sessions, statRange]);
  const maxG = Math.max(1, ...stats.groups.map((x) => x.n));

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[3fr_2fr] lg:gap-4 [&>*]:min-w-0">
      <FinCard
        title="Exercise progress"
        className="lg:h-[calc(100dvh-178px)] lg:overflow-y-auto fin-scroll"
        action={
          names.length > 0 && (
            <select value={ex} onChange={(e) => setEx(e.target.value)} className="max-w-[230px] rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold text-white outline-none [color-scheme:dark]" aria-label="Exercise">
              {names.map((n) => <option key={n}>{n}</option>)}
            </select>
          )
        }
      >
        {all.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {metrics.map((x) => <Pill key={x.value} active={m.value === x.value} onClick={() => setMetric(x.value)} className="!px-3 !py-1 !text-[13px]">{x.label}</Pill>)}
              </div>
              <Segmented className="w-[200px] [&_button]:!py-1 [&_button]:!text-[12.5px]" value={range} onChange={setRange} options={RANGES} />
            </div>
            {h.length ? (
              <div className="mt-3">
                <LineChart points={h.map((x, i) => ({ x: prettyDate(x.date, { day: "numeric", month: "short" }), y: ys[i] }))} second={trend.map((y, i) => ({ x: h[i].date, y }))} format={(v) => (m.value === "time" ? fmtTime(v) : `${v}${m.unit ? ` ${m.unit}` : ""}`)} height={160} />
                <div className="mt-1 flex justify-between text-[12px] text-fin-faint">
                  <span>{h.length} session{h.length === 1 ? "" : "s"}</span>
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-white/40" /> Trend</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl bg-fin-input p-4 text-center text-[13.5px] text-fin-muted">No sessions in this range.</div>
            )}
            {type === "weight_reps" && (
              <>
                <div className={`${kicker} mt-4`}>Rep maxes — best weight for at least</div>
                <div className="grid grid-cols-6 gap-1.5 text-center">
                  {REP_MAX.map((r) => (
                    <div key={r} className="rounded-xl bg-fin-input px-1 py-2" title={rm[r] ? `${rm[r].weight} kg × ${rm[r].reps} on ${prettyDate(rm[r].date)}` : "Not done yet"}>
                      <div className="text-[11.5px] text-fin-muted">{r} RM</div>
                      <div className="tabular text-[15px] font-extrabold">{rm[r] ? rm[r].weight : "—"}</div>
                    </div>
                  ))}
                </div>
                <div className={`${kicker} mt-4`}>Goal</div>
                <div className="flex flex-wrap items-center gap-2">
                  <NumberBox value={gw} step={2.5} onChange={setGw} className="!w-20 !py-1.5" label="Goal weight" placeholder="kg" />
                  <span className="text-fin-muted">kg ×</span>
                  <NumberBox value={gr} onChange={setGr} className="!w-16 !py-1.5" label="Goal reps" placeholder="reps" />
                  <span className="text-fin-muted">reps</span>
                  <button
                    onClick={() => fit.saveSettings({ goals: Number(gw) > 0 && Number(gr) > 0 ? { ...goals, [ex]: { weight: Number(gw), reps: Number(gr) } } : Object.fromEntries(Object.entries(goals).filter(([k]) => k !== ex)) }, Number(gw) > 0 ? "Goal saved" : "Goal cleared")}
                    className="rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold hover:bg-[#30303a]"
                  >
                    {goal ? "Update" : "Set goal"}
                  </button>
                  {goal && (
                    <span className={`text-[13px] font-semibold ${goalHit ? "text-emerald-300" : "text-fin-muted"}`}>
                      {goalHit ? `✓ Hit on ${prettyDate(goalHit.date, { day: "numeric", month: "short" })}` : `${Math.round(goalPct * 100)}% there (by est. 1RM)`}
                    </span>
                  )}
                </div>
              </>
            )}
            <div className={`${kicker} mt-4`}>Recent sessions</div>
            <div className="space-y-1.5">
              {[...all].reverse().slice(0, 6).map((x, i) => (
                <div key={i} className="flex justify-between gap-3 text-[13.5px]">
                  <span className="text-fin-muted">{prettyDate(x.date, { day: "numeric", month: "short" })}</span>
                  <span className="tabular truncate">{x.sets.map((s) => setLabel(s, type)).join(" · ")}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon="chart">Finish a workout to see your lifts climb here.</EmptyState>
        )}
      </FinCard>

      <div className="fin-scroll space-y-4 lg:h-[calc(100dvh-178px)] lg:overflow-y-auto lg:pr-1">
        <FinCard title="Statistics" action={<Segmented className="w-[170px] [&_button]:!py-1 [&_button]:!text-[12.5px]" value={statRange} onChange={setStatRange} options={[{ value: 7, label: "7d" }, { value: 30, label: "30d" }, { value: 90, label: "90d" }]} />}>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              ["Workouts", stats.workouts],
              ["Sets", stats.sets],
              ["Volume", stats.volume >= 1000 ? `${r1(stats.volume / 1000)}t` : kg(stats.volume)],
              ["Avg time", stats.avgDur ? `${stats.avgDur}m` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-fin-input px-1 py-2">
                <div className="text-[11.5px] text-fin-muted">{k}</div>
                <div className="tabular text-[16px] font-extrabold">{v}</div>
              </div>
            ))}
          </div>
          <div className={`${kicker} mt-3`}>Working sets by muscle</div>
          <div className="space-y-1.5">
            {stats.groups.map(({ g, n }) => (
              <div key={g} className="flex items-center gap-3 text-[13px]">
                <span className="w-[70px] shrink-0 font-semibold">{GROUP_LABEL[g]}</span>
                <div className="h-2 flex-1 rounded-full bg-fin-input">
                  <div className="h-full rounded-full bg-fin-accent transition-[width] duration-700" style={{ width: `${(n / maxG) * 100}%` }} />
                </div>
                <span className="tabular w-7 shrink-0 text-right text-fin-muted">{n}</span>
              </div>
            ))}
          </div>
          {statRange === 7 && <div className="mt-2 text-[12px] text-fin-faint">Aim for roughly 10–20 working sets per muscle each week.</div>}
        </FinCard>
        <FinCard title="Workouts per week">
          <WeeksBars />
        </FinCard>
      </div>
    </div>
  );
}

function WeeksBars() {
  const fit = useFit();
  const weeks = useMemo(() => {
    const out = [];
    const ws = addDays(parseISO(todayISO()), -((new Date().getDay() + 6) % 7));
    for (let i = 11; i >= 0; i--) {
      const a = isoDate(addDays(ws, -7 * i));
      const b = isoDate(addDays(ws, -7 * i + 6));
      out.push({ label: `Week of ${prettyDate(a, { day: "numeric", month: "short" })}`, value: fit.sessions.filter((s) => s.date >= a && s.date <= b).length });
    }
    return out;
  }, [fit.sessions]);
  return (
    <>
      <Bars data={weeks} height={90} target={(fit.settings?.schedule || []).filter((s) => s !== "rest").length} format={(v) => `${v} workout${v === 1 ? "" : "s"}`} />
      <div className="mt-2 text-[12px] text-fin-faint">Dashed line = planned training days per week.</div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Program                                                             */
/* ------------------------------------------------------------------ */
export function TrainProgram() {
  const fit = useFit();
  const program = fit.settings?.program || {};
  const schedule = fit.settings?.schedule || [];
  const customs = fit.settings?.customExercises || [];
  const [picker, setPicker] = useState(null);
  const save = (next) => fit.saveSettings({ program: next });
  const edit = (split, i, patch) => save({ ...program, [split]: program[split].map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const move = (split, i, dir) => {
    const l = [...program[split]];
    const j = i + dir;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    save({ ...program, [split]: l });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[22px] bg-fin-card px-5 py-3">
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Week</span>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <label key={d} className="flex items-center gap-1.5 text-[13px] text-fin-muted">
            {WEEKDAYS[d]}
            <select value={schedule[d] || "rest"} onChange={(e) => fit.saveSettings({ schedule: schedule.map((s, i) => (i === d ? e.target.value : s)) }, "Schedule saved")} className="rounded-lg bg-fin-tile px-2 py-1 text-[13px] font-semibold text-white outline-none [color-scheme:dark]">
              {SPLITS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        ))}
        <label className="ml-auto flex items-center gap-2 text-[13px] text-fin-muted">
          Rest timer
          <select value={fit.settings?.restSec || 90} onChange={(e) => fit.saveSettings({ restSec: Number(e.target.value) }, "Rest timer saved")} className="rounded-lg bg-fin-tile px-2 py-1 text-[13px] font-semibold text-white outline-none [color-scheme:dark]">
            {[45, 60, 90, 120, 150, 180, 240].map((s) => <option key={s} value={s}>{s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        {SPLITS.filter((s) => s.id !== "rest").map((s) => {
          const list = program[s.id] || [];
          return (
            <FinCard
              key={s.id}
              title={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label} day</span>}
              action={<button onClick={() => setPicker(s.id)} className="flex items-center gap-1.5 rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold hover:bg-[#30303a]"><Icon name="plus" size={15} stroke={2.4} /> Add</button>}
            >
              <ol className="fin-scroll space-y-1.5 lg:max-h-[calc(100dvh-316px)] lg:overflow-y-auto lg:pr-1">
                {list.map((p, i) => (
                  <li key={p.exercise} className="flex items-center gap-1 rounded-2xl bg-fin-input px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold">{p.exercise}</div>
                      <div className="mt-1 flex items-center gap-1 text-[12px] text-fin-muted">
                        <NumberBox value={p.sets} onChange={(v) => v !== "" && edit(s.id, i, { sets: Math.max(1, Math.min(10, v)) })} className="!w-11 !py-1 !text-[13px]" label="Sets" /> ×
                        <NumberBox value={p.reps} onChange={(v) => v !== "" && edit(s.id, i, { reps: Math.max(1, Math.min(50, v)) })} className="!w-11 !py-1 !text-[13px]" label="Reps" />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col">
                      <IconButton icon="up" label="Move up" onClick={() => move(s.id, i, -1)} className={`!h-6 !w-7 ${i === 0 ? "pointer-events-none opacity-20" : ""}`} size={14} />
                      <IconButton icon="down" label="Move down" onClick={() => move(s.id, i, 1)} className={`!h-6 !w-7 ${i === list.length - 1 ? "pointer-events-none opacity-20" : ""}`} size={14} />
                    </div>
                    <IconButton icon="trash" label={`Remove ${p.exercise}`} onClick={() => save({ ...program, [s.id]: list.filter((_, j) => j !== i) })} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />
                  </li>
                ))}
              </ol>
            </FinCard>
          );
        })}
        <FinCard title="My exercises">
          {customs.length ? (
            <div className="fin-scroll space-y-1.5 lg:max-h-[calc(100dvh-316px)] lg:overflow-y-auto">
              {customs.map((c) => (
                <div key={c.exercise} className="flex items-center gap-2 rounded-2xl bg-fin-input px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{c.exercise}</div>
                    <div className="text-[12px] text-fin-muted">{GROUP_LABEL[c.group] || "No group"} · {EX_TYPES.find((t) => t.value === c.type)?.label}</div>
                  </div>
                  <IconButton icon="trash" label={`Delete ${c.exercise}`} onClick={() => fit.saveSettings({ customExercises: customs.filter((x) => x.exercise !== c.exercise) }, "Exercise removed")} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13.5px] leading-relaxed text-fin-muted">Exercises you create show up here. Type a new name in any “Add exercise” search to create one — weight & reps, bodyweight reps, timed (plank) or distance & time.</div>
          )}
        </FinCard>
      </div>
      <ExercisePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        customs={customs}
        onCreate={(x) => fit.saveSettings({ customExercises: [...customs, x] }, `Created ${x.exercise}`)}
        exclude={(program[picker] || []).map((p) => p.exercise)}
        onPick={(x) => {
          save({ ...program, [picker]: [...(program[picker] || []), { exercise: x.exercise, group: x.group || groupOf(x.exercise), type: x.type, sets: 3, reps: 10 }] });
          setPicker(null);
        }}
      />
    </div>
  );
}
