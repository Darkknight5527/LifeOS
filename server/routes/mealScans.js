// AI meal photo estimates. The photo goes to the AI for this one estimate and
// is never stored; you review the result and add what's right to your diary.
import { Router } from "express";
import { analyzeMeal } from "../utils/mealAi.js";
import { aiAllowance, countAiUse } from "../utils/aiAllowance.js";
import { rateLimit } from "../utils/security.js";
import { sniffImage } from "../utils/images.js";

const router = Router();
const MAX_PHOTO = 1.5 * 1024 * 1024;
const aiLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: "Too many meal photos this hour. Try again later." });

// How many estimates are left today (friends get a few a day).
router.get("/allowance", async (req, res, next) => {
  try {
    res.json(await aiAllowance(req.userId, "meal"));
  } catch (err) {
    next(err);
  }
});

// { photos: [base64, …] (1–3 of the same plate) — or photo: base64 —,
//   hint?, reference?: [{ name, serving, cal, p, c, f }], plateCm?, katoriMl?,
//   answers?: [{ question, answer }] } → estimate.
router.post("/", aiLimit, async (req, res, next) => {
  try {
    const allowance = await aiAllowance(req.userId, "meal");
    if (!allowance.ok) return res.status(429).json({ error: `You've used today's ${allowance.limit} AI meal estimates. You can add food by search or Quick add, and photos work again tomorrow.` });
    const { photo, photos, hint, reference, plateCm, katoriMl, answers } = req.body || {};
    const raw = Array.isArray(photos) ? photos : photo ? [photo] : [];
    if (!raw.length || raw.length > 3 || raw.some((x) => typeof x !== "string" || !x)) return res.status(400).json({ error: "Send one to three photos of the meal." });
    const parsed = [];
    for (const x of raw) {
      const data = Buffer.from(x, "base64");
      if (data.length > MAX_PHOTO) return res.status(400).json({ error: "A photo is too large." });
      const mime = sniffImage(data);
      if (!mime) return res.status(400).json({ error: "That doesn't look like a photo (JPEG, PNG or WebP)." });
      parsed.push({ mime, data });
    }
    let result;
    try {
      result = await analyzeMeal(parsed, {
        hint: typeof hint === "string" ? hint : "",
        reference: Array.isArray(reference) ? reference : [],
        plateCm: Number(plateCm) || 0,
        katoriMl: Number(katoriMl) || 0,
        answers: Array.isArray(answers) ? answers : [],
      });
    } catch (err) {
      return res.status(502).json({ error: String(err.message || err).slice(0, 300) });
    }
    await countAiUse(req.userId, "meal");
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
