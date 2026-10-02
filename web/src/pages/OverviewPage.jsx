// LifeOS home: your life laid out as a silicon die. Each domain is a block on
// the floorplan, the core in the middle is today, and signals run between them
// along the routing channels. On load a wafer probe sweeps the die and powers
// each block up as it passes.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { api } from "../api";
import { MenuButton } from "../components/AppMenu.jsx";
import { SyncStatus } from "../components/DomainShell.jsx";
import { DOMAIN, ReminderSheet, occursOn, useReminders } from "../components/reminders.jsx";
import { FinanceProvider, useFinance } from "./finances/FinanceContext.jsx";
import { useMonthStats } from "./finances/stats.js";
import { daysInMonth, formatMoney, todayISO } from "./finances/lib";
import { Icon, ThemeContext } from "./finances/fin-ui.jsx";
import { SkinProvider, useSkin } from "./grooming/skin/SkinContext.jsx";
import { completion } from "./grooming/skin/lib";
import { SPLIT_LABEL, defaultSplitForToday } from "./physical/workouts/constants.js";
import { FACTS, dayNumber } from "./paper/facts.js";

export default function OverviewPage() {
  return (
    <FinanceProvider>
      <SkinProvider>
        <Home />
      </SkinProvider>
    </FinanceProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Floorplan geometry (die is 100 × 100 units; 6 × 6 grid)             */
/* ------------------------------------------------------------------ */
const PAD = 5; // seal ring + pad ring
const GAP = 2.4; // routing channel width
const CELL = (100 - 2 * PAD - 5 * GAP) / 6; // 13
const edge = (i) => PAD + i * (CELL + GAP); // start of column/row i
const chan = (i) => edge(i) - GAP / 2; // centre of the channel before column/row i

// Signal paths along the channels, from the core out to the pad ring.
const TRACES = [
  { d: `M${chan(2)} 50 V${chan(2)} H2.5`, color: DOMAIN.finances.color, dur: 4.2 },
  { d: `M50 ${chan(2)} V2.5`, color: "#f2c14e", dur: 3.4 },
  { d: `M${chan(4)} 50 V${chan(2)} H97.5`, color: DOMAIN.fitness.color, dur: 4.8 },
  { d: `M${chan(2)} 50 V${chan(4)} H2.5`, color: DOMAIN.grooming.color, dur: 3.9 },
  { d: `M${chan(4)} 50 V${chan(4)} H97.5`, color: DOMAIN.fitness.color, dur: 5.4 },
  { d: `M${chan(2)} ${chan(4)} V97.5`, color: DOMAIN.goals.color, dur: 3.6 },
  { d: `M${chan(4)} ${chan(4)} V97.5`, color: DOMAIN.mental.color, dur: 6.2, dim: true },
  { d: `M${chan(4)} ${chan(4)} H${chan(5)} V97.5`, color: DOMAIN.technical.color, dur: 6.8, dim: true },
];
// Static metal: every routing channel, drawn faintly.
const CHANNELS = [
  `M2.5 ${chan(2)} H97.5`,
  `M2.5 ${chan(4)} H97.5`,
  `M50 2.5 V${chan(2)}`,
  `M${chan(2)} ${chan(2)} V97.5`,
  `M${chan(4)} ${chan(2)} V97.5`,
  `M${chan(5)} ${chan(4)} V97.5`,
];

const AREAS = `"fin fin fin pap pap pap" "fin fin fin pap pap pap" "gro gro core core fit fit" "gro gro core core fit fit" "goa goa men men tec lea" "goa goa men men tec lea"`;

/* ------------------------------------------------------------------ */

function useNow(ms = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function greeting(h) {
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function useTraining(today) {
  const [last, setLast] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all([api.list("workout-strength").catch(() => []), api.list("workout-cardio").catch(() => [])]).then(([s, c]) => {
      if (!alive) return;
      setLast({ doneToday: [...s, ...c].some((x) => x.date === today) });
    });
    return () => {
      alive = false;
    };
  }, [today]);
  const split = defaultSplitForToday();
  return { label: split === "rest" ? "Rest day" : `${SPLIT_LABEL[split]} day`, doneToday: last?.doneToday };
}

function Home() {
  const navigate = useNavigate();
  const now = useNow();
  const today = todayISO();
  const fin = useFinance();
  const skin = useSkin();
  const stats = useMonthStats(fin.currentMonth);
  const reminders = useReminders();
  const training = useTraining(today);
  const [sheet, setSheet] = useState({ open: false, reminder: null });

  const lessonDay = Math.min(dayNumber(today), FACTS.length);
  const lesson = FACTS[lessonDay - 1];

  // ---- live numbers for each block ----
  const money = useMemo(() => {
    if (!fin.settings) return null;
    if (!stats.salary) return { value: "Set salary", sub: "Add this month's salary to begin" };
    const daysLeft = daysInMonth(fin.currentMonth) - now.getDate() + 1;
    const spendable = Math.max(0, stats.alloc.needs - stats.spent.needs) + Math.max(0, stats.alloc.wants - stats.spent.wants);
    return {
      value: formatMoney(Math.floor(spendable / Math.max(1, daysLeft))),
      sub: `safe to spend today · ${formatMoney(stats.salary - stats.total, { compact: true })} left this month`,
      pct: stats.salary ? Math.min(1, stats.total / stats.salary) : 0,
    };
  }, [fin.settings, fin.currentMonth, stats, now]);

  const skinNow = skin.hasData ? completion(skin.steps, skin.byDate[today], today) : null;
  const goal = [...(fin.goals || [])].filter((g) => g.currentAmount < g.targetAmount).sort((a, b) => (a.targetDate || "9999").localeCompare(b.targetDate || "9999"))[0];
  const todays = reminders.items
    .filter((r) => occursOn(r, today))
    .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const open = todays.filter((r) => !(r.doneDates || []).includes(today));

  const blocks = [
    {
      id: "fin",
      to: "/finances",
      name: "Finances",
      color: DOMAIN.finances.color,
      icon: "wallet",
      kind: "sram",
      value: money?.value,
      sub: money?.sub,
      meter: money?.pct,
    },
    {
      id: "pap",
      to: "/paper",
      name: "Morning Paper",
      color: "#f2c14e",
      icon: "news",
      kind: "cells",
      value: `Day ${lessonDay}`,
      serif: true,
      sub: lesson?.title,
    },
    {
      id: "gro",
      to: "/grooming",
      name: "Grooming",
      color: DOMAIN.grooming.color,
      icon: "drop",
      kind: "cells",
      value: skinNow ? `${skinNow.am.done + skinNow.pm.done}/${skinNow.am.total + skinNow.pm.total}` : null,
      sub: skinNow ? (skinNow.full ? "Skincare done today" : "skincare steps today") : null,
      meter: skinNow ? (skinNow.am.done + skinNow.pm.done) / Math.max(1, skinNow.am.total + skinNow.pm.total) : undefined,
    },
    {
      id: "fit",
      to: "/fitness",
      name: "Fitness",
      color: DOMAIN.fitness.color,
      icon: "dumbbell",
      kind: "cells",
      value: training.label,
      sub: training.doneToday ? "Logged today" : "Not logged yet",
    },
    {
      id: "goa",
      to: "/finances",
      name: "Goals",
      color: DOMAIN.goals.color,
      icon: "target",
      kind: "sram",
      value: goal ? `${Math.round((goal.currentAmount / goal.targetAmount) * 100)}%` : fin.settings ? "—" : null,
      sub: goal ? goal.title : "No open goals",
      meter: goal ? goal.currentAmount / goal.targetAmount : undefined,
    },
    { id: "men", to: "/mental", name: "Mental & Psych", color: DOMAIN.mental.color, icon: "sparkle", off: true },
    { id: "tec", to: "/technical", name: "Technical", color: DOMAIN.technical.color, icon: "gear", off: true, small: true },
    { id: "lea", to: "/learning", name: "Learning", color: DOMAIN.learning.color, icon: "list", off: true, small: true },
  ];

  const syncing = (fin.syncing && fin.settings) || (skin.syncing && skin.hasData);

  return (
    <ThemeContext.Provider value="theme-gold">
      <div className="fin-scope theme-gold relative min-h-screen overflow-hidden bg-[#07080c] font-fin text-white antialiased lg:h-[100dvh]">
        <Backdrop />

        <header className="relative z-10 flex items-center gap-3 px-3 py-3 sm:px-6">
          <MenuButton className="-ml-1 text-white/70 hover:bg-white/5 hover:text-white" />
          <span className="text-[17px] font-bold tracking-tight">LifeOS</span>
          <SyncStatus syncing={syncing} failed={false} />
        </header>

        <main className="relative z-10 mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-8 px-4 pb-10 pt-2 sm:px-6 lg:h-[calc(100dvh-64px)] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12 lg:pb-6 xl:gap-20">
          <Intro
            now={now}
            open={open}
            todays={todays}
            lesson={lesson}
            lessonDay={lessonDay}
            training={training}
            onReminder={(r) => setSheet({ open: true, reminder: r })}
            onAdd={() => setSheet({ open: true, reminder: null })}
            onToggle={(r) => reminders.toggleDone(r, today)}
            go={navigate}
          />
          <Die blocks={blocks} now={now} go={navigate} />
        </main>

        <ReminderSheet open={sheet.open} reminder={sheet.reminder} api={reminders} onClose={() => setSheet({ open: false, reminder: null })} />
      </div>
    </ThemeContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Left: greeting and today                                            */
/* ------------------------------------------------------------------ */
function Intro({ now, open, todays, lesson, lessonDay, training, onReminder, onAdd, onToggle, go }) {
  const reduce = useReducedMotion();
  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const item = (i) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.25 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  });
  const done = todays.length - open.length;

  return (
    <section className="min-w-0 max-w-[520px] lg:pb-6">
      <motion.p {...item(0)} className="text-[15px] text-white/55">
        {date}
      </motion.p>
      <motion.h1 {...item(1)} className="mt-2 text-[44px] font-semibold leading-[0.98] tracking-[-0.035em] sm:text-[56px] xl:text-[68px]">
        {greeting(now.getHours())},
        <br />
        Akhil.
      </motion.h1>
      <motion.p {...item(2)} className="mt-4 max-w-[42ch] text-[16px] leading-relaxed text-white/60">
        {open.length === 0
          ? todays.length
            ? "Everything on today's list is done."
            : "Nothing on the list today. Pick a block to dive in."
          : `${open.length} ${open.length === 1 ? "thing" : "things"} left today${done ? `, ${done} done` : ""}.`}
      </motion.p>

      <motion.ul {...item(3)} className="mt-7 divide-y divide-white/[0.07] border-y border-white/[0.07]">
        {todays.slice(0, 3).map((r) => {
          const isDone = (r.doneDates || []).includes(todayISO());
          return (
            <li key={r._id} className="flex items-center gap-3 py-2.5">
              <button
                onClick={() => onToggle(r)}
                aria-label={isDone ? `Mark ${r.title} as not done` : `Mark ${r.title} done`}
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${isDone ? "border-transparent bg-white/80 text-black" : "border-white/25 text-transparent hover:border-white/60"}`}
                style={isDone ? { background: DOMAIN[r.domain]?.color } : undefined}
              >
                <Icon name="check" size={12} stroke={3} />
              </button>
              <button onClick={() => onReminder(r)} className={`min-w-0 flex-1 truncate text-left text-[15px] ${isDone ? "text-white/35 line-through" : "text-white/90 hover:text-white"}`}>
                {r.title}
              </button>
              <span className="shrink-0 text-[13px] tabular-nums text-white/40">{r.time ? fmtTime(r.time) : "Any time"}</span>
            </li>
          );
        })}
        <Row onClick={() => go("/paper")} label={lesson ? `Today's lesson: ${lesson.title}` : "Morning Paper"} meta={`Day ${lessonDay}`} />
        <Row onClick={() => go("/fitness")} label={training.label === "Rest day" ? "Rest day — recover well" : `Training: ${training.label}`} meta={training.doneToday ? "Logged" : ""} />
      </motion.ul>

      <motion.div {...item(4)} className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => go("/paper")}
          className="rounded-2xl bg-gradient-to-r from-[#f6d77e] to-[#e0a93a] px-5 py-3 text-[15px] font-semibold text-black shadow-[0_10px_40px_-10px_rgba(242,193,78,0.55)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c14e]"
        >
          Read today's paper
        </button>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-[15px] font-semibold text-white/80 transition hover:border-white/25 hover:text-white">
          <Icon name="plus" size={16} stroke={2.4} /> Reminder
        </button>
      </motion.div>
    </section>
  );
}

function Row({ label, meta, onClick }) {
  return (
    <li>
      <button onClick={onClick} className="group flex w-full items-center gap-3 py-2.5 text-left">
        <span className="grid h-5 w-5 shrink-0 place-items-center text-white/30 group-hover:text-[#f2c14e]">
          <Icon name="right" size={14} stroke={2.2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] text-white/75 group-hover:text-white">{label}</span>
        {meta && <span className="shrink-0 text-[13px] text-white/40">{meta}</span>}
      </button>
    </li>
  );
}

function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/* ------------------------------------------------------------------ */
/* Right: the die                                                       */
/* ------------------------------------------------------------------ */
const SWEEP = 1.25; // seconds for the probe to cross the die

function Die({ blocks, now, go }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), { stiffness: 120, damping: 18 });

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    if (!reduce && e.pointerType === "mouse") {
      px.set(x - 0.5);
      py.set(y - 0.5);
    }
  }
  function onLeave() {
    px.set(0);
    py.set(0);
    ref.current?.style.setProperty("--mx", "50%");
    ref.current?.style.setProperty("--my", "-30%");
  }

  return (
    <div className="mx-auto w-full max-w-[600px] [perspective:1400px] lg:w-[min(600px,calc(100dvh-112px))]">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: rx, rotateY: ry, "--mx": "50%", "--my": "-30%" }}
        initial={reduce ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="die relative aspect-square w-full rounded-[18px] [transform-style:preserve-3d] [container-type:inline-size]"
      >
        {/* iridescent seal ring — the oxide colours you see on a real wafer */}
        <div className="die-ring pointer-events-none absolute -inset-px rounded-[19px]" />
        <div className="absolute inset-0 overflow-hidden rounded-[18px] bg-[#0c0e15]">
          <div className="die-metal absolute inset-0" />
          <div className="die-light pointer-events-none absolute inset-0" />
        </div>

        <Pads reduce={reduce} />

        {/* routing + signals */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {CHANNELS.map((d, i) => (
            <motion.path
              key={d}
              d={d}
              fill="none"
              stroke="#c99a5b"
              strokeOpacity="0.42"
              strokeWidth="0.45"
              vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.9, ease: "easeInOut" }}
            />
          ))}
          {!reduce &&
            TRACES.map((t, i) => (
              <path
                key={i}
                d={t.d}
                pathLength="100"
                fill="none"
                stroke={t.color}
                strokeWidth="0.9"
                strokeLinecap="round"
                filter="url(#glow)"
                className="die-pulse"
                strokeOpacity={t.dim ? 0.45 : 0.95}
                style={{ "--dur": `${t.dur}s`, "--delay": `${SWEEP + 0.2 + i * 0.37}s` }}
              />
            ))}
        </svg>

        {/* the floorplan */}
        <div
          className="absolute grid"
          style={{
            inset: `${PAD}%`,
            gap: `${(GAP / (100 - 2 * PAD)) * 100}%`,
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gridTemplateRows: "repeat(6, minmax(0, 1fr))",
            gridTemplateAreas: AREAS,
          }}
        >
          {blocks.map((b) => (
            <Block key={b.id} b={b} reduce={reduce} go={go} />
          ))}
          <Core now={now} reduce={reduce} />
        </div>

        {/* wafer probe sweep */}
        {!reduce && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 z-20 h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, #fff7dd 20%, #fff 50%, #fff7dd 80%, transparent)", boxShadow: "0 0 18px 4px rgba(255,236,170,.55)" }}
            initial={{ top: "0%", opacity: 0 }}
            animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: SWEEP, delay: 0.35, ease: "easeInOut", times: [0, 1] , opacity: { duration: SWEEP, delay: 0.35, times: [0, 0.08, 0.9, 1] } }}
          />
        )}

        {/* die markings */}
        <div className="pointer-events-none absolute bottom-[1.2%] right-[6.5%] text-[max(7px,1.35cqw)] font-semibold tracking-[0.18em] text-[#c99a5b]/60">LIFEOS · AS-01 · 2026</div>
      </motion.div>
    </div>
  );
}

