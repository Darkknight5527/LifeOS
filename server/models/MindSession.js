import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// One finished Mind session: breathing, meditation, SOS, sleep or focus.
const MindSessionSchema = new mongoose.Schema({
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"] },
  kind: { type: String, enum: ["breathe", "meditate", "sos", "sleep", "focus"], required: true },
  title: { type: String, default: "", maxlength: 120 },
  seconds: { type: Number, min: 0, max: 24 * 3600, default: 0 },
  // Afterwards, compared with before: -1 worse, 0 same, 1 better, 2 much better (empty = skipped)
  felt: { type: Number, min: -1, max: 2 },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
MindSessionSchema.plugin(owned);

export default mongoose.model("MindSession", MindSessionSchema, "mind_sessions");
