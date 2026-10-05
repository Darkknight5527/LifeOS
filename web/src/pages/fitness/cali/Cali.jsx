// Calisthenics: a WINGS-style skill tree, tutorials for every skill, and a
// training view that logs reps / hold times and moves you up the tree.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFit } from "../FitContext.jsx";
import { prettyDate, todayISO } from "../lib";
import { kicker } from "../fit-ui.jsx";
import { FinCard, Icon, IconButton, Pill, Sheet } from "../../finances/fin-ui.jsx";
import { CATEGORIES, DIFFICULTY, LEVELS, SKILL, SKILLS, catLabel, chain, layout, levelFor, nextTarget } from "./skills.js";
import { FOUNDATION, GUIDES } from "./guides.js";

/* ---------------- data ---------------- */
function useCaliState() {
  const fit = useFit();
  return useMemo(() => {
    const best = {};
    const logs = {};
    for (const l of fit.cali) {
      (logs[l.skill] ||= []).push(l);
      for (const s of l.sets || []) {
        const b = (best[l.skill] ||= { reps: 0, hold: 0, date: l.date });
        if ((s.reps || 0) > b.reps) b.reps = s.reps;
        if ((s.hold || 0) > b.hold) b.hold = s.hold;
      }
    }
    const level = Object.fromEntries(SKILLS.map((s) => [s.id, levelFor(s, best[s.id])]));
    const mastered = (id) => level[id].id === "mastered";
    // "Ready": not started yet but everything before it is mastered.
    const ready = Object.fromEntries(SKILLS.map((s) => [s.id, level[s.id].id === "locked" && s.pre.every(mastered)]));
    return { best, logs, level, ready };
  }, [fit.cali]);
}

// Which skill to practise in each family: the hardest one you've started but
// not mastered, otherwise the easiest one you're ready for. You can override it.
function focusFor(cat, st, override, todayLogs) {
  if (override && SKILL[override]?.cat === cat) return SKILL[override];
  // Already practising something in this family today? Stay on it.
  const doing = todayLogs.find((l) => SKILL[l.skill]?.cat === cat);
  if (doing) return SKILL[doing.skill];
  const list = SKILLS.filter((s) => s.cat === cat);
  const rank = (s) => DIFFICULTY.indexOf(s.diff);
  const started = list.filter((s) => ["unlocked", "progress"].includes(st.level[s.id].id)).sort((a, b) => rank(b) - rank(a));
  if (started.length) return started[0];
  const ready = list.filter((s) => st.ready[s.id]).sort((a, b) => rank(a) - rank(b));
  return ready[0] || list[list.length - 1];
}

// Log sets for today: one entry per skill per day.
function useLogger() {
  const fit = useFit();
  const pending = useRef({});
  return async (skill, set) => {
    const date = todayISO();
    const key = `${date}|${skill}`;
    if (pending.current[key]) await pending.current[key];
    const cur = fit.cali.find((l) => l.date === date && l.skill === skill);
    const run = cur ? fit.caliOps.update(cur, { sets: [...(cur.sets || []), set] }, null) : fit.caliOps.add({ date, skill, sets: [set], note: "" }, null);
    pending.current[key] = run;
    await run;
    delete pending.current[key];
  };
}

const fmtBest = (s, b) => (!b ? "Not tried yet" : s.hold ? `Best ${b.hold || 0} s` : `Best ${b.reps || 0} rep${b.reps === 1 ? "" : "s"}`);

/* ---------------- shared pieces ---------------- */
const OpenSkill = createContext(() => {});

export function CaliProvider({ children }) {
  const [open, setOpen] = useState(null);
  return (
    <OpenSkill.Provider value={setOpen}>
      {children}
      <TutorialSheet id={open} onClose={() => setOpen(null)} onGo={setOpen} />
    </OpenSkill.Provider>
  );
}
const useOpenSkill = () => useContext(OpenSkill);

function LevelDot({ level, size = 10 }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: level.color }} />;
}

