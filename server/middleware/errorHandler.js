export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// Known, harmless errors get a clear message; anything unexpected is logged
// but only a generic message goes back (no internal details leak out).
export function errorHandler(err, req, res, next) {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "That's too much data in one go." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "The request wasn't valid JSON." });
  if (err.name === "CastError") return res.status(400).json({ error: "Invalid id or value." });
  if (err.name === "ValidationError") {
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json({ error: first?.message ? `Invalid data: ${first.message}` : "Invalid data." });
  }
  if (err.code === 11000) return res.status(409).json({ error: "That already exists." });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(err.status || 500).json({ error: "Something went wrong on the server." });
}
