// Instagram-style swipe between a domain's tabs on touch screens (phone, the
// Android app). The page follows your finger; let go past ~25% of the width
// (or flick) and it slides to the next tab, otherwise it springs back.
// Vertical scrolling is untouched. Sliders, charts and inputs keep their own
// drags, sideways-scrolling boxes scroll first, and swipes that start at the
// screen edge (Android's back gesture) are left alone.
import { useEffect, useRef } from "react";

const IGNORE = 'input, textarea, select, [contenteditable], [role="slider"], [data-no-swipe], .touch-none';
const EDGE = 24; // px from the screen edge reserved for the system back gesture

// Sideways-scrollable boxes under the finger (skill tree, chip rows…).
function sideScrollers(el, stop) {
  const out = [];
  for (let n = el; n && n !== stop; n = n.parentElement) {
    const ox = getComputedStyle(n).overflowX;
    if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 24) out.push(n); // ignore boxes only a few px too wide
  }
  return out;
}
// Like Instagram's carousels: a box that can still scroll in the drag
// direction gets the drag; once it's at its edge, the swipe changes tab.
const canScroll = (n, dx) => (dx < 0 ? n.scrollLeft + n.clientWidth < n.scrollWidth - 2 : n.scrollLeft > 2);

export function useSwipeTabs(ref, ids, current, onChange) {
  const state = useRef({ ids, current, onChange });
  state.current = { ids, current, onChange };

  useEffect(() => {
    const el = ref.current;
    if (!el || !(ids?.length > 1)) return;
    let g = null; // active gesture

    const reset = (animate) => {
      el.style.transition = animate ? "transform 220ms cubic-bezier(.2,.8,.2,1), opacity 220ms" : "";
      el.style.transform = animate ? "translateX(0)" : "";
      el.style.opacity = animate ? "1" : "";
      if (animate) setTimeout(() => ((el.style.transition = ""), (el.style.transform = ""), (el.style.opacity = "")), 240);
    };

    const start = (e) => {
      if (e.touches.length !== 1 || document.querySelector('[role="dialog"]')) return (g = null);
      const t = e.touches[0];
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return (g = null);
      if (e.target.closest?.(IGNORE)) return (g = null);
      g = { x: t.clientX, y: t.clientY, t: performance.now(), dx: 0, dir: null, scrollers: sideScrollers(e.target, el) };
    };

    const move = (e) => {
      if (!g) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      if (!g.dir) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        g.dir = Math.abs(dx) > Math.abs(dy) * 1.3 ? "x" : "y";
        if (g.dir === "y" || g.scrollers.some((n) => canScroll(n, dx))) return (g = null);
        el.style.transition = "";
        el.style.willChange = "transform";
      }
      e.preventDefault(); // we own this horizontal drag; stop the page scrolling meanwhile
      const { ids: list, current: cur } = state.current;
      const i = list.indexOf(cur);
      const atEdge = (dx > 0 && i <= 0) || (dx < 0 && i >= list.length - 1);
      g.dx = atEdge ? dx / 3 : dx; // rubber-band at the first / last tab
      el.style.transform = `translateX(${g.dx}px)`;
      el.style.opacity = String(1 - Math.min(0.35, Math.abs(g.dx) / window.innerWidth / 1.5));
    };

    const end = () => {
      if (!g || g.dir !== "x") return (g = null);
      const { ids: list, current: cur, onChange: go } = state.current;
      const i = list.indexOf(cur);
      const w = window.innerWidth;
      const speed = Math.abs(g.dx) / Math.max(1, performance.now() - g.t);
      const dirn = g.dx < 0 ? 1 : -1; // swipe left → next tab
      const next = list[i + dirn];
      const far = Math.abs(g.dx) > w * 0.25 || (speed > 0.5 && Math.abs(g.dx) > 40);
      el.style.willChange = "";
      g = null;
      if (!next || !far) return reset(true);
      // Slide out, switch, slide the new tab in from the other side.
      el.style.transition = "transform 160ms ease-in, opacity 160ms";
      el.style.transform = `translateX(${-dirn * w}px)`;
      el.style.opacity = "0.2";
      setTimeout(() => {
        go(next);
        el.style.transition = "";
        el.style.transform = `translateX(${dirn * w * 0.35}px)`;
        el.style.opacity = "0.3";
        requestAnimationFrame(() => requestAnimationFrame(() => reset(true)));
      }, 160);
    };

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      reset(false);
    };
  }, [ref, ids?.length]); // eslint-disable-line react-hooks/exhaustive-deps
}
