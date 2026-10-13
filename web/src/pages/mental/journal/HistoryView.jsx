// Journal › History: month calendar coloured by mood, search across every
// entry, and "on this day" (a week, a month and a year ago).
import { useMemo, useState } from "react";
import { EmptyState, FinCard, IconButton } from "../../finances/fin-ui.jsx";
import { addDays, daysInMonth, isoDate, parseISO, todayISO } from "../../finances/lib";
import { moodOf } from "./content.js";
import { entryKey, useJournal } from "./JournalContext.jsx";
import { COL } from "./TodayView.jsx";

const TEXT_FIELDS = ["highlight", "drained", "energized", "learned", "promptAnswer", "free", "wins", "lessons", "change"];
const textOf = (e) => [...TEXT_FIELDS.map((k) => e[k]), ...(e.gratitude || []), ...(e.tomorrow || []), ...(e.feelings || [])].filter(Boolean).join(" • ");
const fmt = (iso, o = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) => parseISO(iso).toLocaleDateString("en-IN", o);

function snippet(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, 140);
  const s = Math.max(0, i - 50);
  return (s ? "…" : "") + text.slice(s, i + q.length + 80) + "…";
}

export default function HistoryView({ onOpenDay }) {
  const j = useJournal();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [q, setQ] = useState("");

  const days = useMemo(() => j.entries.filter((e) => (e.kind || "day") === "day"), [j.entries]);
  const results = useMemo(() => {
    const s = q.trim();
    if (s.length < 2) return [];
    return [...j.entries]
      .filter((e) => textOf(e).toLowerCase().includes(s.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 50);
  }, [j.entries, q]);

  const n = daysInMonth(month);
  const first = (parseISO(`${month}-01`).getDay() + 6) % 7; // Monday first
  const shift = (d) => {
    const [y, m] = month.split("-").map(Number);
    const t = new Date(y, m - 1 + d, 1);
    setMonth(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  };
  const written = days.filter((e) => e.date.startsWith(month) && textOf(e)).length;

  const ago = [
    ["A week ago", isoDate(addDays(parseISO(today), -7))],
    ["A month ago", isoDate(new Date(parseISO(today).setMonth(parseISO(today).getMonth() - 1)))],
    ["A year ago", `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`],
  ]
    .map(([label, d]) => ({ label, d, e: j.byKey[entryKey("day", d)] }))
    .filter((x) => x.e && textOf(x.e));

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
      <div className={COL}>
        <FinCard
          title={parseISO(`${month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          action={
            <div className="flex items-center gap-1">
              <IconButton icon="left" label="Previous month" onClick={() => shift(-1)} />
              <IconButton icon="right" label="Next month" onClick={() => shift(1)} disabled={month >= today.slice(0, 7)} />
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11.5px] font-semibold text-fin-faint">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: first }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: n }, (_, i) => {
              const d = `${month}-${String(i + 1).padStart(2, "0")}`;
              const e = j.byKey[entryKey("day", d)];
              const m = moodOf(e?.mood);
              const hasText = e && textOf(e);
              return (
                <button
                  key={d}
                  disabled={d > today}
                  onClick={() => onOpenDay(d)}
                  className={`relative grid aspect-square place-items-center rounded-xl text-[13.5px] font-semibold transition hover:ring-2 hover:ring-fin-accent/50 disabled:opacity-25 ${m ? "" : "bg-fin-input"} ${d === today ? "ring-2 ring-white/70" : ""}`}
                  style={m ? { background: `${m.color}33`, color: m.color } : undefined}
                  title={m ? m.label : ""}
                >
                  {i + 1}
                  {hasText && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white/70" />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fin-muted">
            <span>{written} written page{written === 1 ? "" : "s"} this month</span>
            <span>· colour = mood · dot = something written</span>
          </div>
        </FinCard>
        {ago.length > 0 && (
          <FinCard title="On this day">
            <div className="space-y-2">
              {ago.map(({ label, d, e }) => (
                <button key={label} onClick={() => onOpenDay(d)} className="block w-full rounded-xl bg-fin-input px-3 py-2.5 text-left hover:bg-fin-tile">
                  <div className="text-[12px] font-semibold text-fin-accent">
                    {label} · {fmt(d, { day: "numeric", month: "short" })} {moodOf(e.mood)?.face || ""}
                  </div>
                  <div className="mt-0.5 line-clamp-3 text-[13.5px] text-white/80">{e.highlight || e.free || textOf(e)}</div>
                </button>
              ))}
            </div>
          </FinCard>
        )}
      </div>
      <div className={COL}>
        <FinCard title="Search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search everything you've written"
            className="w-full rounded-2xl bg-fin-input px-4 py-3 text-[15px] text-white outline-none placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50"
          />
          {q.trim().length >= 2 ? (
            results.length ? (
              <div className="mt-3 space-y-2">
                <div className="text-[12.5px] text-fin-muted">{results.length} page{results.length === 1 ? "" : "s"}</div>
                {results.map((e) => (
                  <button key={e._id} onClick={() => onOpenDay(e.date, e.kind)} className="block w-full rounded-xl bg-fin-input px-3 py-2.5 text-left hover:bg-fin-tile">
                    <div className="text-[12px] font-semibold text-fin-muted">
                      {e.kind === "week" ? "Weekly review · " : ""}
                      {fmt(e.date)}
                    </div>
                    <div className="selectable mt-0.5 text-[13.5px] text-white/85">{snippet(textOf(e), q.trim())}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-[14px] text-fin-muted">Nothing matches "{q.trim()}".</div>
            )
          ) : days.length === 0 ? (
            <EmptyState icon="edit">Your pages will show up here as you write.</EmptyState>
          ) : (
            <div className="mt-3 text-[13px] text-fin-faint">
              {j.entries.length} page{j.entries.length === 1 ? "" : "s"} so far. Type at least 2 letters.
            </div>
          )}
        </FinCard>
      </div>
    </div>
  );
}
