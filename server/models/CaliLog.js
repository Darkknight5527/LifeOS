import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// One calisthenics skill practised on a day: its sets (reps, or seconds held).
const CaliLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  skill: { type: String, required: true }, // id from web/src/pages/fitness/cali/skills.js
  sets: {
    type: [new mongoose.Schema({ reps: { type: Number, default: 0 }, hold: { type: Number, default: 0 } }, { _id: false })],
    default: [],
  },
  note: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
CaliLogSchema.plugin(owned);

export default mongoose.model("CaliLog", CaliLogSchema, "cali_logs");
