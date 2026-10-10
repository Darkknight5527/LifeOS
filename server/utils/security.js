// Small security helpers (no extra packages needed).

/** Security headers on every response (a light version of what "helmet" sets). */
export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // the website lives on another domain
  res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
}

/**
 * Simple in-memory rate limiter: at most `max` attempts per `windowMs`
 * per client IP. Good enough for a single small server.
 */
export function rateLimit({ windowMs, max, message = "Too many attempts. Please wait a few minutes and try again." }) {
  const hits = new Map(); // ip -> { count, reset }
  setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.reset <= now) hits.delete(ip);
  }, windowMs).unref();
  return (req, res, next) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    let h = hits.get(ip);
    if (!h || h.reset <= now) {
      h = { count: 0, reset: now + windowMs };
      hits.set(ip, h);
    }
    h.count++;
    if (h.count > max) {
      res.setHeader("Retry-After", Math.ceil((h.reset - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

/**
 * Remove keys a client should never set: anything starting with "$" (MongoDB
 * operators) or containing "." , plus _id / __v at the top level.
 */
export function cleanBody(value, depth = 0) {
  if (Array.isArray(value)) return value.map((v) => cleanBody(v, depth + 1));
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith("$") || k.includes(".")) continue;
    // _id, __v and the owner are never taken from the client.
    if (depth === 0 && (k === "_id" || k === "__v" || k === "userId")) continue;
    out[k] = cleanBody(v, depth + 1);
  }
  return out;
}
