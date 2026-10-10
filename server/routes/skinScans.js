// AI skin checks: three face photos per day, analysed by Gemini.
// Photos stay private in the database and are only served to you when
// logged in. One check per day — taking a new one replaces that day's.
import { Router } from "express";
import mongoose from "mongoose";
import SkinScan from "../models/SkinScan.js";
import SkinPhoto from "../models/SkinPhoto.js";
import SkincareStep from "../models/SkincareStep.js";
import { analyzeSkin } from "../utils/gemini.js";
import { rateLimit } from "../utils/security.js";
import User from "../models/User.js";

const router = Router();
const ANGLES = ["front", "left", "right"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PHOTO = 1.5 * 1024 * 1024;
// The free AI tier has a daily cap; this also stops runaway retries.
const aiLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: "Too many skin checks this hour. Try again later." });

const isId = (id) => mongoose.isValidObjectId(id);

// Friends get one AI check a day (the owner isn't limited). A failed read
// doesn't count, so "Try again" always works. Days are India time.
const FRIEND_DAILY = 1;
const istDay = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
async function aiAllowance(userId) {
  const u = await User.findById(userId).select("role aiDay aiCount").lean();
  if (!u) return { ok: false };
  if (u.role === "admin") return { ok: true, unlimited: true };
  const used = u.aiDay === istDay() ? u.aiCount || 0 : 0;
  return { ok: used < FRIEND_DAILY, used, limit: FRIEND_DAILY };
}
async function countAiUse(userId) {
  const day = istDay();
  const u = await User.findById(userId).select("aiDay aiCount");
  if (!u) return;
  if (u.aiDay !== day) {
    u.aiDay = day;
    u.aiCount = 0;
  }
  u.aiCount += 1;
  await u.save();
}
const LIMIT_MSG = "You've used today's AI skin check. You can take the next one tomorrow.";
const bad = (res, msg) => res.status(400).json({ error: msg });

function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

async function routineText(userId) {
  try {
    const steps = await SkincareStep.find({ userId }).sort({ period: 1, order: 1 }).lean();
    if (!steps.length) return "";
    return steps.map((s) => `${s.period === "am" ? "AM" : "PM"} ${s.name}${s.product ? ` (${s.product})` : ""}`).join(", ").slice(0, 600);
  } catch {
    return "";
  }
}

async function runAnalysis(scan) {
  const userId = scan.userId;
  const photos = await SkinPhoto.find({ userId, scanId: scan._id }).lean();
  photos.sort((a, b) => ANGLES.indexOf(a.angle) - ANGLES.indexOf(b.angle));
  const previous = await SkinScan.findOne({ userId, status: "done", date: { $lt: scan.date } }).sort({ date: -1 }).lean();
  try {
    const result = await analyzeSkin(
      photos.map((p) => ({ angle: p.angle, mime: p.mime, data: Buffer.from(p.data.buffer || p.data) })),
      { previous, routine: await routineText(userId) }
    );
    Object.assign(scan, result, { status: "done", error: "", updatedAt: Date.now() });
    await countAiUse(userId);
  } catch (err) {
    Object.assign(scan, { status: "failed", error: String(err.message || err).slice(0, 300), updatedAt: Date.now() });
  }
  await scan.save();
  return scan;
}

// How many AI checks are left today (friends get one a day).
router.get("/allowance", async (req, res, next) => {
  try {
    res.json(await aiAllowance(req.userId));
  } catch (err) {
    next(err);
  }
});

// List every check (results only, no photos), newest first.
router.get("/", async (req, res, next) => {
  try {
    res.json(await SkinScan.find({ userId: req.userId }).sort({ date: -1 }).lean());
  } catch (err) {
    next(err);
  }
});

// New check for a day: { date, photos: [{ angle, data (base64) }] }.
router.post("/", aiLimit, async (req, res, next) => {
  try {
    const allowance = await aiAllowance(req.userId);
    if (!allowance.ok) return res.status(429).json({ error: LIMIT_MSG });
    const { date, photos } = req.body || {};
    if (typeof date !== "string" || !DATE.test(date)) return bad(res, "Missing or invalid date.");
    if (!Array.isArray(photos) || !photos.length || photos.length > 3) return bad(res, "Send one to three photos.");
    const parsed = [];
    for (const p of photos) {
      if (!p || !ANGLES.includes(p.angle) || typeof p.data !== "string") return bad(res, "Each photo needs an angle (front, left, right) and data.");
      if (parsed.some((x) => x.angle === p.angle)) return bad(res, `Two ${p.angle} photos sent.`);
      const buf = Buffer.from(p.data, "base64");
      if (buf.length > MAX_PHOTO) return bad(res, "A photo is too large.");
      const mime = sniffImage(buf);
      if (!mime) return bad(res, "That doesn't look like a photo (JPEG, PNG or WebP).");
      parsed.push({ angle: p.angle, mime, data: buf });
    }

    // Replace any earlier check for the same day.
    const userId = req.userId;
    const old = await SkinScan.find({ userId, date }, { _id: 1 }).lean();
    if (old.length) {
      await SkinPhoto.deleteMany({ userId, scanId: { $in: old.map((o) => o._id) } });
      await SkinScan.deleteMany({ userId, _id: { $in: old.map((o) => o._id) } });
    }

    const scan = await SkinScan.create({ userId, date, angles: parsed.map((p) => p.angle), status: "pending" });
    await SkinPhoto.insertMany(parsed.map((p) => ({ userId, scanId: scan._id, ...p })));
    await runAnalysis(scan);
    res.status(201).json(scan.toObject());
  } catch (err) {
    next(err);
  }
});

// Run the AI again on a saved check (e.g. after a failure).
router.post("/:id/analyze", aiLimit, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return bad(res, "Invalid id.");
    const scan = await SkinScan.findOne({ _id: req.params.id, userId: req.userId });
    if (!scan) return res.status(404).json({ error: "Not found" });
    const allowance = await aiAllowance(req.userId);
    // Friends: a finished check can't be re-read, and a failed one only within today's allowance.
    if (!allowance.unlimited) {
      if (scan.status === "done") return res.status(400).json({ error: "This check has already been read." });
      if (!allowance.ok) return res.status(429).json({ error: LIMIT_MSG });
    }
    await runAnalysis(scan);
    res.json(scan.toObject());
  } catch (err) {
    next(err);
  }
});

// One photo of a check.
router.get("/:id/photo/:angle", async (req, res, next) => {
  try {
    if (!isId(req.params.id) || !ANGLES.includes(req.params.angle)) return bad(res, "Invalid photo.");
    const p = await SkinPhoto.findOne({ userId: req.userId, scanId: req.params.id, angle: req.params.angle }).lean();
    if (!p) return res.status(404).json({ error: "Photo not found" });
    const buf = Buffer.from(p.data.buffer || p.data);
    // A check's photos never change (a retake makes a new check), so the browser may keep them.
    res.set({ "Content-Type": p.mime, "Content-Length": String(buf.length), "Cache-Control": "private, max-age=31536000, immutable" });
    res.end(buf);
  } catch (err) {
    next(err);
  }
});

// Delete a check and its photos.
router.delete("/:id", async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return bad(res, "Invalid id.");
    await SkinPhoto.deleteMany({ userId: req.userId, scanId: req.params.id });
    await SkinScan.deleteOne({ userId: req.userId, _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
