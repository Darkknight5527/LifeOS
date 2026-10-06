// A quick calculator for splitting bills, adding up receipts, working out
// percentages. Works fully from the keyboard; the answer can be logged as an
// expense in one step.
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, Sheet } from "./fin-ui.jsx";
import { MAX_AMOUNT } from "./lib";

const OPS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

/* ---------- safe evaluator (no eval) ----------
 * expr   := term (("+" | "-") term)*
 * term   := factor (("*" | "/") factor)*
 * factor := "-" factor | number "%"?
 * "a + b%" means a plus b percent of a (like a phone calculator);
 * elsewhere "b%" is just b ÷ 100.
 */
function evaluate(src) {
  const s = src.replace(/\s+/g, "");
  if (!s) return null;
  let i = 0;
  const peek = () => s[i];
  function number() {
    const m = /^\d*\.?\d+|^\d+\.?/.exec(s.slice(i));
    if (!m) throw new Error("Expected a number");
    i += m[0].length;
    return parseFloat(m[0]);
  }
  function factor() {
    if (peek() === "-") {
      i++;
      const f = factor();
      return { v: -f.v, pct: f.pct };
    }
    const v = number();
    if (peek() === "%") {
      i++;
      return { v, pct: true };
    }
    return { v, pct: false };
  }
  function term() {
    const first = factor();
    let v = first.pct ? first.v / 100 : first.v;
    let lonePct = first.pct && peek() !== "*" && peek() !== "/";
    while (peek() === "*" || peek() === "/") {
      const op = s[i++];
      const f = factor();
      const r = f.pct ? f.v / 100 : f.v;
      if (op === "/" && r === 0) throw new Error("Can't divide by zero");
      v = op === "*" ? v * r : v / r;
      lonePct = false;
    }
    return { v, lonePct, raw: first.v };
  }
  function expr() {
    let { v } = term();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const t = term();
      const r = t.lonePct ? (v * t.raw) / 100 : t.v;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const v = expr();
  if (i < s.length) throw new Error("Check the expression");
  if (!Number.isFinite(v) || Math.abs(v) >= 1e15) throw new Error("Result too large");
  return Math.round(v * 1e10) / 1e10;
}

// A number as plain digits (never "1e-7" / "1e+21"), so it can be typed on.
function plain(v) {
  if (v === 0) return "0";
  const t = Math.abs(v) < 1e-6 ? "0" : v.toFixed(10).replace(/\.?0+$/, "");
  return t === "-0" ? "0" : t;
}

const fmt = (n) => (n == null ? "" : n.toLocaleString("en-IN", { maximumFractionDigits: 8 }));
const pretty = (e) => e.replace(/[+\-*/]/g, (c) => ` ${OPS[c]} `).replace(/\s+/g, " ").trim();

const KEYS = [
  ["C", "clear"],
  ["⌫", "back"],
  ["%", "%"],
  ["÷", "/"],
  ["7"],
  ["8"],
  ["9"],
  ["×", "*"],
  ["4"],
  ["5"],
  ["6"],
  ["−", "-"],
  ["1"],
  ["2"],
  ["3"],
  ["+", "+"],
  ["00"],
  ["0"],
  [".", "."],
  ["=", "="],
];

export default function Calculator({ open, onClose, onUseAmount }) {
  const [expr, setExpr] = useState("");
  const [history, setHistory] = useState([]);
  const [flash, setFlash] = useState(null); // which key to light up
  const [justSolved, setJustSolved] = useState(false);
  const flashTimer = useRef(null);

  let preview = null;
  let err = null;
  try {
    preview = evaluate(expr.replace(/[+\-*/.]$/, ""));
  } catch (e) {
    err = e.message;
  }

  // Current values in refs, so a key press works out the next state in one go
  // (no side effects inside state updaters — they can run twice).
  const exprRef = useRef(expr);
  exprRef.current = expr;
  const solvedRef = useRef(justSolved);
  solvedRef.current = justSolved;

  const press = useCallback((k) => {
    setFlash(k);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 120);
    const cur = exprRef.current;
    const solved = solvedRef.current;
    const set = (next, isSolved = false) => {
      exprRef.current = next;
      solvedRef.current = isSolved;
      setExpr(next);
      setJustSolved(isSolved);
    };
    if (k === "clear") return set("");
    if (k === "back") return set(solved ? "" : cur.slice(0, -1));
    if (k === "=") {
      let v = null;
      try {
        v = evaluate(cur.replace(/[+\-*/.]$/, ""));
      } catch {
        return;
      }
      if (v == null) return;
      if (Math.abs(v) >= 1e15) return; // too big to show without "e+" notation
      setHistory((h) => [{ expr: cur, v }, ...h].slice(0, 5));
      return set(plain(v), true);
    }
    const isOp = "+-*/".includes(k);
    // Typing a digit right after "=" starts fresh; an operator continues.
    const base = solved && !isOp && k !== "%" ? "" : cur;
    if (isOp) {
      if (!base) return set(k === "-" ? "-" : base);
      if ("+-*/".includes(base.slice(-1))) return set(base.slice(0, -1) + k);
      return set(base + k);
    }
    if (k === "%") return set(base && /[\d.]$/.test(base) ? base + "%" : base);
    if (k === ".") {
      const lastNum = base.split(/[+\-*/]/).pop();
      if (lastNum.includes(".") || lastNum.includes("%")) return set(base);
      return set(base + (lastNum === "" ? "0." : "."));
    }
    if (/%$/.test(base)) return set(base); // need an operator after a percent
    return set((base + k).slice(0, 60));
  }, []);

  // Keyboard: digits, + − × ÷ (also * / x), %, ., Enter or =, Backspace, Delete or C to clear.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      let mapped = null;
      if (/^\d$/.test(k)) mapped = k;
      else if (k === "+" || k === "-" || k === "*" || k === "/" || k === "%" || k === ".") mapped = k;
      else if (k === "x" || k === "X") mapped = "*";
      else if (k === "," ) mapped = ".";
      else if (k === "Enter" || k === "=") mapped = "=";
      else if (k === "Backspace") mapped = "back";
      else if (k === "Delete" || k === "c" || k === "C") mapped = "clear";
      if (!mapped) return;
      // Let Enter activate a focused button other than the keypad (e.g. "Log as expense").
      if (k === "Enter" && document.activeElement?.dataset?.calcAction) return;
      e.preventDefault();
      e.stopPropagation();
      press(mapped);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, press]);

  const value = justSolved ? Number(expr) : preview;
  const canUse = value != null && value > 0 && value <= MAX_AMOUNT;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Calculator"
      titleExtra={<HelpPopover />}
      footer={
        <button
          data-calc-action="use"
          disabled={!canUse}
          onClick={() => onUseAmount(Math.round(value * 100) / 100)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] py-3.5 text-[16px] font-bold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          <Icon name="plus" size={18} stroke={2.6} /> Log {canUse ? `₹${fmt(Math.round(value * 100) / 100)}` : "result"} as expense
        </button>
      }
    >
      {/* Display */}
      <div className="rounded-[22px] bg-fin-input px-5 py-4 text-right [@media(max-height:760px)]:py-2.5" aria-live="polite">
        <div className="min-h-[22px] truncate text-[15px] text-fin-muted">{justSolved ? (history[0] ? `${pretty(history[0].expr)} =` : "") : pretty(expr) || " "}</div>
        <div className={`tabular mt-1 truncate text-[40px] font-extrabold leading-tight tracking-tight ${err && expr ? "text-fin-muted" : "text-white"}`}>
          {justSolved ? fmt(Number(expr)) : preview != null ? fmt(preview) : expr === "-" ? "−" : "0"}
        </div>
        {err && expr && !/[+\-*/.]$/.test(expr) && <div className="mt-1 text-[12.5px] text-fin-danger">{err}</div>}
      </div>

      {/* Keypad */}
      <div className="mt-4 grid grid-cols-4 gap-2.5" role="group" aria-label="Keypad">
        {KEYS.map(([label, key = label]) => {
          const op = ["/", "*", "-", "+", "%"].includes(key);
          const eq = key === "=";
          const fn = key === "clear" || key === "back";
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (key === "00") {
                  press("0");
                  press("0");
                } else press(key);
              }}
              aria-label={{ clear: "Clear", back: "Delete last", "/": "Divide", "*": "Multiply", "-": "Minus", "+": "Plus", "%": "Percent", "=": "Equals", ".": "Decimal point" }[key] || label}
              className={`h-14 rounded-2xl text-[22px] [@media(max-height:760px)]:h-11 font-semibold transition active:scale-95 ${
                eq
                  ? "bg-gradient-to-br from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] text-white"
                  : op
                  ? "bg-fin-accent/15 text-fin-accent hover:bg-fin-accent/25"
                  : fn
                  ? "bg-fin-tile text-fin-muted hover:text-white"
                  : "bg-fin-tile text-white hover:bg-[#30303a]"
              } ${flash === key ? "scale-95 brightness-150" : ""}`}
            >
              {label === "⌫" ? <Icon name="left" size={22} stroke={2.4} className="mx-auto" /> : label}
            </button>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[12.5px] font-semibold text-fin-muted">Recent · click to reuse</div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setExpr(String(h.v));
                  setJustSolved(true);
                }}
                title={`${pretty(h.expr)} = ${fmt(h.v)}`}
                className="tabular rounded-full bg-fin-input px-3 py-1.5 text-[13px] text-white/80 hover:bg-fin-tile"
              >
                {fmt(h.v)}
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

