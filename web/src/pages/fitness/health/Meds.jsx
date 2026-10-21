// Medicines & supplements: what you take, when, and how many are left.
// Ticking doses happens on Today; this is the list and the editor.
import { useMemo, useState } from "react";
import { EmptyState, FinCard, Icon, PrimaryButton, Sheet } from "../../finances/fin-ui.jsx";
import { addDays, isoDate, parseISO } from "../lib";
import { useHealth } from "./HealthContext.jsx";
import { FOOD, FORMS, WEEK, adherence, dosesFor, onDay, scheduleText, todayISO } from "./lib";
import { AddButton, Area, Chips, DeleteButton, Field, Input, Select, shortDate } from "./ui.jsx";

const BLANK = { name: "", dose: "", form: "tablet", kind: "medicine", purpose: "", issueId: "", times: ["08:00"], days: [], food: "", start: "", end: "", active: true, stock: null, prescribedBy: "", notes: "" };
const lowStock = (m) => m.stock != null && m.active && (m.times?.length ? m.stock <= m.times.length * 5 : m.stock <= 3);

export function MedsView() {
  const h = useHealth();
  const [edit, setEdit] = useState(null); // medicine doc or BLANK
  const today = todayISO();
  const current = h.meds.filter((m) => m.active && !(m.end && m.end < today));
  const past = h.meds.filter((m) => !current.includes(m));
  const week = adherence(current, h.logs, 7);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <FinCard className="lg:col-span-2 lg:h-[calc(100dvh-178px)] lg:overflow-y-auto" title="Taking now" action={<AddButton onClick={() => setEdit(BLANK)} label="Add medicine">Add</AddButton>}>
        {!current.length ? (
          <EmptyState icon="clipboard">Add a medicine or supplement — its doses then show on Today for you to tick, and the phone app can remind you.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 items-start gap-2.5 xl:grid-cols-2">
            {current.map((m) => (
              <MedCard key={m._id} m={m} logs={h.logs} issue={h.issues.find((i) => i._id === m.issueId)} onOpen={() => setEdit(m)} />
            ))}
          </div>
        )}
      </FinCard>
      <div className="flex flex-col gap-4">
        <FinCard title="Last 7 days">
          {week ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="tabular text-[34px] font-extrabold leading-none">{week.pct}%</span>
                <span className="text-[13.5px] text-fin-muted">of doses taken</span>
              </div>
              <div className="mt-1 text-[13px] text-fin-muted">{week.taken} of {week.due} scheduled doses</div>
            </>
          ) : (
            <div className="text-[13.5px] text-fin-muted">Nothing scheduled yet.</div>
          )}
        </FinCard>
        {past.length > 0 && (
          <FinCard title="Stopped / finished">
            <div className="space-y-1.5">
              {past.map((m) => (
                <button key={m._id} onClick={() => setEdit(m)} className="flex w-full items-center justify-between gap-2 rounded-xl bg-fin-input px-3 py-2 text-left hover:bg-fin-tile">
                  <span className="min-w-0 truncate text-[14px] text-white/75">{m.name} {m.dose && <span className="text-fin-faint">· {m.dose}</span>}</span>
                  <span className="shrink-0 text-[12px] text-fin-faint">{m.end ? `until ${shortDate(m.end)}` : "stopped"}</span>
                </button>
              ))}
            </div>
          </FinCard>
        )}
      </div>
      <MedSheet med={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function MedCard({ m, logs, issue, onOpen }) {
  // Last 14 days: a dot per day (all taken / some / none / not scheduled).
  const byDate = useMemo(() => Object.fromEntries(logs.map((l) => [l.date, l])), [logs]);
  const days = Array.from({ length: 14 }, (_, i) => isoDate(addDays(parseISO(todayISO()), i - 13)));
  return (
    <button onClick={onOpen} className="rounded-2xl bg-fin-input p-3.5 text-left transition hover:bg-fin-tile">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fin-accent/15 text-fin-accent">
          <Icon name={m.kind === "supplement" ? "sparkle" : "clipboard"} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-bold">{m.name}</span>
          <span className="block truncate text-[13px] text-fin-muted">{[m.dose, m.form !== "other" && m.form, FOOD.find((f) => f.value === m.food && f.value)?.label?.toLowerCase()].filter(Boolean).join(" · ")}</span>
        </span>
        {lowStock(m) && <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11.5px] font-semibold text-amber-300">Refill soon</span>}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-white/80">
        <Icon name="clock" size={13} className="shrink-0 text-fin-muted" />
        <span className="truncate">{scheduleText(m)}</span>
      </div>
      {(issue || m.purpose || m.stock != null) && (
        <div className="mt-1 truncate text-[12.5px] text-fin-muted">
          {[issue ? `For ${issue.name}` : m.purpose, m.stock != null ? `${m.stock} left` : ""].filter(Boolean).join(" · ")}
        </div>
      )}
      {m.times?.length > 0 && (
        <div className="mt-2.5 flex gap-1" aria-label="Last 14 days">
          {days.map((iso) => {
            const ds = dosesFor([m], byDate[iso], iso);
            const taken = ds.filter((d) => d.state === "taken").length;
            const c = !onDay(m, iso) ? "bg-white/5" : taken === ds.length ? "bg-emerald-400" : taken ? "bg-amber-400" : iso === todayISO() ? "bg-white/20" : "bg-red-400/60";
            return <span key={iso} title={`${shortDate(iso)}: ${onDay(m, iso) ? `${taken}/${ds.length}` : "not scheduled"}`} className={`h-2 flex-1 rounded-full ${c}`} />;
          })}
        </div>
      )}
    </button>
  );
}

function MedSheet({ med, onClose }) {
  const h = useHealth();
  const [f, setF] = useState(BLANK);
  const [key, setKey] = useState(null);
  if (med && key !== (med._id || "new")) {
    setKey(med._id || "new");
    setF({ ...BLANK, ...med, times: [...(med.times || [])], days: [...(med.days || [])] });
  }
  if (!med && key) setKey(null);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const asNeeded = !f.times.length;
  const save = async () => {
    const body = { ...f, name: f.name.trim(), times: [...new Set(f.times.filter(Boolean))].sort(), stock: f.stock === "" || f.stock == null ? null : Math.max(0, Math.round(Number(f.stock))) };
    delete body._id;
    if (med?._id) await h.update("meds", med._id, body, "Saved");
    else await h.create("meds", body, `${body.name} added`);
    onClose();
  };
  const toggleDay = (d) => set({ days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort() });

  return (
    <Sheet
      open={Boolean(med)}
      onClose={onClose}
      title={med?._id ? "Edit medicine" : "Add medicine"}
      footer={
        <>
          {med?._id && <DeleteButton onDelete={() => (h.remove("meds", med._id, "Deleted"), onClose())} />}
          <PrimaryButton className="flex-1" onClick={save} disabled={!f.name.trim()}>Save</PrimaryButton>
        </>
      }
    >
      <div className="space-y-3.5">
        <Chips label="Type" value={f.kind} onChange={(kind) => set({ kind })} options={[{ value: "medicine", label: "Medicine" }, { value: "supplement", label: "Supplement" }]} />
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <Field label="Name"><Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Metformin, Vitamin D3" maxLength={80} /></Field>
          <Field label="Dose"><Input value={f.dose} onChange={(e) => set({ dose: e.target.value })} placeholder="500 mg" maxLength={30} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Form"><Select value={f.form} onChange={(form) => set({ form })} options={FORMS.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))} /></Field>
          <Field label="Food"><Select value={f.food} onChange={(food) => set({ food })} options={FOOD} /></Field>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12.5px] text-fin-muted">When</span>
            <Chips small label="Schedule" value={asNeeded ? "need" : "fixed"} onChange={(v) => set({ times: v === "need" ? [] : ["08:00"] })} options={[{ value: "fixed", label: "Fixed times" }, { value: "need", label: "As needed" }]} />
          </div>
          {!asNeeded && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {f.times.map((t, i) => (
                  <span key={i} className="flex items-center rounded-xl bg-fin-input pr-1">
                    <input type="time" value={t} onChange={(e) => set({ times: f.times.map((x, j) => (j === i ? e.target.value : x)) })} className="bg-transparent px-3 py-2 text-[15px] text-white outline-none [color-scheme:dark]" aria-label={`Dose time ${i + 1}`} />
                    {f.times.length > 1 && (
                      <button type="button" onClick={() => set({ times: f.times.filter((_, j) => j !== i) })} className="grid h-7 w-7 place-items-center rounded-lg text-fin-muted hover:text-white" aria-label="Remove time">
                        <Icon name="close" size={13} />
                      </button>
                    )}
                  </span>
                ))}
                {f.times.length < 6 && (
                  <button type="button" onClick={() => set({ times: [...f.times, f.times.length === 1 ? "20:00" : "14:00"] })} className="rounded-xl bg-fin-tile px-3 py-2 text-[13.5px] font-semibold text-white/80 hover:text-white">+ time</button>
                )}
              </div>
              <div className="mt-2 flex gap-1" role="group" aria-label="Days">
                {WEEK.map((d, i) => {
                  const on = !f.days.length || f.days.includes(i);
                  return (
                    <button key={i} type="button" aria-pressed={on} onClick={() => toggleDay(i)} className={`h-9 flex-1 rounded-xl text-[13px] font-bold ${on ? "bg-fin-accent/20 text-fin-accent" : "bg-fin-input text-fin-faint"}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 text-[11.5px] text-fin-faint">{!f.days.length ? "Every day" : "Only on the highlighted days"} — tap a day to change.</div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Started"><Input type="date" value={f.start} onChange={(e) => set({ start: e.target.value })} /></Field>
          <Field label="Last day (if a course)"><Input type="date" value={f.end} onChange={(e) => set({ end: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Doses left (optional)"><Input type="number" min="0" value={f.stock ?? ""} onChange={(e) => set({ stock: e.target.value })} placeholder="e.g. 30" /></Field>
          <Field label="Prescribed by"><Input value={f.prescribedBy} onChange={(e) => set({ prescribedBy: e.target.value })} placeholder="Dr …" maxLength={60} /></Field>
        </div>
        <Field label="For">
          <Select value={f.issueId} onChange={(issueId) => set({ issueId })} options={[{ value: "", label: "— Not linked to an issue —" }, ...h.issues.map((i) => ({ value: i._id, label: i.name }))]} />
        </Field>
        {!f.issueId && <Field label="Purpose"><Input value={f.purpose} onChange={(e) => set({ purpose: e.target.value })} placeholder="e.g. low vitamin D" maxLength={80} /></Field>}
        <Field label="Notes"><Area value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Side effects, instructions…" maxLength={1000} /></Field>
        {med?._id && (
          <label className="flex items-center gap-2.5 text-[14px]">
            <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--fin-accent))]" />
            Still taking it
          </label>
        )}
      </div>
    </Sheet>
  );
}
export { lowStock };
