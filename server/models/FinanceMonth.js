import mongoose from "mongoose";

// Take-home salary for one month and how it is split across the buckets.
const FinanceMonthSchema = new mongoose.Schema({
  month: { type: String, required: true }, // "YYYY-MM"
  salary: { type: Number, required: true, default: 0 },
  needs: { type: Number, default: 0 },
  wants: { type: Number, default: 0 },
  savings: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceMonth", FinanceMonthSchema, "finance_months");
