// Library › Shelf, Notes and Stats.
import { useEffect, useRef, useState } from "react";
import { haptic } from "../../../lib/inApp.js";
import { EmptyState, FinCard, Icon, IconButton, PrimaryButton, Ring, Segmented, Sheet } from "../../finances/fin-ui.jsx";
import { Bars } from "../../fitness/fit-ui.jsx";
import { addDays, isoDate, parseISO } from "../../finances/lib";
import { AutoText, COL } from "../journal/TodayView.jsx";
import { Chips } from "../mind/MindViews.jsx";
import { parseLine, pdfKey, useLibrary } from "./LibraryContext.jsx";

const GRID3 = "grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0";
const GRID2 = "grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0";
const kicker = "mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted";
const field = "w-full rounded-2xl bg-fin-input px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50";
const fmtDate = (iso) => (iso ? parseISO(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const pct = (b) => (b.pages ? Math.min(100, Math.round(((b.page || 0) / b.pages) * 100)) : 0);
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

// ---------- covers ----------
const PALETTE = [
  ["#7c5ce6", "#3b2a7a"],
  ["#e0785a", "#7a2f1f"],
  ["#3fae8c", "#18574a"],
  ["#d9a441", "#6e4c12"],
  ["#4f8de0", "#1d3f75"],
  ["#c25a9a", "#5e2149"],
];
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function Cover({ book, w = 56 }) {
  const [broken, setBroken] = useState(false);
  const h = Math.round(w * 1.5);
  if (book.coverId && !broken) {
    return (
      <img
        src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-md object-cover shadow-lg ring-1 ring-white/10"
        style={{ width: w, height: h }}
      />
    );
  }
  const [a, b] = PALETTE[hash(book.title) % PALETTE.length];
  return (
    <div
      className="flex shrink-0 flex-col justify-between overflow-hidden rounded-md p-1.5 shadow-lg ring-1 ring-white/10"
      style={{ width: w, height: h, background: `linear-gradient(160deg, ${a}, ${b})` }}
      aria-hidden="true"
    >
      <div className="line-clamp-4 font-bold leading-tight text-white" style={{ fontSize: Math.max(7, w / 7) }}>
        {book.title}
      </div>
      {w >= 56 && <div className="truncate text-white/70" style={{ fontSize: Math.max(6, w / 10) }}>{book.author}</div>}
    </div>
  );
}

function Stars({ value, onChange, size = 20 }) {
  return (
    <div className="flex gap-0.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          disabled={!onChange}
          onClick={() => onChange?.(value === n ? 0 : n)}
          className={`leading-none transition ${n <= value ? "text-amber-300" : "text-white/15"} ${onChange ? "hover:scale-110" : ""}`}
          style={{ fontSize: size }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ---------- page updater ----------
function PageInput({ book, compact }) {
  const L = useLibrary();
  const [v, setV] = useState(String(book.page || ""));
  useEffect(() => setV(String(book.page || "")), [book.page]);
  const save = () => {
    if (v === String(book.page || "")) return;
    L.setPage(book, v);
    haptic();
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] text-fin-muted">Page</span>
      <input
        value={v}
        inputMode="numeric"
        aria-label={`Current page of ${book.title}`}
        onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 5))}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="w-16 rounded-xl bg-fin-input px-2 py-1.5 text-center text-[15px] font-semibold text-white outline-none focus:ring-2 focus:ring-fin-accent/50"
      />
      {book.pages > 0 && <span className="text-[13px] text-fin-muted">/ {book.pages}</span>}
      {!compact && (
        <button onClick={() => (L.setPage(book, (book.page || 0) + 10), haptic())} className="ml-auto rounded-xl bg-fin-tile px-2.5 py-1.5 text-[13px] font-semibold">
          +10
        </button>
      )}
    </div>
  );
}

function ReadingCard({ book, onOpen }) {
  const L = useLibrary();
  const p = L.pace(book);
  const hasPdf = Boolean(L.pdfs[pdfKey(book)]);
  const done = book.pages && book.page >= book.pages;
  return (
    <FinCard>
      <div className="flex gap-3.5">
        <button onClick={onOpen} aria-label={`Open ${book.title}`}>
          <Cover book={book} w={64} />
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={onOpen} className="block text-left">
            <div className="line-clamp-2 text-[16px] font-bold leading-snug">{book.title}</div>
            <div className="truncate text-[13px] text-fin-muted">{book.author || "Unknown author"}</div>
          </button>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fin-input">
            <div className="h-full rounded-full bg-fin-accent transition-all duration-500" style={{ width: `${pct(book)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[12px] text-fin-muted">
            <span>{book.pages ? `${pct(book)}%` : "Add the page count"}</span>
            <span>
              {p.daysLeft != null && !done ? `≈ ${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"} left at ${Math.max(1, Math.round(p.perDay))} p/day` : p.left != null && !done ? `${p.left} pages left` : ""}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <PageInput book={book} />
      </div>
      <div className="mt-3 flex gap-2">
        {hasPdf ? (
          <button onClick={() => L.readPdf(book)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-fin-accent/15 py-2 text-[13.5px] font-semibold text-fin-accent hover:bg-fin-accent/25">
            <Icon name="book" size={15} /> Read{book.page ? ` from p. ${book.page}` : ""}
          </button>
        ) : (
          <button onClick={onOpen} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-fin-input py-2 text-[13.5px] font-semibold text-white/70 hover:bg-fin-tile">
            <Icon name="upload" size={15} /> Add PDF
          </button>
        )}
        {done ? (
          <button onClick={() => L.setStatus(book, "finished")} className="rounded-xl bg-emerald-400/15 px-3 py-2 text-[13.5px] font-semibold text-emerald-300">
            ✓ Finished
          </button>
        ) : (
          <button onClick={onOpen} className="rounded-xl bg-fin-tile px-3 py-2 text-[13.5px] font-semibold">
            Notes
          </button>
        )}
      </div>
    </FinCard>
  );
}

// ---------- add books ----------
function AddSheet({ open, onClose }) {
  const L = useLibrary();
  const [mode, setMode] = useState("list");
  const [text, setText] = useState("");
  const [one, setOne] = useState({ title: "", author: "", pages: "" });
  const [status, setStatus] = useState("want");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setText("");
      setOne({ title: "", author: "", pages: "" });
      setStatus("want");
      setBusy(false);
    }
  }, [open]);
  const items = mode === "list" ? text.split("\n").map(parseLine).filter(Boolean) : one.title.trim() ? [{ title: one.title.trim(), author: one.author.trim(), pages: Number(one.pages) || 0 }] : [];
  const add = async () => {
    setBusy(true);
    await L.addMany(items, status);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add books"
      footer={
        <PrimaryButton className="flex-1" disabled={!items.length || busy} onClick={add}>
          {busy ? "Adding…" : `Add ${items.length || ""} ${items.length === 1 ? "book" : "books"}`}
        </PrimaryButton>
      }
    >
      <Segmented
        className="mb-4 [&_button]:!py-1.5 [&_button]:!text-[13.5px]"
        value={mode}
        onChange={setMode}
        options={[
          { value: "list", label: "Paste a list" },
          { value: "one", label: "One book" },
        ]}
      />
      {mode === "list" ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            placeholder={"One book per line. Add the author after a dash if you know it:\nAtomic Habits — James Clear\nIkigai"}
            className={`${field} resize-none leading-relaxed`}
          />
          <p className="mt-2 text-[12.5px] leading-relaxed text-fin-faint">Authors, page counts and covers are filled in automatically from Open Library when it can find the book. You can fix anything later.</p>
        </>
      ) : (
        <div className="space-y-2">
          <input value={one.title} onChange={(e) => setOne({ ...one, title: e.target.value })} placeholder="Title" maxLength={200} className={field} />
          <input value={one.author} onChange={(e) => setOne({ ...one, author: e.target.value })} placeholder="Author (optional)" maxLength={150} className={field} />
          <input value={one.pages} onChange={(e) => setOne({ ...one, pages: e.target.value.replace(/\D/g, "").slice(0, 5) })} inputMode="numeric" placeholder="Pages (optional)" className={field} />
        </div>
      )}
      <div className={`${kicker} mt-4`}>Put on</div>
      <Chips
        options={[
          { value: "want", label: "Want to read" },
          { value: "reading", label: "Reading now" },
        ]}
        value={status}
        onChange={setStatus}
        label="Shelf"
      />
      <div className="h-2" />
    </Sheet>
  );
}

// ---------- book details ----------
function PdfBox({ book }) {
  const L = useLibrary();
  const input = useRef(null);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");
  const info = L.pdfs[pdfKey(book)];
  const upload = async (file) => {
    if (!file) return;
    setErr("");
    setBusy(0);
    try {
      await L.uploadPdf(book, file, (p) => setBusy(p));
    } catch (e) {
      setErr(e.message || "Upload failed");
    }
    setBusy(null);
  };
  return (
    <div className="rounded-2xl bg-fin-input p-3.5">
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      {busy != null ? (
        <div>
          <div className="mb-1.5 text-[13.5px] font-semibold">Uploading… {Math.round(busy * 100)}%</div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
            <div className="h-full bg-fin-accent transition-all" style={{ width: `${busy * 100}%` }} />
          </div>
        </div>
      ) : info ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">📄 {info.name}</div>
            <div className="text-[12px] text-fin-muted">{mb(info.size)} · only you can open it</div>
          </div>
          <button onClick={() => L.readPdf(book)} className="rounded-xl bg-fin-accent px-3.5 py-2 text-[13.5px] font-bold text-[#160f2b]">
            Read
          </button>
          <button onClick={() => input.current?.click()} className="rounded-xl bg-fin-tile px-3 py-2 text-[13px] font-semibold">
            Replace
          </button>
          <IconButton icon="trash" label="Remove PDF" onClick={() => L.removePdf(book).catch(() => setErr("Couldn't remove it"))} />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-[13.5px] text-fin-muted">Have the PDF? Upload it to read here — your place is saved as you turn pages.</div>
          <button onClick={() => input.current?.click()} disabled={String(book._id).startsWith("tmp")} className="shrink-0 rounded-xl bg-fin-tile px-3.5 py-2 text-[13.5px] font-semibold disabled:opacity-40">
            Upload PDF
          </button>
        </div>
      )}
      {err && <div className="mt-2 text-[12.5px] text-rose-300">{err}</div>}
    </div>
  );
}

