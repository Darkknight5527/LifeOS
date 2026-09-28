import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const GoalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true }, // all, career, personal, health, financial
  targetDate: { type: String, default: "" },
  notes: { type: String, default: "" },
  status: { type: String, default: "active" },
  progress: { type: Number, default: 0 }, // auto-computed from milestones
  milestones: { type: [MilestoneSchema], default: [] },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("Goal", GoalSchema, "goals");
