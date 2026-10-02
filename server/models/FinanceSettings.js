import mongoose from "mongoose";

// Single-document collection holding the default split ratio (percent).
const FinanceSettingsSchema = new mongoose.Schema({
  ratioNeeds: { type: Number, default: 50 },
  ratioWants: { type: Number, default: 30 },
  ratioSavings: { type: Number, default: 20 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceSettings", FinanceSettingsSchema, "finance_settings");
