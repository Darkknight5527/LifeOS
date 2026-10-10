import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const LearningSessionSchema = new mongoose.Schema({
  topicId: { type: String, required: true },
  topicTitle: { type: String, required: true },
  date: { type: String, required: true },
  minutes: { type: Number, default: 0 },
  note: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LearningSessionSchema.plugin(owned);

export default mongoose.model("LearningSession", LearningSessionSchema, "learning_sessions");
