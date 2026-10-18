// Notes and flashcards for what you're learning.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTech } from "./TechContext.jsx";
import { prettyDate } from "./lib";
import { COL, SkillChip, SkillSelect, input, kicker, useNav } from "./ui.jsx";
import { AutoText } from "../mental/journal/TodayView.jsx";
import { GRADES, isDue, isMastered, nextText, reviewed } from "../mental/skills/SkillsContext.jsx";
import { haptic } from "../../lib/inApp.js";
import { EmptyState, FinCard, Icon, PrimaryButton } from "../finances/fin-ui.jsx";

const when = (ms) => prettyDate(new Date(ms || Date.now()).toLocaleDateString("en-CA"), { day: "numeric", month: "short" });

// ============================== Notes ==============================
export function NotesView() {
  const t = useTech();
  const nav = useNav();
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [sel, setSel] = useState(nav.focus.noteId || null);
  const made = useRef(false);
  // "+ Note" on a skill's page: start a new note for that skill.
  useEffect(() => {
    if (!nav.focus.newNoteSkill || made.current) return;
    made.current = true;
    newNote(nav.focus.newNoteSkill);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return t.notes
      .filter((n) => (!skill || n.skillId === skill) && (!s || n.title.toLowerCase().includes(s) || (n.body || "").toLowerCase().includes(s)))
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [t.notes, q, skill]);
  const note = t.notes.find((n) => n._id === sel) || null;

  async function newNote(skillId = skill) {
    const doc = await t.create("notes", { title: "Untitled note", body: "", skillId: skillId || "" });
    if (doc) setSel(doc._id);
  }
  const snippet = (n) => (n.body || "").replace(/\s+/g, " ").slice(0, 90);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(300px,1fr)_2fr] lg:gap-4 [&>*]:min-w-0">
      <div className={`${COL} ${note ? "hidden lg:block" : ""}`}>
        <FinCard title={`Notes · ${t.notes.length}`} action={<button onClick={() => newNote()} className="rounded-xl bg-fin-accent/15 px-3 py-1.5 text-[13px] font-semibold text-fin-accent hover:bg-fin-accent/25">+ New</button>}>
          <div className="mb-3 space-y-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" className={`${input} !py-2.5 !text-[14px]`} aria-label="Search notes" />
            <SkillSelect value={skill} onChange={setSkill} label="Filter by skill" />
          </div>
          {list.length ? (
            <div className="space-y-1">
              {list.map((n) => (
                <button key={n._id} onClick={() => setSel(n._id)} className={`block w-full rounded-2xl px-3 py-2 text-left transition ${n._id === sel ? "bg-fin-accent/10 ring-1 ring-fin-accent/40" : "bg-fin-input hover:bg-fin-tile"}`}>
                  <div className="flex items-center gap-1.5">
                    {n.pinned && <Icon name="pin" size={12} className="shrink-0 text-fin-accent" />}
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{n.title}</span>
                    <span className="shrink-0 text-[11.5px] text-fin-faint">{when(n.updatedAt)}</span>
                  </div>
                  {snippet(n) && <div className="truncate text-[12.5px] text-fin-muted">{snippet(n)}</div>}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-[13.5px] text-fin-muted">{t.notes.length ? "No notes match." : "Write down what you learn in your own words — it's the best way to remember it."}</div>
          )}
        </FinCard>
      </div>
      <div className={`${COL} ${note ? "" : "hidden lg:block"}`}>
        {note ? (
          <FinCard
            key={note._id}
            title={
              <button onClick={() => setSel(null)} className="flex items-center gap-1 normal-case tracking-normal text-fin-muted hover:text-white lg:pointer-events-none">
                <span className="lg:hidden"><Icon name="left" size={14} /></span>
                <span className="lg:uppercase lg:tracking-[0.08em]">Note</span>
              </button>
            }
            action={
              <div className="flex items-center gap-1">
                <button onClick={() => t.patch("notes", note, { pinned: !note.pinned })} className={`rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold ${note.pinned ? "bg-fin-accent/15 text-fin-accent" : "bg-fin-tile text-white/70"}`}>{note.pinned ? "Pinned" : "Pin"}</button>
                <button onClick={() => (setSel(null), t.remove("notes", note, "Note deleted"))} className="grid h-8 w-8 place-items-center rounded-xl text-fin-faint hover:bg-red-500/10 hover:text-fin-danger" aria-label="Delete note"><Icon name="trash" size={15} /></button>
              </div>
            }
          >
            <input
              defaultValue={note.title}
              onFocus={(e) => note.title === "Untitled note" && e.target.select()}
              onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== note.title && t.patch("notes", note, { title: e.target.value.trim() })}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-full bg-transparent text-[22px] font-extrabold outline-none placeholder:text-fin-faint"
              maxLength={160}
              aria-label="Note title"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="w-[220px]"><SkillSelect value={note.skillId} onChange={(skillId) => t.patch("notes", note, { skillId })} /></div>
              {note.skillId && <SkillChip id={note.skillId} />}
            </div>
            <div className="mt-3">
              <AutoText value={note.body} onSave={(body) => t.patch("notes", note, { body })} placeholder="Write it in your own words. What is it? Why does it matter? An example?" rows={12} max={20000} className={`${input} min-h-[260px] !text-[15px] leading-relaxed`} label="Note" />
            </div>
            <div className="mt-2 text-[12px] text-fin-faint">Saves as you type · edited {when(note.updatedAt)}</div>
          </FinCard>
        ) : (
          <FinCard>
            <EmptyState icon="list">Pick a note, or start a new one.</EmptyState>
            <PrimaryButton className="w-full" onClick={() => newNote()}>New note</PrimaryButton>
          </FinCard>
        )}
      </div>
    </div>
  );
}

// ============================== Flashcards ==============================
export function CardsView() {
  const t = useTech();
  const nav = useNav();
  const [skill, setSkill] = useState(nav.focus.cardSkill || "");
  const [queue, setQueue] = useState([]);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const [f, setF] = useState({ front: "", back: "", skillId: nav.focus.cardSkill || "" });

  const pool = useMemo(() => t.cards.filter((c) => !skill || c.skillId === skill), [t.cards, skill]);
  const dueCount = pool.filter((c) => isDue(c, t.today)).length;
  useEffect(() => {
    const due = pool.filter((c) => isDue(c, t.today));
    const learned = due.filter((c) => c.reps || c.lastReviewed);
    const fresh = due.filter((c) => !c.reps && !c.lastReviewed).slice(0, 10);
    setQueue([...learned, ...fresh].sort(() => Math.random() - 0.5).slice(0, 25).map((c) => c._id));
    setShown(false);
    setDone(0);
  }, [skill]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = t.cards.find((c) => c._id === queue[0]);
  const grade = (g) => {
    if (!card) return;
    haptic();
    t.patch("cards", card, reviewed(card, g, t.today));
    setShown(false);
    setDone((n) => n + 1);
    setQueue((q) => (g === 0 ? [...q.slice(1), q[0]] : q.slice(1)));
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input,textarea,select") || document.querySelector('[role="dialog"]')) return;
      if ((e.key === " " || e.key === "Enter") && card && !shown) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ["1", "2", "3", "4"].includes(e.key)) grade(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const add = async () => {
    if (!f.front.trim()) return;
    await t.create("cards", { front: f.front.trim(), back: f.back.trim(), skillId: f.skillId }, "Card added");
    setF((x) => ({ ...x, front: "", back: "" }));
  };
  const restart = () => {
    const due = pool.filter((c) => isDue(c, t.today));
    setQueue(due.map((c) => c._id));
    setDone(0);
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[3fr_2fr] lg:gap-4 [&>*]:min-w-0">
      <div className={COL}>
        <FinCard
          title={`Review${card ? ` · ${queue.length} left` : ""}`}
          action={
            <select value={skill} onChange={(e) => setSkill(e.target.value)} className="max-w-[180px] rounded-xl bg-fin-input px-2.5 py-1.5 text-[13px] text-white outline-none [color-scheme:dark]" aria-label="Skill">
              <option value="">All skills</option>
              {t.skills.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          }
        >
          {card ? (
            <div>
              <button onClick={() => setShown(true)} className="block min-h-[220px] w-full rounded-3xl bg-fin-input px-6 py-8 text-center" aria-label={shown ? "Answer shown" : "Show answer"}>
                {card.skillId && <div className="mb-3"><SkillChip id={card.skillId} small /></div>}
                <div className="whitespace-pre-wrap text-[20px] font-bold leading-snug">{card.front}</div>
                {shown ? (
                  <div className="mt-5 whitespace-pre-wrap border-t border-white/10 pt-5 text-[16px] leading-relaxed text-white/85">{card.back || <span className="text-fin-faint">(no answer written)</span>}</div>
                ) : (
                  <div className="mt-6 text-[13px] text-fin-faint">Think of the answer, then tap (or press Space)</div>
                )}
              </button>
              {shown && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {GRADES.map((g) => (
                    <button key={g.g} onClick={() => grade(g.g)} className="rounded-2xl bg-fin-input px-1 py-2.5 text-center transition hover:bg-fin-tile active:scale-95">
                      <div className="text-[14.5px] font-bold" style={{ color: g.color }}>{g.label}</div>
                      <div className="text-[11px] text-fin-faint">{nextText(card, g.g)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="text-[40px]">{done ? "🎉" : "✅"}</div>
              <div className="mt-2 text-[19px] font-bold">{done ? `${done} reviews done` : pool.length ? "Nothing due" : "No cards yet"}</div>
              <p className="mx-auto mt-1 max-w-[340px] text-[13.5px] text-fin-muted">{pool.length ? "Cards come back just before you'd forget them. Check in tomorrow." : "Add a question and answer on the right — short ones work best."}</p>
              {dueCount > 0 && <button onClick={restart} className="mt-4 rounded-xl bg-fin-tile px-4 py-2 text-[14px] font-semibold">Review again ({dueCount})</button>}
            </div>
          )}
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard title="Add a card">
          <div className="space-y-2">
            <textarea rows={2} value={f.front} onChange={(e) => setF({ ...f, front: e.target.value })} placeholder="Question, e.g. What is a stuck-at fault?" className={input} maxLength={400} aria-label="Question" />
            <textarea rows={3} value={f.back} onChange={(e) => setF({ ...f, back: e.target.value })} placeholder="Answer, in a sentence or two" className={input} maxLength={2000} aria-label="Answer" />
            <SkillSelect value={f.skillId} onChange={(skillId) => setF({ ...f, skillId })} />
            <PrimaryButton className="w-full" disabled={!f.front.trim()} onClick={add}>Add card</PrimaryButton>
          </div>
        </FinCard>
        <FinCard title={`Your cards · ${pool.length}`}>
          {pool.length ? (
            <div className="space-y-1">
              {pool.slice(0, 80).map((c) => (
                <div key={c._id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13.5px] hover:bg-fin-input">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${isMastered(c) ? "bg-[#f2c14e]" : isDue(c, t.today) ? "bg-fin-accent" : "bg-white/20"}`} title={isMastered(c) ? "Mastered" : isDue(c, t.today) ? "Due" : `Next ${c.due}`} />
                  <span className="min-w-0 flex-1 truncate">{c.front}</span>
                  <button onClick={() => t.remove("cards", c, "Card deleted")} className="shrink-0 text-fin-faint opacity-0 hover:text-fin-danger group-hover:opacity-100" aria-label={`Delete card: ${c.front}`}><Icon name="trash" size={13} /></button>
                </div>
              ))}
              <div className="flex gap-3 pt-2 text-[11.5px] text-fin-faint">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-fin-accent" /> due</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f2c14e]" /> mastered (3+ weeks)</span>
              </div>
            </div>
          ) : (
            <div className="text-[13.5px] text-fin-muted">No cards{skill ? " for this skill" : ""} yet.</div>
          )}
          <div className={`${kicker} mt-4 !mb-0 normal-case tracking-normal`}>Keys: Space shows the answer, 1–4 grade it.</div>
        </FinCard>
      </div>
    </div>
  );
}
