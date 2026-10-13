// Journal › Week: the weekly review (Mon–Sun), with the week's moods and highlights.
import { FinCard } from "../../finances/fin-ui.jsx";
import { addDays, isoDate, parseISO, todayISO } from "../../finances/lib";
import { moodOf } from "./content.js";
import { entryKey, useJournal } from "./JournalContext.jsx";
import { AutoText, COL } from "./TodayView.jsx";

/** Monday and Sunday of the week that contains `iso`. */
export function weekOf(iso) {
  const d = parseISO(iso);
  const mon = addDays(d, -((d.getDay() + 6) % 7));
  return { mon: isoDate(mon), sun: isoDate(addDays(mon, 6)), days: Array.from({ length: 7 }, (_, i) => isoDate(addDays(mon, i))) };
}

export default function WeekView({ date, onOpenDay }) {
  const j = useJournal();
  const w = weekOf(date);
  const review = j.byKey[entryKey("week", w.sun)] || {};
  const save = (patch) => j.save("week", w.sun, patch);
  const days = w.days.map((d) => ({ d, e: j.byKey[entryKey("day", d)] }));
  const moods = days.map((x) => x.e?.mood).filter(Boolean);
  const avg = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
  const fmt = (iso, o = { weekday: "short", day: "numeric" }) => parseISO(iso).toLocaleDateString("en-IN", o);
  const today = todayISO();

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
      <div className={COL}>
        <FinCard title={`Week of ${fmt(w.mon, { day: "numeric", month: "short" })} – ${fmt(w.sun, { day: "numeric", month: "short" })}`}>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map(({ d, e }) => {
              const m = moodOf(e?.mood);
              return (
                <button key={d} onClick={() => onOpenDay(d)} disabled={d > today} className="flex flex-col items-center gap-1 rounded-xl bg-fin-input py-2 transition hover:bg-fin-tile disabled:opacity-30">
                  <span className="text-[11px] font-semibold text-fin-muted">{fmt(d, { weekday: "short" })}</span>
                  <span className="text-[20px] leading-none">{m ? m.face : "·"}</span>
                  <span className="text-[10.5px] text-fin-faint">{parseISO(d).getDate()}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-[13.5px] text-fin-muted">
            {moods.length ? `Average mood ${avg.toFixed(1)} / 5 over ${moods.length} day${moods.length === 1 ? "" : "s"}` : "No check-ins this week yet."}
          </div>
        </FinCard>
        <FinCard title="This week's highlights">
          {days.some((x) => x.e?.highlight || x.e?.learned) ? (
            <div className="space-y-2.5">
              {days
                .filter((x) => x.e?.highlight || x.e?.learned)
                .map(({ d, e }) => (
                  <button key={d} onClick={() => onOpenDay(d)} className="block w-full rounded-xl bg-fin-input px-3 py-2.5 text-left hover:bg-fin-tile">
                    <div className="text-[12px] font-semibold text-fin-muted">{fmt(d)}</div>
                    {e.highlight && <div className="mt-0.5 text-[14px] text-white/90">✨ {e.highlight}</div>}
                    {e.learned && <div className="mt-0.5 text-[13.5px] text-white/70">💡 {e.learned}</div>}
                  </button>
                ))}
            </div>
          ) : (
            <div className="text-[14px] text-fin-muted">Highlights and lessons from your daily pages show up here.</div>
          )}
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard title="Weekly review">
          <p className="mb-3 text-[13.5px] text-fin-muted">Best done on Sunday evening — 5 minutes.</p>
          <div className="mb-2 text-[13px] font-semibold text-white/85">🏆 Wins — what went well?</div>
          <AutoText rows={3} value={review.wins} placeholder="Big or small" onSave={(wins) => save({ wins })} />
          <div className="mb-2 mt-4 text-[13px] font-semibold text-white/85">📚 Lessons — what did this week teach me?</div>
          <AutoText rows={3} value={review.lessons} placeholder="About work, people, habits…" onSave={(lessons) => save({ lessons })} />
          <div className="mb-2 mt-4 text-[13px] font-semibold text-white/85">🔧 Next week — one thing to change</div>
          <AutoText rows={2} value={review.change} placeholder="Keep it small and specific" onSave={(change) => save({ change })} />
        </FinCard>
      </div>
    </div>
  );
}
