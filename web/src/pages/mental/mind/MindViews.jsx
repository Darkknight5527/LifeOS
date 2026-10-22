// Mind › Today, Breathe, Meditate, Sleep and Focus pages.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IN_APP, haptic } from "../../../lib/inApp.js";
import { FinCard, Icon, PrimaryButton, Segmented } from "../../finances/fin-ui.jsx";
import { Bars } from "../../fitness/fit-ui.jsx";
import { addDays, isoDate, parseISO, todayISO } from "../../finances/lib";
import { COL } from "../journal/TodayView.jsx";
import { SOUNDS, isPlaying, setSound, stopAll } from "./audio.js";
import { GUIDED, PATTERNS, WIND_DOWN, guidedById, suggestion } from "./content.js";
import { useMind } from "./MindContext.jsx";
import { PhoneLock } from "./PhoneLock.jsx";
import { clock, minutesText } from "./Sessions.jsx";
import { ACCENTS, CAN_SPEAK, NEEDS_UPDATE, keepAwake } from "./voice.js";

const GRID2 = "grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0";
const GRID3 = "grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0";
const kicker = "mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted";
const KIND = {
  breathe: { label: "Breathing", emoji: "🌬️" },
  meditate: { label: "Meditation", emoji: "🧘" },
  sos: { label: "SOS", emoji: "🆘" },
  sleep: { label: "Sleep", emoji: "🌙" },
  focus: { label: "Focus", emoji: "🎯" },
};
const lengthOf = (g) => `${Math.round(g.end / 60)} min`;
const patternLength = (p) => p.phases.map((x) => x.s).join(" · ");

