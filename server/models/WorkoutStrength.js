import mongoose from "mongoose";

const SetSchema = new mongoose.Schema(
  {
    reps: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
  },
  { _id: false }
);

const ExerciseSchema = new mongoose.Schema(
  {
    group: { type: String, default: "" }, // muscle group
    exercise: { type: String, required: true },
    sets: { type: [SetSchema], default: [] },
  },
  { _id: false }
);

const WorkoutStrengthSchema = new mongoose.Schema({
  date: { type: String, required: true },
  splitDay: { type: String, default: "" }, // e.g. "Push", "Pull", "Legs"
  exercises: { type: [ExerciseSchema], default: [] },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("WorkoutStrength", WorkoutStrengthSchema, "workout_strength");