// The "i" button next to the title: a small popover with keyboard tips.
const TIPS = [
  ["0–9", "Type numbers"],
  ["+ − * /", "Add, subtract, multiply, divide (x also multiplies)"],
  ["%", "Percent: 500 + 18% adds 18% of 500"],
  ["Enter", "Equals"],
  ["Backspace", "Delete the last character"],
  ["C", "Clear"],
  ["Esc", "Close the calculator"],
  ["K", "Open it from anywhere in Finances"],
];

function HelpPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    // Esc closes the tips first, not the whole calculator.
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-calc-action="help"
        onClick={() => setOpen((v) => !v)}
        aria-label="How to use the calculator"
        aria-expanded={open}
        className={`grid h-8 w-8 place-items-center rounded-full transition ${open ? "bg-fin-accent/20 text-fin-accent" : "text-fin-muted hover:bg-white/5 hover:text-white"}`}
      >
        <Icon name="info" size={18} stroke={2} />
      </button>
      {open && (
        <div role="dialog" aria-label="Calculator tips" className="absolute left-0 top-10 z-10 w-[300px] animate-pop-in rounded-2xl bg-fin-tile p-4 shadow-2xl ring-1 ring-white/10">
          <div className="mb-2 text-[14px] font-semibold">Keyboard shortcuts</div>
          <dl className="space-y-1.5">
            {TIPS.map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-3 text-[13px]">
                <dt className="w-[86px] shrink-0">
                  <kbd className="rounded-md bg-black/30 px-1.5 py-0.5 font-semibold text-fin-accent">{k}</kbd>
                </dt>
                <dd className="leading-snug text-white/75">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

export { evaluate };
