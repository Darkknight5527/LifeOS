import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const FinanceTransactionSchema = new mongoose.Schema({
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"] }, // YYYY-MM-DD
  type: { type: String, required: true, enum: ["income", "expense"] },
  category: { type: String, required: true }, // subcategory name
  bucket: { type: String, default: "" }, // needs | wants | savings, captured at log time
  amount: { type: Number, required: true, min: [0, "amount can't be negative"], max: [1e10, "amount is too large"] },
  note: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
FinanceTransactionSchema.plugin(owned);

export default mongoose.model("FinanceTransaction", FinanceTransactionSchema, "finance_transactions");
