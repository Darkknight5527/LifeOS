// Today, History, Insights and Routine screens for Hair and Body care.
import { useEffect, useMemo, useState } from "react";
import { useCare } from "./CareContext.jsx";
import { DailyChecklist, DayRings, HairCheckIn, PeriodicCard, usePeriodic } from "./care-ui.jsx";
import {
  AREAS,
  EVERY_PRESETS,
  HAIR_FALL,
  PERIOD,
  PERIODS,
  SCALP,
  STATE_COLOR,
  WEEKDAYS,
  agoLabel,
  completion,
  dailyFor,
  daysLabel,
  dueLabel,
  everyLabel,
  isScheduled,
  lastNDays,
  nextScheduled,
  periodicStatus,
  prettyDate,
  streak,
  todayISO,
} from "./lib";
import { daysInMonth, monthKey, monthLabel, parseISO, shiftMonth } from "../../finances/lib";
import { EmptyState, FinCard, GhostButton, Icon, IconButton, Pill, PrimaryButton, Ring, Segmented, Sheet, TextField } from "../../finances/fin-ui.jsx";

const H = "lg:h-[calc(100dvh-178px)] lg:min-h-[380px]"; // tall cards fit the laptop screen

/* ------------------------------------------------------------------ */
/* Today                                                               */
/* ------------------------------------------------------------------ */
export function CareToday({ area }) {
  const care = useCare(area);
  const today = todayISO();
  const c = completion(care.areaItems, care.doneOn(today), today);
  const run = streak(care.areaItems, care.doneOn);
  const periodic = usePeriodic(area);
  const due = periodic.filter((x) => !x.doneToday && ["overdue", "today"].includes(x.st.state));
  const next = nextScheduled(care.areaItems, today);
  const nextNames = next ? dailyFor(care.areaItems, next.iso).map((i) => i.name) : [];
  const cut = periodic.find((x) => /cut/i.test(x.item.name));
  const h = new Date().getHours();

  let headline;
  let nudge;
  if (area === "hair") {
    headline = c.total ? (
      <>
        {c.done}
        <span className="text-white/60">/{c.total}</span> <span className="text-[20px] font-bold text-white/85">wash-day steps</span>
      </>
    ) : (
      <span className="text-[28px]">Rest day for your hair</span>
    );
    nudge = c.total
      ? c.full
        ? "Wash day done. Let it air-dry if you can."
        : `Today: ${dailyFor(care.areaItems, today).map((i) => i.name).join(", ")}.`
      : next
      ? `Next: ${nextNames.join(", ")} ${next.inDays === 1 ? "tomorrow" : `on ${prettyDate(next.iso, { weekday: "long" })}`}.`
      : "No wash days set — add them in Routine.";
  } else {
    headline = (
      <>
        {c.done}
        <span className="text-white/60">/{c.total}</span> <span className="text-[20px] font-bold text-white/85">done today</span>
      </>
    );
    nudge = c.full
      ? "Every daily step done. Clean and fresh."
      : h < 14
      ? c.am.done < c.am.total
        ? "Start with your morning routine."
        : "Morning done. Evening routine later."
      : c.pm.done < c.pm.total
      ? "Don't skip the night routine — brush and floss."
      : "Almost there.";
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
        <section className="relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#36d6c2] via-[#1fb5a6] to-[#0e7f77] p-6 shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-20 h-36 w-36 rounded-full bg-white/[0.06]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[15px] font-semibold text-white/90">{prettyDate(today, { weekday: "long", day: "numeric", month: "long" })}</div>
              <div className="flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-[13px] font-bold" title="Scheduled days in a row with every step done">
                <Icon name="flame" size={15} stroke={2.2} />
                {run} day{run === 1 ? "" : "s"}
              </div>
            </div>
            <div className="mt-2 text-[34px] font-extrabold leading-tight tracking-tight">{headline}</div>
            <div className="mt-1 text-[14px] text-white/85">{nudge}</div>
            {c.total > 0 && (
              <div className="mt-3">
                <DayRings c={c} />
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold">
              {area === "hair" && cut && (
                <span className="rounded-full bg-black/15 px-3 py-1">
                  {cut.item.name}: {cut.doneToday ? "done today" : cut.st.state === "never" ? "log your last one" : dueLabel(cut.st).toLowerCase()}
                </span>
              )}
              <span className="rounded-full bg-black/15 px-3 py-1">{due.length ? `${due.length} task${due.length === 1 ? "" : "s"} due` : "No tasks due"}</span>
            </div>
          </div>
        </section>
        {area === "hair" ? <HairCheckIn date={today} delay={60} /> : <RecentCard area="body" />}
      </div>
      <DailyChecklist area={area} date={today} title={AREAS[area].dailyTitle} delay={40} className={H} />
      <PeriodicCard area={area} delay={80} className={`${H} lg:col-span-2 xl:col-span-1`} />
    </div>
  );
}

function RecentCard({ area }) {
  const care = useCare(area);
  const today = todayISO();
  const recent = care.areaItems
    .filter((i) => i.kind === "periodic")
    .map((i) => ({ i, last: (care.datesByKey[i.key] || []).slice(-1)[0] }))
    .filter((x) => x.last)
    .sort((a, b) => b.last.localeCompare(a.last))
    .slice(0, 5);
  return (
    <FinCard title="Recently done" delay={60}>
      {recent.length ? (
        <div className="space-y-2">
          {recent.map(({ i, last }) => (
            <div key={i.key} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fin-accent" />
                <span className="truncate font-semibold">{i.name}</span>
              </span>
              <span className="shrink-0 text-fin-muted">{agoLabel(last, today)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[14px] text-fin-muted">Tasks you mark done will show up here.</div>
      )}
    </FinCard>
  );
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function CareHistory({ area }) {
  const care = useCare(area);
  const today = todayISO();
  const [month, setMonth] = useState(monthKey());
  const [selected, setSelected] = useState(today);
  const periodicKeys = useMemo(() => new Set(care.areaItems.filter((i) => i.kind === "periodic").map((i) => i.key)), [care.areaItems]);

  const cells = useMemo(() => {
    const first = parseISO(`${month}-01`);
    const lead = (first.getDay() + 6) % 7;
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth(month); d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    return out;
  }, [month]);

  const summary = useMemo(() => {
    let full = 0;
    let tasks = 0;
    cells.forEach((iso) => {
      if (!iso || iso > today) return;
      const done = care.doneOn(iso);
      if (completion(care.areaItems, done, iso).full) full++;
      done.forEach((k) => periodicKeys.has(k) && tasks++);
    });
    return { full, tasks };
  }, [cells, care, periodicKeys, today]);

  const selDone = care.doneOn(selected);
  const sel = completion(care.areaItems, selDone, selected);
  const periodic = care.areaItems.filter((i) => i.kind === "periodic");

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
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11.5px] font-semibold text-fin-faint">
          {WEEK.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`b${i}`} />;
            const future = iso > today;
            const done = care.doneOn(iso);
            const c = completion(care.areaItems, done, iso);
            const task = [...done].some((k) => periodicKeys.has(k));
            const alpha = future || c.done === 0 ? 0 : 0.18 + c.pct * 0.72;
            return (
              <button
                key={iso}
                disabled={future}
                onClick={() => setSelected(iso)}
                title={`${prettyDate(iso)} · ${c.done}/${c.total} steps${task ? " · task done" : ""}`}
                className={`relative aspect-square rounded-xl text-[13px] font-semibold transition ${future ? "opacity-25" : "hover:ring-1 hover:ring-white/20"} ${
                  selected === iso ? "ring-2 ring-white" : iso === today ? "ring-1 ring-fin-accent" : ""
                } ${!c.total && !future ? "text-white/40" : ""}`}
                style={{ background: alpha ? `rgb(var(--fin-accent) / ${alpha})` : "#121215", color: c.pct > 0.6 ? "#06221f" : undefined }}
              >
                {Number(iso.slice(8))}
                {task && <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#fbbf24]" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-fin-muted">
          <span>
            {summary.full} complete day{summary.full === 1 ? "" : "s"} · {summary.tasks} task{summary.tasks === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#fbbf24]" /> task done
          </span>
        </div>
      </FinCard>

      <div className="space-y-4">
        <div>
          <div className="text-[20px] font-bold">{prettyDate(selected, { weekday: "long", day: "numeric", month: "long" })}</div>
          <div className="text-[13px] text-fin-muted">
            {sel.total ? `${sel.done}/${sel.total} steps${sel.full ? " · complete ✓" : ""}` : "No routine steps scheduled"} — tap to change anything for this day
          </div>
        </div>
        <div key={selected} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DailyChecklist area={area} date={selected} title={AREAS[area].dailyTitle} className="lg:max-h-[calc(100dvh-260px)]" />
          <div className="space-y-4">
            <FinCard title="Tasks done this day">
              {periodic.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {periodic.map((i) => {
                    const on = selDone.has(i.key);
                    return (
                      <button
                        key={i.key}
                        onClick={() => care.toggleKey(selected, i.key)}
                        aria-pressed={on}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-95 ${
                          on ? "bg-fin-accent text-[#06221f]" : "bg-fin-input text-white/75 hover:bg-fin-tile"
                        }`}
                      >
                        {on && <Icon name="check" size={12} stroke={3} />}
                        {i.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[14px] text-fin-muted">No periodic tasks set up.</div>
              )}
            </FinCard>
            {area === "hair" && <HairCheckIn date={selected} title="Hair on this day" />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */
export function CareInsights({ area, range = 30 }) {
  const care = useCare(area);
  const days = useMemo(() => lastNDays(range), [range]);
  const today = todayISO();

  const s = useMemo(() => {
    let amD = 0, amT = 0, pmD = 0, pmT = 0, full = 0, sched = 0;
    const daily = care.areaItems.filter((i) => i.kind === "daily");
    const per = daily.map((item) => ({ item, done: 0, total: 0 }));
    const fall = [];
    const scalp = {};
    let twice = 0, floss = 0;
    const hasBrush = care.areaItems.some((i) => i.key === "b-brush-am") && care.areaItems.some((i) => i.key === "b-brush-pm");
    days.forEach((iso) => {
      const done = care.doneOn(iso);
      const c = completion(care.areaItems, done, iso);
      amD += c.am.done; amT += c.am.total; pmD += c.pm.done; pmT += c.pm.total;
      if (c.total) sched++;
      if (c.full) full++;
      per.forEach((p) => {
        if (isScheduled(p.item, iso)) {
          p.total++;
          if (done.has(p.item.key)) p.done++;
        }
      });
      if (hasBrush && done.has("b-brush-am") && done.has("b-brush-pm")) twice++;
      if (done.has("b-floss")) floss++;
      const log = care.logFor(iso);
      fall.push({ iso, value: log?.fall || null });
      (log?.scalp || []).forEach((k) => k !== "healthy" && (scalp[k] = (scalp[k] || 0) + 1));
    });
    const tasks = care.areaItems
      .filter((i) => i.kind === "periodic")
      .map((item) => {
        const all = care.datesByKey[item.key] || [];
        const inRange = all.filter((d) => d >= days[0]);
        const gaps = all.slice(1).map((d, i) => Math.round((parseISO(d) - parseISO(all[i])) / 86400000)).slice(-6);
        const avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
        return { item, count: inRange.length, avg, st: periodicStatus(item, all, today) };
      })
      .sort((a, b) => b.count - a.count);
    return {
      am: amT ? amD / amT : 0,
      pm: pmT ? pmD / pmT : 0,
      fullPct: sched ? full / sched : 0,
      full,
      sched,
      per,
      tasks,
      fall,
      scalp: Object.entries(scalp).sort((a, b) => b[1] - a[1]),
      hasBrush,
      twice,
      floss,
    };
  }, [care, days, today]);

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
      <FinCard title="Consistency">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Morning", value: s.am, color: PERIOD.am.color },
            { label: "Evening", value: s.pm, color: PERIOD.pm.color },
            { label: area === "hair" ? "Wash days" : "Full days", value: s.fullPct, color: "rgb(45 212 191)" },
          ].map((r) => (
            <div key={r.label} className="flex flex-col items-center gap-2">
              <Ring value={r.value} max={1} color={r.color} size={76} stroke={8}>
                <span className="tabular text-[18px] font-extrabold">{Math.round(r.value * 100)}%</span>
              </Ring>
              <span className="text-[13px] font-semibold text-fin-muted">{r.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center text-[13px] text-fin-muted">
          {s.full} of {s.sched} {area === "hair" ? "routine" : ""} days fully done in the last {range} days
        </div>
      </FinCard>

      {area === "hair" ? (
        <FinCard title="Hair fall">
          {s.fall.some((f) => f.value) ? <FallBars data={s.fall} /> : <EmptyState icon="hair">Log hair fall on the Today tab to see the trend.</EmptyState>}
          {s.scalp.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-[12.5px]">
              <span className="text-fin-muted">Scalp:</span>
              {s.scalp.map(([k, n]) => (
                <span key={k} className="rounded-full bg-fin-input px-2.5 py-0.5 capitalize text-white/80">
                  {k} · {n}d
                </span>
              ))}
            </div>
          )}
        </FinCard>
      ) : (
        <FinCard title="Oral care">
          {s.hasBrush ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Brushed twice", n: s.twice, color: "#5eead4" },
                { label: "Flossed", n: s.floss, color: "#a78bfa" },
              ].map((r) => (
                <div key={r.label} className="flex flex-col items-center gap-2">
                  <Ring value={r.n} max={days.length} color={r.color} size={76} stroke={8}>
                    <span className="tabular text-[18px] font-extrabold">{Math.round((r.n / days.length) * 100)}%</span>
                  </Ring>
                  <span className="text-[13px] font-semibold text-fin-muted">
                    {r.label} · {r.n}/{days.length} days
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="sparkle">Add morning and evening "Brush teeth" steps to track oral care.</EmptyState>
          )}
        </FinCard>
      )}

      <FinCard title="Step by step">
        {s.per.length ? (
          <div className="fin-scroll space-y-2.5 lg:max-h-[calc(100dvh-484px)] lg:min-h-[120px] lg:overflow-y-auto lg:pr-1">
            {s.per.map(({ item, done, total }) => {
              const pct = total ? done / total : 0;
              const p = PERIOD[item.period];
              return (
                <div key={item._id || item.key}>
                  <div className="flex items-baseline justify-between gap-2 text-[14px]">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="h-2 w-2 shrink-0 self-center rounded-full" style={{ background: p.color }} />
                      <span className="truncate font-semibold">{item.name}</span>
                      <span className="text-[12px] text-fin-muted">{p.label}</span>
                    </span>
                    <span className="tabular whitespace-nowrap text-fin-muted">
                      <span className="font-bold text-white">{Math.round(pct * 100)}%</span> · {done}/{total}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-fin-input">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct * 100}%`, background: p.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="list">No daily steps set up.</EmptyState>
        )}
      </FinCard>

      <FinCard title="Tasks: target vs actual">
        {s.tasks.length ? (
          <div className="fin-scroll space-y-2 lg:max-h-[calc(100dvh-484px)] lg:min-h-[120px] lg:overflow-y-auto lg:pr-1">
            {s.tasks.map(({ item, count, avg, st }) => {
              const late = avg && avg > item.every * 1.25;
              return (
                <div key={item.key} className="flex items-center gap-3 text-[14px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATE_COLOR[st.state] }} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
                  <span className="tabular shrink-0 text-[13px] text-fin-muted">{count}× in range</span>
                  <span className={`tabular w-[150px] shrink-0 text-right text-[13px] ${late ? "text-red-300" : "text-fin-muted"}`} title={`Target: ${everyLabel(item.every)}`}>
                    {avg ? `every ~${Math.round(avg)}d (aim ${item.every}d)` : `aim ${everyLabel(item.every).toLowerCase()}`}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="clock">No periodic tasks set up.</EmptyState>
        )}
      </FinCard>
    </div>
  );
}

function FallBars({ data }) {
  const [hover, setHover] = useState(null);
  const lvl = (v) => HAIR_FALL.findIndex((f) => f.value === v) + 1;
  return (
    <div>
      <div className="relative flex h-[110px] items-end gap-[2px] border-b border-white/10">
        {data.map((d, i) => {
          const f = d.value ? HAIR_FALL[lvl(d.value) - 1] : null;
          return (
            <div key={d.iso} className="relative flex h-full flex-1 items-end justify-center" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              {hover === i && (
                <div className={`pointer-events-none absolute bottom-full z-20 mb-2 whitespace-nowrap rounded-xl bg-[#2e2e36] px-3 py-2 text-[12.5px] shadow-xl ring-1 ring-white/10 ${i < data.length / 2 ? "left-0" : "right-0"}`}>
                  <div className="text-fin-muted">{prettyDate(d.iso)}</div>
                  <div className="font-bold">{f ? `${f.label} hair fall` : "Not logged"}</div>
                </div>
              )}
              <div className="w-full max-w-[18px] rounded-t-[3px] transition-all duration-500" style={{ height: f ? `${(lvl(d.value) / 3) * 100}%` : 3, background: f ? f.color : "rgba(255,255,255,0.08)" }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-fin-faint">
        <span>{prettyDate(data[0].iso, { day: "numeric", month: "short" })}</span>
        <span className="flex gap-2">
          {HAIR_FALL.map((f) => (
            <span key={f.value} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: f.color }} />
              {f.label}
            </span>
          ))}
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Routine                                                             */
/* ------------------------------------------------------------------ */
export function CareRoutine({ area }) {
  const care = useCare(area);
  const [sheet, setSheet] = useState({ open: false, item: null, preset: null });
  const groups = [
    ...PERIODS.map((p) => ({ id: p.id, title: `${p.label} ${area === "hair" ? "steps" : "routine"}`, icon: p.icon, color: p.color, soft: p.soft, filter: (i) => i.kind === "daily" && i.period === p.id, preset: { kind: "daily", period: p.id } })),
    { id: "periodic", title: "Every few days & weeks", icon: "clock", color: "#2dd4bf", soft: "rgba(45,212,191,.14)", filter: (i) => i.kind === "periodic", preset: { kind: "periodic" } },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0">
      {groups.map((g) => {
        const list = care.areaItems.filter(g.filter);
        return (
          <FinCard
            key={g.id}
            title={
              <span className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: g.soft, color: g.color }}>
                  <Icon name={g.icon} size={16} stroke={2} />
                </span>
                {g.title}
              </span>
            }
            action={
              <button onClick={() => setSheet({ open: true, item: null, preset: g.preset })} className="flex items-center gap-1.5 rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold transition hover:bg-[#30303a]">
                <Icon name="plus" size={15} stroke={2.4} /> Add
              </button>
            }
          >
            {list.length ? (
              <ol className="fin-scroll space-y-1.5 lg:max-h-[calc(100dvh-262px)] lg:overflow-y-auto lg:pr-1">
                {list.map((it, i) => (
                  <li key={it._id} className="flex items-center gap-2 rounded-2xl bg-fin-input px-3 py-2">
                    <button onClick={() => setSheet({ open: true, item: it, preset: null })} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[15px] font-semibold hover:text-fin-accent">{it.name}</span>
                      <span className="block truncate text-[12.5px] text-fin-muted">
                        {it.kind === "periodic" ? everyLabel(it.every) : daysLabel(it.days)}
                        {it.product ? ` · ${it.product}` : ""}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center">
                      <IconButton icon="up" label="Move up" onClick={() => care.moveItem(it, -1, g.filter)} className={`!h-8 !w-8 ${i === 0 ? "pointer-events-none opacity-20" : ""}`} size={16} />
                      <IconButton icon="down" label="Move down" onClick={() => care.moveItem(it, 1, g.filter)} className={`!h-8 !w-8 ${i === list.length - 1 ? "pointer-events-none opacity-20" : ""}`} size={16} />
                      <IconButton icon="trash" label={`Remove ${it.name}`} onClick={() => care.removeItem(it)} className="!h-8 !w-8 hover:!text-fin-danger" size={16} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="py-6 text-center text-[14px] text-fin-muted">Nothing here yet.</div>
            )}
          </FinCard>
        );
      })}
      <ItemSheet area={area} {...sheet} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </div>
  );
}

function ItemSheet({ area, open, item, preset, onClose }) {
  const care = useCare(area);
  const [f, setF] = useState(null);
  useEffect(() => {
    if (!open) return;
    const src = item || { kind: "daily", period: "am", days: [], every: 7, ...preset };
    setF({ name: src.name || "", product: src.product || "", kind: src.kind, period: src.period || "am", days: src.days || [], every: src.every || 7 });
  }, [open, item]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!f) return null;
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.name.trim() && (f.kind === "daily" || f.every >= 1);
  const sugg = AREAS[area].suggestions[f.kind] || [];

  async function save() {
    if (!valid) return;
    const data = { name: f.name.trim(), product: f.product.trim(), kind: f.kind, ...(f.kind === "daily" ? { period: f.period, days: f.days } : { every: Math.round(f.every) }) };
    const ok = item ? await care.updateItem(item, data) : await care.addItem({ area, ...data });
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? `Edit ${item.name}` : f.kind === "periodic" ? "New task" : "New step"}
      footer={
        <>
          {item ? (
            <GhostButton className="!px-4 text-fin-danger" aria-label="Remove" onClick={() => { care.removeItem(item); onClose(); }}>
              <Icon name="trash" size={20} />
            </GhostButton>
          ) : (
            <GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton>
          )}
          <PrimaryButton className="flex-1" disabled={!valid} onClick={save}>{item ? "Save changes" : "Add"}</PrimaryButton>
        </>
      }
    >
      <Lbl>Name</Lbl>
      <TextField autoFocus={!item} value={f.name} onChange={(e) => set("name")(e.target.value)} placeholder={sugg[0] ? `e.g. ${sugg[0]}` : ""} onKeyDown={(e) => e.key === "Enter" && save()} />
      {!item && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sugg.map((s) => (
            <button key={s} onClick={() => set("name")(s)} className="rounded-full bg-fin-input px-3 py-1 text-[13px] text-white/75 hover:bg-fin-tile">
              {s}
            </button>
          ))}
        </div>
      )}
      <Lbl>Product (optional)</Lbl>
      <TextField value={f.product} onChange={(e) => set("product")(e.target.value)} placeholder="Brand or product you use" />

      {f.kind === "daily" ? (
        <>
          <Lbl>When</Lbl>
          <Segmented value={f.period} onChange={set("period")} options={PERIODS.map((p) => ({ value: p.id, label: p.label }))} />
          <Lbl>Days</Lbl>
          <div className="flex flex-wrap gap-1.5">
            <Pill active={f.days.length === 0} onClick={() => set("days")([])}>Every day</Pill>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <Pill key={d} active={f.days.includes(d)} onClick={() => set("days")(f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d])}>
                {WEEKDAYS[d]}
              </Pill>
            ))}
          </div>
        </>
      ) : (
        <>
          <Lbl>How often</Lbl>
          <div className="flex flex-wrap items-center gap-1.5">
            {EVERY_PRESETS.map((p) => (
              <Pill key={p.value} active={f.every === p.value} onClick={() => set("every")(p.value)}>{p.label}</Pill>
            ))}
            <span className="ml-1 flex items-center gap-2 text-[14px] text-fin-muted">
              every
              <input
                type="number"
                min="1"
                max="365"
                value={f.every}
                onChange={(e) => set("every")(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                className="w-20 rounded-full bg-fin-input px-3 py-2 text-center text-[14px] text-white outline-none"
                aria-label="Every how many days"
              />
              days
            </span>
          </div>
        </>
      )}
    </Sheet>
  );
}

function Lbl({ children }) {
  return <div className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted first:mt-0">{children}</div>;
}
