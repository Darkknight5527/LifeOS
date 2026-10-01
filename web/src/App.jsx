import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
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

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));

  useEffect(() => {
    setAuthed(Boolean(getToken()));
  }, []);

  if (!authed) {
    return <LoginPage onLoggedIn={() => setAuthed(true)} />;
  }

  function handleLogout() {
    setToken(null);
    setAuthed(false);
  }

  return (
    <ToastProvider>
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 p-4 dark:border-slate-800">
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
      </aside>

      <main className="flex-1 p-8">
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
    </ToastProvider>
  );
}
