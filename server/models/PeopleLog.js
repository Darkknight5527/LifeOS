import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Skills › People: one row per lesson you've done (and how its challenge went).
const PeopleLogSchema = new mongoose.Schema({
  lessonId: { type: String, required: true, maxlength: 60 },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"] },
  // "" = read only, "done" = tried the challenge, "skipped"
  challenge: { type: String, enum: ["", "done", "skipped"], default: "" },
  note: { type: String, default: "", maxlength: 3000 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
PeopleLogSchema.plugin(owned);

export default mongoose.model("PeopleLog", PeopleLogSchema, "people_logs");
