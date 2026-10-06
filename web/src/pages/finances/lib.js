// Pure helpers for the Finances section: money, dates, buckets and the
// month/week maths every tab shares.

export const CURRENCY = "₹";

export function formatMoney(n, { compact = false } = {}) {
  const num = Number(n) || 0;
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  if (compact && abs >= 10000000) {
    return `${sign}${CURRENCY}${(abs / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 2 })}Cr`;
  }
  if (compact && abs >= 100000) {
    return `${sign}${CURRENCY}${(abs / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;
  }
  if (compact && abs >= 1000) {
    return `${sign}${CURRENCY}${(abs / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}k`;
  }
  return `${sign}${CURRENCY}${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const BUCKETS = [
  { id: "needs", label: "Needs", color: "#fb8a3c", soft: "rgba(251,138,60,0.14)", icon: "home" },
  { id: "wants", label: "Wants", color: "#facc15", soft: "rgba(250,204,21,0.14)", icon: "bag" },
  { id: "savings", label: "Savings", color: "#34d399", soft: "rgba(52,211,153,0.14)", icon: "piggy" },
];
export const BUCKET = Object.fromEntries(BUCKETS.map((b) => [b.id, b]));

export const PRESETS = [
  [50, 30, 20],
  [60, 20, 20],
  [70, 20, 10],
  [40, 30, 30],
];
export const DEFAULT_RATIO = { needs: 50, wants: 30, savings: 20 };

// Starter subcategories, seeded only when the user has none at all.
export const DEFAULT_SUBCATEGORIES = {
  needs: ["Rent", "Food", "Travel", "Groceries", "Bills"],
  wants: ["Shopping", "Dining out", "Entertainment"],
  savings: ["SIP", "Mutual Funds", "Investments", "Emergency Fund"],
};

// Where the old flat category list maps to, for one-time migration.
const LEGACY_BUCKET = {
  food: "needs", rent: "needs", transport: "needs", travel: "needs", utilities: "needs",
  bills: "needs", groceries: "needs", health: "needs", medical: "needs",
  shopping: "wants", entertainment: "wants", other: "wants", "dining out": "wants",
  savings: "savings", sip: "savings", investments: "savings", "mutual funds": "savings", "emergency fund": "savings",
};
export function guessBucket(name) {
  return LEGACY_BUCKET[(name || "").trim().toLowerCase()] || "wants";
}

// ---------- dates (all local time) ----------
const pad = (n) => String(n).padStart(2, "0");
export function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayISO() {
  return isoDate(new Date());
}
export function parseISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}
export function monthLabel(key, { short = false } = {}) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: short ? "short" : "long", year: "numeric" });
}
export function monthShort(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}
export function daysInMonth(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
// Weeks start on Monday.
export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - offset);
  return x;
}
export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function weekRangeLabel(start) {
  const end = addDays(start, 6);
  const f = (d) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return `${f(start)} – ${f(end)}`;
}
export function dayHeading(iso) {
  const today = todayISO();
  const yesterday = isoDate(addDays(new Date(), -1));
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  return parseISO(iso).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}
export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ---------- maths ----------
export function sum(list, f = (x) => x) {
  // Rounded to paise so floating-point leftovers (0.30000000000000004) never show.
  return Math.round(list.reduce((s, x) => s + (Number(f(x)) || 0), 0) * 100) / 100;
}
export function splitByRatio(salary, ratio) {
  // Round the running totals, so the three parts always add up to the salary.
  const needs = Math.round((salary * ratio.needs) / 100);
  const wants = Math.max(0, Math.round((salary * (ratio.needs + ratio.wants)) / 100) - needs);
  return { needs, wants, savings: Math.max(0, Math.round(salary) - needs - wants) };
}

// ---------- amounts typed by the user ----------
export const MAX_AMOUNT = 99999999.99; // just under ₹10 Cr
/** Text from a money field → number rounded to paise, or NaN. */
export function toAmount(text) {
  const n = Math.round(parseFloat(text) * 100) / 100;
  return Number.isFinite(n) ? n : NaN;
}
/** Error message for a money field, or "" if it's fine. */
export function amountError(text, { allowZero = false, label = "amount" } = {}) {
  if (text === "" || text == null) return "";
  const n = toAmount(text);
  if (!Number.isFinite(n)) return `Enter a valid ${label}`;
  if (n > MAX_AMOUNT) return "That's too large";
  if (!allowZero && n <= 0) return `The ${label} must be more than ₹0`;
  return "";
}
/** Compare money by paise so 0.1 + 0.2 style rounding doesn't show "Over by ₹0". */
export const paise = (n) => Math.round((Number(n) || 0) * 100);
export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}
