// Journal › Patterns: mood over time, and what goes with your better days —
// using data LifeOS already has (workouts, sleep, spending, skin).
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../api";
import { EmptyState, FinCard, Segmented } from "../../finances/fin-ui.jsx";
import { LineChart } from "../../fitness/fit-ui.jsx";
import { addDays, isoDate, parseISO, todayISO } from "../../finances/lib";
import { MOODS } from "./content.js";
import { useJournal } from "./JournalContext.jsx";
import { COL } from "./TodayView.jsx";

const RANGES = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "Year" },
];
const MIN_DAYS = 3; // days needed on each side before a comparison means anything
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export default function PatternsView() {
  const j = useJournal();
  const [range, setRange] = useState(30);
  const [other, setOther] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.list("workout-strength").catch(() => []),
      api.list("cali-logs").catch(() => []),
      api.list("workout-cardio").catch(() => []),
      api.list("finance-transactions").catch(() => []),
      api.list("skin-logs").catch(() => []),
    ]).then(([gym, cali, cardio, tx, skin]) => {
      if (!alive) return;
      const spend = {};
      // Card purchases count on the day you bought; the bill payment would count them twice.
      for (const t of tx) if (t.type === "expense" && !t.cardBill) spend[t.date] = (spend[t.date] || 0) + (t.amount || 0);
      setOther({
        trained: new Set([...gym, ...cali, ...cardio].map((x) => x.date)),
        spend,
        skin: Object.fromEntries(skin.filter((s) => s.condition).map((s) => [s.date, Number(s.condition)])),
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  const today = todayISO();
  const from = isoDate(addDays(parseISO(today), -(range - 1)));
  const days = useMemo(
    () => j.entries.filter((e) => (e.kind || "day") === "day" && e.date >= from && e.date <= today && e.mood).sort((a, b) => a.date.localeCompare(b.date)),
    [j.entries, from, today]
  );

  if (!days.length) {
    return (
      <FinCard>
        <EmptyState icon="trend">Tap your mood on the Today page for a few days and your patterns will appear here.</EmptyState>
      </FinCard>
    );
  }

  const points = days.map((e) => ({ x: parseISO(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), y: e.mood }));
  const stat = (k) => avg(days.map((e) => e[k]).filter(Boolean));

  // "Better days" comparisons
  const comparisons = [];
  const compare = (label, yesLabel, noLabel, test) => {
    const yes = [];
    const no = [];
    for (const e of days) {
      const r = test(e);
      if (r === true) yes.push(e.mood);
      else if (r === false) no.push(e.mood);
    }
    comparisons.push({ label, yesLabel, noLabel, yes: avg(yes), no: avg(no), n: [yes.length, no.length] });
  };
  compare("Sleep", "Slept well (4–5)", "Slept badly (1–2)", (e) => (e.sleep >= 4 ? true : e.sleep && e.sleep <= 2 ? false : null));
  if (other) {
    compare("Exercise", "Days you trained", "Rest days", (e) => other.trained.has(e.date));
    const spends = Object.entries(other.spend).filter(([d]) => d >= from).map(([, v]) => v);
    const typical = spends.length ? [...spends].sort((a, b) => a - b)[Math.floor(spends.length / 2)] : 0;
    if (typical > 0) compare("Spending", "Lighter spending days", "Heavier spending days", (e) => (other.spend[e.date] || 0) <= typical);
    compare("Skin", "Good skin days (4–5)", "Bad skin days (1–2)", (e) => (other.skin[e.date] >= 4 ? true : other.skin[e.date] && other.skin[e.date] <= 2 ? false : null));
  }
  compare("Stress", "Low stress (1–2)", "High stress (4–5)", (e) => (e.stress && e.stress <= 2 ? true : e.stress >= 4 ? false : null));

  const feelings = {};
  for (const e of days) for (const f of e.feelings || []) feelings[f] = (feelings[f] || 0) + 1;
  const topFeelings = Object.entries(feelings).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const dist = MOODS.map((m) => ({ ...m, n: days.filter((e) => e.mood === m.v).length }));

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
      <div className={COL}>
        <FinCard title="Mood" action={<Segmented className="w-[230px] [&_button]:!py-1 [&_button]:!text-[12.5px]" value={range} onChange={setRange} options={RANGES} />}>
          <LineChart points={points} height={140} format={(v) => `${Math.round(v * 10) / 10}/5`} axisFormat={(v) => Math.round(v)} />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["Mood", stat("mood")],
              ["Energy", stat("energy")],
              ["Stress", stat("stress")],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-fin-input px-2 py-2.5">
                <div className="text-[12px] text-fin-muted">Avg {k.toLowerCase()}</div>
                <div className="tabular text-[20px] font-extrabold">{v ? v.toFixed(1) : "—"}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">
            {dist.filter((m) => m.n).map((m) => (
              <div key={m.v} style={{ flex: m.n, background: m.color }} title={`${m.label}: ${m.n} day${m.n === 1 ? "" : "s"}`} />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-[12px] text-fin-muted">
            {dist.filter((m) => m.n).map((m) => (
              <span key={m.v}>
                {m.face} {m.n}
              </span>
            ))}
          </div>
        </FinCard>
        {topFeelings.length > 0 && (
          <FinCard title="Feelings you named most">
            <div className="flex flex-wrap gap-1.5">
              {topFeelings.map(([f, n]) => (
                <span key={f} className="rounded-full bg-fin-input px-3 py-1 text-[13px] font-semibold capitalize text-white/85">
                  {f} <span className="text-fin-faint">×{n}</span>
                </span>
              ))}
            </div>
          </FinCard>
        )}
      </div>
      <div className={COL}>
        <FinCard title="What goes with your better days">
          {!other && <div className="h-24 animate-pulse rounded-2xl bg-fin-input" />}
          <div className="space-y-2.5">
            {comparisons.map((c) => {
              const enough = c.n[0] >= MIN_DAYS && c.n[1] >= MIN_DAYS;
              const diff = enough ? c.yes - c.no : 0;
              return (
                <div key={c.label} className="rounded-2xl bg-fin-input px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14.5px] font-semibold">{c.label}</span>
                    {enough && (
                      <span className={`text-[13px] font-bold ${Math.abs(diff) < 0.2 ? "text-fin-muted" : diff > 0 ? "text-emerald-400" : "text-orange-400"}`}>
                        {Math.abs(diff) < 0.2 ? "no clear link" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)} mood`}
                      </span>
                    )}
                  </div>
                  {enough ? (
                    <div className="mt-1 text-[13px] text-fin-muted">
                      {c.yesLabel}: <b className="text-white/85">{c.yes.toFixed(1)}</b> · {c.noLabel}: <b className="text-white/85">{c.no.toFixed(1)}</b>
                    </div>
                  ) : (
                    <div className="mt-1 text-[13px] text-fin-faint">
                      Needs {MIN_DAYS}+ days of each ({c.n[0]} / {c.n[1]} so far)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-fin-faint">Average mood on each kind of day. A link isn't proof of cause — but it's a good hint where to look.</p>
        </FinCard>
      </div>
    </div>
  );
}
