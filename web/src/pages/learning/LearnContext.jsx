// All Learning data: plan settings (start date, pauses), lesson progress,
// study sessions, weak topics, weekly quizzes and part checkpoints.
// Shows the browser copy instantly, then refreshes from the server.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../components/Toast.jsx";
import { DEFAULT_START, LESSONS } from "./plan.js";
import { addDays, buildSchedule, isDone, paceFinish, plannedBy, streak, todayISO } from "./schedule.js";

const CACHE = "lifeos_learn_cache_v1";
const C = { settings: "learn-settings", progress: "learn-progress", sessions: "learn-sessions", weak: "learn-weak", quizzes: "learn-quizzes", checkpoints: "learn-checkpoints" };
const EMPTY = { settings: [], progress: [], sessions: [], weak: [], quizzes: [], checkpoints: [] };
const Ctx = createContext(null);

function readCache() {
  try {
    const d = JSON.parse(localStorage.getItem(CACHE) || "null");
    return d && Array.isArray(d.progress) ? { ...EMPTY, ...d } : null;
  } catch {
    return null;
  }
}

export function LearnProvider({ children }) {
  const showToast = useToast();
  const cached = useMemo(readCache, []);
  const [d, setD] = useState(cached || EMPTY);
  const [status, setStatus] = useState({ loading: !cached, syncing: true, error: null });
  const ref = useRef(d);
  ref.current = d;
  // The date, refreshed every minute so the page rolls over at midnight.
  const [today, setToday] = useState(todayISO());
  useEffect(() => {
    const t = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setStatus((s) => ({ ...s, syncing: true }));
    try {
      const keys = Object.keys(C);
      const lists = await Promise.all(keys.map((k) => api.list(C[k])));
      const next = Object.fromEntries(keys.map((k, i) => [k, lists[i]]));
      setD(next);
      setStatus({ loading: false, syncing: false, error: null });
      try {
        localStorage.setItem(CACHE, JSON.stringify(next));
      } catch {
        /* not critical */
      }
    } catch (err) {
      setStatus({ loading: false, syncing: false, error: err.message || "Couldn't load" });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (status.loading || status.syncing) return;
    try {
      localStorage.setItem(CACHE, JSON.stringify(d));
    } catch {
      /* not critical */
    }
  }, [d, status.loading, status.syncing]);

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
        setD((x) => ({ ...x, [key]: [...x[key], doc] }));
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

  // One record per lesson / week / part: update it if it exists, else create it.
  // Saves for the same thing wait for each other, so a double tap can't create two.
  const chain = useRef(Promise.resolve());
  const upsert = useCallback(
    (key, match, patch, msg) => {
      const run = async () => {
        const cur = ref.current[key].find(match);
        return cur ? update(key, cur._id, patch, msg) : create(key, patch, msg);
      };
      chain.current = chain.current.then(run, run);
      return chain.current;
    },
    [create, update]
  );

  // ---------- derived ----------
  const settings = d.settings[0] || { startDate: DEFAULT_START, pauses: [] };
  const startDate = settings.startDate || DEFAULT_START;
  const pauses = useMemo(() => settings.pauses || [], [settings.pauses]);
  const progress = useMemo(() => Object.fromEntries(d.progress.map((p) => [p.lessonId, p])), [d.progress]);
  const schedule = useMemo(() => buildSchedule({ progress, startDate, pauses, today }), [progress, startDate, pauses, today]);
  const activeDays = useMemo(() => new Set([...d.sessions.filter((s) => s.minutes > 0).map((s) => s.date), ...d.progress.filter((p) => p.doneOn).map((p) => p.doneOn)]), [d.sessions, d.progress]);
  const stats = useMemo(() => {
    const done = LESSONS.filter((l) => isDone(progress[l.id]));
    const full = done.filter((l) => (progress[l.id].level || 0) >= 4);
    return {
      done: done.length,
      full: full.length,
      partial: done.length - full.length,
      planned: plannedBy({ startDate, pauses, today: addDays(today, -1) }), // due before today
      streak: streak({ activeDays, pauses, today, startDate }),
      pace: paceFinish({ progress, startDate, pauses, today, planFinish: schedule.finish }),
    };
  }, [progress, startDate, pauses, today, activeDays, schedule.finish]);

  // ---------- actions ----------
  const saveSettings = useCallback((patch, msg) => upsert("settings", () => true, { startDate, pauses, ...patch }, msg), [upsert, startDate, pauses]);
  const setLesson = useCallback((lessonId, patch, msg) => upsert("progress", (p) => p.lessonId === lessonId, { lessonId, ...patch }, msg), [upsert]);
  const clearLesson = useCallback(
    (lessonId) => {
      const cur = ref.current.progress.find((p) => p.lessonId === lessonId);
      if (cur) remove("progress", cur._id, "Lesson reset");
    },
    [remove]
  );
  const logMinutes = useCallback(
    (date, lessonId, minutes) => {
      if (!(minutes > 0)) return null;
      // Add to the session already logged for that lesson today, if any.
      return upsert("sessions", (s) => s.date === date && s.lessonId === lessonId, { date, lessonId, minutes: Math.min(600, Math.round(minutes + (ref.current.sessions.find((s) => s.date === date && s.lessonId === lessonId)?.minutes || 0))) });
    },
    [upsert]
  );

  const value = {
    ...d,
    ...status,
    today,
    reload: load,
    create,
    update,
    remove,
    upsert,
    settings,
    startDate,
    pauses,
    progress,
    schedule,
    stats,
    activeDays,
    saveSettings,
    setLesson,
    clearLesson,
    logMinutes,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLearn = () => useContext(Ctx);
