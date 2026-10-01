import { useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import {
  Card, SectionTitle, FieldLabel, Row, CheckPill, Select, Input, Textarea, Button,
  Empty, LogItem, Tag, fmtDate, todayISO,
} from "../../components/ui.jsx";
import { useToast } from "../../components/Toast.jsx";

const GROOMING_TASKS = [
  { id: "facial-hair", label: "Facial hair trimming" },
  { id: "underarm", label: "Underarm hair" },
  { id: "nails", label: "Nails trimming" },
  { id: "pubic", label: "Pubic hair" },
  { id: "bath-regular", label: "Bath — regular" },
  { id: "bath-oil", label: "Bath — oil" },
  { id: "bath-steam", label: "Bath — steam" },
  { id: "other", label: "Other" },
];

export default function GroomingSection() {
  const brush = useCollection("grooming-brush");
  const tasks = useCollection("grooming-tasks");
  const showToast = useToast();

  const [brushAM, setBrushAM] = useState(false);
  const [brushPM, setBrushPM] = useState(false);
  const [brushSaving, setBrushSaving] = useState(false);

  const [taskType, setTaskType] = useState(GROOMING_TASKS[0].id);
  const [taskDate, setTaskDate] = useState(todayISO());
  const [taskDuration, setTaskDuration] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);

  async function handleBrushSave() {
    if (!brushAM && !brushPM) {
      showToast("Check at least one", true);
      return;
    }
    setBrushSaving(true);
    const ok = await brush.create({ date: todayISO(), am: brushAM, pm: brushPM });
    setBrushSaving(false);
    if (ok) { setBrushAM(false); setBrushPM(false); }
  }

  async function handleTaskSave() {
    setTaskSaving(true);
    const ok = await tasks.create({
      date: taskDate,
      taskType,
      duration: taskDuration ? parseInt(taskDuration, 10) : null,
      notes: taskNotes.trim(),
    });
    setTaskSaving(false);
    if (ok) { setTaskDuration(""); setTaskNotes(""); }
  }

  const combinedHistory = [
    ...tasks.items.map((t) => ({ ...t, _kind: "task" })),
    ...brush.items.map((b) => ({ ...b, _kind: "brush" })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div>
      <Card>
        <FieldLabel>brushing — today</FieldLabel>
        <Row className="mb-3">
          <CheckPill checked={brushAM} onChange={(e) => setBrushAM(e.target.checked)}>Morning</CheckPill>
          <CheckPill checked={brushPM} onChange={(e) => setBrushPM(e.target.checked)}>Evening</CheckPill>
        </Row>
        <Row className="justify-end">
          <Button variant="ghost" className="px-3 py-1.5 text-xs" disabled={brushSaving} onClick={handleBrushSave}>Log brushing</Button>
        </Row>
      </Card>

      <SectionTitle>Periodic tasks</SectionTitle>
      <Card>
        <Row>
          <Select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
            {GROOMING_TASKS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </Select>
          <Input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
          <Input type="number" placeholder="mins (baths)" className="max-w-[120px]" value={taskDuration} onChange={(e) => setTaskDuration(e.target.value)} />
        </Row>
        <Textarea className="mt-3" placeholder="Notes (optional)" value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} />
        <Row className="mt-3 justify-end">
          <Button variant="accent" disabled={taskSaving} onClick={handleTaskSave}>Log task</Button>
        </Row>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="text-left font-mono uppercase text-slate-400">
              <th className="border-b border-slate-200 py-1.5 dark:border-slate-800">Task</th>
              <th className="border-b border-slate-200 py-1.5 dark:border-slate-800">Cadence</th>
              <th className="border-b border-slate-200 py-1.5 dark:border-slate-800">Reminder</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border-b border-slate-200 py-1.5 dark:border-slate-800">Facial hair / underarm</td><td className="border-b border-slate-200 py-1.5 dark:border-slate-800">Weekly</td><td className="border-b border-slate-200 py-1.5 dark:border-slate-800">Sunday</td></tr>
            <tr><td className="border-b border-slate-200 py-1.5 dark:border-slate-800">Nails / pubic hair</td><td className="border-b border-slate-200 py-1.5 dark:border-slate-800">Biweekly</td><td className="border-b border-slate-200 py-1.5 dark:border-slate-800">Every other Sunday</td></tr>
            <tr><td className="py-1.5">Baths</td><td className="py-1.5">Twice weekly</td><td className="py-1.5">Monday & Thursday</td></tr>
          </tbody>
        </table>
      </Card>

      <SectionTitle>History</SectionTitle>
      <Card className="border-t-0">
        {brush.loading || tasks.loading ? (
          <Empty>Loading…</Empty>
        ) : combinedHistory.length ? (
          combinedHistory.map((item) =>
            item._kind === "task" ? (
              <LogItem key={`t-${item._id}`} date={fmtDate(item.date)} onDelete={() => tasks.remove(item._id)}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{(GROOMING_TASKS.find((g) => g.id === item.taskType) || {}).label || item.taskType}</span>
                  {item.duration ? <Tag>{item.duration} min</Tag> : null}
                </div>
                {item.notes ? <div className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{item.notes}</div> : null}
              </LogItem>
            ) : (
              <LogItem key={`b-${item._id}`} date={fmtDate(item.date)} onDelete={() => brush.remove(item._id)}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Brushing</span>
                  {item.am ? <Tag>AM</Tag> : null}
                  {item.pm ? <Tag>PM</Tag> : null}
                </div>
              </LogItem>
            )
          )
        ) : (
          <Empty>No grooming entries yet.</Empty>
        )}
      </Card>
    </div>
  );
}
