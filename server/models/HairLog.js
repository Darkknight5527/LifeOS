import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const HairLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  washDone: { type: Boolean, default: false },
  hairFall: { type: String, default: "" },
  scalpCondition: { type: String, default: "" },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
HairLogSchema.plugin(owned);

export default mongoose.model("HairLog", HairLogSchema, "hair_logs");
