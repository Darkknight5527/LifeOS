import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true }, // work, side, personal
  priority: { type: String, default: "medium" },
  link: { type: String, default: "" },
  tags: { type: [String], default: [] },
  notes: { type: String, default: "" },
  status: { type: String, default: "active" },
  progress: { type: Number, default: 0 }, // auto-computed from tasks
  tasks: { type: [TaskSchema], default: [] },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("Project", ProjectSchema, "projects");
