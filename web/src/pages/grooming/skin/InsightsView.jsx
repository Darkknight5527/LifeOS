import { useMemo, useState } from "react";
import { useSkin } from "./SkinContext.jsx";
import { CONCERNS, CONDITIONS, PERIOD, completion, conditionOf, doneOf, isScheduled, lastNDays, prettyDate } from "./lib";
import { EmptyState, FinCard, Ring } from "../../finances/fin-ui.jsx";

export const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export default function InsightsView({ range = 30 }) {
  const { steps, byDate } = useSkin();
  const days = useMemo(() => lastNDays(range), [range]);

  const stats = useMemo(() => {
    let amDone = 0, amTot = 0, pmDone = 0, pmTot = 0, full = 0;
    const perStep = steps.map((s) => ({ step: s, done: 0, total: 0 }));
    const concerns = Object.fromEntries(CONCERNS.map((c) => [c, 0]));
    const cond = [];
    days.forEach((iso) => {
      const log = byDate[iso];
      const c = completion(steps, log, iso);
      amDone += c.am.done; amTot += c.am.total; pmDone += c.pm.done; pmTot += c.pm.total;
      if (c.full) full++;
      const done = new Set(doneOf(log));
      perStep.forEach((p) => {
        if (isScheduled(p.step, iso)) {
          p.total++;
          if (done.has(p.step.key)) p.done++;
        }
      });
      (log?.concerns || []).forEach((k) => (concerns[k] = (concerns[k] || 0) + 1));
      cond.push({ iso, value: conditionOf(log) });
    });
    const rated = cond.filter((c) => c.value);
    return {
      am: amTot ? amDone / amTot : 0,
      pm: pmTot ? pmDone / pmTot : 0,
      full,
      perStep,
      concerns: Object.entries(concerns).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]),
      cond,
      avg: rated.length ? rated.reduce((s, c) => s + c.value, 0) / rated.length : null,
      rated: rated.length,
    };
  }, [steps, byDate, days]);

  return (
    <div>
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
        {/* Consistency */}
        <FinCard title="Consistency">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Morning", value: stats.am, color: PERIOD.am.color },
              { label: "Evening", value: stats.pm, color: PERIOD.pm.color },
              { label: "Full days", value: stats.full / days.length, color: "rgb(45 212 191)" },
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
            {stats.full} of {days.length} days had every step done
          </div>
        </FinCard>

        {/* Condition trend */}
        <FinCard
          title="Skin condition"
          action={stats.avg && <span className="text-[13px] font-semibold text-fin-muted">avg <span className="text-white">{stats.avg.toFixed(1)}</span> / 5</span>}
        >
          {stats.rated ? <ConditionBars data={stats.cond} /> : <EmptyState icon="drop">Rate your skin on the Today tab to see the trend.</EmptyState>}
        </FinCard>

        {/* Step adherence */}
        <FinCard title="Step by step">
          <div className="fin-scroll space-y-2.5 lg:max-h-[calc(100dvh-470px)] lg:min-h-[120px] lg:overflow-y-auto lg:pr-1">
            {stats.perStep.map(({ step, done, total }) => {
              const pct = total ? done / total : 0;
              const p = PERIOD[step.period];
              return (
                <div key={step._id || step.key}>
                  <div className="flex items-baseline justify-between gap-2 text-[14px]">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="h-2 w-2 shrink-0 self-center rounded-full" style={{ background: p.color }} />
                      <span className="truncate font-semibold">{step.name}</span>
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
        </FinCard>

        {/* Concerns */}
        <FinCard title="Concerns noted">
          {stats.concerns.length ? (
            <div className="space-y-2.5">
              {stats.concerns.slice(0, 6).map(([name, n]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-[14px] font-semibold capitalize">{name}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-fin-input">
                    <div className="h-full rounded-full bg-fin-accent transition-[width] duration-700" style={{ width: `${(n / stats.concerns[0][1]) * 100}%` }} />
                  </div>
                  <span className="tabular w-16 shrink-0 text-right text-[13px] text-fin-muted">
                    {n} day{n === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="sparkle">No concerns noted in this period.</EmptyState>
          )}
        </FinCard>
      </div>
    </div>
  );
}

// One bar per day, height = condition (1–5), coloured by rating.
function ConditionBars({ data }) {
  const [hover, setHover] = useState(null);
  return (
    <div>
      <div className="relative flex h-[128px] items-end gap-[2px] border-b border-white/10">
        {[1, 3, 5].map((g) => (
          <div key={g} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/[0.06]" style={{ bottom: `${(g / 5) * 100}%` }} />
        ))}
        {data.map((d, i) => {
          const c = d.value ? CONDITIONS[d.value - 1] : null;
          return (
            <div
              key={d.iso}
              className="relative flex h-full flex-1 cursor-default items-end justify-center"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              {hover === i && (
                <div className={`pointer-events-none absolute bottom-full z-20 mb-2 whitespace-nowrap rounded-xl bg-[#2e2e36] px-3 py-2 text-[12.5px] shadow-xl ring-1 ring-white/10 ${i < data.length / 2 ? "left-0" : "right-0"}`}>
                  <div className="text-fin-muted">{prettyDate(d.iso)}</div>
                  <div className="font-bold">{c ? `${c.face} ${c.label}` : "Not rated"}</div>
                </div>
              )}
              <div
                className="w-full max-w-[18px] rounded-t-[3px] transition-all duration-500"
                style={{ height: c ? `${(d.value / 5) * 100}%` : 3, background: c ? c.color : "rgba(255,255,255,0.08)", opacity: hover === null || hover === i ? 1 : 0.55 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-fin-faint">
        <span>{prettyDate(data[0].iso, { day: "numeric", month: "short" })}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
