// Learning › Roadmap: every part, week and lesson with its status, level and
// date. Progress bars per part and overall; the current week is highlighted.
import { useEffect, useState } from "react";
import { FinCard, GhostButton, Icon, PrimaryButton, Sheet } from "../finances/fin-ui.jsx";
import { useLearn } from "./LearnContext.jsx";
import { LESSON, LESSONS, PART, PARTS, WEEK } from "./plan.js";
import { isDone, isFull, pretty } from "./schedule.js";
import { Bar, Dot, LevelPicker, StatePill, kicker } from "./ui.jsx";

const count = (lessons, progress) => {
  const done = lessons.filter((l) => isDone(progress[l.id])).length;
  const full = lessons.filter((l) => isFull(progress[l.id])).length;
  return { done, full, partial: done - full, total: lessons.length };
};

export function LearnRoadmap({ openLesson }) {
  const L = useLearn();
  const { progress, schedule } = L;
  const curWeek = schedule.current?.week;
  const [open, setOpen] = useState(() => new Set(curWeek ? [curWeek] : []));
  useEffect(() => {
    if (curWeek) setOpen((s) => new Set([...s, curWeek]));
  }, [curWeek]);
  const toggle = (id) => setOpen((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const all = count(LESSONS, progress);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0">
      <div className="space-y-5 lg:sticky lg:top-[88px] lg:space-y-4">
        <FinCard title="Overall">
          <div className="flex items-end justify-between">
            <div className="tabular text-[34px] font-extrabold leading-none">{Math.round((all.full / all.total) * 100)}%</div>
            <div className="text-right text-[13px] text-fin-muted">{all.full} of {all.total} at L4{all.partial ? <><br />{all.partial} partly done</> : null}</div>
          </div>
          <Bar className="mt-3 !h-2.5" full={all.full} partial={all.partial} total={all.total} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-fin-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-fin-accent" />Done at L4</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-fin-accent/40" />Done below L4</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-amber-400/70" />In progress</span>
          </div>
          {schedule.finish && <div className="mt-3 text-[13px] text-fin-muted">On the current schedule you finish on <b className="text-white/85">{pretty(schedule.finish, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</b>.</div>}
        </FinCard>
        <FinCard title="Parts">
          <div className="space-y-3.5">
            {PARTS.map((p) => {
              const c = count(p.weeks.flatMap((w) => w.lessons), progress);
              return (
                <button key={p.id} onClick={() => document.getElementById(`part-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="block w-full text-left">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-semibold"><span className="text-fin-accent">{p.id}</span> · {p.title}</span>
                    <span className="tabular shrink-0 text-[12.5px] text-fin-muted">{c.full}/{c.total}</span>
                  </div>
                  <Bar className="mt-1.5" full={c.full} partial={c.partial} total={c.total} />
                </button>
              );
            })}
          </div>
        </FinCard>
      </div>

      <div className="space-y-5 lg:col-span-2 lg:space-y-4">
        {PARTS.map((p) => {
          const c = count(p.weeks.flatMap((w) => w.lessons), progress);
          return (
            <section key={p.id} id={`part-${p.id}`} className="scroll-mt-[150px] rounded-[28px] bg-fin-card p-4 shadow-card sm:p-5 lg:rounded-[24px]">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-accent">Part {p.id} · {p.weeks.length} week{p.weeks.length === 1 ? "" : "s"}</div>
                  <div className="text-[19px] font-extrabold">{p.title}</div>
                </div>
                <div className="tabular shrink-0 text-[13px] text-fin-muted">{c.full}/{c.total} at L4</div>
              </div>
              <Bar className="mx-1 mt-2" full={c.full} partial={c.partial} total={c.total} />
              <div className="mt-3 space-y-1.5">
                {p.weeks.map((w) => (
                  <WeekRow key={w.id} w={w} current={w.id === curWeek} open={open.has(w.id)} onToggle={() => toggle(w.id)} openLesson={openLesson} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function WeekRow({ w, current, open, onToggle, openLesson }) {
  const L = useLearn();
  const { progress, schedule } = L;
  const c = count(w.lessons, progress);
  const first = schedule.dates[w.lessons[0].id];
  return (
    <div className={`rounded-2xl ${current ? "bg-fin-accent/[0.09] ring-1 ring-fin-accent/40" : "bg-fin-input/60"}`}>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className={`tabular w-[38px] shrink-0 text-[14px] font-extrabold ${current ? "text-fin-accent" : "text-white/80"}`}>{w.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold">{w.title}</span>
          <span className="mt-1 flex items-center gap-1">
            {w.lessons.map((l) => <Dot key={l.id} p={progress[l.id]} current={schedule.current?.id === l.id} title={l.id} />)}
            <span className="ml-2 truncate text-[11.5px] text-fin-muted">{current ? "This week" : first ? `from ${pretty(first, { day: "numeric", month: "short" })}` : ""}</span>
          </span>
        </span>
        <span className="tabular shrink-0 text-[12px] text-fin-muted">{c.done}/6</span>
        <Icon name="down" size={16} className={`shrink-0 text-white/50 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-2 pb-2">
          {w.l4 && <div className="mx-1 mb-1.5 rounded-xl bg-black/20 px-3 py-2 text-[12.5px] text-white/75"><b className="text-fin-accent">Week L4:</b> {w.l4}</div>}
          {w.lessons.map((l) => {
            const p = progress[l.id];
            const isCur = schedule.current?.id === l.id;
            return (
              <button key={l.id} onClick={() => openLesson(l.id)} className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-white/[0.05] ${isCur ? "bg-white/[0.06]" : ""}`}>
                <Dot p={p} current={isCur} />
                <span className="tabular w-[52px] shrink-0 text-[12.5px] font-bold text-white/70">{l.id}</span>
                <span className={`min-w-0 flex-1 text-[13.5px] leading-snug ${isDone(p) ? "text-white/60" : "text-white/90"}`}>{l.topic}{l.quizDay && <span className="ml-1.5 text-[11px] font-semibold text-fin-accent">quiz</span>}</span>
                <span className="hidden shrink-0 text-[11.5px] text-fin-muted sm:block">{pretty(schedule.dates[l.id], { day: "numeric", month: "short" })}</span>
                <StatePill p={p} small />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Edit one lesson: status, level, note, date done; add a weak topic. */
export function LessonSheet({ id, onClose }) {
  const L = useLearn();
  const l = id ? LESSON[id] : null;
  const p = id ? L.progress[id] : null;
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState("");
  const [doneOn, setDoneOn] = useState("");
  const [weak, setWeak] = useState("");
  useEffect(() => {
    if (!id) return;
    setLevel(p?.level || 0);
    setNote(p?.note || "");
    setDoneOn(p?.doneOn || L.today);
    setWeak("");
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!l) return <Sheet open={false} onClose={onClose} />;
  const w = WEEK[l.week];
  const date = L.schedule.dates[id];
  const minutes = L.sessions.filter((s) => s.lessonId === id).reduce((a, s) => a + (s.minutes || 0), 0);
  const weakHere = L.weak.filter((x) => x.lessonId === id);

  const save = (status) => {
    L.setLesson(id, { status, level, note: note.trim(), doneOn: status === "done" ? doneOn || L.today : "", startedOn: p?.startedOn || L.today }, status === "done" ? (level >= 4 ? `${id} done at L4 ✓` : `${id} saved as partly done (L${level})`) : `${id} saved`);
    onClose();
  };
  const addWeak = () => {
    if (!weak.trim()) return;
    L.create("weak", { topic: weak.trim(), lessonId: id, status: "open" }, "Added to the weak list");
    setWeak("");
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${l.id} · ${l.topic}`}
      footer={
        <div className="flex gap-2">
          {p && <GhostButton className="!px-4" onClick={() => { L.clearLesson(id); onClose(); }}>Reset</GhostButton>}
          <GhostButton className="flex-1" onClick={() => save("in_progress")}>In progress</GhostButton>
          <PrimaryButton className="flex-1" disabled={!level} onClick={() => save("done")}>{level ? `Done · L${level}` : "Pick a level"}</PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-fin-muted">
          <StatePill p={p} />
          <span>Part {l.part} {PART[l.part].title} · Week {w.id} {w.title}</span>
        </div>
        <div className="rounded-2xl bg-fin-input px-3.5 py-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-fin-accent">L4 target</div>
          <div className="mt-0.5 text-[14.5px] leading-snug">{l.l4}</div>
        </div>
        <div className="text-[13px] text-fin-muted">
          {isDone(p) ? <>Done {pretty(p.doneOn, { weekday: "short", day: "numeric", month: "short" })}</> : <>Scheduled {pretty(date, { weekday: "long", day: "numeric", month: "short" })}</>}
          {minutes > 0 && <> · {minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}` : `${minutes} min`} studied</>}
        </div>
        <div>
          <div className={kicker}>Level reached</div>
          <LevelPicker value={level} onChange={setLevel} />
        </div>
        <label className="block">
          <div className={kicker}>Note</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="One line" className="w-full rounded-xl bg-fin-input px-3 py-2.5 text-[15px] outline-none placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50" />
        </label>
        <label className="block">
          <div className={kicker}>Date done</div>
          <input type="date" value={doneOn} max={L.today} onChange={(e) => setDoneOn(e.target.value)} className="rounded-xl bg-fin-input px-3 py-2 text-[15px] outline-none [color-scheme:dark]" />
        </label>
        <div>
          <div className={kicker}>Weak topics from this lesson</div>
          {weakHere.map((x) => (
            <div key={x._id} className="mb-1 flex items-center gap-2 text-[13.5px]">
              <span className={`h-2 w-2 rounded-full ${x.status === "open" ? "bg-amber-300" : "bg-fin-accent"}`} />
              <span className={x.status === "open" ? "" : "text-white/50 line-through"}>{x.topic}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={weak} onChange={(e) => setWeak(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWeak()} maxLength={160} placeholder="What didn't stick?" className="min-w-0 flex-1 rounded-xl bg-fin-input px-3 py-2.5 text-[14.5px] outline-none placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50" />
            <button onClick={addWeak} disabled={!weak.trim()} className="rounded-xl bg-fin-tile px-3.5 text-[14px] font-semibold disabled:opacity-40">Add</button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
