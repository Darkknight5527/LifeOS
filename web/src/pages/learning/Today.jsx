// Learning › Today: the lesson for today, the 2-hour session timer, and
// "Mark done" with the level reached and a one-line note.
import { useEffect, useState } from "react";
import { FinCard, Icon, PrimaryButton } from "../finances/fin-ui.jsx";
import { useLearn } from "./LearnContext.jsx";
import { LESSONS, PART, WEEK } from "./plan.js";
import { inPause, isStudyDay, pretty, weekday } from "./schedule.js";
import { SessionTimer, timerState } from "./Timer.jsx";
import { LevelPicker, StatePill, kicker } from "./ui.jsx";

const MINUTES = [60, 90, 120, 150];

export function LearnToday({ go, openLesson }) {
  const L = useLearn();
  const { schedule, today, progress, startDate, pauses } = L;
  const cur = schedule.current;
  const doneToday = schedule.doneToday;
  const notStarted = today < startDate;
  const rest = !isStudyDay(today, pauses);
  const paused = inPause(today, pauses);
  const pause = pauses.find((p) => today >= p.from && today <= p.to);

  // What the hero shows.
  let label;
  if (!cur) label = "Plan complete";
  else if (doneToday) label = `Done for today · next ${pretty(schedule.dates[cur.id], { weekday: "long" })}`;
  else if (notStarted) label = `Plan starts ${pretty(startDate, { weekday: "long", day: "numeric", month: "short" })}`;
  else if (paused) label = `Paused until ${pretty(pause.to, { day: "numeric", month: "short" })}${pause.note ? ` · ${pause.note}` : ""}`;
  else if (rest) label = "Sunday · rest day";
  else label = "Today's lesson";
  const shown = doneToday && !cur ? doneToday : cur;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
        <Hero lesson={shown} label={label} dim={Boolean(doneToday || notStarted || rest)} date={shown ? schedule.dates[shown.id] : null} onOpen={() => shown && openLesson(shown.id)} onQuiz={() => go("quizzes")} />
        <UpNext openLesson={openLesson} />
      </div>
      <FinCard title="Study session" className="lg:col-span-1">
        {cur ? (
          <SessionTimer
            lessonId={cur.id}
            onStart={() => !progress[cur.id] && L.setLesson(cur.id, { status: "in_progress", startedOn: today })}
            onFinish={(minutes, id) => L.logMinutes(today, id, minutes)}
          />
        ) : (
          <div className="text-[14px] text-fin-muted">All 174 lessons are done. 🎉</div>
        )}
      </FinCard>
      <div className="space-y-5 lg:space-y-4">
        {doneToday ? <DoneCard lesson={doneToday} /> : cur ? <MarkDone lesson={cur} /> : null}
        <MiniStats go={go} />
      </div>
    </div>
  );
}

function Hero({ lesson, label, dim, date, onOpen, onQuiz }) {
  if (!lesson) {
    return (
      <section className="rounded-[28px] bg-gradient-to-br from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] p-6 shadow-glow">
        <div className="text-[28px] font-extrabold">Plan complete</div>
        <div className="mt-1 text-white/85">Every lesson of the L4 Mastery Plan is done.</div>
      </section>
    );
  }
  const w = WEEK[lesson.week];
  const p = PART[lesson.part];
  const saturday = date && weekday(date) === 6;
  return (
    <section className={`relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] p-6 shadow-glow lg:rounded-[24px] lg:p-5 ${dim ? "opacity-95" : ""}`}>
      <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
      <div className="relative">
        <div className="text-[14px] font-semibold text-white/90">{label}</div>
        <button onClick={onOpen} className="mt-1 block text-left">
          <div className="tabular text-[40px] font-extrabold leading-none tracking-tight">{lesson.id}</div>
          <div className="mt-2 text-[19px] font-bold leading-snug">{lesson.topic}</div>
        </button>
        <div className="mt-1 text-[13px] text-white/80">
          Part {p.id} {p.title} · Week {w.id} {w.title} · day {lesson.day} of 6
        </div>
        {lesson.l4 && (
          <div className="mt-3 rounded-2xl bg-black/15 px-3.5 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/75">L4 target</div>
            <div className="mt-0.5 text-[14.5px] leading-snug text-white">{lesson.l4}</div>
          </div>
        )}
        {(saturday || lesson.quizDay) && (
          <button onClick={onQuiz} className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-white/90">
            <Icon name="clipboard" size={14} /> Saturday: last lesson + 30-min L4 quiz on Week {w.id}
          </button>
        )}
      </div>
    </section>
  );
}

