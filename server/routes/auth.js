import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth, forgetUserCache } from "../middleware/auth.js";
import { rateLimit } from "../utils/security.js";

const router = Router();

// Tokens last 30 days; the website swaps an older token for a fresh one on
// each visit (/refresh), so regular use never logs you out.
const sign = (user) =>
  jwt.sign({ sub: user._id.toString(), v: user.tokenVersion || 0 }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "30d" });

// Wrong-password guessing is slowed down: 10 tries per 15 minutes per IP.
const loginLimit = rateLimit({ windowMs: 15 * 60_000, max: 10 });

// Compared against when the email doesn't exist, so a wrong email takes as
// long as a wrong password (no hint about which one was wrong).
const DUMMY_HASH = bcrypt.hashSync("lifeos-not-a-real-password", 10);

const str = (v) => (typeof v === "string" ? v : "");

// One-time registration: only succeeds if no user exists yet.
// LifeOS is single-user, so this route locks itself after first use.
router.post("/register", loginLimit, async (req, res, next) => {
  try {
    const existing = await User.countDocuments();
    if (existing > 0) {
      return res.status(403).json({ error: "Registration is closed. This instance already has a user." });
    }

    const email = str(req.body?.email).toLowerCase().trim();
    const password = str(req.body?.password);
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return res.status(400).json({ error: "Please enter a valid email" });
    }
    if (password.length < 12 || password.length > 200) {
      return res.status(400).json({ error: "Password must be at least 12 characters" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
    res.status(201).json({ token: sign(user), user: { id: user._id, email: user.email } });
  } catch (err) {
    next(err);
  }
});

router.post("/login", loginLimit, async (req, res, next) => {
  try {
    const email = str(req.body?.email).toLowerCase().trim();
    const password = str(req.body?.password);
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email });
    const valid = await bcrypt.compare(password.slice(0, 200), user ? user.passwordHash : DUMMY_HASH);
    if (!user || !valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ token: sign(user), user: { id: user._id, email: user.email } });
  } catch (err) {
    next(err);
  }
});

// Swap a still-valid token for a fresh 30-day one.
router.post("/refresh", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: "Invalid or expired token" });
    res.json({ token: sign(user) });
  } catch (err) {
    next(err);
  }
});

// Sign out on every device (phone, laptop…): all existing tokens stop working.
router.post("/logout-all", requireAuth, async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.userId }, { $inc: { tokenVersion: 1 } });
    forgetUserCache(req.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

const confirmLimit = rateLimit({ windowMs: 15 * 60_000, max: 10, message: "Too many wrong passwords. Please wait a few minutes." });

/** Route guard: the request body must carry the account password (for wiping or replacing data). */
export const requirePassword = [
  confirmLimit,
  async (req, res, next) => {
    try {
      const password = str(req.body?.password);
      if (!password) return res.status(400).json({ error: "Enter your password to confirm." });
      const user = await User.findById(req.userId);
      const ok = user && (await bcrypt.compare(password.slice(0, 200), user.passwordHash));
      if (!ok) return res.status(403).json({ error: "Wrong password." });
      next();
    } catch (err) {
      next(err);
    }
  },
];
