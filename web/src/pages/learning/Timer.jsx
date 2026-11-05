// The 2-hour study session: Learn 60 · Practise 45 · Log 15. Keeps running if
// you leave the page or reload (the start time is kept on this device). A chime
// marks each phase change; "Finish" logs the time against the lesson.
import { useEffect, useRef, useState } from "react";
import { Icon, Ring } from "../finances/fin-ui.jsx";
import { haptic } from "../../lib/inApp.js";
import { PHASES } from "./plan.js";

const KEY = "lifeos_learn_timer";
const TOTAL = PHASES.reduce((a, p) => a + p.minutes, 0) * 60_000;
const BOUNDS = PHASES.reduce((acc, p) => [...acc, (acc[acc.length - 1] || 0) + p.minutes * 60_000], []); // ends of each phase

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};
const write = (v) => {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
export const timerState = read;
const elapsedOf = (t, now = Date.now()) => (t ? t.acc + (t.since ? now - t.since : 0) : 0);
const phaseAt = (ms) => Math.min(PHASES.length - 1, BOUNDS.findIndex((b) => ms < b) === -1 ? PHASES.length - 1 : BOUNDS.findIndex((b) => ms < b));

function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.start(t0);
      o.stop(t0 + 0.55);
    });
  } catch {
    /* no sound */
  }
  haptic("heavy");
}

const clock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * lessonId: the lesson the session is for.
 * onStart(): first start (marks the lesson in progress).
 * onFinish(minutes, lessonId): when you finish the session.
 */
export function SessionTimer({ lessonId, onStart, onFinish }) {
  const [t, setT] = useState(read);
  const [now, setNow] = useState(Date.now());
  const lastPhase = useRef(null);
  const running = Boolean(t?.since);
  const other = t && t.lessonId !== lessonId; // a session for another lesson is open

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [running]);

  const el = elapsedOf(t, now);
  const ph = phaseAt(el);
  useEffect(() => {
    if (!running) {
      lastPhase.current = ph;
      return;
    }
    if (lastPhase.current != null && ph !== lastPhase.current) chime();
    lastPhase.current = ph;
    if (el >= TOTAL) {
      chime();
      const next = { ...t, acc: TOTAL, since: null };
      write(next);
      setT(next);
    }
  }, [ph, running, el >= TOTAL]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (v) => {
    write(v);
    setT(v);
    setNow(Date.now());
  };
  const start = () => {
    if (!t) {
      save({ lessonId, acc: 0, since: Date.now() });
      onStart?.();
    } else save({ ...t, since: Date.now() });
  };
  const pause = () => save({ ...t, acc: elapsedOf(t), since: null });
  const skip = () => {
    const end = BOUNDS[ph];
    save({ ...t, acc: Math.min(TOTAL, end), since: t.since ? Date.now() : null });
    chime();
  };
  const finish = () => {
    const minutes = Math.round(elapsedOf(t) / 60000);
    save(null);
    onFinish?.(minutes, t.lessonId);
  };
  const discard = () => save(null);

  const phase = PHASES[ph];
  const phaseStart = ph ? BOUNDS[ph - 1] : 0;
  const inPhase = el - phaseStart;
  const phaseLen = phase.minutes * 60_000;
  const done = el >= TOTAL;

  return (
    <div>
      {other && (
        <div className="mb-3 rounded-2xl bg-amber-400/10 px-3.5 py-2.5 text-[13px] text-amber-200">
          A session for {t.lessonId} is still open ({clock(el)}).{" "}
          <button onClick={finish} className="font-semibold underline">Finish & log it</button> or{" "}
          <button onClick={discard} className="font-semibold underline">discard</button>.
        </div>
      )}
      <div className="flex items-center gap-4">
        <Ring value={done ? 1 : inPhase} max={done ? 1 : phaseLen} size={118} stroke={10} color="rgb(var(--fin-accent))" track="rgba(255,255,255,.07)">
          <div className="text-center leading-tight">
            <div className="tabular text-[22px] font-extrabold">{done ? "Done" : clock(phaseLen - inPhase)}</div>
            <div className="text-[11.5px] text-fin-muted">{done ? "2 h session" : `${phase.label} left`}</div>
          </div>
        </Ring>
        <div className="min-w-0 flex-1 space-y-1.5">
          {PHASES.map((p, i) => {
            const state = el >= BOUNDS[i] ? "done" : i === ph && t ? "now" : "next";
            return (
              <div key={p.id} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${state === "now" ? "bg-fin-accent/15" : ""}`}>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${state === "done" ? "bg-fin-accent text-white" : state === "now" ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>
                  {state === "done" ? <Icon name="check" size={11} stroke={3} /> : i + 1}
                </span>
                <span className={`flex-1 text-[14px] font-semibold ${state === "next" ? "text-white/60" : ""}`}>{p.label}</span>
                <span className="tabular text-[12.5px] text-fin-muted">{p.minutes} min</span>
              </div>
            );
          })}
        </div>
      </div>
      {!other && <div className="mt-3 min-h-[36px] text-[13px] leading-snug text-fin-muted">{done ? "Session complete — finish to log the 2 hours." : phase.what}</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!other && !done && (running ? (
          <button onClick={pause} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-fin-tile py-3 text-[15px] font-bold">
            <Icon name="pause" size={16} stroke={2.4} /> Pause
          </button>
        ) : (
          <button onClick={start} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] py-3 text-[15px] font-bold text-white shadow-glow">
            <Icon name="play" size={16} stroke={2.4} /> {t ? "Resume" : "Start 2-hour session"}
          </button>
        ))}
        {!other && t && !done && <button onClick={skip} className="rounded-2xl bg-fin-tile px-4 py-3 text-[14px] font-semibold text-white/85">Next phase</button>}
        {!other && t && (
          <button onClick={finish} className={`rounded-2xl px-4 py-3 text-[14px] font-semibold ${done ? "flex-1 bg-fin-accent text-white" : "bg-fin-tile text-white/85"}`}>
            Finish · {clock(el)}
          </button>
        )}
      </div>
    </div>
  );
}
