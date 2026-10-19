// Credit card, kept completely apart: card purchases don't touch your balance,
// Needs/Wants or spending. When you pay a bill you log the payment here — that
// payment is the expense that counts (split across Needs/Wants/Savings the
// same way the card purchases were).
import { useEffect, useMemo, useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { BUCKET, BUCKETS, addDays, amountError, cardCycle, cardSettings, formatMoney, isoDate, parseISO, previousCycle, sum, toAmount } from "./lib";
import { FinCard, Icon, Money, Pill, PrimaryButton, ProgressBar, Sheet, TextField, cleanMoneyInput } from "./fin-ui.jsx";

const fmt = (iso, o = { day: "numeric", month: "short" }) => parseISO(iso).toLocaleDateString("en-IN", o);
const daysUntil = (from, to) => Math.round((parseISO(to) - parseISO(from)) / 86400000);
const r2 = (n) => Math.round(n * 100) / 100;
const ordinal = (n) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** Every bill so far (newest first): what was bought in its cycle and what's been paid. */
function useBills() {
  const { cardExpenses, expenses, settings, today } = useFinance();
  const c = cardSettings(settings);
  return useMemo(() => {
    const payments = expenses.filter((t) => t.cardBill);
    const bills = [];
    let cy = previousCycle(today, c.billDay);
    for (let i = 0; i < 12; i++) {
      const bought = cardExpenses.filter((t) => t.date >= cy.start && t.date <= cy.end);
      const paidList = payments.filter((t) => t.cardBill === cy.end);
      const total = r2(sum(bought, (t) => t.amount));
      const paid = r2(sum(paidList, (t) => t.amount));
      if (total > 0 || paid > 0) bills.push({ ...cy, bought, total, paid, paidList, left: r2(Math.max(0, total - paid)), payBy: isoDate(addDays(parseISO(cy.end), c.payDays)) });
      cy = previousCycle(cy.start, c.billDay);
    }
    return bills;
  }, [cardExpenses, expenses, c.billDay, c.payDays, today]);
}

export default function CreditCard({ onGoTo, delay = 0 }) {
  const { cardExpenses, settings, saveCard, today } = useFinance();
  const c = cardSettings(settings);
  const [edit, setEdit] = useState(false);
  const [paying, setPaying] = useState(null); // bill being paid
  const bills = useBills();

  const cur = cardCycle(today, c.billDay);
  const curTotal = sum(cardExpenses.filter((t) => t.date >= cur.start && t.date <= cur.end), (t) => t.amount);
  const toBill = daysUntil(today, cur.end);
  const last = bills.find((b) => b.end === previousCycle(today, c.billDay).end);
  const olderUnpaid = bills.filter((b) => b !== last && b.left > 0);

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
      {!cardExpenses.length && !bills.length ? (
        <div className="text-[14px] leading-relaxed text-fin-muted">
          Switch on <b className="text-white/85">Paid with credit card</b> when you log an expense. It's kept apart from your balance; your bill builds up here, billed on the {ordinal(c.billDay)}. When you pay the bill, log the payment here.
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
            <div className="mt-2 text-[12px] text-fin-faint">Not taken from your balance until you pay the bill.</div>
          </button>
          {last && <BillRow bill={last} today={today} onPay={() => setPaying(last)} />}
          {olderUnpaid.map((b) => <BillRow key={b.end} bill={b} today={today} onPay={() => setPaying(b)} compact />)}
        </>
      )}
      <PaySheet bill={paying} onClose={() => setPaying(null)} />
      <CardSettingsSheet open={edit} onClose={() => setEdit(false)} card={c} onSave={(patch) => saveCard(patch, "Card saved")} />
    </FinCard>
  );
}

function BillRow({ bill, today, onPay, compact = false }) {
  const done = bill.left <= 0 && bill.paid > 0;
  const toPay = daysUntil(today, bill.payBy);
  const urgent = !done && toPay <= 3;
  return (
    <div className={`mt-3 flex items-center gap-3 rounded-2xl px-3.5 ${compact ? "py-2" : "py-3"} ${urgent ? "bg-red-500/10 ring-1 ring-red-500/30" : "bg-fin-input"}`}>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-fin-muted">{fmt(bill.end)} bill</div>
        <div className="tabular text-[18px] font-bold">{formatMoney(bill.total)}</div>
        <div className={`text-[12.5px] ${done ? "text-fin-savings" : toPay < 0 ? "text-fin-danger" : "text-fin-muted"}`}>
          {done
            ? `Paid${bill.paidList[0] ? ` on ${fmt(bill.paidList[bill.paidList.length - 1].date)}` : ""}${bill.paid !== bill.total ? ` · ${formatMoney(bill.paid)}` : ""}`
            : bill.paid > 0
              ? `${formatMoney(bill.paid)} paid · ${formatMoney(bill.left)} left`
              : toPay < 0
                ? `Overdue by ${-toPay} day${toPay === -1 ? "" : "s"}`
                : toPay === 0
                  ? "Pay today"
                  : `Pay by ${fmt(bill.payBy)} · ${toPay} day${toPay === 1 ? "" : "s"}`}
        </div>
      </div>
      {done ? (
        <span className="shrink-0 rounded-xl bg-fin-savings/15 px-3.5 py-2 text-[13.5px] font-semibold text-fin-savings">✓ Paid</span>
      ) : (
        <button onClick={onPay} className="shrink-0 rounded-xl bg-fin-accent px-3.5 py-2 text-[13.5px] font-semibold text-white transition hover:brightness-110">
          Pay bill
        </button>
      )}
    </div>
  );
}

