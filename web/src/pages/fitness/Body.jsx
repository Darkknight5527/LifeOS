// Body: weigh-ins with a smoothed trend (Happy Scale / MacroFactor style),
// measurements, BMI, goal projection and an adaptive estimate of how many
// calories you really burn (from your intake vs. weight change).
import { useEffect, useMemo, useState } from "react";
import { useFit } from "./FitContext.jsx";
import { addDays, dayTotals, daysBetween, isoDate, lastNDays, parseISO, prettyDate, r1, todayISO, weightTrend } from "./lib";
import { LineChart, NumberBox, kicker } from "./fit-ui.jsx";
import { EmptyState, FinCard, Icon, PrimaryButton, Segmented } from "../finances/fin-ui.jsx";
import { IN_APP } from "../../lib/inApp.js";
import { connectScale, openHealthSettings, syncScale, useHealthState } from "../../components/HealthSync.jsx";

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
      <div className="fin-scroll space-y-5 lg:h-[calc(100dvh-178px)] lg:space-y-4 lg:overflow-y-auto lg:pr-1">
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
        {IN_APP ? <SmartScaleCard /> : <WebScaleCard />}
      </div>

      <FinCard
        title="Weight trend"
        className="flex flex-col lg:h-[calc(100dvh-178px)]"
        action={<Segmented className="w-[200px] [&_button]:!py-1 [&_button]:!text-[12.5px]" value={range} onChange={setRange} options={[{ value: 30, label: "30d" }, { value: 90, label: "90d" }, { value: "all", label: "All" }]} />}
      >
        {shown.length ? (
          <>
            <LineChart
              points={shown.map((t) => ({ x: prettyDate(t.date, { day: "numeric", month: "short", ...(t.date.slice(0, 4) !== today.slice(0, 4) ? { year: "2-digit" } : {}) }), y: t.trend, t: parseISO(t.date) / 86400000 }))}
              second={shown.map((t) => ({ x: t.date, y: t.weight }))}
              format={(v) => `${r1(v)} kg`}
              axisFormat={(v) => `${r1(v)}`}
              secondLabel="Scale"
              height={200}
            />
            <div className="mt-2 flex gap-4 text-[12px] text-fin-muted">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-fin-accent" /> Trend</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-white/40" /> Scale</span>
            </div>
            <div className={`${kicker} mt-4`}>Recent weigh-ins</div>
            <div className="fin-scroll space-y-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {[...fit.body].filter((b) => b.weight || b.waist).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((b) => (
                <div key={b._id} className="tabular group flex items-center justify-between gap-3 rounded-lg py-0.5 pl-1 text-[13.5px] hover:bg-white/[0.03]">
                  <span className="text-fin-muted">{prettyDate(b.date)}</span>
                  <span className="ml-auto">{[b.weight && `${b.weight} kg`, b.waist && `waist ${b.waist}`, b.bodyFat && `${b.bodyFat}% fat`].filter(Boolean).join(" · ")}</span>
                  <button
                    onClick={() => fit.removeBody(b)}
                    aria-label={`Delete weigh-in from ${prettyDate(b.date)}`}
                    title="Delete"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-fin-faint transition hover:bg-red-500/10 hover:text-fin-danger"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon="chart">Your trend line appears after your first weigh-in.</EmptyState>
        )}
      </FinCard>

      <div className="fin-scroll space-y-5 lg:col-span-2 lg:space-y-4 xl:col-span-1 xl:h-[calc(100dvh-178px)] xl:overflow-y-auto xl:pr-1">
        <CompositionCard />
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

