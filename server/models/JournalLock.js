import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// The journal's PIN (hashed) and wrong-guess counter, one per account.
const JournalLockSchema = new mongoose.Schema({
  pinHash: { type: String, required: true },
  failed: { type: Number, default: 0 },
  lockedUntil: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
JournalLockSchema.plugin(owned);

export default mongoose.model("JournalLock", JournalLockSchema, "journal_locks");
