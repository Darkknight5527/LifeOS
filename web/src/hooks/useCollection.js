import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "../components/Toast.jsx";

/**
 * Loads a collection from the API and exposes create/remove helpers
 * that refresh the list and show a toast, mirroring the prototype
 * artifact's addDoc/deleteDocById behavior but against the real backend.
 */
export function useCollection(name) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  const reload = useCallback(async () => {
    try {
      const data = await api.list(name);
      setItems(data);
    } catch (err) {
      showToast(err.message || "Failed to load", true);
    } finally {
      setLoading(false);
    }
  }, [name, showToast]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const create = useCallback(
    async (data) => {
      try {
        await api.create(name, data);
        await reload();
        showToast("Saved");
        return true;
      } catch (err) {
        showToast(err.message || "Save failed", true);
        return false;
      }
    },
    [name, reload, showToast]
  );

  const remove = useCallback(
    async (id) => {
      if (!window.confirm("Remove this entry? This can't be undone.")) return;
      try {
        await api.remove(name, id);
        await reload();
        showToast("Removed");
      } catch (err) {
        showToast(err.message || "Remove failed", true);
      }
    },
    [name, reload, showToast]
  );

  const update = useCallback(
    async (id, data) => {
      try {
        await api.update(name, id, data);
        await reload();
        showToast("Saved");
        return true;
      } catch (err) {
        showToast(err.message || "Save failed", true);
        return false;
      }
    },
    [name, reload, showToast]
  );

  return { items, loading, create, remove, update, reload };
}
