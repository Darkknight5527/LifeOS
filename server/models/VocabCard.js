import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Skills › Words: one flashcard, reviewed with spaced repetition.
const VocabCardSchema = new mongoose.Schema({
  word: { type: String, required: true, trim: true, maxlength: 80 },
  pos: { type: String, default: "", maxlength: 30 }, // part of speech
  meaning: { type: String, default: "", maxlength: 600 },
  example: { type: String, default: "", maxlength: 600 },
  mine: { type: String, default: "", maxlength: 600 }, // your own sentence with it
  source: { type: String, enum: ["list", "own"], default: "own" },
  // Spaced repetition
  ease: { type: Number, default: 2.5, min: 1.3, max: 3.5 },
  interval: { type: Number, default: 0, min: 0 }, // days
  reps: { type: Number, default: 0, min: 0 },
  lapses: { type: Number, default: 0, min: 0 },
  due: { type: String, default: "" }, // YYYY-MM-DD ("" = new, due now)
  lastReviewed: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
VocabCardSchema.plugin(owned);

export default mongoose.model("VocabCard", VocabCardSchema, "vocab_cards");
