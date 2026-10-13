import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Library: pages read on a day (from → to) — for pace and finish estimates.
const ReadingLogSchema = new mongoose.Schema({
  bookId: { type: String, required: true, maxlength: 40 },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"] },
  from: { type: Number, min: 0, default: 0 },
  to: { type: Number, min: 0, default: 0 },
  pages: { type: Number, required: true, min: 1, max: 5000 },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
ReadingLogSchema.plugin(owned);

export default mongoose.model("ReadingLog", ReadingLogSchema, "reading_logs");
