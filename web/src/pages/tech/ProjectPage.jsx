// A project's own full-screen space. Stages are drawn as a circuit trace you
// tap to complete; status is a pipeline; showcase items are toggle tiles.
// Fits one laptop screen without scrolling; on a phone it stacks and scrolls.
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "../../components/Toast.jsx";
import { sheetOpened } from "../../lib/backSteps.js";
import { haptic } from "../../lib/inApp.js";
import { useTech } from "./TechContext.jsx";
import { STATUS, hours, isGap, newId, prettyDate, safeUrl, showcaseScore } from "./lib";
import { LevelDots, SkillPicker, useElapsed, useNav } from "./ui.jsx";
import { Icon, Ring, ThemeContext } from "../finances/fin-ui.jsx";

const PIPE = ["idea", "planned", "building", "shipped"];
const TILES = [
  { id: "readme", label: "README", icon: "book", tip: "What it does, how to run it, a picture" },
  { id: "demo", label: "Demo", icon: "play", tip: "A video, GIF, live link or photos" },
  { id: "bullet", label: "Resume line", icon: "edit", tip: "One line with a number in it" },
  { id: "pinned", label: "Pinned", icon: "pin", tip: "Pinned on your GitHub profile" },
];

export function ProjectPage({ id, onClose }) {
  const t = useTech();
  const theme = useContext(ThemeContext);
  const p = id ? t.project[id] : null;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const open = Boolean(p);

  // Full screen: lock the page behind, back gesture / Esc close it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const done = sheetOpened(() => closeRef.current());
    const onKey = (e) => {
      if (e.key !== "Escape" || document.querySelector('[data-sheet="1"]')) return;
      if (e.target.closest?.("input,textarea")) return e.target.blur();
      closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      done();
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!p) return null;
  return createPortal(
    <div className={`fin-scope ${theme}`} style={{ display: "contents" }}>
      <div role="dialog" aria-modal="true" aria-label={p.name} className="fixed inset-0 z-[55] flex animate-fade-in flex-col bg-fin-bg font-fin text-white">
        <Workspace p={p} onClose={onClose} />
      </div>
    </div>,
    document.body
  );
}

function Workspace({ p, onClose }) {
  const t = useTech();
  const save = (data, msg) => t.patch("projects", p, data, msg);
  return (
    <>
      <TopBar p={p} save={save} onClose={onClose} />
      <div className="fin-scroll min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-4 pb-8 pt-4 sm:px-6 lg:h-full lg:pb-5">
          <Trace p={p} save={save} />
          <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.05fr_1fr_1fr]">
            <Overview p={p} save={save} />
            <Skills p={p} save={save} />
            <Showcase p={p} save={save} />
          </div>
          <LogStrip p={p} />
        </div>
      </div>
    </>
  );
}

