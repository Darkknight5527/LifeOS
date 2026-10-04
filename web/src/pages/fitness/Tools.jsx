// FitNotes-style gym tools: plate calculator and interval timers
// (stopwatch, EMOM, AMRAP, Tabata).
import { useEffect, useRef, useState } from "react";
import { useFit } from "./FitContext.jsx";
import { DEFAULT_PLATES, fmtTime, platesFor } from "./lib";
import { NumberBox, kicker } from "./fit-ui.jsx";
import { Pill, PrimaryButton, Ring, Segmented, Sheet } from "../finances/fin-ui.jsx";

const PLATE_COLOR = { 25: "#ef4444", 20: "#3b82f6", 15: "#facc15", 10: "#22c55e", 5: "#f8fafc", 2.5: "#ef4444", 1.25: "#94a3b8", 0.5: "#cbd5e1" };
const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

export function PlateCalculator({ open, onClose, initial }) {
  const fit = useFit();
  const cfg = { ...DEFAULT_PLATES, ...(fit.settings?.plates || {}) };
  const [target, setTarget] = useState(initial || 60);
  useEffect(() => {
    if (open) setTarget(Number(initial) > 0 ? Number(initial) : 60);
  }, [open, initial]);
  const res = platesFor(Number(target) || 0, cfg.bar, cfg.available);
  const save = (patch) => fit.saveSettings({ plates: { ...cfg, ...patch } });

  return (
    <Sheet open={open} onClose={onClose} title="Plate calculator">
      <div className="flex items-end gap-3">
        <label className="flex-1">
          <div className="mb-1 text-[12.5px] text-fin-muted">Target weight (kg)</div>
          <NumberBox value={target} step={1.25} onChange={setTarget} className="!py-3 !text-[24px]" label="Target weight" />
        </label>
        <div className="flex gap-1">
          {[-2.5, 2.5, 5].map((d) => (
            <button key={d} onClick={() => setTarget((t) => Math.max(0, (Number(t) || 0) + d))} className="h-12 rounded-xl bg-fin-tile px-3 text-[14px] font-semibold">
              {d > 0 ? "+" : ""}{d}
            </button>
          ))}
        </div>
      </div>

      {/* Bar drawing */}
      <div className="mt-5 flex h-28 items-center justify-center rounded-2xl bg-fin-input px-3">
        <div className="flex items-center">
          {[...res.plates].reverse().map((p, i) => <Plate key={`l${i}`} p={p} />)}
          <div className="h-3 w-24 rounded-sm bg-gradient-to-b from-zinc-300 to-zinc-500" title={`Bar ${cfg.bar} kg`} />
          {res.plates.map((p, i) => <Plate key={`r${i}`} p={p} />)}
        </div>
      </div>
      <div className="mt-3 text-center text-[15px]">
        {res.plates.length ? (
          <>
            Each side: <b>{res.plates.join(" + ")}</b> kg
          </>
        ) : Number(target) <= cfg.bar ? (
          "Just the bar."
        ) : (
          "No plates fit."
        )}
        {res.left > 0 && <div className="mt-1 text-[13px] text-fin-danger">Closest you can load: {res.achieved} kg ({res.left} kg short)</div>}
      </div>

      <div className={`${kicker} mt-5`}>Bar</div>
      <div className="flex gap-1.5">
        {[20, 15, 10, 7.5, 0].map((b) => (
          <Pill key={b} active={cfg.bar === b} onClick={() => save({ bar: b })}>{b ? `${b} kg` : "No bar"}</Pill>
        ))}
      </div>
      <div className={`${kicker} mt-4`}>Plates your gym has</div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_PLATES.map((p) => {
          const on = cfg.available.includes(p);
          return (
            <Pill key={p} active={on} onClick={() => save({ available: on ? cfg.available.filter((x) => x !== p) : [...cfg.available, p].sort((a, b) => b - a) })}>
              {p} kg
            </Pill>
          );
        })}
      </div>
    </Sheet>
  );
}

function Plate({ p }) {
  const h = 40 + Math.min(1, p / 25) * 56;
  return <div className="mx-[1px] rounded-[3px] ring-1 ring-black/30" style={{ height: h, width: p >= 10 ? 13 : 9, background: PLATE_COLOR[p] || "#cbd5e1" }} title={`${p} kg`} />;
}

/* ---------- timers ---------- */
function beep(n = 1) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i === n - 1 ? 1046 : 784;
      g.gain.setValueAtTime(0.16, ctx.currentTime + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.22 + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.22);
      o.stop(ctx.currentTime + i * 0.22 + 0.2);
    }
    navigator.vibrate?.(120);
  } catch {
    /* no audio */
  }
}

const MODES = [
  { value: "stopwatch", label: "Stopwatch" },
  { value: "emom", label: "EMOM" },
  { value: "amrap", label: "AMRAP" },
  { value: "tabata", label: "Tabata" },
];
const HELP = {
  stopwatch: "Counts up. Use it for planks, cardio or timing a whole session.",
  emom: "Every minute on the minute: start a set at the top of each minute, rest for what's left.",
  amrap: "As many rounds as possible before the clock runs out. Tap +1 round each time you finish one.",
  tabata: "8 rounds of 20 s all-out work, 10 s rest (customisable).",
};

