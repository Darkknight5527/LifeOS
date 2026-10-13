// Skills › Today, People, Words and Hobbies.
import { useEffect, useMemo, useState } from "react";
import { useMe } from "../../../lib/user.js";
import { haptic } from "../../../lib/inApp.js";
import { EmptyState, FinCard, GhostButton, Icon, IconButton, PrimaryButton, Segmented, Sheet } from "../../finances/fin-ui.jsx";
import { addDays, isoDate, parseISO } from "../../finances/lib";
import { AutoText, COL } from "../journal/TodayView.jsx";
import { Chips } from "../mind/MindViews.jsx";
import { PRESETS, STARTER, presetById } from "./hobbies.js";
import { LESSONS, TOPICS, lessonById, topicOf } from "./lessons.js";
import { GRADES, hobbyStats, hoursText, isDue, isMastered, nextText, useSkills } from "./SkillsContext.jsx";
import { WORDS, wordOfDay } from "./words.js";

const GRID3 = "grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0";
const kicker = "mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted";
const ago = (n) => (n == null ? "not yet" : n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);
const fmtDate = (iso) => parseISO(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// ============================== People ==============================
/** Today's lesson: the one you worked on today, else the next one you haven't done. */
function todaysLesson(s) {
  const todayLog = [...s.logs].filter((l) => l.date === s.today).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  if (todayLog && lessonById(todayLog.lessonId)) return lessonById(todayLog.lessonId);
  return LESSONS.find((l) => !s.logOf(l.id)) || null;
}

function LessonBody({ lesson, compact = false }) {
  const s = useSkills();
  const log = s.logOf(lesson.id);
  const t = topicOf(lesson);
  const n = LESSONS.indexOf(lesson) + 1;
  return (
    <div>
      <div className="text-[12.5px] font-semibold text-fin-accent">
        {t.emoji} {t.label} · Lesson {n} of {LESSONS.length}
      </div>
      <div className="mt-1 text-[20px] font-extrabold leading-tight">{lesson.title}</div>
      <p className="mt-2 text-[14.5px] leading-relaxed text-white/80">{lesson.idea}</p>
      <ol className="mt-3 space-y-1.5">
        {lesson.steps.map((st, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-white/85">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-fin-tile text-[11.5px] font-bold text-fin-muted">{i + 1}</span>
            {st}
          </li>
        ))}
      </ol>
      {lesson.say && <div className="mt-3 rounded-2xl border-l-4 border-fin-accent bg-fin-input px-4 py-2.5 text-[14px] italic text-white/85">“{lesson.say}”</div>}
      <div className="mt-4 rounded-2xl p-4" style={{ background: "rgb(var(--fin-accent) / 0.12)" }}>
        <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-fin-accent">Today's challenge</div>
        <p className="mt-1 text-[15px] font-semibold leading-snug">{lesson.challenge}</p>
        {log?.challenge === "done" ? (
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-emerald-300">
              <Icon name="check" size={16} stroke={2.4} /> Done{log.date !== s.today ? ` · ${fmtDate(log.date)}` : ""}
            </div>
            <AutoText rows={compact ? 2 : 3} value={log.note} placeholder="How did it go? What did you notice?" onSave={(note) => s.saveLesson(lesson.id, { note })} />
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <PrimaryButton
              className="!px-4 !py-2 !text-[14px]"
              onClick={() => {
                haptic();
                s.saveLesson(lesson.id, { challenge: "done", date: s.today });
              }}
            >
              ✓ I did it
            </PrimaryButton>
            {log?.challenge !== "skipped" && (
              <button onClick={() => s.saveLesson(lesson.id, { challenge: "skipped" })} className="rounded-2xl bg-fin-input px-4 py-2 text-[14px] font-semibold text-white/70 hover:bg-fin-tile">
                Not this time
              </button>
            )}
            {log?.challenge === "skipped" && <span className="self-center text-[13px] text-fin-muted">Skipped — you can still try it any time.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function LessonSheet({ lesson, onClose }) {
  return (
    <Sheet open={Boolean(lesson)} onClose={onClose} title="Lesson">
      {lesson && <LessonBody lesson={lesson} />}
    </Sheet>
  );
}

const statusIcon = (log) =>
  log?.challenge === "done" ? (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/20 text-emerald-300">
      <Icon name="check" size={14} stroke={2.6} />
    </span>
  ) : log ? (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fin-tile text-[11px] text-fin-muted">–</span>
  ) : (
    <span className="h-6 w-6 shrink-0 rounded-full border border-white/15" />
  );

export function PeopleView() {
  const s = useSkills();
  const [open, setOpen] = useState(null);
  const done = s.logs.filter((l) => l.challenge === "done").length;
  const journal = [...s.logs].filter((l) => l.challenge === "done").sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  const cols = [TOPICS.slice(0, 4), TOPICS.slice(4)];
  const current = todaysLesson(s);
  return (
    <div className={GRID3}>
      {cols.map((topics, ci) => (
        <div key={ci} className={COL}>
          {topics.map((t) => {
            const ls = LESSONS.filter((l) => l.topic === t.id);
            const n = ls.filter((l) => s.logOf(l.id)?.challenge === "done").length;
            return (
              <FinCard key={t.id} title={`${t.emoji} ${t.label}`} action={<span className="tabular text-[12.5px] font-semibold text-fin-muted">{n}/{ls.length}</span>}>
                <div className="space-y-1">
                  {ls.map((l) => (
                    <button key={l.id} onClick={() => setOpen(l)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-fin-input">
                      {statusIcon(s.logOf(l.id))}
                      <span className={`min-w-0 flex-1 text-[14px] ${s.logOf(l.id)?.challenge === "done" ? "text-white/60" : "font-semibold"}`}>{l.title}</span>
                      {current?.id === l.id && <span className="shrink-0 rounded-full bg-fin-accent/15 px-2 py-0.5 text-[11px] font-bold text-fin-accent">Today</span>}
                    </button>
                  ))}
                </div>
              </FinCard>
            );
          })}
        </div>
      ))}
      <div className={COL}>
        <FinCard title="Your progress">
          <div className="flex items-end justify-between">
            <div>
              <div className="tabular text-[34px] font-extrabold leading-none">{done}</div>
              <div className="text-[13px] text-fin-muted">challenges done of {LESSONS.length}</div>
            </div>
            <div className="text-right text-[13px] text-fin-muted">One lesson a day ≈ 6 weeks</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-fin-input">
            <div className="h-full rounded-full bg-fin-accent transition-all" style={{ width: `${(done / LESSONS.length) * 100}%` }} />
          </div>
        </FinCard>
        <FinCard title="What happened">
          {journal.length === 0 ? (
            <p className="text-[14px] leading-relaxed text-fin-muted">When you do a challenge, jot down how it went. Real-life notes are where the learning sticks.</p>
          ) : (
            <div className="space-y-2">
              {journal.slice(0, 20).map((l) => (
                <button key={l._id} onClick={() => setOpen(lessonById(l.lessonId))} className="block w-full rounded-xl bg-fin-input px-3 py-2.5 text-left hover:bg-fin-tile">
                  <div className="text-[12px] font-semibold text-fin-muted">
                    {fmtDate(l.date)} · {lessonById(l.lessonId)?.title}
                  </div>
                  <div className="mt-0.5 line-clamp-3 text-[13.5px] text-white/85">{l.note || <span className="text-fin-faint">No note</span>}</div>
                </button>
              ))}
            </div>
          )}
        </FinCard>
      </div>
      <LessonSheet lesson={open} onClose={() => setOpen(null)} />
    </div>
  );
}

// ============================== Words ==============================
function WordOfDay() {
  const s = useSkills();
  const w = wordOfDay(s.today);
  const card = s.cards.find((c) => c.word.toLowerCase() === w.word.toLowerCase());
  return (
    <FinCard title="Word of the day" action={<span className="text-[12.5px] text-fin-muted">{s.today.slice(8)}/{s.today.slice(5, 7)}</span>}>
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-extrabold tracking-tight">{w.word}</span>
        <span className="text-[13px] italic text-fin-muted">{w.pos}</span>
      </div>
      <p className="mt-1 text-[15px] leading-snug text-white/85">{w.meaning}</p>
      <p className="mt-2 text-[14px] italic leading-snug text-fin-muted">“{w.example}”</p>
      <div className="mt-3">
        <div className={kicker}>Use it in your own sentence</div>
        <AutoText
          rows={2}
          max={600}
          value={card?.mine}
          placeholder={`Write a sentence with “${w.word}”…`}
          onSave={(mine) => (card ? s.updateCard(card._id, { mine }) : mine.trim() && s.addCard({ ...w, mine, source: "list" }))}
        />
      </div>
      {card ? (
        <div className="mt-3 flex items-center gap-2 text-[13.5px] font-semibold text-emerald-300">
          <Icon name="check" size={16} stroke={2.4} /> In your flashcards
        </div>
      ) : (
        <button onClick={() => s.addCard({ ...w, source: "list" })} className="mt-3 flex items-center gap-1.5 rounded-xl bg-fin-tile px-3.5 py-2 text-[13.5px] font-semibold hover:bg-white/10">
          <Icon name="plus" size={16} /> Add to my flashcards
        </button>
      )}
    </FinCard>
  );
}

function deckStats(cards, today) {
  const due = cards.filter((c) => isDue(c, today));
  return {
    due: due.length,
    newCount: cards.filter((c) => !c.reps && !c.lastReviewed).length,
    mastered: cards.filter(isMastered).length,
    learning: cards.filter((c) => !isMastered(c) && (c.reps || c.lastReviewed)).length,
  };
}

function FlashcardsCard({ onReview, compact }) {
  const s = useSkills();
  const st = deckStats(s.cards, s.today);
  return (
    <FinCard title="Flashcards">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Due now", st.due, "text-fin-accent"],
          ["Learning", st.learning, ""],
          ["Mastered", st.mastered, "text-emerald-300"],
        ].map(([l, v, c]) => (
          <div key={l} className="rounded-2xl bg-fin-input px-2 py-2.5">
            <div className={`tabular text-[24px] font-extrabold ${c}`}>{s.loading ? "…" : v}</div>
            <div className="text-[12px] text-fin-muted">{l}</div>
          </div>
        ))}
      </div>
      <PrimaryButton className="mt-3 flex w-full items-center justify-center gap-2 !py-2.5" disabled={!st.due} onClick={onReview}>
        <Icon name="play" size={16} /> {st.due ? `Review ${Math.min(st.due, 20)} card${st.due === 1 ? "" : "s"}` : s.cards.length ? "All caught up for today" : "Add words to start"}
      </PrimaryButton>
      {!compact && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-fin-faint">
          Words you know come back less often — after a day, then 3 days, a week, a month. “Mastered” = you'll next see it in 3+ weeks.
        </p>
      )}
    </FinCard>
  );
}

function ReviewSheet({ open, onClose }) {
  const s = useSkills();
  const [reverse, setReverse] = useState(false);
  const [queue, setQueue] = useState([]);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (!open) return;
    const due = s.cards.filter((c) => isDue(c, s.today));
    const learned = due.filter((c) => c.reps || c.lastReviewed);
    const fresh = due.filter((c) => !c.reps && !c.lastReviewed).slice(0, 10);
    const list = [...learned, ...fresh].sort(() => Math.random() - 0.5).slice(0, 20);
    setQueue(list.map((c) => c._id));
    setShown(false);
    setDone(0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = s.cards.find((c) => c._id === queue[0]);
  const grade = (g) => {
    if (!card) return;
    haptic();
    s.grade(card, g);
    setShown(false);
    setDone((n) => n + 1);
    setQueue((q) => (g === 0 ? [...q.slice(1), q[0]] : q.slice(1)));
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.target.closest?.("input,textarea")) return;
      if ((e.key === " " || e.key === "Enter") && !shown) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ["1", "2", "3", "4"].includes(e.key)) grade(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Flashcards"
      titleExtra={<span className="tabular text-[13px] text-fin-muted">{card ? `${queue.length} left` : ""}</span>}
    >
      {!card ? (
        <div className="py-8 text-center">
          <div className="text-[44px]">🎉</div>
          <div className="mt-2 text-[20px] font-bold">{done ? `${done} reviews done` : "Nothing due"}</div>
          <p className="mt-1 text-[14px] text-fin-muted">Come back tomorrow — the spacing is what makes words stick.</p>
          <GhostButton className="mt-5" onClick={onClose}>
            Close
          </GhostButton>
        </div>
      ) : (
        <div className="pb-2">
          <Segmented
            className="mb-4 [&_button]:!py-1.5 [&_button]:!text-[13px]"
            value={reverse ? "rev" : "fwd"}
            onChange={(v) => {
              setReverse(v === "rev");
              setShown(false);
            }}
            options={[
              { value: "fwd", label: "Word → meaning" },
              { value: "rev", label: "Meaning → word" },
            ]}
          />
          <div key={card._id + reverse} className="min-h-[190px] animate-pop-in rounded-[24px] bg-fin-input px-5 py-6 text-center">
            {reverse ? (
              <p className="text-[18px] font-semibold leading-snug">{card.meaning || "(no meaning saved)"}</p>
            ) : (
              <div className="text-[32px] font-extrabold tracking-tight">{card.word}</div>
            )}
            {shown ? (
              <div className="mt-4 animate-fade-in border-t border-white/10 pt-4">
                {reverse ? <div className="text-[28px] font-extrabold">{card.word}</div> : <p className="text-[16px] leading-snug text-white/90">{card.meaning}</p>}
                {card.pos && <div className="mt-1 text-[12.5px] italic text-fin-muted">{card.pos}</div>}
                {card.example && <p className="mt-2 text-[14px] italic text-fin-muted">“{card.example}”</p>}
                {card.mine && <p className="mt-2 text-[14px] text-fin-accent">Yours: {card.mine}</p>}
              </div>
            ) : (
              <p className="mt-6 text-[13px] text-fin-faint">Say the {reverse ? "word" : "meaning"} in your head, then reveal</p>
            )}
          </div>
          {!shown ? (
            <PrimaryButton className="mt-4 w-full" onClick={() => setShown(true)}>
              Show answer
            </PrimaryButton>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button key={g.g} onClick={() => grade(g.g)} className="rounded-2xl bg-fin-input px-1 py-2.5 transition hover:bg-fin-tile active:scale-95">
                  <div className="text-[14.5px] font-bold" style={{ color: g.color }}>
                    {g.label}
                  </div>
                  <div className="text-[11.5px] text-fin-muted">{nextText(card, g.g)}</div>
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 hidden text-center text-[12px] text-fin-faint sm:block">Keys: Space to reveal · 1–4 to grade</p>
        </div>
      )}
    </Sheet>
  );
}

async function lookUp(word) {
  const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`);
  if (!r.ok) throw new Error("not found");
  const data = await r.json();
  const m = data?.[0]?.meanings?.[0];
  const d = m?.definitions?.find((x) => x.example) || m?.definitions?.[0];
  if (!d) throw new Error("not found");
  return { pos: m.partOfSpeech ? `${m.partOfSpeech.replace("adjective", "adj.").replace("adverb", "adv.")}` : "", meaning: d.definition || "", example: d.example || "" };
}

function AddWord() {
  const s = useSkills();
  const blank = { word: "", pos: "", meaning: "", example: "" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const field = "w-full rounded-2xl bg-fin-input px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50";
  const find = async () => {
    if (!f.word.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await lookUp(f.word);
      setF((x) => ({ ...x, ...r, meaning: x.meaning || r.meaning, example: x.example || r.example, pos: x.pos || r.pos }));
    } catch {
      setMsg("Couldn't find it online — type the meaning yourself.");
    }
    setBusy(false);
  };
  return (
    <FinCard title="Add your own word">
      <p className="mb-3 text-[13px] text-fin-muted">Heard a word at work or in a show that you didn't know? Save it here.</p>
      <div className="flex gap-2">
        <input value={f.word} onChange={(e) => setF({ ...f, word: e.target.value })} onKeyDown={(e) => e.key === "Enter" && find()} placeholder="Word or phrase" className={field} maxLength={80} />
        <button onClick={find} disabled={!f.word.trim() || busy} className="shrink-0 rounded-2xl bg-fin-tile px-3.5 text-[13.5px] font-semibold disabled:opacity-40">
          {busy ? "…" : "Look up"}
        </button>
      </div>
      {msg && <div className="mt-1.5 text-[12.5px] text-amber-200/80">{msg}</div>}
      <textarea value={f.meaning} onChange={(e) => setF({ ...f, meaning: e.target.value })} placeholder="Meaning" rows={2} maxLength={600} className={`${field} mt-2 resize-none`} />
      <textarea value={f.example} onChange={(e) => setF({ ...f, example: e.target.value })} placeholder="Example sentence (optional)" rows={2} maxLength={600} className={`${field} mt-2 resize-none`} />
      <PrimaryButton
        className="mt-3 w-full !py-2.5"
        disabled={!f.word.trim() || !f.meaning.trim()}
        onClick={async () => {
          const ok = await s.addCard({ ...f, source: "own" });
          if (ok !== null) {
            setF(blank);
            setMsg("");
          }
        }}
      >
        Add to flashcards
      </PrimaryButton>
    </FinCard>
  );
}

const cardStatus = (c, today) => {
  if (!c.reps && !c.lastReviewed) return ["New", "text-sky-300"];
  if (isMastered(c)) return ["Mastered", "text-emerald-300"];
  if (isDue(c, today)) return ["Due", "text-fin-accent"];
  const n = Math.round((parseISO(c.due) - parseISO(today)) / 86400000);
  return [n === 1 ? "Tomorrow" : `In ${n} days`, "text-fin-muted"];
};

function Deck({ onBrowse }) {
  const s = useSkills();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const list = s.cards.filter((c) => !q.trim() || c.word.toLowerCase().includes(q.trim().toLowerCase()) || (c.meaning || "").toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <FinCard title={`My words (${s.cards.length})`} action={<button onClick={onBrowse} className="rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold">Browse list</button>}>
      {s.cards.length > 6 && (
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your words" className="mb-2 w-full rounded-2xl bg-fin-input px-4 py-2.5 text-[14.5px] text-white outline-none placeholder:text-fin-faint" />
      )}
      {s.cards.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-fin-muted">No words yet. Add today's word, add your own, or browse {WORDS.length} useful words for work and interviews.</p>
      ) : (
        <div className="space-y-1.5">
          {list.map((c) => {
            const [label, color] = cardStatus(c, s.today);
            const isOpen = openId === c._id;
            return (
              <div key={c._id} className="rounded-xl bg-fin-input">
                <button onClick={() => setOpenId(isOpen ? null : c._id)} className="flex w-full items-center gap-3 px-3 py-2 text-left">
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{c.word}</span>
                  <span className={`shrink-0 text-[12px] font-semibold ${color}`}>{label}</span>
                </button>
                {isOpen && (
                  <div className="animate-fade-in px-3 pb-3">
                    <p className="text-[13.5px] text-white/80">{c.meaning}</p>
                    {c.example && <p className="mt-1 text-[13px] italic text-fin-muted">“{c.example}”</p>}
                    <AutoText rows={1} max={600} value={c.mine} placeholder="Your own sentence" className="mt-2 !py-2 !text-[14px]" onSave={(mine) => s.updateCard(c._id, { mine })} />
                    <div className="mt-2 flex justify-end">
                      <button onClick={() => s.removeCard(c._id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] text-rose-300/80 hover:bg-rose-500/10">
                        <Icon name="trash" size={14} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </FinCard>
  );
}

function BrowseSheet({ open, onClose }) {
  const s = useSkills();
  const [q, setQ] = useState("");
  const have = new Set(s.cards.map((c) => c.word.toLowerCase()));
  const list = WORDS.filter((w) => !q.trim() || w.word.includes(q.trim().toLowerCase()) || w.meaning.includes(q.trim().toLowerCase()));
  const notYet = WORDS.filter((w) => !have.has(w.word));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Useful words"
      titleExtra={<span className="text-[13px] text-fin-muted">{WORDS.length - notYet.length}/{WORDS.length} added</span>}
    >
      <div className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full rounded-2xl bg-fin-input px-4 py-2.5 text-[14.5px] text-white outline-none placeholder:text-fin-faint" />
        {notYet.length > 0 && (
          <button
            onClick={() => notYet.sort(() => Math.random() - 0.5).slice(0, 5).forEach((w) => s.addCard({ ...w, source: "list" }))}
            className="shrink-0 rounded-2xl bg-fin-tile px-3.5 text-[13px] font-semibold"
          >
            + 5 random
          </button>
        )}
      </div>
      <div className="space-y-1.5 pb-2">
        {list.map((w) => {
          const added = have.has(w.word);
          return (
            <div key={w.word} className="flex items-start gap-3 rounded-xl bg-fin-input px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold">
                  {w.word} <span className="text-[12px] font-normal italic text-fin-muted">{w.pos}</span>
                </div>
                <div className="text-[13px] leading-snug text-fin-muted">{w.meaning}</div>
              </div>
              {added ? (
                <span className="mt-1 text-emerald-300" title="In your flashcards">
                  <Icon name="check" size={18} stroke={2.4} />
                </span>
              ) : (
                <IconButton icon="plus" label={`Add ${w.word}`} onClick={() => s.addCard({ ...w, source: "list" })} />
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

export function WordsView() {
  const [review, setReview] = useState(false);
  const [browse, setBrowse] = useState(false);
  return (
    <div className={GRID3}>
      <div className={COL}>
        <WordOfDay />
      </div>
      <div className={COL}>
        <FlashcardsCard onReview={() => setReview(true)} />
        <AddWord />
      </div>
      <div className={COL}>
        <Deck onBrowse={() => setBrowse(true)} />
      </div>
      <ReviewSheet open={review} onClose={() => setReview(false)} />
      <BrowseSheet open={browse} onClose={() => setBrowse(false)} />
    </div>
  );
}

// ============================== Hobbies ==============================
function useTick(on) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => set((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [on]);
}
const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
};

function TimerBanner() {
  const s = useSkills();
  useTick(Boolean(s.timer));
  if (!s.timer) return null;
  const h = s.hobbies.find((x) => x._id === s.timer.hobbyId);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-fin-accent/40 bg-fin-accent/10 px-4 py-3">
      <span className="text-[24px]">{h?.emoji || "⏱️"}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-fin-accent">Practising {h?.name || ""}</div>
        <div className="tabular text-[24px] font-extrabold leading-tight">{clock(Date.now() - s.timer.startedAt)}</div>
      </div>
      <button onClick={() => s.stopTimer(true)} className="rounded-xl bg-white px-3.5 py-2 text-[14px] font-bold text-[#1b1530]">
        Stop & log
      </button>
      <IconButton icon="close" label="Cancel without logging" onClick={() => s.stopTimer(false)} />
    </div>
  );
}

function WeekBar({ value, goal }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-fin-input">
      <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-400" : "bg-fin-accent"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function HobbyCard({ h, onOpen, onLog }) {
  const s = useSkills();
  const st = hobbyStats(h, s.sessions, s.today);
  const running = s.timer?.hobbyId === h._id;
  return (
    <FinCard>
      <button onClick={onOpen} className="flex w-full items-start gap-3 text-left">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-fin-input text-[26px]">{h.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[17px] font-bold">{h.name}</span>
            {h.status !== "active" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-white/60">{h.status}</span>}
          </div>
          <div className="text-[12.5px] text-fin-muted">
            {hoursText(st.total)} total · last {ago(st.daysSince)}
          </div>
        </div>
        <Icon name="right" size={18} className="mt-1 text-fin-faint" />
      </button>
      {h.status === "active" && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[12.5px]">
            <span className="text-fin-muted">This week</span>
            <span className="tabular font-semibold">
              {st.week} / {h.weeklyGoal} min
            </span>
          </div>
          <WeekBar value={st.week} goal={h.weeklyGoal} />
        </div>
      )}
      {st.next && (
        <div className="mt-3 rounded-xl bg-fin-input px-3 py-2 text-[13px]">
          <span className="text-fin-muted">Next: </span>
          {st.next.text}
          <span className="ml-1 text-fin-faint">
            ({st.done}/{st.of})
          </span>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => (running ? s.stopTimer(true) : s.startTimer(h._id))}
          disabled={Boolean(s.timer) && !running}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13.5px] font-semibold transition disabled:opacity-30 ${running ? "bg-white text-[#1b1530]" : "bg-fin-accent/15 text-fin-accent hover:bg-fin-accent/25"}`}
        >
          <Icon name={running ? "check" : "play"} size={15} /> {running ? "Stop & log" : "Start practice"}
        </button>
        <button onClick={onLog} className="flex items-center gap-1 rounded-xl bg-fin-tile px-3 py-2 text-[13.5px] font-semibold">
          <Icon name="plus" size={15} /> Log time
        </button>
      </div>
    </FinCard>
  );
}

function LogSheet({ hobby, onClose }) {
  const s = useSkills();
  const [mins, setMins] = useState(30);
  const [custom, setCustom] = useState("");
  const [day, setDay] = useState(0);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (hobby) {
      setMins(30);
      setCustom("");
      setDay(0);
      setNote("");
    }
  }, [hobby]);
  const minutes = custom ? Number(custom) : mins;
  return (
    <Sheet
      open={Boolean(hobby)}
      onClose={onClose}
      title={hobby ? `${hobby.emoji} Log ${hobby.name}` : ""}
      footer={
        <PrimaryButton
          className="flex-1"
          disabled={!(minutes >= 1 && minutes <= 1440)}
          onClick={() => {
            s.addSession({ hobbyId: hobby._id, minutes, note, date: isoDate(addDays(parseISO(s.today), -day)) });
            onClose();
          }}
        >
          Save {minutes >= 1 ? `${minutes} min` : ""}
        </PrimaryButton>
      }
    >
      <div className={kicker}>How long</div>
      <Chips options={[15, 20, 30, 45, 60, 90, 120].map((n) => ({ value: n, label: `${n} min` }))} value={custom ? null : mins} onChange={(v) => { setMins(v); setCustom(""); }} label="Minutes" />
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder="Other (minutes)"
        className="mt-2 w-40 rounded-2xl bg-fin-input px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-fin-faint"
      />
      <div className={`${kicker} mt-4`}>When</div>
      <Chips options={[{ value: 0, label: "Today" }, { value: 1, label: "Yesterday" }, { value: 2, label: "2 days ago" }]} value={day} onChange={setDay} label="Day" />
      <div className={`${kicker} mt-4`}>What did you work on? (optional)</div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="e.g. G–C changes, 2 puzzles wrong on forks…" className="w-full resize-none rounded-2xl bg-fin-input px-4 py-3 text-[15px] text-white outline-none placeholder:text-fin-faint" />
    </Sheet>
  );
}

function HobbySheet({ hobby, onClose }) {
  const s = useSkills();
  const h = hobby && s.hobbies.find((x) => x._id === hobby._id);
  const [newMs, setNewMs] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setConfirm(false), [hobby]);
  if (!h) return <Sheet open={false} onClose={onClose} />;
  const st = hobbyStats(h, s.sessions, s.today);
  const preset = presetById(h.preset);
  const ms = h.milestones || [];
  const setMs = (list) => s.updateHobby(h._id, { milestones: list.map(({ text, done, doneAt }) => ({ text, done, doneAt: doneAt || "" })) });
  return (
    <Sheet open onClose={onClose} title={`${h.emoji} ${h.name}`}>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["This week", hoursText(st.week)],
          ["Total", hoursText(st.total)],
          ["Sessions", st.sessions.length],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-fin-input px-2 py-2.5">
            <div className="tabular text-[19px] font-extrabold">{v}</div>
            <div className="text-[12px] text-fin-muted">{l}</div>
          </div>
        ))}
      </div>
      {preset?.why && <p className="mt-3 text-[13.5px] leading-relaxed text-white/70">💡 {preset.why}</p>}

      <div className={`${kicker} mt-5`}>Status</div>
      <Segmented
        className="[&_button]:!py-1.5 [&_button]:!text-[13.5px]"
        value={h.status}
        onChange={(status) => s.updateHobby(h._id, { status })}
        options={[
          { value: "active", label: "Active" },
          { value: "later", label: "Later" },
          { value: "paused", label: "Paused" },
        ]}
      />
      <div className={`${kicker} mt-4`}>Weekly goal</div>
      <Chips options={[60, 90, 120, 150, 180, 240, 300].map((n) => ({ value: n, label: hoursText(n) }))} value={h.weeklyGoal} onChange={(weeklyGoal) => s.updateHobby(h._id, { weeklyGoal })} label="Weekly goal" />

      <div className={`${kicker} mt-5`}>
        Milestones · {st.done}/{st.of}
      </div>
      <div className="space-y-1.5">
        {ms.map((m, i) => (
          <div key={i} className="group flex items-center gap-2">
            <button
              onClick={() => {
                haptic();
                setMs(ms.map((x, j) => (j === i ? { ...x, done: !x.done, doneAt: !x.done ? s.today : "" } : x)));
              }}
              aria-pressed={m.done}
              className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] transition ${m.done ? "bg-emerald-400/10 text-white/60" : "bg-fin-input hover:bg-fin-tile"}`}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${m.done ? "border-emerald-400 bg-emerald-400 text-[#0b2a1d]" : "border-white/20"}`}>{m.done && <Icon name="check" size={14} stroke={2.6} />}</span>
              <span className={`min-w-0 flex-1 ${m.done ? "line-through decoration-white/30" : ""}`}>{m.text}</span>
              {m.done && m.doneAt && <span className="shrink-0 text-[11.5px] text-fin-faint">{fmtDate(m.doneAt)}</span>}
            </button>
            <IconButton icon="trash" label="Remove milestone" onClick={() => setMs(ms.filter((_, j) => j !== i))} className="opacity-50 hover:opacity-100" />
          </div>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newMs.trim()) return;
          setMs([...ms, { text: newMs.trim().slice(0, 200), done: false }]);
          setNewMs("");
        }}
      >
        <input value={newMs} onChange={(e) => setNewMs(e.target.value)} placeholder="Add a milestone" maxLength={200} className="w-full rounded-xl bg-fin-input px-3.5 py-2.5 text-[14px] text-white outline-none placeholder:text-fin-faint" />
        <button className="shrink-0 rounded-xl bg-fin-tile px-3.5 text-[13.5px] font-semibold">Add</button>
      </form>

      {preset?.links?.length > 0 && (
        <>
          <div className={`${kicker} mt-5`}>Learn</div>
          <div className="space-y-1.5">
            {preset.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-fin-input px-3 py-2.5 text-[14px] hover:bg-fin-tile">
                <Icon name="external" size={15} className="text-fin-accent" /> {l.label}
              </a>
            ))}
          </div>
        </>
      )}

      <div className={`${kicker} mt-5`}>Notes</div>
      <AutoText rows={2} max={3000} value={h.notes} placeholder="Songs to learn, openings to study, parts to buy…" onSave={(notes) => s.updateHobby(h._id, { notes })} />

      <div className={`${kicker} mt-5`}>Recent sessions</div>
      {st.sessions.length === 0 ? (
        <p className="text-[13.5px] text-fin-muted">No practice logged yet.</p>
      ) : (
        <div className="space-y-1">
          {[...st.sessions]
            .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 12)
            .map((x) => (
              <div key={x._id} className="flex items-center gap-3 rounded-xl bg-fin-input px-3 py-2">
                <span className="w-16 shrink-0 text-[12.5px] text-fin-muted">{fmtDate(x.date)}</span>
                <span className="tabular w-14 shrink-0 text-[13.5px] font-semibold">{x.minutes} min</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-white/70">{x.note}</span>
                <IconButton icon="trash" label="Delete session" size={15} onClick={() => s.removeSession(x._id)} />
              </div>
            ))}
        </div>
      )}

      <div className="mt-6 pb-2">
        {confirm ? (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 px-3 py-2.5 text-[13.5px]">
            <span className="flex-1 text-rose-200">Delete {h.name} and all its sessions?</span>
            <button onClick={() => setConfirm(false)} className="rounded-lg px-2 py-1 text-white/70">
              Cancel
            </button>
            <button
              onClick={() => {
                s.removeHobby(h._id);
                onClose();
              }}
              className="rounded-lg bg-rose-500 px-3 py-1 font-semibold"
            >
              Delete
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="text-[13px] text-rose-300/70 hover:text-rose-300">
            Delete this hobby
          </button>
        )}
      </div>
    </Sheet>
  );
}

