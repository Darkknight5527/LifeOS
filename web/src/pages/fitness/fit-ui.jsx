// Small shared pieces for the Fitness screens.
import { useMemo, useState } from "react";
import { EX_TYPES, GROUP_LABEL, LIBRARY } from "./lib";
import { Icon, Sheet, TextField } from "../finances/fin-ui.jsx";

export const kicker = "mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted";

// Pick an exercise from the library + your own (search, grouped), or create one.
export function ExercisePicker({ open, onClose, onPick, exclude = [], customs = [], onCreate }) {
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState(null); // { group, type } when creating
  const lib = useMemo(() => [...customs.map((c) => ({ ...c, label: GROUP_LABEL[c.group] || "My exercises", mine: true })), ...LIBRARY], [customs]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return lib.filter((x) => !exclude.includes(x.exercise) && (!s || x.exercise.toLowerCase().includes(s) || x.label.toLowerCase().includes(s)));
  }, [q, exclude, lib]);
  const groups = [...new Set(list.map((x) => x.group || "mine"))];
  const name = q.trim();
  const custom = name && !lib.some((x) => x.exercise.toLowerCase() === name.toLowerCase());
  const close = () => {
    setQ("");
    setDraft(null);
    onClose();
  };
  function create() {
    const ex = { exercise: name, group: draft.group, type: draft.type };
    onCreate?.(ex);
    onPick(ex);
    setQ("");
    setDraft(null);
  }
  return (
    <Sheet open={open} onClose={close} title="Add exercise">
      <TextField autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. press, curl, squat" />
      {custom && !draft && (
        <button onClick={() => setDraft({ group: "", type: "weight_reps" })} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-fin-accent/10 px-4 py-3 text-left text-[15px] font-semibold text-fin-accent">
          <Icon name="plus" size={16} stroke={2.4} /> Create “{name}”
        </button>
      )}
      {custom && draft && (
        <div className="mt-3 rounded-2xl bg-fin-input p-3">
          <div className="text-[15px] font-semibold">New exercise: {name}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select value={draft.group} onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value }))} className="rounded-xl bg-fin-tile px-3 py-2 text-[14px] text-white outline-none [color-scheme:dark]" aria-label="Muscle group">
              <option value="">Muscle group…</option>
              {Object.entries(GROUP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))} className="rounded-xl bg-fin-tile px-3 py-2 text-[14px] text-white outline-none [color-scheme:dark]" aria-label="Exercise type">
              {EX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <button onClick={create} className="mt-2 w-full rounded-xl bg-fin-accent py-2 text-[14px] font-bold text-white">Create & add</button>
        </div>
      )}
      <div className="mt-3 space-y-4">
        {groups.map((g) => (
          <div key={g}>
            <div className={kicker}>{GROUP_LABEL[g] || "My exercises"}</div>
            <div className="flex flex-wrap gap-1.5">
              {list.filter((x) => (x.group || "mine") === g).map((x) => (
                <button key={x.exercise} onClick={() => { onPick(x); setQ(""); }} className={`rounded-full px-3 py-1.5 text-[14px] transition hover:bg-fin-tile hover:text-white ${x.mine ? "bg-fin-accent/10 text-fin-accent" : "bg-fin-input text-white/85"}`}>
                  {x.exercise}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

// Minimal line chart: points [{x: label, y}] — hover shows the value.
export function LineChart({ points, height = 150, color = "rgb(var(--fin-accent))", format = (v) => v, second }) {
  const [hover, setHover] = useState(null);
  if (!points.length) return null;
  const all = [...points.map((p) => p.y), ...(second ? second.map((p) => p.y) : [])].filter((v) => v != null);
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;
  const W = 600;
  const H = height;
  const X = (i) => (points.length === 1 ? W / 2 : 12 + (i / (points.length - 1)) * (W - 24));
  const Y = (v) => H - 10 - ((v - min) / (max - min)) * (H - 20);
  const path = (pts) => pts.map((p, i) => (p.y == null ? null : `${i && pts[i - 1]?.y != null ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`)).filter(Boolean).join("");
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" preserveAspectRatio="none" style={{ height }}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(255,255,255,.05)" strokeDasharray="4 6" />
        ))}
        {second && <path d={path(second)} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="5 5" />}
        <path d={path(points)} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex">
        {points.map((p, i) => (
          <div key={i} className="relative flex-1" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            {hover === i && p.y != null && (
              <>
                <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[#18181d]" style={{ left: "50%", top: Y(p.y) * (height / H), background: color }} />
                <div className={`pointer-events-none absolute bottom-full z-20 mb-1 whitespace-nowrap rounded-xl bg-[#2e2e36] px-3 py-1.5 text-[12.5px] shadow-xl ring-1 ring-white/10 ${i < points.length / 2 ? "left-0" : "right-0"}`}>
                  <div className="text-fin-muted">{p.x}</div>
                  <div className="font-bold">{format(p.y)}</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple vertical bars [{label, value}] with a target line.
export function Bars({ data, height = 120, color = "rgb(var(--fin-accent))", target, format = (v) => v }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, target || 0, ...data.map((d) => d.value)) * 1.08;
  return (
    <div>
      <div className="relative flex items-end gap-[3px] border-b border-white/10" style={{ height }}>
        {target > 0 && <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/25" style={{ bottom: `${(target / max) * 100}%` }} />}
        {data.map((d, i) => (
          <div key={i} className="relative flex h-full flex-1 items-end justify-center" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            {hover === i && (
              <div className={`pointer-events-none absolute bottom-full z-20 mb-1 whitespace-nowrap rounded-xl bg-[#2e2e36] px-3 py-1.5 text-[12.5px] shadow-xl ring-1 ring-white/10 ${i < data.length / 2 ? "left-0" : "right-0"}`}>
                <div className="text-fin-muted">{d.label}</div>
                <div className="font-bold">{format(d.value)}</div>
              </div>
            )}
            <div className="w-full max-w-[22px] rounded-t-[4px] transition-all duration-500" style={{ height: d.value ? `${(d.value / max) * 100}%` : 3, background: d.value ? d.color || color : "rgba(255,255,255,.08)", opacity: hover == null || hover === i ? 1 : 0.6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NumberBox({ value, onChange, placeholder, step = 1, className = "", label }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min="0"
      value={value ?? ""}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      onFocus={(e) => e.target.select()}
      className={`tabular w-full rounded-xl bg-fin-input px-2 py-2 text-center text-[15px] font-semibold text-white outline-none ring-fin-accent/60 placeholder:text-white/25 focus:ring-2 ${className}`}
    />
  );
}
