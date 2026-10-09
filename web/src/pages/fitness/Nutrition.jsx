// Nutrition: meal diary with an Indian food list (HealthifyMe / MyFitnessPal
// style), recent foods, quick add, copy yesterday, water, targets from your
// body stats (MacroFactor style) and insights.
import { useEffect, useMemo, useState } from "react";
import { useFit } from "./FitContext.jsx";
import { FOODS, searchFoods } from "./foods.js";
import { ACTIVITY, GOALS, MACROS, MEALS, addDays, dayTotals, isoDate, lastNDays, newId, parseISO, prettyDate, r1, todayISO } from "./lib";
import { Bars, NumberBox, kicker } from "./fit-ui.jsx";
import { EmptyState, FinCard, GhostButton, Icon, IconButton, Pill, PrimaryButton, Ring, Segmented, Sheet, TextField } from "../finances/fin-ui.jsx";

const round = (n) => Math.round(n);
const scale = (food, qty) => ({ cal: round(food.cal * qty), p: r1(food.p * qty), c: r1(food.c * qty), f: r1(food.f * qty) });

/* ------------------------------------------------------------------ */
/* Diary                                                               */
/* ------------------------------------------------------------------ */
export function NutritionToday({ onTargets }) {
  const fit = useFit();
  const [date, setDate] = useState(todayISO());
  const [add, setAdd] = useState(null); // meal id
  const log = fit.foodByDate[date];
  const yesterday = isoDate(addDays(parseISO(date), -1));
  const ylog = fit.foodByDate[yesterday];
  const t = dayTotals(log);
  const tg = fit.targets;
  const hasTargets = tg?.calories > 0;
  const left = hasTargets ? tg.calories - t.cal : null;
  const entries = log?.entries || [];
  const setEntries = (next) => fit.saveFood(date, { entries: next });
  const isToday = date === todayISO();

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(320px,1fr)_2fr] lg:gap-4 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
        <section className="relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6cb2ff] via-[#3b82f6] to-[#1d4ed8] p-6 shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setDate(isoDate(addDays(parseISO(date), -1)))} className="grid h-8 w-8 place-items-center rounded-lg bg-black/15 hover:bg-black/25" aria-label="Previous day">
                <Icon name="left" size={16} stroke={2.4} />
              </button>
              <div className="text-[15px] font-semibold text-white/90">{isToday ? "Today" : prettyDate(date, { weekday: "long", day: "numeric", month: "short" })}</div>
              <button onClick={() => setDate(isoDate(addDays(parseISO(date), 1)))} className={`grid h-8 w-8 place-items-center rounded-lg bg-black/15 hover:bg-black/25 ${isToday ? "pointer-events-none opacity-30" : ""}`} aria-label="Next day">
                <Icon name="right" size={16} stroke={2.4} />
              </button>
            </div>
            {hasTargets ? (
              <div className="mt-3 flex items-center gap-4">
                <Ring value={Math.min(t.cal, tg.calories)} max={tg.calories} color="#ffffff" size={96} stroke={9}>
                  <div className="text-center leading-tight">
                    <div className="tabular text-[20px] font-extrabold">{Math.abs(round(left))}</div>
                    <div className="text-[11px] text-white/80">{left >= 0 ? "left" : "over"}</div>
                  </div>
                </Ring>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="tabular text-[14px] text-white/90">
                    <b className="text-[18px]">{round(t.cal)}</b> / {tg.calories} kcal
                  </div>
                  {MACROS.map((m) => {
                    const goal = tg[{ p: "protein", c: "carbs", f: "fat" }[m.id]] || 0;
                    return (
                      <div key={m.id}>
                        <div className="tabular flex justify-between text-[12px] text-white/85">
                          <span>{m.label}</span>
                          <span>{round(t[m.id])} / {goal} g</span>
                        </div>
                        <div className="mt-0.5 h-1.5 rounded-full bg-black/20">
                          <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${goal ? Math.min(1, t[m.id] / goal) * 100 : 0}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="tabular text-[34px] font-extrabold leading-tight">{round(t.cal)} kcal</div>
                <div className="text-[14px] text-white/85">P {round(t.p)} g · C {round(t.c)} g · F {round(t.f)} g</div>
                <button onClick={onTargets} className="mt-3 rounded-2xl bg-white px-4 py-2.5 text-[14px] font-bold text-[#1d4ed8]">Set your calorie & protein targets</button>
              </div>
            )}
          </div>
        </section>
        <WaterCard date={date} />
      </div>

      <div className="fin-scroll grid grid-cols-1 gap-4 sm:grid-cols-2 lg:h-[calc(100dvh-178px)] lg:overflow-y-auto lg:pr-1 [&>*]:min-w-0">
        {MEALS.map((m) => {
          const list = entries.filter((e) => e.meal === m.id);
          const kcal = list.reduce((a, e) => a + (e.cal || 0), 0);
          const yList = (ylog?.entries || []).filter((e) => e.meal === m.id);
          return (
            <FinCard
              key={m.id}
              className="flex h-max flex-col"
              title={<span className="flex items-center gap-2"><Icon name={m.icon} size={15} /> {m.label} <span className="tabular normal-case tracking-normal text-fin-faint">{round(kcal)} kcal</span></span>}
              action={<button onClick={() => setAdd(m.id)} className="flex items-center gap-1 rounded-xl bg-fin-accent/15 px-3 py-1.5 text-[13.5px] font-semibold text-fin-accent hover:bg-fin-accent/25"><Icon name="plus" size={14} stroke={2.6} /> Add</button>}
            >
              {list.length ? (
                <div className="space-y-1.5">
                  {list.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-2xl bg-fin-input px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-semibold">{e.name}</div>
                        <div className="tabular truncate text-[12px] text-fin-muted">
                          {e.qty !== 1 ? `${e.qty} × ` : ""}{e.unit} · P {round(e.p)} · C {round(e.c)} · F {round(e.f)}
                        </div>
                      </div>
                      <span className="tabular shrink-0 text-[14px] font-bold">{round(e.cal)}</span>
                      <IconButton icon="close" label={`Remove ${e.name}`} onClick={() => setEntries(entries.filter((x) => x.id !== e.id))} className="!h-7 !w-7" size={14} />
                    </div>
                  ))}
                </div>
              ) : yList.length ? (
                <button
                  onClick={() => setEntries([...entries, ...yList.map((e) => ({ ...e, id: newId() }))])}
                  className="w-full rounded-2xl border border-dashed border-white/15 px-3 py-3 text-left text-[13.5px] text-fin-muted hover:border-fin-accent/50 hover:text-white"
                >
                  <span className="font-semibold text-fin-accent">Copy yesterday's {m.label.toLowerCase()}</span>
                  <span className="block truncate">{yList.map((e) => e.name).join(", ")}</span>
                </button>
              ) : (
                <div className="py-3 text-center text-[13.5px] text-fin-faint">Nothing logged.</div>
              )}
            </FinCard>
          );
        })}
      </div>
      <AddFoodSheet meal={add} date={date} onClose={() => setAdd(null)} />
    </div>
  );
}

