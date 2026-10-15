import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// The Sunday fitness check-in for one week (Monday–Sunday): how it felt,
// what went well, the focus for next week and a snapshot of the numbers.
const WeeklyCheckinSchema = new mongoose.Schema({
  week: { type: String, required: true }, // the week's Sunday, YYYY-MM-DD
  ratings: { type: mongoose.Schema.Types.Mixed, default: {} }, // { energy, hunger, sleep, stress } 1–5
  lastFocus: { type: String, default: "" }, // "yes" | "partly" | "no" — did you stick to last week's focus?
  win: { type: String, default: "" },
  struggle: { type: String, default: "" },
  focus: { type: String, default: "" }, // the one thing to work on next week
  stats: { type: mongoose.Schema.Types.Mixed, default: {} }, // numbers at the time of the check-in
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
WeeklyCheckinSchema.plugin(owned);

export default mongoose.model("WeeklyCheckin", WeeklyCheckinSchema, "weekly_checkins");
