// Tech & Learning data: projects, build log, work/study sessions, skills,
// courses, learning path, notes, flashcards, resources and settings.
// Loads instantly from a browser copy, saves in the background.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../components/Toast.jsx";
import { todayISO } from "./lib";

const C = {
  projects: "tech-projects",
  logs: "tech-logs",
  sessions: "tech-sessions",
  skills: "tech-skills",
  courses: "tech-courses",
  topics: "tech-topics",
  notes: "tech-notes",
  cards: "tech-cards",
  resources: "tech-resources",
  settings: "tech-settings",
};
const KEYS = Object.keys(C);
const CACHE = "lifeos_tech_cache_v1";
const TIMER = "lifeos_tech_timer";
const Ctx = createContext(null);
export const useTech = () => useContext(Ctx);

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "null");
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* not critical */
  }
};
const empty = () => Object.fromEntries(KEYS.map((k) => [k, []]));

export function TechProvider({ children }) {
  const toast = useToast();
  const cached = useMemo(() => read(CACHE), []);
  const [d, setD] = useState(() => ({ ...empty(), ...(cached || {}) }));
  const [status, setStatus] = useState({ loading: !cached, syncing: true, error: null });
  const [timer, setTimerState] = useState(read(TIMER));
  const ref = useRef(d);
  ref.current = d;

  const load = useCallback(async () => {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const lists = await Promise.all(KEYS.map((k) => api.list(C[k])));
      const next = Object.fromEntries(KEYS.map((k, i) => [k, lists[i]]));
      setD(next);
      setStatus({ loading: false, syncing: false, error: null });
    } catch (err) {
      setStatus({ loading: false, syncing: false, error: err.message || "Couldn't load" });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!status.syncing && !status.error) write(CACHE, { ...d, savedAt: Date.now() });
  }, [d, status.syncing, status.error]);

  // ---------- generic saving (instant on screen, then the server) ----------
  const create = useCallback(
    async (key, data, msg) => {
      const tmp = { _id: `tmp-${Math.random().toString(36).slice(2)}`, createdAt: Date.now(), updatedAt: Date.now(), ...data };
      setD((x) => ({ ...x, [key]: [tmp, ...x[key]] }));
      try {
        const doc = await api.create(C[key], data);
        setD((x) => ({ ...x, [key]: x[key].map((i) => (i._id === tmp._id ? doc : i)) }));
        if (msg) toast(msg);
        return doc;
      } catch (err) {
        setD((x) => ({ ...x, [key]: x[key].filter((i) => i._id !== tmp._id) }));
        toast(err.message || "Couldn't save", true);
        return null;
      }
    },
    [toast]
  );
  const patch = useCallback(
    async (key, item, data, msg) => {
      const id = typeof item === "string" ? item : item._id;
      setD((x) => ({ ...x, [key]: x[key].map((i) => (i._id === id ? { ...i, ...data, updatedAt: Date.now() } : i)) }));
      if (String(id).startsWith("tmp-")) return null;
      try {
        const doc = await api.update(C[key], id, data);
        if (msg) toast(msg);
        return doc;
      } catch (err) {
        toast(err.message || "Couldn't save — refreshing", true);
        load();
        return null;
      }
    },
    [toast, load]
  );
  const remove = useCallback(
    async (key, item, label = "Deleted") => {
      setD((x) => ({ ...x, [key]: x[key].filter((i) => i._id !== item._id) }));
      try {
        await api.remove(C[key], item._id);
        const { _id, __v, userId, ...rest } = item; // eslint-disable-line no-unused-vars
        toast(label, false, {
          action: {
            label: "Undo",
            onClick: async () => {
              const doc = await api.create(C[key], rest).catch(() => null);
              if (doc) setD((x) => ({ ...x, [key]: [doc, ...x[key]] }));
            },
          },
        });
      } catch (err) {
        toast(err.message || "Couldn't delete", true);
        load();
      }
    },
    [toast, load]
  );

  // ---------- settings (one document) ----------
  const settings = useMemo(() => [...d.settings].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null, [d.settings]);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const saveSettings = useCallback(
    async (data, msg) => {
      const cur = ref.current.settings.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
      setSettingsSaving(true);
      try {
        return cur ? await patch("settings", cur, data, msg) : await create("settings", data, msg);
      } finally {
        setSettingsSaving(false);
      }
    },
    [patch, create]
  );

  // ---------- one timer for building or studying (survives closing the app) ----------
  const setTimer = (t) => {
    write(TIMER, t);
    setTimerState(t);
  };
  const startTimer = useCallback((t) => {
    const cur = read(TIMER);
    if (cur) return false;
    setTimer({ ...t, start: Date.now() });
    return true;
  }, []);
  const stopTimer = useCallback(
    async (note = "") => {
      const t = read(TIMER);
      setTimer(null);
      if (!t) return null;
      let minutes = Math.round((Date.now() - t.start) / 60000);
      if (minutes < 1) {
        toast("Less than a minute — not saved");
        return null;
      }
      if (minutes > 600) {
        minutes = 600;
        toast("Timer ran over 10 hours — saved as 10 h. Edit it if that's wrong.");
      }
      return create("sessions", { date: todayISO(), kind: t.kind, projectId: t.projectId || "", courseId: t.courseId || "", skillId: t.skillId || "", minutes, note }, `${minutes} min saved`);
    },
    [create, toast]
  );
  const cancelTimer = useCallback(() => setTimer(null), []);

  // ---------- handy lookups ----------
  const derived = useMemo(() => {
    const byId = (list) => Object.fromEntries(list.map((x) => [x._id, x]));
    const sum = (field) => {
      const m = {};
      for (const s of d.sessions) if (s[field]) m[s[field]] = (m[s[field]] || 0) + (s.minutes || 0);
      return m;
    };
    // Study minutes count for a course's skills too.
    const course = byId(d.courses);
    const skillMin = sum("skillId");
    for (const s of d.sessions) {
      if (s.skillId || !s.courseId) continue;
      for (const sk of course[s.courseId]?.skills || []) skillMin[sk] = (skillMin[sk] || 0) + (s.minutes || 0);
    }
    return {
      project: byId(d.projects),
      skill: byId(d.skills),
      course,
      projectMin: sum("projectId"),
      courseMin: sum("courseId"),
      skillMin,
    };
  }, [d.sessions, d.projects, d.skills, d.courses]);

  const value = {
    ...status,
    hasData: !status.loading,
    reload: load,
    ...d,
    ...derived,
    settings,
    saveSettings,
    settingsSaving,
    create,
    patch,
    remove,
    timer,
    startTimer,
    stopTimer,
    cancelTimer,
    today: todayISO(),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
