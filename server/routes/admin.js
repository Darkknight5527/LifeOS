// Owner-only tools: invite friends, see who has joined, reset a forgotten
// password, remove an account (with all of its data).
import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Invite from "../models/Invite.js";
import { requireAdmin, forgetUserCache } from "../middleware/auth.js";
import { ownedModels } from "../utils/migrate.js";

const router = Router();
router.use(requireAdmin);

const INVITE_DAYS = 7;
// No 0/O/1/I so codes are easy to read out over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = () => {
  const bytes = crypto.randomBytes(8);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
};
const tempPassword = () => {
  const bytes = crypto.randomBytes(12);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("").replace(/(.{4})(?!$)/g, "$1-");
};
const isId = (id) => mongoose.isValidObjectId(id);

// Everyone with an account.
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find({}, { passwordHash: 0, tokenVersion: 0 }).sort({ createdAt: 1 }).lean();
    res.json(users.map((u) => ({ id: u._id, email: u.email, name: u.name || "", role: u.role || "user", createdAt: u.createdAt, lastSeenAt: u.lastSeenAt || 0 })));
  } catch (err) {
    next(err);
  }
});

// Invite codes (newest first).
router.get("/invites", async (req, res, next) => {
  try {
    const list = await Invite.find({}).sort({ createdAt: -1 }).limit(50).lean();
    const users = await User.find({ _id: { $in: list.map((i) => i.usedBy).filter(Boolean) } }, { email: 1, name: 1 }).lean();
    const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
    res.json(
      list.map((i) => ({
        id: i._id,
        code: i.code.replace(/^(.{4})/, "$1-"),
        note: i.note,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
        usedAt: i.usedAt || 0,
        usedBy: i.usedBy ? byId[String(i.usedBy)]?.name || byId[String(i.usedBy)]?.email || "someone" : null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post("/invites", async (req, res, next) => {
  try {
    const note = String(req.body?.note || "").trim().slice(0, 60);
    const pretty = randomCode();
    const invite = await Invite.create({
      code: pretty.replace(/-/g, ""),
      note,
      createdBy: req.userId,
      expiresAt: Date.now() + INVITE_DAYS * 86400_000,
    });
    res.status(201).json({ id: invite._id, code: pretty, note, expiresAt: invite.expiresAt });
  } catch (err) {
    next(err);
  }
});

// Cancel an unused code.
router.delete("/invites/:id", async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id." });
    await Invite.deleteOne({ _id: req.params.id, usedBy: null });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Forgotten password: make a temporary one to send them. Their other devices are signed out.
router.post("/users/:id/reset-password", async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id." });
    if (String(req.params.id) === String(req.userId)) return res.status(400).json({ error: "Change your own password from Account instead." });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    const password = tempPassword();
    user.passwordHash = await bcrypt.hash(password, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    forgetUserCache(user._id);
    res.json({ password });
  } catch (err) {
    next(err);
  }
});

// Remove an account and everything in it. Needs their email typed as confirmation.
router.delete("/users/:id", async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id." });
    if (String(req.params.id) === String(req.userId)) return res.status(400).json({ error: "You can't remove your own account." });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    if (String(req.body?.confirm || "").trim().toLowerCase() !== user.email) return res.status(400).json({ error: "Type their email exactly to confirm." });
    const userId = user._id;
    const removed = {};
    for (const Model of ownedModels()) {
      const r = await Model.deleteMany({ userId });
      if (r.deletedCount) removed[Model.modelName] = r.deletedCount;
    }
    // Their uploaded books.
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "books" });
    const files = await mongoose.connection.db.collection("books.files").find({ "metadata.userId": String(userId) }).toArray();
    for (const f of files) await bucket.delete(f._id).catch(() => {});
    await Invite.updateMany({ usedBy: userId }, { $set: { usedBy: null, usedAt: 0, expiresAt: 0 } });
    await User.deleteOne({ _id: userId });
    forgetUserCache(userId);
    res.json({ success: true, removed });
  } catch (err) {
    next(err);
  }
});

export default router;
