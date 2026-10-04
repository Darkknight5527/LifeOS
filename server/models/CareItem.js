import mongoose from "mongoose";

// A Hair or Body care item: either part of a daily routine (morning/evening,
// optionally only on some weekdays) or a periodic task done every N days
// (haircut, nails, replace toothbrush…).
const CareItemSchema = new mongoose.Schema({
  key: { type: String, required: true }, // stable id used in CareLog.done
  area: { type: String, enum: ["hair", "body"], required: true },
  kind: { type: String, enum: ["daily", "periodic"], required: true },
  name: { type: String, required: true },
  product: { type: String, default: "" },
  period: { type: String, enum: ["am", "pm"], default: "am" }, // daily items
  days: { type: [Number], default: [] }, // daily items: 0=Sun..6=Sat; empty = every day
  every: { type: Number, default: 7 }, // periodic items: target interval in days
  order: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("CareItem", CareItemSchema, "care_items");