function Legend({ className = "" }) {
  return (
    <div className={`space-y-1.5 text-[12.5px] ${className}`}>
      {LEVELS.map((l) => (
        <div key={l.id} className="flex items-center gap-2">
          <LevelDot level={l} size={12} />
          <span className="font-semibold">{l.label}</span>
          <span className="text-fin-faint">{l.id === "locked" ? "not done yet" : `${l.hold}${l.id === "mastered" ? "+" : ""} s hold / ${l.reps}${l.id === "mastered" ? "+" : ""} rep${l.reps === 1 ? "" : "s"}`}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-fin-accent" />
        <span className="font-semibold">Ready to learn</span>
        <span className="text-fin-faint">everything before it mastered</span>
      </div>
    </div>
  );
}

/* ---------------- skill tree ---------------- */
const UX_MAX = 112; // px per x unit (max)
const UY = 92; // px per row
const R = 26; // node radius

export function CaliTree() {
  const st = useCaliState();
  const [cat, setCat] = useState(() => sessionStorage.getItem("lifeos_cali_cat") || "hpush");
  useEffect(() => {
    try {
      sessionStorage.setItem("lifeos_cali_cat", cat);
    } catch {
      /* ignore */
    }
  }, [cat]);
  const total = SKILLS.length;
  const done = SKILLS.filter((s) => st.level[s.id].id === "mastered").length;
  const started = SKILLS.filter((s) => ["unlocked", "progress"].includes(st.level[s.id].id)).length;
  const readyList = SKILLS.filter((s) => st.ready[s.id]);
  const open = useOpenSkill();

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[230px_1fr_270px] lg:gap-4 [&>*]:min-w-0">
      <FinCard title="Skill families" className="lg:h-[calc(100dvh-178px)]">
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {CATEGORIES.map((c) => {
            const list = SKILLS.filter((s) => s.cat === c.id);
            const m = list.filter((s) => st.level[s.id].id === "mastered").length;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={`shrink-0 rounded-2xl px-3 py-2.5 text-left transition ${cat === c.id ? "bg-fin-accent/15 ring-1 ring-fin-accent/50" : "bg-fin-input hover:bg-white/[0.06]"}`}
              >
                <div className={`text-[14px] font-semibold ${cat === c.id ? "text-fin-accent" : ""}`}>{c.label}</div>
                <div className="mt-1 flex items-center gap-2 text-[11.5px] text-fin-muted">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10 lg:flex-1">
                    <div className="h-full rounded-full" style={{ width: `${(m / list.length) * 100}%`, background: LEVELS[3].color }} />
                  </div>
                  {m}/{list.length}
                </div>
              </button>
            );
          })}
        </div>
      </FinCard>

      <FinCard title={catLabel(cat)} className="lg:h-[calc(100dvh-178px)]" action={<span className="text-[12px] text-fin-faint">Easiest at the bottom · tap a skill</span>}>
        <Tree cat={cat} st={st} onOpen={open} />
      </FinCard>

      <div className="space-y-4">
        <FinCard title="Your tree">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Mastered", done],
              ["Learning", started],
              ["Skills", total],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-fin-input px-2 py-2">
                <div className="text-[11.5px] text-fin-muted">{k}</div>
                <div className="tabular text-[18px] font-extrabold">{v}</div>
              </div>
            ))}
          </div>
          <Legend className="mt-3" />
        </FinCard>
        <FinCard title="Ready to learn" className="lg:max-h-[calc(100dvh-178px-262px)] lg:overflow-y-auto fin-scroll">
          {readyList.length ? (
            <div className="space-y-1">
              {readyList.slice(0, 12).map((s) => (
                <button key={s.id} onClick={() => open(s.id)} className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-[13.5px] hover:bg-white/[0.04]">
                  <span className="truncate font-semibold">{s.name}</span>
                  <span className="shrink-0 text-[11.5px] text-fin-faint">{CATEGORIES.find((c) => c.id === s.cat)?.short} · {s.diff}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[13.5px] text-fin-muted">Log your first sets in Training and the next skills open up here.</div>
          )}
        </FinCard>
      </div>
    </div>
  );
}

function Tree({ cat, st, onOpen }) {
  const L = useMemo(() => layout(cat), [cat]);
  const box = useRef(null);
  const [boxW, setBoxW] = useState(0);
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Narrow screens squeeze the columns a little before scrolling sideways.
  const UX = boxW ? Math.max(86, Math.min(UX_MAX, (boxW - 8) / Math.max(1, L.width))) : UX_MAX;
  const W = Math.max(1, L.width) * UX;
  const H = L.height * UY;
  const px = (id) => L.x[id] * UX + UX / 2;
  const py = (id) => (L.height - 1 - L.depth[id]) * UY + UY / 2;
  const list = SKILLS.filter((s) => s.cat === cat);
  // Start at the bottom (easiest skills), centred sideways.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    setAtTop(el.scrollTop <= 4);
  }, [cat, boxW]);
  return (
    <div className="relative">
      {!atTop && (
        <button
          onClick={() => box.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full bg-fin-tile/95 px-3 py-1 text-[12px] font-semibold text-white/85 shadow-lg ring-1 ring-white/10 hover:text-white"
        >
          ↑ Harder skills above
        </button>
      )}
    <div ref={box} onScroll={(e) => setAtTop(e.currentTarget.scrollTop <= 4)} className="fin-scroll -mx-2 h-[62vh] overflow-auto lg:h-[calc(100dvh-178px-70px)]">
      <div className="relative mx-auto" style={{ width: W, height: H + 20 }}>
        <svg className="absolute inset-0" width={W} height={H + 20} aria-hidden="true">
          <defs>
            <marker id="cali-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" fill="rgba(255,255,255,.45)" />
            </marker>
          </defs>
          {list.flatMap((s) =>
            s.pre
              .filter((p) => SKILL[p].cat === cat)
              .map((p) => {
                const x1 = px(p), y1 = py(p), x2 = px(s.id), y2 = py(s.id);
                const len = Math.hypot(x2 - x1, y2 - y1) || 1;
                const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
                const lit = st.level[p].id === "mastered";
                return (
                  <g key={`${p}-${s.id}`}>
                    <line x1={x1 + ux * (R + 2)} y1={y1 + uy * (R + 2)} x2={x2 - ux * (R + 4)} y2={y2 - uy * (R + 4)} stroke={lit ? "rgba(197,214,143,.7)" : "rgba(255,255,255,.22)"} strokeWidth="1.5" />
                    <line x1={(x1 + x2) / 2 - ux * 3} y1={(y1 + y2) / 2 - uy * 3} x2={(x1 + x2) / 2} y2={(y1 + y2) / 2} stroke="transparent" markerEnd="url(#cali-arrow)" />
                  </g>
                );
              })
          )}
        </svg>
        {list.map((s) => {
          const lv = st.level[s.id];
          const ready = st.ready[s.id];
          return (
            <button
              key={s.id}
              onClick={() => onOpen(s.id)}
              className="group absolute flex w-[104px] -translate-x-1/2 flex-col items-center gap-1 outline-none"
              style={{ left: px(s.id), top: py(s.id) - R }}
              title={`${s.name} — ${lv.label}${ready ? " · ready to learn" : ""}`}
            >
              <span
                className={`grid place-items-center rounded-full bg-[#1c1c21] transition group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-fin-accent ${ready ? "border-[3px] border-dashed border-fin-accent" : "border-[3px]"}`}
                style={{ width: R * 2, height: R * 2, borderColor: ready ? undefined : lv.color, opacity: lv.id === "locked" && !ready ? 0.75 : 1 }}
              >
                <span className="text-[17px] font-extrabold" style={{ color: lv.id === "locked" ? "#9b9ba5" : lv.color }}>{s.diff}</span>
              </span>
              <span className={`line-clamp-2 text-center text-[11.5px] font-semibold leading-tight ${lv.id === "locked" && !ready ? "text-fin-muted" : "text-white"}`}>{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
    </div>
  );
}

/* ---------------- tutorial (one skill) ---------------- */
function TutorialSheet({ id, onClose, onGo }) {
  const st = useCaliState();
  const log = useLogger();
  const [val, setVal] = useState("");
  const scroller = useRef(null);
  useEffect(() => setVal(""), [id]);
  const s = id && SKILL[id];
  if (!s) return null;
  const lv = st.level[s.id];
  const b = st.best[s.id];
  const c = chain(s);
  const target = nextTarget(s, lv);
  const history = (st.logs[s.id] || []).slice(0, 5);

  const save = async () => {
    const n = Number(val);
    if (!n || n <= 0) return;
    await log(s.id, s.hold ? { hold: Math.round(n), reps: 0 } : { reps: Math.round(n), hold: 0 });
    setVal("");
  };

  return (
    <Sheet open onClose={onClose} title={s.name} wide titleExtra={<span className="rounded-lg bg-fin-tile px-2 py-0.5 text-[12px] font-bold text-fin-muted">{catLabel(s.cat)}</span>}>
      <div ref={scroller} className="space-y-6 pb-2">
        {/* Overview */}
        <section className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <dl className="space-y-2.5 text-[14.5px]">
            <Row k="Skill difficulty" v={<span className="font-extrabold text-fin-accent">{s.diff}</span>} />
            <Row k="Time to learn" v={s.ttl} />
            <Row k="Targeted muscles" v={s.muscles} />
            <Row k="High strain areas" v={s.strain} />
            <Row k="Measured in" v={s.hold ? "seconds held" : "reps"} />
          </dl>
          <p className="text-[14.5px] leading-relaxed text-white/85">{s.desc}</p>
        </section>

        {/* Your level + log */}
        <section className="rounded-2xl bg-fin-input p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <LevelDot level={lv} size={14} />
              <div>
                <div className="text-[15px] font-bold">{lv.label}{st.ready[s.id] ? " · ready to learn" : ""}</div>
                <div className="text-[12.5px] text-fin-muted">
                  {fmtBest(s, b)}
                  {target ? ` · next level at ${target}` : " · you've mastered this one 🎉"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder={s.hold ? "Seconds" : "Reps"}
                aria-label={s.hold ? "Seconds held" : "Reps done"}
                className="tabular w-24 rounded-xl bg-fin-card px-3 py-2 text-center text-[15px] font-semibold outline-none ring-1 ring-white/10 focus:ring-fin-accent"
              />
              <button onClick={save} disabled={!val} className="rounded-xl bg-fin-accent/20 px-3 py-2 text-[13.5px] font-semibold text-fin-accent hover:bg-fin-accent/30 disabled:opacity-40">
                Log a set today
              </button>
            </div>
          </div>
          {history.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fin-muted">
              {history.map((h) => (
                <span key={h._id} className="tabular">
                  {prettyDate(h.date, { day: "numeric", month: "short" })}: {(h.sets || []).map((x) => (s.hold ? `${x.hold}s` : x.reps)).join(", ")}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Step by step */}
        <section>
          <h4 className={kicker}>Step-by-step</h4>
          <ol className="space-y-1.5 text-[14.5px] leading-relaxed text-white/85">
            {s.steps.map((x, i) => (
              <li key={i} className="flex gap-3">
                <span className="tabular mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fin-accent/15 text-[12px] font-bold text-fin-accent">{i + 1}</span>
                <span>{x}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-1.5 text-[14.5px]">
          <div><span className="text-fin-muted">Recommended main exercises: </span>{s.main.join(", ")}</div>
          <div><span className="text-fin-muted">Recommended accessory exercises: </span>{s.acc.join(", ")}</div>
        </section>

        {/* Progressions */}
        <section>
          <h4 className={kicker}>Progressions</h4>
          <div className="grid grid-cols-5 items-start gap-1 text-center">
            {[
              ["Base skill", c.base, "…"],
              ["Regression", c.reg, "→"],
              ["Current skill", s, "→"],
              ["Progression", c.prog, "…"],
              ["Target skill", c.target, ""],
            ].map(([label, x], i) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fin-faint">{label}</div>
                {x ? (
                  <button
                    onClick={() => x.id !== s.id && (onGo(x.id), scroller.current?.parentElement?.scrollTo({ top: 0 }))}
                    className={`grid h-12 w-12 place-items-center rounded-full border-[3px] text-[16px] font-extrabold transition ${x.id === s.id ? "cursor-default" : "hover:scale-110"}`}
                    style={{ borderColor: st.level[x.id].color, color: st.level[x.id].id === "locked" ? "#9b9ba5" : st.level[x.id].color }}
                    aria-label={`Open ${x.name}`}
                  >
                    {x.diff}
                  </button>
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full border-[3px] border-white/15 text-[11px] font-bold text-fin-faint">N/A</div>
                )}
                <div className={`text-[12px] leading-tight ${i === 2 ? "font-bold" : "text-fin-muted"}`}>{x ? x.name : "—"}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Technique & form */}
        <section>
          <h4 className={kicker}>Technique &amp; form</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-400/[0.06] p-4">
              <div className="mb-2 text-[13.5px] font-bold text-emerald-300">Good form</div>
              <ul className="space-y-1 text-[14px] text-white/85">
                {s.good.map((x) => <li key={x} className="flex gap-2"><span className="text-emerald-300">✓</span>{x}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl bg-red-400/[0.06] p-4">
              <div className="mb-2 text-[13.5px] font-bold text-red-300">Bad form</div>
              <ul className="space-y-1 text-[14px] text-white/85">
                {s.bad.map((x) => <li key={x} className="flex gap-2"><span className="text-red-300">✕</span>{x}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* Video tutorials */}
        <section>
          <h4 className={kicker}>Video tutorials</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {s.videos.map((v) => (
              <a key={v.url} href={v.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-fin-input px-3 py-2.5 transition hover:bg-white/[0.07]">
                <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg bg-[#ff0033] text-white">
                  <Icon name="play" size={16} stroke={0} className="fill-current" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{v.title}</span>
                  <span className="block text-[12px] text-fin-faint">YouTube · opens search results</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </Sheet>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[140px] shrink-0 text-fin-muted">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}

/* ---------------- training ---------------- */
export function CaliTraining() {
  const fit = useFit();
  const st = useCaliState();
  const open = useOpenSkill();
  const focusMap = fit.settings?.cali?.focus || {};
  const today = todayISO();
  const recent = useMemo(() => {
    const by = {};
    for (const l of fit.cali) (by[l.date] ||= []).push(l);
    return Object.entries(by).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  }, [fit.cali]);
  const todayLogs = fit.cali.filter((l) => l.date === today);
  const setFocus = (cat, id) => fit.saveSettings({ cali: { ...(fit.settings?.cali || {}), focus: { ...focusMap, [cat]: id } } }, null);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_340px] lg:gap-4 [&>*]:min-w-0">
      <div className="fin-scroll grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-h-[calc(100dvh-178px)] lg:overflow-y-auto lg:pr-1 xl:grid-cols-3">
        {CATEGORIES.map((c) => (
          <FocusCard key={c.id} cat={c} skill={focusFor(c.id, st, focusMap[c.id], todayLogs)} st={st} today={today} onOpen={open} onFocus={(id) => setFocus(c.id, id)} />
        ))}
      </div>
      <div className="space-y-4">
        <FinCard title="How to train">
          <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-fin-muted">
            <li><b className="text-white/85">Beginner:</b> full body 3× a week, 3 × 8–12 per exercise, 2–4 min rest.</li>
            <li><b className="text-white/85">Strength:</b> 3 × 4–8, 3–5 min rest, then split days (push ×2, pull ×2).</li>
            <li><b className="text-white/85">Holds:</b> a new skill joins your workouts at 6–8 s.</li>
            <li>Work at <b className="text-white/85">80–90% effort</b> — consistency beats intensity.</li>
            <li>Move up when a skill turns <span style={{ color: LEVELS[3].color }}>mastered</span> — the next one becomes ready.</li>
          </ul>
        </FinCard>
        <FinCard title="Recent practice" className="lg:max-h-[calc(100dvh-178px-250px)] lg:overflow-y-auto fin-scroll">
          {recent.length ? (
            <div className="space-y-3">
              {recent.map(([date, list]) => (
                <div key={date}>
                  <div className="mb-1 text-[12.5px] font-semibold text-fin-muted">{prettyDate(date)}</div>
                  {list.map((l) => {
                    const s = SKILL[l.skill];
                    if (!s) return null;
                    return (
                      <div key={l._id} className="group flex items-center gap-2 rounded-xl py-0.5 pl-1 text-[13.5px] hover:bg-white/[0.03]">
                        <button onClick={() => open(s.id)} className="truncate font-semibold hover:text-fin-accent">{s.name}</button>
                        <span className="tabular ml-auto shrink-0 text-fin-muted">{(l.sets || []).map((x) => (s.hold ? `${x.hold}s` : x.reps)).join(" · ")}</span>
                        <IconButton icon="trash" label={`Delete ${s.name} on ${prettyDate(date)}`} onClick={() => fit.caliOps.remove(l)} className="!h-7 !w-7 shrink-0 hover:!text-fin-danger" size={14} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13.5px] text-fin-muted">Nothing logged yet. Log a set on any card — reps, or a hold with the timer.</div>
          )}
        </FinCard>
      </div>
    </div>
  );
}

function FocusCard({ cat, skill: s, st, today, onOpen, onFocus }) {
  const fit = useFit();
  const log = useLogger();
  const [val, setVal] = useState("");
  const [timer, setTimer] = useState(null); // start time while a hold is running
  const [, tick] = useState(0);
  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => tick((n) => n + 1), 200);
    return () => clearInterval(t);
  }, [timer]);
  useEffect(() => {
    setVal("");
    setTimer(null);
  }, [s.id]);
  const lv = st.level[s.id];
  const target = nextTarget(s, lv);
  const todays = fit.cali.find((l) => l.date === today && l.skill === s.id);
  const options = SKILLS.filter((x) => x.cat === cat.id);
  const secs = timer ? Math.floor((Date.now() - timer) / 1000) : 0;

  const add = (n) => n > 0 && log(s.id, s.hold ? { hold: n, reps: 0 } : { reps: n, hold: 0 });
  const submit = () => {
    add(Math.round(Number(val)));
    setVal("");
  };
  const removeSet = (i) => todays && fit.caliOps.update(todays, { sets: todays.sets.filter((_, j) => j !== i) }, null);

  return (
    <section className="flex flex-col rounded-[24px] bg-fin-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className={kicker + " !mb-0"}>{cat.label}</div>
        <select
          value={s.id}
          onChange={(e) => onFocus(e.target.value)}
          aria-label={`Skill to practise for ${cat.label}`}
          className="max-w-[130px] rounded-lg bg-fin-tile px-2 py-1 text-[12px] font-semibold text-white/80 outline-none [color-scheme:dark]"
        >
          {options.map((o) => <option key={o.id} value={o.id}>{o.diff} · {o.name}</option>)}
        </select>
      </div>
      <button onClick={() => onOpen(s.id)} className="mt-2 flex items-center gap-2 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] text-[14px] font-extrabold" style={{ borderColor: lv.color, color: lv.id === "locked" ? "#9b9ba5" : lv.color }}>{s.diff}</span>
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-bold hover:text-fin-accent">{s.name}</span>
          <span className="block text-[12px] text-fin-muted">{lv.label} · {fmtBest(s, st.best[s.id])}</span>
        </span>
      </button>
      <div className="mt-2 text-[12.5px] text-fin-faint">{target ? `Next level: ${target}` : "Mastered — pick the next skill above"} · aim for 3–5 sets</div>

      <div className="mt-3 flex min-h-[28px] flex-wrap gap-1.5">
        {(todays?.sets || []).map((x, i) => (
          <button key={i} onClick={() => removeSet(i)} title="Remove this set" className="tabular rounded-lg bg-fin-accent/15 px-2 py-0.5 text-[13px] font-semibold text-fin-accent hover:bg-red-500/15 hover:text-fin-danger">
            {s.hold ? `${x.hold}s` : `${x.reps} reps`}
          </button>
        ))}
        {!todays?.sets?.length && <span className="text-[12.5px] text-fin-faint">No sets today</span>}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3">
        {s.hold && (
          <button
            onClick={() => {
              if (timer) {
                add(secs);
                setTimer(null);
              } else setTimer(Date.now());
            }}
            className={`tabular rounded-xl px-3 py-2 text-[13.5px] font-bold transition ${timer ? "bg-fin-accent text-white" : "bg-fin-tile text-white/85 hover:bg-[#30303a]"}`}
          >
            {timer ? `Stop · ${secs}s` : "▶ Hold timer"}
          </button>
        )}
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={s.hold ? "sec" : "reps"}
          aria-label={s.hold ? `Seconds held, ${s.name}` : `Reps, ${s.name}`}
          className="tabular w-full min-w-0 flex-1 rounded-xl bg-fin-input px-3 py-2 text-center text-[15px] font-semibold outline-none ring-1 ring-transparent focus:ring-fin-accent"
        />
        <button onClick={submit} disabled={!val} className="shrink-0 rounded-xl bg-fin-accent/20 px-3 py-2 text-[13.5px] font-semibold text-fin-accent hover:bg-fin-accent/30 disabled:opacity-40">
          Log set
        </button>
      </div>
    </section>
  );
}

/* ---------------- guides ---------------- */
export function CaliGuides() {
  const st = useCaliState();
  const open = useOpenSkill();
  const [id, setId] = useState(() => {
    try {
      return sessionStorage.getItem("lifeos_cali_guide") || "beginner";
    } catch {
      return "beginner";
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem("lifeos_cali_guide", id);
    } catch {
      /* ignore */
    }
  }, [id]);
  const g = GUIDES.find((x) => x.id === id) || GUIDES[0];
  const pane = useRef(null);
  useEffect(() => pane.current?.scrollTo({ top: 0 }), [id]);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[250px_1fr] lg:gap-4 [&>*]:min-w-0">
      <FinCard title="Guides" className="lg:h-[calc(100dvh-178px)]">
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" data-no-swipe>
          {GUIDES.map((x) => (
            <button
              key={x.id}
              onClick={() => setId(x.id)}
              aria-pressed={id === x.id}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-[14px] font-semibold transition ${id === x.id ? "bg-fin-accent/15 text-fin-accent ring-1 ring-fin-accent/50" : "bg-fin-input hover:bg-white/[0.06]"}`}
            >
              <Icon name={x.icon} size={17} />
              {x.title}
            </button>
          ))}
        </div>
        <div className="mt-4 hidden text-[12px] leading-relaxed text-fin-faint lg:block">Summarised from the WINGS Calisthenics Training Guides. Tap a skill to open its tutorial.</div>
      </FinCard>

      <section ref={pane} className="fin-scroll animate-fade-up rounded-[28px] bg-fin-card p-5 shadow-card sm:p-6 lg:h-[calc(100dvh-178px)] lg:overflow-y-auto lg:rounded-[24px] lg:p-6">
        <h2 className="text-[24px] font-extrabold tracking-tight">{g.title}</h2>
        <p className="mt-1.5 max-w-[720px] text-[15px] leading-relaxed text-white/80">{g.intro}</p>

        {g.foundation && <Foundation st={st} open={open} />}

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {g.sections.map((sec) => {
            const List = sec.ordered ? "ol" : "ul";
            return (
              <div key={sec.h} className="rounded-2xl bg-fin-input p-4">
                <h3 className={kicker}>{sec.h}</h3>
                <List className="space-y-2 text-[14px] leading-relaxed text-white/85">
                  {sec.items.map((it, i) => {
                    const text = typeof it === "string" ? it : it.t;
                    const sk = typeof it === "string" ? null : SKILL[it.s];
                    return (
                      <li key={i} className="flex gap-2.5">
                        <span className={`mt-[3px] shrink-0 ${sec.ordered ? "tabular grid h-5 w-5 place-items-center rounded-full bg-fin-accent/15 text-[11px] font-bold text-fin-accent" : "mt-[9px] h-1.5 w-1.5 rounded-full bg-white/30"}`}>{sec.ordered ? i + 1 : ""}</span>
                        <span className="min-w-0">
                          {text}
                          {sk && (
                            <button onClick={() => open(sk.id)} className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-fin-tile px-2 py-0.5 align-middle text-[12px] font-semibold text-white/85 hover:text-fin-accent">
                              <LevelDot level={st.level[sk.id]} size={8} />
                              {sk.name}
                            </button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </List>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// WINGS' foundation phase, filled in from your logged bests.
function Foundation({ st, open }) {
  const rows = FOUNDATION.map((f) => {
    const s = SKILL[f.skill];
    const b = st.best[f.skill];
    const have = b ? (s.hold ? b.hold : b.reps) : 0;
    return { ...f, s, have, done: have >= f.goal };
  });
  const done = rows.filter((r) => r.done).length;
  return (
    <div className="mt-5 rounded-2xl bg-gradient-to-br from-fin-accent/15 to-transparent p-4 ring-1 ring-fin-accent/25">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-bold">Foundation phase</h3>
        <span className="tabular text-[13px] text-fin-muted">{done} / {rows.length} reached — from your logged sets</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((r) => (
          <button key={r.skill} onClick={() => open(r.skill)} className="rounded-xl bg-fin-card/80 px-3 py-2.5 text-left transition hover:bg-fin-card">
            <div className="flex items-center justify-between gap-2 text-[13.5px] font-semibold">
              <span className="truncate">{r.label}</span>
              <span className={`tabular shrink-0 ${r.done ? "text-[#c5d68f]" : "text-fin-muted"}`}>
                {r.done ? "✓ " : ""}
                {r.have}/{r.goal}
                {r.s.hold ? " s" : ""}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.have / r.goal) * 100)}%`, background: r.done ? "#c5d68f" : "rgb(var(--fin-accent))" }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- tutorials list ---------------- */
export function CaliTutorials() {
  const st = useCaliState();
  const open = useOpenSkill();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const list = SKILLS.filter((s) => (cat === "all" || s.cat === cat) && (!q || `${s.name} ${s.muscles}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex w-full items-center gap-2 rounded-2xl bg-fin-card px-3 py-2 sm:w-[260px]">
          <Icon name="search" size={16} className="text-fin-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search skills or muscles" aria-label="Search skills" className="w-full bg-transparent text-[14px] outline-none placeholder:text-fin-faint" />
        </label>
        <div className="flex flex-wrap gap-1">
          <Pill active={cat === "all"} onClick={() => setCat("all")} className="!px-3 !py-1 !text-[13px]">All</Pill>
          {CATEGORIES.map((c) => <Pill key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} className="!px-3 !py-1 !text-[13px]">{c.label}</Pill>)}
        </div>
      </div>
      {cat !== "all" && <p className="-mt-1 max-w-[760px] text-[13.5px] text-fin-muted">{CATEGORIES.find((c) => c.id === cat)?.desc}</p>}
      <div className={`fin-scroll grid grid-cols-1 gap-3 sm:grid-cols-2 ${cat !== "all" ? "lg:max-h-[calc(100dvh-266px)]" : "lg:max-h-[calc(100dvh-236px)]"} lg:grid-cols-3 lg:overflow-y-auto lg:pr-1 xl:grid-cols-4`}>
        {list.map((s) => {
          const lv = st.level[s.id];
          return (
            <button key={s.id} onClick={() => open(s.id)} className="flex items-start gap-3 rounded-[20px] bg-fin-card p-4 text-left transition hover:bg-[#222228]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[3px] text-[15px] font-extrabold" style={{ borderColor: st.ready[s.id] ? "rgb(var(--fin-accent))" : lv.color, borderStyle: st.ready[s.id] ? "dashed" : "solid", color: lv.id === "locked" ? "#9b9ba5" : lv.color }}>{s.diff}</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold">{s.name}</span>
                <span className="block text-[12px] text-fin-muted">{catLabel(s.cat)} · {s.ttl}</span>
                <span className="mt-1 line-clamp-2 block text-[12.5px] text-fin-faint">{s.desc}</span>
              </span>
            </button>
          );
        })}
        {!list.length && <div className="col-span-full rounded-2xl bg-fin-card p-6 text-center text-[14px] text-fin-muted">No skills match "{q}".</div>}
      </div>
    </div>
  );
}

