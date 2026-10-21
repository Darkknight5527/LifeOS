// Health › Today: tick today's medicines, see what's coming up (visits,
// regular check-ups due) and anything to keep an eye on.
import { useState } from "react";
import { EmptyState, FinCard, Icon, PrimaryButton, Sheet } from "../../finances/fin-ui.jsx";
import { useFit } from "../FitContext.jsx";
import { useHealth } from "./HealthContext.jsx";
import { lowStock } from "./Meds.jsx";
import { FLAG, KIND, STATUS, TEST, adherence, dosesFor, flagOf, planStatus, relDays, time12, todayISO } from "./lib";
import { SEV_LABEL, shortDate } from "./ui.jsx";
import { parseISO } from "../lib";

export function HealthToday({ go }) {
  const h = useHealth();
  const sex = useFit()?.settings?.profile?.sex;
  const today = todayISO();
  const log = h.logs.find((l) => l.date === today);
  const current = h.meds.filter((m) => m.active && !(m.end && m.end < today));
  const doses = dosesFor(current, log, today);
  const asNeeded = current.filter((m) => !m.times?.length);
  const done = doses.filter((d) => d.state).length;
  const week = adherence(current, h.logs, 7);
  const now = new Date();
  const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const days = (iso) => Math.round((parseISO(iso) - parseISO(today)) / 86400000);
  const upcoming = h.visits.filter((v) => v.status === "planned" && v.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const unmarked = h.visits.filter((v) => v.status === "planned" && v.date < today);
  const due = h.plans.map((p) => ({ p, s: planStatus(p, h.visits, h.reports) })).filter(({ p, s }) => (s.days == null || s.days <= 30) && !h.visits.some((v) => v.planId === p._id && v.status === "planned" && v.date >= today));
  const active = h.issues.filter((i) => i.status === "active");
  const latest = [...h.reports].sort((a, b) => b.date.localeCompare(a.date))[0];
  const off = (latest?.results || []).filter((x) => ["high", "low"].includes(flagOf(x, sex)));
  const refill = current.filter(lowStock);
  const [extraFor, setExtraFor] = useState(null); // as-needed medicine being looked at

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <FinCard
        className="lg:h-[calc(100dvh-178px)] lg:overflow-y-auto"
        title="Today's medicines"
        action={doses.length > 0 && <span className="tabular text-[13px] font-semibold text-fin-muted">{done}/{doses.length} done</span>}
      >
        {!current.length ? (
          <EmptyState icon="clipboard">
            No medicines yet.{" "}
            <button onClick={() => go("meds")} className="font-semibold text-fin-accent">Add one</button> to tick doses here.
          </EmptyState>
        ) : (
          <>
            {doses.length === 0 && <div className="mb-3 text-[13.5px] text-fin-muted">Nothing scheduled today.</div>}
            <div className="space-y-1.5">
              {doses.map((d) => {
                const late = !d.state && d.time < nowHM;
                return (
                  <div key={d.key} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${d.state === "taken" ? "bg-emerald-400/10" : d.state === "skipped" ? "bg-fin-input/50" : "bg-fin-input"}`}>
                    <span className={`tabular w-[62px] shrink-0 text-[12.5px] font-semibold ${late ? "text-amber-300" : "text-fin-muted"}`}>{time12(d.time)}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[14.5px] font-semibold ${d.state === "skipped" ? "text-white/45 line-through" : ""}`}>{d.med.name}</span>
                      <span className="block truncate text-[12px] text-fin-muted">{[d.med.dose, d.med.food && `${d.med.food} food`].filter(Boolean).join(" · ")}</span>
                    </span>
                    {d.state ? (
                      <button onClick={() => h.setDose(today, d.key, "", d.med)} className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[12.5px] font-bold ${d.state === "taken" ? "text-emerald-300" : "text-fin-muted"}`} aria-label={`Undo ${d.med.name} at ${time12(d.time)}`}>
                        {d.state === "taken" ? <><Icon name="check" size={14} stroke={3} /> Taken</> : "Skipped"}
                      </button>
                    ) : (
                      <span className="flex shrink-0 gap-1">
                        <button onClick={() => h.setDose(today, d.key, "skipped", d.med)} className="rounded-xl px-2 py-1.5 text-[12.5px] font-semibold text-fin-muted hover:text-white" aria-label={`Skip ${d.med.name} at ${time12(d.time)}`}>Skip</button>
                        <button onClick={() => h.setDose(today, d.key, "taken", d.med)} className="flex items-center gap-1 rounded-xl bg-fin-accent px-3 py-1.5 text-[13px] font-bold text-white" aria-label={`Took ${d.med.name} at ${time12(d.time)}`}><Icon name="check" size={14} stroke={3} /> Took</button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {asNeeded.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-[12.5px] text-fin-muted">As needed — tap to log or edit</div>
                <div className="flex flex-wrap gap-1.5">
                  {asNeeded.map((m) => {
                    const n = (log?.extra || []).filter((x) => x.medId === m._id).length;
                    return (
                      <button key={m._id} onClick={() => setExtraFor(m)} className="rounded-full bg-fin-tile px-3 py-1.5 text-[13px] font-semibold text-white/85 hover:text-white">
                        {m.name}{n ? <span className="text-fin-accent"> · {n} today</span> : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {week && <div className="mt-4 text-[12.5px] text-fin-muted">Last 7 days: <b className="text-white/85">{week.pct}%</b> of doses taken</div>}
            {refill.length > 0 && (
              <div className="mt-3 rounded-2xl bg-amber-400/10 px-3.5 py-2.5 text-[13px] text-amber-200">
                Refill soon: {refill.map((m) => `${m.name} (${m.stock} left)`).join(", ")}
              </div>
            )}
          </>
        )}
      </FinCard>

      <FinCard className="lg:h-[calc(100dvh-178px)] lg:overflow-y-auto" title="Coming up" action={<button onClick={() => go("visits")} className="text-[13px] font-semibold text-fin-accent">All check-ups</button>}>
        {!upcoming.length && !due.length && !unmarked.length ? (
          <EmptyState icon="calendar">
            Nothing planned.{" "}
            <button onClick={() => go("visits")} className="font-semibold text-fin-accent">Add a visit or a regular check-up</button>.
          </EmptyState>
        ) : (
          <div className="space-y-1.5">
            {unmarked.map((v) => (
              <button key={v._id} onClick={() => go("visits", v)} className="flex w-full items-center gap-3 rounded-2xl bg-amber-400/10 px-3.5 py-2.5 text-left">
                <Icon name={KIND[v.kind]?.icon || "info"} size={17} className="shrink-0 text-amber-300" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{v.title || KIND[v.kind]?.label}</span>
                  <span className="block truncate text-[12px] text-amber-200/80">{shortDate(v.date)} — how did it go? Tap to note it.</span>
                </span>
              </button>
            ))}
            {upcoming.map((v) => {
              const d = days(v.date);
              return (
                <button key={v._id} onClick={() => go("visits", v)} className="flex w-full items-center gap-3 rounded-2xl bg-fin-input px-3.5 py-2.5 text-left hover:bg-fin-tile">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fin-accent/15 text-fin-accent"><Icon name={KIND[v.kind]?.icon || "info"} size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold">{v.title || KIND[v.kind]?.label}</span>
                    <span className="block truncate text-[12.5px] text-fin-muted">{[shortDate(v.date), v.time && time12(v.time), v.doctor || v.place].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={`shrink-0 text-[12.5px] font-bold ${d <= 1 ? "text-fin-accent" : "text-fin-muted"}`}>{relDays(d)}</span>
                </button>
              );
            })}
            {due.map(({ p, s }) => (
              <button key={p._id} onClick={() => go("visits")} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 px-3.5 py-2.5 text-left hover:bg-fin-input">
                <Icon name={KIND[p.kind]?.icon || "clipboard"} size={17} className="shrink-0 text-fin-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{p.title}</span>
                  <span className={`block truncate text-[12px] ${s.days == null || s.days < 0 ? "text-red-300" : "text-amber-300"}`}>{s.days == null ? "Never done — due now" : s.days < 0 ? `Overdue (was due ${shortDate(s.due)})` : `Due ${relDays(s.days)}`}</span>
                </span>
                <span className="shrink-0 text-[12.5px] font-semibold text-fin-accent">Plan</span>
              </button>
            ))}
          </div>
        )}
      </FinCard>

      <div className="flex flex-col gap-4 lg:h-[calc(100dvh-178px)]">
        <FinCard className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto" title="Ongoing issues" action={<button onClick={() => go("issues")} className="text-[13px] font-semibold text-fin-accent">All</button>}>
          {!active.length ? (
            <div className="text-[13.5px] text-fin-muted">None active. <button onClick={() => go("issues")} className="font-semibold text-fin-accent">Log one</button> if something's bothering you.</div>
          ) : (
            <div className="space-y-1.5">
              {active.slice(0, 5).map((i) => {
                const last = i.entries?.[0];
                return (
                  <button key={i._id} onClick={() => go("issues", i)} className="flex w-full items-center gap-2.5 rounded-2xl bg-fin-input px-3.5 py-2.5 text-left hover:bg-fin-tile">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS[i.status]?.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{i.name}</span>
                      <span className="block truncate text-[12px] text-fin-muted">{last ? `${shortDate(last.date)}${last.severity ? ` · ${SEV_LABEL[last.severity]}` : ""}${last.note ? ` · ${last.note}` : ""}` : i.since ? `since ${shortDate(i.since)}` : "no log yet"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </FinCard>
        <FinCard className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto" title="Latest blood work" action={<button onClick={() => go("labs")} className="text-[13px] font-semibold text-fin-accent">{latest ? "Open" : "Add"}</button>}>
          {!latest ? (
            <div className="text-[13.5px] text-fin-muted">No reports yet.</div>
          ) : (
            <>
              <div className="text-[12.5px] text-fin-muted">{latest.title || "Blood test"} · {shortDate(latest.date)}</div>
              {off.length ? (
                <div className="mt-2 space-y-1">
                  {off.slice(0, 6).map((x) => {
                    const fl = flagOf(x, sex);
                    return (
                      <div key={x.key} className="flex items-center justify-between gap-2 text-[13.5px]">
                        <span className="min-w-0 truncate">{x.name || TEST[x.key]?.name}</span>
                        <span className="tabular shrink-0 font-bold" style={{ color: FLAG[fl].color }}>{x.value} {x.unit} · {FLAG[fl].label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-1.5 text-[13.5px] text-emerald-300"><Icon name="check" size={15} stroke={2.6} /> All values in range</div>
              )}
            </>
          )}
        </FinCard>
      </div>
      <ExtraSheet med={extraFor && h.meds.find((m) => m._id === extraFor._id)} log={log} today={today} onClose={() => setExtraFor(null)} onEdit={(m) => (setExtraFor(null), go("meds", m))} />
    </div>
  );
}

/** An as-needed medicine: log a dose, see today's, remove one logged by mistake. */
function ExtraSheet({ med, log, today, onClose, onEdit }) {
  const h = useHealth();
  const list = med ? (log?.extra || []).filter((x) => x.medId === med._id).sort((a, b) => b.at - a.at) : [];
  const clock = (t) => new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return (
    <Sheet
      open={Boolean(med)}
      onClose={onClose}
      title={med?.name || ""}
      footer={
        <>
          <button onClick={() => onEdit(med)} className="rounded-2xl px-4 py-3 text-[15px] font-semibold text-fin-muted hover:text-white">Edit medicine</button>
          <PrimaryButton className="flex-1" onClick={() => h.takeExtra(today, med)}>+ Log a dose now</PrimaryButton>
        </>
      }
    >
      <div className="text-[13.5px] text-fin-muted">{[med?.dose, med?.stock != null && `${med.stock} left`].filter(Boolean).join(" · ") || "As needed"}</div>
      <div className="mt-3 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Today · {list.length} dose{list.length === 1 ? "" : "s"}</div>
      <div className="mt-2 space-y-1.5">
        {!list.length && <div className="py-4 text-center text-[13.5px] text-fin-muted">None logged today.</div>}
        {list.map((x) => (
          <div key={x.at} className="flex items-center gap-3 rounded-xl bg-fin-input px-3.5 py-2.5">
            <Icon name="clock" size={15} className="shrink-0 text-fin-muted" />
            <span className="tabular flex-1 text-[14.5px] font-semibold">{clock(x.at)}</span>
            <button onClick={() => h.dropExtra(today, med, x.at)} className="rounded-lg px-2.5 py-1 text-[13px] font-semibold text-fin-muted hover:bg-red-500/15 hover:text-fin-danger" aria-label={`Remove the ${clock(x.at)} dose`}>Remove</button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
