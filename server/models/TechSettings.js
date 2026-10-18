import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Tech & Learning › your settings (one document).
const TechSettingsSchema = new mongoose.Schema({
  githubUser: { type: String, default: "", maxlength: 39 },
  weeklyGoal: { type: Number, default: 7, min: 0, max: 80 }, // study + build hours a week
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechSettingsSchema.plugin(owned);

export default mongoose.model("TechSettings", TechSettingsSchema, "tech_settings");
