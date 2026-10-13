import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// One journal page. kind "day" = the daily page (one per date);
// kind "week" = the Sunday weekly review (date = that Sunday).
const JournalEntrySchema = new mongoose.Schema({
  kind: { type: String, enum: ["day", "week"], default: "day" },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"] },
  // Check-in (1–5 each; 0 = not set)
  mood: { type: Number, min: 0, max: 5, default: 0 },
  energy: { type: Number, min: 0, max: 5, default: 0 },
  stress: { type: Number, min: 0, max: 5, default: 0 },
  sleep: { type: Number, min: 0, max: 5, default: 0 },
  feelings: { type: [String], default: [] },
  // Reflection
  gratitude: { type: [String], default: [] },
  highlight: { type: String, default: "", maxlength: 2000 },
  drained: { type: String, default: "", maxlength: 2000 },
  energized: { type: String, default: "", maxlength: 2000 },
  learned: { type: String, default: "", maxlength: 2000 },
  tomorrow: { type: [String], default: [] },
  prompt: { type: String, default: "", maxlength: 300 },
  promptAnswer: { type: String, default: "", maxlength: 5000 },
  free: { type: String, default: "", maxlength: 20000 },
  // Weekly review
  wins: { type: String, default: "", maxlength: 5000 },
  lessons: { type: String, default: "", maxlength: 5000 },
  change: { type: String, default: "", maxlength: 5000 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
JournalEntrySchema.plugin(owned);

export default mongoose.model("JournalEntry", JournalEntrySchema, "journal_entries");