function WaterCard({ date }) {
  const fit = useFit();
  const ml = fit.foodByDate[date]?.water || 0;
  const target = fit.targets?.water || 3000;
  const glasses = Math.ceil(target / 250);
  const set = (v) => fit.saveFood(date, { water: Math.max(0, v) });
  return (
    <FinCard
      title={<span className="flex items-center gap-2"><Icon name="drop" size={15} /> Water</span>}
      action={<span className="tabular text-[13px] text-fin-muted"><b className="text-white">{r1(ml / 1000)}</b> / {r1(target / 1000)} L</span>}
      delay={60}
    >
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: glasses }, (_, i) => {
          const full = ml >= (i + 1) * 250;
          return (
            <button
              key={i}
              onClick={() => set(full && ml < (i + 2) * 250 ? i * 250 : (i + 1) * 250)}
              aria-label={`${(i + 1) * 250} ml`}
              className={`grid h-10 w-8 place-items-center rounded-lg transition active:scale-90 ${full ? "bg-[#38bdf8] text-[#06263a]" : "bg-fin-input text-white/25 hover:text-white/60"}`}
            >
              <Icon name="drop" size={16} stroke={2.2} />
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => set(ml + 250)} className="flex-1 rounded-xl bg-fin-tile py-2 text-[13.5px] font-semibold hover:bg-[#30303a]">+ Glass (250 ml)</button>
        <button onClick={() => set(ml + 500)} className="flex-1 rounded-xl bg-fin-tile py-2 text-[13.5px] font-semibold hover:bg-[#30303a]">+ Bottle (500 ml)</button>
        <button onClick={() => set(ml - 250)} className="rounded-xl bg-fin-input px-3 text-[13.5px] text-fin-muted hover:text-white" aria-label="Remove 250 ml">−</button>
      </div>
    </FinCard>
  );
}

