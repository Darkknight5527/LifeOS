// Library data: your books, pages read per day, the yearly goal, and PDFs.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../api";
import { useToast } from "../../../components/Toast.jsx";
import { openPdfReader, closePdfReader } from "../../../lib/inApp.js";
import { addDays, isoDate, parseISO, todayISO } from "../../finances/lib";
import { cachedBlob } from "../../paper/books.jsx";

const Ctx = createContext(null);
export const useLibrary = () => useContext(Ctx);
export const pdfKey = (book) => `lib-${book._id}`;

// ---------- book details from Open Library (free, no key) ----------
export async function lookUpBook(title, author = "") {
  const q = new URLSearchParams({ title, limit: "3", fields: "title,author_name,number_of_pages_median,cover_i,first_publish_year" });
  if (author) q.set("author", author);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(`https://openlibrary.org/search.json?${q}`, { signal: ctl.signal });
    if (!r.ok) return null;
    const d = await r.json();
    const hit = (d.docs || []).find((x) => x.cover_i) || d.docs?.[0];
    if (!hit) return null;
    return {
      author: hit.author_name?.[0] || "",
      pages: hit.number_of_pages_median || 0,
      coverId: hit.cover_i || 0,
      year: hit.first_publish_year || 0,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** "* Atomic Habits — James Clear" → { title, author } */
export function parseLine(line) {
  const clean = line.replace(/^\s*(?:[*•\-–]+|\d+[.)])\s*/, "").trim();
  if (!clean) return null;
  const m = clean.match(/^(.*?)\s+(?:—|–|-|by)\s+(.+)$/i);
  return m ? { title: m[1].trim(), author: m[2].trim() } : { title: clean, author: "" };
}

export function LibraryProvider({ children }) {
  const toast = useToast();
  const [data, setData] = useState(null); // { books, logs, goals }
  const [pdfs, setPdfs] = useState({}); // key -> { size, uploadedAt }

  const loadPdfs = useCallback(async () => {
    try {
      const l = await api.books();
      setPdfs(Object.fromEntries(l.filter((b) => b.key?.startsWith("lib-")).map((b) => [b.key, b])));
    } catch {
      /* offline */
    }
  }, []);
  useEffect(() => {
    let alive = true;
    Promise.all(["library-books", "reading-logs", "reading-goals"].map((c) => api.list(c).catch(() => []))).then(([books, logs, goals]) => alive && setData({ books, logs, goals }));
    loadPdfs();
    return () => {
      alive = false;
    };
  }, [loadPdfs]);

  const create = useCallback(
    async (key, collection, doc) => {
      const temp = { ...doc, _id: `tmp${Date.now()}${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
      setData((d) => ({ ...d, [key]: [...d[key], temp] }));
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
  const remove = useCallback(async (key, collection, id) => {
    setData((d) => ({ ...d, [key]: d[key].filter((x) => x._id !== id) }));
    if (!String(id).startsWith("tmp")) await api.remove(collection, id).catch(() => {});
  }, []);

  const dataRef = useRef(data);
  dataRef.current = data;
  const bookNow = (id) => dataRef.current?.books.find((b) => b._id === id);

  const value = useMemo(() => {
    const d = data || { books: [], logs: [], goals: [] };
    const today = todayISO();
    const year = Number(today.slice(0, 4));

    const setPage = (book, raw) => {
      const b = bookNow(book._id) || book;
      let page = Math.max(0, Math.round(Number(raw) || 0));
      if (b.pages) page = Math.min(page, b.pages);
      if (page === b.page) return;
      const changes = { page };
      if (b.status === "want" && page > 0) Object.assign(changes, { status: "reading", startedAt: b.startedAt || today });
      if (page > (b.page || 0) && !String(b._id).startsWith("tmp")) create("logs", "reading-logs", { bookId: b._id, date: today, from: b.page || 0, to: page, pages: page - (b.page || 0) });
      patch("books", "library-books", b._id, changes);
    };

    const setStatus = (book, status) => {
      const changes = { status };
      if (status === "reading") changes.startedAt = book.startedAt || today;
      if (status === "finished") {
        changes.finishedAt = today;
        changes.startedAt = book.startedAt || today;
        if (book.pages && (book.page || 0) < book.pages) {
          create("logs", "reading-logs", { bookId: book._id, date: today, from: book.page || 0, to: book.pages, pages: book.pages - (book.page || 0) });
          changes.page = book.pages;
        }
      }
      if (status === "want") Object.assign(changes, { finishedAt: "", rating: 0 });
      patch("books", "library-books", book._id, changes);
    };

    /** Pages a day lately (last 14 days, or since you started if sooner) and days to finish. */
    const pace = (book) => {
      const from = isoDate(addDays(parseISO(today), -13));
      const read = d.logs.filter((l) => l.bookId === book._id && l.date >= from).reduce((a, l) => a + l.pages, 0);
      const start = book.startedAt && book.startedAt > from ? book.startedAt : from;
      const days = Math.max(1, Math.round((parseISO(today) - parseISO(start)) / 86400000) + 1);
      const perDay = read / days;
      const left = book.pages ? Math.max(0, book.pages - (book.page || 0)) : null;
      return { perDay, daysLeft: perDay > 0 && left != null ? Math.ceil(left / perDay) : null, left };
    };

    const goalDoc = d.goals.find((g) => g.year === year);
    return {
      loading: data === null,
      ...d,
      pdfs,
      today,
      year,
      goal: goalDoc?.goal || 12,
      setGoal: (goal) => (goalDoc ? patch("goals", "reading-goals", goalDoc._id, { goal }) : create("goals", "reading-goals", { year, goal })),
      addBook: (b) => create("books", "library-books", { order: Date.now() % 1e9, status: "want", ...b }),
      updateBook: (id, changes) => patch("books", "library-books", id, changes),
      removeBook: async (book) => {
        remove("books", "library-books", book._id);
        d.logs.filter((l) => l.bookId === book._id).forEach((l) => remove("logs", "reading-logs", l._id));
        if (pdfs[pdfKey(book)]) {
          await api.deleteBook(pdfKey(book)).catch(() => {});
          loadPdfs();
        }
      },
      setPage,
      setStatus,
      pace,
      /** Add many books, then fill in author / pages / cover from Open Library in the background. */
      addMany: async (items, status = "want") => {
        let order = d.books.reduce((m, b) => Math.max(m, b.order || 0), 0) + 1;
        const have = new Set(d.books.map((b) => b.title.toLowerCase()));
        const fresh = items.filter((x) => x && !have.has(x.title.toLowerCase()));
        const saved = [];
        for (const it of fresh) saved.push(await create("books", "library-books", { ...it, status, order: order++, startedAt: status === "reading" ? today : "" }));
        saved.filter(Boolean).forEach(async (b) => {
          const info = await lookUpBook(b.title, b.author);
          if (!info) return;
          const ch = {};
          if (!b.author && info.author) ch.author = info.author;
          if (!b.pages && info.pages) ch.pages = info.pages;
          if (info.coverId) ch.coverId = info.coverId;
          if (info.year) ch.year = info.year;
          if (Object.keys(ch).length) patch("books", "library-books", b._id, ch);
        });
        return fresh.length;
      },
      // ---- PDFs ----
      uploadPdf: async (book, file, onProgress) => {
        if (file.type && file.type !== "application/pdf") throw new Error("Please choose a PDF file");
        await api.uploadBook(pdfKey(book), file, onProgress);
        await loadPdfs();
      },
      removePdf: async (book) => {
        await api.deleteBook(pdfKey(book));
        await loadPdfs();
      },
      /** Open the book's PDF in the reader at your page; moving forward saves your place. */
      readPdf: (book) => {
        const key = pdfKey(book);
        const pending = cachedBlob(key, pdfs[key]?.uploadedAt);
        let timer = null;
        openPdfReader(pending, {
          page: Math.max(1, book.page || 1),
          title: book.title,
          onPage: (page, total) => {
            const b = bookNow(book._id);
            if (!b) return;
            if (!b.pages && total) patch("books", "library-books", b._id, { pages: total });
            clearTimeout(timer);
            timer = setTimeout(() => {
              const cur = bookNow(book._id);
              if (cur && page > (cur.page || 0)) setPage(cur, page);
            }, 2500);
          },
        });
        pending.then((blob) => !blob && (closePdfReader(), toast("PDF not found — upload it again"))).catch(() => (closePdfReader(), toast("Couldn't open the PDF")));
      },
    };
  }, [data, pdfs, create, patch, remove, loadPdfs, toast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
