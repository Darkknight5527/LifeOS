import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Learning › the mastery plan's settings: start date and paused date ranges.
const LearnSettingsSchema = new mongoose.Schema({
  startDate: { type: String, default: "2026-11-09" },
  pauses: { type: mongoose.Schema.Types.Mixed, default: [] }, // [{ id, from, to, note }]
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LearnSettingsSchema.plugin(owned);

export default mongoose.model("LearnSettings", LearnSettingsSchema, "learn_settings");
