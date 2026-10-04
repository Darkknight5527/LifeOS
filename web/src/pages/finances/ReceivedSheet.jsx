// Log money that came in outside your salary — cashback, a refund, a loan
// someone paid back, a gift. It adds to what's left this month.
import { useEffect, useRef, useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { addDays, formatMoney, isoDate, todayISO } from "./lib";
import { GhostButton, Icon, Pill, PrimaryButton, Sheet, TextField } from "./fin-ui.jsx";

export const SOURCES = ["Cashback", "Refund", "Loan repaid", "Gift", "Interest", "Reimbursement", "Other"];
const QUICK = [50, 100, 500, 1000];

export default function ReceivedSheet({ open, onClose, editing, onSwitchToExpense }) {
  const { addExpense, updateExpense, removeExpense } = useFinance();
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("Cashback");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setAmount(editing ? String(editing.amount) : "");
    setSource(editing?.category || "Cashback");
    setNote(editing?.note || "");
    setDate(editing?.date || todayISO());
    setTimeout(() => amountRef.current?.focus(), 250);
  }, [open, editing]);

  const amt = parseFloat(amount);
  const valid = amt > 0;
  const today = todayISO();
  const yesterday = isoDate(addDays(new Date(), -1));
  const notePlaceholder = source === "Loan repaid" ? "Who paid you back?" : source === "Cashback" ? "e.g. Amazon Pay, credit card" : "From whom / what for";

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    const data = { type: "income", bucket: "received", category: source, amount: Math.round(amt * 100) / 100, date, note: note.trim() };
    const ok = editing ? await updateExpense(editing._id, data) : await addExpense(data);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit money received" : "Money received"}
      footer={
        <>
          {editing ? (
            <GhostButton className="!px-4 text-fin-danger" aria-label="Delete entry" onClick={() => { removeExpense(editing); onClose(); }}>
              <Icon name="trash" size={20} />
            </GhostButton>
          ) : (
            <GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton>
          )}
          <PrimaryButton className="flex-1" disabled={!valid || saving} onClick={save}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add money"}
          </PrimaryButton>
        </>
      }
    >
      {!editing && onSwitchToExpense && <TypeSwitch value="received" onExpense={onSwitchToExpense} />}

      <div className="rounded-[24px] bg-fin-savings/10 px-5 py-5 text-center ring-1 ring-fin-savings/20">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-[28px] font-bold text-fin-savings/70">+₹</span>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            style={{ width: `${Math.max(1, amount.length) + 0.6}ch` }}
            className="tabular max-w-[260px] bg-transparent text-left text-[44px] font-extrabold leading-none text-white placeholder:text-white/20 outline-none"
            aria-label="Amount received"
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {QUICK.map((n) => (
            <button key={n} onClick={() => setAmount(String((parseFloat(amount) || 0) + n))} className="rounded-full bg-fin-tile px-3 py-1 text-[13px] font-semibold text-fin-muted transition hover:text-white active:scale-95">
              +{formatMoney(n)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">What is it?</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {SOURCES.map((s) => (
          <Pill key={s} active={source === s} color="#34d399" onClick={() => setSource(s)}>
            {s}
          </Pill>
        ))}
      </div>

      <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Note</div>
      <TextField className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder={notePlaceholder} onKeyDown={(e) => e.key === "Enter" && save()} />

      <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">When</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Pill active={date === today} onClick={() => setDate(today)}>Today</Pill>
        <Pill active={date === yesterday} onClick={() => setDate(yesterday)}>Yesterday</Pill>
        <label className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[14px] font-semibold ${date !== today && date !== yesterday ? "border-fin-accent bg-fin-accent/10 text-fin-accent" : "border-transparent bg-fin-input text-white/85"}`}>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="bg-transparent text-[14px] outline-none [color-scheme:dark]" aria-label="Pick a date" />
        </label>
      </div>
      <p className="mt-4 text-[12.5px] text-fin-faint">This adds to what's left this month. It doesn't change your Needs / Wants / Savings split.</p>
    </Sheet>
  );
}

// "Expense | Money received" switch at the top of the log sheets.
export function TypeSwitch({ value, onExpense, onReceived }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-fin-input p-1" role="tablist" aria-label="Entry type">
      {[
        ["expense", "Expense", "receipt", onExpense],
        ["received", "Money received", "plus", onReceived],
      ].map(([id, label, icon, fn]) => (
        <button
          key={id}
          role="tab"
          aria-selected={value === id}
          onClick={() => value !== id && fn?.()}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 text-[14px] font-semibold transition ${
            value === id ? (id === "received" ? "bg-fin-savings/15 text-fin-savings" : "bg-fin-tile text-white") : "text-fin-muted hover:text-white"
          }`}
        >
          <Icon name={icon} size={15} stroke={2.2} /> {label}
        </button>
      ))}
    </div>
  );
}
