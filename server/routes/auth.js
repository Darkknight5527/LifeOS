import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Invite from "../models/Invite.js";
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

// Sign up. The very first account becomes the owner (admin); after that a
// one-time invite code from the owner is required.
const normCode = (c) => str(c).toUpperCase().replace(/[^A-Z0-9]/g, "");
export const publicUser = (u) => ({ id: u._id, email: u.email, name: u.name || "", role: u.role || "user" });

router.post("/register", loginLimit, async (req, res, next) => {
  try {
    const email = str(req.body?.email).toLowerCase().trim();
    const password = str(req.body?.password);
    const name = str(req.body?.name).trim().slice(0, 60);
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return res.status(400).json({ error: "Please enter a valid email" });
    }
    if (password.length < 10 || password.length > 200) {
      return res.status(400).json({ error: "Password must be at least 10 characters" });
    }

    const first = (await User.countDocuments()) === 0;
    let invite = null;
    if (!first) {
      const code = normCode(req.body?.code);
      if (!code) return res.status(403).json({ error: "You need an invite code from the owner to sign up." });
      // Claim the code atomically so it can't be used twice at the same moment.
      invite = await Invite.findOneAndUpdate(
        { code, usedBy: null, expiresAt: { $gt: Date.now() } },
        { $set: { usedBy: new mongoose.Types.ObjectId(), usedAt: Date.now() } },
        { new: true }
      );
      if (!invite) return res.status(403).json({ error: "That invite code isn't valid (it may be used or expired)." });
    }
    if (await User.exists({ email })) {
      if (invite) await Invite.updateOne({ _id: invite._id }, { $set: { usedBy: null, usedAt: 0 } }); // give the code back
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, name: name || email.split("@")[0], role: first ? "admin" : "user" });
    if (invite) await Invite.updateOne({ _id: invite._id }, { $set: { usedBy: user._id } });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
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

    User.updateOne({ _id: user._id }, { $set: { lastSeenAt: Date.now() } }).catch(() => {});
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// Swap a still-valid token for a fresh 30-day one.
router.post("/refresh", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: "Invalid or expired token" });
    User.updateOne({ _id: user._id }, { $set: { lastSeenAt: Date.now() } }).catch(() => {});
    res.json({ token: sign(user), user: publicUser(user) });
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

// Who am I? (name, email, role)
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(401).json({ error: "Invalid or expired token" });
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

// Change your display name.
router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const name = str(req.body?.name).trim().slice(0, 60);
    if (!name) return res.status(400).json({ error: "Enter a name." });
    const user = await User.findByIdAndUpdate(req.userId, { $set: { name } }, { new: true }).lean();
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

// Change your password (needs the current one). Signs out other devices.
router.post("/password", requireAuth, loginLimit, async (req, res, next) => {
  try {
    const current = str(req.body?.current);
    const next_ = str(req.body?.password);
    if (next_.length < 10 || next_.length > 200) return res.status(400).json({ error: "New password must be at least 10 characters" });
    const user = await User.findById(req.userId);
    if (!user || !(await bcrypt.compare(current.slice(0, 200), user.passwordHash))) return res.status(403).json({ error: "Current password is wrong." });
    user.passwordHash = await bcrypt.hash(next_, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    forgetUserCache(req.userId);
    res.json({ token: sign(user), user: publicUser(user) });
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
