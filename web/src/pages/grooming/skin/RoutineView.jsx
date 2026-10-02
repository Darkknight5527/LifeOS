import { useEffect, useState } from "react";
import { useSkin } from "./SkinContext.jsx";
import { PERIOD, PERIODS, STEP_SUGGESTIONS, WEEKDAYS, daysLabel } from "./lib";
import { FinCard, GhostButton, Icon, IconButton, Pill, PrimaryButton, Segmented, Sheet, TextField } from "../../finances/fin-ui.jsx";

export default function RoutineView() {
  const { steps, moveStep, removeStep } = useSkin();
  const [sheet, setSheet] = useState({ open: false, step: null, period: "am" });

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
      {PERIODS.map((p) => {
        const list = steps.filter((s) => s.period === p.id);
        return (
          <FinCard
            key={p.id}
            title={
              <span className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: p.soft, color: p.color }}>
                  <Icon name={p.icon} size={16} stroke={2} />
                </span>
                {p.label} routine
              </span>
            }
            action={
              <button
                onClick={() => setSheet({ open: true, step: null, period: p.id })}
                className="flex items-center gap-1.5 rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold transition hover:bg-[#30303a]"
              >
                <Icon name="plus" size={15} stroke={2.4} /> Step
              </button>
            }
          >
            {list.length ? (
              <ol className="fin-scroll space-y-1.5 lg:max-h-[calc(100dvh-230px)] lg:overflow-y-auto lg:pr-1">
                {list.map((s, i) => (
                  <li key={s._id} className="flex items-center gap-2 rounded-2xl bg-fin-input px-3 py-2">
                    <span className="tabular w-5 text-center text-[13px] font-bold text-fin-faint">{i + 1}</span>
                    <button onClick={() => setSheet({ open: true, step: s, period: s.period })} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[15px] font-semibold hover:text-fin-accent">{s.name}</span>
                      <span className="block truncate text-[12.5px] text-fin-muted">
                        {[s.product, daysLabel(s.days)].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                    <div className="flex shrink-0">
                      <IconButton icon="up" label="Move up" onClick={() => moveStep(s, -1)} className={`!h-8 !w-8 ${i === 0 ? "pointer-events-none opacity-20" : ""}`} size={16} />
                      <IconButton icon="down" label="Move down" onClick={() => moveStep(s, 1)} className={`!h-8 !w-8 ${i === list.length - 1 ? "pointer-events-none opacity-20" : ""}`} size={16} />
                      <IconButton icon="trash" label={`Remove ${s.name}`} onClick={() => removeStep(s)} className="!h-8 !w-8 hover:!text-fin-danger" size={16} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="py-6 text-center text-[14px] text-fin-muted">No {p.label.toLowerCase()} steps yet.</div>
            )}
            <p className="mt-3 text-[12.5px] text-fin-faint">Tap a step to edit it. Steps set to certain days only show up on those days.</p>
          </FinCard>
        );
      })}
      <StepSheet {...sheet} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </div>
  );
}

function StepSheet({ open, step, period: initialPeriod, onClose }) {
  const { addStep, updateStep, removeStep } = useSkin();
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [period, setPeriod] = useState("am");
  const [days, setDays] = useState([]);

  useEffect(() => {
    if (!open) return;
    setName(step?.name || "");
    setProduct(step?.product || "");
    setPeriod(step?.period || initialPeriod || "am");
    setDays(step?.days || []);
  }, [open, step, initialPeriod]);

  const valid = name.trim().length > 0;
  const everyDay = days.length === 0;

  async function save() {
    if (!valid) return;
    const data = { name: name.trim(), product: product.trim(), period, days: [...days].sort() };
    const ok = step ? await updateStep(step, data, "Step updated") : await addStep(data);
    if (ok) onClose();
  }

  function toggleDay(d) {
    const set = new Set(days);
    set.has(d) ? set.delete(d) : set.add(d);
    const next = [...set];
    setDays(next.length === 7 ? [] : next);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step ? "Edit step" : "New step"}
      footer={
        <>
          {step ? (
            <GhostButton className="!px-4 text-fin-danger" aria-label="Remove step" onClick={() => { removeStep(step); onClose(); }}>
              <Icon name="trash" size={20} />
            </GhostButton>
          ) : (
            <GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton>
          )}
          <PrimaryButton className="flex-1" disabled={!valid} onClick={save}>{step ? "Save changes" : "Add step"}</PrimaryButton>
        </>
      }
    >
      <Label>When</Label>
      <Segmented value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.id, label: p.label, dot: PERIOD[p.id].color }))} />
      <Label>Step</Label>
      <TextField autoFocus={!step} placeholder="e.g. Serum" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {STEP_SUGGESTIONS.map((sug) => (
          <button
            key={sug}
            onClick={() => setName(sug)}
            className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold transition ${name === sug ? "bg-fin-accent/15 text-fin-accent" : "bg-fin-input text-fin-muted hover:text-white"}`}
          >
            {sug}
          </button>
        ))}
      </div>
      <Label>Product (optional)</Label>
      <TextField placeholder="e.g. Minimalist 10% Niacinamide" value={product} onChange={(e) => setProduct(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
      <Label>Days</Label>
      <div className="flex flex-wrap gap-1.5">
        <Pill active={everyDay} onClick={() => setDays([])}>Every day</Pill>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <Pill key={d} active={!everyDay && days.includes(d)} onClick={() => toggleDay(d)} className="!px-3">
            {WEEKDAYS[d]}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-[12.5px] text-fin-faint">For things like retinol or exfoliating that you only do a few times a week.</p>
    </Sheet>
  );
}

function Label({ children }) {
  return <div className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted first:mt-0">{children}</div>;
}
