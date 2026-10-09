import { createContext, useContext } from "react";

export const MenuContext = createContext({ openMenu: () => {}, hoverOpen: () => {}, openDomains: () => {} });
export const useAppMenu = () => useContext(MenuContext);

// Touch screens (phone, the Android app) use the bottom domain switcher;
// laptops keep the slide-in side menu.
const isTouch = () => typeof window !== "undefined" && !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

// Hamburger button: opens the slide-in navigation on hover (mouse/trackpad)
// or the domain switcher on tap (phones).
export function MenuButton({ className = "" }) {
  const { openMenu, hoverOpen, openDomains } = useAppMenu();
  return (
    <button
      onClick={() => (isTouch() ? openDomains() : openMenu())}
      onMouseEnter={hoverOpen}
      aria-label="Open menu"
      title="Menu"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition active:scale-95 ${className}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}
