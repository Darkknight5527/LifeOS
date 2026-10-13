import mongoose from "mongoose";
import { owned } from "../utils/owned.js";

// The journal's PIN (hashed) and wrong-guess counter, one per account.
const JournalLockSchema = new mongoose.Schema({
  pinHash: { type: String, required: true },
  // How many digits the PIN has (so the keypad can unlock on the last digit). 0 = not known yet.
  pinLength: { type: Number, min: 0, max: 8, default: 0 },
  failed: { type: Number, default: 0 },
  lockedUntil: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

// Belongs to one account (adds userId; queries must name the owner).
JournalLockSchema.plugin(owned);

export default mongoose.model("JournalLock", JournalLockSchema, "journal_locks");
