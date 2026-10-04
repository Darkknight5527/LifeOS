// Building blocks shared by the Hair and Body care screens.
import { useEffect, useState } from "react";
import { useCare } from "./CareContext.jsx";
import {
  HAIR_FALL,
  PERIOD,
  addDays,
  isoDate,
  parseISO,
  PERIODS,
  SCALP,
  STATE_COLOR,
  agoLabel,
  dailyFor,
  daysLabel,
  dueLabel,
  everyLabel,
  isScheduled,
  periodicStatus,
  prettyDate,
  todayISO,
} from "./lib";
import { FinCard, Icon, Ring, Sheet } from "../../finances/fin-ui.jsx";

const label = "mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted";

/* ---------- daily checklist (morning + evening in one card) ---------- */
export function DailyChecklist({ area, date, title, delay = 0, className = "" }) {
  const { areaItems, doneOn, toggleKey, setKeys } = useCare(area);
  const done = doneOn(date);
  const today = dailyFor(areaItems, date);
  const off = areaItems.filter((i) => i.kind === "daily" && !isScheduled(i, date));
  const count = today.filter((i) => done.has(i.key)).length;
  const all = today.length > 0 && count === today.length;

  return (
    <FinCard
      delay={delay}
      className={`flex flex-col ${className}`}
      title={
        <span className="flex items-center gap-2">
          {title}
          <span className="tabular normal-case tracking-normal text-fin-faint">
            {count}/{today.length}
          </span>
        </span>
      }
      action={
        today.length > 0 && (
          <button
            onClick={() => setKeys(date, today.map((i) => i.key), !all)}
            className="rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold text-white/85 transition hover:bg-[#30303a]"
          >
            {all ? "Clear" : "Mark all"}
          </button>
        )
      }
    >
      <div className="fin-scroll -mx-1 space-y-3 px-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {PERIODS.map((p) => {
          const list = today.filter((i) => i.period === p.id);
          if (!list.length) return null;
          return (
            <div key={p.id}>
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold" style={{ color: p.color }}>
                <Icon name={p.icon} size={14} stroke={2.2} /> {p.label}
              </div>
              <div className="space-y-1.5">
                {list.map((i) => (
                  <CheckRow key={i._id || i.key} item={i} on={done.has(i.key)} onClick={() => toggleKey(date, i.key)} />
                ))}
              </div>
            </div>
          );
        })}
        {!today.length && <Upcoming items={areaItems} date={date} />}
      </div>
      {off.length > 0 && (
        <div className="mt-3 border-t border-fin-line pt-3">
          <div className="mb-1.5 text-[12.5px] text-fin-faint">Did one of these anyway? Tap to log it.</div>
          <div className="flex flex-wrap gap-1.5">
            {off.map((i) => {
              const on = done.has(i.key);
              return (
                <button
                  key={i._id || i.key}
                  onClick={() => toggleKey(date, i.key)}
                  aria-pressed={on}
                  title={daysLabel(i.days)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold transition active:scale-95 ${
                    on ? "bg-fin-accent/15 text-fin-accent" : "bg-fin-input text-white/70 hover:bg-fin-tile"
                  }`}
                >
                  {on && <Icon name="check" size={12} stroke={3} />}
                  {i.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </FinCard>
  );
}

// Shown on a day with nothing scheduled: what's coming up this week.
function Upcoming({ items, date }) {
  const rows = [];
  let d = parseISO(date);
  for (let i = 1; i <= 7 && rows.length < 4; i++) {
    d = addDays(d, 1);
    const iso = isoDate(d);
    const list = dailyFor(items, iso);
    if (list.length) rows.push({ iso, i, list });
  }
  return (
    <div className="rounded-2xl bg-fin-input px-4 py-4">
      <div className="text-[14px] text-fin-muted">Nothing scheduled {date === todayISO() ? "today" : "on this day"}.</div>
      {rows.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-faint">Coming up</div>
          {rows.map((r) => (
            <div key={r.iso} className="flex items-baseline gap-3 text-[14px]">
              <span className="w-[86px] shrink-0 font-semibold text-fin-accent">{r.i === 1 ? "Tomorrow" : prettyDate(r.iso, { weekday: "long" })}</span>
              <span className="min-w-0 text-white/80">{r.list.map((x) => x.name).join(", ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckRow({ item, on, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.99] ${on ? "bg-fin-accent/10" : "bg-fin-input hover:bg-fin-tile"}`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 ${
          on ? "border-fin-accent bg-fin-accent text-[#06221f]" : "border-white/20 text-transparent group-hover:border-white/40"
        }`}
      >
        <Icon name="check" size={15} stroke={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] font-semibold transition ${on ? "text-white/60 line-through decoration-white/30" : ""}`}>{item.name}</span>
        {item.product && <span className="block truncate text-[12.5px] text-fin-muted">{item.product}</span>}
      </span>
      {item.days?.length > 0 && item.days.length < 7 && <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-fin-muted">{daysLabel(item.days)}</span>}
    </button>
  );
}

/* ---------- periodic tasks ---------- */
export function usePeriodic(area) {
  const care = useCare(area);
  const today = todayISO();
  const list = care.areaItems
    .filter((i) => i.kind === "periodic")
    .map((item) => ({ item, st: periodicStatus(item, care.datesByKey[item.key] || [], today), doneToday: care.doneOn(today).has(item.key) }));
  const rank = { overdue: 0, today: 1, soon: 2, ok: 3, never: 4 };
  list.sort((a, b) => (a.doneToday - b.doneToday) || rank[a.st.state] - rank[b.st.state] || (a.st.left ?? 0) - (b.st.left ?? 0));
  return list;
}

export function PeriodicCard({ area, title = "Every few days & weeks", delay = 0, className = "" }) {
  const care = useCare(area);
  const list = usePeriodic(area);
  const today = todayISO();
  const [open, setOpen] = useState(null);
  const dueCount = list.filter((x) => !x.doneToday && ["overdue", "today"].includes(x.st.state)).length;

  return (
    <FinCard
      delay={delay}
      className={`flex flex-col ${className}`}
      title={
        <span className="flex items-center gap-2">
          <Icon name="clock" size={15} /> {title}
        </span>
      }
      action={dueCount > 0 && <span className="rounded-full bg-red-400/10 px-2.5 py-1 text-[12px] font-bold text-red-300">{dueCount} due</span>}
    >
      {list.length ? (
        <div className="fin-scroll -mx-1 space-y-1.5 px-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {list.map(({ item, st, doneToday }) => {
            const color = doneToday ? "rgb(var(--fin-accent))" : STATE_COLOR[st.state];
            return (
              <div key={item._id || item.key} className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${doneToday ? "bg-fin-accent/10" : "bg-fin-input"}`}>
                <Ring value={doneToday ? 1 : st.state === "never" ? 0 : Math.max(0.04, 1 - st.frac)} max={1} color={color} size={34} stroke={4}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                </Ring>
                <button onClick={() => setOpen(item)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[15px] font-semibold hover:text-fin-accent">{item.name}</span>
                  <span className="block truncate text-[12.5px]" style={{ color: doneToday ? undefined : color }}>
                    {doneToday ? <span className="text-fin-muted">Done today · next in {everyLabel(item.every).toLowerCase().replace("every ", "")}</span> : (
                      <>
                        {dueLabel(st)}
                        {st.last && <span className="text-fin-faint"> · last {agoLabel(st.last, today)}</span>}
                      </>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => care.toggleKey(today, item.key)}
                  aria-pressed={doneToday}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-[13px] font-semibold transition active:scale-95 ${
                    doneToday ? "bg-fin-accent text-[#06221f]" : "bg-fin-tile text-white/85 hover:bg-[#30303a]"
                  }`}
                >
                  {doneToday ? "Done ✓" : "Done"}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-[14px] text-fin-muted">No periodic tasks yet — add some in Routine.</div>
      )}
      <TaskSheet area={area} item={open} onClose={() => setOpen(null)} />
    </FinCard>
  );
}

// Log a task on another date, and see when it was last done.
function TaskSheet({ area, item, onClose }) {
  const care = useCare(area);
  const [date, setDate] = useState(todayISO());
  useEffect(() => setDate(todayISO()), [item]);
  if (!item) return <Sheet open={false} onClose={onClose} />;
  const dates = [...(care.datesByKey[item.key] || [])].reverse();
  const st = periodicStatus(item, care.datesByKey[item.key] || []);
  const gaps = dates.slice(0, -1).map((d, i) => Math.round((new Date(d) - new Date(dates[i + 1])) / 86400000));
  const avg = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
  const doneThatDay = care.doneOn(date).has(item.key);

  return (
    <Sheet open={!!item} onClose={onClose} title={item.name}>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Target", everyLabel(item.every)],
          ["Your average", avg ? everyLabel(avg) : "—"],
          ["Status", dueLabel(st)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-fin-input px-2 py-3">
            <div className="text-[12px] text-fin-muted">{k}</div>
            <div className="mt-0.5 text-[14px] font-bold leading-tight">{v}</div>
          </div>
        ))}
      </div>
      <div className={`${label} mt-5`}>Log it on a date</div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="flex-1 rounded-2xl bg-fin-input px-4 py-2.5 text-[15px] text-white outline-none [color-scheme:dark]"
          aria-label="Date"
        />
        <button
          onClick={() => care.toggleKey(date, item.key)}
          className={`rounded-2xl px-4 py-2.5 text-[14px] font-semibold transition ${doneThatDay ? "bg-fin-accent text-[#06221f]" : "bg-fin-tile hover:bg-[#30303a]"}`}
        >
          {doneThatDay ? "Logged ✓ (undo)" : "Mark done"}
        </button>
      </div>
      <div className={`${label} mt-5`}>History</div>
      {dates.length ? (
        <div className="flex flex-wrap gap-1.5">
          {dates.slice(0, 12).map((d) => (
            <span key={d} className="rounded-full bg-fin-input px-3 py-1 text-[13px] text-white/80">
              {prettyDate(d, { day: "numeric", month: "short" })}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[14px] text-fin-muted">Not logged yet.</div>
      )}
    </Sheet>
  );
}

/* ---------- hair check-in ---------- */
export function HairCheckIn({ date, delay = 0, title = "How's your hair?", className = "" }) {
  const { logFor, save } = useCare("hair");
  const log = logFor(date);
  const [note, setNote] = useState(log?.notes || "");
  useEffect(() => setNote(log?.notes || ""), [log?.notes, date]);
  const scalp = new Set(log?.scalp || []);

  return (
    <FinCard title={title} delay={delay} className={className}>
      <div className={label}>Hair fall</div>
      <div className="grid grid-cols-3 gap-2">
        {HAIR_FALL.map((f) => {
          const on = log?.fall === f.value;
          return (
            <button
              key={f.value}
              onClick={() => save(date, { fall: on ? "" : f.value })}
              aria-pressed={on}
              className={`rounded-2xl border py-2 text-[14px] font-semibold transition active:scale-95 ${on ? "" : "border-transparent bg-fin-input text-white/80 hover:bg-fin-tile"}`}
              style={on ? { background: `${f.color}22`, borderColor: f.color, color: f.color } : undefined}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <div className={`${label} mt-3`}>Scalp</div>
      <div className="flex flex-wrap gap-1.5">
        {SCALP.map((s) => {
          const on = scalp.has(s);
          return (
            <button
              key={s}
              onClick={() => {
                const next = new Set(scalp);
                on ? next.delete(s) : next.add(s);
                if (s === "healthy" && !on) ["dry", "oily", "itchy", "dandruff", "flaky", "irritated"].forEach((x) => next.delete(x));
                if (s !== "healthy" && !on) next.delete("healthy");
                save(date, { scalp: [...next] });
              }}
              className={`rounded-full border px-3 py-1 text-[13px] font-semibold capitalize transition active:scale-95 ${
                on ? "border-fin-accent bg-fin-accent/10 text-fin-accent" : "border-transparent bg-fin-input text-white/80 hover:bg-fin-tile"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      <div className={`${label} mt-3`}>Note</div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note.trim() !== (log?.notes || "") && save(date, { notes: note.trim() })}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        placeholder="e.g. new shampoo, used a hair dryer"
        className="w-full rounded-2xl border border-transparent bg-fin-input px-4 py-2.5 text-[15px] text-white placeholder:text-fin-faint outline-none transition focus:border-fin-accent/60"
      />
    </FinCard>
  );
}

/* ---------- small AM/PM rings for the hero ---------- */
export function DayRings({ c, size = 50 }) {
  return (
    <div className="flex gap-3">
      {["am", "pm"].map((id) => {
        const p = PERIOD[id];
        const part = c[id];
        if (!part.total) return null;
        return (
          <div key={id} className="flex items-center gap-2">
            <Ring value={part.done} max={part.total || 1} color={p.color} size={size} stroke={6}>
              <Icon name={p.icon} size={17} stroke={2} className="text-white/85" />
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
