// Dark page frame shared by the redesigned domains (same look as Finances):
// header with menu + logo + tabs, phone bottom bar, sync status pill.
// Each domain passes its own colour theme class (e.g. "theme-teal").
import { useEffect, useRef } from "react";
import { useSwipeTabs } from "./useSwipeTabs.js";
import { MenuButton } from "./AppMenu.jsx";
import BottomTabBar, { DomainsFab } from "./BottomTabBar.jsx";
import { Icon, LogoMark, PrimaryButton, ThemeContext } from "../pages/finances/fin-ui.jsx";

export default function DomainShell({
  theme = "",
  title,
  subtitle,
  logoIcon,
  tabs,
  tab,
  onTab,
  action, // { label, icon, onClick, shortcut }
  syncing = false,
  failed = false,
  onRetry,
  maxWidth = "lg:max-w-[1320px]",
  views, // { [tabId]: [{ value, label }] } — shown when a tab is held on a phone
  currentViews, // { [tabId]: value }
  onView, // (tabId, value) => void
  children,
}) {
  // ← → switch tabs, like Finances (ignored while typing or in a popup).
  useEffect(() => {
    if (!(tabs?.length > 1)) return;
    const onKey = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // Shift+←/→ = views
      if (e.target.closest?.('input, textarea, select, [contenteditable], [role="slider"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      const i = Math.max(0, tabs.findIndex((t) => t.id === tab));
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      onTab(next.id);
      requestAnimationFrame(() => {
        if (document.activeElement?.dataset?.shellTab) document.querySelector(`[data-shell-tab="${next.id}"]`)?.focus();
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabs, tab, onTab]);

  // Swipe left / right on a phone to move between tabs.
  const mainRef = useRef(null);
  useSwipeTabs(mainRef, tabs?.map((t) => t.id), tab, onTab);

  return (
    <div className={`fin-scope ${theme} min-h-screen overflow-x-clip bg-fin-bg font-fin text-white antialiased`}>
      <header className="sticky top-0 z-30 border-b border-fin-line bg-fin-bg/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 py-4 sm:px-5 lg:py-2.5">
          <MenuButton className="-ml-2 text-white/70 hover:bg-white/5 hover:text-white" />
          <LogoMark size={40} icon={logoIcon} />
          <div className="min-w-0">
            <div className="text-[22px] font-extrabold leading-tight tracking-tight lg:text-[20px]">{title}</div>
            {subtitle && <div className="truncate text-[14px] text-fin-muted">{subtitle}</div>}
          </div>
          <SyncStatus syncing={syncing} failed={failed} onRetry={onRetry} />

          {tabs?.length > 1 && (
            <nav className="mx-auto hidden items-center gap-1 rounded-2xl bg-[#141418] p-1 lg:flex" aria-label={`${title} sections (← → tabs · 1–9 or Shift + ← → views)`} role="tablist">
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    data-shell-tab={t.id}
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    title={`${t.label} (← → to switch tabs)`}
                    onClick={() => onTab(t.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-fin-accent ${
                      active ? "bg-fin-tile text-fin-accent shadow" : "text-fin-muted hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon name={t.icon} size={18} stroke={active ? 2.1 : 1.8} />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          )}

          {action ? (
            <PrimaryButton onClick={action.onClick} className={`ml-auto hidden items-center gap-2 !rounded-xl !py-2.5 !text-[15px] md:flex ${tabs?.length > 1 ? "lg:ml-0" : ""}`}>
              <Icon name={action.icon || "plus"} size={18} stroke={2.6} /> {action.label}
              {action.shortcut && <kbd className="ml-1 rounded-md bg-black/20 px-1.5 text-[11px] font-semibold">{action.shortcut}</kbd>}
            </PrimaryButton>
          ) : (
            <div className="hidden w-[120px] lg:block" />
          )}
        </div>
      </header>

      <main ref={mainRef} className={`mx-auto max-w-[880px] px-4 pb-36 pt-5 sm:px-6 lg:pb-4 lg:pt-3 ${maxWidth}`}>
        <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
      </main>

      {/* Phone / tablet bottom bar: domain switcher + this domain's tabs */}
      {tabs?.length > 1 ? <BottomTabBar tabs={tabs} tab={tab} onTab={onTab} views={views} currentViews={currentViews} onView={onView} /> : <DomainsFab />}
    </div>
  );
}

export function SyncStatus({ syncing, failed, onRetry }) {
  if (syncing) {
    return (
      <span className="flex shrink-0 animate-fade-in items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[12px] font-semibold text-fin-muted" role="status">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-fin-accent/30 border-t-fin-accent" />
        <span className="hidden sm:inline">Syncing…</span>
      </span>
    );
  }
  if (failed) {
    return (
      <button
        onClick={onRetry}
        className="flex shrink-0 animate-fade-in items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[12px] font-semibold text-fin-danger hover:bg-red-500/20"
        title="Showing your last saved copy. Click to try again."
      >
        <span className="h-2 w-2 rounded-full bg-fin-danger" />
        <span className="hidden sm:inline">Offline · Retry</span>
        <span className="sm:hidden">Retry</span>
      </button>
    );
  }
  return null;
}
