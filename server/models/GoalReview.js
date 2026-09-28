import mongoose from "mongoose";

const GoalReviewSchema = new mongoose.Schema({
  date: { type: String, required: true },
  goalId: { type: String, required: true },
  goalTitle: { type: String, required: true },
  category: { type: String, default: "" },
  progressSnapshot: { type: Number, default: 0 },
  note: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("GoalReview", GoalReviewSchema, "goal_reviews");
