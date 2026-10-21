// Medical issues: conditions, symptoms, injuries and allergies, each with a
// running log ("how is it today?") and the medicines and visits linked to it.
import { useState } from "react";
import { EmptyState, FinCard, Icon, PrimaryButton, Sheet } from "../../finances/fin-ui.jsx";
import { useHealth } from "./HealthContext.jsx";
import { ISSUE_KINDS, ISSUE_STATUS, KIND, STATUS, newId, scheduleText, todayISO } from "./lib";
import { AddButton, Area, Chips, DeleteButton, Field, Input, SEV_LABEL, Severity, shortDate } from "./ui.jsx";

const BLANK = { name: "", kind: "condition", status: "active", since: "", resolvedOn: "", severity: 0, doctor: "", notes: "", entries: [] };
const SEV = ["", "#34d399", "#a3e635", "#fbbf24", "#fb923c", "#f87171"];

export function IssuesView({ openIssue }) {
  const h = useHealth();
  const [filter, setFilter] = useState("open");
  const [open, setOpen] = useState(openIssue || null); // issue or BLANK
  const shown = h.issues.filter((i) => (filter === "open" ? i.status !== "resolved" : filter === "resolved" ? i.status === "resolved" : true));
  const allergies = h.issues.filter((i) => i.kind === "allergy" && i.status !== "resolved");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <FinCard className="lg:col-span-2 lg:h-[calc(100dvh-178px)] lg:overflow-y-auto" title="Medical issues" action={<AddButton onClick={() => setOpen(BLANK)} label="Add issue">Add</AddButton>}>
        <Chips small label="Show" value={filter} onChange={setFilter} options={[{ value: "open", label: "Current" }, { value: "resolved", label: "Resolved" }, { value: "all", label: "All" }]} />
        {!shown.length ? (
          <EmptyState icon="info">{filter === "resolved" ? "Nothing resolved yet." : "Add anything you're dealing with — a condition, a symptom that keeps coming back, an injury or an allergy — and log how it's going."}</EmptyState>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2.5 xl:grid-cols-2">
            {shown.map((i) => {
              const last = i.entries?.[0];
              const sev = last?.severity || i.severity;
              return (
                <button key={i._id} onClick={() => setOpen(i)} className="rounded-2xl bg-fin-input p-3.5 text-left transition hover:bg-fin-tile">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS[i.status]?.color }} />
                    <span className="min-w-0 flex-1 truncate text-[15.5px] font-bold">{i.name}</span>
                    <span className="shrink-0 text-[12px] text-fin-muted">{ISSUE_KINDS.find((k) => k.value === i.kind)?.label}</span>
                  </div>
                  <div className="mt-1 truncate text-[12.5px] text-fin-muted">
                    {[STATUS[i.status]?.label, i.since && `since ${shortDate(i.since)}`, sev ? SEV_LABEL[sev] : ""].filter(Boolean).join(" · ")}
                  </div>
                  {last && <div className="mt-2 line-clamp-2 text-[13px] text-white/80"><span className="text-fin-faint">{shortDate(last.date)} · </span>{last.note || SEV_LABEL[last.severity]}</div>}
                  <Spark entries={i.entries} />
                </button>
              );
            })}
          </div>
        )}
      </FinCard>
      <div className="flex flex-col gap-4">
        <FinCard title="Allergies">
          {allergies.length ? (
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((a) => (
                <button key={a._id} onClick={() => setOpen(a)} className="rounded-full bg-red-500/15 px-3 py-1.5 text-[13.5px] font-semibold text-red-300">{a.name}</button>
              ))}
            </div>
          ) : (
            <div className="text-[13.5px] text-fin-muted">None added. Add one as an issue of type "Allergy" so it's easy to show a doctor.</div>
          )}
        </FinCard>
      </div>
      <IssueSheet issue={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** Severity over the last log entries, as small bars. */
function Spark({ entries = [] }) {
  const list = entries.filter((e) => e.severity).slice(0, 14).reverse();
  if (list.length < 2) return null;
  return (
    <div className="mt-2 flex h-6 items-end gap-0.5" aria-hidden="true">
      {list.map((e) => (
        <span key={e.id} className="flex-1 rounded-sm" style={{ height: `${e.severity * 20}%`, background: SEV[e.severity] }} />
      ))}
    </div>
  );
}

function IssueSheet({ issue, onClose }) {
  const h = useHealth();
  const [f, setF] = useState(BLANK);
  const [key, setKey] = useState(null);
  const [entry, setEntry] = useState({ date: todayISO(), severity: 0, note: "" });
  if (issue && key !== (issue._id || "new")) {
    setKey(issue._id || "new");
    setF({ ...BLANK, ...issue, entries: [...(issue.entries || [])] });
    setEntry({ date: todayISO(), severity: 0, note: "" });
  }
  if (!issue && key) setKey(null);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const meds = issue?._id ? h.meds.filter((m) => m.issueId === issue._id) : [];
  const visits = issue?._id ? h.visits.filter((v) => v.issueId === issue._id) : [];

  const body = () => {
    const b = { ...f, name: f.name.trim() };
    delete b._id;
    if (b.status === "resolved" && !b.resolvedOn) b.resolvedOn = todayISO();
    if (b.status !== "resolved") b.resolvedOn = "";
    return b;
  };
  const save = async () => {
    if (issue?._id) await h.update("issues", issue._id, body(), "Saved");
    else await h.create("issues", body(), `${f.name.trim()} added`);
    onClose();
  };
  const addEntry = async () => {
    const e = { id: newId(), date: entry.date || todayISO(), severity: entry.severity, note: entry.note.trim() };
    const entries = [e, ...f.entries].sort((a, b) => b.date.localeCompare(a.date));
    set({ entries });
    setEntry({ date: todayISO(), severity: 0, note: "" });
    if (issue?._id) await h.update("issues", issue._id, { entries, ...(e.severity ? { severity: e.severity } : {}) }, "Logged");
  };
  const dropEntry = (id) => {
    const entries = f.entries.filter((x) => x.id !== id);
    set({ entries });
    if (issue?._id) h.update("issues", issue._id, { entries });
  };

  return (
    <Sheet
      open={Boolean(issue)}
      onClose={onClose}
      wide={Boolean(issue?._id)}
      title={issue?._id ? f.name || "Issue" : "Add a medical issue"}
      footer={
        <>
          {issue?._id && <DeleteButton onDelete={() => (h.remove("issues", issue._id, "Deleted"), onClose())} />}
          <PrimaryButton className="flex-1" onClick={save} disabled={!f.name.trim()}>Save</PrimaryButton>
        </>
      }
    >
      <div className={issue?._id ? "grid grid-cols-1 gap-5 md:grid-cols-2" : ""}>
        <div className="space-y-3.5">
          <Field label="Name"><Input autoFocus={!issue?._id} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Fatty liver, Knee pain, Dust allergy" maxLength={80} /></Field>
          <Chips label="Type" value={f.kind} onChange={(kind) => set({ kind })} options={ISSUE_KINDS} />
          <Chips label="Status" value={f.status} onChange={(status) => set({ status })} options={ISSUE_STATUS} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Since"><Input type="date" value={f.since} onChange={(e) => set({ since: e.target.value })} /></Field>
            {f.status === "resolved" ? (
              <Field label="Resolved on"><Input type="date" value={f.resolvedOn} onChange={(e) => set({ resolvedOn: e.target.value })} /></Field>
            ) : (
              <Field label="Doctor"><Input value={f.doctor} onChange={(e) => set({ doctor: e.target.value })} placeholder="Dr …" maxLength={60} /></Field>
            )}
          </div>
          <Field label="Notes"><Area value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Diagnosis, triggers, what helps, what the doctor said…" maxLength={2000} /></Field>
          {(meds.length > 0 || visits.length > 0) && (
            <div className="space-y-1.5">
              <div className="text-[12.5px] text-fin-muted">Linked</div>
              {meds.map((m) => (
                <div key={m._id} className="flex items-center gap-2 rounded-xl bg-fin-input px-3 py-2 text-[13.5px]"><Icon name="clipboard" size={14} className="text-fin-accent" /> <span className="min-w-0 flex-1 truncate">{m.name} {m.dose}</span><span className="shrink-0 text-[12px] text-fin-muted">{scheduleText(m)}</span></div>
              ))}
              {visits.map((v) => (
                <div key={v._id} className="flex items-center gap-2 rounded-xl bg-fin-input px-3 py-2 text-[13.5px]"><Icon name={KIND[v.kind]?.icon || "info"} size={14} className="text-fin-accent" /> <span className="min-w-0 flex-1 truncate">{v.title || KIND[v.kind]?.label}</span><span className="shrink-0 text-[12px] text-fin-muted">{shortDate(v.date)}</span></div>
              ))}
            </div>
          )}
        </div>
        {issue?._id && (
          <div>
            <div className="rounded-2xl bg-fin-input p-3.5">
              <div className="text-[14px] font-semibold">How is it?</div>
              <div className="mt-2"><Severity value={entry.severity} onChange={(severity) => setEntry((x) => ({ ...x, severity }))} /></div>
              <div className="mt-1 text-[11.5px] text-fin-faint">1 mild … 5 severe (optional)</div>
              <div className="mt-2 grid grid-cols-[130px_1fr] gap-2">
                <Input type="date" value={entry.date} onChange={(e) => setEntry((x) => ({ ...x, date: e.target.value }))} aria-label="Log date" className="!bg-fin-tile" />
                <Input value={entry.note} onChange={(e) => setEntry((x) => ({ ...x, note: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (entry.note.trim() || entry.severity) && addEntry()} placeholder="What happened, what helped…" maxLength={500} aria-label="Log note" className="!bg-fin-tile" />
              </div>
              <button onClick={addEntry} disabled={!entry.note.trim() && !entry.severity} className="mt-2 w-full rounded-xl bg-fin-accent py-2 text-[14px] font-bold text-white disabled:opacity-40">Add to log</button>
            </div>
            <div className="mt-3 space-y-1.5">
              {!f.entries.length && <div className="py-4 text-center text-[13px] text-fin-muted">No log entries yet.</div>}
              {f.entries.map((e) => (
                <div key={e.id} className="group flex items-start gap-2.5 rounded-xl px-2 py-1.5 hover:bg-fin-input">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEV[e.severity] || "rgba(255,255,255,.2)" }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-fin-muted">{shortDate(e.date)}{e.severity ? ` · ${SEV_LABEL[e.severity]}` : ""}</div>
                    {e.note && <div className="text-[13.5px] text-white/85">{e.note}</div>}
                  </div>
                  <button onClick={() => dropEntry(e.id)} className="shrink-0 text-fin-faint transition hover:text-fin-danger lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100" aria-label="Delete log entry"><Icon name="close" size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
