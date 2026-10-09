// Pull down from the very top of a page to refresh it, like a native app.
// Touch screens only. Ignored while a popup is open, inside boxes that are
// scrolled, and for sideways swipes (those switch tabs).
import { useEffect, useRef, useState } from "react";
import { haptic } from "../lib/inApp.js";

const TRIGGER = 72; // px of (damped) pull needed to refresh

export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const g = useRef(null);

  useEffect(() => {
    if (!window.matchMedia?.("(hover: none)").matches) return;
    const scrolledParent = (el) => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        if (n.scrollTop > 0) return true;
      }
      return false;
    };
    const start = (e) => {
      g.current = null;
      if (e.touches.length !== 1 || window.scrollY > 0 || document.querySelector('[role="dialog"]')) return;
      if (e.target.closest?.('input, textarea, select, [role="slider"], [data-no-swipe], .touch-none') || scrolledParent(e.target)) return;
      const t = e.touches[0];
      g.current = { x: t.clientX, y: t.clientY, on: false, d: 0, armed: false };
    };
    const move = (e) => {
      const s = g.current;
      if (!s) return;
      const t = e.touches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (!s.on) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) return (g.current = null);
        s.on = true;
      }
      s.d = Math.max(0, Math.min(120, dy * 0.5));
      if (s.d >= TRIGGER && !s.armed) {
        s.armed = true;
        haptic("light");
      } else if (s.d < TRIGGER) s.armed = false;
      setPull(s.d);
    };
    const end = () => {
      const s = g.current;
      g.current = null;
      if (!s?.on) return;
      if (s.d >= TRIGGER) {
        setBusy(true);
        setPull(TRIGGER);
        setTimeout(() => window.location.reload(), 250);
      } else setPull(0);
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, []);

  if (!pull && !busy) return null;
  const p = Math.min(1, pull / TRIGGER);
  return (
    <div className="ptr" style={{ transform: `translate(-50%, ${pull - 44}px)`, transition: g.current ? "none" : "transform 200ms ease-out" }} aria-hidden="true">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1b1b21] shadow-2xl ring-1 ring-white/10" style={{ opacity: Math.max(0.3, p) }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={p >= 1 ? "#fb8a3c" : "rgba(255,255,255,.7)"}
          strokeWidth="2.4"
          strokeLinecap="round"
          className={busy ? "animate-spin" : ""}
          style={busy ? undefined : { transform: `rotate(${p * 270}deg)` }}
        >
          <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" />
        </svg>
      </div>
    </div>
  );
}
