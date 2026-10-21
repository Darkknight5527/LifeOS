import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// A medical issue you're keeping track of: a condition, symptom, injury or allergy, with a running log.
const HealthIssueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kind: { type: String, enum: ["condition", "symptom", "injury", "allergy"], default: "condition" },
  status: { type: String, enum: ["active", "managed", "resolved"], default: "active" },
  since: { type: String, default: "" }, // YYYY-MM-DD
  resolvedOn: { type: String, default: "" },
  severity: { type: Number, default: 0 }, // 0 = not rated, 1 mild … 5 severe
  doctor: { type: String, default: "" },
  notes: { type: String, default: "" },
  entries: { type: mongoose.Schema.Types.Mixed, default: [] }, // [{ id, date, severity, note }] — newest first
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
HealthIssueSchema.plugin(owned);

export default mongoose.model("HealthIssue", HealthIssueSchema, "health_issues");
