// Small shared pieces for Tech & Learning.
import { createContext, useContext, useEffect, useState } from "react";
import { useTech } from "./TechContext.jsx";
import { LEVELS, isGap } from "./lib";
import { Icon } from "../finances/fin-ui.jsx";

export const kicker = "mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted";
export const COL = "fin-scroll space-y-5 lg:h-[calc(100dvh-178px)] lg:space-y-4 lg:overflow-y-auto lg:pr-1";
export const input = "w-full rounded-2xl border border-transparent bg-fin-input px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-fin-faint focus:border-fin-accent/60";
export const select = "w-full rounded-2xl bg-fin-input px-3 py-3 text-[15px] text-white outline-none [color-scheme:dark] focus:ring-2 focus:ring-fin-accent/60";

// Moving around the domain from anywhere: open a skill / project / course,
// or jump to a tab and view. Provided by the page.
export const NavContext = createContext({ go: () => {}, open: () => {} });
export const useNav = () => useContext(NavContext);

/** A skill as a tappable chip: opens everything about that skill. */
export function SkillChip({ id, small = false }) {
  const t = useTech();
  const nav = useNav();
  const s = t.skill[id];
  if (!s) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        nav.open("skill", id);
      }}
      className={`inline-flex max-w-full items-center gap-1 rounded-full bg-fin-accent/10 font-semibold text-fin-accent transition hover:bg-fin-accent/20 ${small ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[12.5px]"}`}
      title={`Open ${s.name}: courses, notes, cards, study time`}
    >
      {isGap(s) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-label="gap" />}
      <span className="truncate">{s.name}</span>
    </button>
  );
}

/** Level 0–5 as dots; tap a dot to set it (when onChange is given). */
export function LevelDots({ level = 0, target = 0, onChange, size = 12, label = "Level" }) {
  return (
    <div className="flex items-center gap-1" role={onChange ? "radiogroup" : undefined} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= level;
        const goal = n === target;
        const El = onChange ? "button" : "span";
        return (
          <El
            key={n}
            {...(onChange ? { onClick: (e) => (e.stopPropagation(), onChange(level === n ? n - 1 : n)), role: "radio", "aria-checked": n === level, "aria-label": `${label} ${n}: ${LEVELS[n]}`, title: LEVELS[n] } : {})}
            className={`grid shrink-0 place-items-center rounded-full transition ${onChange ? "hover:scale-110" : ""}`}
            style={{ width: size + (onChange ? 8 : 0), height: size + (onChange ? 8 : 0) }}
          >
            <span
              className="block rounded-full"
              style={{
                width: size,
                height: size,
                background: on ? "rgb(var(--fin-accent))" : "rgba(255,255,255,.1)",
                boxShadow: goal ? "0 0 0 2px rgba(242,193,78,.85)" : "none",
              }}
            />
          </El>
        );
      })}
    </div>
  );
}

/** mm:ss / h:mm:ss since a start time, ticking. */
export function useElapsed(start) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [start]);
  if (!start) return "";
  const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** The running timer, shown at the top of every view. */
export function TimerBar() {
  const t = useTech();
  const time = useElapsed(t.timer?.start);
  if (!t.timer) return null;
  const what = t.timer.kind === "project" ? t.project[t.timer.projectId]?.name : t.course[t.timer.courseId]?.title || t.skill[t.timer.skillId]?.name;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-fin-accent/15 px-4 py-2.5 ring-1 ring-fin-accent/30">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fin-accent opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fin-accent" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{t.timer.kind === "project" ? "Building" : "Studying"} · {what || "General"}</div>
      </div>
      <span className="tabular text-[17px] font-extrabold">{time}</span>
      <button onClick={() => t.stopTimer()} className="rounded-xl bg-fin-accent px-3 py-1.5 text-[13.5px] font-bold text-[#052e16]">Stop & save</button>
      <button onClick={t.cancelTimer} className="text-[12.5px] text-fin-muted hover:text-white" aria-label="Discard timer">✕</button>
    </div>
  );
}