function Pads({ reduce }) {
  // Bond pads around the edge, lit one after another during power-up.
  const per = 15;
  const pads = [];
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < per; i++) {
      const t = 7 + (i * 86) / (per - 1);
      const pos = side === 0 ? { left: `${t}%`, top: "2.5%" } : side === 1 ? { left: "97.5%", top: `${t}%` } : side === 2 ? { left: `${100 - t}%`, top: "97.5%" } : { left: "2.5%", top: `${100 - t}%` };
      if (side === 2 && i < 5) continue; // room for the die marking
      pads.push({ key: `${side}-${i}`, pos, n: side * per + i });
    }
  }
  return pads.map((p) => (
    <motion.span
      key={p.key}
      className="absolute h-[1.7%] w-[1.7%] -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-[#c99a5b]"
      style={p.pos}
      initial={reduce ? false : { opacity: 0.12 }}
      animate={{ opacity: [0.12, 1, 0.55] }}
      transition={{ delay: 0.2 + p.n * 0.018, duration: 0.7 }}
    />
  ));
}

function Block({ b, reduce, go }) {
  const top = { fin: 0, pap: 0, gro: 2, fit: 2, goa: 4, men: 4, tec: 4, lea: 4 }[b.id] ?? 0;
  const delay = 0.35 + SWEEP * (edge(top) / 100) + 0.05;
  const loading = !b.off && b.value == null;
  return (
    <motion.button
      onClick={() => go(b.to)}
      style={{ gridArea: b.id, "--c": b.color }}
      initial={reduce ? false : { opacity: 0.08, filter: "brightness(0.3) saturate(0)" }}
      animate={{ opacity: 1, filter: "brightness(1) saturate(1)" }}
      transition={{ delay, duration: 0.55, ease: "easeOut" }}
      className={`die-block group relative overflow-hidden rounded-[6px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--c)] ${b.off ? "is-off" : ""} ${b.kind === "sram" ? "is-sram" : "is-cells"}`}
      aria-label={`${b.name}${b.value ? `: ${b.value}` : ""}${b.off ? " (not set up yet)" : ""}`}
    >
      <span className="die-block-fill absolute inset-0" />
      <span className="relative flex h-full flex-col justify-between p-[max(6px,2.2cqw)]">
        <span
          className={`flex items-center gap-[1cqw] text-[max(10px,2.15cqw)] font-semibold ${b.small ? "flex-col items-start" : ""}`}
          style={{ color: b.off ? "rgba(255,255,255,.45)" : b.color }}
        >
          <Icon name={b.icon} size={14} stroke={2} className="shrink-0" />
          <span className={b.small ? "mt-[1cqw] [writing-mode:vertical-rl]" : "truncate"}>{b.name}</span>
        </span>
        {b.off ? (
          <span className={`text-[max(9px,1.8cqw)] text-white/35 ${b.small ? "hidden" : ""}`}>Not wired yet</span>
        ) : (
          <span className="min-w-0">
            {loading ? (
              <span className="block h-[4cqw] w-1/2 animate-pulse rounded bg-white/10" />
            ) : (
              <span className={`block truncate leading-[1.05] text-white ${b.serif ? "font-paper text-[max(15px,4.3cqw)] font-black text-[#f3e6c4]" : "text-[max(15px,4.6cqw)] font-bold tracking-tight tabular-nums"}`}>{b.value}</span>
            )}
            {b.sub && <span className="mt-[0.6cqw] line-clamp-2 text-[max(10px,1.9cqw)] leading-snug text-white/55">{b.sub}</span>}
            {typeof b.meter === "number" && (
              <span className="mt-[1.2cqw] block h-[max(3px,0.6cqw)] overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full" style={{ width: `${Math.max(3, b.meter * 100)}%`, background: b.color }} />
              </span>
            )}
          </span>
        )}
      </span>
      {!b.off && (
        <span className="absolute right-[1.6cqw] top-[1.6cqw] text-white/0 transition group-hover:text-white/70">
          <Icon name="right" size={14} stroke={2.4} />
        </span>
      )}
    </motion.button>
  );
}

