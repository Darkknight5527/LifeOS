import { useEffect, useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { formatMoney, monthKey, parseISO, sum, todayISO } from "./lib";
import { EmptyState, FinCard, GhostButton, Icon, IconButton, Money, MoneyField, Pill, PrimaryButton, Ring, Sheet, TextField, Tile } from "./fin-ui.jsx";

const TYPES = [
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "stock", label: "Stock" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

export default function WealthTab() {
  return (
    // Side by side on wide screens, stacked on phones.
    <div className="grid grid-cols-1 items-start gap-5 lg:gap-4 lg:grid-cols-2 [&>*]:min-w-0">
      <Goals />
      <Investments />
    </div>
  );
}

// ---------- savings goals ----------
function Goals() {
  const { goals, goalsCrud } = useFinance();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // goal open in the edit sheet
  const [contrib, setContrib] = useState(null); // goal being topped up with a custom amount

  return (
    <FinCard
      title="Savings goals"
      delay={0}
      action={
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold transition hover:bg-[#30303a]">
          <Icon name="plus" size={15} stroke={2.4} /> Goal
        </button>
      }
    >
      {goals.length ? (
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
            const done = g.currentAmount >= g.targetAmount;
            let perMonth = null;
            if (g.targetDate && !done) {
              const now = new Date();
              const t = parseISO(g.targetDate);
              const months = Math.max(1, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
              perMonth = (g.targetAmount - g.currentAmount) / months;
            }
            return (
              <Tile key={g._id} className="!p-4">
                <div className="flex items-center gap-4">
                  <Ring value={g.currentAmount} max={g.targetAmount} color={done ? "#34d399" : "#fb8a3c"} size={66}>
                    <span className="tabular text-[14px] font-bold">{done ? <Icon name="check" size={22} stroke={2.6} className="text-fin-savings" /> : `${pct}%`}</span>
                  </Ring>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => setEditing(g)} className="min-w-0 truncate text-left text-[17px] font-bold hover:text-fin-accent">{g.title}</button>
                      <div className="-mr-2 -mt-1 flex shrink-0">
                        <IconButton icon="edit" label={`Edit ${g.title}`} onClick={() => setEditing(g)} className="!h-8 !w-8" size={16} />
                        <IconButton icon="trash" label={`Delete ${g.title}`} onClick={() => goalsCrud.remove(g, "Goal deleted")} className="!h-8 !w-8 hover:!text-fin-danger" size={16} />
                      </div>
                    </div>
                    <div className="tabular text-[15px]">
                      <span className="font-bold"><Money value={g.currentAmount} /></span>
                      <span className="text-fin-muted"> of {formatMoney(g.targetAmount)}</span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-fin-muted">
                      {done
                        ? "Goal reached 🎉"
                        : [g.targetDate && `by ${parseISO(g.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`, perMonth && `${formatMoney(Math.ceil(perMonth))}/month needed`].filter(Boolean).join(" · ") || `${formatMoney(g.targetAmount - g.currentAmount)} to go`}
                    </div>
                  </div>
                </div>
                {!done && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1000, 5000].map((n) => (
                      <button
                        key={n}
                        onClick={() => goalsCrud.update(g._id, { currentAmount: g.currentAmount + n }, `Added ${formatMoney(n)}`)}
                        className="rounded-full bg-fin-input px-3 py-1.5 text-[13px] font-semibold text-white/85 transition hover:text-white active:scale-95"
                      >
                        +{formatMoney(n)}
                      </button>
                    ))}
                    <button onClick={() => setContrib(g)} className="rounded-full bg-fin-input px-3 py-1.5 text-[13px] font-semibold text-fin-accent transition active:scale-95">
                      Custom…
                    </button>
                  </div>
                )}
                {g.notes && <div className="mt-2 text-[13px] text-fin-muted">{g.notes}</div>}
              </Tile>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="target">No savings goals yet. Add one — like an emergency fund or a new phone.</EmptyState>
      )}
      <GoalSheet open={adding} onClose={() => setAdding(false)} />
      <GoalSheet open={Boolean(editing)} goal={editing} onClose={() => setEditing(null)} />
      <ContributionSheet goal={contrib} onClose={() => setContrib(null)} />
    </FinCard>
  );
}

// Add a new goal, or edit one when `goal` is passed.
function GoalSheet({ open, onClose, goal }) {
  const { goalsCrud } = useFinance();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  // Fill the form each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title || "");
    setTarget(goal ? String(goal.targetAmount) : "");
    setSaved(goal ? String(goal.currentAmount) : "");
    setDate(goal?.targetDate || "");
    setNotes(goal?.notes || "");
  }, [open, goal]);

  const valid = title.trim() && parseFloat(target) > 0;

  async function save() {
    if (!valid) return;
    const data = {
      title: title.trim(),
      targetAmount: Math.round(parseFloat(target)),
      currentAmount: Math.round(parseFloat(saved) || 0),
      targetDate: date,
      notes: notes.trim(),
    };
    const ok = goal ? await goalsCrud.update(goal._id, data, "Goal updated") : await goalsCrud.create(data, "Goal added");
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? "Edit goal" : "New savings goal"}
      footer={
        <>
          {goal ? (
            <GhostButton className="!px-4 text-fin-danger" aria-label="Delete goal" onClick={() => { goalsCrud.remove(goal, "Goal deleted"); onClose(); }}>
              <Icon name="trash" size={20} />
            </GhostButton>
          ) : (
            <GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton>
          )}
          <PrimaryButton className="flex-1" disabled={!valid} onClick={save}>{goal ? "Save changes" : "Add goal"}</PrimaryButton>
        </>
      }
    >
      <Label>Goal</Label>
      <TextField autoFocus={!goal} placeholder="e.g. Emergency fund" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Label>Target</Label>
          <MoneyField value={target} onChange={setTarget} placeholder="100000" />
        </div>
        <div>
          <Label>Saved so far</Label>
          <MoneyField value={saved} onChange={setSaved} placeholder="0" />
        </div>
      </div>
      <Label>Target date (optional)</Label>
      <div className="flex gap-2">
        <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} className="[color-scheme:dark]" />
        {date && <GhostButton className="!px-4 !py-2 text-[14px]" onClick={() => setDate("")}>Clear</GhostButton>}
      </div>
      <Label>Notes (optional)</Label>
      <TextField value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Keep in a liquid fund" />
    </Sheet>
  );
}

