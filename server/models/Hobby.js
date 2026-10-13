import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const MilestoneSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 200 },
    done: { type: Boolean, default: false },
    doneAt: { type: String, default: "" },
  },
  { _id: true }
);

// Skills › Hobbies: a skill you're building (guitar, chess, …).
const HobbySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  emoji: { type: String, default: "⭐", maxlength: 8 },
  preset: { type: String, default: "", maxlength: 40 },
  weeklyGoal: { type: Number, default: 120, min: 0, max: 5000 }, // minutes per week
  milestones: { type: [MilestoneSchema], default: [] },
  notes: { type: String, default: "", maxlength: 3000 },
  status: { type: String, enum: ["active", "later", "paused"], default: "active" },
  order: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
HobbySchema.plugin(owned);

export default mongoose.model("Hobby", HobbySchema, "hobbies");
