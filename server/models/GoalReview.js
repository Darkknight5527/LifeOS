import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const GoalReviewSchema = new mongoose.Schema({
  date: { type: String, required: true },
  goalId: { type: String, required: true },
  goalTitle: { type: String, required: true },
  category: { type: String, default: "" },
  progressSnapshot: { type: Number, default: 0 },
  note: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
GoalReviewSchema.plugin(owned);

export default mongoose.model("GoalReview", GoalReviewSchema, "goal_reviews");
