import { useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import { formatMoney } from "./constants";
import { Card, SectionTitle, Row, Input, Textarea, Button, Empty, LogItem } from "../../components/ui.jsx";
import { useToast } from "../../components/Toast.jsx";

export default function SavingsSection() {
  const { items, loading, create, remove, update } = useCollection("finance-savings-goals");
  const showToast = useToast();

  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [contribDrafts, setContribDrafts] = useState({});

  async function handleSave() {
    if (!title.trim()) { showToast("Name the goal", true); return; }
    const amt = parseFloat(targetAmount);
    if (!amt || amt <= 0) { showToast("Enter a valid target amount", true); return; }
    setSaving(true);
    const ok = await create({ title: title.trim(), targetAmount: amt, currentAmount: 0, targetDate, notes: notes.trim() });
    setSaving(false);
    if (ok) { setTitle(""); setTargetAmount(""); setTargetDate(""); setNotes(""); }
  }

  async function addContribution(goal) {
    const raw = contribDrafts[goal._id];
    const add = parseFloat(raw);
    if (!add || add <= 0) { showToast("Enter a valid amount", true); return; }
    await update(goal._id, { currentAmount: goal.currentAmount + add });
    setContribDrafts((d) => ({ ...d, [goal._id]: "" }));
  }

  return (
    <div>
      <Card>
        <Row>
          <Input placeholder="Goal — e.g. Emergency fund" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="number" placeholder="Target amount" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="max-w-[160px]" />
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} title="target date" />
        </Row>
        <Textarea className="mt-2" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Row className="mt-3 justify-end">
          <Button variant="accent" disabled={saving} onClick={handleSave}>Add goal</Button>
        </Row>
      </Card>

      <SectionTitle>Tracking</SectionTitle>
      <Card className="border-t-0">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : items.length ? (
          items.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
            return (
              <LogItem key={g._id} date="" onDelete={() => remove(g._id)}>
                <Row className="justify-between">
                  <span className="font-bold">{g.title}</span>
                  <span className="text-sm text-slate-400">
                    {formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)}
                  </span>
                </Row>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                </div>
                {g.targetDate ? <div className="mt-1 text-xs text-slate-400">target: {g.targetDate}</div> : null}
                {g.notes ? <div className="mt-1 text-sm text-slate-500">{g.notes}</div> : null}
                <Row className="mt-2">
                  <Input
                    type="number"
                    placeholder="Add contribution"
                    className="max-w-[160px]"
                    value={contribDrafts[g._id] ?? ""}
                    onChange={(e) => setContribDrafts((d) => ({ ...d, [g._id]: e.target.value }))}
                  />
                  <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => addContribution(g)}>Add</Button>
                </Row>
              </LogItem>
            );
          })
        ) : (
          <Empty>No savings goals yet.</Empty>
        )}
      </Card>
    </div>
  );
}
