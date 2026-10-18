// Learn: today (study timer, what's next, cards due), courses and resources.
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../components/Toast.jsx";
import { closePdfReader, openPdfReader } from "../../lib/inApp.js";
import { useTech } from "./TechContext.jsx";
import { RESOURCE_KINDS, addDays, daysBetween, hours, isoDate, mondayOf, parseISO, prettyDate, safeUrl } from "./lib";
import { COL, CheckList, EditText, SkillChip, SkillPicker, SkillSelect, input, kicker, select, useElapsed, useNav } from "./ui.jsx";
import { isDue } from "../mental/skills/SkillsContext.jsx";
import { EmptyState, FinCard, GhostButton, Icon, PrimaryButton, Ring, Sheet, TextField } from "../finances/fin-ui.jsx";
import { Chips } from "../mental/mind/MindViews.jsx";

const pdfKey = (r) => `res-${r._id}`;
const COURSE_STATUS = [
  { value: "active", label: "Doing" },
  { value: "planned", label: "Planned" },
  { value: "done", label: "Finished" },
  { value: "paused", label: "Paused" },
];

/** Days in a row (ending today or yesterday) with any study or build time. */
function streakOf(sessions, today) {
  const days = new Set(sessions.filter((s) => s.minutes > 0).map((s) => s.date));
  let d = days.has(today) ? today : isoDate(addDays(parseISO(today), -1));
  let n = 0;
  while (days.has(d)) {
    n++;
    d = isoDate(addDays(parseISO(d), -1));
  }
  return n;
}
const sessionLabel = (t, s) =>
  s.kind === "project" ? t.project[s.projectId]?.name || "Project" : t.course[s.courseId]?.title || t.skill[s.skillId]?.name || "General study";

