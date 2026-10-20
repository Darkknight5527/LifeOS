// Your own copies of reference books (PDFs), stored privately in MongoDB
// (GridFS) so lessons can open them at the right page. Only reachable when
// logged in — the files are never public and never in the repo.
import { Router } from "express";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const router = Router();
const KEY = /^[a-z0-9-]{1,40}$/;
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "books" });

// Each account has its own copies; the owner is kept as a string in metadata.
async function findBook(userId, key) {
  return mongoose.connection.db.collection("books.files").find({ "metadata.key": key, "metadata.userId": String(userId) }).sort({ uploadDate: -1 }).toArray();
}

// List which books you've uploaded.
router.get("/", async (req, res, next) => {
  try {
    const files = await mongoose.connection.db.collection("books.files").find({ "metadata.userId": String(req.userId) }).sort({ uploadDate: -1 }).toArray();
    const seen = new Map();
    for (const f of files) if (!seen.has(f.metadata?.key)) seen.set(f.metadata?.key, { key: f.metadata?.key, name: f.filename, size: f.length, uploadedAt: f.uploadDate });
    res.json([...seen.values()]);
  } catch (err) {
    next(err);
  }
});

// A private download link that works for 10 minutes without logging in, so
// the phone's own browser can save a big PDF (the app can't take large files
// from the page). Signed with the server secret and only good for this book.
router.post("/:key/link", async (req, res, next) => {
  try {
    if (!KEY.test(req.params.key)) return res.status(400).json({ error: "Bad book key" });
    const [file] = await findBook(req.userId, req.params.key);
    if (!file) return res.status(404).json({ error: "Book not uploaded yet" });
    const token = jwt.sign({ bk: req.params.key, bu: String(req.userId) }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "10m", audience: "book-download" });
    res.json({ path: `/book-file/${token}` });
  } catch (err) {
    next(err);
  }
});

/** Public route (mounted before login is required): GET /book-file/:token */
export async function bookDownload(req, res, next) {
  try {
    let p;
    try {
      p = jwt.verify(req.params.token, process.env.JWT_SECRET, { algorithms: ["HS256"], audience: "book-download" });
    } catch {
      return res.status(403).type("text/plain").send("This download link has expired. Tap Download again in LifeOS.");
    }
    if (!KEY.test(p.bk || "") || !mongoose.isValidObjectId(p.bu)) return res.status(403).type("text/plain").send("Invalid link.");
    const [file] = await findBook(p.bu, p.bk);
    if (!file) return res.status(404).type("text/plain").send("Book not found.");
    const name = String(file.filename || `${p.bk}.pdf`).replace(/[^\w .()-]+/g, "_");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": String(file.length),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    });
    bucket().openDownloadStream(file._id).on("error", next).pipe(res);
  } catch (err) {
    next(err);
  }
}

// Download a book (streamed).
router.get("/:key", async (req, res, next) => {
  try {
    if (!KEY.test(req.params.key)) return res.status(400).json({ error: "Bad book key" });
    const [file] = await findBook(req.userId, req.params.key);
    if (!file) return res.status(404).json({ error: "Book not uploaded yet" });
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": String(file.length),
      "Cache-Control": "private, no-store",
      "X-Uploaded-At": file.uploadDate.toISOString(),
    });
    bucket().openDownloadStream(file._id).on("error", next).pipe(res);
  } catch (err) {
    next(err);
  }
});

// Upload (or replace) a book. Body = the raw PDF bytes.
router.put("/:key", express.raw({ type: "application/pdf", limit: "60mb" }), async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!KEY.test(key)) return res.status(400).json({ error: "Bad book key" });
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length < 5 || buf.subarray(0, 5).toString() !== "%PDF-") {
      return res.status(400).json({ error: "That doesn't look like a PDF" });
    }
    const old = await findBook(req.userId, key);
    const name = String(req.get("X-File-Name") || `${key}.pdf`).slice(0, 200);
    await new Promise((resolve, reject) => {
      const up = bucket().openUploadStream(name, { metadata: { key, userId: String(req.userId) }, contentType: "application/pdf" });
      up.on("finish", resolve).on("error", reject);
      up.end(buf);
    });
    for (const f of old) await bucket().delete(f._id).catch(() => {});
    res.json({ key, name, size: buf.length });
  } catch (err) {
    next(err);
  }
});

router.delete("/:key", async (req, res, next) => {
  try {
        if (!KEY.test(req.params.key)) return res.status(400).json({ error: "Bad book key" });
    for (const f of await findBook(req.userId, req.params.key)) await bucket().delete(f._id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
