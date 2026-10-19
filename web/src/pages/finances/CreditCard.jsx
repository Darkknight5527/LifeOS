// Credit card: the bill building up this cycle, the last bill (pay by…, mark
// paid) and the card's settings. Card expenses already count in Needs/Wants
// when you log them — paying the bill just settles it, so nothing is counted twice.
import { useEffect, useMemo, useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { addDays, cardCycle, cardSettings, formatMoney, isoDate, parseISO, previousCycle, sum, toAmount } from "./lib";
import { FinCard, Icon, Money, PrimaryButton, ProgressBar, Sheet, TextField, cleanMoneyInput } from "./fin-ui.jsx";

const fmt = (iso, o = { day: "numeric", month: "short" }) => parseISO(iso).toLocaleDateString("en-IN", o);
const daysUntil = (from, to) => Math.round((parseISO(to) - parseISO(from)) / 86400000);

export default function CreditCard({ onGoTo, delay = 0 }) {
  const { expenses, settings, saveCard, today } = useFinance();
  const c = cardSettings(settings);
  const [edit, setEdit] = useState(false);

  const cur = cardCycle(today, c.billDay);
  const last = previousCycle(today, c.billDay);
  const cardTx = useMemo(() => expenses.filter((t) => t.card), [expenses]);
  const inCycle = (cy) => cardTx.filter((t) => t.date >= cy.start && t.date <= cy.end);
  const curList = inCycle(cur);
  const curTotal = sum(curList, (t) => t.amount);
  const lastTotal = sum(inCycle(last), (t) => t.amount);
  const payBy = isoDate(addDays(parseISO(last.end), c.payDays));
  const lastPaid = Boolean(c.paid?.[last.end]);
  const toBill = daysUntil(today, cur.end);
  const toPay = daysUntil(today, payBy);
  const used = !!cardTx.length;

  return (
    <FinCard
      title={<span className="flex items-center gap-2"><Icon name="card" size={15} /> {c.name}</span>}
      delay={delay}
      action={
        <button onClick={() => setEdit(true)} className="grid h-8 w-8 place-items-center rounded-xl text-fin-muted hover:bg-fin-tile hover:text-white" aria-label="Card settings">
          <Icon name="gear" size={16} />
        </button>
      }
    >
      {!used ? (
        <div className="text-[14px] leading-relaxed text-fin-muted">
          Switch on <b className="text-white/85">Paid with credit card</b> when you log an expense. Your bill builds up here, cycle by cycle — billed on the {ordinal(c.billDay)} of every month.
        </div>
      ) : (
        <>
          <button onClick={() => onGoTo("expenses", { bucket: "card" })} className="block w-full text-left">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[13px] text-fin-muted">This bill so far · {fmt(cur.start)} – {fmt(cur.end)}</div>
                <div className="mt-0.5 text-[30px] font-extrabold tracking-tight"><Money value={curTotal} /></div>
              </div>
              <div className="pb-1 text-right">
                <div className="tabular text-[22px] font-extrabold leading-none">{toBill}</div>
                <div className="text-[12px] text-fin-muted">{toBill === 0 ? "bill today" : `day${toBill === 1 ? "" : "s"} to bill`}</div>
              </div>
            </div>
            {c.limit > 0 && (
              <div className="mt-3">
                <ProgressBar value={curTotal} max={c.limit} color={curTotal > c.limit * 0.8 ? "#f87171" : "rgb(var(--fin-accent))"} />
                <div className="tabular mt-1 flex justify-between text-[12px] text-fin-muted">
                  <span>{Math.round((curTotal / c.limit) * 100)}% of limit</span>
                  <span>{formatMoney(Math.max(0, c.limit - curTotal))} available</span>
                </div>
              </div>
            )}
          </button>

          {lastTotal > 0 && (
            <div className={`mt-4 flex items-center gap-3 rounded-2xl px-3.5 py-3 ${lastPaid ? "bg-fin-input" : toPay <= 3 ? "bg-red-500/10 ring-1 ring-red-500/30" : "bg-fin-input"}`}>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-fin-muted">{fmt(last.end)} bill</div>
                <div className="tabular text-[18px] font-bold">{formatMoney(lastTotal)}</div>
                <div className={`text-[12.5px] ${lastPaid ? "text-fin-savings" : toPay < 0 ? "text-fin-danger" : "text-fin-muted"}`}>
                  {lastPaid ? "Paid" : toPay < 0 ? `Overdue by ${-toPay} day${toPay === -1 ? "" : "s"}` : toPay === 0 ? "Pay today" : `Pay by ${fmt(payBy)} · ${toPay} day${toPay === 1 ? "" : "s"}`}
                </div>
              </div>
              <button
                onClick={() => saveCard({ paid: { ...(c.paid || {}), [last.end]: !lastPaid } }, lastPaid ? "Marked as not paid" : "Bill marked as paid")}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-[13.5px] font-semibold transition ${lastPaid ? "bg-fin-savings/15 text-fin-savings" : "bg-fin-accent text-white hover:brightness-110"}`}
              >
                {lastPaid ? "✓ Paid" : "Mark paid"}
              </button>
            </div>
          )}
        </>
      )}
      <CardSettingsSheet open={edit} onClose={() => setEdit(false)} card={c} onSave={(patch) => saveCard(patch, "Card saved")} />
    </FinCard>
  );
}

const ordinal = (n) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

function CardSettingsSheet({ open, onClose, card, onSave }) {
  const [f, setF] = useState(card);
  useEffect(() => {
    if (open) setF({ ...card, limit: card.limit ? String(card.limit) : "" });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const day = Math.min(28, Math.max(1, Number(f.billDay) || 15));
  const pay = Math.min(60, Math.max(0, Number(f.payDays) || 0));
  const save = async () => {
    const ok = await onSave({ name: (f.name || "").trim() || "Credit card", billDay: day, payDays: pay, limit: Math.round(toAmount(f.limit) || 0) });
    if (ok) onClose();
  };
  const label = "mb-1.5 block text-[13px] font-semibold text-fin-muted";
  return (
    <Sheet open={open} onClose={onClose} title="Credit card" footer={<PrimaryButton className="flex-1" onClick={save}>Save</PrimaryButton>}>
      <div className="space-y-4">
        <label className="block">
          <span className={label}>Name</span>
          <TextField value={f.name || ""} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. HDFC Millennia" maxLength={40} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>Bill date (day of month)</span>
            <TextField type="number" min="1" max="28" inputMode="numeric" value={f.billDay} onChange={(e) => setF({ ...f, billDay: e.target.value })} />
          </label>
          <label className="block">
            <span className={label}>Pay within (days after bill)</span>
            <TextField type="number" min="0" max="60" inputMode="numeric" value={f.payDays} onChange={(e) => setF({ ...f, payDays: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className={label}>Credit limit (optional)</span>
          <TextField inputMode="decimal" value={f.limit} onChange={(e) => setF({ ...f, limit: cleanMoneyInput(e.target.value) })} placeholder="e.g. 100000" />
        </label>
        <div className="rounded-2xl bg-fin-input px-4 py-3 text-[13.5px] leading-relaxed text-fin-muted">
          Each bill covers what you spend from the day after one bill up to the next bill on the {ordinal(day)}. It's due {pay} day{pay === 1 ? "" : "s"} after the bill date — check your statement for the exact due date and set it here.
        </div>
      </div>
    </Sheet>
  );
}
