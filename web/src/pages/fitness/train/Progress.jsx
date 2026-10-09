// Train → Progress: graphs, rep maxes and goals per exercise.
import { useEffect, useMemo, useState } from "react";
import { useFit } from "../FitContext.jsx";
import { GROUP_LABEL, REP_MAX, addDays, daysBetween, e1rm, fmtTime, groupOf, isoDate, lastNDays, metricsFor, parseISO, prettyDate, r1, repMaxes, todayISO, trendLine, typeOf, working } from "../lib";
import { Bars, LineChart, NumberBox, kicker } from "../fit-ui.jsx";
import { EmptyState, FinCard, Pill, Segmented } from "../../finances/fin-ui.jsx";
import { kg, setLabel, useExerciseHistory, volumeOf } from "./shared.jsx";

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
  // Exercise picker grouped by muscle, most-trained first within each group.
  const groupedNames = useMemo(() => {
    const customs = fit.settings?.customExercises || [];
    const by = {};
    for (const n of names) {
      const g = [...history[n]].reverse().find((x) => x.group)?.group || customs.find((c) => c.exercise === n)?.group || groupOf(n) || "other";
      (by[g] ||= []).push(n);
    }
    return [...Object.keys(GROUP_LABEL), "other"].filter((g) => by[g]).map((g) => ({ g, label: GROUP_LABEL[g] || "Other", list: by[g] }));
  }, [history, fit.settings?.customExercises]); // eslint-disable-line react-hooks/exhaustive-deps
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
              {groupedNames.map(({ g, label, list }) => (
                <optgroup key={g} label={`${label} (${list.length})`}>
                  {list.map((n) => <option key={n} value={n}>{n}</option>)}
                </optgroup>
              ))}
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
                {(() => {
                  const fmt = (v) => (m.value === "time" ? fmtTime(Math.round(v)) : `${r1(v).toLocaleString("en-IN")}${m.unit ? ` ${m.unit}` : ""}`);
                  const multiYear = h[0].date.slice(0, 4) !== h[h.length - 1].date.slice(0, 4);
                  const vals = ys.filter((v) => v != null);
                  const bestV = Math.max(...vals);
                  const bestI = ys.indexOf(bestV);
                  const delta = vals.length > 1 ? vals[vals.length - 1] - vals[0] : null;
                  return (
                    <>
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        {[
                          ["Latest", fmt(vals[vals.length - 1]), prettyDate(h[h.length - 1].date, { day: "numeric", month: "short", year: "numeric" })],
                          ["Best", fmt(bestV), prettyDate(h[bestI].date, { day: "numeric", month: "short", year: "numeric" })],
                          ["Change", delta == null ? "—" : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${fmt(Math.abs(delta))}`, `over ${h.length} session${h.length === 1 ? "" : "s"}`],
                        ].map(([k, v, sub]) => (
                          <div key={k} className="rounded-2xl bg-fin-input px-3 py-2">
                            <div className="text-[11.5px] text-fin-muted">{k}</div>
                            <div className={`tabular text-[17px] font-extrabold ${k === "Change" && delta ? (delta > 0 ? "text-emerald-400" : "text-fin-danger") : ""}`}>{v}</div>
                            <div className="truncate text-[11px] text-fin-faint">{sub}</div>
                          </div>
                        ))}
                      </div>
                      <LineChart
                        points={h.map((x, i) => ({ x: prettyDate(x.date, multiYear ? { day: "numeric", month: "short", year: "2-digit" } : { day: "numeric", month: "short" }), y: ys[i] }))}
                        second={trend.map((y, i) => ({ x: h[i].date, y }))}
                        format={fmt}
                        axisFormat={(v) => (m.value === "time" ? fmtTime(Math.round(v)) : r1(v) >= 1000 ? `${r1(v / 1000)}k` : `${r1(v)}`)}
                        height={150}
                      />
                      <div className="mt-1 flex justify-between text-[12px] text-fin-faint">
                        <span>Hover or tap the chart to see each session{m.unit ? ` · values in ${m.unit}` : ""}</span>
                        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-white/40" /> Trend</span>
                      </div>
                    </>
                  );
                })()}
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
