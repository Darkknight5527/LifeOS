import mongoose from "mongoose";

const FinanceSavingsGoalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, required: true, default: 0 },
  targetDate: { type: String, default: "" },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceSavingsGoal", FinanceSavingsGoalSchema, "finance_savings_goals");
