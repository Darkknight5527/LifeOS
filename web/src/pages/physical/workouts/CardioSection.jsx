import { useState } from "react";
import { useCollection } from "../../../hooks/useCollection";
import {
  Card, SectionTitle, FieldLabel, FieldNote, Row, Select, Input, Textarea, Button,
  Empty, LogItem, Tag, fmtDate, todayISO,
} from "../../../components/ui.jsx";
import { CARDIO_ACTIVITIES } from "./constants";

export default function CardioSection() {
  const { items, loading, create, remove } = useCollection("workout-cardio");

  const [activity, setActivity] = useState(CARDIO_ACTIVITIES[0]);
  const [date, setDate] = useState(todayISO());
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [calories, setCalories] = useState("");
  const [steps, setSteps] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const ok = await create({
      date, activity,
      duration: duration ? parseInt(duration, 10) : null,
      distance: distance ? parseFloat(distance) : null,
      calories: calories ? parseInt(calories, 10) : null,
      steps: steps ? parseInt(steps, 10) : null,
      avgHr: avgHr ? parseInt(avgHr, 10) : null,
      source, notes: notes.trim(),
    });
    setSaving(false);
    if (ok) {
      setDuration(""); setDistance(""); setCalories(""); setSteps(""); setAvgHr(""); setNotes(""); setSource("manual");
    }
  }

  return (
    <div>
      <Card>
        <FieldNote>
          Strava / watch sync isn't connected yet — log manually for now; this can later auto-fill from Strava or your watch app.
        </FieldNote>
        <Row className="mt-3">
          <Select value={activity} onChange={(e) => setActivity(e.target.value)}>
            {CARDIO_ACTIVITIES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Row>
        <Row className="mt-2">
          <Input type="number" placeholder="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <Input type="number" step="0.01" placeholder="Distance (km)" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </Row>
        <Row className="mt-2">
          <Input type="number" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} />
          <Input type="number" placeholder="Steps" value={steps} onChange={(e) => setSteps(e.target.value)} />
          <Input type="number" placeholder="Avg HR (bpm)" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} />
        </Row>
        <div className="mt-2">
          <FieldLabel>source</FieldLabel>
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="manual">Manual</option>
            <option value="strava">Strava (not connected)</option>
            <option value="watch">Watch app (not connected)</option>
          </Select>
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
          items.map((c) => (
            <LogItem key={c._id} date={fmtDate(c.date)} onDelete={() => remove(c._id)}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-emerald-600">{c.activity}</span>
                {c.duration ? <Tag>{c.duration} min</Tag> : null}
                {c.distance ? <Tag>{c.distance} km</Tag> : null}
                {c.calories ? <Tag>{c.calories} cal</Tag> : null}
                {c.source && c.source !== "manual" ? <Tag>{c.source}</Tag> : null}
              </div>
              {c.notes ? <div className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{c.notes}</div> : null}
            </LogItem>
          ))
        ) : (
          <Empty>No cardio sessions logged yet.</Empty>
        )}
      </Card>
    </div>
  );
}
