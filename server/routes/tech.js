// Tech & Learning extras. GitHub activity: your public commits per day and
// per repo (last ~90 days), read from GitHub's public events — no login.
// Set GITHUB_TOKEN on the server for a higher rate limit (optional).
import { Router } from "express";
import TechSettings from "../models/TechSettings.js";
import { rateLimit } from "../utils/security.js";

const router = Router();
const GH = () => process.env.GITHUB_API_URL || "https://api.github.com";
const USER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const cache = new Map(); // username → { at, data }
const TTL = 30 * 60 * 1000;
const limit = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, message: "Too many GitHub refreshes. Try again later." });

// The day (India time) an event happened.
const istDay = (iso) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

async function fetchActivity(user) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "LifeOS", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const events = [];
  for (let page = 1; page <= 3; page++) {
    const r = await fetch(`${GH()}/users/${encodeURIComponent(user)}/events/public?per_page=100&page=${page}`, { headers, signal: AbortSignal.timeout(15_000) });
    if (r.status === 404) throw Object.assign(new Error(`GitHub user "${user}" not found.`), { status: 404 });
    if (r.status === 403 || r.status === 429) throw Object.assign(new Error("GitHub's limit for now was reached. Try again in an hour."), { status: 429 });
    if (!r.ok) throw Object.assign(new Error(`GitHub didn't answer (${r.status}).`), { status: 502 });
    const list = await r.json();
    if (!Array.isArray(list) || !list.length) break;
    events.push(...list);
    if (list.length < 100) break;
  }
  const days = {};
  const repos = {};
  let commits = 0;
  for (const e of events) {
    const day = istDay(e.created_at);
    const repo = e.repo?.name || "";
    const r = (repos[repo] ||= { name: repo, commits: 0, pushes: 0, last: day });
    if (day > r.last) r.last = day;
    if (e.type === "PushEvent") {
      // Newer GitHub responses may leave out the commit list; count a push as at least one commit.
      const n = Math.max(1, Number(e.payload?.distinct_size ?? e.payload?.size ?? e.payload?.commits?.length) || 1);
      days[day] = (days[day] || 0) + n;
      r.commits += n;
      r.pushes += 1;
      commits += n;
    }
  }
  return {
    user,
    days,
    commits,
    repos: Object.values(repos).filter((r) => r.commits).sort((a, b) => b.commits - a.commits || b.last.localeCompare(a.last)).slice(0, 12),
    since: events.length ? istDay(events[events.length - 1].created_at) : null,
    fetchedAt: Date.now(),
  };
}

router.get("/github", limit, async (req, res, next) => {
  try {
    const s = await TechSettings.findOne({ userId: req.userId }).sort({ updatedAt: -1 }).lean();
    const user = String(s?.githubUser || "").trim();
    if (!user) return res.json({ user: "", days: {}, repos: [], commits: 0 });
    if (!USER.test(user)) return res.status(400).json({ error: "That isn't a valid GitHub username." });
    const key = user.toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL && req.query.fresh !== "1") return res.json(hit.data);
    try {
      const data = await fetchActivity(user);
      cache.set(key, { at: Date.now(), data });
      res.json(data);
    } catch (err) {
      if (hit) return res.json({ ...hit.data, stale: true, error: err.message });
      res.status(err.status || 502).json({ error: err.message || "Couldn't reach GitHub." });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
