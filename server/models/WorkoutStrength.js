import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const SetSchema = new mongoose.Schema(
  {
    reps: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    done: { type: Boolean, default: true },
    warmup: { type: Boolean, default: false }, // warm-up sets don't count for PRs / volume
    rpe: { type: Number, default: null }, // effort 6–10
    time: { type: Number, default: 0 }, // seconds (timed exercises)
    distance: { type: Number, default: 0 }, // km
    note: { type: String, default: "" },
  },
  { _id: false }
);

const ExerciseSchema = new mongoose.Schema(
  {
    group: { type: String, default: "" }, // muscle group
    exercise: { type: String, required: true },
    type: { type: String, default: "weight_reps" }, // weight_reps | reps | time | distance_time
    note: { type: String, default: "" },
    superset: { type: String, default: "" }, // exercises sharing a label are a superset
    sets: { type: [SetSchema], default: [] },
  },
  { _id: false }
);

const WorkoutStrengthSchema = new mongoose.Schema({
  date: { type: String, required: true },
  splitDay: { type: String, default: "" }, // e.g. "Push", "Pull", "Legs"
  exercises: { type: [ExerciseSchema], default: [] },
  duration: { type: Number, default: 0 }, // minutes
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
WorkoutStrengthSchema.plugin(owned);

export default mongoose.model("WorkoutStrength", WorkoutStrengthSchema, "workout_strength");
