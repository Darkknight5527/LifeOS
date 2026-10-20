// The journal's PIN screen: create a PIN the first time, then unlock with it.
// Forgot it? Reset with your account password (entries are kept).
import { useEffect, useRef, useState } from "react";
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
    setTimeout(() => {
      setShake(false);
      if (wasTyping.current) box.current?.focus(); // ready to retype, only if you were typing
    }, 400);
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
      j.setPinLength(value.length);
      haptic("light");
    } catch (e) {
      fail(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  /** New PIN text (from the keypad or the typing box). Unlocks as soon as the last digit is in:
   *  the server tells us how long your PIN is; when confirming, it's as long as the first one. */
  const enter = (raw) => {
    if (busy) return;
    setError("");
    const next = String(raw).replace(/\D/g, "").slice(0, 8);
    const grew = next.length > pin.length;
    setPin(next);
    const target = step === "enter" ? j.pinLength : step === "confirm" ? first.length : 0;
    if (grew && target >= 4 && next.length === target) submit(next);
  };
  const press = (k) => {
    if (busy || !k) return;
    if (k === "⌫") return enter(pin.slice(0, -1));
    enter(pin + k);
  };

  // The PIN box waits until you ask for it: press Tab (laptop) or tap it (phone).
  // Until then the keyboard is free for switching tabs, views and domains.
  const box = useRef(null);
  const wasTyping = useRef(false);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Tab" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
      if (document.activeElement === box.current) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable]") || document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      box.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const fine = typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches;

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

      <form
        className={`mt-6 w-full ${shake ? "animate-[shake_0.35s]" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (pin.length >= 4 && !(step === "reset" && !password)) submit(pin);
        }}
      >
        {/* A plain text box drawn as dots, so the browser doesn't offer saved passwords. */}
        <input
          ref={box}
          type="text"
          name="journal-pin"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          data-lpignore="true"
          data-1p-ignore="true"
          spellCheck={false}
          onFocus={() => (wasTyping.current = true)}
          onBlur={() => (wasTyping.current = false)}
          onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
          style={{ WebkitTextSecurity: "disc" }}
          maxLength={8}
          value={pin}
          onChange={(e) => enter(e.target.value)}
          disabled={busy}
          aria-label={step === "reset" ? "New PIN" : "PIN"}
          placeholder={fine ? "Press Tab to type your PIN" : "Tap to type your PIN"}
          className="w-full rounded-2xl bg-fin-input px-4 py-3.5 text-center text-[26px] font-bold tracking-[0.5em] text-white caret-fin-accent outline-none transition placeholder:text-[15px] placeholder:font-medium placeholder:tracking-normal placeholder:text-fin-faint focus:ring-2 focus:ring-fin-accent/50"
        />
      </form>
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
