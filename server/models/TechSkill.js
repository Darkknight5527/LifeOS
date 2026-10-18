import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Tech & Learning › a skill on your map: where you are and where you want to be.
const TechSkillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  area: { type: String, default: "Other", maxlength: 40 },
  level: { type: Number, default: 1, min: 0, max: 5 },
  target: { type: Number, default: 4, min: 0, max: 5 },
  note: { type: String, default: "", maxlength: 1000 },
  order: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechSkillSchema.plugin(owned);

export default mongoose.model("TechSkill", TechSkillSchema, "tech_skills");
