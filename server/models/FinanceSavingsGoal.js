import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const FinanceSavingsGoalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  targetAmount: { type: Number, required: true, min: [0, "amount can't be negative"], max: [1e10, "amount is too large"] },
  currentAmount: { type: Number, required: true, default: 0, min: [0, "amount can't be negative"], max: [1e10, "amount is too large"] },
  targetDate: { type: String, default: "" },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
FinanceSavingsGoalSchema.plugin(owned);

export default mongoose.model("FinanceSavingsGoal", FinanceSavingsGoalSchema, "finance_savings_goals");
