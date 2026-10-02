import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../api";
import { useToast } from "../../../components/Toast.jsx";
import { DEFAULT_STEPS, doneOf, newKey } from "./lib";

const STEPS = "skincare-steps";
const LOGS = "skin-logs";
export const SKIN_CACHE_KEY = "lifeos_skin_cache_v1";

const SkinContext = createContext(null);
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

function readCache() {
  try {
    const d = JSON.parse(localStorage.getItem(SKIN_CACHE_KEY) || "null");
    return d && Array.isArray(d.steps) && Array.isArray(d.logs) ? d : null;
  } catch {
    return null;
  }
}
function writeCache(steps, logs) {
  try {
    localStorage.setItem(SKIN_CACHE_KEY, JSON.stringify({ steps, logs, savedAt: Date.now() }));
  } catch {
    /* not critical */
  }
}

// If an older day has two entries, the most recently edited one wins.
function indexByDate(logs) {
  const map = {};
  for (const l of logs) {
    const cur = map[l.date];
    if (!cur || (l.updatedAt || l.createdAt || 0) > (cur.updatedAt || cur.createdAt || 0)) map[l.date] = l;
  }
  return map;
}

export function SkinProvider({ children }) {
  const showToast = useToast();
  const cached = useMemo(readCache, []);
  const [steps, setSteps] = useState(cached?.steps || []);
  const [logs, setLogs] = useState(cached?.logs || []);
  const [status, setStatus] = useState({ loading: !cached, syncing: true, error: null });
  const logsRef = useRef(logs);
  logsRef.current = logs;
  const queues = useRef({}); // date -> promise chain, so rapid taps save in order
  const createdIds = useRef({}); // date -> id of an entry created this session
  const booted = useRef(false);

  const load = useCallback(async () => {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      let [stepList, logList] = await Promise.all([api.list(STEPS), api.list(LOGS)]);
      if (stepList.length === 0) {
        stepList = [];
        for (const [i, s] of DEFAULT_STEPS.entries()) stepList.push(await api.create(STEPS, { ...s, order: i }));
      }
      setSteps([...stepList].sort(byOrder));
      setLogs(logList);
      setStatus({ loading: false, syncing: false, error: null });
    } catch (err) {
      setStatus({ loading: false, syncing: false, error: err.message || "Failed to load" });
    }
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    load();
  }, [load]);

  useEffect(() => {
    if (!status.syncing && !status.error && steps.length) writeCache(steps, logs);
  }, [steps, logs, status.syncing, status.error]);

  const byDate = useMemo(() => indexByDate(logs), [logs]);

  // ---------- day log (one per date, saved in order) ----------
  const saveDay = useCallback(
    (date, patch) => {
      // Optimistic: the screen updates at once; the server catches up in order.
      setLogs((l) => {
        const cur = indexByDate(l)[date];
        const next = { ...(cur || { _id: `tmp-${date}`, date, createdAt: Date.now() }), ...patch, updatedAt: Date.now() };
        return [...l.filter((x) => x !== cur), next];
      });

      const run = async () => {
        const cur = indexByDate(logsRef.current)[date];
        const realId = createdIds.current[date] || (cur && !String(cur._id).startsWith("tmp-") ? cur._id : null);
        try {
          const doc = realId ? await api.update(LOGS, realId, patch) : await api.create(LOGS, { date, ...patch });
          createdIds.current[date] = doc._id;
          // Swap the temporary id for the real one; keep any newer local ticks.
          if (!realId) setLogs((l) => l.map((x) => (x._id === `tmp-${date}` ? { ...x, _id: doc._id } : x)));
        } catch (err) {
          showToast(err.message || "Couldn't save — refreshing", true);
          load();
        }
      };
      queues.current[date] = (queues.current[date] || Promise.resolve()).then(run);
      return queues.current[date];
    },
    [showToast, load]
  );

  const toggleStep = useCallback(
    (date, key) => {
      const done = new Set(doneOf(indexByDate(logsRef.current)[date]));
      done.has(key) ? done.delete(key) : done.add(key);
      return saveDay(date, { doneSteps: [...done] });
    },
    [saveDay]
  );

  const setSteps_ = useCallback(
    (date, keys, on) => {
      const done = new Set(doneOf(indexByDate(logsRef.current)[date]));
      keys.forEach((k) => (on ? done.add(k) : done.delete(k)));
      return saveDay(date, { doneSteps: [...done] });
    },
    [saveDay]
  );

  // ---------- routine steps ----------
  const addStep = useCallback(
    async (data) => {
      try {
        const order = Math.max(0, ...steps.map((s) => s.order ?? 0)) + 1;
        const doc = await api.create(STEPS, { key: newKey(), ...data, order });
        setSteps((l) => [...l, doc].sort(byOrder));
        showToast("Step added");
        return doc;
      } catch (err) {
        showToast(err.message || "Couldn't add", true);
        return null;
      }
    },
    [steps, showToast]
  );

  const updateStep = useCallback(
    async (step, data, msg = "Saved") => {
      try {
        const doc = await api.update(STEPS, step._id, data);
        setSteps((l) => l.map((s) => (s._id === doc._id ? doc : s)).sort(byOrder));
        if (msg) showToast(msg);
        return doc;
      } catch (err) {
        showToast(err.message || "Couldn't save", true);
        return null;
      }
    },
    [showToast]
  );

  const removeStep = useCallback(
    async (step) => {
      try {
        await api.remove(STEPS, step._id);
        setSteps((l) => l.filter((s) => s._id !== step._id));
        const { _id, __v, ...rest } = step;
        showToast(`Removed ${step.name}`, false, {
          action: {
            label: "Undo",
            onClick: async () => {
              const doc = await api.create(STEPS, rest).catch(() => null);
              if (doc) setSteps((l) => [...l, doc].sort(byOrder));
            },
          },
        });
      } catch (err) {
        showToast(err.message || "Couldn't remove", true);
      }
    },
    [showToast]
  );

  // Swap a step with its neighbour in the same period.
  const moveStep = useCallback(
    async (step, dir) => {
      const list = steps.filter((s) => s.period === step.period).sort(byOrder);
      const i = list.findIndex((s) => s._id === step._id);
      const other = list[i + dir];
      if (!other) return;
      const a = step.order ?? i;
      const b = other.order ?? i + dir;
      const [oa, ob] = a === b ? [b + dir, a] : [b, a];
      setSteps((l) => l.map((s) => (s._id === step._id ? { ...s, order: oa } : s._id === other._id ? { ...s, order: ob } : s)).sort(byOrder));
      try {
        await Promise.all([api.update(STEPS, step._id, { order: oa }), api.update(STEPS, other._id, { order: ob })]);
      } catch (err) {
        showToast(err.message || "Couldn't reorder", true);
        load();
      }
    },
    [steps, showToast, load]
  );

  const value = {
    ...status,
    hasData: steps.length > 0,
    steps,
    logs,
    byDate,
    reload: load,
    saveDay,
    toggleStep,
    setStepsDone: setSteps_,
    addStep,
    updateStep,
    removeStep,
    moveStep,
  };
  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error("useSkin must be used inside SkinProvider");
  return ctx;
}
