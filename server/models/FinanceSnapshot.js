import mongoose from "mongoose";

// A restore point: a full copy of the Finances data, taken automatically
// before anything replaces or wipes it (restore, reset). The newest few are kept.
const FinanceSnapshotSchema = new mongoose.Schema({
  reason: { type: String, default: "" }, // "before-restore" | "before-reset" | "before-undo"
  counts: { type: mongoose.Schema.Types.Mixed, default: {} },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FinanceSnapshot", FinanceSnapshotSchema, "finance_snapshots");
