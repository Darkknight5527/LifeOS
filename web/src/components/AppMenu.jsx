import { createContext, useContext } from "react";

export const MenuContext = createContext({ openMenu: () => {} });
export const useAppMenu = () => useContext(MenuContext);

// Hamburger button that opens the slide-in navigation.
export function MenuButton({ className = "" }) {
  const { openMenu } = useAppMenu();
  return (
    <button
      onClick={openMenu}
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
