import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// One day of medicine doses: which were taken or skipped, and any as-needed doses.
const MedLogSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  doses: { type: mongoose.Schema.Types.Mixed, default: {} }, // { "<medId>@<HH:MM>": { status: "taken" | "skipped", at } }
  extra: { type: mongoose.Schema.Types.Mixed, default: [] }, // as-needed doses: [{ medId, at }]
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
MedLogSchema.plugin(owned);

export default mongoose.model("MedLog", MedLogSchema, "med_logs");
