// Skills data: lesson log, word cards, hobbies and practice sessions.
// Changes show instantly and save in the background.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../../api";
import { useToast } from "../../../components/Toast.jsx";
import { addDays, isoDate, parseISO, todayISO } from "../../finances/lib";

const Ctx = createContext(null);
export const useSkills = () => useContext(Ctx);

// ---------- spaced repetition (a simple SM-2, like Anki) ----------
export const GRADES = [
  { g: 0, label: "Again", hint: "Forgot", color: "#f87171" },
  { g: 1, label: "Hard", hint: "Struggled", color: "#fb923c" },
  { g: 2, label: "Good", hint: "Got it", color: "#a78bfa" },
  { g: 3, label: "Easy", hint: "Instant", color: "#34d399" },
];
export const isDue = (c, today = todayISO()) => !c.due || c.due <= today;
export const isMastered = (c) => (c.interval || 0) >= 21;

/** What a card looks like after a review with grade 0–3. */
export function reviewed(c, g, today = todayISO()) {
  let { ease = 2.5, interval = 0, reps = 0, lapses = 0 } = c;
  if (g === 0) {
    lapses += 1;
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else if (g === 1) {
    interval = Math.max(1, Math.round(interval * 1.2));
    ease = Math.max(1.3, ease - 0.15);
    reps += 1;
  } else {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
    if (g === 3) {
      interval = Math.round(interval * 1.3) + (reps === 0 ? 2 : 0);
      ease = Math.min(3.5, ease + 0.15);
    }
    reps += 1;
  }
  interval = Math.min(interval, 365);
  return { ease: Math.round(ease * 100) / 100, interval, reps, lapses, due: isoDate(addDays(parseISO(today), interval)), lastReviewed: today };
}
/** "in 3 days" for the grade buttons. */
export const nextText = (c, g) => {
  const n = reviewed(c, g).interval;
  return n === 0 ? "again now" : n === 1 ? "tomorrow" : n < 30 ? `${n} days` : n < 365 ? `${Math.round(n / 30)} mo` : "1 year";
};

// ---------- practice timer (survives closing the app) ----------
const TIMER_KEY = "lifeos_hobby_timer";
const readTimer = () => {
  try {
    return JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
  } catch {
    return null;
  }
};

export function SkillsProvider({ children }) {
  const toast = useToast();
  const [data, setData] = useState(null); // { logs, cards, hobbies, sessions }
  const [timer, setTimerState] = useState(readTimer); // { hobbyId, startedAt }

  useEffect(() => {
    let alive = true;
    Promise.all(["people-logs", "vocab-cards", "hobbies", "hobby-sessions"].map((c) => api.list(c).catch(() => [])))
      .then(([logs, cards, hobbies, sessions]) => alive && setData({ logs, cards, hobbies, sessions }))
      .catch(() => alive && setData({ logs: [], cards: [], hobbies: [], sessions: [] }));
    return () => {
      alive = false;
    };
  }, []);

  // Small helpers: change the list now, save in the background, swap in the saved copy.
  const create = useCallback(
    async (key, collection, doc) => {
      const temp = { ...doc, _id: `tmp${Date.now()}${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
      setData((d) => ({ ...d, [key]: [temp, ...d[key]] }));
      try {
        const saved = await api.create(collection, doc);
        setData((d) => ({ ...d, [key]: d[key].map((x) => (x._id === temp._id ? saved : x)) }));
        return saved;
      } catch {
        setData((d) => ({ ...d, [key]: d[key].filter((x) => x._id !== temp._id) }));
        toast("Couldn't save — check your connection");
        return null;
      }
    },
    [toast]
  );
  const patch = useCallback(
    async (key, collection, id, changes) => {
      setData((d) => ({ ...d, [key]: d[key].map((x) => (x._id === id ? { ...x, ...changes } : x)) }));
      if (String(id).startsWith("tmp")) return;
      try {
        await api.update(collection, id, changes);
      } catch {
        toast("Couldn't save — check your connection");
      }
    },
    [toast]
  );
  const remove = useCallback(
    async (key, collection, id) => {
      setData((d) => ({ ...d, [key]: d[key].filter((x) => x._id !== id) }));
      if (String(id).startsWith("tmp")) return;
      try {
        await api.remove(collection, id);
      } catch {
        toast("Couldn't delete — check your connection");
      }
    },
    [toast]
  );

  const value = useMemo(() => {
    const d = data || { logs: [], cards: [], hobbies: [], sessions: [] };
    const today = todayISO();
    const logOf = (lessonId) => d.logs.find((l) => l.lessonId === lessonId);
    return {
      loading: data === null,
      ...d,
      today,
      // People
      logOf,
      saveLesson: (lessonId, changes) => {
        const cur = logOf(lessonId);
        if (cur) return patch("logs", "people-logs", cur._id, { ...changes, updatedAt: Date.now() });
        return create("logs", "people-logs", { lessonId, date: today, challenge: "", note: "", ...changes });
      },
      // Words
      addCard: (card) => {
        if (d.cards.some((c) => c.word.toLowerCase() === card.word.trim().toLowerCase())) {
          toast(`“${card.word}” is already in your deck`);
          return null;
        }
        return create("cards", "vocab-cards", { ...card, word: card.word.trim(), due: "" });
      },
      updateCard: (id, changes) => patch("cards", "vocab-cards", id, changes),
      removeCard: (id) => remove("cards", "vocab-cards", id),
      grade: (card, g) => patch("cards", "vocab-cards", card._id, reviewed(card, g, today)),
      // Hobbies
      addHobby: (h) => create("hobbies", "hobbies", { order: d.hobbies.length, ...h }),
      updateHobby: (id, changes) => patch("hobbies", "hobbies", id, changes),
      removeHobby: (id) => {
        remove("hobbies", "hobbies", id);
        d.sessions.filter((s) => s.hobbyId === id).forEach((s) => remove("sessions", "hobby-sessions", s._id));
      },
      addSession: (s) => create("sessions", "hobby-sessions", { date: today, note: "", ...s }),
      removeSession: (id) => remove("sessions", "hobby-sessions", id),
      // Practice timer
      timer,
      startTimer: (hobbyId) => {
        const t = { hobbyId, startedAt: Date.now() };
        try {
          localStorage.setItem(TIMER_KEY, JSON.stringify(t));
        } catch {
          /* still works until reload */
        }
        setTimerState(t);
      },
      stopTimer: (save = true) => {
        const t = timer;
        try {
          localStorage.removeItem(TIMER_KEY);
        } catch {
          /* ignore */
        }
        setTimerState(null);
        if (!t || !save) return 0;
        const minutes = Math.min(1440, Math.round((Date.now() - t.startedAt) / 60000));
        if (minutes >= 1) {
          create("sessions", "hobby-sessions", { hobbyId: t.hobbyId, date: today, minutes, note: "" });
          toast(`Logged ${minutes} min`);
        } else toast("Less than a minute — not logged");
        return minutes;
      },
    };
  }, [data, timer, create, patch, remove, toast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}


// ---------- hobby stats ----------
export function hobbyStats(h, sessions, today = todayISO()) {
  const mine = sessions.filter((s) => s.hobbyId === h._id);
  const d = parseISO(today);
  const mon = isoDate(addDays(d, -((d.getDay() + 6) % 7)));
  const week = mine.filter((s) => s.date >= mon).reduce((a, s) => a + s.minutes, 0);
  const total = mine.reduce((a, s) => a + s.minutes, 0);
  const last = mine.reduce((a, s) => (s.date > a ? s.date : a), "");
  const daysSince = last ? Math.round((parseISO(today) - parseISO(last)) / 86400000) : null;
  const ms = h.milestones || [];
  return { week, total, last, daysSince, sessions: mine, done: ms.filter((m) => m.done).length, of: ms.length, next: ms.find((m) => !m.done) };
}
export const hoursText = (min) => (min < 60 ? `${min} min` : `${Math.round((min / 60) * 10) / 10} h`);
