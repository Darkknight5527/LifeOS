import mongoose from "mongoose";

const FinanceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceCategory", FinanceCategorySchema, "finance_categories");
