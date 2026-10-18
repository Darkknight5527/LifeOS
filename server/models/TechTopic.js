import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Tech & Learning › one topic on your learning path.
const TechTopicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  stage: { type: String, default: "My path", maxlength: 60 },
  order: { type: Number, default: 0 },
  skillId: { type: String, default: "" },
  done: { type: Boolean, default: false },
  note: { type: String, default: "", maxlength: 500 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechTopicSchema.plugin(owned);

export default mongoose.model("TechTopic", TechTopicSchema, "tech_topics");
