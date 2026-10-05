import { useMemo, useState } from "react";
import { useSkin } from "./SkinContext.jsx";
import { CONDITIONS, completion, conditionOf, prettyDate, todayISO } from "./lib";
import { daysInMonth, monthLabel, monthKey, parseISO, shiftMonth } from "../../finances/lib";
import { FinCard, IconButton, Segmented } from "../../finances/fin-ui.jsx";
import { RoutineChecklist, SkinCheckIn } from "./skin-ui.jsx";

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function HistoryView() {
  const { steps, byDate } = useSkin();
  const today = todayISO();
  const [month, setMonth] = useState(monthKey());
  const [selected, setSelected] = useState(today);
  const [panel, setPanel] = useState("routine");

  const cells = useMemo(() => {
    const first = parseISO(`${month}-01`);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const n = daysInMonth(month);
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= n; d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    return out;
  }, [month]);

  const summary = useMemo(() => {
    let logged = 0;
    let full = 0;
    cells.forEach((iso) => {
      if (!iso || iso > today) return;
      const c = completion(steps, byDate[iso], iso);
      if (c.done > 0 || byDate[iso]) logged++;
      if (c.full) full++;
    });
    return { logged, full };
  }, [cells, steps, byDate, today]);

  const sel = completion(steps, byDate[selected], selected);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(360px,440px)_1fr] lg:gap-4 [&>*]:min-w-0">
      {/* Calendar */}
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
            const c = completion(steps, byDate[iso], iso);
            const cond = conditionOf(byDate[iso]);
            const alpha = future || c.done === 0 ? 0 : 0.18 + c.pct * 0.72;
            return (
              <button
                key={iso}
                disabled={future}
                onClick={() => setSelected(iso)}
                title={`${prettyDate(iso)} · ${c.done}/${c.total} steps`}
                className={`relative aspect-square rounded-xl text-[13px] font-semibold transition ${future ? "opacity-25" : "hover:ring-1 hover:ring-white/20"} ${
                  selected === iso ? "ring-2 ring-white" : iso === today ? "ring-1 ring-fin-accent" : ""
                }`}
                style={{ background: alpha ? `rgb(var(--fin-accent) / ${alpha})` : "#121215", color: c.pct > 0.6 ? "#06221f" : undefined }}
              >
                {Number(iso.slice(8))}
                {cond && <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: CONDITIONS[cond - 1].color }} />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-[12.5px] text-fin-muted">
          <span>
            {summary.logged} days logged · {summary.full} complete
          </span>
          <span className="flex items-center gap-1">
            Less
            {[0.18, 0.4, 0.65, 0.9].map((a) => (
              <span key={a} className="h-3 w-3 rounded" style={{ background: `rgb(var(--fin-accent) / ${a})` }} />
            ))}
            More
          </span>
        </div>
      </FinCard>

      {/* Selected day */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[20px] font-bold">{prettyDate(selected, { weekday: "long", day: "numeric", month: "long" })}</div>
            <div className="text-[13px] text-fin-muted">
              {sel.done}/{sel.total} steps{sel.full ? " · complete ✓" : ""} — tap to change anything for this day
            </div>
          </div>
          <Segmented
            className="w-[230px] [&_button]:!py-1.5 [&_button]:!text-[13px]"
            value={panel}
            onChange={setPanel}
            options={[
              { value: "routine", label: "Routine" },
              { value: "skin", label: "Skin notes" },
            ]}
          />
        </div>
        {panel === "routine" ? (
          <div key={selected} className="space-y-4">
            <RoutineChecklist date={selected} period="am" compact />
            <RoutineChecklist date={selected} period="pm" compact />
          </div>
        ) : (
          <SkinCheckIn key={selected} date={selected} title="Skin on this day" />
        )}
      </div>
    </div>
  );
}
