import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// One entry per day. `doneSteps` holds the keys of routine steps completed
// that day (see SkincareStep). The am*/pm* booleans are from the original
// fixed routine and are still read for older entries.
const SkinLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  doneSteps: { type: [String], default: undefined },
  amCleanser: { type: Boolean, default: false },
  amMoisturizer: { type: Boolean, default: false },
  amSunscreen: { type: Boolean, default: false },
  pmCleanser: { type: Boolean, default: false },
  pmMoisturizer: { type: Boolean, default: false },
  condition: { type: String, default: "" },
  concerns: { type: [String], default: [] },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
SkinLogSchema.plugin(owned);

export default mongoose.model("SkinLog", SkinLogSchema, "skin_logs");
