import { useCallback, useEffect, useState } from "react";
import { FinanceProvider, useFinance } from "./finances/FinanceContext.jsx";
import { monthLabel } from "./finances/lib";
import { Icon, LogoMark, PrimaryButton } from "./finances/fin-ui.jsx";
import HomeTab from "./finances/HomeTab.jsx";
import ExpensesTab from "./finances/ExpensesTab.jsx";
import InsightsTab from "./finances/InsightsTab.jsx";
import WealthTab from "./finances/WealthTab.jsx";
import SettingsTab from "./finances/SettingsTab.jsx";
import LogExpenseSheet from "./finances/LogExpenseSheet.jsx";
import { MenuButton } from "../components/AppMenu.jsx";
import { IS_RELOAD } from "../lib/navigation.js";

const TAB_KEY = "lifeos_fin_tab";
let restoredAfterReload = false;

// Home when you come into Finances; after a refresh, the sub-tab you were on.
function initialTab() {
  if (IS_RELOAD && !restoredAfterReload) {
    restoredAfterReload = true;
    try {
      const saved = sessionStorage.getItem(TAB_KEY);
      if (saved && TABS.some((t) => t.id === saved)) return saved;
    } catch {
      /* storage unavailable */
    }
  }
  return "home";
}

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "expenses", label: "Expenses", icon: "receipt" },
  { id: "insights", label: "Insights", icon: "chart" },
  { id: "wealth", label: "Wealth", icon: "wallet" },
  { id: "settings", label: "Settings", icon: "gear" },
];

export default function FinancesPage() {
  return (
    <FinanceProvider>
      <FinanceShell />
    </FinanceProvider>
  );
}

function FinanceShell() {
  const { loading, syncing, error, reload, currentMonth, settings } = useFinance();
  const hasData = Boolean(settings);
  const [tab, setTab] = useState(initialTab);

  // Remember the sub-tab for this browser tab, so a refresh can restore it.
  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_KEY, tab);
    } catch {
      /* storage unavailable */
    }
  }, [tab]);
  const [expenseFilter, setExpenseFilter] = useState({ bucket: "all", n: 0 });
  const [sheet, setSheet] = useState({ open: false, editing: null });

  const goTo = useCallback((id, opts = {}) => {
    setTab(id);
    if (id === "expenses") setExpenseFilter((f) => ({ bucket: opts.bucket || "all", n: f.n + 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openNew = useCallback(() => setSheet({ open: true, editing: null }), []);
  const openEdit = useCallback((tx) => setSheet({ open: true, editing: tx }), []);
  const close = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);

  // "N" anywhere (outside a text field) opens the log sheet.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.closest?.("input, textarea, select, [contenteditable]") || sheet.open) return;
      e.preventDefault();
      openNew();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew, sheet.open]);

  return (
    <div className="fin-scope min-h-screen bg-fin-bg font-fin text-white antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-fin-line bg-fin-bg/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 py-4 sm:px-5 lg:py-2.5">
          <MenuButton className="-ml-2 text-white/70 hover:bg-white/5 hover:text-white" />
          <LogoMark size={40} />
          <div className="min-w-0">
            <div className="text-[22px] font-extrabold leading-tight tracking-tight lg:text-[20px]">Finances</div>
            <div className="truncate text-[14px] text-fin-muted">{monthLabel(currentMonth)} · week starts Monday</div>
          </div>
          <SyncStatus syncing={syncing && hasData} failed={Boolean(error) && hasData} onRetry={reload} />
          {/* Tabs live in the header on computers; phones use the bottom bar */}
          <nav className="mx-auto hidden items-center gap-1 rounded-2xl bg-[#141418] p-1 lg:flex" aria-label="Finance sections">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => goTo(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold transition ${
                    active ? "bg-fin-tile text-fin-accent shadow" : "text-fin-muted hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon name={t.icon} size={18} stroke={active ? 2.1 : 1.8} />
                  {t.label}
                </button>
              );
            })}
          </nav>
          <PrimaryButton onClick={openNew} className="ml-auto hidden items-center gap-2 !rounded-xl !py-2.5 !text-[15px] md:flex lg:ml-0">
            <Icon name="plus" size={18} stroke={2.6} /> Log expense
            <kbd className="ml-1 rounded-md bg-black/20 px-1.5 text-[11px] font-semibold">N</kbd>
          </PrimaryButton>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-4 pb-36 pt-5 sm:px-6 lg:max-w-[1320px] lg:pb-4 lg:pt-3">
        {loading ? (
          <LoadingState />
        ) : error && !hasData ? (
          <div className="mt-10 rounded-[28px] bg-fin-card p-8 text-center">
            <div className="text-[18px] font-bold">Couldn't load your finances</div>
            <div className="mt-2 text-[15px] text-fin-muted">{error}</div>
            <PrimaryButton className="mt-5" onClick={reload}>Try again</PrimaryButton>
          </div>
        ) : (
          <div key={tab}>
            {tab === "home" && <HomeTab onEdit={openEdit} onGoTo={goTo} />}
            {tab === "expenses" && <ExpensesTab key={expenseFilter.n} onEdit={openEdit} initialBucket={expenseFilter.bucket} />}
            {tab === "insights" && <InsightsTab />}
            {tab === "wealth" && <WealthTab />}
            {tab === "settings" && <SettingsTab />}
          </div>
        )}
      </main>

      {/* Floating add button */}
      {!loading && !error && (
        <button
          onClick={openNew}
          aria-label="Log expense"
          className="fixed bottom-[96px] right-5 z-40 grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] text-white shadow-glow transition hover:scale-105 active:scale-95 md:bottom-[104px] md:right-8 lg:hidden"
        >
          <Icon name="plus" size={30} stroke={2.4} />
        </button>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-fin-line bg-[#0e0e11]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[880px]">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => goTo(t.id)}
                className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[12px] font-semibold transition sm:text-[13px] ${active ? "text-fin-accent" : "text-fin-muted hover:text-white"}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={`absolute top-0 h-[3px] w-8 rounded-b-full bg-fin-accent transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
                <Icon name={t.icon} size={24} stroke={active ? 2.1 : 1.7} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <LogExpenseSheet open={sheet.open} editing={sheet.editing} onClose={close} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      {[180, 150, 220].map((h, i) => (
        <div key={i} className="animate-pulse rounded-[28px] bg-fin-card" style={{ height: h, animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

// Small pill in the header: "Syncing…" while fresh data loads in the
// background, or a retry button if the server couldn't be reached.
function SyncStatus({ syncing, failed, onRetry }) {
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
