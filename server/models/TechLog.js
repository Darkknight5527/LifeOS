import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Tech & Learning › a build-log entry: what you did or shipped on a project.
const TechLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  projectId: { type: String, default: "" },
  text: { type: String, required: true, maxlength: 1000 },
  shipped: { type: Boolean, default: false },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechLogSchema.plugin(owned);

export default mongoose.model("TechLog", TechLogSchema, "tech_logs");