const fromPreset = (p, status) => ({
  name: p.name,
  emoji: p.emoji,
  preset: p.id,
  weeklyGoal: p.weeklyGoal,
  status: status || (p.later ? "later" : "active"),
  milestones: p.milestones.map((text) => ({ text, done: false, doneAt: "" })),
});

function AddHobbySheet({ open, onClose, first }) {
  const s = useSkills();
  const { isOwner } = useMe();
  const have = new Set(s.hobbies.map((h) => h.preset).filter(Boolean));
  const avail = PRESETS.filter((p) => !have.has(p.id));
  const [picked, setPicked] = useState(new Set());
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  useEffect(() => {
    if (open) {
      setPicked(new Set(first && isOwner ? STARTER : []));
      setName("");
      setEmoji("⭐");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id) => setPicked((p) => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const add = () => {
    let order = s.hobbies.reduce((m, h) => Math.max(m, (h.order || 0) + 1), 0);
    avail.filter((p) => picked.has(p.id)).forEach((p) => s.addHobby({ ...fromPreset(p), order: order++ }));
    if (name.trim()) s.addHobby({ name: name.trim().slice(0, 60), emoji: emoji || "⭐", weeklyGoal: 120, status: "active", milestones: [], order: order++ });
    onClose();
  };
  const count = avail.filter((p) => picked.has(p.id)).length + (name.trim() ? 1 : 0);
  const main = avail.filter((p) => !p.extra);
  const extra = avail.filter((p) => p.extra);
  const tile = (p) => {
    const on = picked.has(p.id);
    return (
      <button
        key={p.id}
        onClick={() => toggle(p.id)}
        aria-pressed={on}
        className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${on ? "border-fin-accent bg-fin-accent/10" : "border-transparent bg-fin-input hover:bg-fin-tile"}`}
      >
        <span className="text-[24px]">{p.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold">
            {p.name} {p.later && <span className="text-[11.5px] font-normal text-fin-muted">· later</span>}
          </div>
          <div className="text-[12px] text-fin-muted">
            {p.milestones.length} milestones · {hoursText(p.weeklyGoal)}/week
          </div>
        </div>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${on ? "border-fin-accent bg-fin-accent text-[#160f2b]" : "border-white/20"}`}>{on && <Icon name="check" size={14} stroke={2.6} />}</span>
      </button>
    );
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={first ? "Pick your hobbies" : "Add a hobby"}
      footer={
        <PrimaryButton className="flex-1" disabled={!count} onClick={add}>
          Add {count || ""} {count === 1 ? "hobby" : "hobbies"}
        </PrimaryButton>
      }
    >
      {first && <p className="mb-3 text-[13.5px] leading-relaxed text-fin-muted">Each comes with a ladder of milestones from beginner up and a weekly time goal — you can change both. Photography is set to “later”.</p>}
      {main.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{main.map(tile)}</div>}
      {extra.length > 0 && (
        <>
          <div className={`${kicker} mt-5`}>More skilled hobbies</div>
          <div className="grid gap-2 sm:grid-cols-2">{extra.map(tile)}</div>
        </>
      )}
      <div className={`${kicker} mt-5`}>Or your own</div>
      <div className="flex gap-2 pb-2">
        <input value={emoji} onChange={(e) => setEmoji([...e.target.value].slice(-2).join(""))} aria-label="Emoji" className="w-14 shrink-0 rounded-2xl bg-fin-input px-2 py-2.5 text-center text-[20px] outline-none" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Swimming, Rubik's cube" maxLength={60} className="w-full rounded-2xl bg-fin-input px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-fin-faint" />
      </div>
    </Sheet>
  );
}

export function HobbiesView() {
  const s = useSkills();
  const [open, setOpen] = useState(null);
  const [log, setLog] = useState(null);
  const [adding, setAdding] = useState(false);
  const order = { active: 0, later: 1, paused: 2 };
  const list = [...s.hobbies].sort((a, b) => order[a.status] - order[b.status] || (a.order || 0) - (b.order || 0));
  if (!s.loading && s.hobbies.length === 0) {
    return (
      <>
        <FinCard>
          <EmptyState icon="star">
            Build real skills, a little every week.
            <PrimaryButton className="mt-4" onClick={() => setAdding(true)}>
              Pick your hobbies
            </PrimaryButton>
          </EmptyState>
        </FinCard>
        <AddHobbySheet open={adding} onClose={() => setAdding(false)} first />
      </>
    );
  }
  const cols = [[], [], []];
  list.forEach((h, i) => cols[i % 3].push(h));
  const addBtn = (
    <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-white/10 py-6 text-[14.5px] font-semibold text-fin-muted transition hover:border-fin-accent/40 hover:text-white">
      <Icon name="plus" size={18} /> Add a hobby
    </button>
  );
  return (
    <>
      {s.timer && (
        <div className="mb-4">
          <TimerBanner />
        </div>
      )}
      {/* Phone: one list in order. Laptop: three columns that scroll on their own. */}
      <div className="space-y-5 lg:hidden">
        {list.map((h) => (
          <HobbyCard key={h._id} h={h} onOpen={() => setOpen(h)} onLog={() => setLog(h)} />
        ))}
        {addBtn}
      </div>
      <div className={`${GRID3} hidden lg:grid`}>
        {cols.map((c, ci) => (
          <div key={ci} className={`${COL} ${s.timer ? "lg:h-[calc(100dvh-262px)]" : ""}`}>
            {c.map((h) => (
              <HobbyCard key={h._id} h={h} onOpen={() => setOpen(h)} onLog={() => setLog(h)} />
            ))}
            {ci === list.length % 3 && addBtn}
          </div>
        ))}
      </div>
      <HobbySheet hobby={open} onClose={() => setOpen(null)} />
      <LogSheet hobby={log} onClose={() => setLog(null)} />
      <AddHobbySheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

// ============================== Today ==============================
export function SkillsToday({ go }) {
  const s = useSkills();
  const [review, setReview] = useState(false);
  const [log, setLog] = useState(null);
  useTick(Boolean(s.timer));
  const lesson = todaysLesson(s);
  const doneCount = s.logs.filter((l) => l.challenge === "done").length;
  const active = s.hobbies.filter((h) => h.status === "active");
  const stats = useMemo(() => active.map((h) => ({ h, st: hobbyStats(h, s.sessions, s.today) })), [active, s.sessions, s.today]);
  const nudge = stats.filter((x) => x.st.daysSince == null || x.st.daysSince >= 3).sort((a, b) => (b.st.daysSince ?? 99) - (a.st.daysSince ?? 99))[0];

  return (
    <div className={GRID3}>
      <div className={COL}>
        <FinCard title="Today's lesson" action={<span className="tabular text-[12.5px] text-fin-muted">{doneCount}/{LESSONS.length} done</span>}>
          {s.loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-fin-input" />
          ) : lesson ? (
            <LessonBody lesson={lesson} compact />
          ) : (
            <div className="py-6 text-center">
              <div className="text-[40px]">🏆</div>
              <div className="mt-2 text-[18px] font-bold">You finished the whole course</div>
              <button onClick={() => go("people")} className="mt-3 rounded-xl bg-fin-tile px-3.5 py-2 text-[13.5px] font-semibold">
                Revisit lessons
              </button>
            </div>
          )}
        </FinCard>
      </div>
      <div className={COL}>
        <WordOfDay />
        <FlashcardsCard onReview={() => setReview(true)} compact />
      </div>
      <div className={COL}>
        {s.timer && <TimerBanner />}
        <FinCard title="Hobbies this week" action={<button onClick={() => go("hobbies")} className="text-[13px] font-semibold text-fin-accent">All</button>}>
          {active.length === 0 ? (
            <div>
              <p className="text-[14px] leading-relaxed text-fin-muted">Guitar, chess, CAD, electronics, FPV, web dev… set them up with milestones and weekly goals.</p>
              <button onClick={() => go("hobbies")} className="mt-3 rounded-xl bg-fin-tile px-3.5 py-2 text-[13.5px] font-semibold">
                Set up hobbies
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.map(({ h, st }) => (
                <div key={h._id} className="flex items-center gap-3">
                  <span className="text-[22px]">{h.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between gap-2 text-[13.5px]">
                      <span className="truncate font-semibold">{h.name}</span>
                      <span className="tabular shrink-0 text-fin-muted">
                        {st.week}/{h.weeklyGoal}m
                      </span>
                    </div>
                    <WeekBar value={st.week} goal={h.weeklyGoal} />
                  </div>
                  <IconButton
                    icon={s.timer?.hobbyId === h._id ? "check" : "play"}
                    label={s.timer?.hobbyId === h._id ? "Stop and log" : `Start ${h.name}`}
                    disabled={Boolean(s.timer) && s.timer.hobbyId !== h._id}
                    onClick={() => (s.timer?.hobbyId === h._id ? s.stopTimer(true) : s.startTimer(h._id))}
                  />
                  <IconButton icon="plus" label={`Log ${h.name}`} onClick={() => setLog(h)} />
                </div>
              ))}
            </div>
          )}
        </FinCard>
        {nudge && (
          <FinCard>
            <p className="text-[14px] leading-relaxed text-white/80">
              {nudge.h.emoji} <b>{nudge.h.name}</b> {nudge.st.daysSince == null ? "hasn't been practised yet" : `last practised ${nudge.st.daysSince} days ago`}. Even 15 minutes today keeps the skill warm.
            </p>
          </FinCard>
        )}
      </div>
      <ReviewSheet open={review} onClose={() => setReview(false)} />
      <LogSheet hobby={log} onClose={() => setLog(null)} />
    </div>
  );
}
