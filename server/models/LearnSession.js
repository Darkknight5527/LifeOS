import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Learning › a study session (time spent on a day).
const LearnSessionSchema = new mongoose.Schema({
  date: { type: String, required: true },
  lessonId: { type: String, default: "" },
  minutes: { type: Number, default: 0, min: 0, max: 600 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LearnSessionSchema.plugin(owned);

export default mongoose.model("LearnSession", LearnSessionSchema, "learn_sessions");
