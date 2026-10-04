// Data for Hair & Body care: routine/task definitions and one log per area per
// day. Loads instantly from a browser copy, saves optimistically in order, and
// on first run seeds the default routines and carries over older hair /
// brushing / grooming-task entries.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../api";
import { useToast } from "../../../components/Toast.jsx";
import { DEFAULT_ITEMS, HAIR_FALL, SCALP, newKey } from "./lib";

const ITEMS = "care-items";
const LOGS = "care-logs";
export const CARE_CACHE_KEY = "lifeos_care_cache_v1";
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
const id = (area, date) => `${area}|${date}`;

const CareContext = createContext(null);

function readCache() {
  try {
    const d = JSON.parse(localStorage.getItem(CARE_CACHE_KEY) || "null");
    return d && Array.isArray(d.items) && Array.isArray(d.logs) ? d : null;
  } catch {
    return null;
  }
}

function indexLogs(logs) {
  const map = {};
  for (const l of logs) {
    const k = id(l.area, l.date);
    const cur = map[k];
    if (!cur || (l.updatedAt || l.createdAt || 0) > (cur.updatedAt || cur.createdAt || 0)) map[k] = l;
  }
  return map;
}

// Turn the older collections into care-log entries (first run only).
async function legacyLogs() {
  const [hair, brush, tasks] = await Promise.all([api.list("hair-logs").catch(() => []), api.list("grooming-brush").catch(() => []), api.list("grooming-tasks").catch(() => [])]);
  const out = {};
  const get = (area, date) => (out[id(area, date)] ||= { area, date, done: new Set(), fall: "", scalp: [], notes: "" });
  for (const h of hair) {
    const e = get("hair", h.date);
    if (h.washDone) ["h-shampoo", "h-conditioner"].forEach((k) => e.done.add(k));
    const fall = String(h.hairFall || "").toLowerCase();
    if (HAIR_FALL.some((f) => f.value === fall)) e.fall = fall;
    const sc = String(h.scalpCondition || "").toLowerCase();
    const tags = SCALP.filter((t) => sc.includes(t));
    if (tags.length) e.scalp = tags;
    e.notes = [h.notes, !tags.length && sc && isNaN(Number(sc)) ? `Scalp: ${h.scalpCondition}` : ""].filter(Boolean).join(" · ");
  }
  for (const b of brush) {
    const e = get("body", b.date);
    if (b.am) e.done.add("b-brush-am");
    if (b.pm) e.done.add("b-brush-pm");
  }
  const MAP = { "bath-regular": "b-shower", "bath-steam": "bath-oil" };
  for (const t of tasks) {
    if (t.taskType === "other") continue;
    get("body", t.date).done.add(MAP[t.taskType] || t.taskType);
  }
  return Object.values(out).map((e) => ({ ...e, done: [...e.done] }));
}

