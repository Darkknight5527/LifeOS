import { useEffect, useState } from "react";
import { useSkin } from "./SkinContext.jsx";
import { CONCERNS, CONDITIONS, PERIOD, completion, conditionOf, doneOf, isScheduled, scheduledSteps, daysLabel } from "./lib";
import { FinCard, Icon, Ring } from "../../finances/fin-ui.jsx";

// Morning or evening checklist for one date. Tap a row to tick it.
export function RoutineChecklist({ date, period, delay = 0, compact = false }) {
  const { steps, byDate, toggleStep, setStepsDone } = useSkin();
  const p = PERIOD[period];
  const log = byDate[date];
  const done = new Set(doneOf(log));
  const list = scheduledSteps(steps, date, period);
  const offToday = steps.filter((s) => s.period === period && !isScheduled(s, date));
  const count = list.filter((s) => done.has(s.key)).length;
  const allDone = list.length > 0 && count === list.length;

  return (
    <FinCard
      delay={delay}
      className="flex flex-col"
      title={
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: p.soft, color: p.color }}>
            <Icon name={p.icon} size={16} stroke={2} />
          </span>
          {p.label}
          <span className="tabular normal-case tracking-normal text-fin-faint">
            {count}/{list.length}
          </span>
        </span>
      }
      action={
        list.length > 0 && (
          <button
            onClick={() => setStepsDone(date, list.map((s) => s.key), !allDone)}
            className="rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold text-white/85 transition hover:bg-[#30303a]"
          >
            {allDone ? "Clear" : "Mark all"}
          </button>
        )
      }
    >
      {list.length ? (
        <div className={`fin-scroll -mx-1 space-y-1.5 lg:max-h-[calc(100dvh-300px)] lg:overflow-y-auto ${compact ? "" : "lg:min-h-0"}`}>
          {list.map((s) => {
            const on = done.has(s.key);
            return (
              <button
                key={s._id || s.key}
                onClick={() => toggleStep(date, s.key)}
                aria-pressed={on}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.99] ${
                  on ? "bg-fin-accent/10" : "bg-fin-input hover:bg-fin-tile"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 ${
                    on ? "scale-100 border-fin-accent bg-fin-accent text-[#06221f]" : "border-white/20 text-transparent group-hover:border-white/40"
                  }`}
                >
                  <Icon name="check" size={15} stroke={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[15px] font-semibold transition ${on ? "text-white/60 line-through decoration-white/30" : ""}`}>{s.name}</span>
                  {s.product && <span className="block truncate text-[12.5px] text-fin-muted">{s.product}</span>}
                </span>
                {s.days?.length > 0 && s.days.length < 7 && (
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-fin-muted">{daysLabel(s.days)}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-[14px] text-fin-muted">No {p.label.toLowerCase()} steps scheduled for this day.</div>
      )}
      {offToday.length > 0 && (
        <div className="mt-3 text-[12.5px] text-fin-faint">
          Not today: {offToday.map((s) => `${s.name} (${daysLabel(s.days)})`).join(" · ")}
        </div>
      )}
    </FinCard>
  );
}

export function ConditionPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {CONDITIONS.map((c) => {
        const on = value === c.value;
        return (
          <button
            key={c.value}
            onClick={() => onChange(on ? null : c.value)}
            title={c.label}
            className={`flex flex-col items-center gap-0.5 rounded-2xl border py-1.5 transition active:scale-95 ${
              on ? "border-transparent" : "border-transparent bg-fin-input hover:bg-fin-tile"
            }`}
            style={on ? { background: `${c.color}26`, borderColor: c.color } : undefined}
          >
            <span className={`text-[22px] leading-none transition ${on ? "scale-110" : "opacity-70 grayscale-[40%]"}`}>{c.face}</span>
            <span className="text-[11.5px] font-semibold" style={{ color: on ? c.color : "#9b9ba5" }}>
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ConcernChips({ value, onChange }) {
  const set = new Set(value || []);
  return (
    <div className="flex flex-wrap gap-1.5">
      {CONCERNS.map((c) => {
        const on = set.has(c);
        return (
          <button
            key={c}
            onClick={() => {
              const next = new Set(set);
              on ? next.delete(c) : next.add(c);
              onChange([...next]);
            }}
            className={`rounded-full border px-3 py-1 text-[13px] font-semibold capitalize lg:px-2.5 lg:text-[12.5px] transition active:scale-95 ${
              on ? "border-fin-accent bg-fin-accent/10 text-fin-accent" : "border-transparent bg-fin-input text-white/80 hover:bg-fin-tile"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

// Condition, concerns and a note for one date — saves as you go.
export function SkinCheckIn({ date, delay = 0, title = "How's your skin?" }) {
  const { byDate, saveDay } = useSkin();
  const log = byDate[date];
  const [note, setNote] = useState(log?.notes || "");
  useEffect(() => setNote(log?.notes || ""), [log?.notes, date]);

  return (
    <FinCard title={title} delay={delay}>
      <ConditionPicker value={conditionOf(log)} onChange={(v) => saveDay(date, { condition: v ? String(v) : "" })} />
      <div className="mb-2 mt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Concerns</div>
      <ConcernChips value={log?.concerns} onChange={(c) => saveDay(date, { concerns: c })} />
      <div className="mb-2 mt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Note</div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note.trim() !== (log?.notes || "") && saveDay(date, { notes: note.trim() })}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        placeholder="e.g. tried a new serum, slept late"
        className="w-full rounded-2xl border border-transparent bg-fin-input px-4 py-2.5 text-[15px] text-white placeholder:text-fin-faint outline-none transition focus:border-fin-accent/60"
      />
    </FinCard>
  );
}

// Small AM / PM progress rings.
export function DayRings({ steps, log, date, size = 58 }) {
  const c = completion(steps, log, date);
  return (
    <div className="flex gap-3">
      {["am", "pm"].map((id) => {
        const p = PERIOD[id];
        const part = c[id];
        return (
          <div key={id} className="flex items-center gap-2">
            <Ring value={part.done} max={part.total || 1} color={p.color} size={size} stroke={6}>
              <Icon name={p.icon} size={18} stroke={2} className="text-white/85" />
            </Ring>
            <div className="leading-tight">
              <div className="tabular text-[17px] font-bold">
                {part.done}/{part.total}
              </div>
              <div className="text-[12px] text-white/75">{p.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
