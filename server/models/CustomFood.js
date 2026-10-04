import mongoose from "mongoose";

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

export default mongoose.model("CustomFood", CustomFoodSchema, "custom_foods");
