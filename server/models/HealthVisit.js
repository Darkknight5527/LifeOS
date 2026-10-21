import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// A check-up, doctor visit, test or scan — planned or done.
const HealthVisitSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, default: "" },
  kind: { type: String, default: "doctor" }, // doctor | dentist | eye | blood | scan | vaccine | therapy | other
  title: { type: String, default: "" },
  doctor: { type: String, default: "" },
  place: { type: String, default: "" },
  reason: { type: String, default: "" },
  outcome: { type: String, default: "" }, // what the doctor said / findings
  status: { type: String, enum: ["planned", "done", "missed"], default: "planned" },
  issueId: { type: String, default: "" },
  planId: { type: String, default: "" }, // which regular check-up this counts for
  followUp: { type: String, default: "" }, // next visit date suggested
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
HealthVisitSchema.plugin(owned);

export default mongoose.model("HealthVisit", HealthVisitSchema, "health_visits");
