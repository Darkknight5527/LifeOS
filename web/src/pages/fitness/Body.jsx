// Body: weigh-ins with a smoothed trend (Happy Scale / MacroFactor style),
// measurements, BMI, goal projection and an adaptive estimate of how many
// calories you really burn (from your intake vs. weight change).
import { useEffect, useMemo, useState } from "react";
import { useFit } from "./FitContext.jsx";
import { dayTotals, daysBetween, lastNDays, prettyDate, r1, todayISO, weightTrend } from "./lib";
import { LineChart, NumberBox, kicker } from "./fit-ui.jsx";
import { EmptyState, FinCard, Icon, PrimaryButton, Segmented } from "../finances/fin-ui.jsx";

const FIELDS = [
  ["waist", "Waist", "cm"],
  ["chest", "Chest", "cm"],
  ["arm", "Arm", "cm"],
  ["bodyFat", "Body fat", "%"],
];

export function BodyView() {
  const fit = useFit();
  const today = todayISO();
  const log = fit.bodyByDate[today];
  const [w, setW] = useState(log?.weight ?? "");
  const [m, setM] = useState({});
  const [range, setRange] = useState(90);
  useEffect(() => {
    setW(log?.weight ?? "");
    setM(Object.fromEntries(FIELDS.map(([k]) => [k, log?.[k] ?? ""])));
  }, [log?._id, log?.weight]); // eslint-disable-line react-hooks/exhaustive-deps

  const trend = useMemo(() => weightTrend(fit.body), [fit.body]);
  const last = trend[trend.length - 1];
  const shown = range === "all" ? trend : trend.filter((t) => daysBetween(t.date, today) < range);
  const change = (days) => {
    if (!last) return null;
    const past = [...trend].reverse().find((t) => daysBetween(t.date, last.date) >= days);
    return past ? r1(last.trend - past.trend) : null;
  };
  const wk = change(7);
  const mo = change(30);
  const height = fit.settings?.profile?.heightCm;
  const bmi = last && height ? r1(last.trend / (height / 100) ** 2) : null;
  const goalW = fit.settings?.profile?.goalWeight;

  // Weekly rate from last 3 weeks of trend → projection to goal
  const rate = (() => {
    if (trend.length < 2) return null;
    const past = [...trend].reverse().find((t) => daysBetween(t.date, last.date) >= 14) || trend[0];
    const days = daysBetween(past.date, last.date);
    return days >= 7 ? ((last.trend - past.trend) / days) * 7 : null;
  })();
  const eta = goalW && rate && Math.sign(goalW - last.trend) === Math.sign(rate) && Math.abs(rate) > 0.02 ? Math.round(((goalW - last.trend) / rate) * 7) : null;

  // Adaptive TDEE: average intake − energy from weight change (7700 kcal / kg) over the last 21 days.
  const adaptive = useMemo(() => {
    const days = lastNDays(21);
    const intake = days.map((d) => ({ d, cal: dayTotals(fit.foodByDate[d]).cal, n: (fit.foodByDate[d]?.entries || []).length })).filter((x) => x.n > 0);
    const tr = trend.filter((t) => t.date >= days[0]);
    if (intake.length < 10 || tr.length < 5) return { ready: false, logged: intake.length, weighed: tr.length };
    const span = Math.max(7, daysBetween(tr[0].date, tr[tr.length - 1].date));
    const avg = intake.reduce((a, x) => a + x.cal, 0) / intake.length;
    const delta = tr[tr.length - 1].trend - tr[0].trend;
    return { ready: true, tdee: Math.round(avg - (delta * 7700) / span), avg: Math.round(avg) };
  }, [fit.foodByDate, trend]);

  function save() {
    const patch = { weight: w === "" ? null : Number(w) };
    for (const [k] of FIELDS) patch[k] = m[k] === "" ? null : Number(m[k]);
    fit.saveBody(today, patch);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
        <section className="relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6cb2ff] via-[#3b82f6] to-[#1d4ed8] p-6 shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative">
            <div className="text-[15px] font-semibold text-white/90">Trend weight</div>
            <div className="tabular text-[40px] font-extrabold leading-tight tracking-tight">{last ? `${r1(last.trend)} kg` : "—"}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-[13px] font-semibold">
              {wk != null && <span className="rounded-full bg-black/15 px-3 py-1">{wk > 0 ? "+" : ""}{wk} kg this week</span>}
              {mo != null && <span className="rounded-full bg-black/15 px-3 py-1">{mo > 0 ? "+" : ""}{mo} kg in 30 days</span>}
              {bmi && <span className="rounded-full bg-black/15 px-3 py-1">BMI {bmi}</span>}
            </div>
            {goalW > 0 && last && (
              <div className="mt-2 text-[13.5px] text-white/90">
                Goal {goalW} kg · {r1(Math.abs(goalW - last.trend))} kg to go{eta ? ` · about ${eta < 60 ? `${Math.max(1, Math.round(eta / 7))} weeks` : `${Math.round(eta / 30)} months`} at this pace` : ""}
              </div>
            )}
            {!last && <div className="text-[14px] text-white/85">Weigh in each morning — the trend smooths out daily water swings.</div>}
          </div>
        </section>
        <FinCard title="Today's weigh-in">
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <div className="mb-1 text-[12.5px] text-fin-muted">Weight (kg)</div>
              <NumberBox value={w} step={0.1} onChange={setW} className="!py-3 !text-[22px]" label="Weight in kg" />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {FIELDS.map(([k, l, u]) => (
              <label key={k}>
                <div className="mb-1 truncate text-[12px] text-fin-muted">{l} ({u})</div>
                <NumberBox value={m[k]} step={0.1} onChange={(v) => setM((x) => ({ ...x, [k]: v }))} className="!py-2" label={`${l} ${u}`} />
              </label>
            ))}
          </div>
          <PrimaryButton className="mt-3 w-full" onClick={save}>{log ? "Update today" : "Save weigh-in"}</PrimaryButton>
        </FinCard>
      </div>

      <FinCard
        title="Weight trend"
        className="lg:min-h-[calc(100dvh-178px)]"
        action={<Segmented className="w-[200px] [&_button]:!py-1 [&_button]:!text-[12.5px]" value={range} onChange={setRange} options={[{ value: 30, label: "30d" }, { value: 90, label: "90d" }, { value: "all", label: "All" }]} />}
      >
        {shown.length ? (
          <>
            <LineChart
              points={shown.map((t) => ({ x: prettyDate(t.date, { day: "numeric", month: "short" }), y: t.trend }))}
              second={shown.map((t) => ({ x: t.date, y: t.weight }))}
              format={(v) => `${v} kg`}
              height={210}
            />
            <div className="mt-2 flex gap-4 text-[12px] text-fin-muted">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-fin-accent" /> Trend</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-white/40" /> Scale</span>
            </div>
            <div className={`${kicker} mt-4`}>Recent weigh-ins</div>
            <div className="fin-scroll space-y-1 lg:max-h-[calc(100dvh-520px)] lg:overflow-y-auto">
              {[...fit.body].filter((b) => b.weight || b.waist).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((b) => (
                <div key={b._id} className="tabular flex justify-between gap-3 text-[13.5px]">
                  <span className="text-fin-muted">{prettyDate(b.date)}</span>
                  <span>{[b.weight && `${b.weight} kg`, b.waist && `waist ${b.waist}`, b.bodyFat && `${b.bodyFat}% fat`].filter(Boolean).join(" · ")}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon="chart">Your trend line appears after your first weigh-in.</EmptyState>
        )}
      </FinCard>

      <div className="space-y-5 lg:col-span-2 lg:space-y-4 xl:col-span-1">
        <FinCard title={<span className="flex items-center gap-2"><Icon name="flame" size={15} /> Your real calorie burn</span>}>
          {adaptive.ready ? (
            <>
              <div className="tabular text-[34px] font-extrabold leading-tight">{adaptive.tdee} <span className="text-[16px] font-semibold text-fin-muted">kcal/day</span></div>
              <div className="mt-1 text-[13.5px] text-fin-muted">
                Based on your last 3 weeks: you ate ~{adaptive.avg} kcal/day and your trend moved {r1(trend[trend.length - 1].trend - (trend.find((t) => t.date >= lastNDays(21)[0])?.trend ?? 0))} kg.
                {fit.autoTargets && <> The formula guessed {fit.autoTargets.tdee}.</>}
              </div>
            </>
          ) : (
            <div className="text-[14px] leading-relaxed text-fin-muted">
              Log food on at least 10 days and weigh in 5+ times over 3 weeks, and LifeOS will work out how much you actually burn — like MacroFactor does. So far: {adaptive.logged} days of food, {adaptive.weighed} weigh-ins.
            </div>
          )}
        </FinCard>
        <FinCard title="Measurements">
          {FIELDS.some(([k]) => fit.body.some((b) => b[k])) ? (
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map(([k, l, u]) => {
                const pts = [...fit.body].filter((b) => b[k]).sort((a, b) => a.date.localeCompare(b.date));
                const lastV = pts[pts.length - 1]?.[k];
                const first = pts[0]?.[k];
                return (
                  <div key={k} className="rounded-2xl bg-fin-input px-3 py-2.5">
                    <div className="text-[12px] text-fin-muted">{l}</div>
                    <div className="tabular text-[18px] font-extrabold">{lastV ? `${lastV} ${u}` : "—"}</div>
                    {pts.length > 1 && <div className="tabular text-[12px] text-fin-faint">{lastV - first > 0 ? "+" : ""}{r1(lastV - first)} since {prettyDate(pts[0].date, { day: "numeric", month: "short" })}</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[14px] text-fin-muted">Add waist, chest, arm or body fat once every week or two — the scale doesn't show muscle gained.</div>
          )}
        </FinCard>
      </div>
    </div>
  );
}
