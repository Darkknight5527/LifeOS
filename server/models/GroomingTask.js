import mongoose from "mongoose";

const GroomingTaskSchema = new mongoose.Schema({
  date: { type: String, required: true },
  taskType: { type: String, required: true },
  duration: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("GroomingTask", GroomingTaskSchema, "grooming_tasks");
