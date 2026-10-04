import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../components/Toast.jsx";
import {
  BUCKETS,
  DEFAULT_RATIO,
  DEFAULT_SUBCATEGORIES,
  guessBucket,
  monthKey,
  shiftMonth,
  splitByRatio,
} from "./lib";

const FinanceContext = createContext(null);

// API collection name for each piece of local state.
const COLLECTIONS = {
  categories: "finance-categories",
  transactions: "finance-transactions",
  months: "finance-months",
  settings: "finance-settings",
  investments: "finance-investments",
  goals: "finance-savings-goals",
};

// ---------- browser copy of the last-seen data ----------
// Shown instantly on the next visit while the (possibly sleeping) server
// wakes up; replaced by fresh data as soon as it arrives. Display only —
// every save still goes to the database.
export const FIN_CACHE_KEY = "lifeos_fin_cache_v1";
const CACHED_KEYS = ["categories", "transactions", "months", "settings", "investments", "goals"];

function readCache() {
  try {
    const raw = localStorage.getItem(FIN_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return CACHED_KEYS.every((k) => k in data) ? data : null;
  } catch {
    return null;
  }
}
function writeCache(state) {
  try {
    const data = Object.fromEntries(CACHED_KEYS.map((k) => [k, state[k]]));
    data.savedAt = Date.now();
    localStorage.setItem(FIN_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked — not critical */
  }
}

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);
const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0);

/**
 * Loads every finance collection once, keeps it in local state, and applies
 * changes from API responses directly (no full reloads), so the UI updates
 * instantly after each action.
 */