function MarkDone({ lesson }) {
  const L = useLearn();
  const p = L.progress[lesson.id];
  const [level, setLevel] = useState(p?.level || 0);
  const [note, setNote] = useState(p?.note || "");
  const logged = L.sessions.filter((s) => s.date === L.today && s.lessonId === lesson.id).reduce((a, s) => a + (s.minutes || 0), 0);
  const [mins, setMins] = useState(120);
  useEffect(() => {
    setLevel(p?.level || 0);
    setNote(p?.note || "");
  }, [lesson.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const timerOpen = timerState()?.lessonId === lesson.id;

  const done = async () => {
    await L.setLesson(lesson.id, { status: "done", level, note: note.trim(), doneOn: L.today, startedOn: p?.startedOn || L.today }, level >= 4 ? `${lesson.id} done at L4 ✓` : `${lesson.id} done at L${level || "?"} — counts as partial until L4`);
    if (!logged && !timerOpen && mins) L.logMinutes(L.today, lesson.id, mins);
  };

  return (
    <FinCard title={`Finish ${lesson.id}`} action={<StatePill p={p} small />}>
      <div className={kicker}>Level reached</div>
      <LevelPicker value={level} onChange={setLevel} />
      <div className="mt-1.5 text-[12px] text-fin-faint">Only L4 counts as fully done — answer an L4 question out loud, without notes.</div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="One line: what clicked, what didn't"
        className="mt-3 w-full rounded-xl bg-fin-input px-3 py-2.5 text-[14.5px] text-white outline-none placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50"
        aria-label="One-line note"
      />
      {!logged && !timerOpen && (
        <div className="mt-3">
          <div className="mb-1 text-[12px] text-fin-muted">Time studied (no timer used)</div>
          <div className="flex gap-1.5">
            {MINUTES.map((m) => (
              <button key={m} onClick={() => setMins(m)} className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold ${mins === m ? "bg-fin-accent/25 text-white" : "bg-fin-input text-white/65"}`}>
                {m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60} h`}
              </button>
            ))}
          </div>
        </div>
      )}
      {logged > 0 && <div className="mt-2 text-[12.5px] text-fin-muted">{logged} min logged today.</div>}
      <PrimaryButton className="mt-3 w-full !py-3" onClick={done} disabled={!level}>
        {level ? `Mark ${lesson.id} done · L${level}` : "Pick the level reached"}
      </PrimaryButton>
    </FinCard>
  );
}

function DoneCard({ lesson }) {
  const L = useLearn();
  const p = L.progress[lesson.id];
  const [level, setLevel] = useState(p?.level || 0);
  useEffect(() => setLevel(p?.level || 0), [p?.level]);
  return (
    <FinCard title={`${lesson.id} · done today`} action={<StatePill p={p} small />}>
      <div className="text-[14px] text-white/85">{lesson.topic}</div>
      {p?.note && <div className="mt-1.5 text-[13px] italic text-fin-muted">“{p.note}”</div>}
      {(p?.level || 0) < 4 && (
        <>
          <div className={`${kicker} mt-3`}>Reached a higher level later?</div>
          <LevelPicker value={level} onChange={(v) => { setLevel(v); v && L.setLesson(lesson.id, { level: v }, v >= 4 ? `${lesson.id} now at L4 ✓` : undefined); }} compact />
        </>
      )}
      <button onClick={() => L.setLesson(lesson.id, { status: "in_progress", doneOn: "" }, "Marked not done")} className="mt-3 text-[12.5px] text-fin-faint underline hover:text-white">Undo “done”</button>
    </FinCard>
  );
}

function UpNext({ openLesson }) {
  const L = useLearn();
  const { schedule } = L;
  const list = LESSONS.filter((l) => !(L.progress[l.id]?.status === "done")).slice(schedule.current ? 1 : 0, 6);
  if (!list.length) return null;
  return (
    <FinCard title="Coming up">
      <div className="space-y-1">
        {list.map((l) => (
          <button key={l.id} onClick={() => openLesson(l.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-fin-input">
            <span className="tabular w-[52px] shrink-0 text-[13px] font-bold text-fin-accent">{l.id}</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-white/85">{l.topic}</span>
            <span className="shrink-0 text-[12px] text-fin-muted">{pretty(schedule.dates[l.id], { weekday: "short", day: "numeric" })}</span>
          </button>
        ))}
      </div>
    </FinCard>
  );
}

function MiniStats({ go }) {
  const L = useLearn();
  const { stats, schedule } = L;
  const openWeak = L.weak.filter((w) => w.status === "open").length;
  const ahead = stats.done - stats.planned;
  return (
    <FinCard title="At a glance">
      <div className="grid grid-cols-3 gap-2 text-center">
        <button onClick={() => go("stats")} className="rounded-2xl bg-fin-input px-2 py-2.5">
          <div className="tabular text-[22px] font-extrabold">{stats.streak}</div>
          <div className="text-[11.5px] text-fin-muted">day streak</div>
        </button>
        <button onClick={() => go("roadmap")} className="rounded-2xl bg-fin-input px-2 py-2.5">
          <div className="tabular text-[22px] font-extrabold">{stats.done}<span className="text-[13px] text-fin-muted">/174</span></div>
          <div className="text-[11.5px] text-fin-muted">{stats.partial ? `${stats.full} at L4` : "lessons done"}</div>
        </button>
        <button onClick={() => go("weak")} className="rounded-2xl bg-fin-input px-2 py-2.5">
          <div className={`tabular text-[22px] font-extrabold ${openWeak ? "text-amber-300" : ""}`}>{openWeak}</div>
          <div className="text-[11.5px] text-fin-muted">weak topics</div>
        </button>
      </div>
      <div className="mt-3 text-[13px] text-fin-muted">
        {stats.planned === 0 ? "Plan hasn't started yet." : ahead >= 0 ? (ahead ? `${ahead} lesson${ahead === 1 ? "" : "s"} ahead of plan.` : "Right on plan.") : `${-ahead} lesson${ahead === -1 ? "" : "s"} behind — the plan has shifted, nothing doubles up.`}
        {schedule.finish && <> Finish: <b className="text-white/85">{pretty(schedule.finish, { day: "numeric", month: "short", year: "numeric" })}</b>.</>}
      </div>
    </FinCard>
  );
}

