import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

const ToastContext = createContext(null);

/**
 * showToast(message, isError?, options?)
 *   options.action = { label, onClick } adds a button (e.g. "Undo")
 *   options.duration = ms the toast stays up (default 2200; 5000 with an action; 4500 for errors)
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const showToast = useCallback(
    (message, isError = false, options = {}) => {
      const id = Math.random().toString(36).slice(2);
      const action = options.action || null;
      // At most 3 at once; the oldest goes first.
      setToasts((t) => [...t.slice(-2), { id, message, isError, action }]);
      setTimeout(() => dismiss(id), options.duration ?? (action ? 5000 : isError ? 4500 : 2200));
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Drawn into <body> so toasts stay clickable while a popup has made the page inert. */}
      {createPortal(
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col items-center gap-2 md:bottom-28 lg:bottom-8" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.isError ? "alert" : "status"}
            className={`pointer-events-auto flex max-w-full animate-pop-in items-center gap-3 rounded-[20px] px-4 py-2 text-sm font-semibold shadow-lg ring-1 ring-white/10 ${
              t.isError ? "bg-red-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            }`}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-[rgb(var(--fin-accent))] hover:bg-white/25"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>,
      document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
