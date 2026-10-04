// Train: today's plan, a live workout logger (Strong/Hevy style) with rest
// timer and PRs, history, progress (JEFIT style), muscle recovery (Fitbod
// style) and your Push / Pull / Legs programme.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFit } from "./FitContext.jsx";
import {
  GROUP_LABEL,
  SPLIT,
  SPLITS,
  WEEKDAYS,
  addDays,
  bestSet,
  daysBetween,
  e1rm,
  groupOf,
  isoDate,
  lastNDays,
  newId,
  parseISO,
  prettyDate,
  r1,
  sessionVolume,
  todayISO,
} from "./lib";
import { Bars, ExercisePicker, LineChart, NumberBox, kicker } from "./fit-ui.jsx";
import { daysInMonth, monthKey, monthLabel, shiftMonth } from "../finances/lib";
import { EmptyState, FinCard, GhostButton, Icon, IconButton, Pill, PrimaryButton, Ring, Segmented, Sheet, TextField } from "../finances/fin-ui.jsx";
import { useToast } from "../../components/Toast.jsx";

const ACTIVE_KEY = "lifeos_fit_active_v1";
const H = "lg:h-[calc(100dvh-178px)] lg:min-h-[380px]";
const CARDIO = ["Walking", "Running", "Cycling", "Swimming", "Football", "Badminton", "Cricket", "Yoga", "Stretching", "HIIT", "Other"];

const fmtDur = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
};
const kg = (n) => `${r1(n).toLocaleString("en-IN")} kg`;

