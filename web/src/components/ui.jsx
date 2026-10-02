// Small shared UI primitives used across domain pages, styled with Tailwind
// to roughly match the prototype artifact's look (cards, pills, chips, scales).

export function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h2 className="mb-3 mt-8 text-sm font-semibold first:mt-0">{children}</h2>;
}

export function FieldLabel({ children }) {
  return (
    <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}

export function FieldNote({ children }) {
  return (
    <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {children}
    </div>
  );
}

export function Button({ children, variant = "default", className = "", ...props }) {
  const base = "rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-slate-900 text-white hover:opacity-90 dark:bg-white dark:text-slate-900",
    accent: "bg-emerald-600 text-white hover:opacity-90",
    ghost: "border border-slate-300 text-slate-600 hover:border-slate-500 dark:border-slate-700 dark:text-slate-300",
    dangerText: "text-slate-400 hover:text-red-600 px-2",
    small: "px-3 py-1.5 text-xs",
  };
  return (
    <button className={`${base} ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`min-w-[120px] flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 ${props.className || ""}`}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`min-w-[120px] flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 ${props.className || ""}`}
    >
      {children}
    </select>
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`w-full min-h-[42px] rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 ${props.className || ""}`}
    />
  );
}

export function Row({ children, className = "" }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}

export function CheckPill({ checked, onChange, children }) {
  return (
    <label
      className={`flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
        checked
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
          : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-emerald-600" />
      {children}
    </label>
  );
}

export function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        selected
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

export function ScaleRow({ value, onChange, max = 5 }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-lg border font-semibold ${
            value === n
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
      {children}
    </div>
  );
}

export function Tag({ children }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800">
      {children}
    </span>
  );
}

export function LogItem({ date, children, onDelete }) {
  return (
    <div className="flex gap-4 border-b border-slate-200 py-3 last:border-0 dark:border-slate-800">
      <div className="w-20 shrink-0 pt-0.5 font-mono text-[11.5px] text-slate-400">{date}</div>
      <div className="min-w-0 flex-1">{children}</div>
      {onDelete && (
        <Button variant="dangerText" onClick={onDelete}>
          remove
        </Button>
      )}
    </div>
  );
}

export function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Local calendar date (not UTC), so entries made just after midnight in IST
// land on the right day.
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
