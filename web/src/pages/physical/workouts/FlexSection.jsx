import { useState } from "react";
import { useCollection } from "../../../hooks/useCollection";
import {
  Card, SectionTitle, FieldLabel, Row, Select, Input, Textarea, ScaleRow, Button,
  Empty, LogItem, Tag, fmtDate, todayISO,
} from "../../../components/ui.jsx";
import { useToast } from "../../../components/Toast.jsx";

export default function FlexSection() {
  const { items, loading, create, remove } = useCollection("workout-flex");
  const showToast = useToast();

  const [type, setType] = useState("flexibility");
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState(todayISO());
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!activity.trim()) { showToast("Name the activity", true); return; }
    setSaving(true);
    const ok = await create({
      date, type, activity: activity.trim(),
      duration: duration ? parseInt(duration, 10) : null,
      intensity, notes: notes.trim(),
    });
    setSaving(false);
    if (ok) {
      setActivity(""); setDuration(""); setIntensity(null); setNotes(""); setType("flexibility");
    }
  }

  return (
    <div>
      <Card>
        <Row>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="flexibility">Flexibility</option>
            <option value="sport">Sport</option>
          </Select>
          <Input placeholder="Activity — e.g. Yoga, Badminton" value={activity} onChange={(e) => setActivity(e.target.value)} />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Row>
        <Row className="mt-2">
          <Input type="number" placeholder="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Row>
        <div className="mt-2">
          <FieldLabel>intensity (1–5)</FieldLabel>
          <ScaleRow value={intensity} onChange={setIntensity} />
        </div>
        <Textarea className="mt-2" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Row className="mt-3 justify-end">
          <Button variant="accent" disabled={saving} onClick={handleSave}>Log session</Button>
        </Row>
      </Card>

      <SectionTitle>History</SectionTitle>
      <Card className="border-t-0">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : items.length ? (
          items.map((f) => (
            <LogItem key={f._id} date={fmtDate(f.date)} onDelete={() => remove(f._id)}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-emerald-600">{f.activity}</span>
                <Tag>{f.type}</Tag>
                {f.duration ? <Tag>{f.duration} min</Tag> : null}
                {f.intensity ? <Tag>intensity {f.intensity}/5</Tag> : null}
              </div>
              {f.notes ? <div className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{f.notes}</div> : null}
            </LogItem>
          ))
        ) : (
          <Empty>No sessions logged yet.</Empty>
        )}
      </Card>
    </div>
  );
}
