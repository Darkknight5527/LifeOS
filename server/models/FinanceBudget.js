import mongoose from "mongoose";

const FinanceBudgetSchema = new mongoose.Schema({
  month: { type: String, required: true, match: [/^\d{4}-\d{2}$/, "month must be YYYY-MM"] }, // "YYYY-MM"
  category: { type: String, required: true },
  amount: { type: Number, required: true, default: 0, min: [0, "amount can't be negative"], max: [1e10, "amount is too large"] },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceBudget", FinanceBudgetSchema, "finance_budgets");
