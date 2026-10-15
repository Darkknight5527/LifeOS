// Body progress photos: one front, side and back photo per day at most.
// The list never includes the image bytes; each image is fetched on its own.
import { Router } from "express";
import mongoose from "mongoose";
import ProgressPhoto from "../models/ProgressPhoto.js";
import { sniffImage } from "../utils/images.js";

const router = Router();
const POSES = ["front", "side", "back"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PHOTO = 1.5 * 1024 * 1024;
const bad = (res, msg) => res.status(400).json({ error: msg });

// Every photo you have (no image data), newest first.
router.get("/", async (req, res, next) => {
  try {
    res.json(await ProgressPhoto.find({ userId: req.userId }).select("-data").sort({ date: -1, createdAt: -1 }).lean());
  } catch (err) {
    next(err);
  }
});

// Save a photo: { date, pose, data (base64) }. Replaces that day's photo for the same pose.
router.post("/", async (req, res, next) => {
  try {
    const { date, pose, data } = req.body || {};
    if (typeof date !== "string" || !DATE.test(date)) return bad(res, "Missing or invalid date.");
    if (!POSES.includes(pose)) return bad(res, "Pose must be front, side or back.");
    if (typeof data !== "string" || !data) return bad(res, "Missing photo.");
    const buf = Buffer.from(data, "base64");
    if (buf.length > MAX_PHOTO) return bad(res, "The photo is too large.");
    const mime = sniffImage(buf);
    if (!mime) return bad(res, "That doesn't look like a photo (JPEG, PNG or WebP).");
    await ProgressPhoto.deleteMany({ userId: req.userId, date, pose });
    const doc = await ProgressPhoto.create({ userId: req.userId, date, pose, mime, data: buf });
    const { data: _d, ...meta } = doc.toObject(); // eslint-disable-line no-unused-vars
    res.status(201).json(meta);
  } catch (err) {
    next(err);
  }
});

// One photo's image.
router.get("/:id/image", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, "Invalid id.");
    const p = await ProgressPhoto.findOne({ userId: req.userId, _id: req.params.id }).lean();
    if (!p) return res.status(404).json({ error: "Photo not found" });
    const buf = Buffer.from(p.data.buffer || p.data);
    // A saved photo never changes (a retake is a new photo), so the browser may keep it.
    res.set({ "Content-Type": p.mime, "Content-Length": String(buf.length), "Cache-Control": "private, max-age=31536000, immutable" });
    res.end(buf);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, "Invalid id.");
    const r = await ProgressPhoto.deleteOne({ userId: req.userId, _id: req.params.id });
    if (!r.deletedCount) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
