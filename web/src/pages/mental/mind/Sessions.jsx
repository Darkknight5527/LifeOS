// Mind › the full-screen session player: breathing, guided sessions,
// the silent timer, SOS and sleep sounds. One is open at a time (useMind().active).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { haptic } from "../../../lib/inApp.js";
import { Icon, Ring } from "../../finances/fin-ui.jsx";
import { bowl, chime, fadeOutAll, setSound, SOUNDS, stopAll } from "./audio.js";
import { GROUNDING, HELPLINES, PHASE_SIZE, PHASE_SPOKEN, PHASE_TEXT, SOS_FEELINGS, guidedById, patternById } from "./content.js";
import { useMind } from "./MindContext.jsx";
import { CAN_SPEAK, NEEDS_UPDATE, keepAwake, speak, stopSpeaking } from "./voice.js";

export const clock = (s) => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
export const minutesText = (s) => {
  const m = Math.round(s / 60);
  return m < 1 ? `${Math.round(s)} sec` : `${m} min`;
};

/** Seconds that have passed while `running` (pauses keep their place). */
export function useElapsed(running) {
  const [elapsed, setElapsed] = useState(0);
  const base = useRef(0);
  useEffect(() => {
    if (!running) return;
    const t0 = performance.now();
    const id = setInterval(() => setElapsed(base.current + (performance.now() - t0) / 1000), 100);
    return () => {
      clearInterval(id);
      base.current += (performance.now() - t0) / 1000;
    };
  }, [running]);
  return elapsed;
}

