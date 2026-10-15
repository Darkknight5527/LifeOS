// Sunday check-in: the week's numbers in plain words, a few quick questions,
// and one focus for next week. Past check-ins on the right.
import { useEffect, useMemo, useState } from "react";
import { useFit } from "./FitContext.jsx";
import { LEVEL, defaultWeek, shiftWeek, suggestions, verdicts, weekLabel, weekStats, weekSunday } from "./checkin.js";
import { kicker } from "./fit-ui.jsx";
import { EmptyState, FinCard, Icon, Pill, PrimaryButton } from "../finances/fin-ui.jsx";
import { r1, todayISO } from "./lib";

const QUESTIONS = [
  { id: "energy", label: "Energy", low: "Drained", high: "Full of energy" },
  { id: "hunger", label: "Hunger", low: "Always hungry", high: "Rarely hungry" },
  { id: "sleep", label: "Sleep", low: "Poor", high: "Great" },
  { id: "stress", label: "Stress", low: "Very stressed", high: "Calm" },
];
const STUCK = [
  { value: "yes", label: "Yes" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "Not really" },
];
const blank = { ratings: {}, lastFocus: "", win: "", struggle: "", focus: "" };
const area = "w-full resize-none rounded-2xl border border-transparent bg-fin-input px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-fin-faint focus:border-fin-accent/60";

