import mongoose from "mongoose";

const FinanceTransactionSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  type: { type: String, required: true, enum: ["income", "expense"] },
  category: { type: String, required: true }, // subcategory name
  bucket: { type: String, default: "" }, // needs | wants | savings, captured at log time
  amount: { type: Number, required: true },
  note: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceTransaction", FinanceTransactionSchema, "finance_transactions");
