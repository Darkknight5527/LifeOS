// Blood work: your lab reports, each value checked against its normal range,
// and how any one test has moved over time.
import { useMemo, useState } from "react";
import { EmptyState, FinCard, Icon, PrimaryButton, Sheet } from "../../finances/fin-ui.jsx";
import { useFit } from "../FitContext.jsx";
import { useHealth } from "./HealthContext.jsx";
import { FLAG, GROUPS, TEST, TESTS, flagOf, rangeOf, rangeText, seriesOf, todayISO } from "./lib";
import { AddButton, DeleteButton, Field, Input, Select, shortDate } from "./ui.jsx";

export function LabsView() {
  const h = useHealth();
  const sex = useFit()?.settings?.profile?.sex;
  const reports = useMemo(() => [...h.reports].sort((a, b) => b.date.localeCompare(a.date)), [h.reports]);
  const [selId, setSelId] = useState(null);
  const sel = reports.find((r) => r._id === selId) || reports[0];
  const [test, setTest] = useState(null);
  const [edit, setEdit] = useState(null);
  const tested = useMemo(() => {
    const keys = new Map();
    for (const r of reports) for (const x of r.results || []) if (!keys.has(x.key)) keys.set(x.key, x.name || TEST[x.key]?.name || x.key);
    return [...keys.entries()].map(([value, label]) => ({ value, label }));
  }, [reports]);
  const shownTest = test && tested.some((t) => t.value === test) ? test : sel?.results?.find((x) => flagOf(x, sex) === "high" || flagOf(x, sex) === "low")?.key || sel?.results?.[0]?.key;

  if (!reports.length) {
    return (
      <>
        <FinCard title="Blood work" action={<AddButton onClick={() => setEdit({ date: todayISO(), lab: "", title: "", results: [], planId: "", notes: "" })} label="Add report">Add report</AddButton>}>
          <EmptyState icon="drop">Add a blood test report: pick the panels you had (sugar, lipids, thyroid…) and type in the numbers. LifeOS marks anything outside the normal range and shows how each value changes over time.</EmptyState>
        </FinCard>
        <ReportSheet report={edit} onClose={() => setEdit(null)} sex={sex} />
      </>
    );
  }

  const flagged = (sel?.results || []).filter((x) => ["high", "low"].includes(flagOf(x, sex)));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
      <FinCard className="lg:h-[calc(100dvh-178px)] lg:overflow-y-auto" title="Blood work reports" action={<AddButton onClick={() => setEdit({ date: todayISO(), lab: "", title: "", results: [], planId: "", notes: "" })} label="Add report">Add</AddButton>}>
        <div className="space-y-1.5">
          {reports.map((r) => {
            const bad = (r.results || []).filter((x) => ["high", "low"].includes(flagOf(x, sex))).length;
            const on = r._id === sel?._id;
            return (
              <button key={r._id} onClick={() => setSelId(r._id)} className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition ${on ? "bg-fin-accent/15 ring-1 ring-fin-accent/40" : "bg-fin-input hover:bg-fin-tile"}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">{r.title || "Blood test"}</span>
                  <span className="block truncate text-[12.5px] text-fin-muted">{[shortDate(r.date), r.lab, `${r.results?.length || 0} values`].filter(Boolean).join(" · ")}</span>
                </span>
                {bad > 0 ? <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[12px] font-bold text-red-300">{bad} off</span> : <Icon name="check" size={16} className="shrink-0 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </FinCard>

      <FinCard
        className="lg:h-[calc(100dvh-178px)] lg:overflow-y-auto"
        title={sel ? `${sel.title || "Blood test"} · ${shortDate(sel.date)}` : "Report"}
        action={sel && <button onClick={() => setEdit(sel)} className="rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold text-white/85 hover:text-white">Edit</button>}
      >
        {sel && (
          <>
            <div className={`mb-3 rounded-2xl px-3.5 py-2.5 text-[13.5px] ${flagged.length ? "bg-red-500/10 text-red-200" : "bg-emerald-400/10 text-emerald-200"}`}>
              {flagged.length ? `${flagged.length} of ${sel.results.length} outside the normal range: ${flagged.map((x) => x.name || TEST[x.key]?.name).join(", ")}` : `All ${sel.results.length} values in the normal range.`}
            </div>
            <ResultsTable results={sel.results} sex={sex} active={shownTest} onPick={setTest} />
            {sel.notes && <div className="mt-3 rounded-2xl bg-fin-input px-3.5 py-2.5 text-[13px] text-white/80">{sel.notes}</div>}
          </>
        )}
      </FinCard>

      <FinCard className="lg:h-[calc(100dvh-178px)] lg:overflow-y-auto" title="Over time">
        {tested.length > 0 && <Select value={shownTest || ""} onChange={setTest} options={tested} aria-label="Test to chart" />}
        {shownTest && <Trend reports={reports} k={shownTest} sex={sex} />}
      </FinCard>
      <ReportSheet report={edit} onClose={() => setEdit(null)} sex={sex} onSaved={(d) => d && setSelId(d._id)} />
    </div>
  );
}

function ResultsTable({ results, sex, active, onPick }) {
  // Grouped the way lab reports are (sugar, lipids, liver…), anything custom at the end.
  const groups = [...GROUPS, "Other"].map((g) => [g, results.filter((x) => (TEST[x.key]?.group || "Other") === g)]).filter(([, l]) => l.length);
  return (
    <div className="space-y-3">
      {groups.map(([g, list]) => (
        <div key={g}>
          <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-fin-faint">{g}</div>
          <div className="space-y-1">
            {list.map((x, i) => {
              const fl = flagOf(x, sex);
              const range = rangeOf(x, sex);
              return (
                <button key={`${x.key}-${i}`} onClick={() => onPick(x.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${active === x.key ? "bg-fin-tile" : "bg-fin-input hover:bg-fin-tile"}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{x.name || TEST[x.key]?.name}</span>
                    <span className="block truncate text-[11.5px] text-fin-faint">{rangeText(range) ? `Normal ${rangeText(range)}${range.own ? " (lab)" : ""}` : "No range"}</span>
                  </span>
                  <span className="tabular shrink-0 text-right">
                    <span className="text-[15px] font-bold" style={{ color: fl && fl !== "ok" ? FLAG[fl].color : undefined }}>{x.value}</span>
                    <span className="ml-1 text-[11.5px] text-fin-muted">{x.unit}</span>
                  </span>
                  {fl && <span className="w-14 shrink-0 rounded-full py-0.5 text-center text-[11px] font-bold" style={{ background: `${FLAG[fl].color}22`, color: FLAG[fl].color }}>{FLAG[fl].label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** One test over time, with the normal range shaded. */
function Trend({ reports, k, sex }) {
  const s = seriesOf(reports, k);
  if (!s.length) return null;
  const last = s[s.length - 1];
  const range = rangeOf(last.r, sex);
  const t = TEST[k];
  const vals = s.map((p) => p.value);
  const lims = [range.low, range.high].filter((v) => v != null);
  let lo = Math.min(...vals, ...lims);
  let hi = Math.max(...vals, ...lims);
  if (lo === hi) (lo -= 1), (hi += 1);
  const pad = (hi - lo) * 0.15;
  lo -= pad;
  hi += pad;
  const W = 300;
  const H = 150;
  const X = (i) => (s.length === 1 ? W / 2 : 14 + (i / (s.length - 1)) * (W - 28));
  const Y = (v) => H - ((v - lo) / (hi - lo)) * H;
  const bandTop = Y(range.high ?? hi);
  const bandBot = Y(range.low ?? lo);
  const change = s.length > 1 ? Math.round((last.value - s[s.length - 2].value) * 100) / 100 : null;
  return (
    <div className="mt-3">
      <div className="flex items-baseline gap-2">
        <span className="tabular text-[30px] font-extrabold leading-none" style={{ color: FLAG[flagOf(last.r, sex)]?.color }}>{last.value}</span>
        <span className="text-[13px] text-fin-muted">{last.r.unit || t?.unit}</span>
        {change != null && <span className="tabular ml-auto text-[13px] text-fin-muted">{change > 0 ? "+" : ""}{change} since {shortDate(s[s.length - 2].date)}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="mt-3 w-full" role="img" aria-label={`${t?.name || k} over ${s.length} reports`}>
        {(range.low != null || range.high != null) && <rect x="0" width={W} y={bandTop} height={Math.max(0, bandBot - bandTop)} fill="rgba(52,211,153,.10)" />}
        {range.high != null && <line x1="0" x2={W} y1={Y(range.high)} y2={Y(range.high)} stroke="rgba(52,211,153,.4)" strokeDasharray="4 4" />}
        {range.low != null && <line x1="0" x2={W} y1={Y(range.low)} y2={Y(range.low)} stroke="rgba(52,211,153,.4)" strokeDasharray="4 4" />}
        {s.length > 1 && <polyline points={s.map((p, i) => `${X(i)},${Y(p.value)}`).join(" ")} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" />}
        {s.map((p, i) => (
          <g key={i}>
            <circle cx={X(i)} cy={Y(p.value)} r="5" fill={FLAG[flagOf(p.r, sex)]?.color || "#9ca3af"} />
            {(s.length <= 6 || i === 0 || i === s.length - 1) && <text x={X(i)} y={H + 14} textAnchor={i === 0 && s.length > 1 ? "start" : i === s.length - 1 && s.length > 1 ? "end" : "middle"} fontSize="10" fill="rgba(255,255,255,.4)">{shortDate(p.date)}</text>}
          </g>
        ))}
      </svg>
      <div className="mt-2 text-[12px] text-fin-muted">{rangeText(range) ? `Shaded: normal range ${rangeText(range)} ${last.r.unit || t?.unit || ""}` : "No normal range for this one."}</div>
      {t?.note && <div className="mt-1 text-[12px] text-fin-faint">{t.note}</div>}
      <div className="mt-3 space-y-1">
        {[...s].reverse().map((p, i) => (
          <div key={i} className="flex justify-between text-[13px]"><span className="text-fin-muted">{shortDate(p.date)}</span><span className="tabular font-semibold" style={{ color: FLAG[flagOf(p.r, sex)]?.color }}>{p.value}</span></div>
        ))}
      </div>
    </div>
  );
}

function ReportSheet({ report, onClose, sex, onSaved }) {
  const h = useHealth();
  const [f, setF] = useState(null);
  const [key, setKey] = useState(null);
  const [own, setOwn] = useState(false); // show the lab-range columns
  if (report && key !== (report._id || "new")) {
    setKey(report._id || "new");
    setF({ ...report, results: (report.results || []).map((x) => ({ ...x })) });
    setOwn((report.results || []).some((x) => x.low !== "" && x.low != null || (x.high !== "" && x.high != null)));
  }
  if (!report && key) setKey(null);
  if (!f) return null;
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const has = new Set(f.results.map((x) => x.key));
  const addTests = (keys) => set({ results: [...f.results, ...keys.filter((k) => !has.has(k)).map((k) => ({ key: k, name: TEST[k].name, value: "", unit: TEST[k].unit, low: "", high: "" }))] });
  const setRow = (i, patch) => set({ results: f.results.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const save = async () => {
    const results = f.results
      .filter((x) => String(x.value).trim() !== "" && (x.name || TEST[x.key]))
      .map((x) => ({ key: x.key, name: (x.name || TEST[x.key]?.name || "").trim(), value: String(x.value).trim(), unit: (x.unit || "").trim(), low: x.low === "" ? "" : Number(x.low), high: x.high === "" ? "" : Number(x.high) }));
    const body = { date: f.date, lab: f.lab.trim(), title: f.title.trim(), results, planId: f.planId || "", notes: f.notes || "" };
    const doc = report._id ? await h.update("reports", report._id, body, "Report saved") : await h.create("reports", body, "Report added");
    onSaved?.(doc);
    onClose();
  };
  const filled = f.results.filter((x) => String(x.value).trim() !== "").length;
  return (
    <Sheet
      open={Boolean(report)}
      onClose={onClose}
      wide
      title={report?._id ? "Edit report" : "Add a blood test report"}
      footer={
        <>
          {report?._id && <DeleteButton onDelete={() => (h.remove("reports", report._id, "Deleted"), onClose())} />}
          <PrimaryButton className="flex-1" onClick={save} disabled={!f.date || !filled}>Save {filled ? `${filled} value${filled === 1 ? "" : "s"}` : ""}</PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Field label="Date"><Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} /></Field>
        <Field label="Name"><Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Annual check-up" maxLength={80} /></Field>
        <Field label="Lab"><Input value={f.lab} onChange={(e) => set({ lab: e.target.value })} placeholder="e.g. Thyrocare" maxLength={60} /></Field>
        <Field label="Counts as"><Select value={f.planId} onChange={(planId) => set({ planId })} options={[{ value: "", label: "—" }, ...h.plans.map((p) => ({ value: p._id, label: p.title }))]} /></Field>
      </div>

      <div className="mt-4 text-[12.5px] text-fin-muted">Add the panels you had, then type the values</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {GROUPS.map((g) => {
          const keys = TESTS.filter((t) => t.group === g).map((t) => t.key);
          const all = keys.every((k) => has.has(k));
          return (
            <button key={g} type="button" disabled={all} onClick={() => addTests(keys)} className="rounded-full bg-fin-tile px-3 py-1.5 text-[13px] font-semibold text-white/80 hover:text-white disabled:opacity-35">
              {all ? "✓" : "+"} {g}
            </button>
          );
        })}
        <select value="" onChange={(e) => e.target.value && (e.target.value === "__custom" ? set({ results: [...f.results, { key: `c-${Date.now().toString(36)}`, name: "", value: "", unit: "", low: "", high: "" }] }) : addTests([e.target.value]))} className="rounded-full bg-fin-tile px-3 py-1.5 text-[13px] font-semibold text-white/80 outline-none [color-scheme:dark]" aria-label="Add one test">
          <option value="">+ One test…</option>
          {TESTS.filter((t) => !has.has(t.key)).map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
          <option value="__custom">Something else (type the name)</option>
        </select>
      </div>

      {f.results.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] text-fin-faint">Leave a value empty to skip it.</span>
            <label className="flex items-center gap-1.5 text-[12.5px] text-fin-muted">
              <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} className="accent-[rgb(var(--fin-accent))]" /> My lab's ranges
            </label>
          </div>
          <div className="space-y-1.5">
            {f.results.map((x, i) => {
              const custom = !TEST[x.key];
              const fl = flagOf(x, sex);
              const range = rangeOf(x, sex);
              return (
                <div key={x.key} className={`grid items-center gap-2 rounded-xl bg-fin-input px-3 py-2 ${own ? "grid-cols-[1fr_64px_52px_52px_28px] md:grid-cols-[1fr_100px_70px_70px_70px_32px]" : "grid-cols-[1fr_100px_32px] md:grid-cols-[1fr_110px_80px_110px_32px]"}`}>
                  {custom ? (
                    <input value={x.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Test name" className="min-w-0 bg-transparent text-[14px] font-semibold text-white outline-none placeholder:text-fin-faint" aria-label="Test name" />
                  ) : (
                    <span className="min-w-0 truncate text-[14px] font-semibold">{x.name || TEST[x.key].name}</span>
                  )}
                  <input inputMode="decimal" value={x.value} onChange={(e) => setRow(i, { value: e.target.value.replace(/[^\d.<>]/g, "").slice(0, 10) })} placeholder="value" className="tabular w-full rounded-lg bg-fin-tile px-2 py-1.5 text-right text-[15px] font-bold outline-none focus:ring-2 focus:ring-fin-accent/50" style={{ color: fl && fl !== "ok" ? FLAG[fl].color : undefined }} aria-label={`${x.name || TEST[x.key]?.name} value`} />
                  <input value={x.unit} onChange={(e) => setRow(i, { unit: e.target.value })} placeholder="unit" className="hidden w-full min-w-0 bg-transparent text-[12.5px] text-fin-muted outline-none md:block" aria-label="Unit" />
                  {own ? (
                    <>
                      <input inputMode="decimal" value={x.low ?? ""} onChange={(e) => setRow(i, { low: e.target.value.replace(/[^\d.]/g, "") })} placeholder={range.own ? "" : String(TEST[x.key]?.low ?? "low")} className="w-full min-w-0 rounded-lg bg-fin-tile px-2 py-1.5 text-[13px] outline-none md:block" aria-label="Lab range low" />
                      <input inputMode="decimal" value={x.high ?? ""} onChange={(e) => setRow(i, { high: e.target.value.replace(/[^\d.]/g, "") })} placeholder={range.own ? "" : String(TEST[x.key]?.high ?? "high")} className="w-full min-w-0 rounded-lg bg-fin-tile px-2 py-1.5 text-[13px] outline-none md:block" aria-label="Lab range high" />
                    </>
                  ) : (
                    <span className="hidden truncate text-[12px] text-fin-faint md:block">{rangeText(range) || "—"}</span>
                  )}
                  <button type="button" onClick={() => set({ results: f.results.filter((_, j) => j !== i) })} className="grid h-8 w-8 place-items-center rounded-lg text-fin-faint hover:text-white" aria-label="Remove test"><Icon name="close" size={14} /></button>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-[11.5px] leading-relaxed text-fin-faint">Normal ranges are typical adult values{sex ? ` for ${sex === "female" ? "women" : "men"}` : ""}; labs differ a little — tick "My lab's ranges" to use the ones printed on your report. This isn't a diagnosis; talk to your doctor about anything marked.</div>
        </div>
      )}
      <Field label="Notes" className="mt-4"><Input value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Fasting? Doctor's comments…" maxLength={500} /></Field>
    </Sheet>
  );
}
