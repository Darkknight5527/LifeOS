// North Star: the LifeOS home page. A scroll story about who I am and where
// I'm heading — not a dashboard (the Morning Paper does the day-to-day).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Lenis from "lenis";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { MenuButton } from "../components/AppMenu.jsx";
import Hero from "./home/Hero.jsx";
import { Built, Compound, Next, Now, Principles } from "./home/Chapters.jsx";
import System from "./home/System.jsx";

const CHAPTERS = [
  { id: "hero", label: "Hello" },
  { id: "now", label: "Where I am" },
  { id: "built", label: "What I've built" },
  { id: "next", label: "Where I'm going" },
  { id: "system", label: "How I get there" },
  { id: "principles", label: "How I work" },
  { id: "compound", label: "One percent" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const [active, setActive] = useState("hero");
  const [lenis, setLenis] = useState(null);

  // Buttery smooth scrolling for this page only.
  useEffect(() => {
    if (reduce) return;
    const l = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    let raf = requestAnimationFrame(function tick(t) {
      l.raf(t);
      raf = requestAnimationFrame(tick);
    });
    setLenis(l);
    return () => {
      cancelAnimationFrame(raf);
      l.destroy();
      setLenis(null);
    };
  }, [reduce]);

  // Which chapter is on screen (for the side rail).
  useEffect(() => {
    const els = CHAPTERS.map((c) => document.getElementById(c.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const jump = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="home relative min-h-screen bg-[#07080c] font-fin text-white antialiased">
      <motion.div style={{ scaleX: bar }} className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-[#f6d77e] to-[#e0a93a]" />

      <header className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 px-3 py-3 sm:px-6">
        <MenuButton className="-ml-1 text-white/70 hover:bg-white/5 hover:text-white" />
        <span className="text-[17px] font-bold tracking-tight">LifeOS</span>
        <button onClick={() => navigate("/paper")} className="ml-auto rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[14px] font-semibold text-white/80 backdrop-blur transition hover:border-[#f2c14e]/60 hover:text-white">
          Today's paper
        </button>
      </header>

      <nav className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex" aria-label="Chapters">
        {CHAPTERS.map((c) => {
          const on = active === c.id;
          return (
            <button key={c.id} onClick={() => jump(c.id)} className="group flex items-center gap-3" aria-current={on ? "true" : undefined}>
              <span className="translate-x-2 rounded-md bg-black/50 px-2 py-0.5 text-[13px] text-white/70 opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">{c.label}</span>
              <span className={`block h-[2px] rounded-full transition-all duration-300 ${on ? "w-8 bg-[#f2c14e]" : "w-4 bg-white/25 group-hover:w-6 group-hover:bg-white/60"}`} />
            </button>
          );
        })}
      </nav>

      <Hero />
      <Now />
      <Built />
      <Next />
      <System go={navigate} />
      <Principles />
      <Compound onPaper={() => navigate("/paper")} />

      <footer className="border-t border-white/[0.06] px-5 py-8 text-center text-[13px] text-white/35 sm:px-10">Built by Akhil, one block at a time.</footer>
    </div>
  );
}
