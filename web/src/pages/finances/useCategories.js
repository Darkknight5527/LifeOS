import { useEffect, useRef } from "react";
import { useCollection } from "../../hooks/useCollection";
import { DEFAULT_CATEGORIES } from "./constants";
import { api } from "../../api";

/**
 * Loads finance_categories and seeds the default starter list the first
 * time the collection is empty, so the user has something to pick from
 * without manually adding nine categories before they can log anything.
 */
export function useCategories() {
  const coll = useCollection("finance-categories");
  const seeded = useRef(false);

  useEffect(() => {
    if (coll.loading || seeded.current) return;
    if (coll.items.length === 0) {
      seeded.current = true;
      (async () => {
        for (const name of DEFAULT_CATEGORIES) {
          await api.create("finance-categories", { name });
        }
        coll.reload();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coll.loading, coll.items.length]);

  return coll;
}
