// The journal's PIN lock. The PIN is checked by the server: journal entries
// can only be read or written with a short-lived "journal key" handed out
// after the right PIN. Forgot the PIN? Reset it with your account password.
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import JournalLock from "../models/JournalLock.js";
import User from "../models/User.js";

const router = Router();
const KEY_MINUTES = 30;
const MAX_TRIES = 5;
const LOCKOUT_MIN = 15;
const PIN = /^\d{4,8}$/;

const secret = () => `${process.env.JWT_SECRET}:journal`;
const journalKey = (userId) => jwt.sign({ sub: String(userId), j: 1 }, secret(), { algorithm: "HS256", expiresIn: `${KEY_MINUTES}m` });

/** Route guard for journal entries: needs a valid journal key once a PIN is set. */
export async function requireJournalKey(req, res, next) {
  try {
    const lock = await JournalLock.findOne({ userId: req.userId }).lean();
    if (!lock) return res.status(423).json({ error: "Set a journal PIN first.", needPin: true });
    const key = String(req.get("X-Journal-Key") || "");
    try {
      const p = jwt.verify(key, secret(), { algorithms: ["HS256"] });
      if (p.sub === String(req.userId) && p.j === 1) return next();
    } catch {
      /* fall through */
    }
    res.status(423).json({ error: "Journal is locked.", locked: true });
  } catch (err) {
    next(err);
  }
}

// Is there a PIN yet?
router.get("/lock", async (req, res, next) => {
  try {
    const lock = await JournalLock.findOne({ userId: req.userId }).lean();
    res.json({ hasPin: Boolean(lock), lockedUntil: lock?.lockedUntil > Date.now() ? lock.lockedUntil : 0 });
  } catch (err) {
    next(err);
  }
});

// First-time PIN.
router.post("/pin", async (req, res, next) => {
  try {
    const pin = String(req.body?.pin || "");
    if (!PIN.test(pin)) return res.status(400).json({ error: "The PIN must be 4 to 8 digits." });
    if (await JournalLock.findOne({ userId: req.userId }).lean()) return res.status(409).json({ error: "A PIN is already set." });
    await JournalLock.create({ userId: req.userId, pinHash: await bcrypt.hash(pin, 10) });
    res.status(201).json({ key: journalKey(req.userId), minutes: KEY_MINUTES });
  } catch (err) {
    next(err);
  }
});

// Unlock with the PIN → a journal key for KEY_MINUTES.
router.post("/unlock", async (req, res, next) => {
  try {
    const lock = await JournalLock.findOne({ userId: req.userId });
    if (!lock) return res.status(404).json({ error: "No PIN set yet.", needPin: true });
    if (lock.lockedUntil > Date.now()) {
      const mins = Math.ceil((lock.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many wrong PINs. Try again in ${mins} min, or reset the PIN with your password.` });
    }
    const ok = await bcrypt.compare(String(req.body?.pin || "").slice(0, 8), lock.pinHash);
    if (!ok) {
      lock.failed += 1;
      if (lock.failed >= MAX_TRIES) {
        lock.failed = 0;
        lock.lockedUntil = Date.now() + LOCKOUT_MIN * 60000;
      }
      lock.updatedAt = Date.now();
      await lock.save();
      return res.status(403).json({ error: "Wrong PIN." });
    }
    lock.failed = 0;
    lock.lockedUntil = 0;
    await lock.save();
    res.json({ key: journalKey(req.userId), minutes: KEY_MINUTES });
  } catch (err) {
    next(err);
  }
});

// Change the PIN (old PIN) or reset it (account password). Entries are kept.
router.post("/pin/change", async (req, res, next) => {
  try {
    const pin = String(req.body?.pin || "");
    if (!PIN.test(pin)) return res.status(400).json({ error: "The new PIN must be 4 to 8 digits." });
    const lock = await JournalLock.findOne({ userId: req.userId });
    if (!lock) return res.status(404).json({ error: "No PIN set yet." });
    let ok = false;
    if (req.body?.oldPin) ok = await bcrypt.compare(String(req.body.oldPin).slice(0, 8), lock.pinHash);
    else if (req.body?.password) {
      const user = await User.findById(req.userId);
      ok = Boolean(user) && (await bcrypt.compare(String(req.body.password).slice(0, 200), user.passwordHash));
    }
    if (!ok) return res.status(403).json({ error: req.body?.password ? "Wrong account password." : "Wrong current PIN." });
    lock.pinHash = await bcrypt.hash(pin, 10);
    lock.failed = 0;
    lock.lockedUntil = 0;
    lock.updatedAt = Date.now();
    await lock.save();
    res.json({ key: journalKey(req.userId), minutes: KEY_MINUTES });
  } catch (err) {
    next(err);
  }
});

export default router;
