// A simple full-screen PDF reader (pdf.js), opened at a given page. Used inside
// the Android app, where the WebView has no PDF viewer of its own.
import { useCallback, useEffect, useRef, useState } from "react";

let pdfjsPromise = null;
function loadPdfjs() {
  // The worker is bundled by Vite as a plain .js file (some hosts serve .mjs with the wrong type).
  // pdf.js 4 "legacy" build: works on older Android WebViews too.
  pdfjsPromise ||= Promise.all([import("pdfjs-dist/legacy/build/pdf.mjs"), import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker")]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerPort = new worker.default();
    return lib;
  });
  return pdfjsPromise;
}

/** Mount once near the root; listens for openPdfReader() calls. */
export function PdfReaderHost() {
  const [doc, setDoc] = useState(null); // { blob, page, title }
  useEffect(() => {
    const on = (e) => setDoc(e.detail);
    window.addEventListener("lifeos:pdf", on);
    return () => window.removeEventListener("lifeos:pdf", on);
  }, []);
  if (!doc) return null;
  return <PdfReader key={doc.id} {...doc} onClose={() => setDoc(null)} />;
}

function PdfReader({ blob, page: startPage, title, onClose }) {
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(startPage || 1);
  const [input, setInput] = useState(String(startPage || 1));
  const [zoom, setZoom] = useState(1);
  const [rendering, setRendering] = useState(true);
  const canvas = useRef(null);
  const box = useRef(null);
  const task = useRef(null);
  const swipe = useRef(null);

  // Load the document.
  useEffect(() => {
    let alive = true;
    let loaded = null;
    (async () => {
      try {
        const lib = await loadPdfjs();
        const b = await blob; // may be a promise while the book downloads
        if (!b || !alive) return;
        const data = new Uint8Array(await b.arrayBuffer());
        loaded = await lib.getDocument({ data }).promise;
        if (!alive) return loaded.destroy();
        setPdf(loaded);
        setPage((p) => Math.min(Math.max(1, p), loaded.numPages));
      } catch (e) {
        if (alive) setError(e?.message || "Couldn't open this PDF");
      }
    })();
    return () => {
      alive = false;
      loaded?.destroy();
    };
  }, [blob]);

  // Draw the current page to fit the screen width (times the zoom).
  useEffect(() => {
    if (!pdf || !canvas.current || !box.current) return;
    let alive = true;
    setRendering(true);
    (async () => {
      try {
        const p = await pdf.getPage(page);
        if (!alive) return;
        const base = p.getViewport({ scale: 1 });
        const fit = (box.current.clientWidth - 16) / base.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const viewport = p.getViewport({ scale: fit * zoom * dpr });
        const c = canvas.current;
        c.width = Math.floor(viewport.width);
        c.height = Math.floor(viewport.height);
        c.style.width = `${Math.floor(viewport.width / dpr)}px`;
        c.style.height = `${Math.floor(viewport.height / dpr)}px`;
        task.current?.cancel();
        task.current = p.render({ canvasContext: c.getContext("2d"), viewport });
        await task.current.promise;
        if (alive) setRendering(false);
      } catch (e) {
        if (alive && e?.name !== "RenderingCancelledException") setError(e?.message || "Couldn't draw this page");
      }
    })();
    return () => {
      alive = false;
    };
  }, [pdf, page, zoom]);

  useEffect(() => setInput(String(page)), [page]);
  useEffect(() => {
    box.current?.scrollTo({ top: 0, left: 0 });
  }, [page]);

  const go = useCallback((n) => pdf && setPage(Math.min(pdf.numPages, Math.max(1, n))), [pdf]);

  // Keyboard (desktop) + Escape to close.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.target.tagName === "INPUT") return;
      else if (e.key === "ArrowRight" || e.key === "PageDown") (e.preventDefault(), go(page + 1));
      else if (e.key === "ArrowLeft" || e.key === "PageUp") (e.preventDefault(), go(page - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, page, onClose]);

  // Swipe left / right to turn pages (when not zoomed in).
  const onTouchStart = (e) => {
    swipe.current = zoom === 1 && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  };
  const onTouchEnd = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(t.clientY - s.y) * 1.5) go(page + (dx < 0 ? 1 : -1));
  };

  const btn = "grid h-10 min-w-10 place-items-center rounded-xl bg-white/10 px-2 text-[15px] font-bold text-white transition hover:bg-white/20 disabled:opacity-30";
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#101013] font-fin text-white" role="dialog" aria-modal="true" aria-label={title || "PDF"}>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <button onClick={onClose} className={btn} aria-label="Close">✕</button>
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</div>
        <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} disabled={zoom <= 1} className={btn} aria-label="Zoom out">−</button>
        <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))} disabled={zoom >= 3} className={btn} aria-label="Zoom in">+</button>
      </div>

      <div ref={box} className="relative flex-1 overflow-auto" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {error ? (
          <div className="grid h-full place-items-center p-8 text-center text-[15px] text-white/70">{error}</div>
        ) : (
          <>
            <canvas ref={canvas} className="mx-auto my-2 block bg-white shadow-xl" />
            {(rendering || !pdf) && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-white/10 px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
        <button onClick={() => go(page - 1)} disabled={!pdf || page <= 1} className={`${btn} px-4`}>‹ Prev</button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(parseInt(input, 10) || page);
            e.currentTarget.querySelector("input")?.blur();
          }}
          className="flex items-center gap-1.5 text-[14px] text-white/70"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            aria-label="Page number"
            className="w-14 rounded-lg bg-white/10 px-2 py-1.5 text-center font-semibold text-white outline-none focus:ring-2 focus:ring-white/40"
          />
          / {pdf?.numPages || "…"}
        </form>
        <button onClick={() => go(page + 1)} disabled={!pdf || page >= (pdf?.numPages || 1)} className={`${btn} px-4`}>Next ›</button>
      </div>
    </div>
  );
}
