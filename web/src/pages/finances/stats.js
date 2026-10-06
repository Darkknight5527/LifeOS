import { useMemo } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { BUCKETS, addDays, isoDate, sum as rawSum, todayISO, weekStart } from "./lib";

// Totals rounded to paise, so 0.1 + 0.2 shows as 0.30 and "over by ₹0" can't happen.
const r2 = (n) => Math.round(n * 100) / 100;
const sum = (list, f) => r2(rawSum(list, f));

// Spending numbers for one month, shared by Home and Insights.
export function useMonthStats(key) {
  const { expenses, received, monthRecord } = useFinance();
  return useMemo(() => {
    const rec = monthRecord(key);
    const receivedList = received.filter((t) => (t.date || "").slice(0, 7) === key);
    const got = sum(receivedList, (t) => t.amount);
    const list = expenses.filter((t) => (t.date || "").slice(0, 7) === key);
    const spent = Object.fromEntries(BUCKETS.map((b) => [b.id, sum(list.filter((t) => t.bucket === b.id), (t) => t.amount)]));
    const total = sum(list, (t) => t.amount);
    const alloc = rec ? { needs: rec.needs || 0, wants: rec.wants || 0, savings: rec.savings || 0 } : null;
    const salary = rec?.salary || 0;
    // left = salary + money received − spent
    return { rec, list, spent, total, alloc, salary, received: got, receivedList, left: r2(salary + got - total) };
  }, [expenses, received, monthRecord, key]);
}

// Today / this week / this month totals relative to the real current date.
export function useNowTotals() {
  const { expenses, today: day } = useFinance();
  return useMemo(() => {
    const today = day || todayISO();
    const ws = weekStart();
    const wsISO = isoDate(ws);
    const weISO = isoDate(addDays(ws, 6));
    const month = today.slice(0, 7);
    return {
      today: sum(expenses.filter((t) => t.date === today), (t) => t.amount),
      week: sum(expenses.filter((t) => t.date >= wsISO && t.date <= weISO), (t) => t.amount),
      month: sum(expenses.filter((t) => (t.date || "").slice(0, 7) === month), (t) => t.amount),
      weekStart: ws,
    };
  }, [expenses, day]);
}
