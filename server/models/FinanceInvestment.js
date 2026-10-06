import mongoose from "mongoose";

const FinanceInvestmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // stock, mutual_fund, crypto, other
  units: { type: Number, required: true, default: 0, min: 0 },
  buyPrice: { type: Number, required: true, default: 0, min: 0 }, // per unit
  currentValue: { type: Number, required: true, default: 0, min: 0 }, // per unit, updated manually
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceInvestment", FinanceInvestmentSchema, "finance_investments");
