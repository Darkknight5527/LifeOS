import { useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getToken, setToken } from "./api";
import { ToastProvider } from "./components/Toast.jsx";
import { PdfReaderHost } from "./components/PdfReader.jsx";
import { HealthSyncHost } from "./components/HealthSync.jsx";
import { MenuContext, MenuButton } from "./components/AppMenu.jsx";
import { IS_RELOAD } from "./lib/navigation.js";
import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import GroomingPage from "./pages/GroomingPage.jsx";
import FitnessPage from "./pages/FitnessPage.jsx";
import FinancesPage from "./pages/FinancesPage.jsx";
import PaperPage from "./pages/PaperPage.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";

// ready: built pages that ↑ / ↓ cycles through (empty placeholders are skipped)
const NAV_ITEMS = [
  { to: "/", label: "North Star", end: true, ready: true },
  { to: "/paper", label: "Morning Paper", ready: true },
  { to: "/mental", label: "Mental & Psych" },
  { to: "/grooming", label: "Grooming", ready: true },
  { to: "/fitness", label: "Fitness & Nutrition", ready: true },
  { to: "/finances", label: "Finances", ready: true },
  { to: "/goals", label: "Goals" },
  { to: "/technical", label: "Technical & Projects" },
  { to: "/learning", label: "Learning" },
];
const READY = NAV_ITEMS.filter((n) => n.ready);

// Dark pages that draw their own full-screen layout and header
// (they put the menu button in their own header via useAppMenu()).
const DARK_PAGES = ["/", "/finances", "/grooming", "/paper", "/fitness"];

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef(null);
  // Only real mice/trackpads hover; on touch screens the menu opens by tap.
  const canHover = typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
  const location = useLocation();
  const navigate = useNavigate();
  const dark = DARK_PAGES.includes(location.pathname);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
  }, []);

  // Opening the site fresh (typed URL, bookmark, new tab) starts on North Star (home);
  // a refresh keeps you on the page you were on.
  useEffect(() => {
    if (!IS_RELOAD && window.location.pathname !== "/") navigate("/", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ↑ / ↓ move to the previous / next domain. Ignored while typing, in popups,
  // or when a control already uses the arrows (sliders etc.). On North Star the
  // arrows scroll the story; ↑ at the very top or ↓ at the very bottom (or
  // Shift+↑ / ↓ anywhere) switches domain.
  const [hint, setHint] = useState(null);
  const hintTimer = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (!getToken() || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable], [role="slider"], [role="listbox"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (location.pathname === "/" && !e.shiftKey) {
        const atTop = window.scrollY <= 2;
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (!(e.key === "ArrowUp" && atTop) && !(e.key === "ArrowDown" && atBottom)) return; // let it scroll
      }
      const i = Math.max(0, READY.findIndex((n) => n.to === location.pathname));
      const next = (i + (e.key === "ArrowDown" ? 1 : -1) + READY.length) % READY.length;
      e.preventDefault();
      navigate(READY[next].to);
      window.scrollTo({ top: 0 });
      setHint(next);
      clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setHint(null), 1300);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [location.pathname, navigate]);

  // Close the menu on navigation and with Escape.
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function cancelClose() {
    clearTimeout(closeTimer.current);
  }
  // Short delay so a quick wobble of the mouse past the edge doesn't snap it shut.
  function scheduleClose() {
    if (!canHover) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setMenuOpen(false), 280);
  }
  const menuApi = {
    openMenu: () => {
      cancelClose();
      setMenuOpen(true);
    },
    hoverOpen: () => {
      if (!canHover) return;
      cancelClose();
      setMenuOpen(true);
    },
  };

  if (!authed) {
    return (
      <LoginPage
        onLoggedIn={() => {
          setAuthed(true);
          navigate("/", { replace: true });
        }}
      />
    );
  }

  function handleLogout() {
    setToken(null);
    // Forget the browser copies of LifeOS data on this device.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("lifeos_") && k.endsWith("_cache_v1"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    setAuthed(false);
  }

  const navList = (isDark) => (
    <>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2.5 text-sm transition ${
                isDark
                  ? isActive
                    ? "bg-[#fb8a3c]/15 font-semibold text-[#fb8a3c]"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                  : isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className={`mt-6 w-full rounded-lg px-3 py-2 text-left text-sm ${isDark ? "text-white/45 hover:bg-white/5" : "text-slate-500 hover:bg-slate-100"}`}
      >
        Log out
      </button>
    </>
  );

  return (
    <ToastProvider>
      <MenuContext.Provider value={menuApi}>
        <DomainHint index={hint} />
        <PdfReaderHost />
        {authed && <HealthSyncHost />}
        <div className="flex min-h-screen">
          {/* Slide-in menu */}
          <div className={`fixed inset-0 z-[80] ${menuOpen ? "" : "pointer-events-none"}`} aria-hidden={!menuOpen}>
            <div
              className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"}`}
              onClick={() => setMenuOpen(false)}
            />
            <aside
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto p-4 shadow-2xl transition-transform duration-300 ease-out ${
                menuOpen ? "translate-x-0" : "-translate-x-full"
              } ${dark ? "border-r border-white/5 bg-[#141418] font-fin text-white" : "bg-slate-50"}`}
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <span className="text-lg font-semibold">LifeOS</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className={`grid h-9 w-9 place-items-center rounded-lg ${dark ? "text-white/60 hover:bg-white/5" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              {navList(dark)}
            </aside>
          </div>

          <div className="min-w-0 flex-1">
            {/* Light pages get a slim top bar with the menu button (dark pages draw their own) */}
            {!dark && (
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <MenuButton className="text-slate-700 hover:bg-slate-200" />
                <span className="text-sm font-semibold">LifeOS</span>
              </div>
            )}

            <main className={dark ? "" : "p-4 md:p-8"}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/mental" element={<PlaceholderPage title="Mental & Psych" />} />
                <Route path="/grooming" element={<GroomingPage />} />
                <Route path="/fitness" element={<FitnessPage />} />
                {/* old address from before the split */}
                <Route path="/physical" element={<Navigate to="/grooming" replace />} />
                <Route path="/finances" element={<FinancesPage />} />
                <Route path="/paper" element={<PaperPage />} />
                <Route path="/goals" element={<PlaceholderPage title="Goals" />} />
                <Route path="/technical" element={<PlaceholderPage title="Technical & Projects" />} />
                <Route path="/learning" element={<PlaceholderPage title="Learning" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </MenuContext.Provider>
    </ToastProvider>
  );
}

// Brief overlay while switching domains with ↑ / ↓.
function DomainHint({ index }) {
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed left-5 top-1/2 z-[90] -translate-y-1/2 transition-all duration-300 ${index == null ? "-translate-x-3 opacity-0" : "translate-x-0 opacity-100"}`}
    >
      <div className="rounded-2xl bg-[#0b0b0f]/95 p-2 font-fin shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
        {READY.map((n, i) => (
          <div
            key={n.to}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-[14px] font-semibold transition-colors ${i === index ? "bg-white/10 text-white" : "text-white/40"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-[#f2c14e]" : "bg-white/20"}`} />
            {n.label}
          </div>
        ))}
        <div className="mt-1 border-t border-white/10 px-3 pt-1.5 text-[11.5px] text-white/40">↑ ↓ to switch</div>
      </div>
      <span className="sr-only">{index != null ? READY[index].label : ""}</span>
    </div>
  );
}
