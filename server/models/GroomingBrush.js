import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const GroomingBrushSchema = new mongoose.Schema({
  date: { type: String, required: true },
  am: { type: Boolean, default: false },
  pm: { type: Boolean, default: false },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
GroomingBrushSchema.plugin(owned);

export default mongoose.model("GroomingBrush", GroomingBrushSchema, "grooming_brush");
