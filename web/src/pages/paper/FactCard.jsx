import { useState } from "react";
import { useToast } from "../../components/Toast.jsx";
import { BooksSheet, openBook, useBooks } from "./books.jsx";
import { BOOKS, FACTS, UNITS, dayNumber } from "./facts.js";
import { FinCard, Icon, IconButton } from "../finances/fin-ui.jsx";

// Today's lesson; you can step back through earlier ones (not ahead).
export default function FactCard({ today }) {
  const day = dayNumber(today);
  const latest = Math.min(day, FACTS.length); // lesson unlocked today
  const [n, setN] = useState(latest);
  const f = FACTS[n - 1];
  const finished = day > FACTS.length;
  const books = useBooks();
  const showToast = useToast();
  const [sheet, setSheet] = useState(null); // { focus, then }

  async function readMore(r) {
    const have = books.byKey[r.book];
    if (books.list && !have) return setSheet({ focus: r.book, then: r });
    try {
      const res = await openBook(r.book, r.page, have?.uploadedAt);
      if (res === "missing") {
        books.reload();
        setSheet({ focus: r.book, then: r });
      }
    } catch (err) {
      showToast(err.message || "Couldn't open the book", true);
    }
  }

  return (
    <FinCard
      delay={60}
      title={
        <span className="flex items-center gap-2">
          <Icon name="sparkle" size={16} /> Tech fact · Day {n}
          <span className="normal-case tracking-normal text-fin-faint">· {UNITS[f.unit]}</span>
        </span>
      }
      action={
        <div className="flex items-center">
          <IconButton icon="left" label="Previous lesson" onClick={() => setN((x) => Math.max(1, x - 1))} className={`!h-8 !w-8 ${n <= 1 ? "pointer-events-none opacity-25" : ""}`} size={16} />
          <span className="tabular w-12 text-center text-[12px] text-fin-faint">
            {n}/{FACTS.length}
          </span>
          <IconButton icon="right" label="Next lesson" onClick={() => setN((x) => Math.min(latest, x + 1))} className={`!h-8 !w-8 ${n >= latest ? "pointer-events-none opacity-25" : ""}`} size={16} />
        </div>
      }
    >
      <div key={n} className="animate-fade-in">
        <h3 className="font-paper text-[21px] font-bold leading-tight text-[#f3e6c4]">{f.title}</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/85">{f.body}</p>
        <div className="mt-2.5 rounded-xl bg-fin-input px-3 py-2 font-mono text-[13px] text-fin-accent">{f.formula}</div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-fin-muted">
          <span className="font-semibold text-white/75">Example: </span>
          {f.example}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-fin-faint">
          <button onClick={() => setSheet({})} title="Your reference books" aria-label="Your reference books" className="-m-1 rounded-md p-1 hover:bg-white/5 hover:text-white">
            <Icon name="book" size={14} />
          </button>
          {f.refs?.length ? (
            <>
              <span>Read more:</span>
              {f.refs.map((r, i) => (
                <button
                  key={i}
                  onClick={() => readMore(r)}
                  title={`Open ${BOOKS[r.book]?.title} at page ${r.page}`}
                  className="group inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-fin-accent/10"
                >
                  <span className="font-semibold text-white/70 group-hover:text-fin-accent">{BOOKS[r.book]?.short}</span>
                  <span className="group-hover:text-fin-accent">ch {r.ch}, p {r.page}</span>
                  <Icon name="external" size={11} className="opacity-60 group-hover:text-fin-accent group-hover:opacity-100" />
                </button>
              ))}
            </>
          ) : (
            <span>From general chip-test practice — not covered in your books.</span>
          )}
        </div>
        {n === latest && finished && <p className="mt-2 text-[12px] text-fin-faint">You've reached the end of the course for now — more lessons coming.</p>}
      </div>
      <BooksSheet open={!!sheet} onClose={() => setSheet(null)} books={books} focus={sheet?.focus} then={sheet?.then} />
    </FinCard>
  );
}
