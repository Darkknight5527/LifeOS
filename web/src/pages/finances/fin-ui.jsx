// Visual building blocks for the FinTraQ-style Finances section.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "./lib";

// ---------- icons (inline, stroke-based, inherit currentColor) ----------
const PATHS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  chart: "M5 20V11M10 20V5M15 20v-7M20 20V9",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h.01",
  plus: "M12 5v14M5 12h14",
  left: "M15 18l-6-6 6-6",
  right: "M9 18l6-6-6-6",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
  upload: "M12 20V8M7 13l5-5 5 5M5 4h14",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  reset: "M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0 0 12.5 2.5M19 9A7 7 0 0 0 6.5 6.5",
  bag: "M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2",
  piggy: "M5 11a7 6 0 0 1 12-3h2v3l2 1v3h-2l-2 3v2h-3v-1H10v1H7v-2.5A6 6 0 0 1 5 11zM15 10h.01M2 9c0 1.5 1 2.5 3 2.5",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  close: "M6 6l12 12M18 6 6 18",
  check: "M5 12l5 5 9-10",
  calendar: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4",
  pie: "M12 3v9h9A9 9 0 1 1 12 3zM15 3.5A9 9 0 0 1 20.5 9H15z",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  drop: "M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z",
  scissors: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12",
  hair: "M4 20c0-8 3-14 8-14s8 6 8 14M8 20c0-6 1.5-10 4-10s4 4 4 10M12 6V3",
  flame: "M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8a7 7 0 0 0 7 7z",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  news: "M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2zM17 9h3v10a2 2 0 0 1-2 2M8 9h5M8 13h5M8 17h3",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  dumbbell: "M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  pin: "M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  book: "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z",
  calc: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  figure: "M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 9.5l7-1.5 7 1.5M12 8v6.5M8.5 21.5l3.5-7 3.5 7",
  play: "M8 5.5v13l11-6.5z",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
};

export function Icon({ name, size = 20, stroke = 1.8, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function LogoMark({ size = 40, icon = "trend" }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] text-white shadow-glow"
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={size * 0.55} stroke={2.4} />
    </div>
  );
}

