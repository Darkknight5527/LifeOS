import { BUCKET, formatMoney } from "./lib";
import { Icon } from "./fin-ui.jsx";

// One expense line: bucket-coloured icon, subcategory, note, amount.
export default function ExpenseRow({ tx, onClick, showDate = false, dateLabel }) {
  const b = BUCKET[tx.bucket] || BUCKET.wants;
  const income = tx.type === "income";
  const got = income && tx.bucket === "received";
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-fin-tile/70 active:scale-[0.99]"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={got ? { background: "rgba(52,211,153,.14)", color: "#34d399" } : { background: b.soft, color: b.color }}>
        <Icon name={got ? "plus" : income ? "wallet" : b.icon} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{tx.category}</div>
        <div className="truncate text-[13px] text-fin-muted">
          {[showDate && dateLabel, got ? "Received" : income ? "Income" : b.label, tx.note].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className={`tabular shrink-0 text-[16px] font-bold ${income ? "text-fin-savings" : ""}`}>
        {income ? "+" : "−"}
        {formatMoney(tx.amount).replace("-", "")}
      </div>
    </button>
  );
}