export function TimersSheet({ open, onClose }) {
  const [mode, setMode] = useState("stopwatch");
  const [cfg, setCfg] = useState({ emomMin: 10, emomEvery: 60, amrapMin: 12, work: 20, rest: 10, rounds: 8 });
  const [run, setRun] = useState(null); // { start, pausedAt, offset }
  const [now, setNow] = useState(Date.now());
  const [rounds, setRounds] = useState(0);
  const last = useRef(null);

  useEffect(() => {
    if (!run || run.pausedAt) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [run]);

  const elapsed = run ? ((run.pausedAt || now) - run.start - (run.offset || 0)) / 1000 : 0;

  // What to show + when to beep
  let big = fmtTime(elapsed);
  let sub = "";
  let frac = 0;
  let done = false;
  let phaseKey = "";
  if (mode === "emom") {
    const total = cfg.emomMin * cfg.emomEvery;
    const idx = Math.floor(elapsed / cfg.emomEvery);
    const into = elapsed % cfg.emomEvery;
    done = elapsed >= total;
    big = done ? "Done" : fmtTime(cfg.emomEvery - into);
    sub = done ? `${cfg.emomMin} rounds complete` : `Round ${idx + 1} of ${cfg.emomMin}`;
    frac = done ? 1 : into / cfg.emomEvery;
    phaseKey = done ? "end" : `r${idx}`;
  } else if (mode === "amrap") {
    const total = cfg.amrapMin * 60;
    done = elapsed >= total;
    big = done ? "Time!" : fmtTime(total - elapsed);
    sub = `${rounds} round${rounds === 1 ? "" : "s"}`;
    frac = Math.min(1, elapsed / total);
    phaseKey = done ? "end" : "go";
  } else if (mode === "tabata") {
    const cycle = cfg.work + cfg.rest;
    const idx = Math.floor(elapsed / cycle);
    const into = elapsed % cycle;
    done = idx >= cfg.rounds;
    const working = into < cfg.work;
    big = done ? "Done" : fmtTime(working ? cfg.work - into : cycle - into);
    sub = done ? `${cfg.rounds} rounds complete` : `${working ? "WORK" : "Rest"} · round ${idx + 1} of ${cfg.rounds}`;
    frac = done ? 1 : working ? into / cfg.work : (into - cfg.work) / cfg.rest;
    phaseKey = done ? "end" : `${idx}-${working ? "w" : "r"}`;
  } else {
    frac = (elapsed % 60) / 60;
  }

  useEffect(() => {
    if (!run || run.pausedAt || mode === "stopwatch") return;
    if (last.current !== null && last.current !== phaseKey) beep(phaseKey === "end" ? 3 : 1);
    last.current = phaseKey;
    if (done && !run.pausedAt) setRun((r) => ({ ...r, pausedAt: Date.now() }));
  }, [phaseKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setRun(null);
    setRounds(0);
    last.current = null;
  };
  const toggle = () => {
    if (!run) {
      setRun({ start: Date.now(), offset: 0 });
      last.current = null;
      if (mode !== "stopwatch") beep(1);
    } else if (run.pausedAt) {
      if (done) return reset();
      setRun((r) => ({ ...r, offset: (r.offset || 0) + (Date.now() - r.pausedAt), pausedAt: null }));
    } else setRun((r) => ({ ...r, pausedAt: Date.now() }));
  };
  const working = mode === "tabata" && sub.startsWith("WORK");
  const set = (k) => (v) => setCfg((c) => ({ ...c, [k]: Math.max(1, Number(v) || 1) }));

  return (
    <Sheet open={open} onClose={onClose} title="Timers">
      <Segmented className="[&_button]:!py-2 [&_button]:!text-[14px]" value={mode} onChange={(m) => { reset(); setMode(m); }} options={MODES} />
      <p className="mt-3 text-[13px] text-fin-muted">{HELP[mode]}</p>
      <div className="mt-4 flex justify-center">
        <Ring value={frac} max={1} color={working ? "#f87171" : mode === "tabata" && run ? "#34d399" : "rgb(var(--fin-accent))"} size={210} stroke={12}>
          <div className="text-center">
            <div className="tabular text-[46px] font-extrabold leading-none">{big}</div>
            {sub && <div className={`mt-2 text-[14px] font-semibold ${working ? "text-red-300" : "text-fin-muted"}`}>{sub}</div>}
          </div>
        </Ring>
      </div>
      {!run && mode !== "stopwatch" && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {mode === "emom" && (
            <>
              <Field label="Minutes" value={cfg.emomMin} onChange={set("emomMin")} />
              <Field label="Every (sec)" value={cfg.emomEvery} onChange={set("emomEvery")} />
            </>
          )}
          {mode === "amrap" && <Field label="Minutes" value={cfg.amrapMin} onChange={set("amrapMin")} />}
          {mode === "tabata" && (
            <>
              <Field label="Work (sec)" value={cfg.work} onChange={set("work")} />
              <Field label="Rest (sec)" value={cfg.rest} onChange={set("rest")} />
              <Field label="Rounds" value={cfg.rounds} onChange={set("rounds")} />
            </>
          )}
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <PrimaryButton className="flex-1 !py-3.5 !text-[17px]" onClick={toggle}>{!run ? "Start" : run.pausedAt ? (done ? "Restart" : "Resume") : "Pause"}</PrimaryButton>
        {mode === "amrap" && run && !done && (
          <button onClick={() => setRounds((r) => r + 1)} className="rounded-2xl bg-fin-accent/15 px-5 text-[16px] font-bold text-fin-accent">+1 round</button>
        )}
        {run && <button onClick={reset} className="rounded-2xl bg-fin-tile px-5 text-[15px] font-semibold">Reset</button>}
      </div>
    </Sheet>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label>
      <div className="mb-1 text-[12.5px] text-fin-muted">{label}</div>
      <NumberBox value={value} onChange={onChange} className="!py-2.5" label={label} />
    </label>
  );
}
