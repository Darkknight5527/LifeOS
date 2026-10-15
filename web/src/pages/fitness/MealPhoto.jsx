// AI meal photo: snap or pick a photo of your plate, optionally say what's in
// it, and Gemini estimates each item. You check the portions, untick anything
// wrong, then add the rest to the meal. The photo itself is never saved.
import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { shrinkPhoto } from "./photo.js";
import { r1 } from "./lib";
import { Icon, PrimaryButton, TextField } from "../finances/fin-ui.jsx";

const round = Math.round;
const CONF = { high: ["#34d399", "Fairly sure"], medium: ["#fbbf24", "Rough estimate"], low: ["#fb923c", "Unsure — check carefully"] };
const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function MealPhoto({ mealLabel, onAdd }) {
  const [shot, setShot] = useState(null); // { url, data }
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [rows, setRows] = useState([]); // [{ ...item, on, x }]
  const [allow, setAllow] = useState(null);
  const input = useRef(null);

  useEffect(() => {
    api.mealScanAllowance().then(setAllow).catch(() => {});
  }, []);

  const choose = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    setResult(null);
    try {
      setShot(await shrinkPhoto(f, 1024, 0.82));
    } catch (err) {
      setError(err.message);
    }
  };

  async function estimate() {
    setBusy(true);
    setError("");
    try {
      const r = await api.mealScan(shot.data, hint.trim());
      setResult(r);
      setRows(r.items.map((i) => ({ ...i, on: true, x: 1 })));
      api.mealScanAllowance().then(setAllow).catch(() => {});
    } catch (err) {
      setError(err.message || "Couldn't read the photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const chosen = rows.filter((r) => r.on);
  const total = chosen.reduce((a, r) => a + r.cal * r.x, 0);
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

  return (
    <div className="mt-4">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={choose} aria-hidden="true" tabIndex={-1} />
      {!shot ? (
        <>
          <button
            onClick={() => input.current?.click()}
            disabled={left === 0}
            className="flex w-full flex-col items-center gap-2 rounded-3xl border border-dashed border-white/15 px-4 py-10 text-center transition hover:border-fin-accent/60 hover:bg-fin-input disabled:opacity-50"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-fin-accent/15 text-fin-accent"><Icon name="camera" size={26} /></span>
            <span className="text-[16px] font-bold">Take or choose a photo</span>
            <span className="max-w-[300px] text-[13px] text-fin-muted">Shoot from above with the whole plate in frame. The AI estimates each item — you check it before anything is added.</span>
          </button>
          {left != null && <div className="mt-2 text-center text-[12.5px] text-fin-faint">{left ? `${left} AI estimate${left === 1 ? "" : "s"} left today` : "No AI estimates left today — use Search or Quick add."}</div>}
        </>
      ) : !result ? (
        <div>
          <div className="relative overflow-hidden rounded-3xl bg-black">
            <img src={shot.url} alt="Your meal" className="mx-auto max-h-[38dvh] w-auto object-contain" />
            <button onClick={() => input.current?.click()} disabled={busy} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1.5 text-[12.5px] font-semibold hover:bg-black/80">Change</button>
          </div>
          <label className="mt-3 block">
            <div className="mb-1 text-[12.5px] text-fin-muted">What's in it? (optional, makes it more accurate)</div>
            <TextField value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. 3 chapatis, dal, aloo sabzi cooked in ghee" maxLength={300} disabled={busy} />
          </label>
          {error && <div className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2.5 text-[13.5px] text-fin-danger">{error}</div>}
          <PrimaryButton className="mt-4 w-full" onClick={estimate} disabled={busy || left === 0}>
            {busy ? "Looking at your plate…" : "Estimate calories"}
          </PrimaryButton>
          {busy && <div className="mt-2 text-center text-[12.5px] text-fin-faint">This takes about 5–15 seconds.</div>}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3">
            <img src={shot.url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="tabular text-[24px] font-extrabold leading-tight">{round(total)} kcal</div>
              <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: CONF[result.confidence]?.[0] }}>
                <span className="h-2 w-2 rounded-full" style={{ background: CONF[result.confidence]?.[0] }} /> {CONF[result.confidence]?.[1]}
              </div>
            </div>
            <button onClick={() => { setResult(null); setRows([]); }} className="shrink-0 rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold">Retry</button>
          </div>
          {!result.isFood ? (
            <div className="mt-4 rounded-2xl bg-amber-400/10 px-3 py-3 text-[13.5px] text-amber-200">
              The AI couldn't see any food in this photo{result.photoQuality ? ` (${result.photoQuality})` : ""}. Try another photo, or add it with Search.
            </div>
          ) : (
            <>
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
                        <div className="truncate text-[14.5px] font-semibold">{r.name}</div>
                        <div className="tabular truncate text-[12px] text-fin-muted">{r.portion}{r.grams ? ` · ~${r.grams} g` : ""} · P {round(r.p * r.x)} · C {round(r.c * r.x)} · F {round(r.f * r.x)}</div>
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
              <div className="mt-2 text-[12px] text-fin-faint">AI estimates can be off by 20–30%, mostly from hidden oil and portion size. If you know the real amount, change the portion.</div>
              <PrimaryButton className="mt-4 w-full" onClick={add} disabled={!chosen.length}>
                Add {chosen.length} item{chosen.length === 1 ? "" : "s"} to {mealLabel} · {round(total)} kcal
              </PrimaryButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}
