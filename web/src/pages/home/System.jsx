// "The system": LifeOS drawn as a silicon die. Each domain is a block with what
// it's for; it powers up (probe sweep) when it scrolls into view.
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Icon } from "../finances/fin-ui.jsx";
import { DOMAIN } from "../../components/reminders.jsx";

const PAD = 5;
const GAP = 2.4;
const CELL = (100 - 2 * PAD - 5 * GAP) / 6;
const edge = (i) => PAD + i * (CELL + GAP);
const chan = (i) => edge(i) - GAP / 2;
const SWEEP = 1.3;

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
const CHANNELS = [`M2.5 ${chan(2)} H97.5`, `M2.5 ${chan(4)} H97.5`, `M50 2.5 V${chan(2)}`, `M${chan(2)} ${chan(2)} V97.5`, `M${chan(4)} ${chan(2)} V97.5`, `M${chan(5)} ${chan(4)} V97.5`];
const AREAS = `"fin fin fin pap pap pap" "fin fin fin pap pap pap" "gro gro core core fit fit" "gro gro core core fit fit" "goa goa men men tec lea" "goa goa men men tec lea"`;

const BLOCKS = [
  { id: "fin", to: "/finances", name: "Finances", color: DOMAIN.finances.color, icon: "wallet", kind: "sram", big: "Wealth, with intent", why: "Every rupee given a job, so the move abroad is a choice, not a gamble." },
  { id: "pap", to: "/paper", name: "Morning Paper", color: "#f2c14e", icon: "news", kind: "cells", big: "Learn daily", why: "The news that matters and one electronics lesson, every morning." },
  { id: "gro", to: "/grooming", name: "Grooming", color: DOMAIN.grooming.color, icon: "drop", kind: "cells", big: "Look the part", why: "Small routines, done every day." },
  { id: "fit", to: "/fitness", name: "Fitness", color: DOMAIN.fitness.color, icon: "dumbbell", kind: "cells", big: "Strong body", why: "Push, pull, legs. A body that keeps up with the ambition." },
  { id: "goa", to: "/finances", name: "Goals", color: DOMAIN.goals.color, icon: "target", kind: "sram", big: "Aim and hit", why: "Big targets, broken into numbers I can track." },
  { id: "men", to: "/mental", name: "Mental & Psych", color: DOMAIN.mental.color, icon: "sparkle", off: true, why: "Calm under pressure. Being built next." },
  { id: "tec", to: "/technical", name: "Technical", color: DOMAIN.technical.color, icon: "gear", off: true, small: true },
  { id: "lea", to: "/learning", name: "Learning", color: DOMAIN.learning.color, icon: "list", off: true, small: true },
];

export default function System({ go }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const [hover, setHover] = useState(null);
  const h = BLOCKS.find((b) => b.id === hover);
  return (
    <section ref={ref} id="system" className="relative flex min-h-[100svh] items-center py-[8vh]">
      <div className="mx-auto grid w-full max-w-[1320px] items-center gap-10 px-5 sm:px-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <p className="mb-5 text-[15px] font-medium text-[#f2c14e]">How I get there</p>
          <h2 className="text-[clamp(30px,4vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em]">A life, laid out like a chip.</h2>
          <p className="mt-5 max-w-[44ch] text-[17px] leading-relaxed text-white/60">
            Every part of LifeOS is a block on one die. Each does its own job, and they all share the same power. Point at a block to see what it's for; click to go in.
          </p>
          <div className="mt-8 min-h-[92px] border-l-2 pl-5 transition-colors duration-300" style={{ borderColor: h?.color || "rgba(255,255,255,.12)" }}>
            {h ? (
              <motion.div key={h.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
                <div className="text-[20px] font-semibold" style={{ color: h.color }}>
                  {h.name}
                </div>
                <div className="mt-1 text-[16px] leading-relaxed text-white/70">{h.why || "Not built yet."}</div>
              </motion.div>
            ) : (
              <div className="text-[16px] leading-relaxed text-white/40">Point at a block.</div>
            )}
          </div>
        </div>
        <div className="flex justify-center">{inView ? <Die go={go} onHover={setHover} /> : <div className="aspect-square w-full max-w-[560px]" />}</div>
      </div>
    </section>
  );
}

function Die({ go, onHover }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 18 });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    ref.current.style.setProperty("--mx", `${x * 100}%`);
    ref.current.style.setProperty("--my", `${y * 100}%`);
    if (!reduce && e.pointerType === "mouse") {
      px.set(x - 0.5);
      py.set(y - 0.5);
    }
  }
  function onLeave() {
    px.set(0);
    py.set(0);
    onHover(null);
  }

  return (
    <div className="w-full max-w-[560px] [perspective:1400px] lg:w-[min(560px,calc(100svh-140px))]">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: rx, rotateY: ry, "--mx": "50%", "--my": "-30%" }}
        initial={reduce ? false : { opacity: 0, scale: 0.92, rotateZ: -4 }}
        animate={{ opacity: 1, scale: 1, rotateZ: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="die relative aspect-square w-full rounded-[18px] [container-type:inline-size] [transform-style:preserve-3d]"
      >
        <div className="die-ring pointer-events-none absolute -inset-px rounded-[19px]" />
        <div className="absolute inset-0 overflow-hidden rounded-[18px] bg-[#0c0e15]">
          <div className="die-metal absolute inset-0" />
          <div className="die-light pointer-events-none absolute inset-0" />
        </div>
        <Pads reduce={reduce} />
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
            <motion.path key={d} d={d} fill="none" stroke="#c99a5b" strokeOpacity="0.42" strokeWidth="0.45" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 + i * 0.06, duration: 0.9 }} />
          ))}
          {!reduce &&
            TRACES.map((t, i) => (
              <path key={i} d={t.d} pathLength="100" fill="none" stroke={t.color} strokeWidth="0.9" strokeLinecap="round" filter="url(#glow)" className="die-pulse" strokeOpacity={t.dim ? 0.45 : 0.95} style={{ "--dur": `${t.dur}s`, "--delay": `${SWEEP + 0.2 + i * 0.37}s` }} />
            ))}
        </svg>
        <div
          className="absolute grid"
          style={{ inset: `${PAD}%`, gap: `${(GAP / (100 - 2 * PAD)) * 100}%`, gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gridTemplateRows: "repeat(6, minmax(0, 1fr))", gridTemplateAreas: AREAS }}
        >
          {BLOCKS.map((b) => (
            <Block key={b.id} b={b} reduce={reduce} go={go} onHover={onHover} />
          ))}
          <Core now={now} reduce={reduce} />
        </div>
        {!reduce && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 z-20 h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, #fff7dd 20%, #fff 50%, #fff7dd 80%, transparent)", boxShadow: "0 0 18px 4px rgba(255,236,170,.55)" }}
            initial={{ top: "0%", opacity: 0 }}
            animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ top: { duration: SWEEP, delay: 0.35, ease: "easeInOut" }, opacity: { duration: SWEEP, delay: 0.35, times: [0, 0.08, 0.9, 1] } }}
          />
        )}
        <div className="pointer-events-none absolute bottom-[1.2%] right-[6.5%] text-[max(7px,1.35cqw)] font-semibold tracking-[0.18em] text-[#c99a5b]/60">LIFEOS · AS-01 · 2026</div>
      </motion.div>
    </div>
  );
}

