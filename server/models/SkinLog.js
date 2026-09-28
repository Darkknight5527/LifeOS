import mongoose from "mongoose";

const SkinLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  amCleanser: { type: Boolean, default: false },
  amMoisturizer: { type: Boolean, default: false },
  amSunscreen: { type: Boolean, default: false },
  pmCleanser: { type: Boolean, default: false },
  pmMoisturizer: { type: Boolean, default: false },
  condition: { type: String, default: "" },
  concerns: { type: [String], default: [] },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("SkinLog", SkinLogSchema, "skin_logs");
