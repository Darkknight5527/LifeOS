// Small shared pieces for the Learning domain.
import { LEVELS } from "./plan.js";

export const kicker = "mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted";

/** Lesson status: "" | "progress" | "partial" (done below L4) | "full" (done at L4). */
export function lessonState(p) {
  if (!p) return "";
  if (p.status === "done") return (p.level || 0) >= 4 ? "full" : "partial";
  return "progress";
}
export const STATE = {
  "": { label: "Not started", cls: "bg-white/[0.06] text-white/45" },
  progress: { label: "In progress", cls: "bg-amber-400/15 text-amber-300" },
  partial: { label: "Partly done", cls: "bg-fin-accent/15 text-fin-accent/80" },
  full: { label: "Done · L4", cls: "bg-fin-accent text-white" },
};

export function StatePill({ p, small }) {
  const st = STATE[lessonState(p)];
  const label = lessonState(p) === "partial" ? `Done · L${p.level || "?"}` : st.label;
  return <span className={`shrink-0 rounded-full font-semibold ${small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"} ${st.cls}`}>{label}</span>;
}

/** A small square per lesson: empty, amber (in progress), light pink (partial), full pink (L4). */
export function Dot({ p, current, title }) {
  const s = lessonState(p);
  const cls = s === "full" ? "bg-fin-accent" : s === "partial" ? "bg-fin-accent/40" : s === "progress" ? "bg-amber-400/70" : "bg-white/10";
  return <span title={title} className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${cls} ${current ? "ring-2 ring-white/80 ring-offset-1 ring-offset-[#18181d]" : ""}`} />;
}

export function LevelPicker({ value, onChange, compact }) {
  return (
    <div className={`grid grid-cols-4 gap-1.5`} role="radiogroup" aria-label="Level reached">
      {LEVELS.map((l) => {
        const on = value === l.value;
        return (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? 0 : l.value)}
            title={`${l.label}: ${l.what}`}
            className={`rounded-xl px-1 transition ${compact ? "py-1.5" : "py-2"} ${on ? (l.value === 4 ? "bg-fin-accent text-white" : "bg-fin-accent/30 text-white") : "bg-fin-input text-white/70 hover:bg-fin-tile"}`}
          >
            <div className="text-[15px] font-extrabold">{l.short}</div>
            {!compact && <div className="text-[10.5px] font-semibold opacity-80">{l.label.split(" ")[1]}</div>}
          </button>
        );
      })}
    </div>
  );
}

export function Bar({ full, partial = 0, total, className = "" }) {
  const f = total ? (full / total) * 100 : 0;
  const p = total ? (partial / total) * 100 : 0;
  return (
    <div className={`flex h-2 overflow-hidden rounded-full bg-white/[0.07] ${className}`}>
      <div className="h-full bg-fin-accent transition-[width] duration-700" style={{ width: `${f}%` }} />
      <div className="h-full bg-fin-accent/35 transition-[width] duration-700" style={{ width: `${p}%` }} />
    </div>
  );
}
