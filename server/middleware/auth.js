import jwt from "jsonwebtoken";
import User from "../models/User.js";

// tokenVersion lets "Sign out everywhere" cancel every token issued before it.
// The user record is cached briefly so each request doesn't hit the database.
const cache = new Map(); // userId -> { version, until }
export function forgetUserCache(id) {
  cache.delete(String(id));
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    let c = cache.get(payload.sub);
    if (!c || c.until < Date.now()) {
      const user = await User.findById(payload.sub).select("tokenVersion role").lean();
      if (!user) return res.status(401).json({ error: "Invalid or expired token" });
      c = { version: user.tokenVersion || 0, role: user.role || "user", until: Date.now() + 60_000 };
      cache.set(payload.sub, c);
    }
    if ((payload.v || 0) !== c.version) return res.status(401).json({ error: "Signed out — please log in again" });
    req.userId = payload.sub;
    req.role = c.role;
    next();
  } catch (err) {
    next(err);
  }
}

/** Route guard: only the owner (admin). Use after requireAuth. */
export function requireAdmin(req, res, next) {
  if (req.role !== "admin") return res.status(403).json({ error: "Only the owner can do that." });
  next();
}
