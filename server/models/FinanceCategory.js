import mongoose from "mongoose";

// A spending subcategory (e.g. "Rent", "Dining out", "SIP") that belongs to
// one of the three salary buckets. `limit` is an optional monthly cap.
const FinanceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  bucket: { type: String, enum: ["needs", "wants", "savings"], default: null },
  limit: { type: Number, default: null },
  order: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceCategory", FinanceCategorySchema, "finance_categories");
