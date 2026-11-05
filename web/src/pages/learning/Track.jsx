// Learning › Weak list, Quizzes & checkpoints, Stats, and the Pause sheet.
import { useMemo, useState } from "react";
import { Bars, LineChart } from "../fitness/fit-ui.jsx";
import { FinCard, GhostButton, Icon, PrimaryButton, Segmented, Sheet } from "../finances/fin-ui.jsx";
import { useLearn } from "./LearnContext.jsx";
import { CHECKPOINTS, LESSON, LESSONS, PARTS, WEEKS } from "./plan.js";
import { addDays, isDone, mondayOf, pretty } from "./schedule.js";
import { Bar, kicker } from "./ui.jsx";

const input = "w-full rounded-xl bg-fin-input px-3 py-2.5 text-[14.5px] text-white outline-none placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50";
const short = (s) => pretty(s, { day: "numeric", month: "short" });

// ---------------------------------------------------------------- Weak list
const WEAK_STATUS = [
  { value: "open", label: "Open" },
  { value: "retaught", label: "Re-taught" },
  { value: "resolved", label: "Resolved" },
];

export function LearnWeak({ openLesson }) {
  const L = useLearn();
  const [filter, setFilter] = useState("open");
  const [topic, setTopic] = useState("");
  const [lessonId, setLessonId] = useState(() => L.schedule.doneToday?.id || L.schedule.current?.id || "");
  const [note, setNote] = useState("");
  const list = L.weak
    .filter((w) => (filter === "all" ? true : w.status === filter))
    .sort((a, b) => (LESSON[a.lessonId]?.index ?? 999) - (LESSON[b.lessonId]?.index ?? 999));
  const counts = Object.fromEntries(WEAK_STATUS.map((s) => [s.value, L.weak.filter((w) => w.status === s.value).length]));
  const validId = !lessonId || LESSON[lessonId.toUpperCase()];

  const add = async () => {
    if (!topic.trim() || !validId) return;
    await L.create("weak", { topic: topic.trim(), lessonId: lessonId.toUpperCase(), note: note.trim(), status: "open" }, "Added to the weak list");
    setTopic("");
    setNote("");
  };
  const setStatus = (w, status) => L.update("weak", w._id, { status, closedOn: status === "open" ? "" : L.today }, status === "resolved" ? "Resolved ✓" : status === "retaught" ? "Marked re-taught" : "Reopened");

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
        <section className="rounded-[28px] bg-gradient-to-br from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] p-6 shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="text-[14px] font-semibold text-white/90">Open weak topics</div>
          <div className="tabular mt-1 text-[48px] font-extrabold leading-none">{counts.open}</div>
          <div className="mt-2 text-[13.5px] text-white/85">{counts.retaught} re-taught · {counts.resolved} resolved</div>
          <div className="mt-2 text-[12.5px] text-white/75">Re-teach these on Saturdays or in a buffer day, then answer the L4 question again.</div>
        </section>
        <FinCard title="Add a weak topic">
          <div className="space-y-2.5">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={160} placeholder="e.g. Hold-time fixes with negative skew" className={input} aria-label="Weak topic" />
            <div className="flex gap-2">
              <input value={lessonId} onChange={(e) => setLessonId(e.target.value)} maxLength={8} placeholder="A1-D3" className={`${input} !w-[110px] uppercase ${validId ? "" : "ring-2 ring-red-400/60"}`} aria-label="Lesson ID" list="learn-lesson-ids" />
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note (optional)" className={input} aria-label="Note" />
            </div>
            <datalist id="learn-lesson-ids">{LESSONS.map((l) => <option key={l.id} value={l.id}>{l.topic}</option>)}</datalist>
            {lessonId && validId && <div className="truncate text-[12.5px] text-fin-muted">{LESSON[lessonId.toUpperCase()].topic}</div>}
            {!validId && <div className="text-[12.5px] text-red-300">No lesson with that ID — use a form like A1-D3.</div>}
            <PrimaryButton className="w-full !py-2.5 !text-[15px]" onClick={add} disabled={!topic.trim() || !validId}>Add to weak list</PrimaryButton>
          </div>
        </FinCard>
      </div>
      <FinCard title="Weak list" className="lg:col-span-2" action={<span className="tabular text-[13px] text-fin-muted">{list.length}</span>}>
        <Segmented className="mb-3 w-full max-w-[440px]" value={filter} onChange={setFilter} options={[...WEAK_STATUS, { value: "all", label: "All" }]} />
        {!list.length ? (
          <div className="py-8 text-center text-[14px] text-fin-muted">{filter === "open" ? "Nothing weak right now. 💪" : "Nothing here."}</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {list.map((w) => {
              const l = LESSON[w.lessonId];
              return (
                <div key={w._id} className="flex items-start gap-3 py-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${w.status === "open" ? "bg-amber-300" : w.status === "retaught" ? "bg-fin-accent/50" : "bg-fin-accent"}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[15px] font-semibold ${w.status === "resolved" ? "text-white/50 line-through" : ""}`}>{w.topic}</div>
                    <div className="mt-0.5 text-[12.5px] text-fin-muted">
                      {l ? <button onClick={() => openLesson(l.id)} className="font-semibold text-fin-accent hover:underline">{l.id}</button> : "No lesson"}
                      {l && <> · {l.topic}</>}
                      {w.closedOn && <> · {w.status === "resolved" ? "resolved" : "re-taught"} {short(w.closedOn)}</>}
                    </div>
                    {w.note && <div className="mt-1 text-[13px] text-white/70">{w.note}</div>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                    {w.status === "open" && <button onClick={() => setStatus(w, "retaught")} className="rounded-lg bg-fin-input px-2.5 py-1 text-[12.5px] font-semibold">Re-taught</button>}
                    {w.status !== "resolved" ? (
                      <button onClick={() => setStatus(w, "resolved")} className="rounded-lg bg-fin-accent/20 px-2.5 py-1 text-[12.5px] font-semibold text-white">Resolved</button>
                    ) : (
                      <button onClick={() => setStatus(w, "open")} className="rounded-lg bg-fin-input px-2.5 py-1 text-[12.5px] font-semibold">Reopen</button>
                    )}
                    <button onClick={() => L.remove("weak", w._id, "Removed")} aria-label="Delete" className="p-1 text-white/35 hover:text-red-300"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FinCard>
    </div>
  );
}

// ---------------------------------------------------------- Quizzes & checkpoints
export function LearnQuizzes() {
  const L = useLearn();
  const byWeek = Object.fromEntries(L.quizzes.map((q) => [q.week, q]));
  const curWeek = L.schedule.current?.week || WEEKS[WEEKS.length - 1].id;
  const [week, setWeek] = useState(curWeek);
  const [score, setScore] = useState(null);
  const [note, setNote] = useState("");
  const existing = byWeek[week];
  const shownScore = score ?? existing?.score ?? null;
  const pick = (w) => {
    setWeek(w);
    setScore(null);
    setNote(byWeek[w]?.note || "");
  };
  const save = () => {
    if (shownScore == null) return;
    L.upsert("quizzes", (q) => q.week === week, { week, score: shownScore, note: note.trim(), date: existing?.date || L.today }, `Week ${week} quiz: ${shownScore}/10`);
    setScore(null);
  };
  const scored = WEEKS.filter((w) => byWeek[w.id]);
  const points = scored.map((w) => ({ x: `Week ${w.id}`, y: byWeek[w.id].score }));
  const avg = scored.length ? scored.reduce((a, w) => a + byWeek[w.id].score, 0) / scored.length : null;
  const doneCps = PARTS.filter((p) => L.checkpoints.find((c) => c.part === p.id)?.passedOn).length;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
        <FinCard title="Saturday quiz">
          <label className="block">
            <div className={kicker}>Week</div>
            <select value={week} onChange={(e) => pick(e.target.value)} className={`${input} [color-scheme:dark]`}>
              {PARTS.map((p) => (
                <optgroup key={p.id} label={`Part ${p.id} · ${p.title}`}>
                  {p.weeks.map((w) => <option key={w.id} value={w.id}>{w.id} · {w.title}{byWeek[w.id] ? ` — ${byWeek[w.id].score}/10` : ""}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <div className={`${kicker} mt-3`}>Score out of 10</div>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 11 }, (_, i) => (
              <button key={i} onClick={() => setScore(i)} className={`tabular rounded-lg py-2 text-[14px] font-bold ${shownScore === i ? "bg-fin-accent text-white" : "bg-fin-input text-white/70 hover:bg-fin-tile"}`}>{i}</button>
            ))}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What you got wrong (optional)" className={`${input} mt-3`} />
          <PrimaryButton className="mt-3 w-full !py-2.5 !text-[15px]" onClick={save} disabled={shownScore == null}>{existing ? "Update score" : "Save score"}</PrimaryButton>
          {existing && <div className="mt-2 text-[12.5px] text-fin-muted">Saved {existing.score}/10 on {short(existing.date)}.</div>}
        </FinCard>
      </div>
      <div className="space-y-5 lg:col-span-2 lg:space-y-4">
        <FinCard title="Quiz trend" action={avg != null && <span className="text-[13px] text-fin-muted">avg <b className="text-white">{avg.toFixed(1)}</b>/10</span>}>
          {points.length >= 2 ? (
            <LineChart points={points} height={170} format={(v) => `${v}/10`} />
          ) : (
            <div className="py-6 text-center text-[14px] text-fin-muted">{points.length ? "One score so far — the trend appears after the second Saturday." : "Log your first Saturday quiz to see the trend."}</div>
          )}
          {scored.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {scored.map((w) => {
                const s = byWeek[w.id].score;
                return (
                  <button key={w.id} onClick={() => pick(w.id)} className={`tabular rounded-lg px-2 py-1 text-[12px] font-semibold ${s >= 8 ? "bg-fin-accent/25" : s >= 6 ? "bg-white/10" : "bg-amber-400/20 text-amber-200"}`}>
                    {w.id} {s}
                  </button>
                );
              })}
            </div>
          )}
        </FinCard>
        <FinCard title="Part checkpoints" action={<span className="tabular text-[13px] text-fin-muted">{doneCps}/4 passed</span>}>
          <div className="mb-3 text-[13px] text-fin-muted">Answer each out loud, without notes. A part is passed when every question passes.</div>
          <div className="space-y-3">
            {PARTS.map((p) => <Checkpoint key={p.id} part={p} />)}
          </div>
        </FinCard>
      </div>
    </div>
  );
}

function Checkpoint({ part }) {
  const L = useLearn();
  const qs = CHECKPOINTS[part.id];
  const rec = L.checkpoints.find((c) => c.part === part.id);
  const res = rec?.results || {};
  const pass = qs.filter((_, i) => res[i] === "pass").length;
  const lessons = part.weeks.flatMap((w) => w.lessons);
  const partDone = lessons.every((l) => isDone(L.progress[l.id]));
  const [open, setOpen] = useState(false);
  const mark = (i, v) => {
    const results = { ...res, [i]: res[i] === v ? undefined : v };
    Object.keys(results).forEach((k) => results[k] === undefined && delete results[k]);
    const all = qs.every((_, j) => results[j] === "pass");
    const passedOn = all ? rec?.passedOn || L.today : "";
    L.upsert("checkpoints", (c) => c.part === part.id, { part: part.id, results, passedOn }, all && !rec?.passedOn ? `Part ${part.id} checkpoint passed 🎉` : undefined);
  };
  return (
    <div className={`rounded-2xl ${rec?.passedOn ? "bg-fin-accent/[0.1] ring-1 ring-fin-accent/40" : "bg-fin-input/60"}`}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-extrabold ${rec?.passedOn ? "bg-fin-accent text-white" : "bg-white/10"}`}>{rec?.passedOn ? <Icon name="check" size={16} stroke={3} /> : part.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">Part {part.id} · {part.title}</span>
          <span className="block text-[12.5px] text-fin-muted">
            {rec?.passedOn ? `Passed ${pretty(rec.passedOn, { day: "numeric", month: "short", year: "numeric" })}` : `${pass}/${qs.length} passed${partDone ? "" : " · after the last lesson of the part"}`}
          </span>
        </span>
        <Icon name="down" size={16} className={`shrink-0 text-white/50 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 px-3.5 pb-3.5">
          {qs.map((q, i) => (
            <div key={i} className="rounded-xl bg-black/20 px-3 py-2.5">
              <div className="text-[13.5px] leading-snug text-white/90"><span className="mr-1 font-bold text-fin-accent">{i + 1}.</span>{q}</div>
              <div className="mt-2 flex gap-1.5">
                <button onClick={() => mark(i, "pass")} className={`rounded-lg px-3 py-1 text-[12.5px] font-semibold ${res[i] === "pass" ? "bg-fin-accent text-white" : "bg-fin-input text-white/70"}`}>Pass</button>
                <button onClick={() => mark(i, "fail")} className={`rounded-lg px-3 py-1 text-[12.5px] font-semibold ${res[i] === "fail" ? "bg-red-400/80 text-white" : "bg-fin-input text-white/70"}`}>Fail</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Stats
export function LearnStats({ onPause }) {
  const L = useLearn();
  const { stats, schedule, startDate, pauses, today } = L;
  // Hours per week, last 12 weeks (Monday-based).
  const weeks = useMemo(() => {
    const start = mondayOf(today < startDate ? startDate : today);
    const out = [];
    for (let i = 11; i >= 0; i--) {
      const from = addDays(start, -7 * i);
      const to = addDays(from, 6);
      const mins = L.sessions.filter((s) => s.date >= from && s.date <= to).reduce((a, s) => a + (s.minutes || 0), 0);
      out.push({ label: `Week of ${short(from)}`, value: Math.round((mins / 60) * 10) / 10, from });
    }
    return out.filter((w) => w.from >= mondayOf(startDate) || w.value > 0);
  }, [L.sessions, today, startDate]);
  const totalMin = L.sessions.reduce((a, s) => a + (s.minutes || 0), 0);
  const thisWeek = weeks[weeks.length - 1]?.value || 0;
  const ahead = stats.done - stats.planned;
  const pace = stats.pace;
  const diff = pace.date && schedule.finish ? Math.round((new Date(pace.date) - new Date(schedule.finish)) / 86400000) : 0;
  const upcoming = pauses.filter((p) => p.to >= today).sort((a, b) => (a.from < b.from ? -1 : 1));

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
        <section className="rounded-[28px] bg-gradient-to-br from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] p-6 shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-white/90"><Icon name="flame" size={16} /> Study streak</div>
          <div className="tabular mt-1 text-[52px] font-extrabold leading-none">{stats.streak}<span className="ml-1 text-[18px] font-bold text-white/80">day{stats.streak === 1 ? "" : "s"}</span></div>
          <div className="mt-2 text-[13px] text-white/85">Sundays and paused days never break it.</div>
        </section>
        <FinCard title="Lessons">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-fin-input p-3">
              <div className="tabular text-[24px] font-extrabold">{stats.done}</div>
              <div className="text-[12px] text-fin-muted">done</div>
            </div>
            <div className="rounded-2xl bg-fin-input p-3">
              <div className="tabular text-[24px] font-extrabold">{stats.planned}</div>
              <div className="text-[12px] text-fin-muted">planned by today</div>
            </div>
          </div>
          <Bar className="mt-3" full={stats.full} partial={stats.partial} total={LESSONS.length} />
          <div className="mt-2 text-[13px] text-fin-muted">
            {stats.full} at L4 · {stats.partial} partial · {LESSONS.length - stats.done} to go.{" "}
            {stats.planned > 0 && (ahead >= 0 ? (ahead ? <b className="text-white/85">{ahead} ahead.</b> : <b className="text-white/85">On plan.</b>) : <b className="text-amber-300">{-ahead} behind.</b>)}
          </div>
        </FinCard>
      </div>
      <div className="space-y-5 lg:col-span-2 lg:space-y-4">
        <FinCard title="Hours per week" action={<span className="text-[13px] text-fin-muted">target 12 h</span>}>
          {weeks.length ? <Bars data={weeks} height={140} target={12} format={(v) => `${v} h`} /> : <div className="py-6 text-center text-[14px] text-fin-muted">Hours appear once the plan starts.</div>}
          <div className="mt-3 text-[13px] text-fin-muted">This week <b className="text-white/85">{thisWeek} h</b> · all time <b className="text-white/85">{Math.round(totalMin / 6) / 10} h</b></div>
        </FinCard>
        <FinCard title="Finish date" action={<button onClick={onPause} className="flex items-center gap-1.5 rounded-xl bg-fin-input px-3 py-1.5 text-[13px] font-semibold"><Icon name="pause" size={14} /> Pause</button>}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-fin-input p-3.5">
              <div className="text-[12px] text-fin-muted">On schedule (one lesson every study day)</div>
              <div className="mt-1 text-[20px] font-extrabold">{schedule.finish ? pretty(schedule.finish, { day: "numeric", month: "short", year: "numeric" }) : "Done"}</div>
              <div className="text-[12px] text-fin-muted">Plan said 29 May 2027</div>
            </div>
            <div className="rounded-2xl bg-fin-input p-3.5">
              <div className="text-[12px] text-fin-muted">At your actual pace</div>
              <div className="mt-1 text-[20px] font-extrabold">{pace.date ? pretty(pace.date, { day: "numeric", month: "short", year: "numeric" }) : "Done"}</div>
              <div className="text-[12px] text-fin-muted">{pace.pace == null ? "Needs a week of study first" : `${Math.round(pace.pace * 100)}% of study days used${diff > 0 ? ` · ${diff} days later` : ""}`}</div>
            </div>
          </div>
          <div className="mt-3 text-[13px] text-fin-muted">A missed day never doubles up — every lesson moves on one study day. A pause moves everything past it.</div>
          {upcoming.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {upcoming.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-xl bg-fin-input px-3 py-2 text-[13.5px]">
                  <Icon name="pause" size={14} className="text-fin-accent" />
                  <span className="flex-1">{short(p.from)} – {short(p.to)}{p.note ? ` · ${p.note}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </FinCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pause
export function PauseSheet({ open, onClose }) {
  const L = useLearn();
  const [from, setFrom] = useState(L.today);
  const [to, setTo] = useState(addDays(L.today, 6));
  const [note, setNote] = useState("");
  const ok = from && to && to >= from;
  const add = () => {
    if (!ok) return;
    const pauses = [...L.pauses, { id: `p${Date.now().toString(36)}`, from, to, note: note.trim().slice(0, 80) }];
    L.saveSettings({ pauses }, "Paused — the plan has moved");
    setNote("");
  };
  const remove = (id) => L.saveSettings({ pauses: L.pauses.filter((p) => p.id !== id) }, "Pause removed");
  const sorted = [...L.pauses].sort((a, b) => (a.from < b.from ? 1 : -1));
  return (
    <Sheet open={open} onClose={onClose} title="Pause the plan" footer={<PrimaryButton className="w-full" disabled={!ok} onClick={add}>Pause {ok ? `${short(from)} – ${short(to)}` : ""}</PrimaryButton>}>
      <div className="space-y-4">
        <div className="text-[14px] text-fin-muted">Travel, exams, illness: no lessons are scheduled in a pause. Every later lesson and the finish date move forward, and your streak isn't broken.</div>
        <div className="grid grid-cols-2 gap-2">
          <label><div className={kicker}>From</div><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} [color-scheme:dark]`} /></label>
          <label><div className={kicker}>To</div><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={`${input} [color-scheme:dark]`} /></label>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="Reason (optional)" className={input} />
        <div>
          <div className={kicker}>Start date</div>
          <div className="flex items-center gap-2">
            <input type="date" value={L.startDate} onChange={(e) => e.target.value && L.saveSettings({ startDate: e.target.value }, "Start date changed")} className={`${input} !w-auto [color-scheme:dark]`} />
            {L.startDate !== "2026-11-09" && <button onClick={() => L.saveSettings({ startDate: "2026-11-09" }, "Start date reset")} className="text-[12.5px] text-fin-faint underline">Reset to 9 Nov</button>}
          </div>
        </div>
        {sorted.length > 0 && (
          <div>
            <div className={kicker}>Pauses</div>
            <div className="space-y-1.5">
              {sorted.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-xl bg-fin-input px-3 py-2 text-[14px]">
                  <span className="flex-1">{short(p.from)} – {short(p.to)}{p.note ? ` · ${p.note}` : ""}</span>
                  <GhostButton className="!rounded-lg !px-2.5 !py-1 !text-[12.5px]" onClick={() => remove(p.id)}>Remove</GhostButton>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