function Highlights({ book }) {
  const L = useLibrary();
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const list = book.highlights || [];
  const save = (next) => L.updateBook(book._id, { highlights: next.map(({ text, page, note, at }) => ({ text, page: page || 0, note: note || "", at: at || "" })) });
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          save([{ text: text.trim().slice(0, 2000), page: Number(page) || 0, at: L.today }, ...list]);
          setText("");
          setPage("");
        }}
      >
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="A line worth keeping…" className={`${field} resize-none`} />
        <div className="mt-2 flex gap-2">
          <input value={page} onChange={(e) => setPage(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" placeholder="Page" className={`${field} !w-24`} />
          <button disabled={!text.trim()} className="rounded-2xl bg-fin-tile px-4 text-[14px] font-semibold disabled:opacity-40">
            Save highlight
          </button>
        </div>
      </form>
      {list.length > 0 && (
        <div className="mt-3 space-y-2">
          {list.map((h, i) => (
            <div key={i} className="group flex gap-2 rounded-xl border-l-[3px] border-fin-accent bg-fin-input px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="selectable text-[14px] leading-relaxed text-white/90">“{h.text}”</p>
                <div className="mt-1 text-[11.5px] text-fin-faint">
                  {h.page ? `p. ${h.page}` : ""}
                  {h.page && h.at ? " · " : ""}
                  {h.at ? fmtDate(h.at) : ""}
                </div>
              </div>
              <IconButton icon="trash" label="Delete highlight" size={15} className="opacity-50 hover:opacity-100" onClick={() => save(list.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookSheet({ id, onClose }) {
  const L = useLibrary();
  const book = id && L.books.find((b) => b._id === id);
  const [confirm, setConfirm] = useState(false);
  const [meta, setMeta] = useState({ title: "", author: "", pages: "" });
  useEffect(() => {
    setConfirm(false);
    if (book) setMeta({ title: book.title, author: book.author || "", pages: book.pages ? String(book.pages) : "" });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!book) return <Sheet open={false} onClose={onClose} />;
  const saveMeta = () => {
    const ch = {};
    if (meta.title.trim() && meta.title.trim() !== book.title) ch.title = meta.title.trim();
    if (meta.author.trim() !== (book.author || "")) ch.author = meta.author.trim();
    const pages = Number(meta.pages) || 0;
    if (pages !== (book.pages || 0)) ch.pages = pages;
    if (Object.keys(ch).length) L.updateBook(book._id, ch);
  };
  const inline = "w-full rounded-xl bg-transparent px-1 py-0.5 outline-none hover:bg-fin-input focus:bg-fin-input focus:ring-2 focus:ring-fin-accent/40";
  return (
    <Sheet open onClose={onClose} title="Book" wide>
      <div className="grid gap-5 pb-3 sm:grid-cols-[1fr_1.15fr]">
        <div className="min-w-0">
          <div className="flex gap-4">
            <Cover book={book} w={92} />
            <div className="min-w-0 flex-1">
              <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} onBlur={saveMeta} aria-label="Title" maxLength={200} className={`${inline} text-[19px] font-extrabold`} />
              <input value={meta.author} onChange={(e) => setMeta({ ...meta, author: e.target.value })} onBlur={saveMeta} aria-label="Author" placeholder="Author" maxLength={150} className={`${inline} text-[14px] text-fin-muted`} />
              <div className="mt-1 flex items-center gap-1 px-1 text-[13px] text-fin-muted">
                <input
                  value={meta.pages}
                  onChange={(e) => setMeta({ ...meta, pages: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                  onBlur={saveMeta}
                  inputMode="numeric"
                  aria-label="Total pages"
                  placeholder="?"
                  className="w-14 rounded-lg bg-fin-input px-2 py-1 text-center text-white outline-none"
                />
                pages{book.year ? ` · ${book.year}` : ""}
              </div>
              {book.status === "finished" && (
                <div className="mt-2 px-1">
                  <Stars value={book.rating || 0} onChange={(rating) => L.updateBook(book._id, { rating })} />
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Segmented
              className="[&_button]:!py-1.5 [&_button]:!text-[13px]"
              value={book.status}
              onChange={(s) => L.setStatus(book, s)}
              options={[
                { value: "want", label: "Want" },
                { value: "reading", label: "Reading" },
                { value: "finished", label: "Finished" },
                { value: "dropped", label: "Dropped" },
              ]}
            />
            <div className="mt-1.5 text-[12px] text-fin-faint">
              {book.startedAt ? `Started ${fmtDate(book.startedAt)}` : ""}
              {book.finishedAt ? ` · finished ${fmtDate(book.finishedAt)}` : ""}
            </div>
          </div>
          {book.status === "reading" && (
            <div className="mt-3">
              <PageInput book={book} />
            </div>
          )}
          <div className="mt-4">
            <PdfBox book={book} />
          </div>
          <div className={`${kicker} mt-4`}>Why I want to read this</div>
          <AutoText rows={2} max={1000} value={book.why} placeholder="What do you hope to get from it?" onSave={(why) => L.updateBook(book._id, { why })} />
        </div>
        <div className="min-w-0">
          <div className={kicker}>Key lessons</div>
          <AutoText rows={4} max={10000} value={book.lessons} placeholder="The ideas you want to remember and use — in your own words." onSave={(lessons) => L.updateBook(book._id, { lessons })} />
          <div className={`${kicker} mt-4`}>Highlights ({(book.highlights || []).length})</div>
          <Highlights book={book} />
          <div className="mt-6">
            {confirm ? (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 px-3 py-2.5 text-[13.5px]">
                <span className="flex-1 text-rose-200">Remove this book, its notes{L.pdfs[pdfKey(book)] ? " and its PDF" : ""}?</span>
                <button onClick={() => setConfirm(false)} className="rounded-lg px-2 py-1 text-white/70">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    L.removeBook(book);
                    onClose();
                  }}
                  className="rounded-lg bg-rose-500 px-3 py-1 font-semibold"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)} className="text-[13px] text-rose-300/70 hover:text-rose-300">
                Remove from library
              </button>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// ---------- goal ----------
function GoalCard() {
  const L = useLibrary();
  const [edit, setEdit] = useState(false);
  const done = L.books.filter((b) => b.status === "finished" && b.finishedAt?.startsWith(String(L.year))).length;
  const dayOfYear = Math.round((parseISO(L.today) - parseISO(`${L.year}-01-01`)) / 86400000) + 1;
  const expected = Math.round((L.goal * dayOfYear) / 365);
  return (
    <FinCard title={`${L.year} reading goal`} action={<button onClick={() => setEdit((e) => !e)} className="text-[13px] font-semibold text-fin-accent">{edit ? "Done" : "Change"}</button>}>
      <div className="flex items-center gap-4">
        <Ring value={done} max={L.goal} color="rgb(167 139 250)" size={92} stroke={9}>
          <div className="text-center leading-none">
            <div className="tabular text-[24px] font-extrabold">{done}</div>
            <div className="text-[11px] text-fin-muted">of {L.goal}</div>
          </div>
        </Ring>
        <div className="text-[13.5px] leading-relaxed text-white/80">
          {done >= L.goal ? "Goal reached 🎉" : done >= expected ? "On track — nice." : `${expected - done} behind pace. One short book catches you up.`}
          <div className="text-[12.5px] text-fin-muted">That's about one book every {Math.max(1, Math.round(52 / L.goal))} week{Math.round(52 / L.goal) === 1 ? "" : "s"}.</div>
        </div>
      </div>
      {edit && (
        <div className="mt-3">
          <Chips options={[6, 12, 18, 24, 36, 52].map((n) => ({ value: n, label: `${n} books` }))} value={L.goal} onChange={L.setGoal} label="Books this year" />
        </div>
      )}
    </FinCard>
  );
}

// ============================== Shelf ==============================
function ShelfRow({ b, onOpen, children }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5 transition hover:bg-fin-input">
      <button onClick={() => onOpen(b._id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Cover book={b} w={38} />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[14.5px] font-semibold leading-snug">{b.title}</div>
          <div className="truncate text-[12.5px] text-fin-muted">
            {b.author || "—"}
            {b.pages ? ` · ${b.pages} p` : ""}
          </div>
        </div>
      </button>
      {children}
    </div>
  );
}

export function LibraryShelf() {
  const L = useLibrary();
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const by = (s) => L.books.filter((b) => b.status === s);
  const reading = by("reading");
  const want = [...by("want")].sort((a, b) => (a.order || 0) - (b.order || 0));
  const finished = [...by("finished")].sort((a, b) => (b.finishedAt || "").localeCompare(a.finishedAt || ""));
  const dropped = by("dropped");
  const storage = Object.values(L.pdfs).reduce((a, p) => a + (p.size || 0), 0);

  if (!L.loading && L.books.length === 0) {
    return (
      <>
        <FinCard>
          <EmptyState icon="book">
            Your shelf is empty. Paste your reading list — authors, page counts and covers fill in by themselves.
            <PrimaryButton className="mt-4" onClick={() => setAdding(true)}>
              Add books
            </PrimaryButton>
          </EmptyState>
        </FinCard>
        <AddSheet open={adding} onClose={() => setAdding(false)} />
      </>
    );
  }
  return (
    <>
      <div className={GRID3}>
        <div className={COL}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Reading now · {reading.length}</h2>
          </div>
          {reading.length === 0 ? (
            <FinCard>
              <p className="text-[14px] leading-relaxed text-fin-muted">Nothing on the go. Pick one from “Want to read” and tap Start.</p>
            </FinCard>
          ) : (
            reading.map((b) => <ReadingCard key={b._id} book={b} onOpen={() => setOpen(b._id)} />)
          )}
        </div>
        <div className={COL}>
          <FinCard
            title={`Want to read · ${want.length}`}
            action={
              <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold">
                <Icon name="plus" size={15} /> Add
              </button>
            }
          >
            {want.length === 0 ? (
              <p className="text-[14px] text-fin-muted">Add books you'd like to read next.</p>
            ) : (
              <div className="space-y-0.5">
                {want.map((b) => (
                  <ShelfRow key={b._id} b={b} onOpen={setOpen}>
                    <button onClick={() => (L.setStatus(b, "reading"), haptic())} className="shrink-0 rounded-xl bg-fin-accent/15 px-3 py-1.5 text-[13px] font-semibold text-fin-accent hover:bg-fin-accent/25">
                      Start
                    </button>
                  </ShelfRow>
                ))}
              </div>
            )}
          </FinCard>
        </div>
        <div className={COL}>
          <GoalCard />
          <FinCard title={`Finished · ${finished.length}`}>
            {finished.length === 0 ? (
              <p className="text-[14px] text-fin-muted">Books you finish land here, with your rating and notes.</p>
            ) : (
              <div className="space-y-0.5">
                {finished.map((b) => (
                  <ShelfRow key={b._id} b={b} onOpen={setOpen}>
                    <div className="shrink-0 text-right">
                      <Stars value={b.rating || 0} size={13} />
                      <div className="text-[11px] text-fin-faint">{b.finishedAt ? parseISO(b.finishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</div>
                    </div>
                  </ShelfRow>
                ))}
              </div>
            )}
          </FinCard>
          {dropped.length > 0 && (
            <FinCard title={`Dropped · ${dropped.length}`}>
              <div className="space-y-0.5">
                {dropped.map((b) => (
                  <ShelfRow key={b._id} b={b} onOpen={setOpen} />
                ))}
              </div>
            </FinCard>
          )}
          {storage > 0 && <p className="px-1 text-[12px] text-fin-faint">Your PDFs use {mb(storage)} of server space. Upload the ones you're reading; remove them when you're done.</p>}
        </div>
      </div>
      <BookSheet id={open} onClose={() => setOpen(null)} />
      <AddSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

// ============================== Notes ==============================
export function LibraryNotes() {
  const L = useLibrary();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const s = q.trim().toLowerCase();
  const withNotes = L.books
    .filter((b) => (b.highlights || []).length || (b.lessons || "").trim())
    .map((b) => ({
      b,
      hl: (b.highlights || []).filter((h) => !s || h.text.toLowerCase().includes(s) || (h.note || "").toLowerCase().includes(s)),
      lessons: !s || (b.lessons || "").toLowerCase().includes(s) || b.title.toLowerCase().includes(s) ? b.lessons : "",
    }))
    .filter((x) => x.hl.length || (x.lessons || "").trim());
  const cols = [[], []];
  withNotes.forEach((x, i) => cols[i % 2].push(x));
  const total = L.books.reduce((a, b) => a + (b.highlights || []).length, 0);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your highlights and lessons" className={`${field} max-w-[460px]`} />
        <span className="text-[13px] text-fin-muted">{total} highlights</span>
      </div>
      {withNotes.length === 0 ? (
        <FinCard>
          <EmptyState icon="edit">{s ? `Nothing matches “${q.trim()}”.` : "Open any book to save highlights and the lessons you want to remember. They all collect here."}</EmptyState>
        </FinCard>
      ) : (
        <div className={GRID2}>
          {cols.map((c, ci) => (
            <div key={ci} className={`${COL} lg:h-[calc(100dvh-240px)]`}>
              {c.map(({ b, hl, lessons }) => (
                <FinCard key={b._id}>
                  <button onClick={() => setOpen(b._id)} className="flex w-full items-center gap-3 text-left">
                    <Cover book={b} w={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold">{b.title}</div>
                      <div className="truncate text-[12.5px] text-fin-muted">{b.author}</div>
                    </div>
                    <Icon name="right" size={16} className="text-fin-faint" />
                  </button>
                  {(lessons || "").trim() && <p className="selectable mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-white/85">{lessons}</p>}
                  {hl.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {hl.map((h, i) => (
                        <p key={i} className="selectable border-l-[3px] border-fin-accent pl-3 text-[14px] italic leading-relaxed text-white/80">
                          “{h.text}” {h.page ? <span className="not-italic text-fin-faint">p. {h.page}</span> : null}
                        </p>
                      ))}
                    </div>
                  )}
                </FinCard>
              ))}
            </div>
          ))}
        </div>
      )}
      <BookSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
}

// ============================== Stats ==============================
export function LibraryStats() {
  const L = useLibrary();
  const y = String(L.year);
  const finished = L.books.filter((b) => b.status === "finished");
  const thisYear = finished.filter((b) => b.finishedAt?.startsWith(y));
  const pagesYear = L.logs.filter((l) => l.date.startsWith(y)).reduce((a, l) => a + l.pages, 0);
  const months = Array.from({ length: 12 }, (_, m) => ({
    label: new Date(L.year, m, 1).toLocaleDateString("en-IN", { month: "short" }),
    value: thisYear.filter((b) => Number(b.finishedAt.slice(5, 7)) === m + 1).length,
  }));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = isoDate(addDays(parseISO(L.today), i - 29));
    return { label: parseISO(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value: L.logs.filter((l) => l.date === d).reduce((a, l) => a + l.pages, 0) };
  });
  const last30 = days.reduce((a, d) => a + d.value, 0);
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].value) streak++;
    else if (i === days.length - 1) continue;
    else break;
  }
  const rated = finished.filter((b) => b.rating);
  const top = [...rated].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const tile = (label, v) => (
    <div className="rounded-2xl bg-fin-input px-3 py-2.5">
      <div className="text-[12.5px] text-fin-muted">{label}</div>
      <div className="tabular text-[24px] font-extrabold">{v}</div>
    </div>
  );
  return (
    <div className={GRID3}>
      <div className={COL}>
        <GoalCard />
        <FinCard title={`Finished in ${y}`}>
          <Bars data={months} height={100} format={(v) => `${v} book${v === 1 ? "" : "s"}`} />
          <div className="mt-1 flex justify-between text-[10.5px] text-fin-faint">
            {months.map((m) => (
              <span key={m.label} className="flex-1 text-center">
                {m.label[0]}
              </span>
            ))}
          </div>
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard title="Pages, last 30 days">
          <Bars data={days} height={110} format={(v) => `${v} pages`} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {tile("Pages", last30)}
            {tile("Per day", Math.round(last30 / 30))}
            {tile("Streak", `${streak}d`)}
          </div>
          <p className="mt-2 text-[12.5px] text-fin-faint">Pages count when you update your page or read a PDF here.</p>
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard title="All time">
          <div className="grid grid-cols-2 gap-2">
            {tile("Books finished", finished.length)}
            {tile(`Pages in ${y}`, pagesYear)}
            {tile("On the shelf", L.books.filter((b) => b.status === "want").length)}
            {tile("Avg rating", rated.length ? `${(rated.reduce((a, b) => a + b.rating, 0) / rated.length).toFixed(1)}★` : "—")}
          </div>
        </FinCard>
        {top.length > 0 && (
          <FinCard title="Your favourites">
            <div className="space-y-2">
              {top.map((b) => (
                <div key={b._id} className="flex items-center gap-3">
                  <Cover book={b} w={30} />
                  <div className="min-w-0 flex-1 truncate text-[14px] font-semibold">{b.title}</div>
                  <Stars value={b.rating} size={13} />
                </div>
              ))}
            </div>
          </FinCard>
        )}
      </div>
    </div>
  );
}