export function CareProvider({ children }) {
  const showToast = useToast();
  const cached = useMemo(readCache, []);
  const [items, setItems] = useState(cached?.items || []);
  const [logs, setLogs] = useState(cached?.logs || []);
  const [status, setStatus] = useState({ loading: !cached, syncing: true, error: null });
  const logsRef = useRef(logs);
  logsRef.current = logs;
  const queues = useRef({});
  const createdIds = useRef({});
  const booted = useRef(false);

  const load = useCallback(async () => {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      let [itemList, logList] = await Promise.all([api.list(ITEMS), api.list(LOGS)]);
      if (itemList.length === 0) {
        // First run: default routines + carry over older entries.
        itemList = [];
        for (const [i, it] of DEFAULT_ITEMS.entries()) itemList.push(await api.create(ITEMS, { ...it, order: i }));
        if (logList.length === 0) {
          for (const l of await legacyLogs()) logList.push(await api.create(LOGS, l));
        }
      }
      setItems([...itemList].sort(byOrder));
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
    if (status.syncing || status.error || !items.length) return;
    try {
      localStorage.setItem(CARE_CACHE_KEY, JSON.stringify({ items, logs, savedAt: Date.now() }));
    } catch {
      /* not critical */
    }
  }, [items, logs, status.syncing, status.error]);

  const index = useMemo(() => indexLogs(logs), [logs]);

  // key -> sorted dates it was done (for periodic tasks and insights)
  const datesByKey = useMemo(() => {
    const m = {};
    for (const l of Object.values(index)) for (const k of l.done || []) (m[k] ||= []).push(l.date);
    for (const k in m) m[k].sort();
    return m;
  }, [index]);

  const logOf = useCallback((area, date) => index[id(area, date)], [index]);
  const doneOf = useCallback((area, date) => new Set(index[id(area, date)]?.done || []), [index]);

  const saveDay = useCallback(
    (area, date, patch) => {
      const k = id(area, date);
      const tmp = `tmp-${k}`;
      setLogs((l) => {
        const cur = indexLogs(l)[k];
        const next = { ...(cur || { _id: tmp, area, date, done: [], createdAt: Date.now() }), ...patch, updatedAt: Date.now() };
        return [...l.filter((x) => x !== cur), next];
      });
      const run = async () => {
        const cur = indexLogs(logsRef.current)[k];
        const realId = createdIds.current[k] || (cur && !String(cur._id).startsWith("tmp-") ? cur._id : null);
        try {
          const doc = realId ? await api.update(LOGS, realId, patch) : await api.create(LOGS, { area, date, ...patch });
          createdIds.current[k] = doc._id;
          if (!realId) setLogs((l) => l.map((x) => (x._id === tmp ? { ...x, _id: doc._id } : x)));
        } catch (err) {
          showToast(err.message || "Couldn't save — refreshing", true);
          load();
        }
      };
      queues.current[k] = (queues.current[k] || Promise.resolve()).then(run);
      return queues.current[k];
    },
    [showToast, load]
  );

  const setDone = useCallback(
    (area, date, keys, on) => {
      const done = new Set(indexLogs(logsRef.current)[id(area, date)]?.done || []);
      keys.forEach((key) => (on ? done.add(key) : done.delete(key)));
      return saveDay(area, date, { done: [...done] });
    },
    [saveDay]
  );
  const toggle = useCallback(
    (area, date, key) => {
      const on = !(indexLogs(logsRef.current)[id(area, date)]?.done || []).includes(key);
      return setDone(area, date, [key], on);
    },
    [setDone]
  );

  // ---------- definitions ----------
  const addItem = useCallback(
    async (data) => {
      try {
        const order = Math.max(0, ...items.map((s) => s.order ?? 0)) + 1;
        const doc = await api.create(ITEMS, { key: newKey(data.area), ...data, order });
        setItems((l) => [...l, doc].sort(byOrder));
        showToast(`Added ${doc.name}`);
        return doc;
      } catch (err) {
        showToast(err.message || "Couldn't add", true);
        return null;
      }
    },
    [items, showToast]
  );
  const updateItem = useCallback(
    async (item, data, msg = "Saved") => {
      setItems((l) => l.map((s) => (s._id === item._id ? { ...s, ...data } : s)));
      try {
        const doc = await api.update(ITEMS, item._id, data);
        setItems((l) => l.map((s) => (s._id === doc._id ? doc : s)).sort(byOrder));
        if (msg) showToast(msg);
        return doc;
      } catch (err) {
        showToast(err.message || "Couldn't save", true);
        load();
        return null;
      }
    },
    [showToast, load]
  );
  const removeItem = useCallback(
    async (item) => {
      setItems((l) => l.filter((s) => s._id !== item._id));
      try {
        await api.remove(ITEMS, item._id);
        const { _id, __v, ...rest } = item;
        showToast(`Removed ${item.name}`, false, {
          action: {
            label: "Undo",
            onClick: async () => {
              const doc = await api.create(ITEMS, rest).catch(() => null);
              if (doc) setItems((l) => [...l, doc].sort(byOrder));
            },
          },
        });
      } catch (err) {
        showToast(err.message || "Couldn't remove", true);
        load();
      }
    },
    [showToast, load]
  );
  const moveItem = useCallback(
    async (item, dir, sameGroup) => {
      const list = items.filter(sameGroup).sort(byOrder);
      const i = list.findIndex((s) => s._id === item._id);
      const other = list[i + dir];
      if (!other) return;
      const a = item.order ?? i;
      const b = other.order ?? i + dir;
      const [oa, ob] = a === b ? [b + dir, a] : [b, a];
      setItems((l) => l.map((s) => (s._id === item._id ? { ...s, order: oa } : s._id === other._id ? { ...s, order: ob } : s)).sort(byOrder));
      try {
        await Promise.all([api.update(ITEMS, item._id, { order: oa }), api.update(ITEMS, other._id, { order: ob })]);
      } catch (err) {
        showToast(err.message || "Couldn't reorder", true);
        load();
      }
    },
    [items, showToast, load]
  );

  const value = {
    ...status,
    hasData: items.length > 0,
    items,
    logs,
    datesByKey,
    logOf,
    doneOf,
    reload: load,
    saveDay,
    setDone,
    toggle,
    addItem,
    updateItem,
    removeItem,
    moveItem,
  };
  return <CareContext.Provider value={value}>{children}</CareContext.Provider>;
}

export function useCare(area) {
  const ctx = useContext(CareContext);
  if (!ctx) throw new Error("useCare must be used inside CareProvider");
  return useMemo(() => {
    if (!area) return ctx;
    return {
      ...ctx,
      area,
      areaItems: ctx.items.filter((i) => i.area === area),
      doneOn: (date) => ctx.doneOf(area, date),
      logFor: (date) => ctx.logOf(area, date),
      toggleKey: (date, key) => ctx.toggle(area, date, key),
      setKeys: (date, keys, on) => ctx.setDone(area, date, keys, on),
      save: (date, patch) => ctx.saveDay(area, date, patch),
    };
  }, [ctx, area]);
}