/** Checklist with add / tick / remove (stages, course modules). */
export function CheckList({ items, onChange, placeholder = "Add a step", label = "Steps" }) {
  const [text, setText] = useState("");
  const add = () => {
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    onChange([...items, ...lines.map((title) => ({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title, done: false }))]);
    setText("");
  };
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <div className="space-y-1" aria-label={label}>
        {items.map((it, i) => (
          <div key={it.id} className="group flex items-center gap-2 rounded-xl bg-fin-input px-2.5 py-1.5">
            <button
              role="checkbox"
              aria-checked={it.done}
              aria-label={it.title}
              onClick={() => onChange(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))}
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${it.done ? "border-fin-accent bg-fin-accent text-[#052e16]" : "border-white/25"}`}
            >
              {it.done && <Icon name="check" size={12} stroke={3} />}
            </button>
            <span className={`min-w-0 flex-1 text-[14px] ${it.done ? "text-fin-muted line-through" : ""}`}>{it.title}</span>
            <span className="flex shrink-0 opacity-60 group-hover:opacity-100">
              <button onClick={() => move(i, -1)} className="px-1 text-fin-faint hover:text-white" aria-label={`Move ${it.title} up`}>↑</button>
              <button onClick={() => move(i, 1)} className="px-1 text-fin-faint hover:text-white" aria-label={`Move ${it.title} down`}>↓</button>
              <button onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="px-1 text-fin-faint hover:text-fin-danger" aria-label={`Remove ${it.title}`}>✕</button>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), add())}
          placeholder={`${placeholder} (paste several lines to add many)`}
          className={`${input} !py-2 !text-[14px]`}
          aria-label={placeholder}
        />
        <button onClick={add} className="shrink-0 rounded-2xl bg-fin-tile px-4 text-[14px] font-semibold hover:bg-[#30303a]">Add</button>
      </div>
    </div>
  );
}

/** Pick several skills from your map. */
export function SkillPicker({ value = [], onChange }) {
  const t = useTech();
  if (!t.skills.length) return <div className="text-[13px] text-fin-muted">Add skills on the Skills tab first, then link them here.</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {t.skills.map((s) => {
        const on = value.includes(s._id);
        return (
          <button
            key={s._id}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== s._id) : [...value, s._id])}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition active:scale-95 ${on ? "border-fin-accent bg-fin-accent/15 text-fin-accent" : "border-transparent bg-fin-input text-white/75 hover:bg-fin-tile"}`}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

/** Pick one skill (or none). */
export function SkillSelect({ value, onChange, label = "Skill" }) {
  const t = useTech();
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={select} aria-label={label}>
      <option value="">No skill</option>
      {t.skills.map((s) => (
        <option key={s._id} value={s._id}>{s.name}</option>
      ))}
    </select>
  );
}

/** Minutes per day for the last n weeks as a small heat grid. */
export function HeatGrid({ values = {}, weeks = 12, end, label = (d, v) => `${d}: ${v}`, unit = "" }) {
  const days = [];
  const e = new Date(`${end}T00:00:00`);
  const startOffset = (e.getDay() + 6) % 7; // Monday-first columns
  const start = new Date(e);
  start.setDate(e.getDate() - startOffset - (weeks - 1) * 7);
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ iso, v: values[iso] || 0, future: d > e });
  }
  const max = Math.max(1, ...days.map((x) => x.v));
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`Activity over the last ${weeks} weeks`}>
      {days.map((x) => (
        <span
          key={x.iso}
          title={x.future ? "" : `${label(x.iso, x.v)}${unit}`}
          className="aspect-square w-full rounded-[3px]"
          style={{ background: x.future ? "transparent" : x.v ? `rgb(var(--fin-accent) / ${0.25 + 0.75 * (x.v / max)})` : "rgba(255,255,255,.06)" }}
        />
      ))}
    </div>
  );
}

/** Text that saves when you leave the box (or press Enter on one line). */
export function EditText({ value = "", onSave, multiline = false, rows = 3, placeholder = "", className = "", label, max = 1000 }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value || ""), [value]);
  const save = () => {
    const next = v.trim();
    if (next !== (value || "").trim()) onSave(next);
  };
  const common = {
    value: v,
    maxLength: max,
    placeholder,
    "aria-label": label || placeholder,
    onChange: (e) => setV(e.target.value),
    onBlur: save,
    className: `${input} ${className}`,
  };
  return multiline ? <textarea rows={rows} {...common} /> : <input {...common} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />;
}