// ============================== Today ==============================
export function LearnToday() {
  const t = useTech();
  const nav = useNav();
  const toast = useToast();
  const [pick, setPick] = useState({ courseId: "", skillId: "" });
  const [manual, setManual] = useState({ minutes: "", date: t.today });
  const time = useElapsed(t.timer?.start);
  const week = mondayOf(t.today);
  const weekMin = t.sessions.filter((s) => s.date >= week).reduce((a, s) => a + (s.minutes || 0), 0);
  const todayMin = t.sessions.filter((s) => s.date === t.today && s.kind !== "project").reduce((a, s) => a + (s.minutes || 0), 0);
  const goal = (t.settings?.weeklyGoal ?? 7) * 60;
  const streak = streakOf(t.sessions, t.today);
  const due = t.cards.filter((c) => isDue(c, t.today));
  const next = [...t.topics].sort((a, b) => (a.order || 0) - (b.order || 0)).find((x) => !x.done);
  const active = t.courses.filter((c) => c.status === "active");
  const todo = t.resources.filter((r) => !r.done).slice(0, 4);
  const recent = [...t.sessions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 12);
  const studying = t.timer && t.timer.kind !== "project";

  const start = () => {
    const course = t.course[pick.courseId];
    const skillId = pick.skillId || (course?.skills?.length === 1 ? course.skills[0] : "");
    if (!t.startTimer({ kind: "study", courseId: pick.courseId, skillId })) toast("Stop the running timer first");
  };
  const logManual = async () => {
    const m = Number(manual.minutes);
    if (!(m > 0)) return;
    await t.create("sessions", { date: manual.date || t.today, kind: "study", courseId: pick.courseId, skillId: pick.skillId, minutes: Math.min(600, Math.round(m)) }, `${Math.round(m)} min logged`);
    setManual({ minutes: "", date: t.today });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 [&>*]:min-w-0">
      <div className={COL}>
        <section className="relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6ee7a0] via-[#22c55e] to-[#15803d] p-6 text-[#052e16] shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="flex items-center gap-4">
            <Ring value={Math.min(weekMin, goal || 1)} max={goal || 1} color="#ffffff" track="rgba(0,0,0,.15)" size={88} stroke={8}>
              <div className="text-center leading-tight">
                <div className="tabular text-[17px] font-extrabold">{Math.round((weekMin / 60) * 10) / 10}</div>
                <div className="text-[10.5px] font-semibold opacity-75">of {goal / 60} h</div>
              </div>
            </Ring>
            <div>
              <div className="text-[14px] font-semibold opacity-80">This week</div>
              <div className="text-[13.5px] font-semibold">Studied today: {hours(todayMin)}</div>
              <div className="mt-1 text-[13.5px] font-semibold">{streak ? `🔥 ${streak}-day streak` : "Start a streak today"}</div>
            </div>
          </div>
        </section>
        <FinCard title="Study timer">
          {studying ? (
            <div className="text-center">
              <div className="text-[13.5px] text-fin-muted">{sessionLabel(t, t.timer)}</div>
              <div className="tabular my-1 text-[42px] font-extrabold">{time}</div>
              <PrimaryButton className="w-full" onClick={() => t.stopTimer()}>Stop & save</PrimaryButton>
            </div>
          ) : t.timer ? (
            <div className="text-[13.5px] text-fin-muted">A project timer is running — stop it at the top first.</div>
          ) : (
            <div className="space-y-2">
              <select value={pick.courseId} onChange={(e) => setPick({ ...pick, courseId: e.target.value })} className={`${select} !py-2.5 !text-[14px]`} aria-label="Course">
                <option value="">No course</option>
                {t.courses.filter((c) => c.status !== "done").map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
              <SkillSelect value={pick.skillId} onChange={(skillId) => setPick({ ...pick, skillId })} />
              <PrimaryButton className="w-full" onClick={start}>▶ Start studying</PrimaryButton>
              <details className="rounded-2xl bg-fin-input px-3.5 py-2.5">
                <summary className="cursor-pointer text-[13.5px] font-semibold text-white/80">Forgot the timer? Log time</summary>
                <div className="mt-2 flex gap-2">
                  <input type="number" min="1" max="600" value={manual.minutes} onChange={(e) => setManual({ ...manual, minutes: e.target.value })} placeholder="Minutes" className={`${input} !py-2 !text-[14px]`} aria-label="Minutes" />
                  <input type="date" value={manual.date} max={t.today} onChange={(e) => e.target.value && setManual({ ...manual, date: e.target.value })} className="rounded-xl bg-fin-tile px-2 text-[13px] text-white outline-none [color-scheme:dark]" aria-label="Date" />
                  <button onClick={logManual} className="shrink-0 rounded-xl bg-fin-tile px-3 text-[13.5px] font-semibold">Log</button>
                </div>
              </details>
            </div>
          )}
        </FinCard>
      </div>

      <div className={COL}>
        <FinCard title="Up next">
          <div className="space-y-2">
            <button onClick={() => nav.go("notes", "cards")} className="flex w-full items-center gap-3 rounded-2xl bg-fin-input px-3.5 py-3 text-left hover:bg-fin-tile">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fin-accent/15 text-fin-accent"><Icon name="copy" size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold">{due.length ? `${due.length} flashcard${due.length === 1 ? "" : "s"} due` : "No cards due"}</span>
                <span className="block text-[12.5px] text-fin-muted">{due.length ? "A few minutes of review keeps it in memory" : t.cards.length ? "All caught up" : "Add cards on any skill's page"}</span>
              </span>
            </button>
            {next && (
              <button onClick={() => nav.go("skills", "path")} className="flex w-full items-center gap-3 rounded-2xl bg-fin-input px-3.5 py-3 text-left hover:bg-fin-tile">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fin-accent/15 text-fin-accent"><Icon name="target" size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] text-fin-muted">Next on your path · {next.stage}</span>
                  <span className="block text-[14.5px] font-semibold">{next.title}</span>
                </span>
              </button>
            )}
          </div>
        </FinCard>
        <FinCard title="Courses you're doing">
          {active.length ? (
            <div className="space-y-2">
              {active.map((c) => {
                const mods = c.modules || [];
                const nextMod = mods.find((m) => !m.done);
                const done = mods.filter((m) => m.done).length;
                return (
                  <div key={c._id} className="rounded-2xl bg-fin-input px-3.5 py-3">
                    <button onClick={() => nav.open("course", c._id)} className="block w-full text-left">
                      <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{c.title}</span><span className="tabular text-[12px] text-fin-muted">{mods.length ? `${done}/${mods.length}` : ""}</span></div>
                      {mods.length > 0 && <div className="mt-1.5 h-1.5 rounded-full bg-black/30"><div className="h-full rounded-full bg-fin-accent" style={{ width: `${(done / mods.length) * 100}%` }} /></div>}
                    </button>
                    {nextMod && (
                      <button onClick={() => t.patch("courses", c, { modules: mods.map((m) => (m.id === nextMod.id ? { ...m, done: true } : m)) }, "Module done")} className="mt-2 flex w-full items-center gap-2 text-left text-[13px] text-white/80 hover:text-white">
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded border-2 border-white/30" />
                        <span className="truncate">Next: {nextMod.title}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[13.5px] text-fin-muted">No course in progress. <button className="font-semibold text-fin-accent" onClick={() => nav.go("learn", "courses")}>Add one</button></div>
          )}
        </FinCard>
        {todo.length > 0 && (
          <FinCard title="Saved to study">
            <div className="space-y-1">
              {todo.map((r) => (
                <button key={r._id} onClick={() => nav.go("learn", "resources")} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[13.5px] hover:bg-fin-input">
                  <Icon name={RESOURCE_KINDS.find((k) => k.value === r.kind)?.icon || "external"} size={14} className="shrink-0 text-fin-muted" />
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
            </div>
          </FinCard>
        )}
      </div>

      <div className={`${COL} lg:col-span-2 lg:h-auto xl:col-span-1 xl:h-[calc(100dvh-178px)]`}>
        <FinCard title="Recent sessions">
          {recent.length ? (
            <div className="space-y-1">
              {recent.map((s) => (
                <div key={s._id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13.5px] hover:bg-fin-input">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.kind === "project" ? "bg-[#60a5fa]" : "bg-fin-accent"}`} title={s.kind === "project" ? "Building" : "Studying"} />
                  <span className="tabular w-14 shrink-0 text-fin-faint">{s.date === t.today ? "Today" : prettyDate(s.date, { day: "numeric", month: "short" })}</span>
                  <span className="min-w-0 flex-1 truncate">{sessionLabel(t, s)}</span>
                  <span className="tabular shrink-0 font-semibold">{hours(s.minutes)}</span>
                  <button onClick={() => t.remove("sessions", s, "Session deleted")} className="shrink-0 text-fin-faint opacity-0 hover:text-fin-danger group-hover:opacity-100" aria-label="Delete session"><Icon name="trash" size={13} /></button>
                </div>
              ))}
              <div className="flex gap-3 pt-2 text-[11.5px] text-fin-faint">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-fin-accent" /> studying</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#60a5fa]" /> building</span>
              </div>
            </div>
          ) : (
            <EmptyState icon="clock">Time a study session and it shows up here. Small daily sessions beat long weekend ones.</EmptyState>
          )}
        </FinCard>
      </div>
    </div>
  );
}

// ============================== Courses ==============================
export function CoursesView() {
  const t = useTech();
  const nav = useNav();
  const [adding, setAdding] = useState(Boolean(nav.focus.newCourseSkill));
  const order = { active: 0, planned: 1, paused: 2, done: 3 };
  const list = [...t.courses].sort((a, b) => order[a.status] - order[b.status] || (b.updatedAt || 0) - (a.updatedAt || 0));
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[13.5px] text-fin-muted">{t.courses.filter((c) => c.status === "done").length} finished · {t.courses.filter((c) => c.status === "active").length} in progress</span>
        <PrimaryButton className="ml-auto !px-4 !py-2 !text-[14px]" onClick={() => setAdding(true)}>+ Add course</PrimaryButton>
      </div>
      {list.length ? (
        <div className="fin-scroll grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-h-[calc(100dvh-240px)] lg:overflow-y-auto lg:pr-1 xl:grid-cols-3">
          {list.map((c) => {
            const mods = c.modules || [];
            const done = mods.filter((m) => m.done).length;
            const left = c.targetDate && c.status !== "done" ? daysBetween(t.today, c.targetDate) : null;
            return (
              <button key={c._id} onClick={() => nav.open("course", c._id)} className="flex h-full flex-col rounded-[24px] bg-fin-card p-5 text-left shadow-card transition hover:bg-[#1f1f25]">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${c.status === "done" ? "bg-[#f2c14e]/15 text-[#f2c14e]" : c.status === "active" ? "bg-fin-accent/15 text-fin-accent" : "bg-white/10 text-white/60"}`}>{COURSE_STATUS.find((s) => s.value === c.status)?.label}</span>
                  {c.provider && <span className="truncate text-[12px] text-fin-faint">{c.provider}</span>}
                </div>
                <div className="mt-2 text-[16px] font-bold leading-snug">{c.title}</div>
                {mods.length > 0 && (
                  <div className="mt-3">
                    <div className="tabular flex justify-between text-[12px] text-fin-muted"><span>{done} of {mods.length} modules</span><span>{Math.round((done / mods.length) * 100)}%</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-black/30"><div className="h-full rounded-full bg-fin-accent" style={{ width: `${(done / mods.length) * 100}%` }} /></div>
                  </div>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">
                  {(c.skills || []).slice(0, 3).map((id) => <SkillChip key={id} id={id} small />)}
                  <span className="ml-auto text-[12px] text-fin-faint">
                    {[t.courseMin[c._id] && hours(t.courseMin[c._id]), left != null && (left >= 0 ? `${left} days left` : `${-left} days late`)].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto max-w-[560px]">
          <FinCard>
            <EmptyState icon="book">Add courses and certifications you're doing or planning. Paste the module list and tick them off as you go.</EmptyState>
          </FinCard>
        </div>
      )}
      <NewCourseSheet open={adding} skill={nav.focus.newCourseSkill} onClose={() => setAdding(false)} />
    </div>
  );
}

function NewCourseSheet({ open, onClose, skill }) {
  const t = useTech();
  const nav = useNav();
  const blank = () => ({ title: "", provider: "", url: "", modules: "", skills: skill ? [skill] : [], targetDate: "", status: "active" });
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (open) setF(blank());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    const modules = f.modules.split("\n").map((s) => s.replace(/^\s*[-•*\d.)]+\s*/, "").trim()).filter(Boolean).slice(0, 200).map((title, i) => ({ id: `${Date.now().toString(36)}${i}`, title: title.slice(0, 200), done: false }));
    const doc = await t.create("courses", { title: f.title.trim(), provider: f.provider.trim(), url: f.url.trim(), skills: f.skills, targetDate: f.targetDate, status: f.status, modules }, "Course added");
    onClose();
    if (doc && !String(doc._id).startsWith("tmp-")) nav.open("course", doc._id);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add course" footer={<PrimaryButton className="flex-1" disabled={!f.title.trim()} onClick={save}>Add course</PrimaryButton>}>
      <div className="space-y-3">
        <TextField autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Course or certification name" maxLength={160} />
        <div className="grid grid-cols-2 gap-2">
          <input value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} placeholder="Where (NPTEL, Coursera…)" className={input} maxLength={80} aria-label="Provider" />
          <input type="date" value={f.targetDate} onChange={(e) => setF({ ...f, targetDate: e.target.value })} className={`${input} [color-scheme:dark]`} aria-label="Finish by" title="Finish by" />
        </div>
        <input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="Link (optional)" className={input} maxLength={300} aria-label="Link" />
        <div>
          <div className={kicker}>Modules (one per line — paste from the course page)</div>
          <textarea rows={5} value={f.modules} onChange={(e) => setF({ ...f, modules: e.target.value })} placeholder={"Week 1: Introduction\nWeek 2: …"} className={input} />
        </div>
        <div>
          <div className={kicker}>Status</div>
          <Chips value={f.status} onChange={(status) => setF({ ...f, status })} options={COURSE_STATUS.filter((s) => s.value !== "done")} label="Status" />
        </div>
        <div>
          <div className={kicker}>Skills it teaches</div>
          <SkillPicker value={f.skills} onChange={(skills) => setF({ ...f, skills })} />
        </div>
      </div>
    </Sheet>
  );
}

export function CourseSheet({ id }) {
  const t = useTech();
  const nav = useNav();
  const toast = useToast();
  const c = id ? t.course[id] : null;
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => setConfirmDel(false), [id]);
  if (!c) return <Sheet open={false} onClose={nav.close} />;
  const save = (data, msg) => t.patch("courses", c, data, msg);
  const running = t.timer?.kind === "study" && t.timer.courseId === c._id;
  const url = safeUrl(c.url);
  const cert = safeUrl(c.certUrl);
  const mods = c.modules || [];
  const done = mods.filter((m) => m.done).length;
  return (
    <Sheet open onClose={nav.close} title={c.title} wide>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <EditText value={c.title} onSave={(title) => title && save({ title })} label="Course name" max={160} />
          <div className="grid grid-cols-2 gap-2">
            <EditText value={c.provider} onSave={(provider) => save({ provider })} placeholder="Where" className="!py-2.5 !text-[14px]" max={80} />
            <input type="date" value={c.targetDate || ""} onChange={(e) => save({ targetDate: e.target.value })} className={`${input} !py-2.5 !text-[14px] [color-scheme:dark]`} aria-label="Finish by" title="Finish by" />
          </div>
          <div className="flex gap-1.5">
            <EditText value={c.url} onSave={(v) => save({ url: v })} placeholder="Course link" className="!py-2.5 !text-[14px]" max={300} />
            {url && <a href={url} target="_blank" rel="noreferrer noopener" className="grid w-11 shrink-0 place-items-center rounded-2xl bg-fin-tile text-white/80 hover:text-white" aria-label="Open course"><Icon name="external" size={16} /></a>}
          </div>
          <div>
            <div className={kicker}>Status</div>
            <Chips value={c.status} onChange={(status) => save({ status }, status === "done" ? "Course finished 🎉" : undefined)} options={COURSE_STATUS} label="Status" />
          </div>
          <div>
            <div className={kicker}>Skills it teaches — tap to open</div>
            {c.skills?.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{c.skills.map((sid) => <SkillChip key={sid} id={sid} />)}</div>}
            <details className="rounded-2xl bg-fin-input px-3.5 py-2.5">
              <summary className="cursor-pointer text-[13.5px] font-semibold text-white/80">Change skills</summary>
              <div className="mt-2.5"><SkillPicker value={c.skills || []} onChange={(skills) => save({ skills })} /></div>
            </details>
          </div>
          {c.status === "done" && (
            <div className="flex gap-1.5">
              <EditText value={c.certUrl} onSave={(certUrl) => save({ certUrl })} placeholder="Certificate link" className="!py-2.5 !text-[14px]" max={300} />
              {cert && <a href={cert} target="_blank" rel="noreferrer noopener" className="grid w-11 shrink-0 place-items-center rounded-2xl bg-fin-tile text-white/80 hover:text-white" aria-label="Open certificate"><Icon name="external" size={16} /></a>}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-fin-input px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-fin-muted">Time studied</div>
              <div className="tabular text-[22px] font-extrabold">{hours(t.courseMin[c._id] || 0)}</div>
            </div>
            <button
              onClick={() => (running ? t.stopTimer() : t.startTimer({ kind: "study", courseId: c._id, skillId: c.skills?.length === 1 ? c.skills[0] : "" }) || toast("Stop the running timer first"))}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[14px] font-bold ${running ? "bg-fin-accent text-[#052e16]" : "bg-fin-tile hover:bg-[#30303a]"}`}
            >
              <Icon name={running ? "pause" : "play"} size={14} stroke={2.4} /> {running ? "Stop & save" : "Study"}
            </button>
          </div>
          <div>
            <div className={kicker}>Modules · {done}/{mods.length}</div>
            <CheckList items={mods} onChange={(modules) => save({ modules })} placeholder="Add a module" label="Modules" />
          </div>
          {confirmDel ? (
            <div className="flex gap-2">
              <GhostButton className="flex-1 !py-2.5" onClick={() => setConfirmDel(false)}>Keep</GhostButton>
              <button onClick={() => (nav.close(), t.remove("courses", c, "Course deleted"))} className="flex-1 rounded-2xl bg-red-500/15 py-2.5 font-semibold text-fin-danger">Delete course</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="text-[13px] text-fin-faint hover:text-fin-danger">Delete this course…</button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ============================== Resources ==============================
export function ResourcesView() {
  const t = useTech();
  const nav = useNav();
  const toast = useToast();
  const blank = () => ({ title: "", url: "", kind: "article", skillId: nav.focus.newResourceSkill || "" });
  const [f, setF] = useState(blank);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState("todo");
  const [skill, setSkill] = useState("");
  const fileRef = useRef(null);
  const list = useMemo(
    () => t.resources.filter((r) => (show === "all" || (show === "done" ? r.done : !r.done)) && (!skill || r.skillId === skill)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [t.resources, show, skill]
  );

  const add = async () => {
    if (!f.title.trim()) return;
    if (f.kind === "pdf" && file && file.type && file.type !== "application/pdf") return toast("Please choose a PDF file", true);
    setBusy(true);
    const doc = await t.create("resources", { title: f.title.trim(), url: f.url.trim(), kind: f.kind, skillId: f.skillId });
    if (doc && file && !String(doc._id).startsWith("tmp-")) {
      try {
        await api.uploadBook(pdfKey(doc), file);
        await t.patch("resources", doc, { hasPdf: true });
        toast("Saved with its PDF");
      } catch (err) {
        toast(`Saved, but the PDF didn't upload: ${err.message}`, true);
      }
    } else if (doc) toast("Saved");
    setBusy(false);
    setF(blank());
    setFile(null);
  };
  const openPdf = (r) => {
    const pending = api.bookFile(pdfKey(r)).then((res) => (res.ok ? res.blob() : null));
    openPdfReader(pending, { title: r.title });
    pending.then((b) => !b && (closePdfReader(), toast("PDF not found — add it again"))).catch(() => (closePdfReader(), toast("Couldn't open the PDF")));
  };
  const removeRes = async (r) => {
    if (r.hasPdf) api.deleteBook(pdfKey(r)).catch(() => {});
    t.remove("resources", r, "Removed");
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(320px,1fr)_2fr] lg:gap-4 [&>*]:min-w-0">
      <div className={COL}>
        <FinCard title="Save something to study">
          <div className="space-y-3">
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title, e.g. Scan chain basics (video)" className={input} maxLength={200} aria-label="Title" />
            <Chips value={f.kind} onChange={(kind) => setF({ ...f, kind })} options={RESOURCE_KINDS} label="Kind" />
            {f.kind === "pdf" ? (
              <div>
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <button onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border border-dashed border-white/15 px-4 py-3 text-left text-[14px] text-fin-muted hover:border-fin-accent/50 hover:text-white">
                  {file ? `📄 ${file.name}` : "Choose a PDF (opens in the in-app reader)"}
                </button>
              </div>
            ) : (
              <input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="Link" className={input} maxLength={500} aria-label="Link" />
            )}
            <SkillSelect value={f.skillId} onChange={(skillId) => setF({ ...f, skillId })} />
            <PrimaryButton className="w-full" disabled={!f.title.trim() || busy} onClick={add}>{busy ? "Saving…" : "Save"}</PrimaryButton>
          </div>
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard
          title="Resources"
          action={
            <div className="flex gap-1.5">
              <select value={show} onChange={(e) => setShow(e.target.value)} className="rounded-xl bg-fin-input px-2.5 py-1.5 text-[13px] text-white outline-none [color-scheme:dark]" aria-label="Show">
                <option value="todo">To study</option>
                <option value="done">Done</option>
                <option value="all">All</option>
              </select>
              <select value={skill} onChange={(e) => setSkill(e.target.value)} className="max-w-[150px] rounded-xl bg-fin-input px-2.5 py-1.5 text-[13px] text-white outline-none [color-scheme:dark]" aria-label="Skill">
                <option value="">All skills</option>
                {t.skills.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          }
        >
          {list.length ? (
            <div className="space-y-1.5">
              {list.map((r) => {
                const url = safeUrl(r.url);
                const kind = RESOURCE_KINDS.find((k) => k.value === r.kind);
                return (
                  <div key={r._id} className="group flex items-center gap-2.5 rounded-2xl bg-fin-input px-3 py-2.5">
                    <button role="checkbox" aria-checked={r.done} aria-label={`Done: ${r.title}`} onClick={() => t.patch("resources", r, { done: !r.done })} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${r.done ? "border-fin-accent bg-fin-accent text-[#052e16]" : "border-white/25"}`}>
                      {r.done && <Icon name="check" size={12} stroke={3} />}
                    </button>
                    <Icon name={kind?.icon || "external"} size={15} className="shrink-0 text-fin-muted" />
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[14px] font-semibold ${r.done ? "text-fin-muted line-through" : ""}`}>{r.title}</div>
                      {r.skillId && <div className="mt-0.5"><SkillChip id={r.skillId} small /></div>}
                    </div>
                    {r.hasPdf ? (
                      <button onClick={() => openPdf(r)} className="shrink-0 rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold">Read</button>
                    ) : url ? (
                      <a href={url} target="_blank" rel="noreferrer noopener" className="shrink-0 rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold">Open</a>
                    ) : null}
                    <button onClick={() => removeRes(r)} className="shrink-0 text-fin-faint opacity-60 hover:text-fin-danger group-hover:opacity-100" aria-label={`Remove ${r.title}`}><Icon name="trash" size={14} /></button>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="book">{show === "done" ? "Nothing finished yet." : "Save videos, articles and PDFs here instead of keeping 40 tabs open."}</EmptyState>
          )}
        </FinCard>
      </div>
    </div>
  );
}
