import { useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import { formatMoney, INVESTMENT_TYPES } from "./constants";
import { Card, SectionTitle, FieldLabel, Row, Select, Input, Textarea, Button, Empty, LogItem, Tag } from "../../components/ui.jsx";
import { useToast } from "../../components/Toast.jsx";

const TYPE_LABEL = { stock: "Stock", mutual_fund: "Mutual Fund", crypto: "Crypto", other: "Other" };

export default function InvestmentsSection() {
  const { items, loading, create, remove, update } = useCollection("finance-investments");
  const showToast = useToast();

  const [name, setName] = useState("");
  const [type, setType] = useState(INVESTMENT_TYPES[0]);
  const [units, setUnits] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [valueDrafts, setValueDrafts] = useState({});

  async function handleSave() {
    if (!name.trim()) { showToast("Name the holding", true); return; }
    setSaving(true);
    const ok = await create({
      name: name.trim(), type,
      units: parseFloat(units) || 0,
      buyPrice: parseFloat(buyPrice) || 0,
      currentValue: parseFloat(currentValue) || 0,
      notes: notes.trim(),
    });
    setSaving(false);
    if (ok) { setName(""); setUnits(""); setBuyPrice(""); setCurrentValue(""); setNotes(""); }
  }

  async function updateCurrentValue(item) {
    const raw = valueDrafts[item._id];
    const value = parseFloat(raw);
    if (isNaN(value)) { showToast("Enter a valid value", true); return; }
    await update(item._id, { currentValue: value });
  }

  const totalInvested = items.reduce((s, i) => s + i.units * i.buyPrice, 0);
  const totalCurrent = items.reduce((s, i) => s + i.units * i.currentValue, 0);
  const totalGain = totalCurrent - totalInvested;

  return (
    <div>
      <Card>
        <Row className="justify-between">
          <div>
            <FieldLabel>invested</FieldLabel>
            <div className="text-lg font-bold">{formatMoney(totalInvested)}</div>
          </div>
          <div>
            <FieldLabel>current value</FieldLabel>
            <div className="text-lg font-bold">{formatMoney(totalCurrent)}</div>
          </div>
          <div className="text-right">
            <FieldLabel>gain / loss</FieldLabel>
            <div className={`text-lg font-bold ${totalGain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {totalGain >= 0 ? "+" : ""}{formatMoney(totalGain)}
            </div>
          </div>
        </Row>
      </Card>

      <Card className="mt-4">
        <Row>
          <Input placeholder="Holding name — e.g. NIFTY 50 Index Fund" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {INVESTMENT_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </Select>
        </Row>
        <Row className="mt-2">
          <Input type="number" placeholder="Units" value={units} onChange={(e) => setUnits(e.target.value)} />
          <Input type="number" placeholder="Buy price / unit" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
          <Input type="number" placeholder="Current value / unit" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
        </Row>
        <Textarea className="mt-2" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Row className="mt-3 justify-end">
          <Button variant="accent" disabled={saving} onClick={handleSave}>Add holding</Button>
        </Row>
      </Card>

      <SectionTitle>Holdings</SectionTitle>
      <Card className="border-t-0">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : items.length ? (
          items.map((i) => {
            const invested = i.units * i.buyPrice;
            const current = i.units * i.currentValue;
            const gain = current - invested;
            return (
              <LogItem key={i._id} date="" onDelete={() => remove(i._id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{i.name}</span>
                  <Tag>{TYPE_LABEL[i.type] || i.type}</Tag>
                  <Tag>{i.units} units</Tag>
                  <span className={`text-sm font-semibold ${gain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {gain >= 0 ? "+" : ""}{formatMoney(gain)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  bought at {formatMoney(i.buyPrice)}/unit · now {formatMoney(i.currentValue)}/unit · worth {formatMoney(current)}
                </div>
                {i.notes ? <div className="mt-1 text-sm text-slate-500">{i.notes}</div> : null}
                <Row className="mt-2">
                  <Input
                    type="number"
                    placeholder="Update current value/unit"
                    className="max-w-[180px]"
                    value={valueDrafts[i._id] ?? ""}
                    onChange={(e) => setValueDrafts((d) => ({ ...d, [i._id]: e.target.value }))}
                  />
                  <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => updateCurrentValue(i)}>Update</Button>
                </Row>
              </LogItem>
            );
          })
        ) : (
          <Empty>No holdings logged yet.</Empty>
        )}
      </Card>
    </div>
  );
}
