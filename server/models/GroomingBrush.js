import mongoose from "mongoose";

const GroomingBrushSchema = new mongoose.Schema({
  date: { type: String, required: true },
  am: { type: Boolean, default: false },
  pm: { type: Boolean, default: false },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("GroomingBrush", GroomingBrushSchema, "grooming_brush");
