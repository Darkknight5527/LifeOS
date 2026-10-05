// Keyboard shortcuts for a domain's second row of views (Today · History · …):
//   1–9            jump straight to that view
//   Shift + ← / →  previous / next view
// (← → alone switch tabs, ↑ ↓ switch domains.) Ignored while typing or in a popup.
import { useEffect, useRef } from "react";

export function useViewKeys(views, current, setView) {
  const ref = useRef({ views, current, setView });
  ref.current = { views, current, setView };
  useEffect(() => {
    const onKey = (e) => {
      const { views: list, current: cur, setView: go } = ref.current;
      if (!(list?.length > 1) || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable], [role="slider"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      const val = (v) => (typeof v === "string" ? v : v.value ?? v.id);
      if (!e.shiftKey && /^[1-9]$/.test(e.key)) {
        const v = list[Number(e.key) - 1];
        if (!v) return;
        e.preventDefault();
        go(val(v));
      } else if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const i = Math.max(0, list.findIndex((v) => val(v) === cur));
        go(val(list[(i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length]));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
