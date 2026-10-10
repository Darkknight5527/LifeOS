import { Router } from "express";
import ical from "node-ical";
import { XMLParser } from "fast-xml-parser";

// Morning Paper: reads your Google Calendar through its private iCal link.
// The link is a secret, so it lives only in the CALENDAR_ICS_URL environment
// setting on the server — never in the code or the database.

const router = Router();
const CACHE_MS = 5 * 60 * 1000;
let cache = { at: 0, url: "", text: "" };

async function fetchIcs(url) {
  if (cache.text && cache.url === url && Date.now() - cache.at < CACHE_MS) return cache.text;
  const res = await fetch(url, { headers: { "User-Agent": "LifeOS/1.0" } });
  if (!res.ok) throw new Error(`Calendar responded ${res.status}`);
  const text = await res.text();
  cache = { at: Date.now(), url, text };
  return text;
}

const pad = (n) => String(n).padStart(2, "0");
// All-day dates come out at local midnight on the server; read them back the same way.
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Pull out the events that matter for a window.
 * @param {string} text   raw .ics
 * @param {Date} from     start of the window (the viewer's local midnight)
 * @param {Date} to       end of the window
 * @param {string[]} days the viewer's local dates (YYYY-MM-DD) for all-day events
 */
export function agendaFromIcs(text, from, to, days) {
  const data = ical.sync.parseICS(text);
  const padFrom = new Date(from.getTime() - 2 * 86400000);
  const padTo = new Date(to.getTime() + 2 * 86400000);
  const out = [];

  for (const ev of Object.values(data)) {
    if (ev.type !== "VEVENT" || !ev.start) continue;
    if (String(ev.status || "").toUpperCase() === "CANCELLED") continue;
    let instances = [];
    try {
      instances = ical.expandRecurringEvent(ev, { from: padFrom, to: padTo, expandOngoing: true });
    } catch {
      continue;
    }
    for (const inst of instances) {
      const title = String(inst.summary || ev.summary || "(No title)").trim();
      const location = String(inst.event?.location || ev.location || "").trim();
      if (inst.isFullDay) {
        const startKey = dayKey(inst.start);
        const endKey = dayKey(inst.end && inst.end > inst.start ? inst.end : new Date(inst.start.getTime() + 86400000));
        for (const d of days) {
          if (d >= startKey && d < endKey) out.push({ title, location, allDay: true, date: d, startDate: startKey, endDate: endKey });
        }
      } else {
        const start = inst.start;
        const end = inst.end && inst.end > start ? inst.end : new Date(start.getTime() + 30 * 60000);
        if (end > from && start < to) out.push({ title, location, allDay: false, start: start.toISOString(), end: end.toISOString() });
      }
    }
  }

  // De-duplicate (overrides can repeat an instance) and sort.
  const seen = new Set();
  return out
    .filter((e) => {
      const k = `${e.title}|${e.allDay ? e.date : e.start}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.allDay === b.allDay ? (a.allDay ? a.date.localeCompare(b.date) : a.start.localeCompare(b.start)) : a.allDay ? -1 : 1));
}

// GET /api/paper/calendar?from=ISO&to=ISO&days=2026-10-03,2026-10-04
router.get("/calendar", async (req, res, next) => {
  try {
    // The Google Calendar feed is the owner's own; friends don't see it.
    if (req.role !== "admin") return res.json({ configured: false, ownerOnly: true, events: [] });
    const url = process.env.CALENDAR_ICS_URL;
    if (!url) return res.json({ configured: false, events: [] });
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    const days = String(req.query.days || "").split(",").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (isNaN(from) || isNaN(to) || to <= from) return res.status(400).json({ error: "Bad date range" });
    const text = await fetchIcs(url);
    res.json({ configured: true, events: agendaFromIcs(text, from, to, days), fetchedAt: cache.at });
  } catch (err) {
    next(err);
  }
});

// ---------- News ----------
// Google News RSS (Indian English edition): free, no key, refreshed hourly-ish.
const GN = "hl=en-IN&gl=IN&ceid=IN:en";
export const NEWS_FEEDS = {
  tech: `https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?${GN}`,
  chips: `https://news.google.com/rss/search?q=${encodeURIComponent("semiconductor OR chipmaker OR TSMC OR \"chip industry\" when:3d")}&${GN}`,
  india: `https://news.google.com/rss/headlines/section/topic/NATION?${GN}`,
  world: `https://news.google.com/rss/headlines/section/topic/WORLD?${GN}`,
  sports: `https://news.google.com/rss/headlines/section/topic/SPORTS?${GN}`,
};
const NEWS_CACHE_MS = 30 * 60 * 1000;
const newsCache = {}; // section -> { at, items }
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

const decode = (s) =>
  String(s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

/** Turn an RSS document into a short list of headlines. */
export function parseNews(text, limit = 8) {
  const doc = xml.parse(text);
  let items = doc?.rss?.channel?.item || [];
  if (!Array.isArray(items)) items = [items];
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const sourceNode = it.source;
    const source = decode(typeof sourceNode === "object" ? sourceNode["#text"] : sourceNode);
    let title = decode(it.title);
    // Google appends " - Source" to titles; drop it since we show the source separately.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
    const key = title.toLowerCase().slice(0, 60);
    if (!title || seen.has(key)) continue;
    seen.add(key);
    const published = it.pubDate ? new Date(it.pubDate) : null;
    out.push({ title, source, link: /^https?:\/\//i.test(String(it.link || "")) ? String(it.link) : "", published: published && !isNaN(published) ? published.toISOString() : null });
    if (out.length >= limit) break;
  }
  return out;
}

async function getSection(section) {
  const c = newsCache[section];
  if (c && Date.now() - c.at < NEWS_CACHE_MS) return c.items;
  try {
    const res = await fetch(NEWS_FEEDS[section], { headers: { "User-Agent": "Mozilla/5.0 LifeOS" } });
    if (!res.ok) throw new Error(`News feed responded ${res.status}`);
    const items = parseNews(await res.text());
    newsCache[section] = { at: Date.now(), items };
    return items;
  } catch (err) {
    if (c) return c.items; // keep showing the last good copy
    throw err;
  }
}

// GET /api/paper/news -> { sections: { tech: [...], chips: [...], ... } }
router.get("/news", async (req, res, next) => {
  try {
    const keys = Object.keys(NEWS_FEEDS);
    const results = await Promise.allSettled(keys.map(getSection));
    const sections = {};
    const errors = {};
    keys.forEach((k, i) => {
      if (results[i].status === "fulfilled") sections[k] = results[i].value;
      else errors[k] = results[i].reason?.message || "failed";
    });
    res.json({ sections, errors, fetchedAt: Date.now() });
  } catch (err) {
    next(err);
  }
});

export default router;