export function FinanceProvider({ children }) {
  const showToast = useToast();
  const [state, setState] = useState(() => {
    const cached = readCache();
    return cached
      ? // Show the saved copy straight away and refresh in the background.
        { ...cached, loading: false, syncing: true, error: null, cachedAt: cached.savedAt }
      : { loading: true, syncing: true, error: null, categories: [], transactions: [], months: [], settings: null, investments: [], goals: [] };
  });
  const booted = useRef(false);

  const patchList = useCallback((key, fn) => setState((s) => ({ ...s, [key]: fn(s[key]) })), []);

  const load = useCallback(async () => {
    try {
      const [categories, transactions, months, settingsList, investments, goals] = await Promise.all(
        ["categories", "transactions", "months", "settings", "investments", "goals"].map((k) => api.list(COLLECTIONS[k]))
      );

      // One-time migrations / seeding so the new bucket model always has data.
      let cats = categories;
      if (cats.length === 0) {
        cats = [];
        let order = 0;
        for (const b of BUCKETS) {
          for (const name of DEFAULT_SUBCATEGORIES[b.id]) {
            cats.push(await api.create(COLLECTIONS.categories, { name, bucket: b.id, order: order++ }));
          }
        }
      } else if (cats.some((c) => !c.bucket)) {
        cats = await Promise.all(
          cats.map((c, i) =>
            c.bucket ? c : api.update(COLLECTIONS.categories, c._id, { bucket: guessBucket(c.name), order: c.order || i })
          )
        );
      }

      let settings = settingsList[0];
      if (!settings) {
        settings = await api.create(COLLECTIONS.settings, {
          ratioNeeds: DEFAULT_RATIO.needs,
          ratioWants: DEFAULT_RATIO.wants,
          ratioSavings: DEFAULT_RATIO.savings,
        });
      }

      setState({
        loading: false,
        syncing: false,
        error: null,
        categories: [...cats].sort(byOrder),
        transactions: [...transactions].sort(byDateDesc),
        months,
        settings,
        investments,
        goals,
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, syncing: false, error: err.message || "Failed to load" }));
    }
  }, []);

  // Keep the browser copy up to date with every confirmed change.
  useEffect(() => {
    if (!state.loading && !state.syncing && !state.error && state.settings) writeCache(state);
  }, [state]);

  // Retry button / background refresh: keeps showing current data meanwhile.
  const sync = useCallback(async () => {
    setState((s) => ({ ...s, syncing: true, error: null }));
    await load();
  }, [load]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    load();
  }, [load]);

  // Wraps an API call with error toasts; returns the result or null.
  const attempt = useCallback(
    async (fn, success) => {
      try {
        const out = await fn();
        if (success) showToast(success);
        return out ?? true;
      } catch (err) {
        showToast(err.message || "Something went wrong", true);
        return null;
      }
    },
    [showToast]
  );

  // ---------- derived ----------
  const ratio = useMemo(() => {
    const s = state.settings;
    return s
      ? { needs: s.ratioNeeds ?? 50, wants: s.ratioWants ?? 30, savings: s.ratioSavings ?? 20 }
      : DEFAULT_RATIO;
  }, [state.settings]);

  const bucketOf = useMemo(() => {
    const map = Object.fromEntries(state.categories.map((c) => [c.name, c.bucket]));
    return (tx) => tx.bucket || map[tx.category] || "wants";
  }, [state.categories]);

  const expenses = useMemo(
    () => state.transactions.filter((t) => t.type !== "income").map((t) => ({ ...t, bucket: bucketOf(t) })),
    [state.transactions, bucketOf]
  );

  // Money received outside salary: cashback, refunds, loans paid back…
  const received = useMemo(() => state.transactions.filter((t) => t.type === "income" && t.bucket === "received"), [state.transactions]);

  const monthRecord = useCallback((key) => state.months.find((m) => m.month === key) || null, [state.months]);

  // Most recent month before `key` that has a salary — used for "same as last month?".
  const previousRecord = useCallback(
    (key) =>
      state.months
        .filter((m) => m.month < key && m.salary > 0)
        .sort((a, b) => b.month.localeCompare(a.month))[0] || null,
    [state.months]
  );

  // ---------- actions: transactions ----------
  const addExpense = useCallback(
    async (data) => {
      const doc = await attempt(() => api.create(COLLECTIONS.transactions, { type: "expense", ...data }), data.type === "income" ? "Money received saved" : "Expense saved");
      if (doc) patchList("transactions", (l) => [doc, ...l].sort(byDateDesc));
      return doc;
    },
    [attempt, patchList]
  );

  const updateExpense = useCallback(
    async (id, data) => {
      const doc = await attempt(() => api.update(COLLECTIONS.transactions, id, data), "Updated");
      if (doc) patchList("transactions", (l) => l.map((t) => (t._id === id ? doc : t)).sort(byDateDesc));
      return doc;
    },
    [attempt, patchList]
  );

  const removeExpense = useCallback(
    async (tx) => {
      const ok = await attempt(() => api.remove(COLLECTIONS.transactions, tx._id));
      if (!ok) return;
      patchList("transactions", (l) => l.filter((t) => t._id !== tx._id));
      const { _id, __v, ...rest } = tx;
      showToast(tx.type === "income" ? "Entry deleted" : "Expense deleted", false, {
        action: {
          label: "Undo",
          onClick: async () => {
            const doc = await attempt(() => api.create(COLLECTIONS.transactions, rest), "Restored");
            if (doc) patchList("transactions", (l) => [doc, ...l].sort(byDateDesc));
          },
        },
      });
    },
    [attempt, patchList, showToast]
  );

  // ---------- actions: salary & split ----------
  const upsertMonth = useCallback(
    async (key, data, success) => {
      const existing = state.months.find((m) => m.month === key);
      const doc = await attempt(
        () => (existing ? api.update(COLLECTIONS.months, existing._id, data) : api.create(COLLECTIONS.months, { month: key, ...data })),
        success
      );
      if (doc) patchList("months", (l) => (existing ? l.map((m) => (m._id === doc._id ? doc : m)) : [...l, doc]));
      return doc;
    },
    [state.months, attempt, patchList]
  );

  const setSalary = useCallback(
    (key, salary) => upsertMonth(key, { salary, ...splitByRatio(salary, ratio) }, "Salary set"),
    [upsertMonth, ratio]
  );

  const saveAmounts = useCallback(
    (key, amounts) => upsertMonth(key, amounts, "Split saved"),
    [upsertMonth]
  );

  const saveRatio = useCallback(
    async (next, applyToKey) => {
      const doc = await attempt(() =>
        api.update(COLLECTIONS.settings, state.settings._id, {
          ratioNeeds: next.needs,
          ratioWants: next.wants,
          ratioSavings: next.savings,
        })
      );
      if (!doc) return null;
      setState((s) => ({ ...s, settings: doc }));
      const rec = applyToKey && state.months.find((m) => m.month === applyToKey);
      if (rec) return upsertMonth(applyToKey, splitByRatio(rec.salary, next), "Ratio applied");
      showToast("Ratio saved");
      return doc;
    },
    [attempt, state.settings, state.months, upsertMonth, showToast]
  );

  // ---------- actions: subcategories ----------
  const addCategory = useCallback(
    async (name, bucket) => {
      const clean = name.trim();
      if (!clean) return null;
      if (state.categories.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
        showToast(`"${clean}" already exists`, true);
        return null;
      }
      const order = Math.max(0, ...state.categories.map((c) => c.order ?? 0)) + 1;
      const doc = await attempt(() => api.create(COLLECTIONS.categories, { name: clean, bucket, order }), "Added");
      if (doc) patchList("categories", (l) => [...l, doc].sort(byOrder));
      return doc;
    },
    [state.categories, attempt, patchList, showToast]
  );

  const updateCategory = useCallback(
    async (cat, data) => {
      const doc = await attempt(() => api.update(COLLECTIONS.categories, cat._id, data));
      if (!doc) return null;
      patchList("categories", (l) => l.map((c) => (c._id === doc._id ? doc : c)).sort(byOrder));
      // A rename carries over to past expenses so history stays grouped.
      if (data.name && data.name !== cat.name) {
        const affected = state.transactions.filter((t) => t.category === cat.name);
        const updated = await Promise.all(
          affected.map((t) => api.update(COLLECTIONS.transactions, t._id, { category: data.name, bucket: t.bucket || cat.bucket }).catch(() => null))
        );
        const map = Object.fromEntries(updated.filter(Boolean).map((t) => [t._id, t]));
        patchList("transactions", (l) => l.map((t) => map[t._id] || t));
        showToast(affected.length ? `Renamed · ${affected.length} expense${affected.length > 1 ? "s" : ""} updated` : "Renamed");
      }
      return doc;
    },
    [attempt, patchList, state.transactions, showToast]
  );

  const removeCategory = useCallback(
    async (cat) => {
      const ok = await attempt(() => api.remove(COLLECTIONS.categories, cat._id));
      if (!ok) return;
      patchList("categories", (l) => l.filter((c) => c._id !== cat._id));
      const { _id, __v, ...rest } = cat;
      showToast(`Removed "${cat.name}"`, false, {
        action: {
          label: "Undo",
          onClick: async () => {
            const doc = await attempt(() => api.create(COLLECTIONS.categories, rest));
            if (doc) patchList("categories", (l) => [...l, doc].sort(byOrder));
          },
        },
      });
    },
    [attempt, patchList, showToast]
  );

  // ---------- actions: wealth ----------
  const makeCrud = useCallback(
    (key) => ({
      create: async (data, msg = "Saved") => {
        const doc = await attempt(() => api.create(COLLECTIONS[key], data), msg);
        if (doc) patchList(key, (l) => [doc, ...l]);
        return doc;
      },
      update: async (id, data, msg = "Saved") => {
        const doc = await attempt(() => api.update(COLLECTIONS[key], id, data), msg);
        if (doc) patchList(key, (l) => l.map((x) => (x._id === id ? doc : x)));
        return doc;
      },
      remove: async (item, label = "Removed") => {
        const ok = await attempt(() => api.remove(COLLECTIONS[key], item._id));
        if (!ok) return;
        patchList(key, (l) => l.filter((x) => x._id !== item._id));
        const { _id, __v, ...rest } = item;
        showToast(label, false, {
          action: {
            label: "Undo",
            onClick: async () => {
              const doc = await attempt(() => api.create(COLLECTIONS[key], rest));
              if (doc) patchList(key, (l) => [doc, ...l]);
            },
          },
        });
      },
    }),
    [attempt, patchList, showToast]
  );
  const investmentsCrud = useMemo(() => makeCrud("investments"), [makeCrud]);
  const goalsCrud = useMemo(() => makeCrud("goals"), [makeCrud]);

  // ---------- actions: data ----------
  const backup = useCallback(() => attempt(() => api.financeBackup()), [attempt]);
  const restore = useCallback(
    async (data) => {
      const ok = await attempt(() => api.financeRestore(data), "Backup restored");
      if (ok) {
        setState((s) => ({ ...s, syncing: true }));
        await load();
      }
      return ok;
    },
    [attempt, load]
  );
  const resetAll = useCallback(async () => {
    const ok = await attempt(() => api.financeReset(), "Finances reset");
    if (ok) {
      setState((s) => ({ ...s, syncing: true }));
      await load();
    }
    return ok;
  }, [attempt, load]);

  const value = {
    ...state,
    ratio,
    expenses,
    received,
    currentMonth: monthKey(),
    monthRecord,
    previousRecord,
    prevMonthKey: (k) => shiftMonth(k, -1),
    reload: sync,
    addExpense,
    updateExpense,
    removeExpense,
    setSalary,
    saveAmounts,
    saveRatio,
    addCategory,
    updateCategory,
    removeCategory,
    investments: state.investments,
    goals: state.goals,
    investmentsCrud,
    goalsCrud,
    backup,
    restore,
    resetAll,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}
