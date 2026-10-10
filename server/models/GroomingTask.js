import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const GroomingTaskSchema = new mongoose.Schema({
  date: { type: String, required: true },
  taskType: { type: String, required: true },
  duration: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
GroomingTaskSchema.plugin(owned);

export default mongoose.model("GroomingTask", GroomingTaskSchema, "grooming_tasks");
