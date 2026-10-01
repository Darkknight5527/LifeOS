export const CURRENCY = "₹";

export function formatMoney(n) {
  const num = Number(n) || 0;
  return `${CURRENCY}${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const DEFAULT_CATEGORIES = [
  "Food", "Rent", "Transport", "Utilities", "Shopping", "Entertainment", "Health", "Savings", "Other",
];

export const INVESTMENT_TYPES = ["stock", "mutual_fund", "crypto", "other"];

export function currentMonthISO() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}
