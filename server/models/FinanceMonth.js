import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Take-home salary for one month and how it is split across the buckets.
const FinanceMonthSchema = new mongoose.Schema({
  month: { type: String, required: true, match: [/^\d{4}-\d{2}$/, "month must be YYYY-MM"] }, // "YYYY-MM"
  salary: { type: Number, required: true, default: 0, min: [0, "amount can't be negative"], max: [1e10, "amount is too large"] },
  needs: { type: Number, default: 0 },
  wants: { type: Number, default: 0 },
  savings: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
FinanceMonthSchema.plugin(owned);

export default mongoose.model("FinanceMonth", FinanceMonthSchema, "finance_months");
