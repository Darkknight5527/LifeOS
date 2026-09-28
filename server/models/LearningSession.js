import mongoose from "mongoose";

const LearningSessionSchema = new mongoose.Schema({
  topicId: { type: String, required: true },
  topicTitle: { type: String, required: true },
  date: { type: String, required: true },
  minutes: { type: Number, default: 0 },
  note: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("LearningSession", LearningSessionSchema, "learning_sessions");
