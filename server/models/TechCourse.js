import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const CheckSchema = new mongoose.Schema({ id: { type: String, required: true }, title: { type: String, required: true, maxlength: 200 }, done: { type: Boolean, default: false } }, { _id: false });

// Tech & Learning › a course or certification, with its modules.
const TechCourseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  provider: { type: String, default: "", maxlength: 80 },
  url: { type: String, default: "", maxlength: 300 },
  status: { type: String, enum: ["active", "planned", "done", "paused"], default: "active" },
  skills: { type: [String], default: [] },
  modules: { type: [CheckSchema], default: [] },
  progress: { type: Number, default: null, min: 0, max: 100 }, // % for courses without a module list (e.g. from a portal)
  targetDate: { type: String, default: "" },
  certUrl: { type: String, default: "", maxlength: 300 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechCourseSchema.plugin(owned);

export default mongoose.model("TechCourse", TechCourseSchema, "tech_courses");