// ---------- layout ----------
export function FinCard({ title, action, children, className = "", delay = 0 }) {
  return (
    <section
      className={`animate-fade-up rounded-[28px] bg-fin-card p-5 shadow-card sm:p-6 lg:rounded-[24px] lg:p-5 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || action) && (
        <div className="mb-4 flex min-h-[32px] items-center justify-between gap-3 lg:mb-3">
          {title && <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tile({ children, className = "" }) {
  return <div className={`rounded-[20px] bg-fin-tile px-4 py-4 ${className}`}>{children}</div>;
}

export function EmptyState({ icon = "receipt", children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-fin-muted">
      <Icon name={icon} size={40} stroke={1.4} className="text-fin-faint" />
      <div className="max-w-xs text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}

// ---------- controls ----------
export function Segmented({ options, value, onChange, className = "" }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`relative flex rounded-2xl bg-fin-input p-1 ${className}`} role="tablist">
      <div
        className="absolute bottom-1 top-1 rounded-xl bg-fin-tile shadow transition-all duration-300 ease-out"
        style={{ left: `calc(${(idx / options.length) * 100}% + 4px)`, width: `calc(${100 / options.length}% - 8px)` }}
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            // ← → move between options, like any tab strip
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            e.stopPropagation();
            const next = (i + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
            onChange(options[next].value);
            e.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
          }}
          className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[15px] font-semibold transition-colors ${
            o.value === value ? "text-white" : "text-fin-muted hover:text-white/80"
          }`}
        >
          {o.dot && <span className="h-2 w-2 rounded-full" style={{ background: o.dot }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pill({ active, onClick, children, color, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-semibold transition active:scale-95 ${
        active
          ? "border-fin-accent bg-fin-accent/10 text-fin-accent"
          : "border-transparent bg-fin-input text-white/85 hover:bg-fin-tile"
      } ${className}`}
      style={active && color ? { borderColor: color, color, background: `${color}1f` } : undefined}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-gradient-to-r from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] px-5 py-3 text-[16px] font-bold text-white shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-2xl border border-fin-line bg-fin-input px-5 py-3 text-[16px] font-semibold text-white transition hover:bg-fin-tile active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({ icon, label, onClick, className = "", size = 18 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-xl text-fin-muted transition hover:bg-fin-tile hover:text-white active:scale-95 ${className}`}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export function TextField({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-transparent bg-fin-input px-4 py-3.5 text-[16px] text-white placeholder:text-fin-faint outline-none transition focus:border-fin-accent/60 ${className}`}
    />
  );
}

export function MoneyField({ value, onChange, placeholder = "0", className = "", autoFocus, onEnter }) {
  return (
    <div className={`flex items-center rounded-2xl border border-transparent bg-fin-input px-4 transition focus-within:border-fin-accent/60 ${className}`}>
      <span className="text-fin-faint">₹</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        placeholder={placeholder}
        className="tabular w-full bg-transparent px-2 py-3.5 text-[16px] text-white placeholder:text-fin-faint outline-none"
      />
    </div>
  );
}

// ---------- numbers ----------
// Animates from the previous value to the new one.
export function useCountUp(target, duration = 650) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = target;
    if (a === b) return;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(a + (b - a) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = b;
    };
  }, [target, duration]);
  return value;
}

export function Money({ value, className = "", compact = false }) {
  const v = useCountUp(Number(value) || 0);
  return <span className={`tabular ${className}`}>{formatMoney(Math.round(v), { compact })}</span>;
}

export function ProgressBar({ value, max, color, className = "" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  const over = max > 0 && value > max;
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-fin-input ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, background: over ? "#f87171" : color }}
      />
    </div>
  );
}

// Circular progress ring with content in the middle.
export function Ring({ value, max, color, size = 64, stroke = 7, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#121215" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

// ---------- month navigator ----------
export function MonthNav({ label, sub, onPrev, onNext, canNext = true }) {
  return (
    <div className="flex animate-fade-up items-center justify-between rounded-[22px] bg-[#141418] px-3 py-3 lg:py-1.5">
      <IconButton icon="left" label="Previous month" onClick={onPrev} />
      <div className="text-center">
        <div className="text-[18px] font-bold lg:text-[17px]">{label}</div>
        {sub && <div className="text-[13px] text-fin-muted">{sub}</div>}
      </div>
      <IconButton icon="right" label="Next month" onClick={onNext} className={canNext ? "" : "pointer-events-none opacity-25"} />
    </div>
  );
}

// Domain colour theme (e.g. "theme-teal"), so popups drawn outside the page
// still use the right accent colour.
export const ThemeContext = createContext("");

// ---------- sheet (bottom sheet on phones, centred dialog on larger screens) ----------
export function Sheet({ open, onClose, title, children, footer, titleExtra, wide = false }) {
  const theme = useContext(ThemeContext);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  // Rendered into <body> so it always covers the whole screen, even when opened
  // from inside an animated card (an animated parent would otherwise trap it).
  return createPortal(
    <div className={`fin-scope ${theme}`} style={{ display: "contents" }}>
    <div className="fixed inset-0 z-[60] flex items-end justify-center font-fin text-white sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full ${wide ? "max-w-4xl" : "max-w-lg"} animate-sheet-up flex-col rounded-t-[30px] bg-fin-card shadow-2xl ring-1 ring-white/5 sm:animate-pop-in sm:rounded-[30px]`}>
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-white/15 sm:hidden" />
        <div className="flex items-center justify-between px-6 pb-2 pt-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[20px] font-bold">{title}</h3>
            {titleExtra}
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-4">{children}</div>
        {footer && <div className="flex gap-3 border-t border-fin-line px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
    </div>,
    document.body
  );
}

export function BucketDot({ bucket, size = 10 }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: bucket.color }} />;
}

export function BucketBadge({ bucket, size = 40 }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-2xl" style={{ width: size, height: size, background: bucket.soft, color: bucket.color }}>
      <Icon name={bucket.icon} size={size * 0.48} />
    </div>
  );
}