// Smart scale via Health Connect (only inside the Android app).
const ago = (t) => {
  if (!t) return "never";
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

// On the website: Health Connect lives on the phone, so the phone app does the
// reading (every time it's opened) and the website shows the result. Sync here
// pulls the newest weigh-ins the phone has sent.
function WebScaleCard() {
  const fit = useFit();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const s = fit.settings?.scaleSync || {};
  const latest = useMemo(() => [...fit.body].filter((b) => b.weight).sort((a, b) => (a.date < b.date ? 1 : -1))[0], [fit.body]);
  const sync = async () => {
    setBusy(true);
    setNote("");
    const before = latest ? `${latest.date}:${latest.weight}` : "";
    try {
      const fresh = await fit.reload();
      if (!fresh) throw new Error("offline");
      const top = [...(fresh?.body || [])].filter((b) => b.weight).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      setNote(top && `${top.date}:${top.weight}` !== before ? `New: ${top.weight} kg` : "Up to date");
    } catch {
      setNote("No connection");
    } finally {
      setBusy(false);
      setTimeout(() => setNote(""), 4000);
    }
  };
  return (
    <FinCard title={<span className="flex items-center gap-2"><Icon name="trend" size={15} /> Smart scale</span>}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[14.5px] font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${s.at ? "bg-emerald-400" : "bg-white/25"}`} />
            {s.at ? `Phone synced ${ago(s.at)}` : "Open the phone app to sync"}
          </div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-fin-muted">
            {latest ? `Latest weigh-in ${latest.weight} kg · ${prettyDate(latest.date)}` : "No weigh-ins yet"}
            {s.sources?.length ? ` · from ${s.sources.join(", ")}` : ""}
          </div>
        </div>
        <button onClick={sync} disabled={busy} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-fin-accent/15 px-3 py-2 text-[13.5px] font-semibold text-fin-accent hover:bg-fin-accent/25 disabled:opacity-50">
          <Icon name="refresh" size={14} className={busy ? "animate-spin" : ""} /> {busy ? "Syncing…" : note || "Sync"}
        </button>
      </div>
      <span className="sr-only" role="status">{note}</span>
    </FinCard>
  );
}

function SmartScaleCard() {
  const h = useHealthState();
  const btn = "rounded-xl bg-fin-tile px-3 py-2 text-[13.5px] font-semibold text-white/85 hover:text-white disabled:opacity-40";
  return (
    <FinCard title={<span className="flex items-center gap-2"><Icon name="trend" size={15} /> Smart scale</span>}>
      {h.status === "connected" ? (
        <>
          <div className="flex items-center gap-2 text-[14.5px] font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Connected to Health Connect
          </div>
          <div className="mt-1 text-[13px] text-fin-muted">
            {h.busy ? "Syncing…" : `Last sync ${ago(h.lastSync)}`}
            {h.sources?.length ? ` · from ${h.sources.join(", ")}` : ""}
            {h.lastResult && !h.busy ? ` · ${h.lastResult.added} new, ${h.lastResult.updated} updated` : ""}
          </div>
          {!h.busy && h.lastSync && !h.sources?.length && (
            <div className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-[12.5px] text-amber-200">No weigh-ins found yet. In Health Connect, open FitDays and allow it to write Weight and Body fat, then weigh in once more so FitDays sends a new reading.</div>
          )}
          {h.missing?.length > 0 && (
            <div className="mt-3 rounded-xl bg-fin-accent/10 px-3 py-2.5 text-[13px] text-white/85">
              LifeOS can now also read fat-free mass, bone mass, body water, BMR and heart rate from your scale.
              <button onClick={connectScale} disabled={h.busy} className="mt-2 block w-full rounded-lg bg-fin-accent py-2 text-[13.5px] font-bold text-white disabled:opacity-50">Allow the new readings</button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={syncScale} disabled={h.busy} className={btn}>Sync now</button>
            <button onClick={openHealthSettings} className={btn}>Health Connect settings</button>
          </div>
        </>
      ) : h.status === "unavailable" || h.status === "update" ? (
        <div className="text-[13.5px] leading-relaxed text-fin-muted">
          {h.status === "update" ? "Health Connect needs an update from the Play Store." : "Health Connect isn't available on this phone."}{" "}
          {h.status === "update" && <button onClick={connectScale} className="font-semibold text-fin-accent">Update it</button>}
        </div>
      ) : (
        <>
          <div className="text-[13.5px] leading-relaxed text-fin-muted">
            Weigh in on your scale and LifeOS fills in your weight, body fat and the other body readings automatically — no typing.
          </div>
          <ol className="mt-2 space-y-1 text-[13px] text-fin-muted">
            <li>1. In <b className="text-white/85">FitDays</b>, turn on syncing with <b className="text-white/85">Health Connect</b> (or with Google Fit / Samsung Health, which pass it on).</li>
            <li>2. In Health Connect, make sure FitDays may <b className="text-white/85">write</b> weight and body fat.</li>
            <li>3. Tap Connect below and allow everything it asks for (weight, body fat, fat-free mass, bone, water, BMR, heart rate).</li>
          </ol>
          <PrimaryButton className="mt-3 w-full" onClick={connectScale} disabled={h.busy || h.status === "checking"}>
            {h.busy ? "Connecting…" : "Connect scale"}
          </PrimaryButton>
          {h.status === "error" && <div className="mt-2 text-[12.5px] text-fin-danger">{h.error}</div>}
        </>
      )}
    </FinCard>
  );
}

// Body composition from the smart scale: what the weight is made of, and
// whether what you've lost is fat or fat-free mass (muscle, water, organs).
const avgOf = (list, key) => (list.length ? list.reduce((a, x) => a + x[key], 0) / list.length : null);
function CompositionCard() {
  const fit = useFit();
  const pts = useMemo(
    () =>
      [...fit.body]
        .filter((b) => b.weight > 0 && b.bodyFat > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((b) => {
          const fat = (b.weight * b.bodyFat) / 100;
          return { ...b, fat, free: b.leanMass > 0 ? b.leanMass : b.weight - fat };
        }),
    [fit.body]
  );
  const last = pts[pts.length - 1];
  // Latest = average of the last 3 readings; "before" = the 3 readings up to ~4 weeks earlier
  // (or the first readings if there's less history). Smooths out daily water swings.
  const change = useMemo(() => {
    if (pts.length < 4) return null;
    const now = pts.slice(-3);
    const cut = isoDate(addDays(parseISO(last.date), -28));
    let before = pts.filter((p) => p.date <= cut).slice(-3);
    if (!before.length) before = pts.slice(0, 3);
    const days = daysBetween(before[before.length - 1].date, now[now.length - 1].date);
    if (days < 14) return null;
    return { since: before[0].date, days, fat: r1(avgOf(now, "fat") - avgOf(before, "fat")), free: r1(avgOf(now, "free") - avgOf(before, "free")) };
  }, [pts, last]);

  if (!last) {
    return (
      <FinCard title="Body composition">
        <div className="text-[14px] leading-relaxed text-fin-muted">
          {IN_APP ? "Connect your smart scale below" : "Connect your smart scale in the LifeOS phone app"} to see body fat, fat mass, fat-free mass, body water and more here — or type a body fat % with a weigh-in.
        </div>
      </FinCard>
    );
  }
  const tiles = [
    ["Body fat", `${r1(last.bodyFat)}%`],
    ["Fat mass", `${r1(last.fat)} kg`],
    ["Fat-free mass", `${r1(last.free)} kg`],
    last.waterMass > 0 && ["Body water", `${r1((last.waterMass / last.weight) * 100)}%`],
    last.boneMass > 0 && ["Bone mass", `${r1(last.boneMass)} kg`],
    last.bmr > 0 && ["BMR", `${last.bmr} kcal`],
    last.heartRate > 0 && ["Heart rate", `${last.heartRate} bpm`],
  ].filter(Boolean);
  const lost = change && change.fat + change.free < 0 ? -(change.fat + change.free) : 0;
  const freeShare = lost && change.free < 0 ? -change.free / lost : 0;
  const sign = (v) => `${v > 0 ? "+" : ""}${v} kg`;

  return (
    <FinCard title="Body composition" action={<span className="text-[12.5px] text-fin-faint">{prettyDate(last.date, { day: "numeric", month: "short" })}</span>}>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-fin-input px-2.5 py-2">
            <div className="truncate text-[11.5px] text-fin-muted">{k}</div>
            <div className="tabular text-[16px] font-extrabold">{v}</div>
          </div>
        ))}
      </div>
      {change ? (
        <div className="mt-3 rounded-2xl bg-fin-input px-3 py-2.5">
          <div className="text-[12px] text-fin-muted">Since {prettyDate(change.since, { day: "numeric", month: "short" })} ({Math.round(change.days / 7)} weeks)</div>
          <div className="tabular mt-0.5 flex gap-4 text-[15px] font-bold">
            <span className={change.fat < 0 ? "text-emerald-300" : "text-amber-300"}>Fat {sign(change.fat)}</span>
            <span className={change.free < -0.3 ? "text-amber-300" : "text-white"}>Fat-free {sign(change.free)}</span>
          </div>
          <div className="mt-1 text-[12.5px] leading-snug text-fin-muted">
            {!lost
              ? "No overall loss yet over this period."
              : freeShare > 0.35
                ? "A good part of the loss is fat-free mass (muscle and water). Keep protein high and keep lifting so more of it comes from fat."
                : "Most of what you've lost is fat — exactly what you want."}
          </div>
        </div>
      ) : null}
    </FinCard>
  );
}
