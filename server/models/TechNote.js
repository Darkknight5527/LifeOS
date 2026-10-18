import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// Tech & Learning › a study note.
const TechNoteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, default: "", maxlength: 20000 },
  skillId: { type: String, default: "" },
  pinned: { type: Boolean, default: false },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
TechNoteSchema.plugin(owned);

export default mongoose.model("TechNote", TechNoteSchema, "tech_notes");
