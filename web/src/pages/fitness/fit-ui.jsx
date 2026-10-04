// Small shared pieces for the Fitness screens.
import { useMemo, useRef, useState } from "react";
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
// Nice round tick values between min and max (about `count` of them).
function niceTicks(min, max, count = 4) {
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

// Line chart with value axis, date labels and a crosshair: hover (or touch and
// drag on a phone) to read any point. `second` is an optional dashed line.
export function LineChart({ points, height = 150, color = "rgb(var(--fin-accent))", format = (v) => v, axisFormat, second, secondLabel = "Trend" }) {
  const [hover, setHover] = useState(null);
  const box = useRef(null);
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
  const ticks = niceTicks(min, max);
  const n = points.length;
  const W = 600;
  const H = height;
  const X = (i) => (n === 1 ? W / 2 : 8 + (i / (n - 1)) * (W - 16));
  const Y = (v) => H - ((v - min) / (max - min)) * H;
  const path = (pts) => pts.map((p, i) => (p.y == null ? null : `${i && pts[i - 1]?.y != null ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`)).filter(Boolean).join("");
  const xLabels = n === 1 ? [0] : [...new Set([0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1])];
  const pick = (e) => {
    const r = box.current.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * W;
    const i = n === 1 ? 0 : Math.round(((fx - 8) / (W - 16)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const p = hover != null ? points[hover] : null;
  const left = hover != null ? (X(hover) / W) * 100 : 0;
  const af = axisFormat || format;
  return (
    <div className="flex gap-2">
      <div className="tabular relative w-10 shrink-0 text-right text-[11px] text-fin-faint" style={{ height }} aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ top: Y(t) }}>{af(t)}</span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div
          ref={box}
          className="relative touch-none select-none"
          style={{ height }}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
          role="img"
          aria-label={`Chart of ${n} values, latest ${format(points[n - 1].y)}`}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none">
            {ticks.map((t) => (
              <line key={t} x1="0" x2={W} y1={Y(t)} y2={Y(t)} stroke="rgba(255,255,255,.06)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
            ))}
            {second && <path d={path(second)} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="5 5" />}
            <path d={path(points)} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            {n <= 40 && points.map((q, i) => q.y != null && <circle key={i} cx={X(i)} cy={Y(q.y)} r="2.2" fill={color} vectorEffect="non-scaling-stroke" />)}
          </svg>
          {p && p.y != null && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-white/25" style={{ left: `${left}%` }} />
              <span className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[#18181d]" style={{ left: `${left}%`, top: Y(p.y), background: color }} />
              <div
                className="pointer-events-none absolute top-0 z-20 whitespace-nowrap rounded-xl bg-[#2e2e36] px-3 py-1.5 text-[12.5px] shadow-xl ring-1 ring-white/10"
                style={left < 50 ? { left: `calc(${left}% + 10px)` } : { right: `calc(${100 - left}% + 10px)` }}
              >
                <div className="text-fin-muted">{p.x}</div>
                <div className="text-[15px] font-bold">{format(p.y)}</div>
                {second?.[hover]?.y != null && <div className="text-[11.5px] text-fin-faint">{secondLabel} {format(second[hover].y)}</div>}
              </div>
            </>
          )}
        </div>
        <div className="relative mt-1.5 h-4 text-[11px] text-fin-faint" aria-hidden="true">
          {xLabels.map((i, k) => (
            <span
              key={i}
              className="absolute whitespace-nowrap"
              style={k === 0 ? { left: 0 } : i === n - 1 ? { right: 0 } : { left: `${(X(i) / W) * 100}%`, transform: "translateX(-50%)" }}
            >
              {points[i].x}
            </span>
          ))}
        </div>
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
