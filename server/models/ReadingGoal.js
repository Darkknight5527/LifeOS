import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Library: how many books you want to finish in a year.
const ReadingGoalSchema = new mongoose.Schema({
  year: { type: Number, required: true, min: 2000, max: 2200 },
  goal: { type: Number, min: 1, max: 500, default: 12 },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
ReadingGoalSchema.plugin(owned);

export default mongoose.model("ReadingGoal", ReadingGoalSchema, "reading_goals");
