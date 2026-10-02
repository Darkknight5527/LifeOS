import { Router } from "express";
import FinanceCategory from "../models/FinanceCategory.js";
import FinanceBudget from "../models/FinanceBudget.js";
import FinanceTransaction from "../models/FinanceTransaction.js";
import FinanceInvestment from "../models/FinanceInvestment.js";
import FinanceSavingsGoal from "../models/FinanceSavingsGoal.js";
import FinanceMonth from "../models/FinanceMonth.js";
import FinanceSettings from "../models/FinanceSettings.js";

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

const router = Router();

// Download everything in the Finances section as one JSON object.
router.get("/backup", async (req, res, next) => {
  try {
    const data = {};
    for (const [key, Model] of Object.entries(MODELS)) {
      data[key] = await Model.find({}).lean();
    }
    res.json({ app: "LifeOS", section: "finances", version: 1, exportedAt: new Date().toISOString(), data });
  } catch (err) {
    next(err);
  }
});

// Replace all finance data with the contents of a backup file.
router.post("/restore", async (req, res, next) => {
  try {
    const data = req.body?.data;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "This doesn't look like a LifeOS finance backup" });
    }
    const counts = {};
    for (const [key, Model] of Object.entries(MODELS)) {
      if (!Array.isArray(data[key])) continue; // leave collections missing from the file untouched
      await Model.deleteMany({});
      const docs = data[key].map(({ __v, ...doc }) => doc);
      if (docs.length) await Model.insertMany(docs);
      counts[key] = docs.length;
    }
    res.json({ success: true, counts });
  } catch (err) {
    next(err);
  }
});

// Wipe every finance collection.
router.post("/reset", async (req, res, next) => {
  try {
    for (const Model of Object.values(MODELS)) {
      await Model.deleteMany({});
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
