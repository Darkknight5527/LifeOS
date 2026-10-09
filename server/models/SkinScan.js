import mongoose from "mongoose";

// One AI skin check: three photos (stored in SkinPhoto) plus what the AI saw.
// Severity scores are 0–10 (0 = none, 10 = severe); `overall` is a 0–100
// skin score where higher is better.
const SkinScanSchema = new mongoose.Schema({
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  angles: { type: [String], default: [] },
  status: { type: String, enum: ["pending", "done", "failed"], default: "pending" },
  error: { type: String, default: "" },
  overall: { type: Number, min: 0, max: 100 },
  scores: {
    acne: Number,
    marks: Number,
    redness: Number,
    oiliness: Number,
    dryness: Number,
    darkCircles: Number,
    texture: Number,
    unevenTone: Number,
  },
  headline: { type: String, default: "" },
  summary: { type: String, default: "" },
  changes: { type: String, default: "" },
  areas: { type: [{ area: String, note: String, _id: false }], default: [] },
  tips: { type: [String], default: [] },
  photoQuality: { usable: Boolean, issues: String },
  seeDermatologist: { type: Boolean, default: false },
  model: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("SkinScan", SkinScanSchema, "skin_scans");