function AddFoodSheet({ meal, date, onClose }) {
  const fit = useFit();
  const [mode, setMode] = useState("search");
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(null);
  const [qty, setQty] = useState(1);
  const [quick, setQuick] = useState({ name: "", cal: "", p: "", c: "", f: "" });
  useEffect(() => {
    if (meal) {
      setMode("search");
      setQ("");
      setPick(null);
      setQty(1);
      setQuick({ name: "", cal: "", p: "", c: "", f: "" });
    }
  }, [meal]);

  const custom = fit.custom.map((c) => ({ ...c, id: c._id, mine: true }));
  const results = useMemo(() => searchFoods(q, custom).slice(0, 60), [q, custom]);
  const recent = useMemo(() => {
    const seen = new Map();
    const logs = Object.values(fit.foodByDate).sort((a, b) => b.date.localeCompare(a.date));
    for (const l of logs) for (const e of l.entries || []) {
      if (seen.has(e.name)) continue;
      const q1 = e.qty || 1;
      seen.set(e.name, { id: `r-${e.name}`, name: e.name, unit: e.unit, cal: e.cal / q1, p: e.p / q1, c: e.c / q1, f: e.f / q1, recent: true });
      if (seen.size >= 24) break;
    }
    return [...seen.values()];
  }, [fit.foodByDate]);

  if (!meal) return null;
  const mealLabel = MEALS.find((m) => m.id === meal)?.label;
  const log = fit.foodByDate[date];
  const addEntry = (e) => {
    fit.saveFood(date, { entries: [...(log?.entries || []), { id: newId(), meal, ...e }] });
    onClose();
  };
  const list = mode === "recent" ? recent : results;

  return (
    <Sheet
      open={!!meal}
      onClose={onClose}
      title={`Add to ${mealLabel}`}
      footer={
        pick ? (
          <>
            <GhostButton className="flex-1" onClick={() => setPick(null)}>Back</GhostButton>
            <PrimaryButton className="flex-1" onClick={() => addEntry({ name: pick.name, unit: pick.unit, qty, ...scale(pick, qty) })}>Add {round(pick.cal * qty)} kcal</PrimaryButton>
          </>
        ) : mode === "quick" ? (
          <PrimaryButton className="flex-1" disabled={!(Number(quick.cal) > 0)} onClick={() => addEntry({ name: quick.name.trim() || "Quick add", unit: "1 serving", qty: 1, cal: Number(quick.cal) || 0, p: Number(quick.p) || 0, c: Number(quick.c) || 0, f: Number(quick.f) || 0 })}>
            Add
          </PrimaryButton>
        ) : null
      }
    >
      {pick ? (
        <div>
          <div className="text-[20px] font-bold">{pick.name}</div>
          <div className="text-[13.5px] text-fin-muted">{pick.unit} per serving</div>
          <div className={`${kicker} mt-5`}>Servings</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setQty((x) => Math.max(0.25, r1(x - 0.5)))} className="h-11 w-11 rounded-xl bg-fin-tile text-[20px] font-bold">−</button>
            <NumberBox value={qty} step={0.25} onChange={(v) => setQty(v === "" ? "" : Math.max(0, v))} className="!w-24 !py-2.5 !text-[18px]" label="Servings" />
            <button onClick={() => setQty((x) => r1((Number(x) || 0) + 0.5))} className="h-11 w-11 rounded-xl bg-fin-tile text-[20px] font-bold">+</button>
            {[0.5, 1, 2, 3].map((n) => (
              <Pill key={n} active={qty === n} onClick={() => setQty(n)}>{n}</Pill>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            {[
              ["kcal", round(pick.cal * (qty || 0))],
              ["Protein", `${r1(pick.p * (qty || 0))} g`],
              ["Carbs", `${r1(pick.c * (qty || 0))} g`],
              ["Fat", `${r1(pick.f * (qty || 0))} g`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-fin-input px-2 py-3">
                <div className="text-[12px] text-fin-muted">{k}</div>
                <div className="tabular text-[17px] font-extrabold">{v}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <Segmented className="[&_button]:!py-2 [&_button]:!text-[14px]" value={mode} onChange={setMode} options={[{ value: "search", label: "Search" }, { value: "recent", label: "Recent" }, { value: "quick", label: "Quick add" }]} />
          {mode === "quick" ? (
            <div className="mt-4 space-y-3">
              <TextField value={quick.name} onChange={(e) => setQuick((x) => ({ ...x, name: e.target.value }))} placeholder="What was it? (optional)" />
              <div className="grid grid-cols-4 gap-2">
                {[["cal", "kcal"], ["p", "Protein g"], ["c", "Carbs g"], ["f", "Fat g"]].map(([k, l]) => (
                  <label key={k}>
                    <div className="mb-1 text-[12px] text-fin-muted">{l}</div>
                    <NumberBox value={quick[k]} onChange={(v) => setQuick((x) => ({ ...x, [k]: v }))} className="!py-2.5" label={l} />
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <>
              {mode === "search" && <TextField className="mt-3" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: roti, dosa, paneer, egg…" />}
              <div className="mt-3 space-y-1">
                {list.length ? (
                  list.map((f) => (
                    <button key={f.id} onClick={() => { setPick(f); setQty(1); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-fin-input">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold">
                          {f.name} {f.mine && <span className="ml-1 rounded bg-fin-accent/15 px-1.5 text-[11px] text-fin-accent">mine</span>}
                        </div>
                        <div className="tabular truncate text-[12.5px] text-fin-muted">{f.unit} · P {r1(f.p)} · C {r1(f.c)} · F {r1(f.f)}</div>
                      </div>
                      <span className="tabular shrink-0 text-[14px] font-bold">{round(f.cal)}</span>
                    </button>
                  ))
                ) : (
                  <div className="py-6 text-center text-[14px] text-fin-muted">{mode === "recent" ? "Foods you log will appear here." : "No match — try Quick add, or add it under Targets & foods."}</div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */
export function NutritionInsights({ range = 7 }) {
  const fit = useFit();
  const days = useMemo(() => lastNDays(range), [range]);
  const tg = fit.targets || {};
  const rows = days.map((iso) => ({ iso, t: dayTotals(fit.foodByDate[iso]), water: fit.foodByDate[iso]?.water || 0, logged: (fit.foodByDate[iso]?.entries || []).length > 0 }));
  const logged = rows.filter((r) => r.logged);
  const avg = (k) => (logged.length ? logged.reduce((a, r) => a + r.t[k], 0) / logged.length : 0);
  const within = tg.calories ? logged.filter((r) => Math.abs(r.t.cal - tg.calories) <= tg.calories * 0.1).length : 0;
  const proteinHit = tg.protein ? logged.filter((r) => r.t.p >= tg.protein * 0.9).length : 0;
  const top = useMemo(() => {
    const m = {};
    for (const iso of days) for (const e of fit.foodByDate[iso]?.entries || []) {
      m[e.name] ||= { name: e.name, cal: 0, p: 0, n: 0 };
      m[e.name].cal += e.cal;
      m[e.name].p += e.p;
      m[e.name].n++;
    }
    return Object.values(m);
  }, [days, fit.foodByDate]);
  const label = (iso) => prettyDate(iso, { weekday: "short", day: "numeric", month: "short" });
  const kcalSplit = { p: avg("p") * 4, c: avg("c") * 4, f: avg("f") * 9 };
  const kcalSum = kcalSplit.p + kcalSplit.c + kcalSplit.f || 1;

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
      <FinCard title="Calories" action={<span className="tabular text-[13px] text-fin-muted">avg <b className="text-white">{round(avg("cal"))}</b>{tg.calories ? ` / ${tg.calories}` : ""}</span>}>
        {logged.length ? <Bars data={rows.map((r) => ({ label: label(r.iso), value: round(r.t.cal) }))} target={tg.calories} format={(v) => `${v} kcal`} /> : <EmptyState icon="flame">Log meals in the diary to see your trend.</EmptyState>}
        {tg.calories > 0 && logged.length > 0 && <div className="mt-2 text-[12.5px] text-fin-faint">{within} of {logged.length} logged days within ±10% of target.</div>}
      </FinCard>
      <FinCard title="Protein" action={<span className="tabular text-[13px] text-fin-muted">avg <b className="text-white">{round(avg("p"))} g</b>{tg.protein ? ` / ${tg.protein} g` : ""}</span>}>
        {logged.length ? <Bars data={rows.map((r) => ({ label: label(r.iso), value: round(r.t.p) }))} target={tg.protein} color="#60a5fa" format={(v) => `${v} g protein`} /> : <EmptyState icon="dumbbell">Protein shows up once you log food.</EmptyState>}
        {tg.protein > 0 && logged.length > 0 && <div className="mt-2 text-[12.5px] text-fin-faint">Hit 90%+ of your protein goal on {proteinHit} of {logged.length} days.</div>}
      </FinCard>
      <FinCard title="Where your calories come from">
        {logged.length ? (
          <>
            <div className="flex h-4 overflow-hidden rounded-full">
              {MACROS.map((m) => <div key={m.id} style={{ width: `${(kcalSplit[m.id] / kcalSum) * 100}%`, background: m.color }} />)}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {MACROS.map((m) => (
                <div key={m.id} className="rounded-2xl bg-fin-input px-2 py-2.5">
                  <div className="text-[12px] font-semibold" style={{ color: m.color }}>{m.label}</div>
                  <div className="tabular text-[17px] font-extrabold">{Math.round((kcalSplit[m.id] / kcalSum) * 100)}%</div>
                  <div className="tabular text-[12px] text-fin-muted">{round(avg(m.id))} g/day</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[12.5px] text-fin-faint">
              Days logged: {logged.length}/{range} · Water avg {r1(rows.reduce((a, r) => a + r.water, 0) / range / 1000)} L/day
            </div>
          </>
        ) : (
          <EmptyState icon="pie">No meals logged in this period.</EmptyState>
        )}
      </FinCard>
      <FinCard title="Top protein sources">
        {top.length ? (
          <div className="space-y-2">
            {[...top].sort((a, b) => b.p - a.p).slice(0, 6).map((x) => (
              <div key={x.name} className="flex items-center gap-3 text-[14px]">
                <span className="min-w-0 flex-1 truncate font-semibold">{x.name}</span>
                <span className="tabular shrink-0 text-fin-muted">{x.n}× · {round(x.cal)} kcal</span>
                <span className="tabular w-16 shrink-0 text-right font-bold text-[#60a5fa]">{round(x.p)} g</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="list">Nothing logged yet.</EmptyState>
        )}
      </FinCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Targets & foods                                                     */
/* ------------------------------------------------------------------ */
export function NutritionTargets() {
  const fit = useFit();
  const p = fit.settings?.profile || {};
  const [f, setF] = useState(() => ({ sex: p.sex || "male", age: p.age || "", heightCm: p.heightCm || "", weightKg: p.weightKg || "", activity: p.activity || 1.375, goal: p.goal || "maintain", goalWeight: p.goalWeight || "" }));
  const [custom, setCustom] = useState(() => ({ calories: "", protein: "", carbs: "", fat: "", water: "", ...(fit.settings?.targets || {}) }));
  const [foodSheet, setFoodSheet] = useState(null);
  const auto = fit.autoTargets;
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const useAuto = fit.settings?.autoTargets !== false;
  const latestWeight = [...fit.body].filter((b) => b.weight).sort((a, b) => b.date.localeCompare(a.date))[0]?.weight;

  function saveProfile() {
    fit.saveSettings({ profile: { ...f, age: Number(f.age) || 0, heightCm: Number(f.heightCm) || 0, weightKg: Number(f.weightKg) || 0, goalWeight: Number(f.goalWeight) || 0 } }, "Profile saved");
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0">
      <FinCard title="About you">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Segmented className="[&_button]:!py-2 [&_button]:!text-[14px]" value={f.sex} onChange={set("sex")} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
          </div>
          {[
            ["age", "Age"],
            ["heightCm", "Height (cm)"],
            ["weightKg", "Weight (kg)"],
            ["goalWeight", "Goal weight (kg)"],
          ].map(([k, l]) => (
            <label key={k}>
              <div className="mb-1 text-[12.5px] text-fin-muted">{l}</div>
              <NumberBox value={f[k]} step={k.includes("eight") ? 0.1 : 1} onChange={set(k)} className="!py-2.5" label={l} />
            </label>
          ))}
        </div>
        {latestWeight && Number(f.weightKg) !== latestWeight && (
          <button onClick={() => set("weightKg")(latestWeight)} className="mt-2 text-[12.5px] font-semibold text-fin-accent">Use latest logged weight ({latestWeight} kg)</button>
        )}
        <label className="mt-3 block">
          <div className="mb-1 text-[12.5px] text-fin-muted">Activity</div>
          <select value={f.activity} onChange={(e) => set("activity")(Number(e.target.value))} className="w-full rounded-xl bg-fin-input px-3 py-2.5 text-[14px] text-white outline-none [color-scheme:dark]">
            {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <div className="mb-1 mt-3 text-[12.5px] text-fin-muted">Goal</div>
        <div className="flex gap-1.5">
          {GOALS.map((g) => <Pill key={g.value} active={f.goal === g.value} onClick={() => set("goal")(g.value)}>{g.label}</Pill>)}
        </div>
        <PrimaryButton className="mt-4 w-full" onClick={saveProfile}>Save & calculate</PrimaryButton>
      </FinCard>

      <FinCard
        title="Daily targets"
        action={
          <Segmented className="w-[190px] [&_button]:!py-1 [&_button]:!text-[12.5px]" value={useAuto ? "auto" : "custom"} onChange={(v) => fit.saveSettings({ autoTargets: v === "auto" })} options={[{ value: "auto", label: "Calculated" }, { value: "custom", label: "My own" }]} />
        }
      >
        {useAuto ? (
          auto ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  ["Calories", `${auto.calories} kcal`],
                  ["Protein", `${auto.protein} g`],
                  ["Carbs", `${auto.carbs} g`],
                  ["Fat", `${auto.fat} g`],
                  ["Water", `${r1(auto.water / 1000)} L`],
                  ["Maintenance", `${auto.tdee} kcal`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-fin-input px-2 py-3">
                    <div className="text-[12px] text-fin-muted">{k}</div>
                    <div className="tabular text-[17px] font-extrabold">{v}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-fin-faint">
                Resting burn (BMR) {auto.bmr} kcal from the Mifflin–St Jeor formula, × your activity = maintenance. {GOALS.find((g) => g.value === p.goal)?.label || "Maintain"}: {p.goal === "lose" ? "20% below" : p.goal === "gain" ? "10% above" : "at"} maintenance. Protein {p.goal === "lose" ? "2.0" : "1.8"} g per kg, fat 25% of calories, carbs the rest. Water ≈ 35 ml per kg.
              </p>
            </>
          ) : (
            <EmptyState icon="target">Fill in “About you” and press Save to get your targets.</EmptyState>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {[["calories", "Calories (kcal)"], ["protein", "Protein (g)"], ["carbs", "Carbs (g)"], ["fat", "Fat (g)"], ["water", "Water (ml)"]].map(([k, l]) => (
                <label key={k}>
                  <div className="mb-1 text-[12.5px] text-fin-muted">{l}</div>
                  <NumberBox value={custom[k]} onChange={(v) => setCustom((x) => ({ ...x, [k]: v }))} className="!py-2.5" label={l} />
                </label>
              ))}
            </div>
            <PrimaryButton className="mt-4 w-full" onClick={() => fit.saveSettings({ targets: Object.fromEntries(Object.entries(custom).map(([k, v]) => [k, Number(v) || 0])) }, "Targets saved")}>Save targets</PrimaryButton>
          </>
        )}
      </FinCard>

      <FinCard
        title="My foods"
        action={<button onClick={() => setFoodSheet({})} className="flex items-center gap-1.5 rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold hover:bg-[#30303a]"><Icon name="plus" size={15} stroke={2.4} /> Add</button>}
      >
        {fit.custom.length ? (
          <div className="fin-scroll space-y-1.5 lg:max-h-[calc(100dvh-300px)] lg:overflow-y-auto">
            {fit.custom.map((c) => (
              <button key={c._id} onClick={() => setFoodSheet(c)} className="flex w-full items-center gap-3 rounded-2xl bg-fin-input px-3 py-2 text-left hover:bg-fin-tile">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold">{c.name}</div>
                  <div className="tabular truncate text-[12.5px] text-fin-muted">{c.unit} · P {c.p} · C {c.c} · F {c.f}</div>
                </div>
                <span className="tabular text-[14px] font-bold">{c.cal}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[14px] leading-relaxed text-fin-muted">Add foods you eat often — your mess food, a protein bar, mom's recipe — so they're one tap away. The built-in list has {FOODS.length} common Indian foods.</div>
        )}
      </FinCard>
      <CustomFoodSheet food={foodSheet} onClose={() => setFoodSheet(null)} />
    </div>
  );
}

function CustomFoodSheet({ food, onClose }) {
  const fit = useFit();
  const [f, setF] = useState({ name: "", unit: "1 serving", cal: "", p: "", c: "", f: "" });
  useEffect(() => {
    if (food) setF({ name: food.name || "", unit: food.unit || "1 serving", cal: food.cal ?? "", p: food.p ?? "", c: food.c ?? "", f: food.f ?? "" });
  }, [food]);
  if (!food) return null;
  const valid = f.name.trim() && Number(f.cal) >= 0 && f.cal !== "";
  async function save() {
    const data = { name: f.name.trim(), unit: f.unit.trim() || "1 serving", cal: Number(f.cal) || 0, p: Number(f.p) || 0, c: Number(f.c) || 0, f: Number(f.f) || 0 };
    const ok = food._id ? await fit.customOps.update(food, data) : await fit.customOps.add(data);
    if (ok) onClose();
  }
  return (
    <Sheet
      open
      onClose={onClose}
      title={food._id ? `Edit ${food.name}` : "New food"}
      footer={
        <>
          {food._id ? (
            <GhostButton className="!px-4 text-fin-danger" aria-label="Delete" onClick={() => { fit.customOps.remove(food); onClose(); }}><Icon name="trash" size={20} /></GhostButton>
          ) : (
            <GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton>
          )}
          <PrimaryButton className="flex-1" disabled={!valid} onClick={save}>Save</PrimaryButton>
        </>
      }
    >
      <div className="space-y-3">
        <TextField autoFocus value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} placeholder="Name, e.g. Office canteen thali" />
        <TextField value={f.unit} onChange={(e) => setF((x) => ({ ...x, unit: e.target.value }))} placeholder="Serving, e.g. 1 plate" />
        <div className="grid grid-cols-4 gap-2">
          {[["cal", "kcal"], ["p", "Protein g"], ["c", "Carbs g"], ["f", "Fat g"]].map(([k, l]) => (
            <label key={k}>
              <div className="mb-1 text-[12px] text-fin-muted">{l}</div>
              <NumberBox value={f[k]} step={0.1} onChange={(v) => setF((x) => ({ ...x, [k]: v }))} className="!py-2.5" label={l} />
            </label>
          ))}
        </div>
        <p className="text-[12.5px] text-fin-faint">Per one serving. Check the pack label or an app like HealthifyMe for values.</p>
      </div>
    </Sheet>
  );
}
