// Check-ups: doctor visits, tests and scans (planned and done), plus the
// regular check-ups you want to keep up with and when each is next due.
import { useState } from "react";
import { EmptyState, FinCard, Icon, PrimaryButton, Sheet } from "../../finances/fin-ui.jsx";
import { parseISO } from "../lib";
import { useHealth } from "./HealthContext.jsx";
import { KIND, KINDS, SUGGESTED_PLANS, addMonths, planStatus, relDays, time12, todayISO } from "./lib";
import { AddButton, Area, Chips, DeleteButton, Field, Input, Select, shortDate } from "./ui.jsx";

const BLANK = { date: "", time: "", kind: "doctor", title: "", doctor: "", place: "", reason: "", outcome: "", status: "planned", issueId: "", planId: "", followUp: "" };

export function VisitsView({ openVisit }) {
  const h = useHealth();
  const [edit, setEdit] = useState(openVisit || null);
  const [plan, setPlan] = useState(null);
  const today = todayISO();
  const upcoming = h.visits.filter((v) => v.status === "planned" && v.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
  const past = h.visits.filter((v) => !upcoming.includes(v)).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <FinCard className="lg:h-[calc(100dvh-178px)] lg:overflow-y-auto" title="Coming up" action={<AddButton onClick={() => setEdit({ ...BLANK, date: today })} label="Add visit">Add</AddButton>}>
        {!upcoming.length ? (
          <EmptyState icon="calendar">No visits planned. Add a doctor's appointment, a blood test or a scan — the phone app can remind you the day before.</EmptyState>
        ) : (
          <div className="space-y-2">
            {upcoming.map((v) => <VisitRow key={v._id} v={v} onOpen={() => setEdit(v)} />)}
          </div>
        )}
      </FinCard>
      <FinCard className="lg:h-[calc(100dvh-178px)] lg:overflow-y-auto" title="History">
        {!past.length ? (
          <div className="py-6 text-center text-[13.5px] text-fin-muted">Past visits and what the doctor said will be kept here.</div>
        ) : (
          <div className="space-y-2">
            {past.map((v) => <VisitRow key={v._id} v={v} onOpen={() => setEdit(v)} past />)}
          </div>
        )}
      </FinCard>
      <PlansCard onEdit={setPlan} onBook={(p) => setEdit({ ...BLANK, date: today, kind: p.kind, title: p.title, planId: p._id })} />
      <VisitSheet visit={edit} onClose={() => setEdit(null)} onFollowUp={(v) => setEdit({ ...BLANK, date: v.followUp, kind: v.kind, title: v.title ? `Follow-up: ${v.title}` : "Follow-up", doctor: v.doctor, place: v.place, issueId: v.issueId })} />
      <PlanSheet plan={plan} onClose={() => setPlan(null)} />
    </div>
  );
}

