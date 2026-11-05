import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Learning › the Saturday quiz score for one week of the plan.
const LearnQuizSchema = new mongoose.Schema({
  week: { type: String, required: true }, // "A1"
  score: { type: Number, default: 0, min: 0, max: 10 },
  date: { type: String, default: "" },
  note: { type: String, default: "", maxlength: 500 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LearnQuizSchema.plugin(owned);

export default mongoose.model("LearnQuiz", LearnQuizSchema, "learn_quizzes");
