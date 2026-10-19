// Your public GitHub activity, asked for by your own device (GitHub allows
// ~60 lookups an hour per internet connection — the shared server's
// allowance is often used up by other sites). Kept for 30 minutes.
import { api } from "../../api";

const KEY = "lifeos_github_v1";
const TTL = 30 * 60 * 1000;
const istDay = (iso) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

function readCache(user) {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    return c && c.user.toLowerCase() === user.toLowerCase() ? c : null;
  } catch {
    return null;
  }
}

/** Same counting as the server: commits per day (India time) and per repo. */
export function summarise(user, events) {
  const days = {};
  const repos = {};
  let commits = 0;
  for (const e of events) {
    const day = istDay(e.created_at);
    const name = e.repo?.name || "";
    const r = (repos[name] ||= { name, commits: 0, pushes: 0, last: day });
    if (day > r.last) r.last = day;
    if (e.type === "PushEvent") {
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
    fetchedAt: Date.now(),
  };
}

async function fromGithub(user) {
  const events = [];
  for (let page = 1; page <= 3; page++) {
    const r = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=100&page=${page}`, { headers: { Accept: "application/vnd.github+json" } });
    if (r.status === 404) throw Object.assign(new Error(`GitHub user "${user}" not found.`), { final: true });
    if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? "GitHub's hourly limit was reached." : `GitHub didn't answer (${r.status}).`);
    const list = await r.json();
    if (!Array.isArray(list) || !list.length) break;
    events.push(...list);
    if (list.length < 100) break;
  }
  return summarise(user, events);
}

/** Activity for `user`: cached copy if fresh, else GitHub from this device, else the server. */
export async function githubActivity(user, { fresh = false } = {}) {
  const cached = readCache(user);
  if (cached && !fresh && Date.now() - cached.fetchedAt < TTL) return cached;
  let data;
  try {
    data = await fromGithub(user);
  } catch (err) {
    if (err.final) throw err;
    try {
      data = await api.techGithub(fresh);
      if (!data.user) throw err;
    } catch {
      if (cached) return { ...cached, stale: true, error: `${err.message} Showing what was saved earlier.` };
      throw new Error(`${err.message} Try again in a little while.`);
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* not critical */
  }
  return data;
}
