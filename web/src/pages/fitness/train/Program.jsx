// Train → Program: weekly split and custom exercises.
import { useState } from "react";
import { useFit } from "../FitContext.jsx";
import { EX_TYPES, GROUP_LABEL, SPLITS, WEEKDAYS, groupOf } from "../lib";
import { ExercisePicker, NumberBox } from "../fit-ui.jsx";
import { FinCard, Icon, IconButton } from "../../finances/fin-ui.jsx";

export function TrainProgram() {
  const fit = useFit();
  const program = fit.settings?.program || {};
  const schedule = fit.settings?.schedule || [];
  const customs = fit.settings?.customExercises || [];
  const [picker, setPicker] = useState(null);
  const save = (next) => fit.saveSettings({ program: next });
  const edit = (split, i, patch) => save({ ...program, [split]: program[split].map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const move = (split, i, dir) => {
    const l = [...program[split]];
    const j = i + dir;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    save({ ...program, [split]: l });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[22px] bg-fin-card px-5 py-3">
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Week</span>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <label key={d} className="flex items-center gap-1.5 text-[13px] text-fin-muted">
            {WEEKDAYS[d]}
            <select value={schedule[d] || "rest"} onChange={(e) => fit.saveSettings({ schedule: schedule.map((s, i) => (i === d ? e.target.value : s)) }, "Schedule saved")} className="rounded-lg bg-fin-tile px-2 py-1 text-[13px] font-semibold text-white outline-none [color-scheme:dark]">
              {SPLITS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        ))}
        <label className="ml-auto flex items-center gap-2 text-[13px] text-fin-muted">
          Rest timer
          <select value={fit.settings?.restSec || 90} onChange={(e) => fit.saveSettings({ restSec: Number(e.target.value) }, "Rest timer saved")} className="rounded-lg bg-fin-tile px-2 py-1 text-[13px] font-semibold text-white outline-none [color-scheme:dark]">
            {[45, 60, 90, 120, 150, 180, 240].map((s) => <option key={s} value={s}>{s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        {SPLITS.filter((s) => s.id !== "rest").map((s) => {
          const list = program[s.id] || [];
          return (
            <FinCard
              key={s.id}
              title={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label} day</span>}
              action={<button onClick={() => setPicker(s.id)} className="flex items-center gap-1.5 rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold hover:bg-[#30303a]"><Icon name="plus" size={15} stroke={2.4} /> Add</button>}
            >
              <ol className="fin-scroll space-y-1.5 lg:max-h-[calc(100dvh-316px)] lg:overflow-y-auto lg:pr-1">
                {list.map((p, i) => (
                  <li key={p.exercise} className="flex items-center gap-1 rounded-2xl bg-fin-input px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold">{p.exercise}</div>
                      <div className="mt-1 flex items-center gap-1 text-[12px] text-fin-muted">
                        <NumberBox value={p.sets} onChange={(v) => v !== "" && edit(s.id, i, { sets: Math.max(1, Math.min(10, v)) })} className="!w-11 !py-1 !text-[13px]" label="Sets" /> ×
                        <NumberBox value={p.reps} onChange={(v) => v !== "" && edit(s.id, i, { reps: Math.max(1, Math.min(50, v)) })} className="!w-11 !py-1 !text-[13px]" label="Reps" />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col">
                      <IconButton icon="up" label="Move up" onClick={() => move(s.id, i, -1)} className={`!h-6 !w-7 ${i === 0 ? "pointer-events-none opacity-20" : ""}`} size={14} />
                      <IconButton icon="down" label="Move down" onClick={() => move(s.id, i, 1)} className={`!h-6 !w-7 ${i === list.length - 1 ? "pointer-events-none opacity-20" : ""}`} size={14} />
                    </div>
                    <IconButton icon="trash" label={`Remove ${p.exercise}`} onClick={() => save({ ...program, [s.id]: list.filter((_, j) => j !== i) })} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />
                  </li>
                ))}
              </ol>
            </FinCard>
          );
        })}
        <FinCard title="My exercises">
          {customs.length ? (
            <div className="fin-scroll space-y-1.5 lg:max-h-[calc(100dvh-316px)] lg:overflow-y-auto">
              {customs.map((c) => (
                <div key={c.exercise} className="flex items-center gap-2 rounded-2xl bg-fin-input px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{c.exercise}</div>
                    <div className="text-[12px] text-fin-muted">{GROUP_LABEL[c.group] || "No group"} · {EX_TYPES.find((t) => t.value === c.type)?.label}</div>
                  </div>
                  <IconButton icon="trash" label={`Delete ${c.exercise}`} onClick={() => fit.saveSettings({ customExercises: customs.filter((x) => x.exercise !== c.exercise) }, "Exercise removed")} className="!h-8 !w-8 hover:!text-fin-danger" size={15} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13.5px] leading-relaxed text-fin-muted">Exercises you create show up here. Type a new name in any “Add exercise” search to create one — weight & reps, bodyweight reps, timed (plank) or distance & time.</div>
          )}
        </FinCard>
      </div>
      <ExercisePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        customs={customs}
        onCreate={(x) => fit.saveSettings({ customExercises: [...customs, x] }, `Created ${x.exercise}`)}
        exclude={(program[picker] || []).map((p) => p.exercise)}
        onPick={(x) => {
          save({ ...program, [picker]: [...(program[picker] || []), { exercise: x.exercise, group: x.group || groupOf(x.exercise), type: x.type, sets: 3, reps: 10 }] });
          setPicker(null);
        }}
      />
    </div>
  );
}
