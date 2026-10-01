import { useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import {
  Card, SectionTitle, FieldLabel, Row, CheckPill, ScaleRow, Chip, Textarea, Input, Button,
  Empty, LogItem, Tag, fmtDate, todayISO,
} from "../../components/ui.jsx";

const CONCERN_TAGS = ["acne", "dryness", "oiliness", "tan", "irritation", "none"];

export default function SkinSection() {
  const { items, loading, create, remove } = useCollection("skin-logs");

  const [amCleanser, setAmCleanser] = useState(false);
  const [amMoisturizer, setAmMoisturizer] = useState(false);
  const [amSunscreen, setAmSunscreen] = useState(false);
  const [pmCleanser, setPmCleanser] = useState(false);
  const [pmMoisturizer, setPmMoisturizer] = useState(false);
  const [condition, setCondition] = useState(null);
  const [concerns, setConcerns] = useState(new Set());
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  function toggleConcern(tag) {
    setConcerns((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const ok = await create({
      date,
      amCleanser, amMoisturizer, amSunscreen, pmCleanser, pmMoisturizer,
      condition, concerns: Array.from(concerns), notes: notes.trim(),
    });
    setSaving(false);
    if (ok) {
      setAmCleanser(false); setAmMoisturizer(false); setAmSunscreen(false);
      setPmCleanser(false); setPmMoisturizer(false);
      setCondition(null); setConcerns(new Set()); setNotes("");
    }
  }

  return (
    <div>
      <Card>
        <FieldLabel>morning</FieldLabel>
        <Row className="mb-3">
          <CheckPill checked={amCleanser} onChange={(e) => setAmCleanser(e.target.checked)}>Cleanser</CheckPill>
          <CheckPill checked={amMoisturizer} onChange={(e) => setAmMoisturizer(e.target.checked)}>Moisturizer</CheckPill>
          <CheckPill checked={amSunscreen} onChange={(e) => setAmSunscreen(e.target.checked)}>Sunscreen</CheckPill>
        </Row>
        <FieldLabel>evening</FieldLabel>
        <Row className="mb-3">
          <CheckPill checked={pmCleanser} onChange={(e) => setPmCleanser(e.target.checked)}>Cleanser</CheckPill>
          <CheckPill checked={pmMoisturizer} onChange={(e) => setPmMoisturizer(e.target.checked)}>Moisturizer</CheckPill>
        </Row>
        <FieldLabel>condition (1–5)</FieldLabel>
        <div className="mb-3"><ScaleRow value={condition} onChange={setCondition} /></div>
        <FieldLabel>concerns</FieldLabel>
        <Row className="mb-3">
          {CONCERN_TAGS.map((t) => (
            <Chip key={t} selected={concerns.has(t)} onClick={() => toggleConcern(t)}>{t}</Chip>
          ))}
        </Row>
        <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
          items.map((s) => (
            <LogItem key={s._id} date={fmtDate(s.date)} onDelete={() => remove(s._id)}>
              <div className="flex flex-wrap items-center gap-2">
                {s.condition ? <span className="font-bold text-emerald-600">{s.condition}/5</span> : null}
                <Tag>AM {[s.amCleanser && "cleanser", s.amMoisturizer && "moist.", s.amSunscreen && "SPF"].filter(Boolean).join("+") || "—"}</Tag>
                <Tag>PM {[s.pmCleanser && "cleanser", s.pmMoisturizer && "moist."].filter(Boolean).join("+") || "—"}</Tag>
                {(s.concerns || []).map((c) => (
                  <Tag key={c}>{c}</Tag>
                ))}
              </div>
              {s.notes ? <div className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{s.notes}</div> : null}
            </LogItem>
          ))
        ) : (
          <Empty>No skin entries yet.</Empty>
        )}
      </Card>
    </div>
  );
}