// ---------- the screen ----------
function Screen({ title, sub, onClose, children, dark = false, footer }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prev;
    };
  }, []);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`theme-violet fixed inset-0 z-[90] flex animate-fade-in flex-col font-fin text-white ${dark ? "bg-black" : ""}`}
      style={dark ? undefined : { background: "radial-gradient(120% 80% at 50% 30%, #2a1f4d 0%, #120e20 55%, #0a0910 100%)" }}
    >
      <div className="flex items-center gap-3 px-4 pb-2 pt-[max(14px,env(safe-area-inset-top))] sm:px-6">
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[17px] font-bold ${dark ? "text-white/40" : ""}`}>{title}</div>
          {sub && <div className={`truncate text-[13px] ${dark ? "text-white/25" : "text-white/55"}`}>{sub}</div>}
        </div>
        <button onClick={onClose} aria-label="Close" className={`grid h-10 w-10 place-items-center rounded-full ${dark ? "text-white/30" : "bg-white/10 text-white/80 hover:bg-white/15"}`}>
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5 pb-6 text-center">{children}</div>
      {footer && <div className="px-5 pb-[max(18px,env(safe-area-inset-bottom))]">{footer}</div>}
    </div>,
    document.body
  );
}

const RoundBtn = ({ icon, label, onClick, big }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`grid place-items-center rounded-full transition active:scale-95 ${big ? "h-16 w-16 bg-white text-[#1b1530]" : "h-12 w-12 bg-white/10 text-white hover:bg-white/15"}`}
  >
    <Icon name={icon} size={big ? 26 : 20} />
  </button>
);
const PAUSE = "pause";

// ---------- "how do you feel" at the end ----------
const FELT = [
  { v: -1, label: "Worse", emoji: "😕" },
  { v: 0, label: "Same", emoji: "😐" },
  { v: 1, label: "Better", emoji: "🙂" },
  { v: 2, label: "Much better", emoji: "😌" },
];

function Finish({ seconds, kind, title, onClose }) {
  const m = useMind();
  const [saved, setSaved] = useState(false);
  const save = (felt) => {
    if (saved) return;
    setSaved(true);
    m.log({ kind, title, seconds, felt });
  };
  const close = () => {
    save(undefined);
    onClose();
  };
  return (
    <Screen title={title} onClose={close}>
      <div className="animate-pop-in">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-fin-accent/20 text-fin-accent">
          <Icon name="check" size={36} stroke={2.2} />
        </div>
        <div className="mt-5 text-[26px] font-extrabold">{minutesText(seconds)} for you</div>
        {!saved ? (
          <>
            <p className="mt-2 text-[15px] text-white/65">Compared with before, how do you feel?</p>
            <div className="mx-auto mt-5 grid max-w-[420px] grid-cols-4 gap-2">
              {FELT.map((f) => (
                <button key={f.v} onClick={() => save(f.v)} className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.07] px-1 py-3 transition hover:bg-white/[0.12] active:scale-95">
                  <span className="text-[26px]">{f.emoji}</span>
                  <span className="text-[12.5px] font-semibold text-white/80">{f.label}</span>
                </button>
              ))}
            </div>
            <button onClick={close} className="mt-5 text-[14px] font-semibold text-white/50 underline-offset-4 hover:underline">
              Skip
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-[15px] text-white/65">{m.streak > 1 ? `🔥 ${m.streak}-day streak. Keep it going.` : "Saved. Come back tomorrow to start a streak."}</p>
            <button onClick={onClose} className="mt-6 rounded-2xl bg-white px-8 py-3 text-[16px] font-bold text-[#1b1530] active:scale-95">
              Done
            </button>
          </>
        )}
      </div>
    </Screen>
  );
}

// ---------- breathing ----------
const LEAD = 3; // "get ready" seconds

/** The breathing circle. Calls onDone(seconds) after `total` seconds of breathing. */
export function BreathRunner({ pattern, total, paused, onDone, size = 260, voice = true }) {
  const m = useMind();
  const done = useRef(false);
  const elapsed = useElapsed(!paused && !done.current);
  const t = elapsed - LEAD;
  const cycleLen = pattern.phases.reduce((a, p) => a + p.s, 0);
  let idx = 0;
  let inPhase = 0;
  const cycle = t >= 0 ? Math.floor(t / cycleLen) : -1;
  if (t >= 0) {
    let w = t % cycleLen;
    for (idx = 0; idx < pattern.phases.length; idx++) {
      if (w < pattern.phases[idx].s) break;
      w -= pattern.phases[idx].s;
    }
    idx = Math.min(idx, pattern.phases.length - 1);
    inPhase = w;
  }
  const phase = t >= 0 ? pattern.phases[idx] : null;
  const key = `${cycle}-${idx}`;

  useEffect(() => {
    if (!phase || done.current || paused) return;
    if (m.prefs.bells) chime(phase.k === "rest" ? "hold" : phase.k);
    if (voice) speak(PHASE_SPOKEN[phase.k], { rate: 0.85 });
    haptic("light");
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (t >= total && !done.current) {
      done.current = true;
      onDone(total);
    }
  }, [t, total, onDone]);

  const scale = phase ? PHASE_SIZE[phase.k] : 0.5;
  const left = phase ? Math.ceil(phase.s - inPhase) : Math.ceil(-t);
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <div className="absolute inset-[25%] rounded-full border border-dashed border-white/10" />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(196,181,253,.95), rgba(124,92,230,.75) 55%, rgba(76,52,170,.55))",
            boxShadow: "0 0 80px 10px rgba(139,92,246,.35)",
            transform: `scale(${scale})`,
            transition: `transform ${phase && !paused ? phase.s : 0.6}s cubic-bezier(.45,0,.55,1)`,
          }}
        />
        <div className="relative text-center">
          <div className="text-[44px] font-extrabold tabular-nums leading-none text-white drop-shadow">{left > 0 ? left : ""}</div>
        </div>
      </div>
      <div className="mt-8 h-8 text-[24px] font-bold">{paused ? "Paused" : phase ? PHASE_TEXT[phase.k] : "Get ready…"}</div>
      <div className="mt-1 text-[14px] text-white/55">{t >= 0 ? `${clock(Math.max(0, total - t))} left` : pattern.tip}</div>
    </div>
  );
}

function BreathSession({ pattern: id, minutes, cycles, onClose }) {
  const pattern = patternById(id);
  const m = useMind();
  const cycleLen = pattern.phases.reduce((a, p) => a + p.s, 0);
  const n = cycles || Math.max(1, Math.round(((minutes || pattern.minutes || 2) * 60) / cycleLen));
  const total = n * cycleLen;
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    keepAwake(true);
    return () => {
      keepAwake(false);
      stopSpeaking();
    };
  }, []);

  const end = (secs) => {
    keepAwake(false);
    stopSpeaking();
    if (m.prefs.bells) bowl(0.4);
    setFinished(secs);
  };
  const quit = () => {
    const secs = Math.min(total, (Date.now() - startedAt.current) / 1000 - LEAD);
    if (secs >= 20 && !finished) return end(secs);
    onClose();
  };

  if (finished != null) return <Finish seconds={finished} kind="breathe" title={pattern.name} onClose={onClose} />;
  return (
    <Screen
      title={pattern.name}
      sub={cycles ? `${n} rounds` : `${Math.round(total / 60)} min`}
      onClose={quit}
      footer={
        <div className="flex items-center justify-center gap-5">
          <RoundBtn icon={paused ? "play" : PAUSE} big label={paused ? "Resume" : "Pause"} onClick={() => setPaused((p) => !p)} />
        </div>
      }
    >
      <BreathRunner pattern={pattern} total={total} paused={paused} onDone={end} voice={m.prefs.voice} />
    </Screen>
  );
}

// ---------- guided + timer ----------
function VoiceNote() {
  const m = useMind();
  if (!m.prefs.voice) return <div className="text-[12.5px] text-white/40">Voice is off — read along</div>;
  if (NEEDS_UPDATE) return <div className="text-[12.5px] text-white/40">Update the app (1.7) to hear the voice — read along for now</div>;
  if (!CAN_SPEAK) return <div className="text-[12.5px] text-white/40">This browser can't speak — read along</div>;
  return null;
}

function AmbientToggle({ id, on, onToggle }) {
  const s = SOUNDS.find((x) => x.id === id);
  if (!s) return null;
  return (
    <button onClick={onToggle} className={`rounded-full px-4 py-2 text-[13.5px] font-semibold ${on ? "bg-white/15 text-white" : "bg-white/[0.06] text-white/50"}`}>
      {s.emoji} {s.label} {on ? "on" : "off"}
    </button>
  );
}

function GuidedSession({ id, onClose }) {
  const g = guidedById(id);
  const m = useMind();
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(null);
  const [ambient, setAmbient] = useState(Boolean(g.ambient));
  const elapsed = useElapsed(!paused && finished == null);
  const spoken = useRef(-1);
  const [line, setLine] = useState(-1);

  useEffect(() => {
    keepAwake(true);
    stopAll(0.3);
    if (m.prefs.bells && !g.sleep) bowl(0.45);
    return () => {
      keepAwake(false);
      stopSpeaking();
      stopAll(g.sleep ? 2 : 1);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!g.ambient) return;
    setSound(g.ambient, ambient && !paused ? (g.sleep ? 0.45 : 0.35) : 0);
  }, [ambient, paused]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (paused) stopSpeaking();
  }, [paused]);

  // Speak each line as its time comes.
  useEffect(() => {
    if (finished != null || paused) return;
    let i = spoken.current;
    while (i + 1 < g.lines.length && g.lines[i + 1][0] <= elapsed) i++;
    if (i !== spoken.current) {
      spoken.current = i;
      setLine(i);
      speak(g.lines[i][1], { rate: g.rate || 0.88 });
    }
    if (elapsed >= g.end) finish(g.end);
  }, [elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(secs) {
    keepAwake(false);
    if (g.sleep) {
      fadeOutAll(20);
      m.log({ kind: "sleep", title: g.title, seconds: secs });
      setFinished(-1);
      return;
    }
    stopAll(3);
    if (m.prefs.bells) bowl(0.45);
    setFinished(secs);
  }
  const quit = () => {
    if (finished == null && elapsed >= 30) return finish(elapsed);
    onClose();
  };

  if (finished === -1) {
    return (
      <Screen title={g.title} onClose={onClose} dark>
        <div className="text-[22px] font-bold text-white/40">Sleep well 🌙</div>
      </Screen>
    );
  }
  if (finished != null) return <Finish seconds={finished} kind="meditate" title={g.title} onClose={onClose} />;
  const text = line >= 0 ? g.lines[line][1] : "Get comfortable…";
  return (
    <Screen
      title={g.title}
      sub={`${clock(g.end - elapsed)} left`}
      onClose={quit}
      dark={g.sleep && elapsed > 120}
      footer={
        <div className="flex flex-col items-center gap-3">
          <VoiceNote />
          <div className="flex items-center justify-center gap-4">
            {g.ambient && <AmbientToggle id={g.ambient} on={ambient} onToggle={() => setAmbient((a) => !a)} />}
            <RoundBtn icon={paused ? "play" : PAUSE} big label={paused ? "Resume" : "Pause"} onClick={() => setPaused((p) => !p)} />
          </div>
        </div>
      }
    >
      <Ring value={elapsed} max={g.end} color="rgb(167 139 250)" size={150} stroke={5} track="rgba(255,255,255,.08)">
        <span className="text-[13px] font-semibold text-white/60">{paused ? "Paused" : clock(elapsed)}</span>
      </Ring>
      <p key={line} className={`mt-8 max-w-[560px] animate-fade-up text-[21px] font-semibold leading-snug sm:text-[24px] ${g.sleep && elapsed > 120 ? "text-white/35" : "text-white/90"}`}>
        {text}
      </p>
    </Screen>
  );
}

function TimerSession({ minutes, ambient, interval = 0, onClose }) {
  const m = useMind();
  const total = minutes * 60;
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(null);
  const elapsed = useElapsed(!paused && finished == null);
  const lastBell = useRef(0);

  useEffect(() => {
    keepAwake(true);
    stopAll(0.3);
    if (m.prefs.bells) bowl(0.45);
    return () => {
      keepAwake(false);
      stopAll(1);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ambient) setSound(ambient, paused ? 0 : 0.35);
  }, [paused, ambient]);
  useEffect(() => {
    if (finished != null) return;
    if (elapsed >= total) return finish(total);
    if (interval && Math.floor(elapsed / (interval * 60)) > lastBell.current) {
      lastBell.current = Math.floor(elapsed / (interval * 60));
      if (m.prefs.bells) bowl(0.2);
    }
  }, [elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(secs) {
    keepAwake(false);
    stopAll(3);
    if (m.prefs.bells) bowl(0.5);
    setFinished(secs);
  }
  const quit = () => {
    if (finished == null && elapsed >= 30) return finish(elapsed);
    onClose();
  };

  if (finished != null) return <Finish seconds={finished} kind="meditate" title="Silent meditation" onClose={onClose} />;
  return (
    <Screen
      title="Silent meditation"
      sub={interval ? `Soft bell every ${interval} min` : "Bell at the start and end"}
      onClose={quit}
      footer={
        <div className="flex justify-center">
          <RoundBtn icon={paused ? "play" : PAUSE} big label={paused ? "Resume" : "Pause"} onClick={() => setPaused((p) => !p)} />
        </div>
      }
    >
      <Ring value={elapsed} max={total} color="rgb(167 139 250)" size={250} stroke={6} track="rgba(255,255,255,.08)">
        <div>
          <div className="text-[46px] font-extrabold tabular-nums">{clock(total - elapsed)}</div>
          <div className="text-[14px] text-white/50">{paused ? "Paused" : "Rest with the breath"}</div>
        </div>
      </Ring>
    </Screen>
  );
}

// ---------- SOS ----------
function Helplines({ compact }) {
  return (
    <div className={`mx-auto w-full max-w-[460px] rounded-2xl bg-white/[0.06] text-left ${compact ? "px-4 py-3" : "p-4"}`}>
      <div className="text-[13px] font-semibold text-white/70">{compact ? "Need to talk to someone now?" : "If it doesn't pass, or you feel you might hurt yourself, please talk to someone:"}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {HELPLINES.map((h) => (
          <a key={h.number} href={`tel:${h.number}`} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[14px] font-bold text-white hover:bg-white/15">
            📞 {h.name} {h.number}
            {!compact && <span className="text-[12px] font-medium text-white/55">· {h.note}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

function SosSession({ onClose, onJournal }) {
  const m = useMind();
  const [step, setStep] = useState("breathe"); // breathe → ground → name → end
  const [g, setG] = useState(0);
  const [feel, setFeel] = useState(null);
  const started = useRef(Date.now());
  const sigh = patternById("sigh");
  const sighTotal = 3 * sigh.phases.reduce((a, p) => a + p.s, 0);

  useEffect(() => {
    keepAwake(true);
    return () => {
      keepAwake(false);
      stopSpeaking();
    };
  }, []);
  useEffect(() => {
    if (step === "ground") speak(GROUNDING[g].text);
  }, [step, g]);

  const finish = (then) => {
    m.log({ kind: "sos", title: feel ? `SOS · ${feel.label}` : "SOS", seconds: (Date.now() - started.current) / 1000 });
    then();
  };
  const quit = () => (Date.now() - started.current > 30000 ? finish(onClose) : onClose());

  return (
    <Screen title="SOS" sub="One step at a time" onClose={quit} footer={step !== "end" ? <Helplines compact /> : null}>
      {step === "breathe" && (
        <div className="animate-fade-in">
          <p className="mx-auto mb-6 max-w-[420px] text-[17px] font-semibold text-white/85">You're okay. This will pass. First, let's slow your body down with three long sighs.</p>
          <BreathRunner pattern={sigh} total={sighTotal} size={210} onDone={() => setStep("ground")} voice={m.prefs.voice} />
          <button onClick={() => setStep("ground")} className="mt-6 text-[14px] font-semibold text-white/50 underline-offset-4 hover:underline">
            Skip
          </button>
        </div>
      )}
      {step === "ground" && (
        <div key={g} className="w-full max-w-[460px] animate-fade-up">
          <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/45">Come back to the room · {g + 1} of 5</div>
          <div className="mx-auto mt-5 grid h-24 w-24 place-items-center rounded-full bg-fin-accent/20 text-[46px] font-extrabold text-fin-accent">{GROUNDING[g].n}</div>
          <p className="mt-5 text-[21px] font-semibold leading-snug">{GROUNDING[g].text}</p>
          <p className="mt-2 text-[14px] text-white/50">Say them out loud or in your head. Take your time.</p>
          <button
            onClick={() => (g < GROUNDING.length - 1 ? setG(g + 1) : setStep("name"))}
            className="mt-7 w-full rounded-2xl bg-white py-3.5 text-[16px] font-bold text-[#1b1530] active:scale-[0.98]"
          >
            {g < GROUNDING.length - 1 ? "Done — next" : "Done"}
          </button>
        </div>
      )}
      {step === "name" && !feel && (
        <div className="w-full max-w-[520px] animate-fade-up">
          <p className="text-[21px] font-semibold">What's strongest right now?</p>
          <p className="mt-1 text-[14px] text-white/50">Naming a feeling makes it a little smaller.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {SOS_FEELINGS.map((f) => (
              <button key={f.id} onClick={() => setFeel(f)} className="flex items-center gap-2 rounded-2xl bg-white/[0.07] px-3 py-3.5 text-left text-[15px] font-semibold hover:bg-white/[0.12] active:scale-[0.98]">
                <span className="text-[22px]">{f.emoji}</span> {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {step === "name" && feel && (
        <div className="w-full max-w-[520px] animate-fade-up text-left">
          <div className="text-center text-[40px]">{feel.emoji}</div>
          <p className="mt-3 text-[18px] font-semibold leading-relaxed text-white/90">{feel.tip}</p>
          <div className="mt-4 rounded-2xl bg-fin-accent/15 px-4 py-3 text-[15px] leading-relaxed text-white/85">
            <b className="text-fin-accent">Next: </b>
            {feel.next}
          </div>
          <button onClick={() => setStep("end")} className="mt-6 w-full rounded-2xl bg-white py-3.5 text-[16px] font-bold text-[#1b1530] active:scale-[0.98]">
            Okay
          </button>
        </div>
      )}
      {step === "end" && (
        <div className="w-full max-w-[460px] animate-fade-up">
          <p className="text-[22px] font-bold">You got through that.</p>
          <p className="mt-1 text-[15px] text-white/60">How are you doing now?</p>
          <div className="mt-5 grid gap-2">
            <button onClick={() => finish(onClose)} className="rounded-2xl bg-white py-3.5 text-[16px] font-bold text-[#1b1530] active:scale-[0.98]">
              I'm okay now
            </button>
            <button onClick={() => finish(onJournal)} className="rounded-2xl bg-white/10 py-3.5 text-[16px] font-semibold hover:bg-white/15">
              Write it out in my journal
            </button>
            <button
              onClick={() => {
                setFeel(null);
                setG(0);
                setStep("breathe");
              }}
              className="rounded-2xl bg-white/10 py-3.5 text-[16px] font-semibold hover:bg-white/15"
            >
              Go through it again
            </button>
          </div>
          <div className="mt-6">
            <Helplines />
          </div>
        </div>
      )}
    </Screen>
  );
}

// ---------- sleep sounds ----------
function SleepSoundSession({ sound, minutes, onClose }) {
  const m = useMind();
  const total = minutes * 60;
  const [vol, setVol] = useState(0.6);
  const [ended, setEnded] = useState(false);
  const [show, setShow] = useState(true);
  const elapsed = useElapsed(!ended);
  const fading = useRef(false);
  const s = SOUNDS.find((x) => x.id === sound) || SOUNDS[0];

  useEffect(() => {
    keepAwake(true);
    stopAll(0.3);
    const t = setTimeout(() => setShow(false), 5000);
    return () => {
      clearTimeout(t);
      keepAwake(false);
      stopAll(1);
    };
  }, []);
  useEffect(() => {
    if (!ended && !fading.current) setSound(s.id, vol);
  }, [vol]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ended) return;
    const left = total - elapsed;
    if (left <= 60 && !fading.current) {
      fading.current = true;
      fadeOutAll(Math.max(1, left));
    }
    if (left <= 0) {
      setEnded(true);
      keepAwake(false);
      m.log({ kind: "sleep", title: `${s.label} sounds`, seconds: total });
    }
  }, [elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const quit = () => {
    if (!ended && elapsed >= 60) m.log({ kind: "sleep", title: `${s.label} sounds`, seconds: elapsed });
    onClose();
  };
  const now = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  return (
    <Screen title={`${s.emoji} ${s.label}`} sub={ended ? "Stopped" : `${clock(total - elapsed)} left`} onClose={quit} dark>
      <button className="absolute inset-0 top-16" aria-label="Show controls" onClick={() => setShow((v) => !v)} />
      <div className="pointer-events-none relative">
        <div className="text-[56px] font-extrabold tabular-nums text-white/25">{now}</div>
        <div className="mt-1 text-[14px] text-white/25">{ended ? "Sounds stopped. Sleep well 🌙" : "Tap anywhere for controls"}</div>
      </div>
      {show && !ended && (
        <div className="relative mt-10 flex animate-fade-in items-center gap-3">
          <RoundBtn icon="minus" label="Quieter" onClick={() => setVol((v) => Math.max(0.1, v - 0.15))} />
          <div className="w-28 text-[14px] text-white/50">Volume {Math.round(vol * 100)}%</div>
          <RoundBtn icon="plus" label="Louder" onClick={() => setVol((v) => Math.min(1, v + 0.15))} />
        </div>
      )}
      {!ended && <p className="relative mt-8 max-w-[340px] text-[12.5px] leading-relaxed text-white/25">The screen stays on (very dark) while sounds play, then turns off normally when the timer ends.</p>}
    </Screen>
  );
}

// ---------- host ----------
export default function SessionHost({ onJournal }) {
  const m = useMind();
  const a = m.active;
  if (!a) return null;
  const close = m.close;
  if (a.type === "breath") return <BreathSession key={a.n} {...a} onClose={close} />;
  if (a.type === "guided") return <GuidedSession key={a.n} id={a.id} onClose={close} />;
  if (a.type === "timer") return <TimerSession key={a.n} {...a} onClose={close} />;
  if (a.type === "sos")
    return (
      <SosSession
        key={a.n}
        onClose={close}
        onJournal={() => {
          close();
          onJournal?.();
        }}
      />
    );
  if (a.type === "sleepsound") return <SleepSoundSession key={a.n} {...a} onClose={close} />;
  return null;
}
