import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// A blood test (or other lab) report: the values, with the lab's own ranges if given.
const LabReportSchema = new mongoose.Schema({
  date: { type: String, required: true },
  lab: { type: String, default: "" },
  title: { type: String, default: "" }, // "Annual check-up", "Lipid profile"
  results: { type: mongoose.Schema.Types.Mixed, default: [] }, // [{ key, name, value, unit, low, high }]
  planId: { type: String, default: "" },
  notes: { type: String, default: "" },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LabReportSchema.plugin(owned);

export default mongoose.model("LabReport", LabReportSchema, "lab_reports");
