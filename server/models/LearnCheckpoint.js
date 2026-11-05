import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Learning › a part checkpoint (A–D): pass / fail per question and when it was passed.
const LearnCheckpointSchema = new mongoose.Schema({
  part: { type: String, required: true }, // "A" | "B" | "C" | "D"
  results: { type: mongoose.Schema.Types.Mixed, default: {} }, // { "0": "pass" | "fail", ... }
  passedOn: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LearnCheckpointSchema.plugin(owned);

export default mongoose.model("LearnCheckpoint", LearnCheckpointSchema, "learn_checkpoints");
