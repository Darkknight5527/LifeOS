import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

const HighlightSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 2000 },
    page: { type: Number, min: 0, max: 100000, default: 0 },
    note: { type: String, default: "", maxlength: 1000 },
    at: { type: String, default: "" }, // YYYY-MM-DD
  },
  { _id: true }
);

// Mental & Psych › Library: one book on your shelf.
const LibraryBookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  author: { type: String, default: "", trim: true, maxlength: 150 },
  status: { type: String, enum: ["want", "reading", "finished", "dropped"], default: "want" },
  pages: { type: Number, min: 0, max: 100000, default: 0 },
  page: { type: Number, min: 0, max: 100000, default: 0 }, // current page
  startedAt: { type: String, default: "" },
  finishedAt: { type: String, default: "" },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  why: { type: String, default: "", maxlength: 1000 }, // why I want to read it
  lessons: { type: String, default: "", maxlength: 10000 },
  highlights: { type: [HighlightSchema], default: [] },
  coverId: { type: Number, default: 0 }, // Open Library cover id
  year: { type: Number, default: 0 }, // first published
  order: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
LibraryBookSchema.plugin(owned);

export default mongoose.model("LibraryBook", LibraryBookSchema, "library_books");
