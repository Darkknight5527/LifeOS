// The scroll story after the hero.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { PINS, WORLD_DOTS, WORLD_VIEWBOX } from "./world.js";

// Map a progress value from [a, b] onto [from, to], clamped. (A function
// transform keeps Motion from handing it to the browser's scroll timeline,
// which mis-maps these ranges.)
const lerp = (v, [a, b], [from, to]) => from + (to - from) * Math.min(1, Math.max(0, (v - a) / (b - a)));

const EASE = [0.22, 1, 0.36, 1];

function Kicker({ children }) {
  return <p className="mb-5 text-[15px] font-medium text-[#f2c14e]">{children}</p>;
}

/* ------------------------------------------------------------------ */
/* Now: a paragraph that lights up word by word as you scroll           */
/* ------------------------------------------------------------------ */
const NOW_TEXT =
  "I'm not where I want to be yet. But I'm not where I used to be, either. Every morning I choose to show up, learn one more thing, and become someone my future self will thank.";
const FACTS = [
  { k: "Show up", v: "Especially on the days I don't feel like it." },
  { k: "Learn", v: "One new thing, every single day." },
  { k: "Grow", v: "Better than yesterday. Not better than anyone else." },
];

export function Now() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const words = NOW_TEXT.split(" ");
  return (
    <section ref={ref} id="now" className="relative h-[260vh]">
      <div className="sticky top-0 flex h-[100svh] items-center">
        <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-10">
          <Kicker>Where I am</Kicker>
          <p className="max-w-[22ch] text-[clamp(30px,4.4vw,64px)] font-semibold leading-[1.12] tracking-[-0.025em] sm:max-w-[24ch]">
            {words.map((w, i) => (
              <Word key={i} p={scrollYProgress} range={[0.05 + (i / words.length) * 0.6, 0.05 + ((i + 1) / words.length) * 0.6]} reduce={reduce} gold={/^(show|up,|future|self)$/.test(w)}>
                {w}
              </Word>
            ))}
          </p>
          <div className="mt-10 grid max-w-[900px] gap-6 sm:grid-cols-3">
            {FACTS.map((f, i) => (
              <Fact key={f.k} f={f} p={scrollYProgress} at={0.68 + i * 0.07} reduce={reduce} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Word({ p, range, children, reduce, gold }) {
  const o = useTransform(p, (v) => lerp(v, range, [0.12, 1]));
  return (
    <motion.span style={reduce ? undefined : { opacity: o }} className={gold ? "text-[#f3e6c4]" : ""}>
      {children}{" "}
    </motion.span>
  );
}

function Fact({ f, p, at, reduce }) {
  const o = useTransform(p, (v) => lerp(v, [at, at + 0.08], [0, 1]));
  const y = useTransform(p, (v) => lerp(v, [at, at + 0.08], [16, 0]));
  return (
    <motion.div style={reduce ? undefined : { opacity: o, y }} className="border-t border-white/15 pt-3">
      <div className="text-[17px] font-semibold text-[#f3e6c4]">{f.k}</div>
      <div className="mt-1 text-[16px] leading-snug text-white/70">{f.v}</div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Built: things I've made, scrolling sideways                          */
/* ------------------------------------------------------------------ */
const BUILT = [
  { id: "vx01", title: "VX-01", line: "Started with no idea how to build a robot. Ended with one that walks, and a published paper.", art: "hexapod", color: "#60a5fa" },
  { id: "gpu", title: "AI GPU testers", line: "Walked onto a test floor knowing very little. Now I find the faults others miss.", art: "wave", color: "#f2c14e" },
  { id: "pf", title: "PrintForge", line: "Bought one printer, taught myself, and turned it into a small business.", art: "layers", color: "#fb8a3c" },
  { id: "stm", title: "Bare-metal STM32", line: "Chose the hard way on purpose. Understanding beats shortcuts.", art: "bits", color: "#2dd4bf" },
  { id: "lifeos", title: "LifeOS", line: "Built to keep me honest with myself, one habit at a time.", art: "die", color: "#c084fc" },
];

export function Built() {
  const ref = useRef(null);
  const track = useRef(null);
  const reduce = useReducedMotion();
  const [dist, setDist] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, (v) => lerp(v, [0.05, 0.95], [0, -dist]));
  const sx = useSpring(x, { stiffness: 120, damping: 30, mass: 0.4 });

  useLayoutEffect(() => {
    const measure = () => setDist(Math.max(0, (track.current?.scrollWidth || 0) - window.innerWidth));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <section ref={ref} id="built" className="relative" style={{ height: reduce ? "auto" : `calc(100svh + ${dist}px)` }}>
      <div className={reduce ? "py-20" : "sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden"}>
        <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-10">
          <Kicker>Proof it works</Kicker>
          <h2 className="max-w-[22ch] text-[clamp(30px,4vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em]">Every one of these began with "I don't know how yet."</h2>
        </div>
        <motion.div ref={track} style={reduce ? undefined : { x: sx }} className={`mt-8 flex gap-5 px-5 sm:px-10 lg:mt-10 ${reduce ? "flex-wrap" : "w-max"}`}>
          {BUILT.map((b) => (
            <BuiltCard key={b.id} b={b} />
          ))}
          <div className="w-[8vw] shrink-0" />
        </motion.div>
      </div>
    </section>
  );
}

function BuiltCard({ b }) {
  const ref = useRef(null);
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  function move(e) {
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ref.current.style.setProperty("--sx", `${px * 100}%`);
    ref.current.style.setProperty("--sy", `${py * 100}%`);
    if (e.pointerType === "mouse") {
      rx.set((0.5 - py) * 10);
      ry.set((px - 0.5) * 12);
    }
  }
  function leave() {
    rx.set(0);
    ry.set(0);
  }
  return (
    <div className="[perspective:1000px]">
      <motion.article
        ref={ref}
        onPointerMove={move}
        onPointerLeave={leave}
        style={{ rotateX: rx, rotateY: ry, "--c": b.color }}
        className="built-card group relative flex h-[min(56svh,440px)] w-[min(82vw,400px)] shrink-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#0e1018] p-6"
      >
        <div className="built-spot pointer-events-none absolute inset-0" />
        <div className="relative min-h-0 flex-1">
          <Art kind={b.art} color={b.color} />
        </div>
        <div className="relative">
          <h3 className="text-[26px] font-semibold tracking-tight" style={{ color: b.color }}>
            {b.title}
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-white/65">{b.line}</p>
        </div>
      </motion.article>
    </div>
  );
}

function Art({ kind, color }) {
  const common = "absolute inset-0 m-auto h-full max-h-[200px] w-full";
  if (kind === "hexapod")
    return (
      <svg viewBox="0 0 200 140" className={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <rect x="70" y="52" width="60" height="34" rx="10" fill={`${color}22`} />
        {[0, 1, 2].map((i) => {
          const y = 58 + i * 11;
          return (
            <g key={i} className="art-leg" style={{ animationDelay: `${i * 0.18}s` }}>
              <path d={`M70 ${y} L44 ${y - 16} L28 ${y + 26}`} />
              <path d={`M130 ${y} L156 ${y - 16} L172 ${y + 26}`} />
            </g>
          );
        })}
        <circle cx="100" cy="69" r="5" fill={color} />
      </svg>
    );
  if (kind === "wave")
    return (
      <svg viewBox="0 0 200 140" className={common} fill="none" stroke={color} strokeWidth="2">
        {[0, 1, 2, 3].map((r) => (
          <path key={r} className="art-wave" style={{ animationDelay: `${r * 0.35}s` }} d={`M10 ${30 + r * 26} h20 v-12 h24 v12 h14 v-12 h30 v12 h20 v-12 h16 v12 h20 v-12 h12 v12 h24`} />
        ))}
        <line x1="118" y1="10" x2="118" y2="130" stroke="#fff" strokeOpacity=".35" strokeDasharray="3 4" className="art-strobe" />
      </svg>
    );
  if (kind === "layers")
    return (
      <svg viewBox="0 0 200 140" className={common} fill="none">
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={i} className="art-layer" style={{ animationDelay: `${(13 - i) * 0.12}s` }} x={60 + Math.sin(i / 2.2) * 6} y={18 + i * 8} width={80 - Math.abs(7 - i) * 3} height="5" rx="2.5" fill={color} fillOpacity={0.35 + (i % 3) * 0.2} />
        ))}
        <path d="M100 4 v10" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" className="art-nozzle" />
      </svg>
    );
  if (kind === "bits")
    return (
      <div className="absolute inset-0 m-auto grid h-max w-max grid-cols-8 gap-1.5">
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} className="art-bit grid h-7 w-7 place-items-center rounded-md border font-mono text-[11px]" style={{ borderColor: `${color}55`, color, animationDelay: `${(i * 0.37) % 3}s` }}>
            {(i * 7) % 3 ? "0" : "1"}
          </span>
        ))}
      </div>
    );
  return (
    <svg viewBox="0 0 200 140" className={common} fill="none" stroke={color} strokeWidth="1.5">
      <rect x="45" y="10" width="110" height="120" rx="8" />
      {[
        [55, 20, 50, 40],
        [110, 20, 35, 40],
        [55, 66, 30, 26],
        [90, 66, 22, 26],
        [117, 66, 28, 26],
        [55, 98, 90, 22],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="3" fill={`${color}${i === 3 ? "55" : "18"}`} className="art-block" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Next: the route, drawn across the world as you scroll                */
/* ------------------------------------------------------------------ */
const STEPS = [
  { title: "Master my craft", line: "Become the person others come to with the hard questions.", to: [] },
  { title: "Step outside", line: "Taiwan first. Getting comfortable with the unfamiliar.", to: ["hsinchu"] },
  { title: "Earn my place", line: "A seat at one of the best companies in the world.", to: [] },
  { title: "Keep climbing", line: "Never settle into the version of me that's good enough.", to: [] },
  { title: "Live without borders", line: "Singapore, the Netherlands, Germany, the US. Wherever growth is.", to: ["sg", "ein", "muc", "sj"] },
];
const CITY = { blr: "Bangalore", hsinchu: "Hsinchu", sg: "Singapore", ein: "Eindhoven", muc: "Munich", sj: "San Jose" };

function arc(a, b) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - Math.min(18, Math.hypot(b.x - a.x, b.y - a.y) * 0.35);
  return `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`;
}

export function Next() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(reduce ? STEPS.length - 1 : 0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length * 1.02)))));
  const lit = new Set(STEPS.slice(0, active + 1).flatMap((s) => s.to));

  return (
    <section ref={ref} id="next" className="relative h-[420vh]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-8 px-5 sm:px-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div>
            <Kicker>Who I'm becoming</Kicker>
            <h2 className="text-[clamp(30px,4vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em]">One step at a time, into a much bigger life.</h2>
            <ol className="mt-7 space-y-1 lg:mt-9">
              {STEPS.map((s, i) => {
                const state = i < active ? "done" : i === active ? "now" : "next";
                return (
                  <li key={s.title} className="relative flex gap-4 py-2">
                    <span
                      className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[13px] font-semibold tabular-nums transition-all duration-500 ${
                        state === "now" ? "scale-110 border-[#f2c14e] bg-[#f2c14e] text-black shadow-[0_0_24px_rgba(242,193,78,.6)]" : state === "done" ? "border-[#f2c14e]/60 text-[#f2c14e]" : "border-white/15 text-white/30"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className={`transition-all duration-500 ${state === "next" ? "opacity-35" : "opacity-100"}`}>
                      <div className={`text-[18px] font-semibold ${state === "now" ? "text-white" : "text-white/80"}`}>{s.title}</div>
                      <div
                        className={`grid text-[15px] leading-snug text-white/55 transition-[grid-template-rows,opacity] duration-500 ${state === "now" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                      >
                        <span className="overflow-hidden">{s.line}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="relative">
            <svg viewBox={WORLD_VIEWBOX} className="w-full" aria-label="Map: Bangalore to Hsinchu, Singapore, Eindhoven, Munich and San Jose">
              <path d={WORLD_DOTS} stroke="#ffffff" strokeOpacity="0.16" strokeWidth="0.42" strokeLinecap="round" />
              {Object.keys(CITY)
                .filter((k) => k !== "blr")
                .map((k) => (
                  <motion.path
                    key={k}
                    d={arc(PINS.blr, PINS[k])}
                    fill="none"
                    stroke="#f2c14e"
                    strokeWidth="0.45"
                    strokeLinecap="round"
                    initial={false}
                    animate={{ pathLength: lit.has(k) ? 1 : 0, opacity: lit.has(k) ? 1 : 0 }}
                    transition={{ duration: 1.1, ease: EASE }}
                    style={{ filter: "drop-shadow(0 0 1.2px rgba(242,193,78,.9))" }}
                  />
                ))}
              {Object.entries(CITY).map(([k, name]) => {
                const on = k === "blr" || lit.has(k);
                const p = PINS[k];
                const left = p.x > 120;
                return (
                  <g key={k}>
                    {on && <circle cx={p.x} cy={p.y} r="2.4" fill="#f2c14e" className="map-ping" style={{ transformOrigin: `${p.x}px ${p.y}px` }} />}
                    <circle cx={p.x} cy={p.y} r={on ? 0.95 : 0.6} fill={on ? "#f2c14e" : "#ffffff"} fillOpacity={on ? 1 : 0.35} />
                    <text
                      x={p.x + (left ? -1.8 : 1.8)}
                      y={k === "muc" ? p.y + 3.4 : p.y - 1.4}
                      fontSize="2.6"
                      textAnchor={left ? "end" : "start"}
                      fill={on ? "#f3e6c4" : "rgba(255,255,255,.35)"}
                      style={{ transition: "fill .5s" }}
                      fontFamily="Outfit Variable, Outfit, sans-serif"
                    >
                      {name}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="mt-4 text-center text-[15px] text-white/55">
              And through it all: <span className="text-[#f3e6c4]">healthy, calm, and proud of who I became.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Principles: two rows that run faster the faster you scroll           */
/* ------------------------------------------------------------------ */
const PRINCIPLES_A = ["Show up anyway", "Discipline over motivation", "Better than yesterday", "Earn it"];
const PRINCIPLES_B = ["Stay hungry", "Small steps, every day", "Comfort is the enemy", "Finish what I start"];

export function Principles() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const vel = useVelocity(scrollY);
  const smooth = useSpring(vel, { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, [-2000, 0, 2000], [-5, 0, 5], { clamp: false });
  return (
    <section id="principles" className="relative overflow-hidden py-[14vh]">
      <div className="mx-auto mb-10 max-w-[1320px] px-5 sm:px-10">
        <Kicker>What I live by</Kicker>
      </div>
      <Marquee items={PRINCIPLES_A} dir={-1} factor={factor} reduce={reduce} />
      <Marquee items={PRINCIPLES_B} dir={1} factor={factor} reduce={reduce} outline />
    </section>
  );
}

function wrap(min, max, v) {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
}

function Marquee({ items, dir, factor, reduce, outline }) {
  const base = useMotionValue(0);
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);
  const dirRef = useRef(dir);
  useAnimationFrame((t, delta) => {
    if (reduce) return;
    let move = dirRef.current * 2.2 * (delta / 1000);
    const f = factor.get();
    if (f < 0) dirRef.current = -dir;
    else if (f > 0) dirRef.current = dir;
    move += dirRef.current * move * Math.abs(f);
    base.set(base.get() + move);
  });
  const row = [...items, ...items];
  return (
    <div className="flex overflow-hidden whitespace-nowrap py-1">
      <motion.div style={{ x }} className="flex shrink-0">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0">
            {row.map((t, i) => (
              <span key={i} className={`flex items-center px-6 text-[clamp(40px,7vw,104px)] font-semibold leading-[1.1] tracking-[-0.03em] ${outline ? "text-outline" : "text-white"}`}>
                {t}
                <span className="ml-12 inline-block h-3 w-3 rotate-45 bg-[#f2c14e]" aria-hidden="true" />
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One percent: drag through a year of compounding                      */
/* ------------------------------------------------------------------ */
export function Compound({ onPaper }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [d, setD] = useState(reduce ? 365 : 0);
  const touched = useRef(false);

  useEffect(() => {
    if (!inView || reduce || touched.current) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 2200);
      const e = 1 - Math.pow(1 - k, 3);
      if (!touched.current) setD(Math.round(e * 365));
      if (k < 1 && !touched.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce]);

  const up = Math.pow(1.01, d);
  const down = Math.pow(0.99, d);
  const W = 600;
  const H = 260;
  const Y = (v) => H - 16 - (v / 40) * (H - 30);
  const X = (day) => 10 + (day / 365) * (W - 20);
  const curve = (f) => Array.from({ length: 74 }, (_, i) => i * 5).concat(365).map((day, i) => `${i ? "L" : "M"}${X(day).toFixed(1)} ${Y(Math.max(0.02, f(day))).toFixed(1)}`).join("");
  const baseY = Y(1);

  return (
    <section ref={ref} id="compound" className="relative flex min-h-[100svh] items-center py-[10vh]">
      <div className="mx-auto grid w-full max-w-[1320px] items-center gap-10 px-5 sm:px-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <Kicker>Why it matters</Kicker>
          <h2 className="text-[clamp(30px,4vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em]">One percent better, every day.</h2>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-white/60">Nobody changes overnight. But tiny wins stack up, and so do tiny excuses. Drag through a year and see where each road leads.</p>
          <div className="mt-8 flex items-end gap-10">
            <div>
              <div className="text-[13px] text-white/45">Better by 1%</div>
              <div className="text-[clamp(44px,6vw,80px)] font-bold leading-none tracking-tight tabular-nums text-[#f2c14e]">{up.toFixed(up < 10 ? 2 : 1)}×</div>
            </div>
            <div>
              <div className="text-[13px] text-white/45">Worse by 1%</div>
              <div className="text-[clamp(28px,3.4vw,44px)] font-semibold leading-none tabular-nums text-white/45">{down.toFixed(2)}×</div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={onPaper}
              className="rounded-2xl bg-gradient-to-r from-[#f6d77e] to-[#e0a93a] px-5 py-3 text-[15px] font-semibold text-black shadow-[0_10px_40px_-10px_rgba(242,193,78,0.55)] transition hover:brightness-110"
            >
              Start today's one percent
            </button>
          </div>
        </div>

        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
            <line x1="10" x2={W - 10} y1={baseY} y2={baseY} stroke="rgba(255,255,255,.12)" strokeDasharray="4 6" />
            <path d={curve((x) => Math.pow(0.99, x))} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2" />
            <path d={curve((x) => Math.pow(1.01, x))} fill="none" stroke="rgba(242,193,78,.25)" strokeWidth="2" />
            <clipPath id="upto">
              <rect x="0" y="-20" width={X(d)} height={H + 40} />
            </clipPath>
            <g clipPath="url(#upto)">
              <path d={curve((x) => Math.pow(1.01, x))} fill="none" stroke="#f2c14e" strokeWidth="3" style={{ filter: "drop-shadow(0 0 6px rgba(242,193,78,.6))" }} />
              <path d={curve((x) => Math.pow(0.99, x))} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2" />
            </g>
            <line x1={X(d)} x2={X(d)} y1="0" y2={H} stroke="rgba(255,255,255,.15)" />
            <circle cx={X(d)} cy={Y(up)} r="6" fill="#f2c14e" />
            <circle cx={X(d)} cy={Y(Math.max(0.02, down))} r="4" fill="#cbd5e1" />
          </svg>
          <label className="mt-6 block">
            <span className="flex justify-between text-[14px] text-white/55">
              <span>Day {d}</span>
              <span>{d === 365 ? "One year" : `${365 - d} days to a year`}</span>
            </span>
            <input
              type="range"
              min="0"
              max="365"
              value={d}
              onChange={(e) => {
                touched.current = true;
                setD(Number(e.target.value));
              }}
              className="gold-range mt-3 w-full"
              aria-label="Days of compounding"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