function ContributionSheet({ goal, onClose }) {
  const { goalsCrud } = useFinance();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("add");
  const n = parseFloat(amount);

  async function save() {
    if (!(n > 0)) return;
    const next = mode === "add" ? goal.currentAmount + n : Math.max(0, goal.currentAmount - n);
    const ok = await goalsCrud.update(goal._id, { currentAmount: Math.round(next) }, mode === "add" ? "Added" : "Withdrawn");
    if (ok) { setAmount(""); onClose(); }
  }

  return (
    <Sheet
      open={Boolean(goal)}
      onClose={onClose}
      title={goal ? goal.title : ""}
      footer={<><GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton><PrimaryButton className="flex-1" disabled={!(n > 0)} onClick={save}>{mode === "add" ? "Add" : "Withdraw"}</PrimaryButton></>}
    >
      <div className="flex gap-2">
        <Pill active={mode === "add"} onClick={() => setMode("add")}>Add money</Pill>
        <Pill active={mode === "withdraw"} onClick={() => setMode("withdraw")}>Withdraw</Pill>
      </div>
      <MoneyField className="mt-4" autoFocus value={amount} onChange={setAmount} onEnter={save} />
      {goal && <div className="mt-3 text-[14px] text-fin-muted">Currently {formatMoney(goal.currentAmount)} of {formatMoney(goal.targetAmount)}</div>}
    </Sheet>
  );
}

