import mongoose from "mongoose";
import { Router } from "express";
import FinanceCategory from "../models/FinanceCategory.js";
import FinanceBudget from "../models/FinanceBudget.js";
import FinanceTransaction from "../models/FinanceTransaction.js";
import FinanceInvestment from "../models/FinanceInvestment.js";
import FinanceSavingsGoal from "../models/FinanceSavingsGoal.js";
import FinanceMonth from "../models/FinanceMonth.js";
import FinanceSettings from "../models/FinanceSettings.js";
import FinanceSnapshot from "../models/FinanceSnapshot.js";
import { requirePassword } from "./auth.js";

// Every finance collection, keyed by the name used in backup files.
const MODELS = {
  categories: FinanceCategory,
  budgets: FinanceBudget,
  transactions: FinanceTransaction,
  investments: FinanceInvestment,
  savingsGoals: FinanceSavingsGoal,
  months: FinanceMonth,
  settings: FinanceSettings,
};
const KEEP_SNAPSHOTS = 10;
const MAX_DOCS = 50_000;

const router = Router();

async function dumpAll(userId) {
  const data = {};
  const counts = {};
  for (const [key, Model] of Object.entries(MODELS)) {
    data[key] = await Model.find({ userId }).lean();
    counts[key] = data[key].length;
  }
  return { data, counts };
}

// Save a restore point of the current data, and trim old ones.
async function snapshot(userId, reason) {
  const { data, counts } = await dumpAll(userId);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return null; // nothing worth saving
  const snap = await FinanceSnapshot.create({ userId, reason, data, counts });
  const old = await FinanceSnapshot.find({ userId }, { _id: 1 }).sort({ createdAt: -1 }).skip(KEEP_SNAPSHOTS).lean();
  if (old.length) await FinanceSnapshot.deleteMany({ userId, _id: { $in: old.map((o) => o._id) } });
  return snap;
}

/**
 * Check every document of a backup before touching anything.
 * Returns { docs } or { error }.
 */
function validateBackup(data, userId) {
  const docs = {};
  let total = 0;
  for (const [key, Model] of Object.entries(MODELS)) {
    if (data[key] === undefined) continue; // collections missing from the file stay untouched
    if (!Array.isArray(data[key])) return { error: `"${key}" in the file isn't a list.` };
    total += data[key].length;
    if (total > MAX_DOCS) return { error: "The file is too large." };
    docs[key] = [];
    for (let i = 0; i < data[key].length; i++) {
      const raw = data[key][i];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: `${key} #${i + 1} isn't a valid entry.` };
      // Whatever owner the file says, it's restored into your own account.
      const { __v, userId: _ignored, ...rest } = raw; // eslint-disable-line no-unused-vars
      rest.userId = userId;
      if (Object.keys(rest).some((k) => k.startsWith("$"))) return { error: `${key} #${i + 1} has invalid fields.` };
      const doc = new Model(rest);
      const err = doc.validateSync();
      if (err) {
        const first = Object.values(err.errors || {})[0];
        return { error: `${key} #${i + 1}: ${first?.message || "invalid"}` };
      }
      docs[key].push(doc.toObject());
    }
  }
  if (!Object.keys(docs).length) return { error: "The file has no finance data in it." };
  return { docs };
}

// Write validated data in, one collection at a time.
async function replaceWith(userId, docs) {
  const counts = {};
  for (const [key, list] of Object.entries(docs)) {
    const Model = MODELS[key];
    await Model.deleteMany({ userId });
    if (list.length) await Model.insertMany(list, { ordered: true });
    counts[key] = list.length;
  }
  return counts;
}

// Put a restore point back exactly (used for rollback and "Restore point" undo).
// The data was saved by the server itself, so it goes back as-is (no re-checking,
// which could quietly skip older entries); only the owner is set.
async function restoreSnapshotData(userId, data) {
  const owner = new mongoose.Types.ObjectId(String(userId));
  for (const [key, Model] of Object.entries(MODELS)) {
    await Model.deleteMany({ userId: owner });
    const list = (Array.isArray(data?.[key]) ? data[key] : []).map((d) => ({ ...d, userId: owner }));
    if (list.length) await Model.insertMany(list, { ordered: true, lean: true });
  }
}

// Download everything in the Finances section as one JSON object.
router.get("/backup", async (req, res, next) => {
  try {
    const { data } = await dumpAll(req.userId);
    res.json({ app: "LifeOS", section: "finances", version: 1, exportedAt: new Date().toISOString(), data });
  } catch (err) {
    next(err);
  }
});

// Replace all finance data with the contents of a backup file.
// Needs the account password; checks the whole file first; saves a restore
// point first and puts it back if anything fails halfway.
router.post("/restore", requirePassword, async (req, res, next) => {
  try {
    const file = req.body?.backup;
    if (!file || typeof file !== "object" || file.app !== "LifeOS" || file.section !== "finances" || !file.data || typeof file.data !== "object") {
      return res.status(400).json({ error: "This doesn't look like a LifeOS finance backup." });
    }
    const checked = validateBackup(file.data, req.userId);
    if (checked.error) return res.status(400).json({ error: `Nothing was changed — ${checked.error}` });

    const snap = await snapshot(req.userId, "before-restore");
    try {
      const counts = await replaceWith(req.userId, checked.docs);
      res.json({ success: true, counts, snapshotId: snap?._id || null });
    } catch (err) {
      if (snap) await restoreSnapshotData(req.userId, snap.data);
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// Wipe every finance collection (a restore point is saved first).
router.post("/reset", requirePassword, async (req, res, next) => {
  try {
    const snap = await snapshot(req.userId, "before-reset");
    for (const Model of Object.values(MODELS)) {
      await Model.deleteMany({ userId: req.userId });
    }
    res.json({ success: true, snapshotId: snap?._id || null });
  } catch (err) {
    next(err);
  }
});

// Restore points: list them, and put one back.
router.get("/snapshots", async (req, res, next) => {
  try {
    const list = await FinanceSnapshot.find({ userId: req.userId }, { data: 0 }).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post("/snapshots/:id/restore", requirePassword, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id." });
    const snap = await FinanceSnapshot.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!snap) return res.status(404).json({ error: "That restore point no longer exists." });
    const before = await snapshot(req.userId, "before-undo");
    try {
      await restoreSnapshotData(req.userId, snap.data);
    } catch (err) {
      if (before) await restoreSnapshotData(req.userId, before.data);
      throw err;
    }
    res.json({ success: true, counts: snap.counts });
  } catch (err) {
    next(err);
  }
});

export default router;