/* ---------- history helpers ---------- */
export function useExerciseHistory() {
  const { sessions } = useFit();
  return useMemo(() => {
    // exercise -> [{date, sets, best, e1rm}] oldest first
    const m = {};
    for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0))) {
      for (const ex of s.exercises || []) {
        const sets = (ex.sets || []).filter((x) => x.done !== false && (x.reps > 0 || x.weight > 0));
        if (!sets.length) continue;
        const best = bestSet(sets);
        (m[ex.exercise] ||= []).push({ date: s.date, sets, best, e1rm: best ? e1rm(best.weight, best.reps) : 0, id: s._id });
      }
    }
    return m;
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
  const history = useExerciseHistory();
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

  function start(s = split) {
    const list = fit.settings?.program?.[s] || [];
    setActive({
      split: s,
      startedAt: Date.now(),
      exercises: list.map((p) => {
        const prev = history[p.exercise]?.slice(-1)[0];
        return {
          id: newId(),
          exercise: p.exercise,
          group: p.group || groupOf(p.exercise),
          sets: Array.from({ length: p.sets || 3 }, (_, i) => ({ weight: prev?.sets[i]?.weight ?? prev?.sets.slice(-1)[0]?.weight ?? "", reps: "", target: p.reps, done: false })),
        };
      }),
    });
  }

  if (active) return <WorkoutSession active={active} setActive={setActive} history={history} onFinished={setSummary} />;

  // This week (Mon–Sun)
  const ws = addDays(parseISO(today), -((new Date().getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => isoDate(addDays(ws, i)));
  const doneDates = new Set(fit.sessions.map((s) => s.date));
  const cardioDates = new Set(fit.cardio.map((c) => c.date));
  const weekSessions = fit.sessions.filter((s) => s.date >= week[0] && s.date <= week[6]);
  const weekVol = weekSessions.reduce((a, s) => a + sessionVolume(s), 0);
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
            <div className="mt-2 text-[34px] font-extrabold leading-tight tracking-tight">{split === "rest" ? "Rest day" : `${sp.label} day`}</div>
            <div className="text-[14px] text-white/85">{doneToday ? `Done: ${doneToday.splitDay || "workout"} · ${kg(sessionVolume(doneToday))} lifted` : sp.focus}</div>
            <div className="mt-4 flex gap-1.5">
              {week.map((iso, i) => (
                <div key={iso} className="flex flex-1 flex-col items-center gap-1">
                  <span className={`grid h-8 w-full place-items-center rounded-lg text-[11px] font-bold ${doneDates.has(iso) ? "bg-white text-[#1d4ed8]" : cardioDates.has(iso) ? "bg-white/35" : iso === today ? "bg-black/25 ring-1 ring-white/60" : "bg-black/15 text-white/60"}`}>
                    {doneDates.has(iso) ? <Icon name="check" size={14} stroke={3} /> : (SPLIT[schedule[(i + 1) % 7]]?.label || "")[0]}
                  </span>
                  <span className="text-[10.5px] text-white/70">{WEEKDAYS[(i + 1) % 7].slice(0, 2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {split !== "rest" ? (
                <button onClick={() => start()} className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-[15px] font-bold text-[#1d4ed8] shadow-lg transition hover:brightness-95 active:scale-[0.98]">
                  <Icon name="dumbbell" size={18} stroke={2.2} /> {doneToday ? "Start another" : "Start workout"}
                </button>
              ) : (
                <span className="text-[14px] text-white/85">Train anyway:</span>
              )}
              {SPLITS.filter((s) => s.id !== "rest" && s.id !== split).map((s) => (
                <button key={s.id} onClick={() => setPickSplit(s.id)} className="rounded-2xl bg-black/15 px-3.5 py-3 text-[14px] font-semibold text-white/90 hover:bg-black/25">
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>
        <Recovery />
      </div>

      <FinCard
        delay={40}
        className={`flex flex-col ${H}`}
        title={<span className="flex items-center gap-2"><Icon name="list" size={15} /> {split === "rest" ? "Rest day" : `${sp.label} plan`}</span>}
        action={split !== "rest" && <span className="text-[13px] text-fin-muted">{plan.length} exercises</span>}
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
              const pr = h ? Math.max(...h.map((x) => x.e1rm)) : 0;
              return (
                <div key={p.exercise} className="rounded-2xl bg-fin-input px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold">{p.exercise}</span>
                    <span className="tabular shrink-0 text-[13px] text-fin-muted">{p.sets} × {p.reps}</span>
                  </div>
                  <div className="mt-0.5 flex justify-between gap-2 text-[12.5px] text-fin-faint">
                    <span>{last ? `Last: ${last.best.weight} kg × ${last.best.reps} · ${prettyDate(last.date, { day: "numeric", month: "short" })}` : "No history yet"}</span>
                    {pr > 0 && <span className="text-fin-accent">1RM ~{Math.round(pr)} kg</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FinCard>

      <div className={`space-y-5 lg:col-span-2 lg:space-y-4 xl:col-span-1`}>
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
              <Ring value={pct} max={1} color={color} size={44} stroke={5}>
                <span className="tabular text-[11px] font-bold">{Math.round(pct * 100)}</span>
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
                <span className="block truncate font-semibold">{p.name}</span>
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
  const [rest, setRest] = useState(null); // end timestamp
  const [picker, setPicker] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const restSec = fit.settings?.restSec || 90;
  const beeped = useRef(false);

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

  const update = useCallback((fn) => setActive((a) => ({ ...a, exercises: fn(a.exercises) })), [setActive]);
  const setSet = (exId, i, patch) => update((list) => list.map((e) => (e.id === exId ? { ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : e)));
  const toggleDone = (ex, i) => {
    const s = ex.sets[i];
    const turningOn = !s.done;
    const patch = { done: turningOn };
    if (turningOn && s.reps === "" && s.target) patch.reps = s.target;
    setSet(ex.id, i, patch);
    if (turningOn) {
      beeped.current = false;
      setRest(Date.now() + restSec * 1000);
    }
  };

  const doneSets = active.exercises.flatMap((e) => e.sets.filter((s) => s.done));
  const volume = doneSets.reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

  async function finish() {
    const exercises = active.exercises
      .map((e) => ({ exercise: e.exercise, group: e.group, sets: e.sets.filter((s) => s.done && (Number(s.reps) > 0 || Number(s.weight) > 0)).map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, done: true })) }))
      .filter((e) => e.sets.length);
    if (!exercises.length) return showToast("Tick at least one set before finishing", true);
    const duration = Math.round((Date.now() - active.startedAt) / 60000);
    // PRs vs everything before today
    const prs = exercises
      .map((e) => {
        const best = bestSet(e.sets);
        const prev = Math.max(0, ...(history[e.exercise] || []).map((x) => x.e1rm));
        const now1 = best ? e1rm(best.weight, best.reps) : 0;
        return prev > 0 && now1 > prev + 0.01 ? { name: e.exercise, set: best, e1rm: now1, prev } : null;
      })
      .filter(Boolean);
    const doc = await fit.sessionOps.add({ date: todayISO(), splitDay: SPLIT[active.split]?.label || "", exercises, duration }, null);
    if (doc) {
      onFinished({ duration, volume, sets: exercises.reduce((a, e) => a + e.sets.length, 0), exercises: exercises.length, prs, split: SPLIT[active.split]?.label });
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
          <div className="text-[17px] font-bold">{SPLIT[active.split]?.label} workout</div>
          <div className="tabular text-[13px] text-fin-muted">
            {fmtDur(now - active.startedAt)} · {doneSets.length} sets · {kg(volume)}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <GhostButton className="!px-4 !py-2.5 text-[14px]" onClick={() => setConfirmDiscard(true)}>Discard</GhostButton>
          <PrimaryButton className="!py-2.5 text-[15px]" onClick={finish}>Finish</PrimaryButton>
        </div>
      </div>

      <div className="fin-scroll grid grid-cols-1 gap-3 lg:h-[calc(100dvh-242px)] lg:grid-cols-2 lg:overflow-y-auto lg:pr-1 xl:grid-cols-3 [&>*]:min-w-0">
        {active.exercises.map((ex) => {
          const prev = history[ex.exercise]?.slice(-1)[0];
          return (
            <section key={ex.id} className="h-max rounded-[22px] bg-fin-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-bold text-fin-accent">{ex.exercise}</div>
                  <div className="text-[12px] text-fin-faint">{GROUP_LABEL[ex.group] || "Exercise"}{prev ? ` · last ${prettyDate(prev.date, { day: "numeric", month: "short" })}` : ""}</div>
                </div>
                <IconButton icon="trash" label={`Remove ${ex.exercise}`} onClick={() => update((l) => l.filter((e) => e.id !== ex.id))} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />
              </div>
              <div className="grid grid-cols-[28px_1fr_1fr_1fr_40px] items-center gap-1.5 text-center text-[11.5px] font-semibold uppercase tracking-wide text-fin-faint">
                <span>Set</span>
                <span>Previous</span>
                <span>kg</span>
                <span>Reps</span>
                <span />
              </div>
              <div className="mt-1 space-y-1.5">
                {ex.sets.map((s, i) => {
                  const p = prev?.sets[i];
                  return (
                    <div key={i} className={`grid grid-cols-[28px_1fr_1fr_1fr_40px] items-center gap-1.5 rounded-xl transition ${s.done ? "bg-fin-accent/10" : ""}`}>
                      <span className="tabular text-center text-[14px] font-bold text-fin-muted">{i + 1}</span>
                      <button
                        className="tabular truncate text-center text-[13px] text-fin-faint hover:text-white"
                        title="Copy previous"
                        onClick={() => p && setSet(ex.id, i, { weight: p.weight, reps: p.reps })}
                      >
                        {p ? `${p.weight}×${p.reps}` : "—"}
                      </button>
                      <NumberBox value={s.weight} step={0.5} placeholder={p ? String(p.weight) : "0"} onChange={(v) => setSet(ex.id, i, { weight: v })} label={`Set ${i + 1} weight`} />
                      <NumberBox value={s.reps} placeholder={s.target ? String(s.target) : "0"} onChange={(v) => setSet(ex.id, i, { reps: v })} label={`Set ${i + 1} reps`} />
                      <button
                        onClick={() => toggleDone(ex, i)}
                        aria-pressed={s.done}
                        aria-label={`Set ${i + 1} done`}
                        className={`grid h-9 w-9 place-items-center rounded-xl transition active:scale-90 ${s.done ? "bg-fin-accent text-white" : "bg-fin-input text-white/40 hover:text-white"}`}
                      >
                        <Icon name="check" size={16} stroke={3} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => update((l) => l.map((e) => (e.id === ex.id ? { ...e, sets: [...e.sets, { ...(e.sets.slice(-1)[0] || {}), done: false }] } : e)))}
                  className="flex-1 rounded-xl bg-fin-tile py-2 text-[13.5px] font-semibold text-white/85 hover:bg-[#30303a]"
                >
                  + Add set
                </button>
                {ex.sets.length > 1 && (
                  <button onClick={() => update((l) => l.map((e) => (e.id === ex.id ? { ...e, sets: e.sets.slice(0, -1) } : e)))} className="rounded-xl bg-fin-input px-3 text-[13.5px] text-fin-muted hover:text-white">
                    − Set
                  </button>
                )}
              </div>
            </section>
          );
        })}
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
        exclude={active.exercises.map((e) => e.exercise)}
        onPick={(x) => {
          const prev = history[x.exercise]?.slice(-1)[0];
          update((l) => [...l, { id: newId(), exercise: x.exercise, group: x.group || groupOf(x.exercise), sets: [0, 1, 2].map((i) => ({ weight: prev?.sets[i]?.weight ?? "", reps: "", target: 10, done: false })) }]);
          setPicker(false);
        }}
      />
      <Sheet
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this workout?"
        footer={
          <>
            <GhostButton className="flex-1" onClick={() => setConfirmDiscard(false)}>Keep going</GhostButton>
            <PrimaryButton className="flex-1 !bg-none !bg-red-500" onClick={() => { setActive(null); setConfirmDiscard(false); }}>Discard</PrimaryButton>
          </>
        }
      >
        <p className="text-[15px] text-fin-muted">The sets you've logged in this session won't be saved.</p>
      </Sheet>
    </div>
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
        {CARDIO.map((a) => (
          <Pill key={a} active={f.activity === a} onClick={() => set("activity")(a)}>{a}</Pill>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["duration", "Minutes"],
          ["distance", "Km (optional)"],
          ["calories", "Calories (optional)"],
        ].map(([k, l]) => (
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
export function TrainHistory() {
  const fit = useFit();
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

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(340px,420px)_1fr] lg:gap-4 [&>*]:min-w-0">
      <FinCard
        title={monthLabel(month)}
        action={
          <div className="flex">
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
              action={<IconButton icon="trash" label="Delete workout" onClick={() => fit.sessionOps.remove(s)} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />}
            >
              <div className="mb-2 text-[13px] text-fin-muted">{kg(sessionVolume(s))} lifted · {(s.exercises || []).reduce((a, e) => a + e.sets.length, 0)} sets</div>
              <div className="space-y-2">
                {(s.exercises || []).map((e, i) => (
                  <div key={i} className="rounded-2xl bg-fin-input px-3 py-2">
                    <div className="text-[14.5px] font-semibold">{e.exercise}</div>
                    <div className="tabular mt-0.5 text-[13px] text-fin-muted">{e.sets.map((x) => `${x.weight}×${x.reps}`).join("  ·  ")}</div>
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
export function TrainProgress() {
  const fit = useFit();
  const history = useExerciseHistory();
  const names = Object.keys(history).sort((a, b) => history[b].length - history[a].length);
  const [ex, setEx] = useState(names[0] || "");
  const h = history[ex] || [];
  const best = h.length ? h.reduce((a, b) => (b.e1rm > a.e1rm ? b : a)) : null;

  // Workouts per week (12 weeks)
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

  // Hard sets per muscle group, last 7 days (aim 10–20)
  const sets7 = useMemo(() => {
    const from = lastNDays(7)[0];
    const m = {};
    for (const s of fit.sessions) if (s.date >= from) for (const e of s.exercises || []) {
      const g = e.group || groupOf(e.exercise) || "other";
      m[g] = (m[g] || 0) + (e.sets || []).length;
    }
    return ["chest", "shoulders", "triceps", "back", "biceps", "legs", "core"].map((g) => ({ g, n: m[g] || 0 }));
  }, [fit.sessions]);

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
      <FinCard
        title="Strength progress"
        className="lg:row-span-2"
        action={
          names.length > 0 && (
            <select value={ex} onChange={(e) => setEx(e.target.value)} className="max-w-[220px] rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold text-white outline-none [color-scheme:dark]" aria-label="Exercise">
              {names.map((n) => <option key={n}>{n}</option>)}
            </select>
          )
        }
      >
        {h.length ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Est. 1RM", `${Math.round(best.e1rm)} kg`],
                ["Best set", `${best.best.weight} × ${best.best.reps}`],
                ["Sessions", h.length],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-fin-input px-2 py-3">
                  <div className="text-[12px] text-fin-muted">{k}</div>
                  <div className="tabular text-[18px] font-extrabold">{v}</div>
                </div>
              ))}
            </div>
            <div className={`${kicker} mt-4`}>Estimated 1-rep max over time</div>
            <LineChart points={h.map((x) => ({ x: prettyDate(x.date, { day: "numeric", month: "short" }), y: Math.round(x.e1rm * 10) / 10 }))} format={(v) => `${v} kg`} height={170} />
            <div className={`${kicker} mt-4`}>Recent sessions</div>
            <div className="fin-scroll space-y-1.5 lg:max-h-[calc(100dvh-560px)] lg:min-h-[60px] lg:overflow-y-auto">
              {[...h].reverse().slice(0, 8).map((x, i) => (
                <div key={i} className="flex justify-between gap-3 text-[13.5px]">
                  <span className="text-fin-muted">{prettyDate(x.date, { day: "numeric", month: "short" })}</span>
                  <span className="tabular truncate">{x.sets.map((s) => `${s.weight}×${s.reps}`).join(" · ")}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon="chart">Finish a workout to see your lifts climb here.</EmptyState>
        )}
      </FinCard>
      <FinCard title="Workouts per week">
        <Bars data={weeks} target={(fit.settings?.schedule || []).filter((s) => s !== "rest").length} format={(v) => `${v} workout${v === 1 ? "" : "s"}`} />
        <div className="mt-2 text-[12.5px] text-fin-faint">Dashed line = your planned training days per week.</div>
      </FinCard>
      <FinCard title="Sets per muscle · last 7 days">
        <div className="space-y-2">
          {sets7.map(({ g, n }) => (
            <div key={g} className="flex items-center gap-3 text-[13.5px]">
              <span className="w-[74px] shrink-0 font-semibold">{GROUP_LABEL[g]}</span>
              <div className="relative h-2.5 flex-1 rounded-full bg-fin-input">
                <div className="absolute inset-y-0 rounded-full bg-white/[0.06]" style={{ left: `${(10 / 24) * 100}%`, width: `${(10 / 24) * 100}%` }} />
                <div className="relative h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(1, n / 24) * 100}%`, background: n >= 10 ? "#34d399" : n > 0 ? "rgb(var(--fin-accent))" : "transparent" }} />
              </div>
              <span className="tabular w-8 shrink-0 text-right text-fin-muted">{n}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[12.5px] text-fin-faint">Shaded zone = 10–20 sets a week, a common range for muscle growth.</div>
      </FinCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Program                                                             */
/* ------------------------------------------------------------------ */
export function TrainProgram() {
  const fit = useFit();
  const program = fit.settings?.program || {};
  const schedule = fit.settings?.schedule || [];
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
            <select
              value={schedule[d] || "rest"}
              onChange={(e) => fit.saveSettings({ schedule: schedule.map((s, i) => (i === d ? e.target.value : s)) }, "Schedule saved")}
              className="rounded-lg bg-fin-tile px-2 py-1 text-[13px] font-semibold text-white outline-none [color-scheme:dark]"
            >
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
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 [&>*]:min-w-0">
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
                  <li key={p.exercise} className="flex items-center gap-2 rounded-2xl bg-fin-input px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-semibold">{p.exercise}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-fin-muted">
                        <NumberBox value={p.sets} onChange={(v) => v !== "" && edit(s.id, i, { sets: Math.max(1, Math.min(10, v)) })} className="!w-12 !py-1 !text-[13px]" label="Sets" /> sets ×
                        <NumberBox value={p.reps} onChange={(v) => v !== "" && edit(s.id, i, { reps: Math.max(1, Math.min(50, v)) })} className="!w-12 !py-1 !text-[13px]" label="Reps" /> reps
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <IconButton icon="up" label="Move up" onClick={() => move(s.id, i, -1)} className={`!h-8 !w-8 ${i === 0 ? "pointer-events-none opacity-20" : ""}`} size={15} />
                      <IconButton icon="down" label="Move down" onClick={() => move(s.id, i, 1)} className={`!h-8 !w-8 ${i === list.length - 1 ? "pointer-events-none opacity-20" : ""}`} size={15} />
                      <IconButton icon="trash" label={`Remove ${p.exercise}`} onClick={() => save({ ...program, [s.id]: list.filter((_, j) => j !== i) })} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />
                    </div>
                  </li>
                ))}
              </ol>
            </FinCard>
          );
        })}
      </div>
      <ExercisePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        exclude={(program[picker] || []).map((p) => p.exercise)}
        onPick={(x) => {
          save({ ...program, [picker]: [...(program[picker] || []), { exercise: x.exercise, group: x.group || groupOf(x.exercise), sets: 3, reps: 10 }] });
          setPicker(null);
        }}
      />
    </div>
  );
}
