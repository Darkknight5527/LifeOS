import { useState } from "react";
import { useCollection } from "../../../hooks/useCollection";
import {
  Card, SectionTitle, FieldLabel, Row, Select, Input, Button, Empty, LogItem, Tag, fmtDate, todayISO,
} from "../../../components/ui.jsx";
import { useToast } from "../../../components/Toast.jsx";
import { SPLIT_SCHEDULE, SPLIT_LABEL, MUSCLE_GROUPS, allGroupsFor, defaultSplitForToday } from "./constants";

export default function StrengthSection() {
  const { items, loading, create, remove } = useCollection("workout-strength");
  const showToast = useToast();

  const [date, setDate] = useState(todayISO());
  const [splitDay, setSplitDay] = useState(defaultSplitForToday());
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);

  const [group, setGroup] = useState("");
  const [exercise, setExercise] = useState("");
  const [customExercise, setCustomExercise] = useState("");
  const [sets, setSets] = useState([]);

  const groups = allGroupsFor(splitDay);
  const groupObj = groups.find((g) => g.id === group);
  const exerciseOptions = groupObj ? groupObj.exercises : [];

  function resetExerciseDraft() {
    setGroup(""); setExercise(""); setCustomExercise(""); setSets([]);
  }

  function handleSplitChange(value) {
    setSplitDay(value);
    resetExerciseDraft();
  }

  function handleGroupChange(value) {
    setGroup(value); setExercise(""); setSets([]);
  }

  function addSet() {
    setSets((s) => [...s, { reps: null, weight: null }]);
  }

  function updateSet(i, field, value) {
    setSets((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  function removeSet(i) {
    setSets((s) => s.filter((_, idx) => idx !== i));
  }

  function addExerciseToSession() {
    const name = exercise === "__other__" ? customExercise.trim() : exercise;
    if (!group || !name) { showToast("Pick a muscle group and exercise", true); return; }
    if (!sets.length) { showToast("Add at least one set", true); return; }
    setExercises((ex) => [
      ...ex,
      { group, exercise: name, sets: sets.map((s) => ({ reps: s.reps || 0, weight: s.weight || 0 })) },
    ]);
    resetExerciseDraft();
  }

  function removeExercise(i) {
    setExercises((ex) => ex.filter((_, idx) => idx !== i));
  }

  async function saveSession() {
    setSaving(true);
    const ok = await create({ date, splitDay, exercises });
    setSaving(false);
    if (ok) {
      setExercises([]); setSplitDay(defaultSplitForToday()); resetExerciseDraft();
    }
  }

  return (
    <div>
      <Card>
        <FieldLabel>split schedule</FieldLabel>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr>
              {SPLIT_SCHEDULE.map((s) => (
                <th key={s.day} className="border-b border-slate-200 py-1.5 text-left font-mono text-[10px] uppercase text-slate-400 dark:border-slate-800">
                  {s.day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {SPLIT_SCHEDULE.map((s) => (
                <td key={s.day} className="py-1.5">{SPLIT_LABEL[s.split]}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </Card>

      <Card className="mt-4">
        <FieldLabel>today's session</FieldLabel>
        <Row className="mt-1.5">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select value={splitDay} onChange={(e) => handleSplitChange(e.target.value)}>
            {Object.keys(SPLIT_LABEL).map((k) => (
              <option key={k} value={k}>{SPLIT_LABEL[k]}</option>
            ))}
          </Select>
        </Row>

        <SectionTitle>Add exercise</SectionTitle>
        <Row>
          <Select value={group} onChange={(e) => handleGroupChange(e.target.value)}>
            <option value="">Muscle group…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </Select>
          <Select value={exercise} onChange={(e) => setExercise(e.target.value)} disabled={!groupObj}>
            <option value="">Exercise…</option>
            {exerciseOptions.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
            <option value="__other__">Other…</option>
          </Select>
        </Row>
        {exercise === "__other__" && (
          <Input className="mt-2" placeholder="Exercise name" value={customExercise} onChange={(e) => setCustomExercise(e.target.value)} />
        )}

        <div className="mt-3">
          <FieldLabel>sets</FieldLabel>
          {sets.map((s, i) => (
            <Row key={i} className="mt-1.5">
              <span className="w-5 font-mono text-[11px] text-slate-400">{i + 1}</span>
              <Input type="number" min="0" placeholder="reps" className="max-w-[90px]" value={s.reps ?? ""} onChange={(e) => updateSet(i, "reps", e.target.value ? parseInt(e.target.value, 10) : null)} />
              <Input type="number" min="0" step="0.5" placeholder="kg" className="max-w-[90px]" value={s.weight ?? ""} onChange={(e) => updateSet(i, "weight", e.target.value ? parseFloat(e.target.value) : null)} />
              <Button variant="dangerText" className="text-xs" onClick={() => removeSet(i)}>remove</Button>
            </Row>
          ))}
          <Button variant="ghost" className="mt-2 px-3 py-1.5 text-xs" onClick={addSet}>+ Add set</Button>
        </div>

        <Row className="mt-4 justify-end">
          <Button variant="accent" onClick={addExerciseToSession}>Add exercise to session</Button>
        </Row>
      </Card>

      {exercises.length > 0 && (
        <Card className="mt-4 border-t-0">
          <FieldLabel>exercises in this session</FieldLabel>
          <div className="mt-2">
            {exercises.map((ex, i) => (
              <LogItem key={i} date="" onDelete={() => removeExercise(i)}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{ex.exercise}</span>
                  <Tag>
                    {(MUSCLE_GROUPS[splitDay] || []).concat(MUSCLE_GROUPS.core).find((g) => g.id === ex.group)?.label || ex.group}
                  </Tag>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {ex.sets.map((s) => `${s.reps || 0}×${s.weight || 0}kg`).join(", ")}
                </div>
              </LogItem>
            ))}
          </div>
          <Row className="mt-3 justify-end">
            <Button variant="accent" disabled={saving} onClick={saveSession}>Save session</Button>
          </Row>
        </Card>
      )}

      <SectionTitle>History</SectionTitle>
      <Card className="border-t-0">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : items.length ? (
          items.map((s) => (
            <LogItem key={s._id} date={fmtDate(s.date)} onDelete={() => remove(s._id)}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-600">{SPLIT_LABEL[s.splitDay] || s.splitDay}</span>
                <Tag>{(s.exercises || []).length} exercises</Tag>
              </div>
              {(s.exercises || []).map((ex, i) => (
                <div key={i} className="mt-1 text-sm text-slate-500">
                  <strong>{ex.exercise}</strong> — {ex.sets.map((st) => `${st.reps || 0}×${st.weight || 0}kg`).join(", ")}
                </div>
              ))}
            </LogItem>
          ))
        ) : (
          <Empty>No strength sessions logged yet.</Empty>
        )}
      </Card>
    </div>
  );
}
