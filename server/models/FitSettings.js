import mongoose from "mongoose";

// One document: training programme, rest timer, body profile and nutrition targets.
const FitSettingsSchema = new mongoose.Schema({
  program: { type: mongoose.Schema.Types.Mixed, default: {} }, // { push: [{exercise, group, sets, reps}], pull: [...], legs: [...] }
  schedule: { type: [String], default: ["rest", "push", "pull", "legs", "push", "pull", "legs"] }, // Sun..Sat
  restSec: { type: Number, default: 90 },
  profile: { type: mongoose.Schema.Types.Mixed, default: {} }, // { sex, age, heightCm, weightKg, activity, goal, goalWeight }
  targets: { type: mongoose.Schema.Types.Mixed, default: {} }, // { calories, protein, carbs, fat, water }
  autoTargets: { type: Boolean, default: true },
  customExercises: { type: mongoose.Schema.Types.Mixed, default: [] }, // [{ exercise, group, type }]
  goals: { type: mongoose.Schema.Types.Mixed, default: {} }, // { [exercise]: { weight, reps } }
  plates: { type: mongoose.Schema.Types.Mixed, default: {} }, // { bar, available: [..] }
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FitSettings", FitSettingsSchema, "fit_settings");
