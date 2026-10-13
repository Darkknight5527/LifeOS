// Mind: your finished sessions (for minutes and streaks), the session that's
// open right now, and this device's voice / bell settings.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../api";
import { addDays, isoDate, parseISO, todayISO } from "../../finances/lib";
import { audioCtx, bowl, chime, stopAll } from "./audio.js";
import { keepAwake, readPrefs, stopSpeaking, writePrefs } from "./voice.js";

const Ctx = createContext(null);
export const useMind = () => useContext(Ctx);

/** Days in a row (ending today, or yesterday if nothing yet today) with at least one session. */
export function streakOf(sessions, today = todayISO()) {
  const days = new Set(sessions.map((s) => s.date));
  let d = days.has(today) ? today : isoDate(addDays(parseISO(today), -1));
  let n = 0;
  while (days.has(d)) {
    n++;
    d = isoDate(addDays(parseISO(d), -1));
  }
  return n;
}

export function MindProvider({ children }) {
  const [sessions, setSessions] = useState(null);
  const [active, setActive] = useState(null); // { type, ... } — the open session screen
  const [prefs, setPrefsState] = useState(readPrefs);

  useEffect(() => {
    let alive = true;
    api
      .list("mind-sessions")
      .then((l) => alive && setSessions(l))
      .catch(() => alive && setSessions([]));
    return () => {
      alive = false;
    };
  }, []);

  // Leaving the Mental page stops sounds, voice and keep-awake.
  useEffect(
    () => () => {
      stopAll(0.3);
      stopSpeaking();
      keepAwake(false);
    },
    []
  );

  const log = useCallback(async ({ kind, title = "", seconds, felt }) => {
    const doc = { date: todayISO(), kind, title, seconds: Math.round(seconds) };
    if (felt !== undefined && felt !== null) doc.felt = felt;
    const temp = { ...doc, _id: `tmp${Date.now()}`, createdAt: Date.now() };
    setSessions((l) => [temp, ...(l || [])]);
    try {
      const saved = await api.create("mind-sessions", doc);
      setSessions((l) => (l || []).map((s) => (s._id === temp._id ? saved : s)));
    } catch {
      /* it stays on screen; it'll be missing after a reload */
    }
  }, []);

  // ---- focus timer (keeps running while you move around the Mental page) ----
  // { work, rest (minutes), phase "work"|"rest", endsAt, left (seconds, when paused), round }
  const [focus, setFocus] = useState(null);
  const [now, setNow] = useState(Date.now());
  const focusRef = useRef(null);
  focusRef.current = focus;
  const running = focus && focus.left == null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (!running || now < focus.endsAt) return;
    const p = readPrefs();
    if (focus.phase === "work") {
      log({ kind: "focus", title: `Focus · round ${focus.round}`, seconds: focus.work * 60 });
      if (p.bells) bowl(0.5);
      setFocus({ ...focus, phase: "rest", endsAt: Date.now() + focus.rest * 60000 });
    } else {
      if (p.bells) chime("in", 0.5);
      setFocus({ ...focus, phase: "work", round: focus.round + 1, endsAt: Date.now() + focus.work * 60000 });
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps
  const focusApi = useMemo(
    () => ({
      start: (work, rest) => {
        audioCtx();
        if (readPrefs().bells) chime("in", 0.5);
        setFocus({ work, rest, phase: "work", round: 1, endsAt: Date.now() + work * 60000, left: null });
        setNow(Date.now());
      },
      pause: () => setFocus((f) => f && { ...f, left: Math.max(0, (f.endsAt - Date.now()) / 1000) }),
      resume: () => setFocus((f) => f && { ...f, endsAt: Date.now() + f.left * 1000, left: null }),
      stop: () => {
        const f = focusRef.current;
        if (f?.phase === "work") {
          const done = f.work * 60 - (f.left != null ? f.left : (f.endsAt - Date.now()) / 1000);
          if (done >= 300) log({ kind: "focus", title: `Focus · round ${f.round}`, seconds: done });
        }
        setFocus(null);
      },
    }),
    [log]
  );

  const setPrefs = useCallback((patch) => {
    setPrefsState((p) => {
      const next = { ...p, ...patch };
      writePrefs(next);
      return next;
    });
  }, []);

  const value = useMemo(() => {
    const list = sessions || [];
    const today = todayISO();
    const weekFrom = isoDate(addDays(parseISO(today), -6));
    const week = list.filter((s) => s.date >= weekFrom);
    const rated = list.filter((s) => typeof s.felt === "number");
    return {
      loading: sessions === null,
      sessions: list,
      log,
      active,
      // Called from a tap, so sound is allowed to start.
      start: (session) => {
        audioCtx();
        setActive({ ...session, n: Date.now() });
      },
      close: () => setActive(null),
      focus: focus && { ...focus, remaining: focus.left != null ? focus.left : Math.max(0, (focus.endsAt - now) / 1000), paused: focus.left != null },
      focusApi,
      prefs,
      setPrefs,
      streak: streakOf(list, today),
      weekMinutes: Math.round(week.reduce((a, s) => a + (s.seconds || 0), 0) / 60),
      totalMinutes: Math.round(list.reduce((a, s) => a + (s.seconds || 0), 0) / 60),
      todayMinutes: Math.round(list.filter((s) => s.date === today).reduce((a, s) => a + (s.seconds || 0), 0) / 60),
      betterShare: rated.length ? rated.filter((s) => s.felt > 0).length / rated.length : null,
      ratedCount: rated.length,
    };
  }, [sessions, log, active, prefs, setPrefs, focus, now, focusApi]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
