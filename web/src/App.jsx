import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { getToken, setToken } from "./api";
import { ToastProvider } from "./components/Toast.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import PhysicalPage from "./pages/PhysicalPage.jsx";
import FinancesPage from "./pages/FinancesPage.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Overview", end: true },
  { to: "/mental", label: "Mental & Psych" },
  { to: "/physical", label: "Physical" },
  { to: "/finances", label: "Finances" },
  { to: "/goals", label: "Goals" },
  { to: "/technical", label: "Technical & Projects" },
  { to: "/learning", label: "Learning" },
];

// Pages that draw their own full-bleed dark layout.
const FULL_BLEED = ["/finances"];

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const fullBleed = FULL_BLEED.includes(location.pathname);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  if (!authed) {
    return <LoginPage onLoggedIn={() => setAuthed(true)} />;
  }

  function handleLogout() {
    setToken(null);
    setAuthed(false);
  }

  const nav = (
    <>
      <div className="mb-6 px-2 text-lg font-semibold">LifeOS</div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="mt-6 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Log out
      </button>
    </>
  );

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 md:block dark:border-slate-800">
          {nav}
        </aside>

        {/* Mobile menu drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-[80] md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-slate-50 p-4 shadow-xl">{nav}</aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <div
            className={`flex items-center gap-3 px-4 py-2.5 md:hidden ${
              fullBleed ? "bg-[#0b0b0d] text-white/80" : "border-b border-slate-200 bg-slate-50"
            }`}
          >
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 hover:bg-black/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <span className="text-sm font-semibold">LifeOS</span>
          </div>

          <main className={fullBleed ? "" : "p-4 md:p-8"}>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/mental" element={<PlaceholderPage title="Mental & Psych" />} />
              <Route path="/physical" element={<PhysicalPage />} />
              <Route path="/finances" element={<FinancesPage />} />
              <Route path="/goals" element={<PlaceholderPage title="Goals" />} />
              <Route path="/technical" element={<PlaceholderPage title="Technical & Projects" />} />
              <Route path="/learning" element={<PlaceholderPage title="Learning" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
