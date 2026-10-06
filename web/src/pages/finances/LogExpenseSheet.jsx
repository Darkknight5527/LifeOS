import { useEffect, useMemo, useRef, useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { BUCKETS, BUCKET, addDays, amountError, formatMoney, isoDate, toAmount, todayISO } from "./lib";
import { GhostButton, Icon, Pill, PrimaryButton, Segmented, Sheet, TextField, cleanMoneyInput } from "./fin-ui.jsx";
import { TypeSwitch } from "./ReceivedSheet.jsx";

const QUICK_ADD = [50, 100, 500, 1000];

/**
 * Add a new expense, or edit one when `editing` is passed.
 * Subcategories are picked as chips (no dropdown), grouped under the
 * selected bucket, and a new one can be created inline.
 */
export default function LogExpenseSheet({ open, onClose, editing, initialAmount, onSwitchToReceived }) {
  const { categories, addExpense, updateExpense, removeExpense, addCategory } = useFinance();

  const [amount, setAmount] = useState("");
  const [bucket, setBucket] = useState("needs");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState(null); // string while typing a new subcategory
  const amountRef = useRef(null);

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setAmount(String(editing.amount));
      setBucket(editing.bucket || "needs");
      setCategory(editing.category);
      setDate(editing.date);
      setNote(editing.note || "");
    } else {
      setAmount(initialAmount ? String(initialAmount) : "");
      setBucket("needs");
      setCategory("");
      setDate(todayISO());
      setNote("");
    }
    setNewCat(null);
    setTimeout(() => amountRef.current?.focus(), 250);
  }, [open, editing]);

  const bucketCats = useMemo(() => categories.filter((c) => c.bucket === bucket), [categories, bucket]);

  // An old expense whose subcategory was since deleted keeps it as an extra chip,
  // so saving an edit doesn't quietly move it to another subcategory.
  const orphan =
    editing && editing.type !== "income" && bucket === (editing.bucket || "needs") && !bucketCats.some((c) => c.name === editing.category)
      ? editing.category
      : null;

  // Fall back to the bucket's first subcategory if the picked one isn't in it.
  const activeCategory =
    bucketCats.some((c) => c.name === category) || (orphan && category === orphan) ? category : bucketCats[0]?.name || orphan || "";

  const amt = toAmount(amount);
  const error = amountError(amount);
  const valid = amt > 0 && !error && activeCategory;
  const today = todayISO();
  const yesterday = isoDate(addDays(new Date(), -1));

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    const data = { amount: amt, bucket, category: activeCategory, date, note: note.trim() };
    const ok = editing ? await updateExpense(editing._id, data) : await addExpense(data);
    setSaving(false);
    if (ok) onClose();
  }

  async function createCategory() {
    const doc = await addCategory(newCat || "", bucket);
    if (doc) {
      setCategory(doc.name);
      setNewCat(null);
    }
  }

  const accent = BUCKET[bucket].color;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit expense" : "Log expense"}
      footer={
        <>
          {editing ? (
            <GhostButton
              className="!px-4 text-fin-danger"
              onClick={() => {
                removeExpense(editing);
                onClose();
              }}
              aria-label="Delete expense"
            >
              <Icon name="trash" size={20} />
            </GhostButton>
          ) : (
            <GhostButton className="flex-1" onClick={onClose}>
              Cancel
            </GhostButton>
          )}
          <PrimaryButton className="flex-1" disabled={!valid || saving} onClick={save}>
            {saving ? "Saving…" : editing ? "Save changes" : "Save"}
          </PrimaryButton>
        </>
      }
    >
      {!editing && onSwitchToReceived && <TypeSwitch value="expense" onReceived={onSwitchToReceived} />}
      {/* Amount */}
      <div className="rounded-[24px] bg-fin-input px-5 py-5 text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-[28px] font-bold text-fin-faint">₹</span>
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(cleanMoneyInput(e.target.value))}
            aria-invalid={Boolean(error) || undefined}
            onKeyDown={(e) => e.key === "Enter" && save()}
            style={{ width: `${Math.max(1, amount.length) + 0.6}ch` }}
            className="tabular max-w-[260px] bg-transparent text-left text-[44px] font-extrabold leading-none text-white placeholder:text-white/20 outline-none"
            aria-label="Amount"
          />
        </div>
        {error && <div role="alert" className="mt-2 text-[14px] text-fin-danger">{error}</div>}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {QUICK_ADD.map((n) => (
            <button
              key={n}
              aria-label={`Add ${formatMoney(n)}`}
              onClick={() => setAmount(cleanMoneyInput(String(Math.round(((toAmount(amount) || 0) + n) * 100) / 100)))}
              className="rounded-full bg-fin-tile px-3 py-1 text-[13px] font-semibold text-fin-muted transition hover:text-white active:scale-95"
            >
              +{formatMoney(n)}
            </button>
          ))}
        </div>
      </div>

      {/* Bucket */}
      <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Category</div>
      <Segmented
        className="mt-2"
        value={bucket}
        onChange={setBucket}
        options={BUCKETS.map((b) => ({ value: b.id, label: b.label, dot: b.color }))}
      />

      {/* Subcategory chips */}
      <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Subcategory</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {bucketCats.map((c) => (
          <Pill key={c._id} active={c.name === activeCategory} color={accent} onClick={() => setCategory(c.name)}>
            {c.name}
          </Pill>
        ))}
        {orphan && (
          <Pill active={orphan === activeCategory} color={accent} onClick={() => setCategory(orphan)} title="This subcategory was deleted">
            {orphan} <span className="text-[12px] font-medium opacity-70">(deleted)</span>
          </Pill>
        )}
        {newCat === null ? (
          <Pill onClick={() => setNewCat("")} className="!text-fin-muted">
            <Icon name="plus" size={14} stroke={2.4} /> New
          </Pill>
        ) : (
          <div className="flex w-full gap-2">
            <TextField
              autoFocus
              placeholder={`New ${BUCKET[bucket].label.toLowerCase()} subcategory`}
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createCategory();
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setNewCat(null);
                }
              }}
              className="!py-2.5"
            />
            <GhostButton className="!py-2.5" onClick={createCategory}>
              Add
            </GhostButton>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">When</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Pill active={date === today} onClick={() => setDate(today)}>
          Today
        </Pill>
        <Pill active={date === yesterday} onClick={() => setDate(yesterday)}>
          Yesterday
        </Pill>
        <label
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[14px] font-semibold ${
            date !== today && date !== yesterday ? "border-fin-accent bg-fin-accent/10 text-fin-accent" : "border-transparent bg-fin-input text-white/85"
          }`}
        >
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="bg-transparent text-[14px] outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:ml-1"
            aria-label="Pick a date"
          />
        </label>
      </div>

      {/* Note */}
      <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Note (optional)</div>
      <TextField
        className="mt-2"
        placeholder="e.g. Lunch with team"
        aria-label="Note"
        maxLength={200}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
    </Sheet>
  );
}
