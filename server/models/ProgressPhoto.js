import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// A body progress photo (front / side / back) for a day. Kept private in the
// database, only served to the logged-in owner, and never sent to any AI.
const ProgressPhotoSchema = new mongoose.Schema({
  date: { type: String, required: true },
  pose: { type: String, enum: ["front", "side", "back"], required: true },
  mime: { type: String, default: "image/jpeg" },
  data: { type: Buffer, required: true },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
ProgressPhotoSchema.plugin(owned);

export default mongoose.model("ProgressPhoto", ProgressPhotoSchema, "progress_photos");
