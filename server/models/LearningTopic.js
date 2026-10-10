import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const ModuleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const LearningTopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true }, // course, self-directed, reading
  source: { type: String, default: "" },
  notes: { type: String, default: "" },
  progress: { type: Number, default: 0 }, // auto-computed from modules
  modules: { type: [ModuleSchema], default: [] },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LearningTopicSchema.plugin(owned);

export default mongoose.model("LearningTopic", LearningTopicSchema, "learning");
