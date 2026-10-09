// Train → History: calendar of past workouts, edit / repeat, CSV export and FitNotes import.
import { useEffect, useMemo, useState } from "react";
import { useFit } from "../FitContext.jsx";
import { SPLITS, parseISO, prettyDate, todayISO, working } from "../lib";
import { daysInMonth, monthKey, monthLabel, shiftMonth } from "../../finances/lib";
import { FinCard, Icon, IconButton, PrimaryButton, Sheet } from "../../finances/fin-ui.jsx";
import { useToast } from "../../../components/Toast.jsx";
import { fromFitNotes } from "../fitnotes.js";
import { saveFile } from "../../../lib/inApp.js";
import { kg, makeSession, openSessionLater, setLabel, useExerciseHistory, usePRSets, volumeOf } from "./shared.jsx";

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function exportCSV(sessions) {
  const rows = [["Date", "Workout", "Exercise", "Set", "Warm-up", "Weight (kg)", "Reps", "Time (s)", "Distance (km)", "RPE", "Note"]];
  for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date)))
    for (const e of s.exercises || []) (e.sets || []).forEach((x, i) => rows.push([s.date, s.splitDay || "", e.exercise, i + 1, x.warmup ? "yes" : "", x.weight || 0, x.reps || 0, x.time || 0, x.distance || 0, x.rpe ?? "", (x.note || e.note || "").replace(/"/g, "'")]));
  const csv = rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${v}"` : v)).join(",")).join("\n");
  saveFile(new Blob([csv], { type: "text/csv" }), `lifeos-workouts-${todayISO()}.csv`);
}

export function TrainHistory({ onOpenSession }) {
  const fit = useFit();
  const history = useExerciseHistory();
  const prSets = usePRSets();
  const customs = fit.settings?.customExercises || [];
  const today = todayISO();
  const [month, setMonth] = useState(monthKey());
  const [selected, setSelected] = useState(fit.sessions[0]?.date || today);
  const byDate = useMemo(() => {
    const m = {};
    for (const s of fit.sessions) (m[s.date] ||= { s: [], c: [] }).s.push(s);
    for (const c of fit.cardio) (m[c.date] ||= { s: [], c: [] }).c.push(c);
    return m;
  }, [fit.sessions, fit.cardio]);
  const cells = useMemo(() => {
    const lead = (parseISO(`${month}-01`).getDay() + 6) % 7;
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth(month); d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    return out;
  }, [month]);
  const day = byDate[selected] || { s: [], c: [] };
  const monthCount = fit.sessions.filter((s) => s.date.startsWith(month)).length;
  const [importing, setImporting] = useState(false);
  const splitId = (label) => SPLITS.find((x) => x.label === label)?.id || "push";
  const open = (s, edit) => {
    openSessionLater(makeSession({ split: splitId(s.splitDay), list: [], history, customs, date: edit ? s.date : todayISO(), fromSession: s, editingId: edit ? s._id : null }));
    onOpenSession?.();
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(340px,420px)_1fr] lg:gap-4 [&>*]:min-w-0">
      <FinCard
        title={
          <label className="relative flex cursor-pointer items-center gap-1 rounded-lg hover:text-fin-accent" title="Jump to a month">
            {monthLabel(month)}
            <Icon name="down" size={14} />
            <input
              type="month"
              aria-label="Jump to month"
              value={month}
              max={monthKey()}
              onClick={(e) => e.currentTarget.showPicker?.()}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        }
        action={
          <div className="flex items-center">
            <button onClick={() => setImporting(true)} className="mr-1 rounded-lg bg-fin-accent/15 px-2.5 py-1 text-[12.5px] font-semibold text-fin-accent hover:bg-fin-accent/25" title="Bring in workouts from a FitNotes export">
              Import
            </button>
            <button onClick={() => exportCSV(fit.sessions)} className="mr-1 rounded-lg bg-fin-tile px-2.5 py-1 text-[12.5px] font-semibold text-white/80 hover:text-white" title="Download all workouts as a CSV file">
              Export
            </button>
            <IconButton icon="left" label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))} />
            <IconButton icon="right" label="Next month" onClick={() => setMonth((m) => shiftMonth(m, 1))} className={month >= monthKey() ? "pointer-events-none opacity-25" : ""} />
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11.5px] font-semibold text-fin-faint">{WEEK.map((w) => <div key={w}>{w}</div>)}</div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`b${i}`} />;
            const e = byDate[iso];
            const sp = e?.s[0] && SPLITS.find((x) => x.label === e.s[0].splitDay);
            const future = iso > today;
            return (
              <button
                key={iso}
                disabled={future}
                onClick={() => setSelected(iso)}
                className={`relative aspect-square rounded-xl text-[13px] font-semibold transition ${future ? "opacity-25" : "hover:ring-1 hover:ring-white/20"} ${selected === iso ? "ring-2 ring-white" : iso === today ? "ring-1 ring-fin-accent" : ""}`}
                style={{ background: e?.s.length ? `${sp?.color || "#60a5fa"}cc` : "#121215", color: e?.s.length ? "#0b1220" : undefined }}
              >
                {Number(iso.slice(8))}
                {e?.c.length > 0 && <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#fbbf24]" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-fin-muted">
          <span>{monthCount} workout{monthCount === 1 ? "" : "s"} this month</span>
          <span className="flex items-center gap-2">
            {SPLITS.filter((s) => s.id !== "rest").map((s) => (
              <span key={s.id} className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.label}</span>
            ))}
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#fbbf24]" />Cardio</span>
          </span>
        </div>
      </FinCard>

      <div className="space-y-4">
        <div className="text-[20px] font-bold">{prettyDate(selected, { weekday: "long", day: "numeric", month: "long" })}</div>
        {!day.s.length && !day.c.length && <div className="rounded-[22px] bg-fin-card p-6 text-center text-[14px] text-fin-muted">No training logged on this day.</div>}
        <div className="fin-scroll grid grid-cols-1 gap-4 lg:max-h-[calc(100dvh-230px)] lg:overflow-y-auto lg:pr-1 xl:grid-cols-2">
          {day.s.map((s) => (
            <FinCard
              key={s._id}
              title={`${s.splitDay || "Workout"}${s.duration ? ` · ${s.duration} min` : ""}`}
              action={
                <div className="flex items-center gap-1">
                  <button onClick={() => open(s, false)} className="rounded-lg bg-fin-tile px-2.5 py-1 text-[12.5px] font-semibold hover:bg-[#30303a]" title="Start a new workout with these exercises">Repeat</button>
                  <button onClick={() => open(s, true)} className="rounded-lg bg-fin-tile px-2.5 py-1 text-[12.5px] font-semibold hover:bg-[#30303a]">Edit</button>
                  <IconButton icon="trash" label="Delete workout" onClick={() => fit.sessionOps.remove(s)} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />
                </div>
              }
            >
              <div className="mb-2 text-[13px] text-fin-muted">{kg(volumeOf(s))} lifted · {(s.exercises || []).reduce((a, e) => a + working(e.sets).length, 0)} working sets</div>
              {s.notes === IMPORTED ? (
                <div className="mb-2 text-[12px] text-fin-faint">Imported from FitNotes</div>
              ) : (
                s.notes && <div className="mb-2 rounded-xl bg-fin-input px-3 py-2 text-[13px] italic text-white/75">“{s.notes}”</div>
              )}
              <div className="space-y-2">
                {(s.exercises || []).map((e, i) => (
                  <div key={i} className={`rounded-2xl bg-fin-input px-3 py-2 ${e.superset ? "border-l-2 border-amber-300/60" : ""}`}>
                    <div className="flex items-center gap-2 text-[14.5px] font-semibold">
                      {e.superset && <span className="rounded bg-amber-300/15 px-1 text-[10.5px] font-bold text-amber-300">SS {e.superset}</span>}
                      {e.exercise}
                    </div>
                    <div className="tabular mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[13px] text-fin-muted">
                      {e.sets.map((x, j) => (
                        <span key={j} className={x.warmup ? "text-amber-300/80" : prSets.has(`${s._id}|${e.exercise}|${j}`) ? "font-semibold text-fin-accent" : ""} title={x.note || undefined}>
                          {x.warmup ? "W " : prSets.has(`${s._id}|${e.exercise}|${j}`) ? "🏆 " : ""}
                          {setLabel(x, e.type || "weight_reps")}
                          {x.rpe ? ` @${x.rpe}` : ""}
                          {x.note ? " ✎" : ""}
                        </span>
                      ))}
                    </div>
                    {e.note && <div className="mt-0.5 text-[12px] text-fin-faint">{e.note}</div>}
                  </div>
                ))}
              </div>
            </FinCard>
          ))}
          {day.c.map((c) => (
            <FinCard key={c._id} title={c.activity} action={<IconButton icon="trash" label="Delete" onClick={() => fit.cardioOps.remove(c)} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />}>
              <div className="text-[15px]">
                {c.duration} min{c.distance ? ` · ${c.distance} km` : ""}{c.calories ? ` · ${c.calories} kcal` : ""}
              </div>
            </FinCard>
          ))}
        </div>
      </div>
      <ImportSheet
        open={importing}
        onClose={() => setImporting(false)}
        onDone={(last) => {
          if (last) {
            setMonth(last.slice(0, 7));
            setSelected(last);
          }
        }}
      />
    </div>
  );
}

