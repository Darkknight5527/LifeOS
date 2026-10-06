import { Router } from "express";
import { cleanBody } from "./security.js";

/**
 * Generic CRUD router factory for a Mongoose model.
 * Every collection in LifeOS is single-user, so no per-document
 * ownership filtering is applied beyond requiring auth on all routes
 * (wired in routes/index.js).
 *
 * @param {import("mongoose").Model} Model
 * @param {{ sortField?: string, sortOrder?: 1 | -1 }} [opts]
 */
export function createCrudRouter(Model, opts = {}) {
  const { sortField = "createdAt", sortOrder = -1 } = opts;
  const router = Router();

  // List all documents
  router.get("/", async (req, res, next) => {
    try {
      const docs = await Model.find({}).sort({ [sortField]: sortOrder });
      res.json(docs);
    } catch (err) {
      next(err);
    }
  });

  // Get one document
  router.get("/:id", async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  // Create a document
  router.post("/", async (req, res, next) => {
    try {
      const now = Date.now();
      const body = cleanBody(req.body);
      const payload = { ...body, createdAt: body.createdAt ?? now };
      if ("updatedAt" in Model.schema.paths) {
        payload.updatedAt = now;
      }
      const doc = await Model.create(payload);
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  });

  // Create many documents at once (imports). Body: { items: [...] }, max 1000.
  router.post("/bulk", async (req, res, next) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : null;
      if (!items || !items.length) return res.status(400).json({ error: "items must be a non-empty array" });
      if (items.length > 1000) return res.status(413).json({ error: "Too many items (max 1000 per request)" });
      const now = Date.now();
      const hasUpdated = "updatedAt" in Model.schema.paths;
      const docs = await Model.insertMany(
        cleanBody(items).map((x, i) => ({ ...x, createdAt: x.createdAt ?? now + i, ...(hasUpdated ? { updatedAt: now } : {}) })),
        { ordered: true }
      );
      res.status(201).json(docs);
    } catch (err) {
      next(err);
    }
  });

  // Update a document
  router.patch("/:id", async (req, res, next) => {
    try {
      const payload = cleanBody(req.body);
      if ("updatedAt" in Model.schema.paths) {
        payload.updatedAt = Date.now();
      }
      const doc = await Model.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true,
      });
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  // Delete a document
  router.delete("/:id", async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
