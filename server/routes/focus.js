// Focus mode. The phone app locks itself down for a set time; the website
// starts a session here. Ending early needs a 6-digit code emailed to the
// account's address. The phone holds a "ticket" (a signed token for this one
// session) so it can ask for and check codes without the login token.
import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import FocusSession from "../models/FocusSession.js";
import User from "../models/User.js";
import { mailReady, maskEmail, sendMail } from "../utils/mailer.js";
import { rateLimit } from "../utils/security.js";

const AUD = "focus-exit";
const MIN_MIN = 5;
const MAX_MIN = 12 * 60;
const CODE_TTL = 10 * 60_000;
const hash = (code, id) => crypto.createHash("sha256").update(`${id}:${code}:${process.env.JWT_SECRET}`).digest("hex");
const isId = (s) => /^[a-f0-9]{24}$/i.test(String(s));

// ---------- for the logged-in website ----------
export const focusRoutes = Router();

focusRoutes.get("/", async (req, res, next) => {
  try {
    const list = await FocusSession.find({ userId: req.userId }).sort({ startedAt: -1 }).limit(60).select("startedAt endsAt minutes endedAt endedBy").lean();
    res.json({ sessions: list, emailReady: mailReady() });
  } catch (err) {
    next(err);
  }
});

focusRoutes.post("/", async (req, res, next) => {
  try {
    const minutes = Math.round(Number(req.body?.minutes));
    if (!Number.isFinite(minutes) || minutes < MIN_MIN || minutes > MAX_MIN) return res.status(400).json({ error: `Pick between ${MIN_MIN} minutes and ${MAX_MIN / 60} hours.` });
    if (!mailReady()) return res.status(503).json({ error: "Set up email on the server first — otherwise you couldn't get an emergency exit code." });
    const now = Date.now();
    // Any session still marked running is finished now (the phone runs one at a time).
    await FocusSession.updateMany({ userId: req.userId, endedBy: "", endsAt: { $lte: now } }, { $set: { endedBy: "time", updatedAt: now } });
    const s = await FocusSession.create({ userId: req.userId, startedAt: now, endsAt: now + minutes * 60_000, minutes });
    const ticket = jwt.sign({ fu: String(req.userId), fs: String(s._id) }, process.env.JWT_SECRET, { algorithm: "HS256", audience: AUD, expiresIn: Math.ceil((s.endsAt - now) / 1000) + 86400 });
    res.status(201).json({ id: s._id, endsAt: s.endsAt, startedAt: s.startedAt, ticket });
  } catch (err) {
    next(err);
  }
});

// ---------- for the phone (ticket instead of login) ----------
export const focusTicketRoutes = Router();
focusTicketRoutes.use(rateLimit({ windowMs: 15 * 60_000, max: 40, message: "Too many tries. Please wait a few minutes." }));

async function sessionFor(req, res) {
  let p;
  try {
    p = jwt.verify(String(req.body?.ticket || ""), process.env.JWT_SECRET, { algorithms: ["HS256"], audience: AUD });
  } catch {
    res.status(401).json({ error: "This focus session isn't valid any more." });
    return null;
  }
  if (!isId(p.fs) || p.fs !== req.params.id || !isId(p.fu)) {
    res.status(401).json({ error: "This focus session isn't valid any more." });
    return null;
  }
  const s = await FocusSession.findOne({ userId: p.fu, _id: p.fs });
  if (!s) {
    res.status(404).json({ error: "Focus session not found." });
    return null;
  }
  return s;
}

// Email a code for leaving early. At most 3 codes per 30 minutes, 1 a minute.
focusTicketRoutes.post("/:id/code", async (req, res, next) => {
  try {
    const s = await sessionFor(req, res);
    if (!s) return;
    const now = Date.now();
    if (s.endedBy || s.endsAt <= now) return res.json({ ended: true });
    const recent = (s.codeSends || []).filter((t) => now - t < 30 * 60_000);
    if (recent.length && now - recent[recent.length - 1] < 60_000) return res.status(429).json({ error: "A code was just sent — check your email, or wait a minute." });
    if (recent.length >= 3) return res.status(429).json({ error: "Too many codes. Wait a while before asking again." });
    const user = await User.findById(s.userId).select("email name").lean();
    if (!user?.email) return res.status(400).json({ error: "Your account has no email address." });
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const left = Math.max(1, Math.round((s.endsAt - now) / 60_000));
    await sendMail({
      to: user.email,
      subject: `LifeOS Focus exit code: ${code}`,
      text: `Your code to end Focus mode early is ${code}\n\nIt works for 10 minutes. Your session has ${left} minute${left === 1 ? "" : "s"} left — if this isn't an emergency, you've got this.\n\nIf you didn't ask for this, you can ignore it.`,
    });
    s.codeHash = hash(code, s._id);
    s.codeExpires = now + CODE_TTL;
    s.codeTries = 0;
    s.codeSends = [...recent, now];
    s.updatedAt = now;
    await s.save();
    res.json({ sentTo: maskEmail(user.email) });
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ error: err.message });
    next(err);
  }
});

// Check a code; right → the session ends now.
focusTicketRoutes.post("/:id/verify", async (req, res, next) => {
  try {
    const s = await sessionFor(req, res);
    if (!s) return;
    const now = Date.now();
    if (s.endedBy || s.endsAt <= now) return res.json({ ok: true, ended: true });
    if (!s.codeHash || s.codeExpires < now) return res.status(400).json({ error: "That code has expired — ask for a new one." });
    if (s.codeTries >= 5) return res.status(429).json({ error: "Too many wrong tries — ask for a new code." });
    const code = String(req.body?.code || "").replace(/\D/g, "");
    const good = code.length === 6 && crypto.timingSafeEqual(Buffer.from(hash(code, s._id)), Buffer.from(s.codeHash));
    if (!good) {
      s.codeTries += 1;
      await s.save();
      return res.status(400).json({ error: `Wrong code. ${5 - s.codeTries} tr${5 - s.codeTries === 1 ? "y" : "ies"} left.` });
    }
    s.endedAt = now;
    s.endedBy = "code";
    s.codeHash = "";
    s.updatedAt = now;
    await s.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// The phone reports a session that ran its full time.
focusTicketRoutes.post("/:id/done", async (req, res, next) => {
  try {
    const s = await sessionFor(req, res);
    if (!s) return;
    if (!s.endedBy && s.endsAt <= Date.now() + 5000) {
      s.endedAt = s.endsAt;
      s.endedBy = "time";
      s.updatedAt = Date.now();
      await s.save();
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
