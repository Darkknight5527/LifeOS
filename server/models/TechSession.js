import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Tech & Learning › timed work: building a project or studying.
const TechSessionSchema = new mongoose.Schema({
  date: { type: String, required: true },
  kind: { type: String, enum: ["study", "project"], default: "study" },
  projectId: { type: String, default: "" },
  courseId: { type: String, default: "" },
  skillId: { type: String, default: "" },
  minutes: { type: Number, default: 0, min: 0, max: 1440 },
  note: { type: String, default: "", maxlength: 500 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechSessionSchema.plugin(owned);

export default mongoose.model("TechSession", TechSessionSchema, "tech_sessions");
