// AI meal photo: one to three photos of the same plate (a top view plus a
// side view judges portions best), optionally a line about what's in it.
// The AI matches each item to the LifeOS food list (and your own foods) so
// the numbers come from that table; anything it can't see it asks about.
// You check the portions, untick anything wrong, then add the rest.
// The photos are never saved.
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useFit } from "./FitContext.jsx";
import { FOODS } from "./foods.js";
import { shrinkPhoto } from "./photo.js";
import { r1 } from "./lib";
import { Icon, PrimaryButton, TextField } from "../finances/fin-ui.jsx";

const round = Math.round;
const CONF = { high: ["#34d399", "Fairly sure"], medium: ["#fbbf24", "Rough estimate"], low: ["#fb923c", "Unsure — check carefully"] };
const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MAX = 3;

export function MealPhoto({ mealLabel, onAdd }) {
  const fit = useFit();
  const [shots, setShots] = useState([]); // [{ url, data }]
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [rows, setRows] = useState([]); // [{ ...item, on, x }]
  const [answers, setAnswers] = useState({}); // question → answer
  const [allow, setAllow] = useState(null);
  const [sizes, setSizes] = useState(false);
  const input = useRef(null);
  const refs = fit.settings?.mealRefs || {};
  const plateCm = Number(refs.plateCm) || 0;
  const katoriMl = Number(refs.katoriMl) || 0;

  useEffect(() => {
    api.mealScanAllowance().then(setAllow).catch(() => {});
  }, []);

  // Your own foods first, then the built-in Indian food list.
  const reference = useMemo(
    () => [
      ...fit.custom.map((c) => ({ name: c.name, serving: c.unit || "1 serving", cal: c.cal, p: c.p, c: c.c, f: c.f })),
      ...FOODS.map((x) => ({ name: x.name, serving: x.unit, cal: x.cal, p: x.p, c: x.c, f: x.f })),
    ],
    [fit.custom]
  );

  const choose = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setError("");
    setResult(null);
    try {
      const room = MAX - shots.length;
      const next = [];
      for (const f of files.slice(0, room)) next.push(await shrinkPhoto(f, 1280, 0.82));
      setShots((s) => [...s, ...next].slice(0, MAX));
      if (files.length > room) setError(`Up to ${MAX} photos — the first ${room || "few"} were kept.`);
    } catch (err) {
      setError(err.message);
    }
  };

  async function estimate(withAnswers = false) {
    setBusy(true);
    setError("");
    try {
      const ans = withAnswers ? Object.entries(answers).map(([question, answer]) => ({ question, answer })) : [];
      const r = await api.mealScan({ photos: shots.map((s) => s.data), hint: hint.trim(), reference, plateCm, katoriMl, answers: ans });
      setResult({ ...r, asked: ans });
      setRows(r.items.map((i) => ({ ...i, on: true, x: 1 })));
      if (!withAnswers) setAnswers({});
      api.mealScanAllowance().then(setAllow).catch(() => {});
    } catch (err) {
      setError(err.message || "Couldn't read the photos. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const chosen = rows.filter((r) => r.on);
  const total = chosen.reduce((a, r) => ({ cal: a.cal + r.cal * r.x, p: a.p + r.p * r.x, c: a.c + r.c * r.x, f: a.f + r.f * r.x }), { cal: 0, p: 0, c: 0, f: 0 });
  const add = () =>
    onAdd(
      chosen.map((r) => ({
        name: r.name,
        unit: r.portion || "1 portion",
        qty: r.x,
        cal: round(r.cal * r.x),
        p: r1(r.p * r.x),
        c: r1(r.c * r.x),
        f: r1(r.f * r.x),
      }))
    );
  const left = allow && !allow.unlimited ? Math.max(0, allow.limit - allow.used) : null;
  const allAnswered = result?.questions?.length > 0 && result.questions.every((q) => answers[q.question]);
  const reset = () => {
    setResult(null);
    setRows([]);
    setAnswers({});
  };

  const photoInput = <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={choose} aria-hidden="true" tabIndex={-1} />;

  // ---------- 1. take photos ----------
  if (!result) {
    return (
      <div className="mt-4">
        {photoInput}
        {!shots.length ? (
          <button
            onClick={() => input.current?.click()}
            disabled={left === 0}
            className="flex w-full flex-col items-center gap-2 rounded-3xl border border-dashed border-white/15 px-4 py-9 text-center transition hover:border-fin-accent/60 hover:bg-fin-input disabled:opacity-50"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-fin-accent/15 text-fin-accent"><Icon name="camera" size={26} /></span>
            <span className="text-[16px] font-bold">Take or choose photos</span>
            <span className="max-w-[320px] text-[13px] text-fin-muted">One from straight above with the whole plate, and one from the side — up to {MAX}. The side view shows how high things are piled, which makes portions much more accurate.</span>
          </button>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-2">
              {shots.map((s, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-black">
                  <img src={s.url} alt={`Meal photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button onClick={() => setShots((l) => l.filter((_, j) => j !== i))} disabled={busy} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-[13px] text-white hover:bg-black" aria-label={`Remove photo ${i + 1}`}>✕</button>
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold">{i === 0 ? "Top" : i === 1 ? "Side" : "Extra"}</span>
                </div>
              ))}
              {shots.length < MAX && (
                <button onClick={() => input.current?.click()} disabled={busy} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-white/15 text-fin-muted hover:border-fin-accent/50 hover:text-white">
                  <Icon name="plus" size={20} stroke={2.4} />
                  <span className="text-[12px] font-semibold">{shots.length === 1 ? "Side view" : "Another"}</span>
                </button>
              )}
            </div>
            <label className="mt-3 block">
              <div className="mb-1 text-[12.5px] text-fin-muted">What's in it? (optional — counts and hidden things help most)</div>
              <TextField value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. 3 chapatis, dal, aloo sabzi cooked in ghee" maxLength={300} disabled={busy} />
            </label>
            {error && <div className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2.5 text-[13.5px] text-fin-danger">{error}</div>}
            <PrimaryButton className="mt-4 w-full" onClick={() => estimate(false)} disabled={busy || left === 0}>
              {busy ? "Looking at your plate…" : "Estimate calories"}
            </PrimaryButton>
            {busy && <div className="mt-2 text-center text-[12.5px] text-fin-faint">This takes about 5–20 seconds.</div>}
          </div>
        )}
        <DishSizes open={sizes} setOpen={setSizes} plateCm={plateCm} katoriMl={katoriMl} save={(v) => fit.saveSettings({ mealRefs: v }, "Dish sizes saved")} />
        {left != null && <div className="mt-2 text-center text-[12.5px] text-fin-faint">{left ? `${left} AI estimate${left === 1 ? "" : "s"} left today` : "No AI estimates left today — use Search or Quick add."}</div>}
      </div>
    );
  }

  // ---------- 2. check the estimate ----------
  return (
    <div className="mt-4">
      {photoInput}
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 -space-x-3">
          {shots.slice(0, 3).map((s, i) => <img key={i} src={s.url} alt="" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-fin-card" />)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="tabular text-[26px] font-extrabold leading-tight">{round(total.cal)} kcal</div>
          <div className="tabular text-[12.5px] text-fin-muted">P {round(total.p)} g · C {round(total.c)} g · F {round(total.f)} g</div>
        </div>
        <button onClick={reset} className="shrink-0 rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold">Retake</button>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px]" style={{ color: CONF[result.confidence]?.[0] }}>
        <span className="h-2 w-2 rounded-full" style={{ background: CONF[result.confidence]?.[0] }} /> {CONF[result.confidence]?.[1]}
        {result.asked?.length > 0 && <span className="text-fin-faint">· refined with your answers</span>}
      </div>

      {!result.isFood ? (
        <div className="mt-4 rounded-2xl bg-amber-400/10 px-3 py-3 text-[13.5px] text-amber-200">
          The AI couldn't see any food in these photos{result.photoQuality ? ` (${result.photoQuality})` : ""}. Try other photos, or add it with Search.
        </div>
      ) : (
        <>
          {result.questions?.length > 0 && (
            <div className="mt-4 rounded-2xl bg-fin-accent/10 p-3.5 ring-1 ring-fin-accent/25">
              <div className="text-[13.5px] font-semibold">A quick question or two makes this more accurate</div>
              <div className="mt-2.5 space-y-3">
                {result.questions.map((q) => (
                  <div key={q.question}>
                    <div className="text-[13.5px] text-white/85">{q.question}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={q.question}>
                      {q.options.map((o) => {
                        const on = answers[q.question] === o;
                        return (
                          <button key={o} role="radio" aria-checked={on} onClick={() => setAnswers((a) => ({ ...a, [q.question]: o }))} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${on ? "bg-fin-accent text-white" : "bg-fin-input text-white/75 hover:bg-fin-tile"}`}>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => estimate(true)} disabled={!allAnswered || busy || left === 0} className="mt-3 w-full rounded-xl bg-fin-accent py-2.5 text-[14px] font-bold text-white disabled:opacity-40">
                {busy ? "Refining…" : "Refine the estimate"}
              </button>
              {left != null && <div className="mt-1.5 text-center text-[11.5px] text-fin-faint">Refining uses one AI estimate.</div>}
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            {rows.map((r, i) => (
              <div key={i} className={`rounded-2xl px-3 py-2 transition ${r.on ? "bg-fin-input" : "bg-fin-input/40 opacity-50"}`}>
                <div className="flex items-center gap-2">
                  <button
                    role="checkbox"
                    aria-checked={r.on}
                    aria-label={`Include ${r.name}`}
                    onClick={() => setRows((l) => l.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition ${r.on ? "border-fin-accent bg-fin-accent text-white" : "border-white/25"}`}
                  >
                    {r.on && <Icon name="check" size={14} stroke={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14.5px] font-semibold">{r.name}</span>
                      {r.source === "list" ? (
                        <span className="shrink-0 rounded bg-emerald-400/15 px-1.5 text-[10.5px] font-semibold text-emerald-300" title={`From the food list: ${r.match} (${r.serving}) × ${r.servings}`}>food list</span>
                      ) : (
                        <span className="shrink-0 rounded bg-white/10 px-1.5 text-[10.5px] font-semibold text-white/60" title="Not in the food list — the AI's own estimate">AI estimate</span>
                      )}
                    </div>
                    <div className="tabular truncate text-[12px] text-fin-muted">
                      {r.source === "list" ? `${r.servings} × ${r.serving}` : r.portion}
                      {r.grams ? ` · ~${round(r.grams * r.x)} g` : ""} · P {round(r.p * r.x)} · C {round(r.c * r.x)} · F {round(r.f * r.x)}
                    </div>
                  </div>
                  <span className="tabular shrink-0 text-[14px] font-bold">{round(r.cal * r.x)}</span>
                </div>
                {r.on && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-8">
                    <span className="mr-1 text-[11.5px] text-fin-faint">Portion</span>
                    {STEPS.map((x) => (
                      <button
                        key={x}
                        onClick={() => setRows((l) => l.map((y, k) => (k === i ? { ...y, x } : y)))}
                        className={`tabular rounded-lg px-2 py-0.5 text-[12px] font-semibold ${r.x === x ? "bg-fin-accent text-white" : "bg-fin-tile text-white/70 hover:text-white"}`}
                      >
                        {x === 1 ? "as shown" : `×${x}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {(result.notes || result.photoQuality) && <div className="mt-3 rounded-2xl bg-fin-input px-3 py-2.5 text-[12.5px] leading-relaxed text-fin-muted">{[result.photoQuality, result.notes].filter(Boolean).join(" ")}</div>}
          <div className="mt-2 text-[12px] leading-relaxed text-fin-faint">
            "Food list" items use LifeOS's nutrition table for the dish; the rest are the AI's estimate. Hidden oil and portion size are the biggest sources of error — if you know the real amount, change the portion.
          </div>
          {error && <div className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2.5 text-[13.5px] text-fin-danger">{error}</div>}
          <PrimaryButton className="mt-4 w-full" onClick={add} disabled={!chosen.length}>
            Add {chosen.length} item{chosen.length === 1 ? "" : "s"} to {mealLabel} · {round(total.cal)} kcal
          </PrimaryButton>
        </>
      )}
    </div>
  );
}

// Your own plate and katori sizes, so portions are judged against your dishes.
function DishSizes({ open, setOpen, plateCm, katoriMl, save }) {
  const [v, setV] = useState({ plateCm: plateCm || "", katoriMl: katoriMl || "" });
  useEffect(() => setV({ plateCm: plateCm || "", katoriMl: katoriMl || "" }), [plateCm, katoriMl]);
  const set = plateCm || katoriMl;
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-fin-input px-3.5 py-2.5 text-left text-[13px] text-fin-muted hover:text-white">
        <Icon name="target" size={15} className="shrink-0" />
        <span className="min-w-0 flex-1">{set ? `Your dishes: ${plateCm ? `plate ${plateCm} cm` : ""}${plateCm && katoriMl ? " · " : ""}${katoriMl ? `katori ${katoriMl} ml` : ""}` : "Set your plate and katori size for better portions"}</span>
        <span className="shrink-0 font-semibold text-fin-accent">{set ? "Change" : "Set"}</span>
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-2xl bg-fin-input p-3.5">
      <div className="text-[13.5px] font-semibold">Your usual dishes</div>
      <div className="mt-0.5 text-[12px] text-fin-muted">Measure once with a ruler / measuring cup. The AI uses them as a scale.</div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <label>
          <div className="mb-1 text-[12px] text-fin-muted">Plate across (cm)</div>
          <input type="number" min="10" max="40" value={v.plateCm} onChange={(e) => setV({ ...v, plateCm: e.target.value })} placeholder="26" className="w-full rounded-xl bg-fin-tile px-3 py-2 text-[15px] text-white outline-none focus:ring-2 focus:ring-fin-accent/50" aria-label="Plate size in cm" />
        </label>
        <label>
          <div className="mb-1 text-[12px] text-fin-muted">Katori / bowl (ml)</div>
          <input type="number" min="50" max="1000" value={v.katoriMl} onChange={(e) => setV({ ...v, katoriMl: e.target.value })} placeholder="150" className="w-full rounded-xl bg-fin-tile px-3 py-2 text-[15px] text-white outline-none focus:ring-2 focus:ring-fin-accent/50" aria-label="Katori size in ml" />
        </label>
      </div>
      <div className="mt-2.5 flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="px-2 text-[13px] text-fin-muted">Cancel</button>
        <button
          onClick={() => {
            save({ plateCm: Math.max(0, Math.min(40, Number(v.plateCm) || 0)), katoriMl: Math.max(0, Math.min(1000, Number(v.katoriMl) || 0)) });
            setOpen(false);
          }}
          className="rounded-lg bg-fin-accent px-3 py-1.5 text-[13px] font-bold text-white"
        >
          Save
        </button>
      </div>
    </div>
  );
}
