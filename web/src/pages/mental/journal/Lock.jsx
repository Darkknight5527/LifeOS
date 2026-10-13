// The journal's PIN screen: create a PIN the first time, then unlock with it.
// Forgot it? Reset with your account password (entries are kept).
import { useEffect, useState } from "react";
import { Icon } from "../../finances/fin-ui.jsx";
import { haptic } from "../../../lib/inApp.js";
import { useJournal } from "./JournalContext.jsx";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function JournalLock() {
  const j = useJournal();
  const creating = j.lock === "needPin";
  const [step, setStep] = useState(creating ? "new" : "enter"); // new | confirm | enter | reset
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setStep(creating ? "new" : "enter");
    setPin("");
  }, [creating]);

  const fail = (msg) => {
    setError(msg);
    setPin("");
    setShake(true);
    haptic("heavy");
    setTimeout(() => setShake(false), 400);
  };

  const submit = async (value) => {
    setError("");
    if (step === "new") {
      if (value.length < 4) return fail("Use at least 4 digits.");
      setFirst(value);
      setPin("");
      setStep("confirm");
      return;
    }
    setBusy(true);
    try {
      if (step === "confirm") {
        if (value !== first) {
          setStep("new");
          return fail("The PINs didn't match — start again.");
        }
        await j.setPin(value);
      } else if (step === "enter") await j.unlock(value);
      else if (step === "reset") await j.changePin({ pin: value, password });
      haptic("light");
    } catch (e) {
      fail(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const press = (k) => {
    if (busy || !k) return;
    setError("");
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    // PINs can be 4–8 digits, so nothing auto-submits: tap Unlock (or press Enter).
    setPin((p) => (p + k).slice(0, 8));
  };

  // Physical keyboard on the laptop.
  useEffect(() => {
    const onKey = (e) => {
      if (step === "reset" && e.target.closest?.("input")) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Enter" && pin.length >= 4) submit(pin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const title = {
    new: "Create a journal PIN",
    confirm: "Type the PIN again",
    enter: "Journal locked",
    reset: "Choose a new PIN",
  }[step];
  const sub = {
    new: "4–8 digits. You'll need it each time you open the journal.",
    confirm: "Just to be sure.",
    enter: "Enter your PIN to open it.",
    reset: "Type your account password below, then the new PIN.",
  }[step];

  return (
    <div className="mx-auto flex max-w-[360px] flex-col items-center pt-4 text-center lg:pt-8">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-fin-accent/15 text-fin-accent">
        <Icon name="edit" size={26} stroke={2} />
      </span>
      <div className="mt-4 text-[21px] font-extrabold">{title}</div>
      <div className="mt-1 text-[14px] text-fin-muted">{sub}</div>

      {step === "reset" && (
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Account password"
          autoComplete="current-password"
          className="mt-4 w-full rounded-2xl bg-fin-input px-4 py-3 text-[15px] text-white outline-none placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50"
        />
      )}

      <div className={`mt-6 flex gap-3 ${shake ? "animate-[shake_0.35s]" : ""}`} aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full transition ${i < pin.length ? "bg-fin-accent" : "bg-white/15"}`} />
        ))}
      </div>
      <div className="mt-3 h-5 text-[13.5px] text-fin-danger" role="alert">
        {error || (j.lockedUntil > Date.now() && step === "enter" ? "Too many wrong tries — wait a bit or reset with your password." : "")}
      </div>

      <div className="mt-2 grid w-full grid-cols-3 gap-2.5">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              onClick={() => press(k)}
              disabled={busy}
              aria-label={k === "⌫" ? "Delete" : k}
              className="h-14 rounded-2xl bg-fin-input text-[22px] font-semibold transition active:scale-95 active:bg-fin-tile disabled:opacity-50"
            >
              {k}
            </button>
          )
        )}
      </div>
      <button
        onClick={() => submit(pin)}
        disabled={busy || pin.length < 4 || (step === "reset" && !password)}
        className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] py-3.5 text-[16px] font-bold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-40"
      >
        {busy ? "…" : step === "new" ? "Next" : step === "enter" ? "Unlock" : "Save PIN"}
      </button>

      {(step === "enter" || step === "reset") && (
        <button
          onClick={() => {
            setStep(step === "reset" ? "enter" : "reset");
            setPin("");
            setError("");
          }}
          className="mt-3 text-[13.5px] font-semibold text-fin-muted hover:text-white"
        >
          {step === "reset" ? "Back to unlock" : "Forgot PIN? Reset with your password"}
        </button>
      )}
      <p className="mt-4 text-[12px] leading-relaxed text-fin-faint">Your journal is never sent to the AI. It locks again after 30 minutes, or 5 minutes in the background.</p>
    </div>
  );
}
