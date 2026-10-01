import { useState } from "react";
import BudgetSection from "./finances/BudgetSection.jsx";
import TransactionsSection from "./finances/TransactionsSection.jsx";
import InvestmentsSection from "./finances/InvestmentsSection.jsx";
import SavingsSection from "./finances/SavingsSection.jsx";

const FINANCE_SUB = [
  { id: "budget", label: "Budget" },
  { id: "transactions", label: "Transactions" },
  { id: "investments", label: "Investments" },
  { id: "savings", label: "Savings Goals" },
];

export default function FinancesPage() {
  const [sub, setSub] = useState("budget");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Finances</h1>
      <p className="mb-5 text-sm text-slate-500">Budgeting, transactions, investments, savings goals</p>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {FINANCE_SUB.map((s) => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
              sub === s.id
                ? "border-amber-600 bg-amber-600 text-white"
                : "border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sub === "budget" && <BudgetSection />}
      {sub === "transactions" && <TransactionsSection />}
      {sub === "investments" && <InvestmentsSection />}
      {sub === "savings" && <SavingsSection />}
    </div>
  );
}