function VisitRow({ v, onOpen, past }) {
  const h = useHealth();
  const k = KIND[v.kind] || KIND.other;
  const d = Math.round((parseISO(v.date) - parseISO(todayISO())) / 86400000);
  const issue = h.issues.find((i) => i._id === v.issueId);
  return (
    <button onClick={onOpen} className="flex w-full items-start gap-3 rounded-2xl bg-fin-input px-3.5 py-3 text-left transition hover:bg-fin-tile">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${v.status === "missed" ? "bg-red-500/15 text-red-300" : "bg-fin-accent/15 text-fin-accent"}`}><Icon name={k.icon} size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold">{v.title || k.label}</span>
        <span className="block truncate text-[12.5px] text-fin-muted">
          {[shortDate(v.date), v.time && time12(v.time), v.doctor, v.place].filter(Boolean).join(" · ")}
        </span>
        {past && v.outcome && <span className="mt-1 line-clamp-2 block text-[13px] text-white/80">{v.outcome}</span>}
        {!past && (v.reason || issue) && <span className="mt-0.5 block truncate text-[12.5px] text-white/70">{v.reason || `For ${issue.name}`}</span>}
      </span>
      <span className="shrink-0 text-[12px] font-semibold text-fin-muted">{past ? (v.status === "missed" ? <span className="text-red-300">Missed</span> : v.status === "planned" ? <span className="text-amber-300">Not marked</span> : "") : relDays(d)}</span>
    </button>
  );
}

function PlansCard({ onEdit, onBook }) {
  const h = useHealth();
  const list = h.plans.map((p) => ({ p, s: planStatus(p, h.visits, h.reports) })).sort((a, b) => (a.s.days ?? -9999) - (b.s.days ?? -9999));
  const missing = SUGGESTED_PLANS.filter((s) => !h.plans.some((p) => p.title.toLowerCase() === s.title.toLowerCase()));
  return (
    <FinCard className="lg:h-[calc(100dvh-178px)] lg:overflow-y-auto" title="Regular check-ups" action={<AddButton onClick={() => onEdit({ title: "", kind: "blood", everyMonths: 6, lastDone: "", notes: "" })} label="Add regular check-up">Add</AddButton>}>
      <div className="space-y-2">
        {list.map(({ p, s }) => {
          const over = s.days != null && s.days < 0;
          const soon = s.days != null && s.days <= 30;
          const booked = h.visits.some((v) => v.planId === p._id && v.status === "planned" && v.date >= todayISO());
          return (
            <div key={p._id} className="rounded-2xl bg-fin-input px-3.5 py-3">
              <button onClick={() => onEdit(p)} className="flex w-full items-center gap-2 text-left">
                <Icon name={KIND[p.kind]?.icon || "clipboard"} size={16} className="shrink-0 text-fin-accent" />
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{p.title}</span>
                <span className="shrink-0 text-[12px] text-fin-muted">every {p.everyMonths} mo</span>
              </button>
              <div className="mt-1 flex items-center gap-2 text-[12.5px]">
                <span className={`min-w-0 flex-1 truncate ${!s.last || over ? "text-red-300" : soon ? "text-amber-300" : "text-fin-muted"}`}>
                  {!s.last ? "Never done — due now" : over ? `Overdue since ${shortDate(s.due)}` : `Next due ${shortDate(s.due)} (${relDays(s.days)})`}
                </span>
                {booked ? <span className="shrink-0 font-semibold text-emerald-300">Booked</span> : (!s.last || soon) && <button onClick={() => onBook(p)} className="shrink-0 rounded-lg bg-fin-accent/15 px-2.5 py-1 font-semibold text-fin-accent">Plan it</button>}
              </div>
              {s.last && <div className="text-[11.5px] text-fin-faint">Last done {shortDate(s.last)}</div>}
            </div>
          );
        })}
      </div>
      {missing.length > 0 && (
        <div className={list.length ? "mt-4" : ""}>
          <div className="mb-1.5 text-[12.5px] text-fin-muted">{list.length ? "More to keep up with" : "Pick the ones you want to keep up with"}</div>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((s) => (
              <button key={s.title} onClick={() => h.create("plans", { ...s, lastDone: "", notes: "" }, `${s.title} added`)} className="rounded-full bg-fin-tile px-3 py-1.5 text-[13px] font-semibold text-white/80 hover:text-white">
                + {s.title} <span className="text-fin-faint">· {s.everyMonths} mo</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </FinCard>
  );
}

function VisitSheet({ visit, onClose, onFollowUp }) {
  const h = useHealth();
  const [f, setF] = useState(BLANK);
  const [key, setKey] = useState(null);
  if (visit && key !== (visit._id || `new-${visit.title}-${visit.date}`)) {
    setKey(visit._id || `new-${visit.title}-${visit.date}`);
    setF({ ...BLANK, ...visit });
  }
  if (!visit && key) setKey(null);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const future = f.date > todayISO();
  const save = async (extra = {}) => {
    const body = { ...f, ...extra, title: f.title.trim() };
    delete body._id;
    const doc = visit?._id ? await h.update("visits", visit._id, body, "Saved") : await h.create("visits", body, "Visit added");
    if (doc && body.status === "done" && body.followUp && !h.visits.some((v) => v.date === body.followUp && v.status === "planned")) return onFollowUp(doc);
    onClose();
  };
  return (
    <Sheet
      open={Boolean(visit)}
      onClose={onClose}
      title={visit?._id ? "Visit" : "Add a visit"}
      footer={
        <>
          {visit?._id && <DeleteButton onDelete={() => (h.remove("visits", visit._id, "Deleted"), onClose())} />}
          <PrimaryButton className="flex-1" onClick={() => save()} disabled={!f.date}>Save</PrimaryButton>
        </>
      }
    >
      <div className="space-y-3.5">
        <Chips small label="Kind" value={f.kind} onChange={(kind) => set({ kind })} options={KINDS} />
        <Field label="What"><Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder={`e.g. ${f.kind === "blood" ? "Full body check-up" : f.kind === "dentist" ? "Cleaning" : "General physician"}`} maxLength={80} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} /></Field>
          <Field label="Time"><Input type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Doctor"><Input value={f.doctor} onChange={(e) => set({ doctor: e.target.value })} placeholder="Dr …" maxLength={60} /></Field>
          <Field label="Hospital / lab"><Input value={f.place} onChange={(e) => set({ place: e.target.value })} maxLength={80} /></Field>
        </div>
        <Field label="Why"><Input value={f.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="Symptoms, questions to ask…" maxLength={200} /></Field>
        <Chips label="Status" value={f.status} onChange={(status) => set({ status })} options={[{ value: "planned", label: future ? "Planned" : "Planned / not marked" }, { value: "done", label: "Done" }, { value: "missed", label: "Missed" }]} />
        {f.status === "done" && (
          <>
            <Field label="What the doctor said / results"><Area value={f.outcome} onChange={(e) => set({ outcome: e.target.value })} placeholder="Diagnosis, advice, medicines changed…" maxLength={2000} /></Field>
            <Field label="Follow-up on (optional)">
              <div className="flex gap-1.5">
                <Input type="date" value={f.followUp} onChange={(e) => set({ followUp: e.target.value })} />
                {[1, 3, 6].map((n) => (
                  <button key={n} type="button" onClick={() => set({ followUp: addMonths(f.date || todayISO(), n) })} className="shrink-0 rounded-xl bg-fin-tile px-2.5 text-[12.5px] font-semibold text-white/80">{n} mo</button>
                ))}
              </div>
            </Field>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="For issue">
            <Select value={f.issueId} onChange={(issueId) => set({ issueId })} options={[{ value: "", label: "—" }, ...h.issues.map((i) => ({ value: i._id, label: i.name }))]} />
          </Field>
          <Field label="Counts as">
            <Select value={f.planId} onChange={(planId) => set({ planId })} options={[{ value: "", label: "—" }, ...h.plans.map((p) => ({ value: p._id, label: p.title }))]} />
          </Field>
        </div>
        {f.status === "done" && f.followUp && <div className="text-[12px] text-fin-faint">Saving will open the follow-up visit so you can plan it.</div>}
      </div>
    </Sheet>
  );
}

function PlanSheet({ plan, onClose }) {
  const h = useHealth();
  const [f, setF] = useState(null);
  const [key, setKey] = useState(null);
  if (plan && key !== (plan._id || "new")) {
    setKey(plan._id || "new");
    setF({ ...plan });
  }
  if (!plan && key) setKey(null);
  if (!f) return null;
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const save = async () => {
    const body = { title: f.title.trim(), kind: f.kind, everyMonths: Math.max(1, Math.min(120, Number(f.everyMonths) || 12)), lastDone: f.lastDone || "", notes: f.notes || "" };
    if (plan._id) await h.update("plans", plan._id, body, "Saved");
    else await h.create("plans", body, `${body.title} added`);
    onClose();
  };
  return (
    <Sheet
      open={Boolean(plan)}
      onClose={onClose}
      title={plan?._id ? "Regular check-up" : "Add a regular check-up"}
      footer={
        <>
          {plan?._id && <DeleteButton onDelete={() => (h.remove("plans", plan._id, "Deleted"), onClose())} />}
          <PrimaryButton className="flex-1" onClick={save} disabled={!f.title?.trim()}>Save</PrimaryButton>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Name"><Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Lipid profile" maxLength={80} /></Field>
        <Chips small label="Kind" value={f.kind} onChange={(kind) => set({ kind })} options={KINDS} />
        <Field label="Every (months)">
          <div className="flex gap-1.5">
            {[3, 6, 12, 24].map((n) => (
              <button key={n} type="button" onClick={() => set({ everyMonths: n })} className={`flex-1 rounded-xl py-2 text-[14px] font-semibold ${Number(f.everyMonths) === n ? "bg-fin-accent text-white" : "bg-fin-input text-white/75"}`}>{n}</button>
            ))}
            <Input type="number" min="1" max="120" value={f.everyMonths} onChange={(e) => set({ everyMonths: e.target.value })} className="!w-20" aria-label="Months" />
          </div>
        </Field>
        <Field label="Last done (if before LifeOS)"><Input type="date" value={f.lastDone} onChange={(e) => set({ lastDone: e.target.value })} /></Field>
        <div className="text-[12px] text-fin-faint">Visits and blood reports marked "Counts as" this also update when it was last done.</div>
      </div>
    </Sheet>
  );
}
