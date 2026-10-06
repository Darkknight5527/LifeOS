import { useEffect, useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { BUCKETS, amountError, formatMoney, monthLabel, splitByRatio, toAmount } from "./lib";
import { BucketDot, GhostButton, MoneyField, PrimaryButton, Sheet } from "./fin-ui.jsx";

export default function SalarySheet({ open, onClose, monthKeyValue }) {
  const { monthRecord, setSalary, ratio } = useFinance();
  const rec = monthRecord(monthKeyValue);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue(rec?.salary ? String(rec.salary) : "");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = Math.round(toAmount(value));
  const error = amountError(value, { label: "salary" });
  const valid = n > 0 && !error;
  const preview = valid ? splitByRatio(n, ratio) : null;

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    const ok = await setSalary(monthKeyValue, n);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit salary"
      footer={
        <>
          <GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton className="flex-1" disabled={!valid || busy} onClick={save}>{busy ? "Saving…" : "Save"}</PrimaryButton>
        </>
      }
    >
      <div className="text-[14px] text-fin-muted">Take-home for {monthLabel(monthKeyValue)}</div>
      <div className="mt-2"><MoneyField label="Take-home salary" value={value} onChange={setValue} autoFocus onEnter={save} placeholder="e.g. 60000" error={error} /></div>
      <p className="mt-3 text-[14px] leading-relaxed text-fin-muted">
        Changing salary re-splits using your current ratio ({ratio.needs} / {ratio.wants} / {ratio.savings}) and overwrites custom amounts.
      </p>
      {preview && (
        <div className="mt-4 space-y-2 rounded-2xl bg-fin-input p-4">
          {BUCKETS.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-[15px]">
              <span className="flex items-center gap-2"><BucketDot bucket={b} />{b.label}</span>
              <span className="tabular font-semibold">{formatMoney(preview[b.id])}</span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
