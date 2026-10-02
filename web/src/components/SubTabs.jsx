// Pill-style sub-tabs used by the light-themed domain pages.
export default function SubTabs({ tabs, value, onChange, color = "emerald" }) {
  const active = {
    emerald: "border-emerald-600 bg-emerald-600 text-white",
    sky: "border-sky-600 bg-sky-600 text-white",
  }[color];
  return (
    <div className="mb-6 flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
            value === t.id ? active : "border-slate-300 bg-white text-slate-500 hover:border-slate-400"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
