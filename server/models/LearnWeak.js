import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Learning › a weak topic to re-teach, linked to a lesson.
const LearnWeakSchema = new mongoose.Schema({
  topic: { type: String, required: true, maxlength: 200 },
  lessonId: { type: String, default: "" },
  note: { type: String, default: "", maxlength: 1000 },
  status: { type: String, enum: ["open", "retaught", "resolved"], default: "open" },
  closedOn: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LearnWeakSchema.plugin(owned);

export default mongoose.model("LearnWeak", LearnWeakSchema, "learn_weak");
