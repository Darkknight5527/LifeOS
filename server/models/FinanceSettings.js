import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Single-document collection holding the default split ratio (percent).
const FinanceSettingsSchema = new mongoose.Schema({
  ratioNeeds: { type: Number, default: 50 },
  ratioWants: { type: Number, default: 30 },
  ratioSavings: { type: Number, default: 20 },
  // Credit card: { name, billDay (1–28), payDays (days after the bill to pay), limit, paid: { "YYYY-MM-DD" bill date: true } }
  card: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
FinanceSettingsSchema.plugin(owned);

export default mongoose.model("FinanceSettings", FinanceSettingsSchema, "finance_settings");
