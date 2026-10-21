// Health data: medical issues, medicines (+ the daily dose log), visits,
// lab reports and regular check-ups. Loads once when the Health tab opens,
// shows the browser copy instantly, and saves straight to the server.
// None of this is ever sent to the AI.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../api";
import { useToast } from "../../../components/Toast.jsx";

const CACHE = "lifeos_health_cache_v1";
const C = { issues: "health-issues", meds: "medicines", logs: "med-logs", visits: "health-visits", reports: "lab-reports", plans: "health-plans" };
const EMPTY = { issues: [], meds: [], logs: [], visits: [], reports: [], plans: [] };
const Ctx = createContext(null);

function readCache() {
  try {
    const d = JSON.parse(localStorage.getItem(CACHE) || "null");
    return d && Array.isArray(d.meds) ? { ...EMPTY, ...d } : null;
  } catch {
    return null;
  }
}

export function HealthProvider({ children, active = true }) {
  const showToast = useToast();
  const cached = useMemo(readCache, []);
  const [d, setD] = useState(cached || EMPTY);
  const [status, setStatus] = useState({ loading: !cached, error: null });
  const ref = useRef(d);
  ref.current = d;

  const load = useCallback(async () => {
    try {
      const keys = Object.keys(C);
      const lists = await Promise.all(keys.map((k) => api.list(C[k])));
      const next = Object.fromEntries(keys.map((k, i) => [k, lists[i]]));
      setD(next);
      setStatus({ loading: false, error: null });
      try {
        localStorage.setItem(CACHE, JSON.stringify(next));
      } catch {
        /* not critical */
      }
    } catch (err) {
      setStatus({ loading: false, error: err.message || "Couldn't load" });
    }
  }, []);
  // Loads the first time the Health tab is opened (not with the rest of Fitness).
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    load();
  }, [active, load]);
  useEffect(() => {
    if (status.loading || !started.current) return;
    try {
      localStorage.setItem(CACHE, JSON.stringify(d));
    } catch {
      /* not critical */
    }
  }, [d, status.loading]);

  const fail = useCallback(
    (err) => {
      showToast(err.message || "Couldn't save — refreshing", true);
      load();
    },
    [showToast, load]
  );

  const create = useCallback(
    async (key, body, msg) => {
      try {
        const doc = await api.create(C[key], body);
        setD((x) => ({ ...x, [key]: [doc, ...x[key]] }));
        if (msg) showToast(msg);
        return doc;
      } catch (err) {
        fail(err);
        return null;
      }
    },
    [fail, showToast]
  );
  const update = useCallback(
    async (key, id, patch, msg) => {
      setD((x) => ({ ...x, [key]: x[key].map((i) => (i._id === id ? { ...i, ...patch } : i)) }));
      try {
        const doc = await api.update(C[key], id, patch);
        setD((x) => ({ ...x, [key]: x[key].map((i) => (i._id === id ? doc : i)) }));
        if (msg) showToast(msg);
        return doc;
      } catch (err) {
        fail(err);
        return null;
      }
    },
    [fail, showToast]
  );
  const remove = useCallback(
    async (key, id, msg) => {
      setD((x) => ({ ...x, [key]: x[key].filter((i) => i._id !== id) }));
      try {
        await api.remove(C[key], id);
        if (msg) showToast(msg);
      } catch (err) {
        fail(err);
      }
    },
    [fail, showToast]
  );

  // ---------- doses ----------
  // One log per day; ticks for the same day wait for each other so the log is only created once.
  const chain = useRef(Promise.resolve());
  const setDose = useCallback(
    (date, key, state, med) => {
      const run = async () => {
        const log = ref.current.logs.find((l) => l.date === date);
        const doses = { ...(log?.doses || {}) };
        const before = doses[key]?.status || "";
        if (state) doses[key] = { status: state, at: Date.now() };
        else delete doses[key];
        // Count the stock down (or back up) when a dose is ticked (or unticked).
        if (med && med.stock != null && (before === "taken") !== (state === "taken")) {
          const stock = Math.max(0, med.stock + (state === "taken" ? -1 : 1));
          const cur = ref.current.meds.find((m) => m._id === med._id);
          if (cur) update("meds", med._id, { stock });
        }
        if (log) {
          setD((x) => ({ ...x, logs: x.logs.map((l) => (l._id === log._id ? { ...l, doses } : l)) }));
          await api.update(C.logs, log._id, { doses });
        } else {
          const doc = await api.create(C.logs, { date, doses, extra: [] });
          setD((x) => ({ ...x, logs: [doc, ...x.logs] }));
        }
      };
      chain.current = chain.current.then(run).catch(fail);
      return chain.current;
    },
    [fail, update]
  );
  const takeExtra = useCallback(
    (date, med) => {
      const run = async () => {
        const log = ref.current.logs.find((l) => l.date === date);
        const extra = [...(log?.extra || []), { medId: med._id, at: Date.now() }];
        if (med.stock != null) update("meds", med._id, { stock: Math.max(0, med.stock - 1) });
        if (log) {
          setD((x) => ({ ...x, logs: x.logs.map((l) => (l._id === log._id ? { ...l, extra } : l)) }));
          await api.update(C.logs, log._id, { extra });
        } else {
          const doc = await api.create(C.logs, { date, doses: {}, extra });
          setD((x) => ({ ...x, logs: [doc, ...x.logs] }));
        }
        showToast(`${med.name} logged`);
      };
      chain.current = chain.current.then(run).catch(fail);
      return chain.current;
    },
    [fail, update, showToast]
  );

  // Remove one as-needed dose (by when it was logged); puts it back in stock.
  const dropExtra = useCallback(
    (date, med, at) => {
      const run = async () => {
        const log = ref.current.logs.find((l) => l.date === date);
        if (!log) return;
        const extra = (log.extra || []).filter((x) => !(x.medId === med._id && x.at === at));
        const cur = ref.current.meds.find((m) => m._id === med._id);
        if (cur?.stock != null) update("meds", med._id, { stock: cur.stock + 1 });
        setD((x) => ({ ...x, logs: x.logs.map((l) => (l._id === log._id ? { ...l, extra } : l)) }));
        await api.update(C.logs, log._id, { extra });
      };
      chain.current = chain.current.then(run).catch(fail);
      return chain.current;
    },
    [fail, update]
  );

  const value = { ...d, ...status, reload: load, create, update, remove, setDose, takeExtra, dropExtra };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useHealth = () => useContext(Ctx);

/** Shows `fallback` until the first load, and a retry box if it failed with nothing to show. */
export function HealthGate({ children, fallback }) {
  const h = useHealth();
  if (h.loading) return fallback;
  if (h.error && !h.meds.length && !h.issues.length && !h.reports.length && !h.visits.length) {
    return (
      <div className="mt-10 rounded-[28px] bg-fin-card p-8 text-center">
        <div className="text-[18px] font-bold">Couldn't load your health records</div>
        <div className="mt-2 text-[15px] text-fin-muted">{h.error}</div>
        <button onClick={h.reload} className="mt-5 rounded-2xl bg-fin-tile px-5 py-2.5 font-semibold">Try again</button>
      </div>
    );
  }
  return children;
}