function Pads({ reduce }) {
  const per = 15;
  const pads = [];
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < per; i++) {
      if (side === 2 && i < 5) continue;
      const t = 7 + (i * 86) / (per - 1);
      const pos = side === 0 ? { left: `${t}%`, top: "2.5%" } : side === 1 ? { left: "97.5%", top: `${t}%` } : side === 2 ? { left: `${100 - t}%`, top: "97.5%" } : { left: "2.5%", top: `${100 - t}%` };
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

function Block({ b, reduce, go, onHover }) {
  const top = { fin: 0, pap: 0, gro: 2, fit: 2, goa: 4, men: 4, tec: 4, lea: 4 }[b.id] ?? 0;
  const delay = 0.35 + SWEEP * (edge(top) / 100) + 0.05;
  return (
    <motion.button
      onClick={() => go(b.to)}
      onPointerEnter={() => onHover(b.id)}
      onFocus={() => onHover(b.id)}
      style={{ gridArea: b.id, "--c": b.color }}
      initial={reduce ? false : { opacity: 0.08, filter: "brightness(0.3) saturate(0)" }}
      animate={{ opacity: 1, filter: "brightness(1) saturate(1)" }}
      transition={{ delay, duration: 0.55, ease: "easeOut" }}
      className={`die-block group relative overflow-hidden rounded-[6px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--c)] ${b.off ? "is-off" : ""} ${b.kind === "sram" ? "is-sram" : "is-cells"}`}
      aria-label={`${b.name}${b.off ? " (not built yet)" : ""}`}
    >
      <span className="die-block-fill absolute inset-0" />
      <span className="relative flex h-full flex-col justify-between p-[max(6px,2.2cqw)]">
        <span className={`flex items-center gap-[1cqw] text-[max(10px,2.15cqw)] font-semibold ${b.small ? "flex-col items-start" : ""}`} style={{ color: b.off ? "rgba(255,255,255,.45)" : b.color }}>
          <Icon name={b.icon} size={14} stroke={2} className="shrink-0" />
          <span className={b.small ? "mt-[1cqw] [writing-mode:vertical-rl]" : "truncate"}>{b.name}</span>
        </span>
        {b.off ? (
          !b.small && <span className="text-[max(9px,1.8cqw)] text-white/35">Being built</span>
        ) : (
          <span className="block truncate text-[max(14px,3.6cqw)] font-bold leading-[1.05] tracking-tight text-white">{b.big}</span>
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
  const frac = (now.getHours() * 60 + now.getMinutes()) / 1440;
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
        <motion.circle cx="50" cy="50" r={R} fill="none" stroke="#f2c14e" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} initial={reduce ? false : { strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - frac) }} transition={{ delay: 0.35 + SWEEP, duration: 1.2 }} />
      </svg>
      <div className="relative text-center">
        <div className="text-[max(13px,3cqw)] font-semibold text-white/55">Me</div>
        <div className="text-[max(15px,4.2cqw)] font-bold leading-none tracking-tight tabular-nums">{time}</div>
      </div>
    </motion.div>
  );
}