function Core({ now, reduce }) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const frac = mins / 1440;
  const time = now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const R = 42;
  const C = 2 * Math.PI * R;
  return (
    <motion.div
      style={{ gridArea: "core" }}
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35 + SWEEP * 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="die-core relative grid place-items-center rounded-[8px]"
      title={`${Math.round(frac * 100)}% of today has passed`}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-[8%] h-[84%] w-[84%] -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="url(#coreGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={reduce ? false : { strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - frac) }}
          transition={{ delay: 0.35 + SWEEP, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3cf" />
            <stop offset="1" stopColor="#f2c14e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative text-center">
        <div className="text-[max(16px,4.6cqw)] font-bold leading-none tracking-tight tabular-nums">{time}</div>
        <div className="mt-[0.8cqw] text-[max(9px,1.7cqw)] text-white/45">{Math.round(frac * 100)}% of today</div>
      </div>
    </motion.div>
  );
}

function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute right-[-10%] top-[-20%] h-[80vh] w-[70vw] rounded-full bg-[radial-gradient(closest-side,rgba(242,193,78,0.10),transparent)]" />
      <div className="absolute bottom-[-30%] left-[-15%] h-[70vh] w-[60vw] rounded-full bg-[radial-gradient(closest-side,rgba(96,165,250,0.07),transparent)]" />
      <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_70%_45%,black,transparent_70%)]" />
    </div>
  );
}
