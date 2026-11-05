import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Learning › one lesson of the plan: started / done, and the depth level reached.
const LearnProgressSchema = new mongoose.Schema({
  lessonId: { type: String, required: true }, // e.g. "A1-D1"
  status: { type: String, enum: ["in_progress", "done"], default: "in_progress" },
  level: { type: Number, default: 0, min: 0, max: 4 }, // 0 = not rated, 1–4 = L1–L4
  note: { type: String, default: "", maxlength: 500 },
  startedOn: { type: String, default: "" },
  doneOn: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LearnProgressSchema.plugin(owned);

export default mongoose.model("LearnProgress", LearnProgressSchema, "learn_progress");
