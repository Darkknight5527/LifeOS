import { useEffect, useMemo, useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { BUCKETS, addDays, dayHeading, formatMoney, isoDate, monthLabel, shiftMonth, sum, todayISO, weekStart } from "./lib";
import { EmptyState, FinCard, Icon, MonthNav, Pill, Segmented } from "./fin-ui.jsx";
import ExpenseRow from "./ExpenseRow.jsx";

export default function ExpensesTab({ onEdit, initialBucket = "all" }) {
  const { expenses, transactions, currentMonth } = useFinance();
  const [month, setMonth] = useState(currentMonth);
  const [range, setRange] = useState("month");
  const [bucket, setBucket] = useState(initialBucket);
  const [query, setQuery] = useState("");

  useEffect(() => setBucket(initialBucket), [initialBucket]);

  const isCurrent = month === currentMonth;
  const activeRange = isCurrent ? range : "month";

  // Old income entries (from before the rework) still show up, marked as income.
  const all = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").map((t) => ({ ...t, bucket: "savings" }));
    return [...expenses, ...income].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  }, [expenses, transactions]);

  const filtered = useMemo(() => {
    const today = todayISO();
    const ws = isoDate(weekStart());
    const we = isoDate(addDays(weekStart(), 6));
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if ((t.date || "").slice(0, 7) !== month) return false;
      if (activeRange === "today" && t.date !== today) return false;
      if (activeRange === "week" && (t.date < ws || t.date > we)) return false;
      if (bucket !== "all" && (t.type === "income" || t.bucket !== bucket)) return false;
      if (q && !`${t.category} ${t.note || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, month, activeRange, bucket, query]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((t) => {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    });
    return [...map.entries()];
  }, [filtered]);

  const total = sum(filtered.filter((t) => t.type !== "income"), (t) => t.amount);

  return (
    // Laptops: filters stay pinned on the left while the list scrolls on the right.
    <div className="grid grid-cols-1 items-start gap-5 lg:gap-4 lg:grid-cols-[minmax(320px,400px)_1fr] [&>*]:min-w-0">
      <div className="space-y-5 lg:sticky lg:top-[92px]">
      <MonthNav
        label={monthLabel(month)}
        sub={isCurrent ? "This month" : month < currentMonth ? "Past month" : "Upcoming"}
        onPrev={() => setMonth((m) => shiftMonth(m, -1))}
        onNext={() => setMonth((m) => shiftMonth(m, 1))}
        canNext={month < currentMonth}
      />

      <FinCard delay={40} className="!p-4 sm:!p-5">
        {isCurrent && (
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: "today", label: "Today" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        )}
        <div className={`fin-scrollbar-none flex gap-2 overflow-x-auto lg:flex-wrap ${isCurrent ? "mt-3" : ""}`}>
          <Pill active={bucket === "all"} onClick={() => setBucket("all")} className="!px-3.5">All</Pill>
          {BUCKETS.map((b) => (
            <Pill key={b.id} active={bucket === b.id} color={b.color} onClick={() => setBucket(b.id)} className="!gap-1.5 !px-3.5">
              <span className="hidden h-2 w-2 rounded-full min-[420px]:inline-block" style={{ background: b.color }} />
              {b.label}
            </Pill>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-fin-input px-4 focus-within:ring-1 focus-within:ring-fin-accent/60">
          <Icon name="search" size={18} className="text-fin-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subcategory or note"
            className="w-full bg-transparent py-3 text-[15px] text-white placeholder:text-fin-faint outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="text-fin-faint hover:text-white">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </FinCard>

      </div>
      <FinCard
        className="lg:flex lg:max-h-[calc(100dvh-100px)] lg:flex-col"
        title="Logged expenses"
        delay={80}
        action={filtered.length > 0 && <span className="tabular text-[15px] font-bold">{formatMoney(total)}</span>}
      >
        {groups.length ? (
          <div className="fin-scroll space-y-4 lg:-mr-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-3">
            {groups.map(([date, list]) => (
              <div key={date}>
                <div className="mb-1 flex items-center justify-between px-2 text-[13px] font-semibold text-fin-muted">
                  <span>{dayHeading(date)}</span>
                  <span className="tabular">{formatMoney(sum(list.filter((t) => t.type !== "income"), (t) => t.amount))}</span>
                </div>
                <div className="-mx-2">
                  {list.map((t) => (
                    <ExpenseRow key={t._id} tx={t} onClick={() => t.type !== "income" && onEdit(t)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>
            {query || bucket !== "all" ? "Nothing matches these filters." : <>No expenses in this period.<br />Tap + to add one.</>}
          </EmptyState>
        )}
      </FinCard>
    </div>
  );
}
