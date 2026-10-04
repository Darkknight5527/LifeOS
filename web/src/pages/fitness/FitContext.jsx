// All Fitness & Nutrition data: settings (programme, targets), workouts,
// cardio, daily food logs, custom foods and body logs. Instant load from a
// browser copy; saves optimistically and in order.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../components/Toast.jsx";
import { DEFAULT_SCHEDULE, computeTargets, defaultProgram } from "./lib";

export const FIT_CACHE_KEY = "lifeos_fit_cache_v1";
const C = { settings: "fit-settings", sessions: "workout-strength", cardio: "workout-cardio", food: "food-logs", custom: "custom-foods", body: "body-logs" };
const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0);
const FitContext = createContext(null);

function readCache() {
  try {
    const d = JSON.parse(localStorage.getItem(FIT_CACHE_KEY) || "null");
    return d?.settings ? d : null;
  } catch {
    return null;
  }
}
const latestByDate = (list) => {
  const m = {};
  for (const x of list) if (!m[x.date] || (x.updatedAt || x.createdAt || 0) > (m[x.date].updatedAt || m[x.date].createdAt || 0)) m[x.date] = x;
  return m;
};

export function FitProvider({ children }) {
  const showToast = useToast();
  const cached = useMemo(readCache, []);
  const [d, setD] = useState(() => cached || { settings: null, sessions: [], cardio: [], food: [], custom: [], body: [] });
  const [status, setStatus] = useState({ loading: !cached, syncing: true, error: null });
  const ref = useRef(d);
  ref.current = d;
  const queues = useRef({});
  const created = useRef({});
  const booted = useRef(false);

  const load = useCallback(async () => {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const [settingsList, sessions, cardio, food, custom, body] = await Promise.all([
        api.list(C.settings),
        api.list(C.sessions),
        api.list(C.cardio),
        api.list(C.food),
        api.list(C.custom),
        api.list(C.body),
      ]);
      let settings = settingsList[0];
      if (!settings) settings = await api.create(C.settings, { program: defaultProgram(), schedule: DEFAULT_SCHEDULE, restSec: 90, profile: {}, targets: {}, autoTargets: true });
      else {
        const fix = {};
        if (!settings.program || !Object.keys(settings.program).length) fix.program = defaultProgram();
        if (!Array.isArray(settings.schedule) || settings.schedule.length !== 7) fix.schedule = DEFAULT_SCHEDULE;
        if (Object.keys(fix).length) settings = await api.update(C.settings, settings._id, fix);
      }
      setD({ settings, sessions: sessions.sort(byDateDesc), cardio: cardio.sort(byDateDesc), food, custom, body });
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
    if (status.syncing || status.error || !d.settings) return;
    try {
      localStorage.setItem(FIT_CACHE_KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
    } catch {
      /* not critical */
    }
  }, [d, status.syncing, status.error]);

  const fail = useCallback(
    (err) => {
      showToast(err.message || "Couldn't save — refreshing", true);
      load();
    },
    [showToast, load]
  );

  // ---------- settings ----------
  const saveSettings = useCallback(
    async (patch, msg) => {
      setD((x) => ({ ...x, settings: { ...x.settings, ...patch } }));
      try {
        const doc = await api.update(C.settings, ref.current.settings._id, patch);
        setD((x) => ({ ...x, settings: doc }));
        if (msg) showToast(msg);
      } catch (err) {
        fail(err);
      }
    },
    [showToast, fail]
  );

  // ---------- import (FitNotes etc.): many workouts at once ----------
  const importData = useCallback(
    async ({ sessions = [], cardio = [], customs = [] }, onProgress) => {
      const made = { sessions: [], cardio: [] };
      const total = sessions.length + cardio.length || 1;
      try {
        for (const [key, items] of [["sessions", sessions], ["cardio", cardio]])
          for (let i = 0; i < items.length; i += 40) {
            const docs = await api.bulkCreate(C[key], items.slice(i, i + 40));
            made[key].push(...docs);
            onProgress?.((made.sessions.length + made.cardio.length) / total);
          }
        if (customs.length) {
          const have = ref.current.settings?.customExercises || [];
          const names = new Set(have.map((c) => c.exercise.toLowerCase()));
          const add = customs.filter((c) => !names.has(c.exercise.toLowerCase()));
          if (add.length) await saveSettings({ customExercises: [...have, ...add] });
        }
        return made;
      } finally {
        setD((x) => ({ ...x, sessions: [...made.sessions, ...x.sessions].sort(byDateDesc), cardio: [...made.cardio, ...x.cardio].sort(byDateDesc) }));
      }
    },
    [saveSettings]
  );

  // ---------- simple lists (sessions, cardio, custom foods) ----------
  const listOps = useCallback(
    (key, label) => ({
      add: async (data, msg = `${label} saved`) => {
        try {
          const doc = await api.create(C[key], data);
          setD((x) => ({ ...x, [key]: [doc, ...x[key]].sort(key === "custom" ? (a, b) => a.name.localeCompare(b.name) : byDateDesc) }));
          if (msg) showToast(msg);
          return doc;
        } catch (err) {
          showToast(err.message || "Couldn't save", true);
          return null;
        }
      },
      update: async (item, data, msg = "Saved") => {
        setD((x) => ({ ...x, [key]: x[key].map((i) => (i._id === item._id ? { ...i, ...data } : i)) }));
        try {
          const doc = await api.update(C[key], item._id, data);
          setD((x) => ({ ...x, [key]: x[key].map((i) => (i._id === doc._id ? doc : i)) }));
          if (msg) showToast(msg);
          return doc;
        } catch (err) {
          fail(err);
          return null;
        }
      },
      remove: async (item) => {
        setD((x) => ({ ...x, [key]: x[key].filter((i) => i._id !== item._id) }));
        try {
          await api.remove(C[key], item._id);
          const { _id, __v, ...rest } = item;
          showToast(`${label} deleted`, false, {
            action: {
              label: "Undo",
              onClick: async () => {
                const doc = await api.create(C[key], rest).catch(() => null);
                if (doc) setD((x) => ({ ...x, [key]: [doc, ...x[key]].sort(byDateDesc) }));
              },
            },
          });
        } catch (err) {
          fail(err);
        }
      },
    }),
    [showToast, fail]
  );
  const sessions = useMemo(() => listOps("sessions", "Workout"), [listOps]);
  const cardio = useMemo(() => listOps("cardio", "Cardio"), [listOps]);
  const custom = useMemo(() => listOps("custom", "Food"), [listOps]);
  const bodyOps = useMemo(() => listOps("body", "Weigh-in"), [listOps]);

  // ---------- one document per date (food logs, body logs) ----------
  const saveDay = useCallback(
    (key, date, patch) => {
      const k = `${key}|${date}`;
      const tmp = `tmp-${k}`;
      setD((x) => {
        const cur = latestByDate(x[key])[date];
        const next = { ...(cur || { _id: tmp, date, createdAt: Date.now() }), ...patch, updatedAt: Date.now() };
        return { ...x, [key]: [...x[key].filter((i) => i !== cur), next] };
      });
      const run = async () => {
        const cur = latestByDate(ref.current[key])[date];
        const realId = created.current[k] || (cur && !String(cur._id).startsWith("tmp-") ? cur._id : null);
        try {
          const doc = realId ? await api.update(C[key], realId, patch) : await api.create(C[key], { date, ...patch });
          created.current[k] = doc._id;
          if (!realId) setD((x) => ({ ...x, [key]: x[key].map((i) => (i._id === tmp ? { ...i, _id: doc._id } : i)) }));
        } catch (err) {
          fail(err);
        }
      };
      queues.current[k] = (queues.current[k] || Promise.resolve()).then(run);
      return queues.current[k];
    },
    [fail]
  );

  const foodByDate = useMemo(() => latestByDate(d.food), [d.food]);
  const bodyByDate = useMemo(() => latestByDate(d.body), [d.body]);
  const settings = d.settings;
  const auto = settings?.profile ? computeTargets(settings.profile) : null;
  const targets = settings?.autoTargets !== false && auto ? { ...auto } : { ...(auto || {}), ...(settings?.targets || {}) };

  const value = {
    ...status,
    hasData: Boolean(settings),
    reload: load,
    settings,
    targets,
    autoTargets: auto,
    saveSettings,
    sessions: d.sessions,
    cardio: d.cardio,
    custom: d.custom,
    body: d.body,
    foodByDate,
    bodyByDate,
    sessionOps: sessions,
    cardioOps: cardio,
    customOps: custom,
    saveFood: (date, patch) => saveDay("food", date, patch),
    saveBody: (date, patch) => saveDay("body", date, patch),
    removeBody: bodyOps.remove,
    importData,
  };
  return <FitContext.Provider value={value}>{children}</FitContext.Provider>;
}

export function useFit() {
  const ctx = useContext(FitContext);
  if (!ctx) throw new Error("useFit must be used inside FitProvider");
  return ctx;
}
