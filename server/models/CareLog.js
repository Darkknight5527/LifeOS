import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// One entry per date per area. `done` lists the CareItem keys completed that
// day (daily steps and periodic tasks). Hair entries can also carry a check-in.
const CareLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  area: { type: String, enum: ["hair", "body"], required: true },
  done: { type: [String], default: [] },
  fall: { type: String, default: "" }, // hair: low | normal | high
  scalp: { type: [String], default: [] }, // hair: dry, oily, itchy, dandruff…
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
CareLogSchema.plugin(owned);

export default mongoose.model("CareLog", CareLogSchema, "care_logs");
