import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Your own foods (per one serving).
const CustomFoodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String, default: "1 serving" },
  cal: { type: Number, default: 0 },
  p: { type: Number, default: 0 },
  c: { type: Number, default: 0 },
  f: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
CustomFoodSchema.plugin(owned);

export default mongoose.model("CustomFood", CustomFoodSchema, "custom_foods");
