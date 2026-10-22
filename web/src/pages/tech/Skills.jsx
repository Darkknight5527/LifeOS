// Skills: your skill map (where you are vs where you want to be), each
// skill's learning page, and the learning path.
import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../components/Toast.jsx";
import { useTech } from "./TechContext.jsx";
import { AREAS, LEVELS, SKILL_PRESETS, STARTER_PATH, STATUS, hours, isGap, safeUrl } from "./lib";
import { COL, EditText, LevelDots, SkillChip, SkillSelect, input, kicker, select, useNav } from "./ui.jsx";
import { isDue } from "../mental/skills/SkillsContext.jsx";
import { EmptyState, FinCard, GhostButton, Icon, PrimaryButton, Sheet } from "../finances/fin-ui.jsx";

const presetArea = (name) => SKILL_PRESETS.find((a) => a.names.includes(name))?.area || "Other";

// ============================== Skill map ==============================
export function SkillMapView() {
  const t = useTech();
  const nav = useNav();
  const [adding, setAdding] = useState(false);
  const usedBy = useMemo(() => {
    const m = {};
    for (const p of t.projects) if (p.status !== "idea") for (const id of p.skills || []) (m[id] ||= []).push(p);
    return m;
  }, [t.projects]);
  const due = useMemo(() => {
    const m = {};
    for (const c of t.cards) if (c.skillId && isDue(c, t.today)) m[c.skillId] = (m[c.skillId] || 0) + 1;
    return m;
  }, [t.cards, t.today]);
  const areas = [...new Set([...AREAS, ...t.skills.map((s) => s.area || "Other")])].filter((a) => t.skills.some((s) => (s.area || "Other") === a));
  const gaps = t.skills.filter(isGap).sort((a, b) => b.target - b.level - (a.target - a.level));
  // Skills a project you're building needs but you're weak in: learn these first.
  const urgent = gaps.filter((s) => (usedBy[s._id] || []).some((p) => p.status === "building" || p.status === "planned"));

  if (!t.skills.length) {
    return (
      <div className="mx-auto max-w-[560px]">
        <FinCard>
          <EmptyState icon="target">Map the skills you have and the ones you need. Each skill then collects its courses, notes, flashcards and study time — and links to the projects that use it.</EmptyState>
          <PrimaryButton className="w-full" onClick={() => setAdding(true)}>Pick your skills</PrimaryButton>
        </FinCard>
        <AddSkillsSheet open={adding} onClose={() => setAdding(false)} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(300px,1fr)_2fr] lg:gap-4 [&>*]:min-w-0">
      <div className={COL}>
        <FinCard title="Learn these first">
          {urgent.length ? (
            <div className="space-y-1.5">
              {urgent.slice(0, 5).map((s) => (
                <button key={s._id} onClick={() => nav.open("skill", s._id)} className="block w-full rounded-2xl bg-fin-input px-3.5 py-2.5 text-left hover:bg-fin-tile">
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-300" /><span className="text-[14.5px] font-semibold">{s.name}</span><span className="ml-auto text-[12px] text-fin-muted">{s.level} → {s.target}</span></div>
                  <div className="mt-0.5 truncate pl-4 text-[12.5px] text-fin-muted">Needed for {(usedBy[s._id] || []).map((p) => p.name).join(", ")}</div>
                </button>
              ))}
            </div>
          ) : gaps.length ? (
            <div className="text-[13.5px] text-fin-muted">No project is waiting on a weak skill right now. Your biggest gap: <button className="font-semibold text-fin-accent" onClick={() => nav.open("skill", gaps[0]._id)}>{gaps[0].name}</button>.</div>
          ) : (
            <div className="text-[13.5px] text-fin-muted">No big gaps — every skill is within one level of where you want it.</div>
          )}
          <div className="mt-3 text-[12px] leading-snug text-fin-faint">A gap is a skill two or more levels below your target. Ones a planned or active project needs come first.</div>
        </FinCard>
        <FinCard title="Levels">
          <div className="space-y-1 text-[13px]">
            {LEVELS.map((l, i) => (
              <div key={l} className="flex gap-2"><span className="tabular w-4 text-fin-faint">{i}</span><span className="text-fin-muted">{l}</span></div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[12px] text-fin-faint"><span className="h-3 w-3 rounded-full ring-2 ring-[#f2c14e]/85" /> gold ring = your target</div>
          <PrimaryButton className="mt-4 w-full !py-2.5 !text-[14px]" onClick={() => setAdding(true)}>+ Add skills</PrimaryButton>
        </FinCard>
      </div>
      <div className={COL}>
        {areas.map((area) => (
          <FinCard key={area} title={area}>
            <div className="space-y-1.5">
              {t.skills
                .filter((s) => (s.area || "Other") === area)
                .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name))
                .map((s) => (
                  <div key={s._id} role="button" tabIndex={0} onClick={() => nav.open("skill", s._id)} onKeyDown={(e) => e.key === "Enter" && nav.open("skill", s._id)} className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-fin-input px-3.5 py-2.5 transition hover:bg-fin-tile">
                    <div className="min-w-[150px] flex-1">
                      <div className="flex items-center gap-2 text-[14.5px] font-semibold">
                        {s.name}
                        {isGap(s) && <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">gap</span>}
                      </div>
                      <div className="text-[12px] text-fin-muted">
                        {[LEVELS[s.level || 0], (t.skillMin[s._id] || 0) > 0 && `${hours(t.skillMin[s._id])} studied`, usedBy[s._id]?.length && `${usedBy[s._id].length} project${usedBy[s._id].length === 1 ? "" : "s"}`, due[s._id] && `${due[s._id]} card${due[s._id] === 1 ? "" : "s"} due`].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <LevelDots level={s.level || 0} target={s.target || 0} onChange={(level) => t.patch("skills", s, { level })} label={`${s.name} level`} />
                  </div>
                ))}
            </div>
          </FinCard>
        ))}
      </div>
      <AddSkillsSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function AddSkillsSheet({ open, onClose }) {
  const t = useTech();
  const [picked, setPicked] = useState([]);
  const [own, setOwn] = useState({ name: "", area: "Other" });
  useEffect(() => {
    if (open) {
      setPicked([]);
      setOwn({ name: "", area: "Other" });
    }
  }, [open]);
  const have = new Set(t.skills.map((s) => s.name.toLowerCase()));
  const toggle = (n) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  const save = async () => {
    const list = [...picked.map((name) => ({ name, area: presetArea(name) })), ...(own.name.trim() && !have.has(own.name.trim().toLowerCase()) ? [{ name: own.name.trim(), area: own.area }] : [])];
    let order = t.skills.length;
    for (const s of list) await t.create("skills", { ...s, level: 1, target: 4, order: order++ });
    onClose();
  };
  const count = picked.length + (own.name.trim() ? 1 : 0);
  return (
    <Sheet open={open} onClose={onClose} title="Add skills" footer={<PrimaryButton className="flex-1" disabled={!count} onClick={save}>Add {count || ""} skill{count === 1 ? "" : "s"}</PrimaryButton>}>
      <div className="space-y-4">
        <div className="text-[13.5px] text-fin-muted">Pick the skills you use or want to learn. You'll set your level for each on the map (they start at 1, target 4).</div>
        {SKILL_PRESETS.map((a) => (
          <div key={a.area}>
            <div className={kicker}>{a.area}</div>
            <div className="flex flex-wrap gap-1.5">
              {a.names.map((n) => {
                const had = have.has(n.toLowerCase());
                const on = picked.includes(n);
                return (
                  <button key={n} disabled={had} aria-pressed={on} onClick={() => toggle(n)} className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${had ? "border-transparent bg-fin-input text-fin-faint line-through" : on ? "border-fin-accent bg-fin-accent/15 text-fin-accent" : "border-transparent bg-fin-input text-white/80 hover:bg-fin-tile"}`}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div>
          <div className={kicker}>Your own</div>
          <div className="flex gap-2">
            <input value={own.name} onChange={(e) => setOwn({ ...own, name: e.target.value })} placeholder="e.g. Shmoo analysis" className={`${input} !py-2.5`} maxLength={80} aria-label="Your own skill" />
            <select value={own.area} onChange={(e) => setOwn({ ...own, area: e.target.value })} className={`${select} !w-[150px] shrink-0 !py-2.5 !text-[14px]`} aria-label="Area">
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function Section({ title, children, action }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={`${kicker} !mb-0`}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ============================== One skill: its learning page ==============================
export function SkillSheet({ id }) {
  const t = useTech();
  const nav = useNav();
  const toast = useToast();
  const s = id ? t.skill[id] : null;
  const [card, setCard] = useState({ front: "", back: "" });
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => {
    setCard({ front: "", back: "" });
    setConfirmDel(false);
  }, [id]);
  if (!s) return <Sheet open={false} onClose={nav.close} />;
  const save = (data) => t.patch("skills", s, data);
  const projects = t.projects.filter((p) => (p.skills || []).includes(s._id));
  const courses = t.courses.filter((c) => (c.skills || []).includes(s._id));
  const topics = t.topics.filter((x) => x.skillId === s._id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const notes = t.notes.filter((n) => n.skillId === s._id).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const resources = t.resources.filter((r) => r.skillId === s._id);
  const cards = t.cards.filter((c) => c.skillId === s._id);
  const dueCards = cards.filter((c) => isDue(c, t.today)).length;
  const running = t.timer?.kind === "study" && t.timer.skillId === s._id && !t.timer.courseId;
  const addCard = async () => {
    if (!card.front.trim()) return;
    await t.create("cards", { front: card.front.trim(), back: card.back.trim(), skillId: s._id }, "Card added");
    setCard({ front: "", back: "" });
  };
  const link = "text-[12.5px] font-semibold text-fin-accent hover:underline";

  return (
    <Sheet open onClose={nav.close} title={s.name} wide titleExtra={isGap(s) ? <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[11.5px] font-semibold text-amber-200">gap</span> : null}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-fin-input p-3.5">
            <div>
              <div className="text-[12px] text-fin-muted">Your level · {LEVELS[s.level || 0]}</div>
              <div className="mt-1.5"><LevelDots level={s.level || 0} target={s.target || 0} onChange={(level) => save({ level })} label="Your level" /></div>
            </div>
            <div>
              <div className="text-[12px] text-fin-muted">Target · {LEVELS[s.target || 0]}</div>
              <div className="mt-1.5"><LevelDots level={s.target || 0} onChange={(target) => save({ target })} label="Target level" /></div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ["Studied", hours(t.skillMin[s._id] || 0)],
              ["Projects", projects.length],
              ["Cards due", dueCards],
              ["Notes", notes.length],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-fin-input px-1 py-2">
                <div className="text-[11.5px] text-fin-muted">{k}</div>
                <div className="tabular text-[17px] font-extrabold">{v}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => (running ? t.stopTimer() : t.startTimer({ kind: "study", skillId: s._id }) || toast("Stop the running timer first"))}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[14px] font-bold ${running ? "bg-fin-accent text-[#052e16]" : "bg-fin-accent/15 text-fin-accent hover:bg-fin-accent/25"}`}
            >
              <Icon name={running ? "pause" : "play"} size={14} stroke={2.4} /> {running ? "Stop & save" : "Study now"}
            </button>
            {cards.length > 0 && <button onClick={() => nav.go("notes", "cards", { cardSkill: s._id })} className="rounded-xl bg-fin-tile px-4 py-2 text-[14px] font-semibold">Review cards{dueCards ? ` (${dueCards})` : ""}</button>}
            <button onClick={() => nav.go("notes", "notes", { newNoteSkill: s._id })} className="rounded-xl bg-fin-tile px-4 py-2 text-[14px] font-semibold">+ Note</button>
          </div>

          <Section title={`Projects using it · ${projects.length}`}>
            {projects.length ? (
              <div className="space-y-1">
                {projects.map((p) => (
                  <button key={p._id} onClick={() => nav.open("project", p._id)} className="flex w-full items-center gap-2 rounded-xl bg-fin-input px-3 py-2 text-left hover:bg-fin-tile">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS[p.status]?.color }} />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{p.name}</span>
                    <span className="text-[12px] text-fin-muted">{STATUS[p.status]?.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-fin-faint">No project uses it yet — practising it in a project is the fastest way to level up.</div>
            )}
          </Section>

          <Section title={`Courses · ${courses.length}`} action={<button className={link} onClick={() => nav.go("learn", "courses", { newCourseSkill: s._id })}>+ Course</button>}>
            {courses.length ? (
              <div className="space-y-1">
                {courses.map((c) => {
                  const done = (c.modules || []).filter((m) => m.done).length;
                  return (
                    <button key={c._id} onClick={() => nav.open("course", c._id)} className="flex w-full items-center gap-2 rounded-xl bg-fin-input px-3 py-2 text-left hover:bg-fin-tile">
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{c.title}</span>
                      <span className="tabular text-[12px] text-fin-muted">{c.modules?.length ? `${done}/${c.modules.length}` : c.progress != null ? `${c.progress}%` : c.status}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-[13px] text-fin-faint">No course linked.</div>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title={`On your learning path · ${topics.length}`} action={<button className={link} onClick={() => nav.go("skills", "path")}>Open path</button>}>
            {topics.length ? (
              <div className="space-y-1">
                {topics.map((x) => (
                  <button key={x._id} role="checkbox" aria-checked={x.done} onClick={() => t.patch("topics", x, { done: !x.done })} className="flex w-full items-center gap-2.5 rounded-xl bg-fin-input px-3 py-2 text-left">
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${x.done ? "border-fin-accent bg-fin-accent text-[#052e16]" : "border-white/25"}`}>{x.done && <Icon name="check" size={12} stroke={3} />}</span>
                    <span className={`min-w-0 flex-1 text-[13.5px] ${x.done ? "text-fin-muted line-through" : ""}`}>{x.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-fin-faint">No path topics for this skill.</div>
            )}
          </Section>

          <Section title={`Notes · ${notes.length}`}>
            {notes.length ? (
              <div className="space-y-1">
                {notes.slice(0, 6).map((n) => (
                  <button key={n._id} onClick={() => nav.go("notes", "notes", { noteId: n._id })} className="block w-full truncate rounded-xl bg-fin-input px-3 py-2 text-left text-[13.5px] font-semibold hover:bg-fin-tile">{n.title}</button>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-fin-faint">No notes yet.</div>
            )}
          </Section>

          <Section title={`Resources · ${resources.length}`} action={<button className={link} onClick={() => nav.go("learn", "resources", { newResourceSkill: s._id })}>+ Resource</button>}>
            {resources.length ? (
              <div className="space-y-1">
                {resources.map((r) => (
                  <a key={r._id} href={safeUrl(r.url) || undefined} target="_blank" rel="noreferrer noopener" onClick={(e) => !safeUrl(r.url) && (e.preventDefault(), nav.go("learn", "resources"))} className="flex items-center gap-2 rounded-xl bg-fin-input px-3 py-2 text-[13.5px] hover:bg-fin-tile">
                    <span className={`min-w-0 flex-1 truncate ${r.done ? "text-fin-muted line-through" : "font-semibold"}`}>{r.title}</span>
                    <span className="text-[11.5px] text-fin-faint">{r.kind}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-fin-faint">Nothing saved to study.</div>
            )}
          </Section>

          <Section title={`Flashcards · ${cards.length}`}>
            <div className="space-y-2">
              <input value={card.front} onChange={(e) => setCard({ ...card, front: e.target.value })} placeholder="Question, e.g. What does ATPG stand for?" className={`${input} !py-2.5 !text-[14px]`} maxLength={400} aria-label="Card question" />
              <div className="flex gap-2">
                <input value={card.back} onChange={(e) => setCard({ ...card, back: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addCard()} placeholder="Answer" className={`${input} !py-2.5 !text-[14px]`} maxLength={2000} aria-label="Card answer" />
                <button onClick={addCard} disabled={!card.front.trim()} className="shrink-0 rounded-2xl bg-fin-tile px-4 text-[14px] font-semibold disabled:opacity-40">Add</button>
              </div>
            </div>
          </Section>

          <Section title="Notes on this skill">
            <EditText value={s.note} onSave={(note) => save({ note })} multiline rows={2} placeholder="What does 'strong' look like for you here?" label="Skill note" />
          </Section>

          <div className="flex items-center gap-2">
            <select value={s.area || "Other"} onChange={(e) => save({ area: e.target.value })} className={`${select} !w-auto !py-2 !text-[13.5px]`} aria-label="Area">
              {[...new Set([...AREAS, s.area || "Other"])].map((a) => <option key={a}>{a}</option>)}
            </select>
            {confirmDel ? (
              <>
                <GhostButton className="ml-auto !px-3 !py-2 !text-[13.5px]" onClick={() => setConfirmDel(false)}>Keep</GhostButton>
                <button onClick={() => (nav.close(), t.remove("skills", s, "Skill removed"))} className="rounded-2xl bg-red-500/15 px-3 py-2 text-[13.5px] font-semibold text-fin-danger">Remove</button>
              </>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="ml-auto text-[13px] text-fin-faint hover:text-fin-danger">Remove skill…</button>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// ============================== Learning path ==============================
export function PathView() {
  const t = useTech();
  const nav = useNav();
  const toast = useToast();
  const [f, setF] = useState({ title: "", stage: "", newStage: "", skillId: "" });
  const [busy, setBusy] = useState(false);
  const topics = [...t.topics].sort((a, b) => (a.order || 0) - (b.order || 0));
  const stages = [...new Set(topics.map((x) => x.stage || "My path"))];
  const next = topics.find((x) => !x.done);
  const done = topics.filter((x) => x.done).length;

  const loadStarter = async (withSkills) => {
    setBusy(true);
    const byName = Object.fromEntries(t.skills.map((s) => [s.name.toLowerCase(), s._id]));
    let order = t.skills.length;
    if (withSkills) {
      const need = [...new Set(STARTER_PATH.flatMap(([, list]) => list.map(([, sk]) => sk)))].filter((n) => !byName[n.toLowerCase()]);
      for (const name of need) {
        const doc = await t.create("skills", { name, area: presetArea(name), level: 1, target: 4, order: order++ });
        if (doc) byName[name.toLowerCase()] = doc._id;
      }
    }
    let i = topics.length;
    const items = STARTER_PATH.flatMap(([stage, list]) => list.map(([title, sk]) => ({ title, stage, skillId: byName[sk.toLowerCase()] || "", order: (i++) * 10 })));
    for (const it of items) await t.create("topics", it);
    setBusy(false);
    toast(`Added ${items.length} topics`);
  };
  const add = async () => {
    const stage = (f.stage === "__new" ? f.newStage : f.stage || stages[stages.length - 1] || "My path").trim() || "My path";
    if (!f.title.trim()) return;
    const last = topics.filter((x) => (x.stage || "My path") === stage).pop();
    await t.create("topics", { title: f.title.trim(), stage, skillId: f.skillId, order: last ? (last.order || 0) + 1 : topics.length * 10 });
    setF({ ...f, title: "", newStage: "", stage: stage });
  };

  if (!topics.length) {
    return (
      <div className="mx-auto max-w-[620px]">
        <FinCard>
          <EmptyState icon="target">A learning path is your roadmap as a list of topics in order — so you always know what to study next.</EmptyState>
          <div className="rounded-2xl bg-fin-input p-4">
            <div className="text-[15px] font-bold">Starter path: Test → Validation → Verification</div>
            <div className="mt-1 text-[13px] leading-relaxed text-fin-muted">{STARTER_PATH.map(([s, l]) => `${s} (${l.length})`).join(" · ")}. You can edit, reorder or delete any topic after.</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <PrimaryButton className="!py-2.5 !text-[14px]" disabled={busy} onClick={() => loadStarter(true)}>{busy ? "Adding…" : "Use it + add its skills"}</PrimaryButton>
              <GhostButton className="!py-2.5 !text-[14px]" disabled={busy} onClick={() => loadStarter(false)}>Topics only</GhostButton>
            </div>
          </div>
          <div className="mt-4 text-center text-[13px] text-fin-muted">Or start your own by adding a topic below.</div>
          <AddTopic f={f} setF={setF} stages={stages} add={add} />
        </FinCard>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(300px,1fr)_2fr] lg:gap-4 [&>*]:min-w-0">
      <div className={COL}>
        <section className="relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6ee7a0] via-[#22c55e] to-[#15803d] p-6 text-[#052e16] shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="text-[14px] font-semibold opacity-80">Next up</div>
          {next ? (
            <>
              <div className="mt-1 text-[20px] font-extrabold leading-tight">{next.title}</div>
              <div className="mt-1 text-[13px] font-semibold opacity-80">{next.stage}{next.skillId && t.skill[next.skillId] ? ` · ${t.skill[next.skillId].name}` : ""}</div>
              <div className="mt-3 flex gap-2">
                {next.skillId && t.skill[next.skillId] && <button onClick={() => nav.open("skill", next.skillId)} className="rounded-xl bg-black/15 px-3 py-1.5 text-[13px] font-bold">Open skill</button>}
                <button onClick={() => t.patch("topics", next, { done: true }, "Topic done")} className="rounded-xl bg-white px-3 py-1.5 text-[13px] font-bold text-[#15803d]">Mark done</button>
              </div>
            </>
          ) : (
            <div className="mt-1 text-[20px] font-extrabold">Path complete 🎉</div>
          )}
          <div className="mt-4 h-2 rounded-full bg-black/15"><div className="h-full rounded-full bg-white" style={{ width: `${(done / topics.length) * 100}%` }} /></div>
          <div className="tabular mt-1 text-[12.5px] font-semibold opacity-80">{done} of {topics.length} topics</div>
        </section>
        <FinCard title="Add a topic">
          <AddTopic f={f} setF={setF} stages={stages} add={add} />
        </FinCard>
      </div>
      <div className={COL}>
        {stages.map((stage) => {
          const list = topics.filter((x) => (x.stage || "My path") === stage);
          const n = list.filter((x) => x.done).length;
          return (
            <FinCard key={stage} title={stage} action={<span className="tabular text-[12.5px] text-fin-muted">{n}/{list.length}</span>}>
              <div className="space-y-1">
                {list.map((x, i) => (
                  <div key={x._id} className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 ${x === next ? "bg-fin-accent/10 ring-1 ring-fin-accent/40" : "bg-fin-input"}`}>
                    <button role="checkbox" aria-checked={x.done} aria-label={x.title} onClick={() => t.patch("topics", x, { done: !x.done })} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${x.done ? "border-fin-accent bg-fin-accent text-[#052e16]" : "border-white/25"}`}>
                      {x.done && <Icon name="check" size={12} stroke={3} />}
                    </button>
                    <span className={`min-w-0 flex-1 text-[14px] ${x.done ? "text-fin-muted line-through" : ""}`}>{x.title}</span>
                    {x.skillId && <span className="hidden sm:inline"><SkillChip id={x.skillId} small /></span>}
                    <span className="flex shrink-0 opacity-50 group-hover:opacity-100">
                      <button disabled={!i} onClick={() => swap(t, list[i - 1], x)} className="px-1 text-fin-faint hover:text-white disabled:opacity-20" aria-label={`Move ${x.title} up`}>↑</button>
                      <button disabled={i === list.length - 1} onClick={() => swap(t, x, list[i + 1])} className="px-1 text-fin-faint hover:text-white disabled:opacity-20" aria-label={`Move ${x.title} down`}>↓</button>
                      <button onClick={() => t.remove("topics", x, "Topic removed")} className="px-1 text-fin-faint hover:text-fin-danger" aria-label={`Remove ${x.title}`}>✕</button>
                    </span>
                  </div>
                ))}
              </div>
            </FinCard>
          );
        })}
      </div>
    </div>
  );
}
function swap(t, a, b) {
  const ao = a.order || 0;
  const bo = b.order || 0;
  t.patch("topics", a, { order: bo === ao ? ao + 1 : bo });
  t.patch("topics", b, { order: ao });
}
function AddTopic({ f, setF, stages, add }) {
  return (
    <div className="mt-3 space-y-2">
      <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Topic, e.g. Scan chain insertion" className={`${input} !py-2.5`} maxLength={160} aria-label="Topic" />
      <div className="grid grid-cols-2 gap-2">
        <select value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })} className={`${select} !py-2.5 !text-[14px]`} aria-label="Stage">
          {stages.length ? null : <option value="">My path</option>}
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="__new">New stage…</option>
        </select>
        <SkillSelect value={f.skillId} onChange={(skillId) => setF({ ...f, skillId })} />
      </div>
      {f.stage === "__new" && <input value={f.newStage} onChange={(e) => setF({ ...f, newStage: e.target.value })} placeholder="Stage name" className={`${input} !py-2.5`} maxLength={60} aria-label="New stage name" />}
      <PrimaryButton className="w-full !py-2.5 !text-[14px]" disabled={!f.title.trim()} onClick={add}>Add topic</PrimaryButton>
    </div>
  );
}