// ---------- investments ----------
function Investments() {
  const { investments, investmentsCrud } = useFinance();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const invested = sum(investments, (i) => i.units * i.buyPrice);
  const current = sum(investments, (i) => i.units * i.currentValue);
  const gain = current - invested;
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;

  return (
    <FinCard
      title="Investments"
      delay={60}
      action={
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold transition hover:bg-[#30303a]">
          <Icon name="plus" size={15} stroke={2.4} /> Holding
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Tile className="text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-fin-muted">Invested</div>
          <div className="mt-1 text-[18px] font-extrabold sm:text-[22px]"><Money value={invested} compact={invested >= 100000} /></div>
        </Tile>
        <Tile className="text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-fin-muted">Value</div>
          <div className="mt-1 text-[18px] font-extrabold sm:text-[22px]"><Money value={current} compact={current >= 100000} /></div>
        </Tile>
        <Tile className="text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-fin-muted">Gain</div>
          <div className={`mt-1 text-[18px] font-extrabold sm:text-[22px] ${gain >= 0 ? "text-fin-savings" : "text-fin-danger"}`}>
            {gain >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
          </div>
        </Tile>
      </div>

      {investments.length ? (
        <div className="-mx-2 mt-4">
          {investments.map((i) => {
            const worth = i.units * i.currentValue;
            const g = worth - i.units * i.buyPrice;
            return (
              <button key={i._id} onClick={() => setEditing(i)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition hover:bg-fin-tile/70">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-fin-savings/15 text-fin-savings">
                  <Icon name="trend" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{i.name}</div>
                  <div className="truncate text-[13px] text-fin-muted">{TYPE_LABEL[i.type] || i.type} · {i.units} units</div>
                </div>
                <div className="text-right">
                  <div className="tabular text-[15px] font-bold">{formatMoney(worth)}</div>
                  <div className={`tabular text-[13px] font-semibold ${g >= 0 ? "text-fin-savings" : "text-fin-danger"}`}>{g >= 0 ? "+" : ""}{formatMoney(g)}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="trend">No holdings yet. Add your mutual funds, stocks or other investments.</EmptyState>
      )}

      <HoldingSheet open={adding} onClose={() => setAdding(false)} />
      <HoldingSheet open={Boolean(editing)} holding={editing} onClose={() => setEditing(null)} />
    </FinCard>
  );
}

function HoldingSheet({ open, onClose, holding }) {
  const { investmentsCrud } = useFinance();
  const [form, setForm] = useState(null);

  // Initialise the form when the sheet opens.
  if (open && !form) {
    setForm(
      holding
        ? { name: holding.name, type: holding.type, units: String(holding.units), buyPrice: String(holding.buyPrice), currentValue: String(holding.currentValue), notes: holding.notes || "" }
        : { name: "", type: "mutual_fund", units: "", buyPrice: "", currentValue: "", notes: "" }
    );
  }
  if (!open && form) setForm(null);
  if (!form) return null;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === "string" ? v : v.target.value }));
  const valid = form.name.trim() && parseFloat(form.units) > 0;

  async function save() {
    if (!valid) return;
    const data = {
      name: form.name.trim(),
      type: form.type,
      units: parseFloat(form.units) || 0,
      buyPrice: parseFloat(form.buyPrice) || 0,
      currentValue: parseFloat(form.currentValue) || parseFloat(form.buyPrice) || 0,
      notes: form.notes.trim(),
    };
    const ok = holding ? await investmentsCrud.update(holding._id, data, "Holding updated") : await investmentsCrud.create(data, "Holding added");
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={holding ? "Edit holding" : "New holding"}
      footer={
        <>
          {holding ? (
            <GhostButton className="!px-4 text-fin-danger" aria-label="Delete holding" onClick={() => { investmentsCrud.remove(holding, "Holding deleted"); onClose(); }}>
              <Icon name="trash" size={20} />
            </GhostButton>
          ) : (
            <GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton>
          )}
          <PrimaryButton className="flex-1" disabled={!valid} onClick={save}>{holding ? "Save changes" : "Add holding"}</PrimaryButton>
        </>
      }
    >
      <Label>Name</Label>
      <TextField autoFocus={!holding} placeholder="e.g. NIFTY 50 Index Fund" value={form.name} onChange={set("name")} />
      <Label>Type</Label>
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <Pill key={t.value} active={form.type === t.value} onClick={() => set("type")(t.value)}>{t.label}</Pill>
        ))}
      </div>
      <Label>Units</Label>
      <TextField type="number" inputMode="decimal" placeholder="0" value={form.units} onChange={set("units")} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Label>Buy price / unit</Label>
          <MoneyField value={form.buyPrice} onChange={set("buyPrice")} />
        </div>
        <div>
          <Label>Current / unit</Label>
          <MoneyField value={form.currentValue} onChange={set("currentValue")} autoFocus={Boolean(holding)} />
        </div>
      </div>
      <Label>Notes (optional)</Label>
      <TextField value={form.notes} onChange={set("notes")} placeholder="e.g. monthly SIP on the 5th" />
    </Sheet>
  );
}

function Label({ children }) {
  return <div className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted first:mt-0">{children}</div>;
}