const IMPORTED = "Imported from FitNotes";

// Pick a FitNotes CSV → preview → import. Days already in LifeOS are skipped,
// so importing a newer export later only adds what's new.
function ImportSheet({ open, onClose, onDone }) {
  const fit = useFit();
  const showToast = useToast();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  const [fileName, setFileName] = useState("");
  useEffect(() => {
    if (open) {
      setPlan(null);
      setError("");
      setProgress(null);
      setFileName("");
    }
  }, [open]);

  async function pick(file) {
    if (!file) return;
    setFileName(file.name);
    setError("");
    setPlan(null);
    try {
      const text = await file.text();
      setPlan(fromFitNotes(text, { sessions: fit.sessions, cardio: fit.cardio, customs: fit.settings?.customExercises || [] }));
    } catch (e) {
      setError(e.message || "Couldn't read that file");
    }
  }
  async function run() {
    setProgress(0);
    try {
      const made = await fit.importData(plan, setProgress);
      showToast(`Imported ${made.sessions.length} workouts${made.cardio.length ? ` and ${made.cardio.length} cardio` : ""}`);
      onDone?.(plan.sessions[plan.sessions.length - 1]?.date);
      onClose();
    } catch (e) {
      setError(`${e.message || "Import failed"} — anything saved so far is kept; import the same file again to finish.`);
      setProgress(null);
    }
  }
  const busy = progress != null;
  const nothing = plan && !plan.sessions.length && !plan.cardio.length;
  return (
    <Sheet
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Import from FitNotes"
      footer={
        <PrimaryButton className="flex-1" disabled={!plan || nothing || busy} onClick={run}>
          {busy ? `Importing… ${Math.round(progress * 100)}%` : plan && !nothing ? `Import ${plan.sessions.length} workouts` : "Import"}
        </PrimaryButton>
      }
    >
      <div className="text-[14px] leading-relaxed text-fin-muted">
        In FitNotes: <b className="text-white/85">Settings → Spreadsheet Export → Export Workouts</b>, then choose that .csv file here.
      </div>
      <label className={`mt-4 flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-white/10 px-4 py-6 text-center transition hover:border-fin-accent/60 ${busy ? "pointer-events-none opacity-50" : ""}`}>
        <Icon name="upload" size={22} />
        <span className="text-[14.5px] font-semibold">{fileName || "Choose FitNotes CSV"}</span>
        <span className="text-[12px] text-fin-faint">Stays on your device until you press Import</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {error && <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-fin-danger">{error}</div>}
      {plan && (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Workouts", plan.sessions.length],
              ["Sets", plan.stats.sets.toLocaleString("en-IN")],
              ["Exercises", plan.stats.exercises],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-fin-input px-3 py-2.5 text-center">
                <div className="text-[12px] text-fin-muted">{k}</div>
                <div className="tabular text-[18px] font-extrabold">{v}</div>
              </div>
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-[13.5px] text-fin-muted">
            <li>{prettyDate(plan.stats.from, { day: "numeric", month: "short", year: "numeric" })} → {prettyDate(plan.stats.to, { day: "numeric", month: "short", year: "numeric" })}</li>
            {plan.cardio.length > 0 && <li>{plan.cardio.length} cardio entries (walks, runs)</li>}
            {plan.customs.length > 0 && <li>{plan.customs.length} exercises added to My exercises (e.g. {plan.customs.slice(0, 3).map((c) => c.exercise).join(", ")})</li>}
            {plan.stats.skipped > 0 && <li>{plan.stats.skipped} day{plan.stats.skipped === 1 ? "" : "s"} already in LifeOS — skipped</li>}
            <li>Names like "Barbell Squat" are matched to LifeOS's "Squat", so your plan shows your old numbers.</li>
          </ul>
          {nothing && <div className="mt-3 text-[14px] font-semibold text-white/85">Everything in this file is already in LifeOS.</div>}
          {busy && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-fin-input">
              <div className="h-full rounded-full bg-fin-accent transition-all" style={{ width: `${Math.max(4, progress * 100)}%` }} />
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */
