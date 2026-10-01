import { useMemo, useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import { useCategories } from "./useCategories";
import { formatMoney, currentMonthISO } from "./constants";
import { api } from "../../api";
import { useToast } from "../../components/Toast.jsx";
import { Card, SectionTitle, FieldLabel, Row, Select, Input, Button, Empty } from "../../components/ui.jsx";

export default function BudgetSection() {
  const categories = useCategories();
  const transactions = useCollection("finance-transactions");
  const budgets = useCollection("finance-budgets");
  const showToast = useToast();

  const [month, setMonth] = useState(currentMonthISO());
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingRow, setSavingRow] = useState(null);
  const [drafts, setDrafts] = useState({}); // categoryName -> draft amount string

  const monthBudgets = useMemo(
    () => budgets.items.filter((b) => b.month === month),
    [budgets.items, month]
  );
  const monthSpend = useMemo(() => {
    const totals = {};
    transactions.items
      .filter((t) => t.type === "expense" && (t.date || "").slice(0, 7) === month)
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      });
    return totals;
  }, [transactions.items, month]);

  async function saveBudget(categoryName) {
    const raw = drafts[categoryName];
    const amount = raw !== undefined ? parseFloat(raw) : null;
    if (amount === null || isNaN(amount)) { showToast("Enter a valid amount", true); return; }
    setSavingRow(categoryName);
    const existing = monthBudgets.find((b) => b.category === categoryName);
    try {
      if (existing) {
        await api.update("finance-budgets", existing._id, { amount });
      } else {
        await api.create("finance-budgets", { month, category: categoryName, amount });
      }
      await budgets.reload();
      showToast("Saved");
    } catch (err) {
      showToast(err.message || "Save failed", true);
    } finally {
      setSavingRow(null);
    }
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const ok = await categories.create({ name });
    if (ok) setNewCategoryName("");
  }

  const totalBudget = monthBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = Object.values(monthSpend).reduce((sum, v) => sum + v, 0);

  return (
    <div>
      <Card>
        <Row className="justify-between">
          <div>
            <FieldLabel>month</FieldLabel>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="max-w-[160px]" />
          </div>
          <div className="text-right">
            <FieldLabel>total budget vs spent</FieldLabel>
            <div className="text-lg font-bold">
              {formatMoney(totalSpent)} <span className="text-sm font-normal text-slate-400">/ {formatMoney(totalBudget)}</span>
            </div>
          </div>
        </Row>
      </Card>

      <SectionTitle>Categories</SectionTitle>
      <Card className="border-t-0">
        {categories.loading ? (
          <Empty>Loading…</Empty>
        ) : (
          categories.items.map((c) => {
            const existing = monthBudgets.find((b) => b.category === c.name);
            const budgetAmount = existing?.amount ?? 0;
            const spent = monthSpend[c.name] || 0;
            const pct = budgetAmount > 0 ? Math.min(100, Math.round((spent / budgetAmount) * 100)) : 0;
            const draftValue = drafts[c.name] ?? (existing ? String(existing.amount) : "");
            return (
              <div key={c._id} className="border-b border-slate-200 py-3 last:border-0 dark:border-slate-800">
                <Row className="justify-between">
                  <span className="font-semibold text-sm">{c.name}</span>
                  <span className="text-xs text-slate-400">
                    {formatMoney(spent)} / {formatMoney(budgetAmount)}
                  </span>
                </Row>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-emerald-600"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <Row className="mt-2">
                  <Input
                    type="number"
                    placeholder="Set budget amount"
                    value={draftValue}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.name]: e.target.value }))}
                    className="max-w-[160px]"
                  />
                  <Button variant="ghost" className="px-3 py-1.5 text-xs" disabled={savingRow === c.name} onClick={() => saveBudget(c.name)}>
                    Save
                  </Button>
                </Row>
              </div>
            );
          })
        )}

        <Row className="mt-4">
          <Input placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
          <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={addCategory}>+ Add category</Button>
        </Row>
      </Card>
    </div>
  );
}
