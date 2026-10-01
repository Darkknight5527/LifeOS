import { useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import { useCategories } from "./useCategories";
import { formatMoney } from "./constants";
import { Card, SectionTitle, Row, Select, Input, Textarea, Button, Empty, LogItem, Tag, fmtDate, todayISO } from "../../components/ui.jsx";
import { useToast } from "../../components/Toast.jsx";

export default function TransactionsSection() {
  const { items, loading, create, remove } = useCollection("finance-transactions");
  const categories = useCategories();
  const showToast = useToast();

  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const activeCategory = category || categories.items[0]?.name || "";

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { showToast("Enter a valid amount", true); return; }
    if (!activeCategory) { showToast("Pick a category", true); return; }
    setSaving(true);
    const ok = await create({ date, type, category: activeCategory, amount: amt, note: note.trim() });
    setSaving(false);
    if (ok) { setAmount(""); setNote(""); }
  }

  const totalIncome = items.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = items.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <Card>
        <Row className="justify-between">
          <div>
            <div className="font-mono text-[10.5px] uppercase text-slate-400">income</div>
            <div className="text-lg font-bold text-emerald-600">{formatMoney(totalIncome)}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10.5px] uppercase text-slate-400">expense</div>
            <div className="text-lg font-bold text-red-500">{formatMoney(totalExpense)}</div>
          </div>
        </Row>
      </Card>

      <Card className="mt-4">
        <Row>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
          <Select value={activeCategory} onChange={(e) => setCategory(e.target.value)}>
            {categories.items.map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </Select>
          <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="max-w-[140px]" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Row>
        <Textarea className="mt-2" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Row className="mt-3 justify-end">
          <Button variant="accent" disabled={saving} onClick={handleSave}>Log transaction</Button>
        </Row>
      </Card>

      <SectionTitle>History</SectionTitle>
      <Card className="border-t-0">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : items.length ? (
          items.map((t) => (
            <LogItem key={t._id} date={fmtDate(t.date)} onDelete={() => remove(t._id)}>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${t.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                  {t.type === "income" ? "+" : "-"}{formatMoney(t.amount)}
                </span>
                <Tag>{t.category}</Tag>
              </div>
              {t.note ? <div className="mt-1 text-sm text-slate-500">{t.note}</div> : null}
            </LogItem>
          ))
        ) : (
          <Empty>No transactions logged yet.</Empty>
        )}
      </Card>
    </div>
  );
}
