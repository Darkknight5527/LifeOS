import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const MoodLogSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  mood: { type: String, required: true },
  note: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
MoodLogSchema.plugin(owned);

export default mongoose.model("MoodLog", MoodLogSchema, "mood_logs");