export function Chips({ options, value, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition active:scale-95 ${on ? "border-fin-accent bg-fin-accent/15 text-fin-accent" : "border-transparent bg-fin-input text-white/75 hover:bg-fin-tile"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ on, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-fin-accent" : "bg-[#34343c]"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

export function PlayRow({ title, sub, desc, onPlay, emoji }) {
  return (
    <button onClick={onPlay} className="group flex w-full items-center gap-3 rounded-2xl bg-fin-input px-3.5 py-3 text-left transition hover:bg-fin-tile active:scale-[0.99]">
      {emoji && <span className="text-[24px]">{emoji}</span>}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold">{title}</span>
          {sub && <span className="shrink-0 text-[12.5px] text-fin-muted">{sub}</span>}
        </div>
        {desc && <div className="mt-0.5 text-[13px] leading-snug text-fin-muted">{desc}</div>}
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fin-accent/15 text-fin-accent transition group-hover:bg-fin-accent group-hover:text-[#160f2b]">
        <Icon name="play" size={17} />
      </span>
    </button>
  );
}

// ======================= Today =======================
export function MindToday({ go }) {
  const m = useMind();
  const nav = useNavigate();
  const sug = suggestion();
  const sugItem = sug.type === "guided" ? guidedById(sug.id) : PATTERNS.find((p) => p.id === sug.id);
  const startSug = () => (sug.type === "guided" ? m.start({ type: "guided", id: sug.id }) : m.start({ type: "breath", pattern: sug.id, minutes: 3 }));
  const today = todayISO();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = isoDate(addDays(parseISO(today), i - 6));
    return {
      label: parseISO(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      value: Math.round(m.sessions.filter((s) => s.date === d).reduce((a, s) => a + (s.seconds || 0), 0) / 60),
    };
  });
  const quick = [
    { label: "1-minute reset", sub: "Physiological sigh", emoji: "🌬️", run: () => m.start({ type: "breath", pattern: "sigh", minutes: 1 }) },
    { label: "Box breathing", sub: "3 min", emoji: "⬜", run: () => m.start({ type: "breath", pattern: "box", minutes: 3 }) },
    { label: "Meditate", sub: "5 min, silent", emoji: "🧘", run: () => m.start({ type: "timer", minutes: 5, ambient: "", interval: 0 }) },
    { label: "Sleep", sub: "Wind down", emoji: "🌙", run: () => go("sleep") },
  ];

  return (
    <div className={GRID3}>
      <div className={COL}>
        <FinCard title="Right now">
          <div className="rounded-[22px] p-4" style={{ background: "linear-gradient(135deg, rgba(139,92,246,.35), rgba(76,52,170,.15))" }}>
            <div className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-fin-accent">{sug.label}</div>
            <div className="mt-1 text-[21px] font-extrabold">{sug.type === "guided" ? sugItem.title : sugItem.name}</div>
            <p className="mt-1 text-[14px] leading-snug text-white/70">{sug.type === "guided" ? sugItem.desc : sugItem.why}</p>
            <PrimaryButton className="mt-4 flex w-full items-center justify-center gap-2 !py-2.5" onClick={startSug}>
              <Icon name="play" size={17} /> Start · {sug.type === "guided" ? lengthOf(sugItem) : "3 min"}
            </PrimaryButton>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {quick.map((q) => (
              <button key={q.label} onClick={q.run} className="rounded-2xl bg-fin-input px-3 py-3 text-left transition hover:bg-fin-tile active:scale-[0.98]">
                <div className="text-[20px]">{q.emoji}</div>
                <div className="mt-1 text-[14px] font-semibold leading-tight">{q.label}</div>
                <div className="text-[12px] text-fin-muted">{q.sub}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              haptic("heavy");
              m.start({ type: "sos" });
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-left transition hover:bg-rose-500/15 active:scale-[0.99]"
          >
            <span className="text-[22px]">🆘</span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-rose-200">SOS</div>
              <div className="text-[12.5px] text-rose-100/60">Panicking, angry or overwhelmed? Tap — it walks you through it.</div>
            </div>
          </button>
        </FinCard>
      </div>

      <div className={COL}>
        <FinCard title="Your practice">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["🔥", m.streak, m.streak === 1 ? "day streak" : "day streak"],
              ["⏱️", m.weekMinutes, "min this week"],
              ["🧘", m.totalMinutes, "min in total"],
              ["🙂", m.betterShare == null ? "—" : `${Math.round(m.betterShare * 100)}%`, "felt better after"],
            ].map(([e, v, l]) => (
              <div key={l} className="rounded-2xl bg-fin-input px-3 py-2.5">
                <div className="text-[12.5px] text-fin-muted">
                  {e} {l}
                </div>
                <div className="tabular text-[24px] font-extrabold">{m.loading ? "…" : v}</div>
              </div>
            ))}
          </div>
          <div className={`${kicker} mt-4`}>Minutes, last 7 days</div>
          <Bars data={week} height={90} format={(v) => `${v} min`} />
          <div className="mt-1 flex justify-between text-[11px] text-fin-faint">
            {week.map((d) => (
              <span key={d.label} className="flex-1 text-center">
                {d.label.split(" ")[0].slice(0, 2)}
              </span>
            ))}
          </div>
        </FinCard>
        <FinCard title="Recent">
          {m.sessions.length === 0 ? (
            <p className="text-[14px] text-fin-muted">{m.loading ? "Loading…" : "Your sessions will show up here. Even one minute counts."}</p>
          ) : (
            <div className="space-y-1.5">
              {m.sessions.slice(0, 6).map((s) => (
                <div key={s._id} className="flex items-center gap-3 rounded-xl bg-fin-input px-3 py-2">
                  <span className="text-[18px]">{KIND[s.kind]?.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{s.title || KIND[s.kind]?.label}</div>
                    <div className="text-[12px] text-fin-muted">
                      {s.date === today ? "Today" : parseISO(s.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {minutesText(s.seconds)}
                    </div>
                  </div>
                  {typeof s.felt === "number" && <span title="How you felt after">{["😕", "😐", "🙂", "😌"][s.felt + 1]}</span>}
                </div>
              ))}
            </div>
          )}
        </FinCard>
      </div>

      <div className={COL}>
        <FinCard title="Settings">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">Spoken guidance</div>
                <div className="text-[12.5px] text-fin-muted">
                  {NEEDS_UPDATE ? "Update the app to 1.7 to hear it (captions work now)" : CAN_SPEAK ? "A calm voice reads the guidance" : "This browser can't speak — captions only"}
                </div>
              </div>
              <Switch on={m.prefs.voice} label="Spoken guidance" onChange={(voice) => m.setPrefs({ voice })} />
            </div>
            {m.prefs.voice && (
              <div>
                <div className="mb-1.5 text-[12.5px] text-fin-muted">Accent</div>
                <Segmented className="[&_button]:!py-1.5 [&_button]:!text-[13px]" value={m.prefs.accent} onChange={(accent) => m.setPrefs({ accent })} options={ACCENTS} />
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">Bells and chimes</div>
                <div className="text-[12.5px] text-fin-muted">Mark the start, end and each breath</div>
              </div>
              <Switch on={m.prefs.bells} label="Bells and chimes" onChange={(bells) => m.setPrefs({ bells })} />
            </div>
          </div>
        </FinCard>
        <FinCard title="Daily reminder">
          {IN_APP ? (
            <>
              <p className="text-[14px] leading-relaxed text-fin-muted">Get a nudge to take a few minutes for yourself — skipped on days you've already done a session.</p>
              <button onClick={() => nav("/account")} className="mt-3 rounded-xl bg-fin-tile px-3.5 py-2 text-[13.5px] font-semibold">
                Set it in Account → Notifications
              </button>
            </>
          ) : (
            <p className="text-[14px] leading-relaxed text-fin-muted">Mind and journal reminders come as phone notifications in the LifeOS Android app (Account → Notifications).</p>
          )}
        </FinCard>
        <FinCard title="Why bother">
          <ul className="space-y-2 text-[13.5px] leading-relaxed text-white/75">
            <li>🌬️ Slow out-breaths switch on your body's "rest" system within a minute.</li>
            <li>🧠 Ten minutes a day of practice trains attention, like reps train a muscle.</li>
            <li>😴 A wind-down routine helps you fall asleep faster than scrolling does.</li>
          </ul>
        </FinCard>
      </div>
    </div>
  );
}

// ======================= Breathe =======================
function PatternCard({ p }) {
  const m = useMind();
  const opts = p.cycles
    ? [4, 6, 8].map((n) => ({ value: `c${n}`, label: `${n} rounds` }))
    : [1, 2, 3, 5, 10].map((n) => ({ value: `m${n}`, label: `${n} min` }));
  const [len, setLen] = useState(p.cycles ? `c${p.cycles}` : `m${p.minutes}`);
  const start = () => {
    const n = Number(len.slice(1));
    m.start({ type: "breath", pattern: p.id, ...(len[0] === "c" ? { cycles: n } : { minutes: n }) });
  };
  return (
    <FinCard>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-bold">{p.name}</div>
          <div className="text-[13px] font-semibold text-fin-accent">{p.tag}</div>
        </div>
        <span className="tabular shrink-0 rounded-full bg-fin-input px-2.5 py-1 text-[12.5px] font-semibold text-white/70" title="Seconds per step">
          {patternLength(p)}
        </span>
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-fin-muted">{p.why}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Chips options={opts} value={len} onChange={setLen} label="Length" />
        <PrimaryButton className="flex items-center gap-1.5 !px-4 !py-2 !text-[14px]" onClick={start}>
          <Icon name="play" size={15} /> Start
        </PrimaryButton>
      </div>
    </FinCard>
  );
}

export function MindBreathe() {
  return (
    <div className={GRID2}>
      <div className={COL}>
        <PatternCard p={PATTERNS[0]} />
        <PatternCard p={PATTERNS[1]} />
      </div>
      <div className={COL}>
        <PatternCard p={PATTERNS[2]} />
        <PatternCard p={PATTERNS[3]} />
      </div>
    </div>
  );
}

// ======================= Meditate =======================
export function MindMeditate() {
  const m = useMind();
  const [minutes, setMinutes] = useState(10);
  const [ambient, setAmbient] = useState("");
  const [interval, setInterval_] = useState(0);
  const guided = GUIDED.filter((g) => g.group === "meditate");
  const half = Math.ceil(guided.length / 2);
  const row = (g) => <PlayRow key={g.id} title={g.title} sub={lengthOf(g)} desc={g.desc} onPlay={() => m.start({ type: "guided", id: g.id })} />;
  return (
    <div className={GRID3}>
      <div className={COL}>
        <FinCard title="Silent timer">
          <div className={kicker}>Length</div>
          <Chips options={[2, 5, 10, 15, 20, 30].map((n) => ({ value: n, label: `${n} min` }))} value={minutes} onChange={setMinutes} label="Length" />
          <div className={`${kicker} mt-4`}>Background</div>
          <Chips
            options={[{ value: "", label: "Silence" }, ...SOUNDS.filter((s) => ["rain", "ocean", "fire", "drone", "brown"].includes(s.id)).map((s) => ({ value: s.id, label: `${s.emoji} ${s.label}` }))]}
            value={ambient}
            onChange={setAmbient}
            label="Background sound"
          />
          <div className={`${kicker} mt-4`}>Soft bell</div>
          <Chips
            options={[
              { value: 0, label: "Start and end" },
              { value: 1, label: "Every minute" },
              { value: 5, label: "Every 5 min" },
            ]}
            value={interval}
            onChange={setInterval_}
            label="Interval bell"
          />
          <PrimaryButton className="mt-5 flex w-full items-center justify-center gap-2" onClick={() => m.start({ type: "timer", minutes, ambient, interval })}>
            <Icon name="play" size={17} /> Begin {minutes} min
          </PrimaryButton>
        </FinCard>
        <FinCard title="New to this?">
          <p className="text-[13.5px] leading-relaxed text-white/75">
            Start with <b>Breath focus</b> for a week. The aim isn't an empty mind — it's noticing when you've wandered and coming back. Every time you come back is one rep.
          </p>
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard title="Guided">
          <div className="space-y-2">{guided.slice(0, half).map(row)}</div>
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard title="For specific moments">
          <div className="space-y-2">{guided.slice(half).map(row)}</div>
        </FinCard>
      </div>
    </div>
  );
}

// ======================= Sleep =======================
const WIND_KEY = "lifeos_mind_winddown";
function useWindDown() {
  const today = todayISO();
  const [done, setDone] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem(WIND_KEY) || "null");
      return v?.date === today ? new Set(v.ids) : new Set();
    } catch {
      return new Set();
    }
  });
  const toggle = (id) =>
    setDone((d) => {
      const n = new Set(d);
      n.has(id) ? n.delete(id) : n.add(id);
      try {
        localStorage.setItem(WIND_KEY, JSON.stringify({ date: today, ids: [...n] }));
      } catch {
        /* ignore */
      }
      return n;
    });
  return [done, toggle];
}

export function MindSleep({ openJournal }) {
  const m = useMind();
  const [done, toggle] = useWindDown();
  const [sound, setSound_] = useState("rain");
  const [mins, setMins] = useState(30);
  const sleepGuided = GUIDED.filter((g) => g.group === "sleep");
  return (
    <div className={GRID3}>
      <div className={COL}>
        <FinCard title="Tonight's wind-down" action={<span className="tabular text-[13px] font-semibold text-fin-muted">{done.size}/{WIND_DOWN.length}</span>}>
          <div className="space-y-1.5">
            {WIND_DOWN.map((w) => {
              const on = done.has(w.id);
              return (
                <div key={w.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(w.id)}
                    aria-pressed={on}
                    className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[14px] transition ${on ? "bg-fin-accent/15 text-white" : "bg-fin-input text-white/80 hover:bg-fin-tile"}`}
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${on ? "border-fin-accent bg-fin-accent text-[#160f2b]" : "border-white/20"}`}>{on && <Icon name="check" size={15} stroke={2.6} />}</span>
                    <span className={on ? "line-through decoration-white/30" : ""}>{w.text}</span>
                  </button>
                  {w.id === "top3" && (
                    <button onClick={openJournal} className="shrink-0 rounded-xl bg-fin-tile px-2.5 py-2 text-[12.5px] font-semibold">
                      Open
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] text-fin-faint">Resets every day. Ticks stay on this device only.</p>
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard title="Fall asleep">
          <div className="space-y-2">
            <PlayRow emoji="🌬️" title="4-7-8 breathing" sub="4 rounds" desc="Slows your heart rate. Do it lying down, lights off." onPlay={() => m.start({ type: "breath", pattern: "478", cycles: 4 })} />
            {sleepGuided.map((g) => (
              <PlayRow key={g.id} emoji={g.id === "countdown" ? "🔢" : "🛏️"} title={g.title} sub={lengthOf(g)} desc={g.desc} onPlay={() => m.start({ type: "guided", id: g.id })} />
            ))}
          </div>
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard title="Sleep sounds">
          <div className="grid grid-cols-3 gap-2">
            {SOUNDS.filter((s) => s.id !== "drone").map((s) => (
              <button
                key={s.id}
                onClick={() => setSound_(s.id)}
                aria-pressed={sound === s.id}
                className={`rounded-2xl border px-2 py-2.5 text-center transition active:scale-95 ${sound === s.id ? "border-fin-accent bg-fin-accent/15" : "border-transparent bg-fin-input hover:bg-fin-tile"}`}
              >
                <div className="text-[22px]">{s.emoji}</div>
                <div className="mt-0.5 text-[12px] font-semibold text-white/80">{s.label}</div>
              </button>
            ))}
          </div>
          <div className={`${kicker} mt-4`}>Turn off after</div>
          <Chips options={[15, 30, 45, 60, 90].map((n) => ({ value: n, label: `${n} min` }))} value={mins} onChange={setMins} label="Timer" />
          <PrimaryButton className="mt-4 flex w-full items-center justify-center gap-2" onClick={() => m.start({ type: "sleepsound", sound, minutes: mins })}>
            <Icon name="moon" size={17} /> Play
          </PrimaryButton>
          <p className="mt-2 text-[12.5px] leading-relaxed text-fin-faint">Sounds fade out slowly over the last minute.</p>
        </FinCard>
      </div>
    </div>
  );
}

// ======================= Focus =======================
const PRESETS = [
  { value: "25/5", label: "25 / 5" },
  { value: "50/10", label: "50 / 10" },
  { value: "90/15", label: "90 / 15" },
];

function Mixer() {
  const [vols, setVols] = useState(() => Object.fromEntries(SOUNDS.map((s) => [s.id, isPlaying(s.id) ? 0.5 : 0])));
  // Sessions can stop sounds; keep the switches honest when you come back.
  useEffect(() => {
    setVols((v) => Object.fromEntries(SOUNDS.map((s) => [s.id, isPlaying(s.id) ? v[s.id] || 0.5 : 0])));
  }, []);
  const set = (id, v) => {
    setSound(id, v);
    setVols((x) => ({ ...x, [id]: v }));
  };
  const any = Object.values(vols).some((v) => v > 0);
  return (
    <FinCard
      title="Sound mixer"
      action={
        any ? (
          <button
            onClick={() => {
              stopAll(0.6);
              setVols(Object.fromEntries(SOUNDS.map((s) => [s.id, 0])));
            }}
            className="rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold"
          >
            Stop all
          </button>
        ) : null
      }
    >
      <p className="mb-3 text-[13.5px] text-fin-muted">Mix any sounds together. Brown noise or rain is great for blocking out office chatter.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SOUNDS.map((s) => {
          const v = vols[s.id];
          const on = v > 0;
          return (
            <div key={s.id} className={`rounded-2xl border px-3 py-2.5 transition ${on ? "border-fin-accent/60 bg-fin-accent/10" : "border-transparent bg-fin-input"}`}>
              <button onClick={() => set(s.id, on ? 0 : 0.5)} aria-pressed={on} className="flex w-full items-center gap-2 text-left">
                <span className="text-[22px]">{s.emoji}</span>
                <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-tight">{s.label}</span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? "bg-fin-accent shadow-[0_0_8px_rgb(167,139,250)]" : "bg-white/15"}`} />
              </button>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={on ? v : 0.05}
                disabled={!on}
                aria-label={`${s.label} volume`}
                onChange={(e) => set(s.id, Number(e.target.value))}
                className="mt-2 w-full accent-[rgb(167,139,250)] disabled:opacity-25"
              />
            </div>
          );
        })}
      </div>
    </FinCard>
  );
}

function FocusTimer() {
  const m = useMind();
  const f = m.focus;
  const [preset, setPreset] = useState("25/5");
  const todayFocus = m.sessions.filter((s) => s.kind === "focus" && s.date === todayISO());
  const focusMin = Math.round(todayFocus.reduce((a, s) => a + (s.seconds || 0), 0) / 60);
  const [keep, setKeep] = useState(false);
  useEffect(() => {
    if (!keep) return;
    keepAwake(true);
    return () => keepAwake(false);
  }, [keep]);
  return (
    <FinCard title="Focus timer" action={<span className="text-[12.5px] text-fin-muted">{focusMin} min focused today</span>}>
      {!f ? (
        <>
          <div className={kicker}>Focus / break (minutes)</div>
          <Segmented className="[&_button]:!py-2 [&_button]:!text-[14px]" value={preset} onChange={setPreset} options={PRESETS} />
          <PrimaryButton
            className="mt-4 flex w-full items-center justify-center gap-2"
            onClick={() => {
              const [w, r] = preset.split("/").map(Number);
              m.focusApi.start(w, r);
            }}
          >
            <Icon name="play" size={17} /> Start focusing
          </PrimaryButton>
          <p className="mt-3 text-[12.5px] leading-relaxed text-fin-faint">A bell rings at the end of each block. Sessions of 5 min or more count towards your minutes. Keeps running while you use other parts of Mental & Psych.</p>
        </>
      ) : (
        <div className="text-center">
          <div className={`text-[13px] font-bold uppercase tracking-[0.12em] ${f.phase === "work" ? "text-fin-accent" : "text-emerald-300"}`}>
            {f.phase === "work" ? `Focus · round ${f.round}` : "Break — stand up, look far away"}
          </div>
          <div className="tabular mt-1 text-[64px] font-extrabold leading-none">{clock(f.remaining)}</div>
          <div className="mx-auto mt-3 h-1.5 max-w-[260px] overflow-hidden rounded-full bg-fin-input">
            <div
              className={`h-full rounded-full ${f.phase === "work" ? "bg-fin-accent" : "bg-emerald-400"}`}
              style={{ width: `${100 - (f.remaining / ((f.phase === "work" ? f.work : f.rest) * 60)) * 100}%`, transition: "width .5s linear" }}
            />
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={f.paused ? m.focusApi.resume : m.focusApi.pause} className="rounded-2xl bg-fin-tile px-5 py-2.5 text-[15px] font-semibold">
              {f.paused ? "Resume" : "Pause"}
            </button>
            <button onClick={m.focusApi.stop} className="rounded-2xl bg-fin-input px-5 py-2.5 text-[15px] font-semibold text-white/75">
              Stop
            </button>
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-3">
        <div className="min-w-0 flex-1 text-[13.5px] text-white/80">Keep the screen on</div>
        <Switch on={keep} label="Keep the screen on" onChange={setKeep} />
      </div>
    </FinCard>
  );
}

export function MindFocus() {
  return (
    <div className={GRID3}>
      <div className={`${COL} lg:col-span-2`}>
        <Mixer />
      </div>
      <div className={`${COL} order-first lg:order-none`}>
        <FocusTimer />
        <PhoneLock />
      </div>
    </div>
  );
}
