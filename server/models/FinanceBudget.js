import mongoose from "mongoose";

const FinanceBudgetSchema = new mongoose.Schema({
  month: { type: String, required: true }, // "YYYY-MM"
  category: { type: String, required: true },
  amount: { type: Number, required: true, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceBudget", FinanceBudgetSchema, "finance_budgets");
