import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// A step in the morning or evening skincare routine.
const SkincareStepSchema = new mongoose.Schema({
  key: { type: String, required: true }, // stable id used in SkinLog.doneSteps
  name: { type: String, required: true }, // e.g. "Sunscreen"
  product: { type: String, default: "" }, // e.g. "Re'equil SPF 50"
  period: { type: String, enum: ["am", "pm"], required: true },
  days: { type: [Number], default: [] }, // 0=Sun..6=Sat; empty = every day
  order: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
SkincareStepSchema.plugin(owned);

export default mongoose.model("SkincareStep", SkincareStepSchema, "skincare_steps");
