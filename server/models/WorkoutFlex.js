import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const WorkoutFlexSchema = new mongoose.Schema({
  date: { type: String, required: true },
  type: { type: String, required: true }, // e.g. "Flexibility", "Sport"
  activity: { type: String, required: true },
  duration: { type: Number, default: 0 },
  intensity: { type: String, default: "" },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
WorkoutFlexSchema.plugin(owned);

export default mongoose.model("WorkoutFlex", WorkoutFlexSchema, "workout_flex");