// ============================== top bar ==============================
function TopBar({ p, save, onClose }) {
  const t = useTech();
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(p.name);
  useEffect(() => setName(p.name), [p.name]);
  const color = STATUS[p.status]?.color;
  const paused = p.status === "paused";
  return (
    <header className="relative z-20 border-b border-fin-line bg-fin-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-5">
        <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/70 hover:bg-white/5 hover:text-white" aria-label="Back to projects">
          <Icon name="left" size={20} stroke={2.2} />
        </button>
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => (name.trim() && name.trim() !== p.name ? save({ name: name.trim() }) : setName(p.name))}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          maxLength={120}
          aria-label="Project name"
          className="min-w-[120px] flex-1 rounded-lg bg-transparent px-1 text-[22px] font-extrabold tracking-tight outline-none focus:bg-fin-input sm:text-[26px]"
        />
        <div className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto">
          <Pipeline status={p.status} onChange={(status) => save({ status }, status === "shipped" ? "Shipped 🎉" : undefined)} />
          <button
            onClick={() => save({ status: paused ? "building" : "paused" })}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${paused ? "bg-white/15 text-white" : "text-fin-muted hover:bg-white/5 hover:text-white"}`}
            aria-pressed={paused}
          >
            {paused ? "Paused" : "Pause"}
          </button>
        </div>
        <div className="order-4 flex w-full items-center gap-1.5 sm:order-none sm:w-auto">
          <LinkButton icon="code" label="GitHub repo" value={p.repo} onSave={(repo) => save({ repo })} />
          <LinkButton icon="external" label="Live link" value={p.live} onSave={(live) => save({ live })} />
          <span className="flex-1 sm:hidden" />
          <TimerButton p={p} />
        </div>
        <div className="relative order-2 sm:order-none">
            <button onClick={() => (setMenu((m) => !m), setConfirm(false))} className="grid h-10 w-10 place-items-center rounded-xl text-fin-muted hover:bg-white/5 hover:text-white" aria-label="More" aria-expanded={menu}>
              <span className="text-[20px] leading-none">⋯</span>
            </button>
            {menu && (
              <div className="absolute right-0 top-12 z-10 w-[220px] animate-pop-in rounded-2xl bg-fin-tile p-1.5 shadow-2xl ring-1 ring-white/10">
                {confirm ? (
                  <button onClick={() => (onClose(), t.remove("projects", p, "Project deleted"))} className="w-full rounded-xl bg-red-500/15 px-3 py-2.5 text-left text-[14px] font-semibold text-fin-danger">Yes, delete “{p.name}”</button>
                ) : (
                  <button onClick={() => setConfirm(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] text-white/85 hover:bg-white/5">
                    <Icon name="trash" size={15} /> Delete project
                  </button>
                )}
              </div>
            )}
        </div>
      </div>
    </header>
  );
}

function Pipeline({ status, onChange }) {
  const at = PIPE.indexOf(status);
  return (
    <div className="flex items-center rounded-full bg-fin-card p-1" role="radiogroup" aria-label="Status">
      {PIPE.map((s, i) => {
        const on = s === status;
        const past = at > i;
        const c = STATUS[s].color;
        return (
          <div key={s} className="flex items-center">
            {i > 0 && <span className="h-[2px] w-2 sm:w-3" style={{ background: past || on ? c : "rgba(255,255,255,.12)" }} />}
            <button
              role="radio"
              aria-checked={on}
              onClick={() => (haptic(), onChange(s))}
              className="rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold transition sm:px-3"
              style={on ? { background: c, color: "#0b0b0d" } : past ? { color: c } : { color: "rgba(255,255,255,.45)" }}
            >
              {STATUS[s].label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function LinkButton({ icon, label, value, onSave }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value || "");
  const box = useRef(null);
  useEffect(() => setV(value || ""), [value]);
  useEffect(() => {
    if (!edit) return;
    const off = (e) => !box.current?.contains(e.target) && setEdit(false);
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [edit]);
  const url = safeUrl(value);
  const commit = () => {
    if (v.trim() !== (value || "")) onSave(v.trim());
    setEdit(false);
  };
  return (
    <div ref={box} className="relative">
      <button
        onClick={() => (url && !edit ? window.open(url, "_blank", "noopener,noreferrer") : setEdit((x) => !x))}
        onContextMenu={(e) => (e.preventDefault(), setEdit(true))}
        className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition ${url ? "bg-fin-card text-white hover:bg-fin-tile" : "border border-dashed border-white/15 text-fin-muted hover:text-white"}`}
        aria-label={url ? `Open ${label}` : `Add ${label}`}
        title={url ? `${value} — right-click or long-press to edit` : `Add ${label}`}
      >
        <Icon name={icon} size={15} /> <span className="hidden sm:inline">{url ? label.split(" ")[0] : `+ ${label.split(" ")[0]}`}</span>
      </button>
      {url && (
        <button onClick={() => setEdit((x) => !x)} className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-fin-tile text-[9px] text-white/70 ring-1 ring-white/10 hover:text-white" aria-label={`Edit ${label}`}>✎</button>
      )}
      {edit && (
        <div className="absolute right-0 top-12 z-20 w-[300px] animate-pop-in rounded-2xl bg-fin-tile p-2 shadow-2xl ring-1 ring-white/10">
          <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit()} placeholder={label === "GitHub repo" ? "github.com/you/repo" : "your-site.com"} className="w-full rounded-xl bg-fin-input px-3 py-2.5 text-[14px] text-white outline-none" maxLength={300} aria-label={label} />
          <div className="mt-2 flex justify-end gap-2">
            {value && <button onClick={() => (onSave(""), setEdit(false))} className="px-2 text-[12.5px] text-fin-muted hover:text-fin-danger">Remove</button>}
            <button onClick={commit} className="rounded-lg bg-fin-accent px-3 py-1.5 text-[13px] font-bold text-[#052e16]">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimerButton({ p }) {
  const t = useTech();
  const toast = useToast();
  const mine = t.timer?.kind === "project" && t.timer.projectId === p._id;
  const time = useElapsed(mine ? t.timer.start : null);
  return (
    <button
      onClick={() => (haptic(), mine ? t.stopTimer() : t.startTimer({ kind: "project", projectId: p._id }) || toast("Stop the running timer first"))}
      className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-[13.5px] font-bold transition ${mine ? "bg-fin-accent text-[#052e16] shadow-glow" : "bg-gradient-to-r from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] text-white hover:brightness-110"}`}
    >
      <Icon name={mine ? "pause" : "play"} size={14} stroke={2.6} />
      {mine ? <span className="tabular">{time}</span> : "Work"}
    </button>
  );
}

// ============================== the stage trace ==============================
function Trace({ p, save }) {
  const stages = p.stages || [];
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(null);
  const done = stages.filter((s) => s.done).length;
  const current = stages.findIndex((s) => !s.done);
  const pct = stages.length ? Math.round((done / stages.length) * 100) : 0;
  const set = (list) => save({ stages: list });
  const add = () => {
    const lines = text.split("\n").map((x) => x.trim()).filter(Boolean);
    if (lines.length) set([...stages, ...lines.map((title) => ({ id: newId(), title, done: false }))]);
    setText("");
    setAdding(false);
  };
  // Ticking a stage also ticks the ones before it (a trace fills in order); tap a done one to undo it alone.
  const toggle = (i) => {
    haptic();
    const s = stages[i];
    set(stages.map((x, j) => (s.done ? (j === i ? { ...x, done: false } : x) : j <= i ? { ...x, done: true } : x)));
  };
  return (
    <section className="relative shrink-0 overflow-hidden rounded-[24px] bg-fin-card px-5 pb-4 pt-4">
      <div className="mb-1 flex items-baseline gap-3">
        <h2 className="text-[15px] font-bold">Stages</h2>
        <span className="text-[13px] text-fin-muted">{stages.length ? (current >= 0 ? `Next: ${stages[current].title}` : "Every stage done") : "Map out how you'll build it"}</span>
        <span className="tabular ml-auto text-[22px] font-extrabold text-fin-accent">{pct}%</span>
      </div>
      <div className="fin-scroll -mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex min-w-max items-start pt-3">
          {stages.map((s, i) => {
            const isCur = i === current;
            const lit = s.done;
            return (
              <div key={s.id} className="group flex items-start">
                {i > 0 && <div className="mt-[15px] h-[3px] w-10 rounded-full sm:w-14" style={{ background: stages[i - 1].done ? "rgb(var(--fin-accent))" : "rgba(255,255,255,.1)", boxShadow: stages[i - 1].done ? "0 0 10px rgb(var(--fin-accent) / .6)" : "none" }} />}
                <div className="flex w-[92px] flex-col items-center">
                  <button
                    onClick={() => toggle(i)}
                    aria-label={`${s.title}: ${s.done ? "done" : "not done"}`}
                    aria-pressed={s.done}
                    className={`relative grid h-[33px] w-[33px] place-items-center rounded-full border-[3px] transition active:scale-90 ${lit ? "border-fin-accent bg-fin-accent text-[#052e16]" : isCur ? "border-fin-accent bg-fin-bg text-fin-accent" : "border-white/15 bg-fin-bg text-white/30 hover:border-white/40"}`}
                    style={lit ? { boxShadow: "0 0 16px rgb(var(--fin-accent) / .55)" } : undefined}
                  >
                    {isCur && <span className="absolute inset-[-7px] animate-ping rounded-full border-2 border-fin-accent/40" />}
                    {lit ? <Icon name="check" size={15} stroke={3.2} /> : <span className="h-2 w-2 rounded-full bg-current" />}
                  </button>
                  {editing === s.id ? (
                    <input
                      autoFocus
                      defaultValue={s.title}
                      onBlur={(e) => (e.target.value.trim() && set(stages.map((x) => (x.id === s.id ? { ...x, title: e.target.value.trim() } : x))), setEditing(null))}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && e.currentTarget.blur()}
                      className="mt-2 w-[88px] rounded-md bg-fin-input px-1 text-center text-[12px] text-white outline-none"
                      aria-label="Stage name"
                    />
                  ) : (
                    <button onDoubleClick={() => setEditing(s.id)} onClick={() => setEditing(s.id)} className={`mt-2 line-clamp-2 w-[88px] text-center text-[12px] leading-tight ${lit ? "text-white/60" : isCur ? "font-semibold text-white" : "text-fin-muted"}`} title="Tap to rename">
                      {s.title}
                    </button>
                  )}
                  <button onClick={() => set(stages.filter((x) => x.id !== s.id))} className="mt-0.5 text-[11px] text-fin-faint opacity-0 transition hover:text-fin-danger focus:opacity-100 group-hover:opacity-100" aria-label={`Remove stage ${s.title}`}>remove</button>
                </div>
              </div>
            );
          })}
          <div className="flex items-start">
            {stages.length > 0 && <div className="mt-[15px] h-[3px] w-8 rounded-full border-t-[3px] border-dashed border-white/10" />}
            {adding ? (
              <div className="flex items-center gap-1.5 pt-0.5">
                <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => (e.key === "Enter" ? add() : e.key === "Escape" && setAdding(false))} onBlur={add} placeholder="New stage" className="w-[160px] rounded-xl bg-fin-input px-3 py-1.5 text-[13px] text-white outline-none ring-2 ring-fin-accent/50" aria-label="New stage" />
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="grid h-[33px] w-[33px] place-items-center rounded-full border-2 border-dashed border-white/20 text-white/50 transition hover:border-fin-accent hover:text-fin-accent" aria-label="Add a stage">
                <Icon name="plus" size={15} stroke={2.6} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================== overview ==============================
function Overview({ p, save }) {
  const t = useTech();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(p.summary || "");
  useEffect(() => setV(p.summary || ""), [p.summary]);
  const logs = t.logs.filter((l) => l.projectId === p._id);
  const shipped = logs.filter((l) => l.shipped).length;
  const mins = t.projectMin[p._id] || 0;
  const week = t.sessions.filter((s) => s.projectId === p._id && Date.now() - (s.createdAt || 0) < 7 * 864e5).reduce((a, s) => a + s.minutes, 0);
  const stages = p.stages || [];
  const pct = stages.length ? stages.filter((s) => s.done).length / stages.length : 0;
  return (
    <section className="flex flex-col rounded-[24px] bg-fin-card p-5 lg:min-h-0">
      {edit ? (
        <textarea
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => (v.trim() !== (p.summary || "") && save({ summary: v.trim() }), setEdit(false))}
          rows={3}
          maxLength={1000}
          className="w-full resize-none rounded-2xl bg-fin-input px-3.5 py-3 text-[15px] leading-relaxed text-white outline-none ring-2 ring-fin-accent/40"
          aria-label="What it is"
        />
      ) : (
        <button onClick={() => setEdit(true)} className="rounded-2xl px-1 py-1 text-left text-[16px] leading-relaxed text-white/85 hover:bg-white/[0.03]" title="Tap to edit">
          {p.summary || <span className="text-fin-faint">What is it? Tap to describe it in a line or two.</span>}
        </button>
      )}
      <div className="mt-auto grid grid-cols-3 gap-3 pt-5">
        <Stat ring={pct} value={`${Math.round(pct * 100)}%`} label="built" />
        <Stat ring={Math.min(1, week / 300)} value={hours(mins)} label={week ? `${hours(week)} this week` : "worked"} />
        <Stat ring={logs.length ? shipped / logs.length : 0} value={logs.length} label={shipped ? `${shipped} shipped` : "log entries"} />
      </div>
    </section>
  );
}
function Stat({ ring, value, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Ring value={ring} max={1} color="rgb(var(--fin-accent))" size={76} stroke={6}>
        <span className="tabular text-[15px] font-extrabold">{value}</span>
      </Ring>
      <span className="text-[12px] text-fin-muted">{label}</span>
    </div>
  );
}

// ============================== skills ==============================
function Skills({ p, save }) {
  const t = useTech();
  const nav = useNav();
  const [pick, setPick] = useState(false);
  const list = (p.skills || []).map((id) => t.skill[id]).filter(Boolean);
  const ready = list.filter((s) => (s.level || 0) >= (s.target || 0) - 1).length;
  return (
    <section className="relative flex flex-col rounded-[24px] bg-fin-card p-5 lg:min-h-0">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[15px] font-bold">Skills it needs</h2>
        {list.length > 0 && <span className="text-[12.5px] text-fin-muted">{ready} of {list.length} ready</span>}
        <button onClick={() => setPick((x) => !x)} className="ml-auto rounded-lg px-2 py-1 text-[12.5px] font-semibold text-fin-accent hover:bg-fin-accent/10">{pick ? "Done" : "Edit"}</button>
      </div>
      {pick ? (
        <div className="fin-scroll min-h-0 flex-1 overflow-y-auto">
          <SkillPicker value={p.skills || []} onChange={(skills) => save({ skills })} />
        </div>
      ) : list.length ? (
        <div className="fin-scroll grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto">
          {list.map((s) => {
            const gap = isGap(s);
            return (
              <button key={s._id} onClick={() => nav.open("skill", s._id)} className="group relative flex flex-col justify-between gap-2 rounded-2xl bg-fin-input p-3 text-left transition hover:bg-fin-tile" title={`Open ${s.name}: courses, notes, cards`}>
                {gap && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-amber-300" style={{ boxShadow: "0 0 8px #fcd34d" }} aria-label="gap" />}
                <span className="pr-3 text-[13.5px] font-semibold leading-snug">{s.name}</span>
                <span className="flex items-center justify-between">
                  <LevelDots level={s.level || 0} target={s.target || 0} size={8} />
                  <Icon name="right" size={13} className="text-white/0 transition group-hover:text-fin-accent" />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <button onClick={() => setPick(true)} className="grid min-h-[110px] flex-1 place-items-center rounded-2xl border-2 border-dashed border-white/10 px-4 py-8 text-center text-[14px] text-fin-muted hover:border-fin-accent/50 hover:text-white">
          Link the skills this needs — then tap one to learn it
        </button>
      )}
    </section>
  );
}

// ============================== showcase ==============================
function Showcase({ p, save }) {
  const sc = showcaseScore(p);
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(p.bullet || "");
  useEffect(() => setV(p.bullet || ""), [p.bullet]);
  const toggle = (id) => (haptic(), save({ showcase: { ...(p.showcase || {}), [id]: !p.showcase?.[id] } }));
  return (
    <section className="flex flex-col rounded-[24px] bg-fin-card p-5 lg:min-h-0">
      <div className="flex items-center gap-4">
        <Ring value={sc} max={4} color={sc === 4 ? "#f2c14e" : "rgb(var(--fin-accent))"} size={64} stroke={6}>
          <span className="tabular text-[16px] font-extrabold">{sc}/4</span>
        </Ring>
        <div>
          <h2 className="text-[15px] font-bold">Ready to show</h2>
          <p className="text-[12.5px] text-fin-muted">{sc === 4 ? "Recruiter-ready" : "Tap what's done"}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {TILES.map((x) => {
          const on = Boolean(p.showcase?.[x.id]);
          return (
            <button key={x.id} onClick={() => toggle(x.id)} aria-pressed={on} title={x.tip} className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl transition active:scale-95 ${on ? "bg-fin-accent text-[#052e16]" : "bg-fin-input text-white/45 hover:text-white/80"}`} style={on ? { boxShadow: "0 0 18px rgb(var(--fin-accent) / .35)" } : undefined}>
              <Icon name={x.icon} size={20} stroke={2} />
              <span className="text-[11px] font-semibold leading-none">{x.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto pt-4">
        {edit ? (
          <textarea
            autoFocus
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={() => {
              setEdit(false);
              if (v.trim() !== (p.bullet || "")) save({ bullet: v.trim(), showcase: { ...(p.showcase || {}), bullet: Boolean(v.trim()) || Boolean(p.showcase?.bullet) } });
            }}
            rows={3}
            maxLength={500}
            placeholder="e.g. Built a Python parser that cut datalog review from 2 h to 10 min"
            className="w-full resize-none rounded-2xl bg-fin-input px-3.5 py-3 text-[14px] leading-relaxed text-white outline-none ring-2 ring-fin-accent/40"
            aria-label="Resume line"
          />
        ) : (
          <button onClick={() => setEdit(true)} className="w-full rounded-2xl border-l-[3px] border-fin-accent bg-fin-input px-3.5 py-3 text-left text-[14px] leading-relaxed hover:bg-fin-tile">
            {p.bullet ? <span className="text-white/90">“{p.bullet}”</span> : <span className="text-fin-faint">Write the resume line for this project</span>}
          </button>
        )}
      </div>
    </section>
  );
}

// ============================== build log strip ==============================
function LogStrip({ p }) {
  const t = useTech();
  const [text, setText] = useState("");
  const logs = useMemo(() => t.logs.filter((l) => l.projectId === p._id).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)), [t.logs, p._id]);
  const add = async (shipped) => {
    if (!text.trim()) return;
    haptic();
    await t.create("logs", { date: t.today, projectId: p._id, text: text.trim(), shipped }, shipped ? "Shipped — logged" : "Logged");
    setText("");
  };
  return (
    <section className="flex shrink-0 flex-col gap-3 rounded-[24px] bg-fin-card p-4 lg:flex-row lg:items-stretch">
      <div className="flex shrink-0 flex-col gap-2 lg:w-[340px]">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add(false)} placeholder="What did you just do?" maxLength={1000} className="w-full rounded-2xl bg-fin-input px-4 py-2.5 text-[14px] text-white outline-none ring-fin-accent/50 placeholder:text-fin-faint focus:ring-2" aria-label="Build log entry" />
        <div className="flex gap-2">
          <button onClick={() => add(false)} disabled={!text.trim()} className="flex-1 rounded-xl bg-fin-tile py-2 text-[13px] font-semibold disabled:opacity-40">Log it</button>
          <button onClick={() => add(true)} disabled={!text.trim()} className="flex-1 rounded-xl bg-[#f2c14e]/15 py-2 text-[13px] font-semibold text-[#f2c14e] disabled:opacity-40">Shipped it</button>
        </div>
      </div>
      <div className="fin-scroll flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
        {logs.length ? (
          logs.slice(0, 30).map((l) => (
            <div key={l._id} className={`group relative flex w-[210px] shrink-0 flex-col justify-between rounded-2xl px-3.5 py-2.5 ${l.shipped ? "bg-[#f2c14e]/10 ring-1 ring-[#f2c14e]/25" : "bg-fin-input"}`}>
              <span className="line-clamp-2 text-[13px] leading-snug">{l.text}</span>
              <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-fin-faint">
                {l.shipped && <span className="font-semibold text-[#f2c14e]">Shipped</span>}
                {l.date === t.today ? "Today" : prettyDate(l.date, { day: "numeric", month: "short" })}
              </span>
              <button onClick={() => t.remove("logs", l, "Entry deleted")} className="absolute right-2 top-2 text-fin-faint opacity-0 hover:text-fin-danger group-hover:opacity-100" aria-label="Delete entry"><Icon name="trash" size={12} /></button>
            </div>
          ))
        ) : (
          <div className="grid flex-1 place-items-center rounded-2xl border-2 border-dashed border-white/[0.07] px-4 py-3 text-center text-[13px] text-fin-faint">Your build log fills up here, newest first.</div>
        )}
      </div>
    </section>
  );
}
