// Journal › Today: the daily page. Everything saves as you type.
import { useEffect, useRef, useState } from "react";
import { FinCard, Icon } from "../../finances/fin-ui.jsx";
import { FEELINGS, MOODS, SCALES, promptFor } from "./content.js";
import { entryKey, useJournal } from "./JournalContext.jsx";

// Laptop: each column fits the screen and scrolls on its own.
export const COL = "fin-scroll space-y-4 lg:h-[calc(100dvh-178px)] lg:min-h-[380px] lg:overflow-y-auto lg:pr-1";

/** A text box that grows with its text and saves ~0.7 s after you stop typing. */
export function AutoText({ value, onSave, placeholder, rows = 2, className = "", max = 5000, label }) {
  const [v, setV] = useState(value || "");
  const t = useRef(null);
  const box = useRef(null);
  const last = useRef(value || "");
  useEffect(() => {
    // Take outside changes (another day opened) but not while typing.
    if ((value || "") !== last.current) {
      setV(value || "");
      last.current = value || "";
    }
  }, [value]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [v]);
  const flush = (text) => {
    clearTimeout(t.current);
    if (text !== last.current) {
      last.current = text;
      onSave(text);
    }
  };
  return (
    <textarea
      ref={box}
      value={v}
      rows={rows}
      maxLength={max}
      aria-label={label || placeholder}
      placeholder={placeholder}
      onChange={(e) => {
        const text = e.target.value;
        setV(text);
        clearTimeout(t.current);
        t.current = setTimeout(() => flush(text), 700);
      }}
      onBlur={() => flush(v)}
      className={`selectable block w-full resize-none overflow-hidden rounded-2xl border border-transparent bg-fin-input px-4 py-3 text-[15px] leading-relaxed text-white outline-none placeholder:text-fin-faint focus:border-fin-accent/50 ${className}`}
    />
  );
}

/** A list of short lines (gratitude ×3, tomorrow's top 3). */
function Lines({ values = [], count = 3, onSave, placeholders }) {
  const list = Array.from({ length: count }, (_, i) => values[i] || "");
  return (
    <div className="space-y-2">
      {list.map((val, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className="mt-3 w-4 shrink-0 text-center text-[13px] font-bold text-fin-faint">{i + 1}</span>
          <AutoText
            rows={1}
            max={300}
            value={val}
            placeholder={placeholders[i]}
            onSave={(text) => {
              const next = [...list];
              next[i] = text.trim();
              onSave(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}

const Label = ({ children, className = "" }) => <div className={`mb-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-fin-muted ${className}`}>{children}</div>;

export default function TodayView({ date }) {
  const j = useJournal();
  const e = j.byKey[entryKey("day", date)] || {};
  const save = (patch) => j.save("day", date, patch);
  const prompt = e.prompt || promptFor(date);
  const feelings = new Set(e.feelings || []);
  const words = [e.highlight, e.drained, e.energized, e.learned, e.promptAnswer, e.free].join(" ").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div key={date} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0">
      {/* ---- check-in + gratitude ---- */}
      <div className={COL}>
        <FinCard title="How are you?">
          <div className="grid grid-cols-5 gap-2">
            {MOODS.map((m) => {
              const on = e.mood === m.v;
              return (
                <button
                  key={m.v}
                  onClick={() => save({ mood: on ? 0 : m.v })}
                  aria-pressed={on}
                  className={`flex flex-col items-center gap-0.5 rounded-2xl border py-2 transition active:scale-95 ${on ? "" : "border-transparent bg-fin-input hover:bg-fin-tile"}`}
                  style={on ? { background: `${m.color}22`, borderColor: m.color } : undefined}
                >
                  <span className={`text-[24px] leading-none ${on ? "scale-110" : "opacity-75 grayscale-[30%]"}`}>{m.face}</span>
                  <span className="text-[11.5px] font-semibold" style={{ color: on ? m.color : "#9b9ba5" }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-3">
            {SCALES.map((s) => (
              <div key={s.k}>
                <div className="mb-1.5 flex justify-between text-[12.5px] text-fin-muted">
                  <span className="font-semibold text-white/80">{s.label}</span>
                  <span>
                    {s.low} → {s.high}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = e[s.k] === n;
                    return (
                      <button
                        key={n}
                        onClick={() => save({ [s.k]: on ? 0 : n })}
                        aria-label={`${s.label} ${n} of 5`}
                        aria-pressed={on}
                        className={`h-8 rounded-xl text-[13px] font-bold transition ${on ? "bg-fin-accent text-[#160f2b]" : (e[s.k] || 0) >= n ? "bg-fin-accent/25 text-white" : "bg-fin-input text-fin-muted hover:bg-fin-tile"}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <Label className="mt-4">Feelings</Label>
          <div className="flex flex-wrap gap-1.5">
            {FEELINGS.map((f) => {
              const on = feelings.has(f);
              return (
                <button
                  key={f}
                  onClick={() => {
                    const next = new Set(feelings);
                    on ? next.delete(f) : next.add(f);
                    save({ feelings: [...next] });
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[12.5px] font-semibold capitalize transition active:scale-95 ${on ? "border-fin-accent bg-fin-accent/15 text-fin-accent" : "border-transparent bg-fin-input text-white/75 hover:bg-fin-tile"}`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </FinCard>
        <FinCard title="Grateful for">
          <Lines values={e.gratitude} onSave={(gratitude) => save({ gratitude })} placeholders={["Something small…", "Someone…", "Something about today…"]} />
        </FinCard>
      </div>

      {/* ---- reflection ---- */}
      <div className={COL}>
        <FinCard title="Today's highlight">
          <AutoText value={e.highlight} placeholder="The best moment of the day" onSave={(highlight) => save({ highlight })} />
        </FinCard>
        <FinCard title="Energy check">
          <Label>⚡ What gave me energy</Label>
          <AutoText value={e.energized} placeholder="People, work, things that lifted you" onSave={(energized) => save({ energized })} />
          <Label className="mt-3">🪫 What drained me</Label>
          <AutoText value={e.drained} placeholder="What took more than it gave" onSave={(drained) => save({ drained })} />
        </FinCard>
        <FinCard title="One thing I learned">
          <AutoText value={e.learned} placeholder="About work, people, yourself…" onSave={(learned) => save({ learned })} />
        </FinCard>
        <FinCard title="Tomorrow's top 3">
          <Lines values={e.tomorrow} onSave={(tomorrow) => save({ tomorrow })} placeholders={["Most important", "Second", "Third"]} />
        </FinCard>
      </div>

      {/* ---- question + free writing ---- */}
      <div className={COL}>
        <FinCard title="Today's question" action={<Icon name="sparkle" size={16} className="text-fin-accent" />}>
          <div className="mb-3 text-[16px] font-semibold leading-snug text-white/90">{prompt}</div>
          <AutoText
            rows={3}
            value={e.promptAnswer}
            placeholder="Write whatever comes up"
            onSave={(promptAnswer) => save({ promptAnswer, prompt })}
          />
        </FinCard>
        <FinCard title="Free writing" action={<span className="tabular text-[12px] text-fin-faint">{words} words today</span>}>
          <AutoText rows={8} max={20000} value={e.free} placeholder="A blank page — anything on your mind." onSave={(free) => save({ free })} />
        </FinCard>
      </div>
    </div>
  );
}
