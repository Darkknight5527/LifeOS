import mongoose from "mongoose";

const HairLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  washDone: { type: Boolean, default: false },
  hairFall: { type: String, default: "" },
  scalpCondition: { type: String, default: "" },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("HairLog", HairLogSchema, "hair_logs");
