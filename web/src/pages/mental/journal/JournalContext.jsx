// Journal data + the PIN lock. The journal key (from the PIN) is kept only in
// memory: closing the app, 5 minutes in the background, or 30 minutes after
// unlocking locks the journal again.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../api";
import { useToast } from "../../../components/Toast.jsx";

const Ctx = createContext(null);
export const useJournal = () => useContext(Ctx);
const AWAY_LOCK_MS = 5 * 60_000;

export const entryKey = (kind, date) => `${kind}:${date}`;
function index(list) {
  const map = {};
  for (const e of list) {
    const k = entryKey(e.kind || "day", e.date);
    const cur = map[k];
    if (!cur || (e.updatedAt || 0) > (cur.updatedAt || 0)) map[k] = e;
  }
  return map;
}

export function JournalProvider({ children }) {
  const toast = useToast();
  const [lock, setLock] = useState("loading"); // loading | needPin | locked | open | error
  const [lockedUntil, setLockedUntil] = useState(0);
  const [entries, setEntries] = useState([]);
  const key = useRef(null);
  const timer = useRef(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const queues = useRef({});
  const realIds = useRef({});

  const relock = useCallback(() => {
    key.current = null;
    clearTimeout(timer.current);
    setEntries([]);
    setLock((l) => (l === "needPin" ? l : "locked"));
  }, []);

  const opened = useCallback(
    async ({ key: k, minutes }) => {
      key.current = k;
      clearTimeout(timer.current);
      timer.current = setTimeout(relock, (minutes || 30) * 60_000);
      setLock("open");
      try {
        setEntries(await api.journal.list(k));
      } catch (e) {
        if (e.status === 423) relock();
        else toast(e.message, true);
      }
    },
    [relock, toast]
  );

  const check = useCallback(async () => {
    try {
      const s = await api.journalLock();
      setLockedUntil(s.lockedUntil || 0);
      setLock(key.current ? "open" : s.hasPin ? "locked" : "needPin");
    } catch {
      setLock("error");
    }
  }, []);
  useEffect(() => {
    check();
    return () => clearTimeout(timer.current);
  }, [check]);

  // Lock when the app has been in the background for a while.
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AWAY_LOCK_MS) relock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [relock]);

  const setPin = useCallback(async (pin) => opened(await api.journalSetPin(pin)), [opened]);
  const unlock = useCallback(async (pin) => opened(await api.journalUnlock(pin)), [opened]);
  const changePin = useCallback(async (body) => opened(await api.journalChangePin(body)), [opened]);

  const byKey = useMemo(() => index(entries), [entries]);

  // Save part of one page (optimistic; saves for the same page go in order).
  const save = useCallback(
    (kind, date, patch) => {
      const k = entryKey(kind, date);
      setEntries((list) => {
        const cur = index(list)[k];
        const next = { ...(cur || { _id: `tmp-${k}`, kind, date, createdAt: Date.now() }), ...patch, updatedAt: Date.now() };
        return [...list.filter((x) => x !== cur), next];
      });
      const run = async () => {
        if (!key.current) return;
        const cur = index(entriesRef.current)[k];
        const id = realIds.current[k] || (cur && !String(cur._id).startsWith("tmp-") ? cur._id : null);
        try {
          const doc = id ? await api.journal.update(key.current, id, patch) : await api.journal.create(key.current, { kind, date, ...patch });
          realIds.current[k] = doc._id;
          if (!id) setEntries((list) => list.map((x) => (x._id === `tmp-${k}` ? { ...x, _id: doc._id } : x)));
        } catch (e) {
          if (e.status === 423) {
            toast("Journal locked — unlock to keep writing (this change wasn't saved)", true);
            relock();
          } else toast(e.message || "Couldn't save", true);
        }
      };
      queues.current[k] = (queues.current[k] || Promise.resolve()).then(run);
      return queues.current[k];
    },
    [relock, toast]
  );

  const remove = useCallback(
    async (entry) => {
      setEntries((l) => l.filter((x) => x !== entry));
      try {
        if (!String(entry._id).startsWith("tmp-")) await api.journal.remove(key.current, entry._id);
        delete realIds.current[entryKey(entry.kind || "day", entry.date)];
      } catch (e) {
        toast(e.message, true);
      }
    },
    [toast]
  );

  const value = { lock, lockedUntil, entries, byKey, save, remove, setPin, unlock, changePin, relock, recheck: check };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
