import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// A regular check-up you want to keep up with, e.g. a lipid profile every 6 months.
const HealthPlanSchema = new mongoose.Schema({
  title: { type: String, required: true },
  kind: { type: String, default: "blood" }, // same kinds as visits
  everyMonths: { type: Number, default: 12 },
  lastDone: { type: String, default: "" }, // set by hand; visits/reports linked to it also count
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
HealthPlanSchema.plugin(owned);

export default mongoose.model("HealthPlan", HealthPlanSchema, "health_plans");
