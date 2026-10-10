import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Body weight and measurements for a day.
const BodyLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  weight: { type: Number, default: null }, // kg
  waist: { type: Number, default: null }, // cm
  chest: { type: Number, default: null },
  arm: { type: Number, default: null },
  bodyFat: { type: Number, default: null }, // %
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
BodyLogSchema.plugin(owned);

export default mongoose.model("BodyLog", BodyLogSchema, "body_logs");
