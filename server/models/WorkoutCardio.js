import mongoose from "mongoose";

const WorkoutCardioSchema = new mongoose.Schema({
  date: { type: String, required: true },
  activity: { type: String, required: true },
  duration: { type: Number, default: 0 }, // minutes
  distance: { type: Number, default: 0 }, // km
  calories: { type: Number, default: 0 },
  steps: { type: Number, default: 0 },
  avgHr: { type: Number, default: 0 },
  source: { type: String, default: "" }, // e.g. "Strava", "Manual"
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("WorkoutCardio", WorkoutCardioSchema, "workout_cardio");
