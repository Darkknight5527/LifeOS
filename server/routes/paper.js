import { Router } from "express";
import ical from "node-ical";

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

export default router;
