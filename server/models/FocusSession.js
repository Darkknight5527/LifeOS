import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// A Focus mode session on the phone: when it started and ends, and whether it
// ran its full time or was ended early with an emailed code.
const FocusSessionSchema = new mongoose.Schema({
  startedAt: { type: Number, required: true },
  endsAt: { type: Number, required: true },
  minutes: { type: Number, default: 0 },
  endedAt: { type: Number, default: null },
  endedBy: { type: String, default: "" }, // "" while running | "time" | "code"
  codeHash: { type: String, default: "" },
  codeExpires: { type: Number, default: 0 },
  codeTries: { type: Number, default: 0 },
  codeSends: { type: [Number], default: [] }, // when codes were sent (rate limit)
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
FocusSessionSchema.plugin(owned);

export default mongoose.model("FocusSession", FocusSessionSchema, "focus_sessions");
