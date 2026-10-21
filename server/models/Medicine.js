import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// A medicine or supplement: dose, when to take it, and how many are left.
const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dose: { type: String, default: "" }, // "500 mg", "1 tablet", "5 ml"
  form: { type: String, default: "tablet" }, // tablet | capsule | syrup | drops | injection | cream | inhaler | other
  kind: { type: String, enum: ["medicine", "supplement"], default: "medicine" },
  purpose: { type: String, default: "" },
  issueId: { type: String, default: "" }, // linked HealthIssue
  times: { type: [String], default: [] }, // ["08:00", "21:00"]; empty = as needed
  days: { type: [Number], default: [] }, // 0 Sun … 6 Sat; empty = every day
  food: { type: String, default: "" }, // "" | before | after | with
  start: { type: String, default: "" },
  end: { type: String, default: "" }, // last day, "" = ongoing
  active: { type: Boolean, default: true },
  stock: { type: Number, default: null }, // doses left; null = not counting
  prescribedBy: { type: String, default: "" },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
MedicineSchema.plugin(owned);

export default mongoose.model("Medicine", MedicineSchema, "medicines");
