// Small form pieces shared by the Health views.
import { useEffect, useState } from "react";
import { Icon } from "../../finances/fin-ui.jsx";
import { prettyDate } from "../lib";

const box = "w-full rounded-xl border border-transparent bg-fin-input px-3 py-2.5 text-[15px] text-white outline-none transition placeholder:text-fin-faint focus:border-fin-accent/60 [color-scheme:dark]";

export function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-1 text-[12.5px] text-fin-muted">{label}</div>
      {children}
    </label>
  );
}
export const Input = (props) => <input {...props} className={`${box} ${props.className || ""}`} />;
export const Area = (props) => <textarea rows={3} {...props} className={`${box} resize-none leading-relaxed ${props.className || ""}`} />;
export function Select({ value, onChange, options, ...rest }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...rest} className={`${box} ${rest.className || ""}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#17171c]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A row of choice chips (single choice). */
export function Chips({ options, value, onChange, label, small }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-full font-semibold transition ${small ? "px-2.5 py-1 text-[12.5px]" : "px-3 py-1.5 text-[13.5px]"} ${on ? "bg-fin-accent text-white" : "bg-fin-input text-white/75 hover:bg-fin-tile hover:text-white"}`}
            style={on && o.color ? { background: o.color, color: "#111" } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** 1–5 severity picker; 0 = not rated. */
export function Severity({ value, onChange }) {
  const colors = ["#34d399", "#a3e635", "#fbbf24", "#fb923c", "#f87171"];
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Severity">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`Severity ${n} of 5`}
          onClick={() => onChange(value === n ? 0 : n)}
          className={`h-9 flex-1 rounded-xl text-[14px] font-bold transition ${value === n ? "text-black" : "bg-fin-input text-white/70 hover:bg-fin-tile"}`}
          style={value === n ? { background: colors[n - 1] } : undefined}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
export const SEV_LABEL = ["", "Mild", "Noticeable", "Moderate", "Bad", "Severe"];

export function Row({ icon, iconColor, title, sub, right, onClick, className = "" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl bg-fin-input px-3.5 py-2.5 text-left ${onClick ? "transition hover:bg-fin-tile" : ""} ${className}`}>
      {icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${iconColor || "rgb(var(--fin-accent))"}22`, color: iconColor || "rgb(var(--fin-accent))" }}>
          <Icon name={icon} size={17} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold">{title}</span>
        {sub && <span className="block truncate text-[12.5px] text-fin-muted">{sub}</span>}
      </span>
      {right}
    </Tag>
  );
}

export const shortDate = (iso) => (iso ? prettyDate(iso, { day: "numeric", month: "short", ...(iso.slice(0, 4) !== String(new Date().getFullYear()) ? { year: "numeric" } : {}) }) : "");

export function AddButton({ onClick, children = "Add", label }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex items-center gap-1 rounded-xl bg-fin-accent/15 px-3 py-1.5 text-[13.5px] font-semibold text-fin-accent hover:bg-fin-accent/25">
      <Icon name="plus" size={14} stroke={2.6} /> {children}
    </button>
  );
}

/** Delete that asks once more ("Tap again to delete") instead of a browser pop-up. */
export function DeleteButton({ onDelete, label = "Delete" }) {
  const [sure, setSure] = useState(false);
  useEffect(() => {
    if (!sure) return;
    const t = setTimeout(() => setSure(false), 3000);
    return () => clearTimeout(t);
  }, [sure]);
  return (
    <button type="button" onClick={() => (sure ? onDelete() : setSure(true))} className={`rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${sure ? "bg-red-500/20 text-fin-danger" : "text-fin-muted hover:text-fin-danger"}`}>
      {sure ? "Tap again to delete" : label}
    </button>
  );
}