export function CheckinView() {
  const fit = useFit();
  const today = todayISO();
  const thisWeek = weekSunday(today);
  const [week, setWeek] = useState(() => defaultWeek(fit.checkins, today));
  const saved = fit.checkins.find((c) => c.week === week);
  const prev = fit.checkins.find((c) => c.week === shiftWeek(week, -1));
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setForm(saved ? { ratings: saved.ratings || {}, lastFocus: saved.lastFocus || "", win: saved.win || "", struggle: saved.struggle || "", focus: saved.focus || "" } : blank);
  }, [week, saved?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => weekStats(fit, week, today), [fit, week, today]);
  const list = useMemo(() => verdicts(stats), [stats]);
  const ideas = useMemo(() => suggestions(list), [list]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const history = [...fit.checkins].sort((a, b) => b.week.localeCompare(a.week));
  const unfinished = week === thisWeek && new Date().getDay() !== 0;

  async function save() {
    setBusy(true);
    const data = { ...form, week, stats };
    if (saved) await fit.checkinOps.update(saved, data, "Check-in updated");
    else await fit.checkinOps.add(data, "Check-in saved — have a good week");
    setBusy(false);
  }

  const col = "fin-scroll space-y-5 lg:h-[calc(100dvh-178px)] lg:space-y-4 lg:overflow-y-auto lg:pr-1";
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 xl:grid-cols-[1fr_1.1fr_0.9fr] [&>*]:min-w-0">
      {/* ---------- the week in numbers ---------- */}
      <div className={col}>
        <section className="relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6cb2ff] via-[#3b82f6] to-[#1d4ed8] p-6 shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setWeek((w) => shiftWeek(w, -1))} className="grid h-8 w-8 place-items-center rounded-lg bg-black/15 hover:bg-black/25" aria-label="Previous week">
                <Icon name="left" size={16} stroke={2.4} />
              </button>
              <div className="text-center">
                <div className="text-[15px] font-semibold text-white/90">Week of {weekLabel(week)}</div>
                <div className="text-[12px] text-white/75">{week === thisWeek ? (unfinished ? `This week · ${stats.days} of 7 days so far` : "This week") : saved ? "Checked in" : "Not checked in"}</div>
              </div>
              <button onClick={() => setWeek((w) => shiftWeek(w, 1))} className={`grid h-8 w-8 place-items-center rounded-lg bg-black/15 hover:bg-black/25 ${week >= thisWeek ? "pointer-events-none opacity-30" : ""}`} aria-label="Next week">
                <Icon name="right" size={16} stroke={2.4} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ["Trend", stats.weight ? `${stats.weight} kg` : "—", stats.change != null ? `${stats.change > 0 ? "+" : ""}${stats.change} kg` : "no change yet"],
                ["Workouts", stats.planned ? `${stats.strength}/${stats.planned}` : String(stats.strength), stats.cardio ? `+${stats.cardio} cardio` : "planned"],
                ["Food logged", `${stats.foodDays}/${stats.days}`, stats.foodDays ? `avg ${stats.avgCal} kcal` : "days"],
              ].map(([k, v, sub]) => (
                <div key={k} className="rounded-2xl bg-black/15 px-2 py-2.5">
                  <div className="text-[11.5px] text-white/80">{k}</div>
                  <div className="tabular text-[20px] font-extrabold leading-tight">{v}</div>
                  <div className="tabular truncate text-[11.5px] text-white/75">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FinCard title="How the week went" delay={60}>
          <div className="space-y-2">
            {list.map((v) => (
              <div key={v.id} className="rounded-2xl bg-fin-input px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: LEVEL[v.level].color }} title={LEVEL[v.level].label} />
                  <span className="text-[14px] font-semibold">{v.label}</span>
                  <span className="tabular ml-auto text-[13px] text-fin-muted">{v.value}</span>
                </div>
                <div className="mt-0.5 pl-[18px] text-[13px] leading-snug text-fin-muted">{v.text}</div>
              </div>
            ))}
          </div>
          {unfinished && <div className="mt-3 text-[12.5px] text-fin-faint">The week isn't over yet — these numbers only count the days so far. Sunday evening is the best time to check in.</div>}
        </FinCard>
      </div>

      {/* ---------- questions ---------- */}
      <div className={col}>
        <FinCard title={saved ? "Your check-in · saved" : "Your check-in"} delay={90}>
          <div className="space-y-5">
            {prev?.focus && (
              <div>
                <div className={kicker}>Last week's focus</div>
                <div className="rounded-2xl bg-fin-input px-3.5 py-2.5 text-[14px]">“{prev.focus}”</div>
                <div className="mt-2 text-[13.5px] text-fin-muted">Did you stick to it?</div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {STUCK.map((o) => (
                    <Pill key={o.value} active={form.lastFocus === o.value} onClick={() => set({ lastFocus: form.lastFocus === o.value ? "" : o.value })}>{o.label}</Pill>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className={kicker}>How did you feel this week?</div>
              <div className="space-y-3">
                {QUESTIONS.map((q) => (
                  <div key={q.id}>
                    <div className="flex items-baseline justify-between text-[13.5px]">
                      <span className="font-semibold">{q.label}</span>
                      <span className="text-[12px] text-fin-faint">1 = {q.low} · 5 = {q.high}</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={q.label}>
                      {[1, 2, 3, 4, 5].map((n) => {
                        const on = form.ratings[q.id] === n;
                        return (
                          <button
                            key={n}
                            role="radio"
                            aria-checked={on}
                            aria-label={`${q.label} ${n}`}
                            onClick={() => set({ ratings: { ...form.ratings, [q.id]: on ? undefined : n } })}
                            className={`tabular rounded-xl py-2 text-[15px] font-bold transition active:scale-95 ${on ? "bg-fin-accent text-white" : "bg-fin-input text-white/70 hover:bg-fin-tile"}`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <label className="block">
              <div className={kicker}>Best thing this week</div>
              <textarea rows={2} value={form.win} onChange={(e) => set({ win: e.target.value })} placeholder="e.g. Didn't skip a single workout · Said no to the office samosas" className={area} maxLength={300} />
            </label>
            <label className="block">
              <div className={kicker}>What was hardest?</div>
              <textarea rows={2} value={form.struggle} onChange={(e) => set({ struggle: e.target.value })} placeholder="e.g. Late-night snacking · Weekend dinners out" className={area} maxLength={300} />
            </label>

            <div>
              <div className={kicker}>One focus for next week</div>
              <div className="mb-2 flex flex-col gap-1.5">
                {ideas.map((s) => (
                  <button
                    key={s}
                    onClick={() => set({ focus: s })}
                    className={`rounded-2xl border px-3.5 py-2 text-left text-[13.5px] transition ${form.focus === s ? "border-fin-accent bg-fin-accent/10 text-white" : "border-transparent bg-fin-input text-white/80 hover:bg-fin-tile"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <textarea rows={2} value={form.focus} onChange={(e) => set({ focus: e.target.value })} placeholder="Pick a suggestion above or write your own" className={area} maxLength={200} />
            </div>

            <PrimaryButton className="w-full" onClick={save} disabled={busy}>
              {busy ? "Saving…" : saved ? "Update check-in" : "Save check-in"}
            </PrimaryButton>
          </div>
        </FinCard>
      </div>

      {/* ---------- past check-ins ---------- */}
      <div className={`${col} lg:col-span-2 lg:h-auto xl:col-span-1 xl:h-[calc(100dvh-178px)]`}>
        <FinCard title="Past check-ins" delay={120}>
          {history.length ? (
            <div className="space-y-2">
              {history.map((c) => {
                const s = c.stats || {};
                return (
                  <button
                    key={c._id}
                    onClick={() => setWeek(c.week)}
                    className={`w-full rounded-2xl px-3.5 py-2.5 text-left transition ${c.week === week ? "bg-fin-accent/10 ring-1 ring-fin-accent/50" : "bg-fin-input hover:bg-fin-tile"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold">{weekLabel(c.week)}</span>
                      {s.change != null && <span className={`tabular ml-auto text-[13px] font-bold ${s.change < 0 ? "text-emerald-300" : s.change > 0 ? "text-amber-300" : "text-fin-muted"}`}>{s.change > 0 ? "+" : ""}{r1(s.change)} kg</span>}
                    </div>
                    <div className="tabular mt-0.5 text-[12.5px] text-fin-muted">
                      {[s.planned ? `${s.strength}/${s.planned} workouts` : null, s.days ? `food ${s.foodDays}/${s.days} days` : null, c.lastFocus ? `last focus: ${STUCK.find((o) => o.value === c.lastFocus)?.label.toLowerCase()}` : null].filter(Boolean).join(" · ")}
                    </div>
                    {c.focus && <div className="mt-1 truncate text-[12.5px] text-white/75">→ {c.focus}</div>}
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="clipboard">Your check-ins will build up here week by week, so you can see the habits that stuck.</EmptyState>
          )}
        </FinCard>
      </div>
    </div>
  );
}
