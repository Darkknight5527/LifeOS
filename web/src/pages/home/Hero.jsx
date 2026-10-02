// Opening screen: an electron field that reacts to you, your name in a
// weight-shifting typeface, and a rotating line about what you do.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";

const ROLES = ["semiconductor test engineer.", "builder of robots that walk.", "founder of a 3D-print studio.", "student of electronics, for life.", "on my way to the world."];

export default function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const lift = useTransform(scrollYProgress, (v) => -140 * v);
  const fade = useTransform(scrollYProgress, (v) => Math.max(0, 1 - v / 0.7));

  return (
    <section ref={ref} id="hero" className="relative h-[100svh] min-h-[560px] overflow-hidden">
      <ElectronField reduce={reduce} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_70%,transparent_30%,#07080c_85%)]" />
      <motion.div style={reduce ? undefined : { y: lift, opacity: fade }} className="relative z-10 mx-auto flex h-full max-w-[1320px] flex-col justify-end px-5 pb-[14vh] sm:px-10">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-3 text-[17px] text-white/55 sm:text-[19px]"
        >
          Hi, I'm
        </motion.p>
        <KineticName text="Akhil Sebastian" reduce={reduce} />
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-5 flex flex-wrap items-baseline gap-x-2 text-[20px] text-white/70 sm:text-[26px]"
        >
          <span>A</span>
          <RoleTicker reduce={reduce} />
        </motion.div>
      </motion.div>
      <ScrollCue />
    </section>
  );
}

function KineticName({ text, reduce }) {
  const wrap = useRef(null);
  useEffect(() => {
    if (reduce) return;
    const el = wrap.current;
    const letters = [...el.querySelectorAll("[data-l]")];
    let raf = 0;
    let target = null;
    const apply = () => {
      raf = 0;
      for (const l of letters) {
        let w = 640;
        let y = 0;
        if (target) {
          const r = l.getBoundingClientRect();
          const d = Math.hypot(target.x - (r.left + r.width / 2), target.y - (r.top + r.height / 2));
          const k = Math.max(0, 1 - d / 320);
          w = 520 + 380 * k; // heavier the closer the cursor
          y = -10 * k;
        }
        l.style.fontVariationSettings = `"wght" ${Math.round(w)}`;
        l.style.transform = `translateY(${y.toFixed(1)}px)`;
      }
    };
    const onMove = (e) => {
      target = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      target = null;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <h1 ref={wrap} aria-label={text} className="font-kinetic text-[clamp(56px,11.5vw,168px)] leading-[0.9] tracking-[-0.045em]">
      {text.split(" ").map((word, wi) => (
        <span key={wi} className="mr-[0.22em] inline-block whitespace-nowrap last:mr-0">
          {[...word].map((ch, i) => (
            <motion.span
              key={i}
              data-l
              aria-hidden="true"
              initial={reduce ? false : { opacity: 0, y: "0.6em", filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.3 + (wi * 6 + i) * 0.045, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block transition-[font-variation-settings,transform] duration-300 ease-out"
              style={{ fontVariationSettings: '"wght" 640' }}
            >
              {ch}
            </motion.span>
          ))}
        </span>
      ))}
    </h1>
  );
}

function RoleTicker({ reduce }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % ROLES.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <span className="relative inline-grid overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={i}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="whitespace-nowrap font-medium text-[#f3e6c4]"
        >
          {ROLES[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ScrollCue() {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[12px] text-white/40">
      <span>Scroll</span>
      <span className="relative h-10 w-px overflow-hidden bg-white/10">
        <span className="absolute inset-x-0 top-0 h-4 animate-[cue_1.8s_ease-in-out_infinite] bg-gradient-to-b from-transparent to-[#f2c14e]" />
      </span>
    </div>
  );
}

/**
 * A field of drifting electrons. Your cursor is a positive charge: nearby
 * electrons are pulled towards it and bonds form between close neighbours.
 * Click to fire a pulse that throws them outward.
 */
function ElectronField({ reduce }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    const mouse = { x: -9999, y: -9999 };
    const shocks = [];
    let ps = [];

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(140, Math.max(45, (w * h) / 11000)));
      ps = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 0.7 + Math.random() * 1.4,
        gold: Math.random() < 0.16,
      }));
      if (reduce) draw();
    }

    function step() {
      for (const p of ps) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 240) {
          const f = 0.05 * (1 - d / 240);
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
          if (d < 26) {
            // too close: orbit instead of collapsing onto the cursor
            p.vx -= (dy / d) * 0.12;
            p.vy += (dx / d) * 0.12;
          }
        }
        for (const s of shocks) {
          const sx = p.x - s.x;
          const sy = p.y - s.y;
          const sd = Math.hypot(sx, sy) || 1;
          if (Math.abs(sd - s.r) < 40) {
            p.vx += (sx / sd) * 1.6 * s.life;
            p.vy += (sy / sd) * 1.6 * s.life;
          }
        }
        p.vx = p.vx * 0.975 + (Math.random() - 0.5) * 0.02;
        p.vy = p.vy * 0.975 + (Math.random() - 0.5) * 0.02;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 3) {
          p.vx *= 3 / sp;
          p.vy *= 3 / sp;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }
      for (const s of shocks) {
        s.r += 9;
        s.life *= 0.94;
      }
      while (shocks.length && shocks[0].life < 0.05) shocks.shift();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const LINK = 120;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < ps.length; i++) {
        const a = ps[i];
        for (let j = i + 1; j < ps.length; j++) {
          const b = ps[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const al = (1 - Math.sqrt(d2) / LINK) * 0.22;
            ctx.strokeStyle = `rgba(200,210,235,${al})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of ps) {
        const d = Math.hypot(mouse.x - p.x, mouse.y - p.y);
        if (d < 170) {
          ctx.strokeStyle = `rgba(242,193,78,${(1 - d / 170) * 0.55})`;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
      for (const p of ps) {
        ctx.fillStyle = p.gold ? "rgba(242,193,78,0.95)" : "rgba(226,232,245,0.8)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const s of shocks) {
        ctx.strokeStyle = `rgba(242,193,78,${s.life * 0.5})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (mouse.x > -999) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90);
        g.addColorStop(0, "rgba(242,193,78,0.16)");
        g.addColorStop(1, "rgba(242,193,78,0)");
        ctx.fillStyle = g;
        ctx.fillRect(mouse.x - 90, mouse.y - 90, 180, 180);
      }
    }

    function loop() {
      if (!running) return;
      step();
      draw();
      raf = requestAnimationFrame(loop);
    }

    const onMove = (e) => {
      const r = c.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    const onDown = (e) => {
      const r = c.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      shocks.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 0, life: 1 });
    };
    // Only animate while the hero is on screen.
    const io = new IntersectionObserver(([en]) => {
      const vis = en.isIntersecting && !document.hidden;
      if (vis && !running && !reduce) {
        running = true;
        loop();
      } else if (!vis) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });

    resize();
    window.addEventListener("resize", resize);
    if (!reduce) {
      window.addEventListener("pointermove", onMove);
      document.addEventListener("pointerleave", onLeave);
      window.addEventListener("pointerdown", onDown);
      io.observe(c);
      loop();
    }
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [reduce]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
