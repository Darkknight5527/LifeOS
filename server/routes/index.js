import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createCrudRouter } from "../utils/crudRouter.js";

import authRoutes from "./auth.js";

import MoodLog from "../models/MoodLog.js";
import SkinLog from "../models/SkinLog.js";
import SkincareStep from "../models/SkincareStep.js";
import HairLog from "../models/HairLog.js";
import GroomingBrush from "../models/GroomingBrush.js";
import GroomingTask from "../models/GroomingTask.js";
import WorkoutStrength from "../models/WorkoutStrength.js";
import WorkoutCardio from "../models/WorkoutCardio.js";
import WorkoutFlex from "../models/WorkoutFlex.js";
import Goal from "../models/Goal.js";
import GoalReview from "../models/GoalReview.js";
import Project from "../models/Project.js";
import LearningTopic from "../models/LearningTopic.js";
import LearningSession from "../models/LearningSession.js";
import FinanceCategory from "../models/FinanceCategory.js";
import FinanceBudget from "../models/FinanceBudget.js";
import FinanceTransaction from "../models/FinanceTransaction.js";
import FinanceInvestment from "../models/FinanceInvestment.js";
import FinanceSavingsGoal from "../models/FinanceSavingsGoal.js";
import FinanceMonth from "../models/FinanceMonth.js";
import FinanceSettings from "../models/FinanceSettings.js";
import financeRoutes from "./finance.js";
import paperRoutes from "./paper.js";
import Reminder from "../models/Reminder.js";
import booksRoutes from "./books.js";

const router = Router();

// Public routes
router.use("/auth", authRoutes);

// Everything below requires a valid JWT
router.use(requireAuth);

router.use("/mood-logs", createCrudRouter(MoodLog, { sortField: "date", sortOrder: -1 }));
router.use("/skin-logs", createCrudRouter(SkinLog, { sortField: "date", sortOrder: -1 }));
router.use("/skincare-steps", createCrudRouter(SkincareStep, { sortField: "order", sortOrder: 1 }));
router.use("/hair-logs", createCrudRouter(HairLog, { sortField: "date", sortOrder: -1 }));
router.use("/grooming-brush", createCrudRouter(GroomingBrush, { sortField: "date", sortOrder: -1 }));
router.use("/grooming-tasks", createCrudRouter(GroomingTask, { sortField: "date", sortOrder: -1 }));
router.use("/workout-strength", createCrudRouter(WorkoutStrength, { sortField: "date", sortOrder: -1 }));
router.use("/workout-cardio", createCrudRouter(WorkoutCardio, { sortField: "date", sortOrder: -1 }));
router.use("/workout-flex", createCrudRouter(WorkoutFlex, { sortField: "date", sortOrder: -1 }));
router.use("/goals", createCrudRouter(Goal, { sortField: "updatedAt", sortOrder: -1 }));
router.use("/goal-reviews", createCrudRouter(GoalReview, { sortField: "date", sortOrder: -1 }));
router.use("/projects", createCrudRouter(Project, { sortField: "updatedAt", sortOrder: -1 }));
router.use("/learning", createCrudRouter(LearningTopic, { sortField: "updatedAt", sortOrder: -1 }));
router.use("/learning-sessions", createCrudRouter(LearningSession, { sortField: "date", sortOrder: -1 }));
router.use("/finance", financeRoutes);
router.use("/paper", paperRoutes);
router.use("/books", booksRoutes);
router.use("/reminders", createCrudRouter(Reminder, { sortField: "date", sortOrder: 1 }));
router.use("/finance-months", createCrudRouter(FinanceMonth, { sortField: "month", sortOrder: -1 }));
router.use("/finance-settings", createCrudRouter(FinanceSettings, { sortField: "createdAt", sortOrder: 1 }));
router.use("/finance-categories", createCrudRouter(FinanceCategory, { sortField: "order", sortOrder: 1 }));
router.use("/finance-budgets", createCrudRouter(FinanceBudget, { sortField: "month", sortOrder: -1 }));
router.use("/finance-transactions", createCrudRouter(FinanceTransaction, { sortField: "date", sortOrder: -1 }));
router.use("/finance-investments", createCrudRouter(FinanceInvestment, { sortField: "updatedAt", sortOrder: -1 }));
router.use("/finance-savings-goals", createCrudRouter(FinanceSavingsGoal, { sortField: "updatedAt", sortOrder: -1 }));

export default router;
