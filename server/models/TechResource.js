import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Tech & Learning › something to study later: a video, article or PDF.
const TechResourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  url: { type: String, default: "", maxlength: 500 },
  kind: { type: String, enum: ["video", "article", "pdf", "course", "docs", "other"], default: "article" },
  skillId: { type: String, default: "" },
  done: { type: Boolean, default: false },
  hasPdf: { type: Boolean, default: false }, // a PDF uploaded to your private shelf
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechResourceSchema.plugin(owned);

export default mongoose.model("TechResource", TechResourceSchema, "tech_resources");
