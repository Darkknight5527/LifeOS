// Your reference-book PDFs: stored privately on the LifeOS server (only you,
// logged in, can fetch them) and kept in this browser's cache after the first
// open, so later "Read more" clicks open instantly at the right page.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../components/Toast.jsx";
import { BOOKS } from "./facts.js";
import { GhostButton, Icon, PrimaryButton, Sheet } from "../finances/fin-ui.jsx";
import { IN_APP, closePdfReader, openPdfReader } from "../../lib/inApp.js";

const CACHE = "lifeos-books-v1";
const LIST_KEY = "lifeos_books_cache_v1";
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

export function useBooks() {
  const [list, setList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LIST_KEY) || "null");
    } catch {
      return null;
    }
  });
  const reload = useCallback(async () => {
    try {
      const l = await api.books();
      setList(l);
      try {
        localStorage.setItem(LIST_KEY, JSON.stringify(l));
      } catch {
        /* ignore */
      }
    } catch {
      /* keep what we had */
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  const byKey = Object.fromEntries((list || []).map((b) => [b.key, b]));
  return { list, byKey, reload };
}

async function cachedBlob(key, version) {
  const id = `/book/${key}?v=${encodeURIComponent(version || "")}`;
  let cache = null;
  try {
    cache = await caches.open(CACHE);
    const hit = await cache.match(id);
    if (hit) return hit.blob();
  } catch {
    cache = null;
  }
  const res = await api.bookFile(key);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Couldn't load the book (${res.status})`);
  const blob = await res.blob();
  if (cache) {
    try {
      // drop older versions of this book, then keep this one
      for (const req of await cache.keys()) if (new URL(req.url).pathname === `/book/${key}`) await cache.delete(req);
      await cache.put(id, new Response(blob, { headers: { "Content-Type": "application/pdf" } }));
    } catch {
      /* cache full or unavailable — fine */
    }
  }
  return blob;
}

/**
 * Open a book at a printed page. Must be called straight from a click
 * (the tab is opened immediately so the browser doesn't block it).
 * Returns "missing" if the book hasn't been uploaded yet.
 */
export async function openBook(key, printedPage, version) {
  const book = BOOKS[key];
  const pdfPage = Math.max(1, printedPage + (book?.offset || 0));
  if (IN_APP) {
    // The app's WebView has no PDF viewer — use our own reader.
    const pending = cachedBlob(key, version);
    openPdfReader(pending, { page: pdfPage, title: `${book?.short || "Book"} · page ${printedPage}` });
    try {
      if (!(await pending)) {
        closePdfReader();
        return "missing";
      }
    } catch (err) {
      closePdfReader();
      throw err;
    }
    return "ok";
  }
  const win = window.open("", "_blank");
  if (win) {
    win.document.title = `${book?.short || "Book"} · p ${printedPage}`;
    win.document.body.style.cssText = "margin:0;background:#111;color:#bbb;font:15px system-ui;display:grid;place-items:center;height:100vh";
    win.document.body.textContent = `Opening ${book?.short || "book"} at page ${printedPage}…`;
  }
  try {
    const blob = await cachedBlob(key, version);
    if (!blob) {
      win?.close();
      return "missing";
    }
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = `${url}#page=${pdfPage}`;
    else window.location.href = `${url}#page=${pdfPage}`;
    setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
    return "ok";
  } catch (err) {
    win?.close();
    throw err;
  }
}

/** Manage the three PDFs: upload, replace, see what's there. */
export function BooksSheet({ open, onClose, books, focus, then }) {
  const showToast = useToast();
  const [busy, setBusy] = useState(null); // { key, p }
  const inputs = useRef({});

  async function upload(key, file) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") return showToast("Please choose a PDF file", true);
    setBusy({ key, p: 0 });
    try {
      await api.uploadBook(key, file, (p) => setBusy({ key, p }));
      await books.reload();
      showToast(`${BOOKS[key].short} uploaded`);
    } catch (err) {
      showToast(err.message || "Upload failed", true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Your reference books"
      footer={
        then && books.byKey[then.book] ? (
          <PrimaryButton className="flex-1 !text-black" onClick={() => { openBook(then.book, then.page, books.byKey[then.book]?.uploadedAt); onClose(); }}>
            Open {BOOKS[then.book].short} at page {then.page}
          </PrimaryButton>
        ) : (
          <GhostButton className="flex-1" onClick={onClose}>Done</GhostButton>
        )
      }
    >
      <p className="mb-4 text-[13.5px] leading-relaxed text-fin-muted">
        Upload your own copy of each book once. It's stored privately on your LifeOS server — only you, logged in, can open it — and "Read more" then jumps straight to the right page.
      </p>
      <div className="space-y-2.5">
        {Object.entries(BOOKS).map(([key, b]) => {
          const have = books.byKey[key];
          const up = busy?.key === key;
          return (
            <div key={key} className={`rounded-2xl border px-4 py-3 ${focus === key ? "border-fin-accent/60 bg-fin-accent/5" : "border-fin-line bg-fin-input"}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${have ? "bg-fin-accent/15 text-fin-accent" : "bg-white/5 text-fin-faint"}`}>
                  <Icon name={have ? "check" : "book"} size={18} stroke={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold">{b.short}</div>
                  <div className="truncate text-[12px] text-fin-muted">{have ? `Uploaded · ${mb(have.size)}` : b.title}</div>
                </div>
                <input
                  ref={(el) => (inputs.current[key] = el)}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    upload(key, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  disabled={!!busy}
                  onClick={() => inputs.current[key]?.click()}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-[13px] font-semibold transition disabled:opacity-40 ${have ? "bg-fin-tile hover:bg-[#30303a]" : "bg-fin-accent text-black hover:brightness-110"}`}
                >
                  {up ? `${Math.round(busy.p * 100)}%` : have ? "Replace" : "Upload"}
                </button>
              </div>
              {up && (
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/30">
                  <div className="h-full rounded-full bg-fin-accent transition-[width]" style={{ width: `${Math.max(3, busy.p * 100)}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-fin-faint">
        Use the same editions (listed above) so the page numbers line up. The first open downloads the book; after that it opens from this browser's cache.
      </p>
    </Sheet>
  );
}
