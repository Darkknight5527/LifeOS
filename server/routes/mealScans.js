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

// { photo: base64, hint?: "2 chapatis, half katori dal" } → estimate.
router.post("/", aiLimit, async (req, res, next) => {
  try {
    const allowance = await aiAllowance(req.userId, "meal");
    if (!allowance.ok) return res.status(429).json({ error: `You've used today's ${allowance.limit} AI meal estimates. You can add food by search or Quick add, and photos work again tomorrow.` });
    const { photo, hint } = req.body || {};
    if (typeof photo !== "string" || !photo) return res.status(400).json({ error: "Send a photo of the meal." });
    const data = Buffer.from(photo, "base64");
    if (data.length > MAX_PHOTO) return res.status(400).json({ error: "The photo is too large." });
    const mime = sniffImage(data);
    if (!mime) return res.status(400).json({ error: "That doesn't look like a photo (JPEG, PNG or WebP)." });
    let result;
    try {
      result = await analyzeMeal({ mime, data }, { hint: typeof hint === "string" ? hint : "" });
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
