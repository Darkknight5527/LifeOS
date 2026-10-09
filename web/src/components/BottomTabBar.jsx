// Phone / tablet bottom bar shared by every domain: a "Domains" button on the
// left (opens the domain switcher) and the domain's own tabs after it.
import { Icon } from "../pages/finances/fin-ui.jsx";
import { useAppMenu } from "./AppMenu.jsx";
import { haptic } from "../lib/inApp.js";

export default function BottomTabBar({ tabs, tab, onTab }) {
  const { openDomains } = useAppMenu();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-fin-line bg-[#0e0e11]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Sections">
      <div className="mx-auto flex max-w-[880px]">
        <button
          onClick={() => {
            haptic("light");
            openDomains();
          }}
          className="relative flex w-[64px] shrink-0 flex-col items-center gap-1 py-3 text-[12px] font-semibold text-fin-muted transition hover:text-white active:scale-95 sm:text-[13px]"
          aria-label="Switch domain"
        >
          <Icon name="grid" size={24} stroke={1.7} />
          Domains
          <span className="absolute right-0 top-1/2 h-7 w-px -translate-y-1/2 bg-white/10" />
        </button>
        {(tabs || []).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (!active) haptic("light");
                onTab(t.id);
              }}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-[12px] font-semibold transition sm:text-[13px] ${active ? "text-fin-accent" : "text-fin-muted hover:text-white"}`}
              aria-current={active ? "page" : undefined}
            >
              <span className={`absolute top-0 h-[3px] w-8 rounded-b-full bg-fin-accent transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
              <Icon name={t.icon} size={24} stroke={active ? 2.1 : 1.7} />
              <span className="max-w-full truncate px-0.5">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Home has no tabs: a floating "Domains" pill at the bottom instead.
export function DomainsFab() {
  const { openDomains } = useAppMenu();
  return (
    <button
      onClick={() => {
        haptic("light");
        openDomains();
      }}
      className="fixed bottom-[max(20px,calc(env(safe-area-inset-bottom)+12px))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#141418]/90 px-5 py-3 font-fin text-[15px] font-semibold text-white shadow-2xl backdrop-blur-xl transition active:scale-95 lg:hidden"
    >
      <Icon name="grid" size={20} stroke={2} /> Domains
    </button>
  );
}