// Log a bill payment. It's split across Needs / Wants / Savings in the same
// shares as that cycle's card purchases, so your buckets stay accurate.
function PaySheet({ bill, onClose }) {
  const { addExpense, today } = useFinance();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (bill) {
      setAmount(String(bill.left || bill.total));
      setDate(today);
    }
  }, [bill]); // eslint-disable-line react-hooks/exhaustive-deps
  const amt = toAmount(amount);
  const error = amountError(amount);
  const shares = useMemo(() => {
    if (!bill) return [];
    const by = Object.fromEntries(BUCKETS.map((b) => [b.id, sum(bill.bought.filter((t) => t.bucket === b.id), (t) => t.amount)]));
    const base = sum(Object.values(by), (v) => v) || 1;
    const list = BUCKETS.filter((b) => by[b.id] > 0).map((b) => ({ bucket: b.id, part: r2((amt || 0) * (by[b.id] / base)) }));
    if (!list.length) return [{ bucket: "needs", part: amt || 0 }];
    // Rounding leftovers go to the biggest share.
    const diff = r2((amt || 0) - sum(list, (x) => x.part));
    if (diff) list.sort((a, b) => b.part - a.part)[0].part = r2(list[0].part + diff);
    return list;
  }, [bill, amt]);

  if (!bill) return null;
  const save = async () => {
    if (!(amt > 0) || error || saving) return;
    setSaving(true);
    let ok = true;
    for (const s of shares) {
      if (!(s.part > 0)) continue;
      const doc = await addExpense({ amount: s.part, bucket: s.bucket, category: "Credit card bill", date, note: `${fmt(bill.end)} bill`, cardBill: bill.end });
      ok = ok && Boolean(doc);
    }
    setSaving(false);
    if (ok) onClose();
  };
  return (
    <Sheet open onClose={onClose} title={`Pay the ${fmt(bill.end)} bill`} footer={<PrimaryButton className="flex-1" disabled={!(amt > 0) || Boolean(error) || saving} onClick={save}>{saving ? "Saving…" : `Log payment · ${formatMoney(amt || 0)}`}</PrimaryButton>}>
      <div className="rounded-2xl bg-fin-input px-4 py-3 text-[14px] text-fin-muted">
        Bill <b className="tabular text-white">{formatMoney(bill.total)}</b> · {bill.bought.length} purchase{bill.bought.length === 1 ? "" : "s"} from {fmt(bill.start)} to {fmt(bill.end)}
        {bill.paid > 0 && <> · <b className="text-white">{formatMoney(bill.paid)}</b> already paid</>}
      </div>
      <div className="mt-4 text-[13px] font-semibold text-fin-muted">Amount you paid</div>
      <div className="mt-2 flex items-baseline gap-1 rounded-2xl bg-fin-input px-4 py-3">
        <span className="text-[22px] font-bold text-fin-faint">₹</span>
        <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(cleanMoneyInput(e.target.value))} onKeyDown={(e) => e.key === "Enter" && save()} className="tabular w-full bg-transparent text-[30px] font-extrabold text-white outline-none" aria-label="Amount paid" />
      </div>
      {error && <div role="alert" className="mt-2 text-[14px] text-fin-danger">{error}</div>}
      <div className="mt-2 text-[12.5px] text-fin-faint">Change it if you paid a different amount (part payment, interest, fees).</div>

      <div className="mt-4 text-[13px] font-semibold text-fin-muted">Paid on</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Pill active={date === today} onClick={() => setDate(today)}>Today</Pill>
        <label className={`flex items-center rounded-full border px-3 py-1.5 text-[14px] font-semibold ${date !== today ? "border-fin-accent bg-fin-accent/10 text-fin-accent" : "border-transparent bg-fin-input text-white/85"}`}>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="bg-transparent outline-none [color-scheme:dark]" aria-label="Payment date" />
        </label>
      </div>

      <div className="mt-4 text-[13px] font-semibold text-fin-muted">Comes out of</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {shares.map((s) => (
          <span key={s.bucket} className="flex items-center gap-2 rounded-full bg-fin-input px-3.5 py-1.5 text-[14px]">
            <span className="h-2 w-2 rounded-full" style={{ background: BUCKET[s.bucket].color }} />
            {BUCKET[s.bucket].label} <b className="tabular">{formatMoney(s.part)}</b>
          </span>
        ))}
      </div>
      <div className="mt-2 text-[12.5px] text-fin-faint">Split the same way as what you bought on the card. This is what's taken from your balance.</div>
    </Sheet>
  );
}

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
