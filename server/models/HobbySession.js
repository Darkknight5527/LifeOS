import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Skills › Hobbies: one practice session.
const HobbySessionSchema = new mongoose.Schema({
  hobbyId: { type: String, required: true, maxlength: 40 },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"] },
  minutes: { type: Number, required: true, min: 1, max: 1440 },
  note: { type: String, default: "", maxlength: 1000 },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
HobbySessionSchema.plugin(owned);

export default mongoose.model("HobbySession", HobbySessionSchema, "hobby_sessions");
