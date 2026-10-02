import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

/**
 * showToast(message, isError?, options?)
 *   options.action = { label, onClick } adds a button (e.g. "Undo")
 *   options.duration = ms the toast stays up (default 1800, 4500 with an action)
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const showToast = useCallback(
    (message, isError = false, options = {}) => {
      const id = Math.random().toString(36).slice(2);
      const action = options.action || null;
      setToasts((t) => [...t, { id, message, isError, action }]);
      setTimeout(() => dismiss(id), options.duration ?? (action ? 4500 : 1800));
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-28 lg:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex animate-pop-in items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ring-1 ring-white/10 ${
              t.isError ? "bg-red-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            }`}
          >
            <span className="whitespace-nowrap">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
                className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-orange-300 hover:bg-white/25"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
