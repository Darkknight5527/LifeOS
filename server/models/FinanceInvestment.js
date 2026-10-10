import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

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

// Belongs to one account (adds userId; queries must name the owner).
FinanceInvestmentSchema.plugin(owned);

export default mongoose.model("FinanceInvestment", FinanceInvestmentSchema, "finance_investments");
