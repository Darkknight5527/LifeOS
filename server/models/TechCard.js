import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Tech & Learning › a flashcard for a technical concept.
const TechCardSchema = new mongoose.Schema({
  front: { type: String, required: true, trim: true, maxlength: 400 },
  back: { type: String, default: "", maxlength: 2000 },
  skillId: { type: String, default: "" },
  // Spaced repetition (same scheduling as the word flashcards)
  ease: { type: Number, default: 2.5, min: 1.3, max: 3.5 },
  interval: { type: Number, default: 0, min: 0 },
  reps: { type: Number, default: 0, min: 0 },
  lapses: { type: Number, default: 0, min: 0 },
  due: { type: String, default: "" }, // YYYY-MM-DD ("" = new, due now)
  lastReviewed: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechCardSchema.plugin(owned);

export default mongoose.model("TechCard", TechCardSchema, "tech_cards");
