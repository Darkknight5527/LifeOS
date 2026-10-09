import mongoose from "mongoose";

// A face photo for a SkinScan (front / left / right), kept private in the
// database and only served to the logged-in owner.
const SkinPhotoSchema = new mongoose.Schema({
  scanId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  angle: { type: String, enum: ["front", "left", "right"], required: true },
  mime: { type: String, default: "image/jpeg" },
  data: { type: Buffer, required: true },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("SkinPhoto", SkinPhotoSchema, "skin_photos");
