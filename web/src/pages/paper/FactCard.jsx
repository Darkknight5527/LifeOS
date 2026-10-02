import { useState } from "react";
import { BOOKS, FACTS, UNITS, dayNumber } from "./facts.js";
import { FinCard, Icon, IconButton } from "../finances/fin-ui.jsx";

// Today's lesson; you can step back through earlier ones (not ahead).
export default function FactCard({ today }) {
  const day = dayNumber(today);
  const latest = Math.min(day, FACTS.length); // lesson unlocked today
  const [n, setN] = useState(latest);
  const f = FACTS[n - 1];
  const finished = day > FACTS.length;

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
        <div className="mt-2 flex items-start gap-1.5 text-[12px] text-fin-faint">
          <Icon name="book" size={14} className="mt-px shrink-0" />
          {f.refs?.length ? (
            <span>
              Read more:{" "}
              {f.refs.map((r, i) => (
                <span key={i} title={BOOKS[r.book]?.title}>
                  {i > 0 && " · "}
                  <span className="text-white/60">{BOOKS[r.book]?.short}</span> ch {r.ch}, p {r.page}
                </span>
              ))}
            </span>
          ) : (
            <span>From general chip-test practice — not covered in your books.</span>
          )}
        </div>
        {n === latest && finished && <p className="mt-2 text-[12px] text-fin-faint">You've reached the end of the course for now — more lessons coming.</p>}
      </div>
    </FinCard>
  );
}
