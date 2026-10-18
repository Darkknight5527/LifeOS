import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const CheckSchema = new mongoose.Schema({ id: { type: String, required: true }, title: { type: String, required: true, maxlength: 200 }, done: { type: Boolean, default: false } }, { _id: false });

// Tech & Learning › a project (an idea until it's started).
const TechProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  summary: { type: String, default: "", maxlength: 1000 },
  status: { type: String, enum: ["idea", "planned", "building", "shipped", "paused"], default: "idea" },
  repo: { type: String, default: "", maxlength: 300 },
  live: { type: String, default: "", maxlength: 300 },
  stages: { type: [CheckSchema], default: [] }, // architecture → pseudocode → code → …
  skills: { type: [String], default: [] }, // TechSkill ids it uses / needs
  showcase: { type: mongoose.Schema.Types.Mixed, default: {} }, // { readme, demo, bullet, pinned }: booleans
  bullet: { type: String, default: "", maxlength: 500 }, // resume line
  order: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechProjectSchema.plugin(owned);

export default mongoose.model("TechProject", TechProjectSchema, "tech_projects");
