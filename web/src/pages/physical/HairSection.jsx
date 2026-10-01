import { useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import {
  Card, SectionTitle, FieldLabel, FieldNote, Row, CheckPill, Select, Input, Textarea, Button,
  Empty, LogItem, Tag, fmtDate, todayISO,
} from "../../components/ui.jsx";

export default function HairSection() {
  const { items, loading, create, remove } = useCollection("hair-logs");

  const [washDone, setWashDone] = useState(false);
  const [hairFall, setHairFall] = useState("normal");
  const [scalpCondition, setScalpCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const ok = await create({ date, washDone, hairFall, scalpCondition: scalpCondition.trim(), notes: notes.trim() });
    setSaving(false);
    if (ok) {
      setWashDone(false); setHairFall("normal"); setScalpCondition(""); setNotes("");
    }
  }

  return (
    <div>
      <Card>
        <FieldNote>Reminder days: Wednesday & Sunday. Hair fall / scalp condition are only logged on wash days.</FieldNote>
        <div className="mt-3">
          <FieldLabel>wash day</FieldLabel>
          <CheckPill checked={washDone} onChange={(e) => setWashDone(e.target.checked)}>
            Oil + shampoo + conditioner done
          </CheckPill>
        </div>
        <div className="mt-3">
          <FieldLabel>hair fall</FieldLabel>
          <Select value={hairFall} onChange={(e) => setHairFall(e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </Select>
        </div>
        <div className="mt-3">
          <FieldLabel>scalp condition</FieldLabel>
          <Input placeholder="e.g. normal, dry, itchy, oily" value={scalpCondition} onChange={(e) => setScalpCondition(e.target.value)} />
        </div>
        <Textarea className="mt-3" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Row className="mt-3 justify-between">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button variant="accent" disabled={saving} onClick={handleSave}>Log day</Button>
        </Row>
      </Card>

      <SectionTitle>History</SectionTitle>
      <Card className="border-t-0">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : items.length ? (
          items.map((h) => (
            <LogItem key={h._id} date={fmtDate(h.date)} onDelete={() => remove(h._id)}>
              <div className="flex flex-wrap items-center gap-2">
                <Tag>{h.washDone ? "wash day done" : "no wash"}</Tag>
                {h.hairFall ? <Tag>fall: {h.hairFall}</Tag> : null}
                {h.scalpCondition ? <Tag>scalp: {h.scalpCondition}</Tag> : null}
              </div>
              {h.notes ? <div className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{h.notes}</div> : null}
            </LogItem>
          ))
        ) : (
          <Empty>No hair entries yet.</Empty>
        )}
      </Card>
    </div>
  );
}
