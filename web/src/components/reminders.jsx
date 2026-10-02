// LifeOS reminders: shown in the Morning Paper agenda, optionally pushed to
// Google Calendar (via a pre-filled "add event" link — no Google login needed).
// <ReminderSheet> is reusable: any domain can open it with a prefilled title.
import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "./Toast.jsx";
import { GhostButton, Icon, Pill, PrimaryButton, Sheet, TextField } from "../pages/finances/fin-ui.jsx";
import { addDays, daysInMonth, isoDate, parseISO, todayISO } from "../pages/finances/lib";

export const DOMAINS = [
  { id: "general", label: "General", color: "#f2c14e" },
  { id: "finances", label: "Finances", color: "#fb8a3c" },
  { id: "grooming", label: "Grooming", color: "#2dd4bf" },
  { id: "fitness", label: "Fitness", color: "#60a5fa" },
  { id: "mental", label: "Mental", color: "#c084fc" },
  { id: "goals", label: "Goals", color: "#f472b6" },
  { id: "technical", label: "Technical", color: "#94a3b8" },
  { id: "learning", label: "Learning", color: "#a3e635" },
];
export const DOMAIN = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
const REPEATS = [
  { id: "none", label: "Once" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];
const CACHE = "lifeos_reminders_cache_v1";

// Does a reminder fall on a given local date?
export function occursOn(r, iso) {
  if (!r?.date || iso < r.date) return false;
  if (r.until && iso > r.until) return false;
  switch (r.repeat) {
    case "daily":
      return true;
    case "weekly":
      return parseISO(iso).getDay() === parseISO(r.date).getDay();
    case "monthly": {
      const want = Number(r.date.slice(8));
      const last = daysInMonth(iso.slice(0, 7));
      return Number(iso.slice(8)) === Math.min(want, last);
    }
    default:
      return iso === r.date;
  }
}

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function repeatLabel(r) {
  if (r.repeat === "daily") return "Every day";
  if (r.repeat === "weekly") return `Every ${parseISO(r.date).toLocaleDateString("en-IN", { weekday: "long" })}`;
  if (r.repeat === "monthly") return `Monthly on the ${ordinal(Number(r.date.slice(8)))}`;
  return "";
}

// Google Calendar "add event" link, pre-filled. The user just presses Save.
export function googleCalendarUrl({ title, date, time, repeat, until, notes }) {
  const compact = (iso) => iso.replace(/-/g, "");
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, details: [notes, "Added from LifeOS"].filter(Boolean).join("\n\n") });
  if (time) {
    const [h, m] = time.split(":").map(Number);
    const start = new Date(parseISO(date).getTime() + (h * 60 + m) * 60000);
    const end = new Date(start.getTime() + 30 * 60000);
    const fmt = (d) => `${isoDate(d).replace(/-/g, "")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;
    p.set("dates", `${fmt(start)}/${fmt(end)}`);
    try {
      p.set("ctz", Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
    } catch {
      p.set("ctz", "Asia/Kolkata");
    }
  } else {
    p.set("dates", `${compact(date)}/${compact(isoDate(addDays(parseISO(date), 1)))}`);
  }
  if (repeat && repeat !== "none") p.set("recur", `RRULE:FREQ=${repeat.toUpperCase()}${until ? `;UNTIL=${compact(until)}` : ""}`);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// Loads and edits reminders, with an instant-load browser copy.
export function useReminders() {
  const showToast = useToast();
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE) || "[]");
    } catch {
      return [];
    }
  });
  const [loaded, setLoaded] = useState(false);
  const save = (list) => {
    try {
      localStorage.setItem(CACHE, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };
  const reload = useCallback(async () => {
    try {
      const list = await api.list("reminders");
      setItems(list);
      save(list);
    } catch {
      /* keep the cached copy */
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    if (loaded) save(items);
  }, [items, loaded]);

  const create = useCallback(
    async (data) => {
      try {
        const doc = await api.create("reminders", data);
        setItems((l) => [...l, doc]);
        showToast("Reminder added");
        return doc;
      } catch (err) {
        showToast(err.message || "Couldn't save", true);
        return null;
      }
    },
    [showToast]
  );
  const update = useCallback(
    async (r, data, msg = "Saved") => {
      setItems((l) => l.map((x) => (x._id === r._id ? { ...x, ...data } : x)));
      try {
        const doc = await api.update("reminders", r._id, data);
        setItems((l) => l.map((x) => (x._id === r._id ? doc : x)));
        if (msg) showToast(msg);
        return doc;
      } catch (err) {
        showToast(err.message || "Couldn't save", true);
        reload();
        return null;
      }
    },
    [showToast, reload]
  );
  const remove = useCallback(
    async (r) => {
      setItems((l) => l.filter((x) => x._id !== r._id));
      try {
        await api.remove("reminders", r._id);
        const { _id, __v, ...rest } = r;
        showToast("Reminder deleted", false, {
          action: { label: "Undo", onClick: () => create(rest) },
        });
      } catch (err) {
        showToast(err.message || "Couldn't delete", true);
        reload();
      }
    },
    [showToast, reload, create]
  );
  const toggleDone = useCallback(
    (r, iso) => {
      const done = new Set(r.doneDates || []);
      done.has(iso) ? done.delete(iso) : done.add(iso);
      return update(r, { doneDates: [...done] }, null);
    },
    [update]
  );

  return { items, loaded, reload, create, update, remove, toggleDone };
}

/**
 * Add / edit a reminder.
 * props: open, onClose, reminder (edit), defaults ({ title, domain, date, time, repeat }),
 *        api (the object from useReminders)
 */
export function ReminderSheet({ open, onClose, reminder, defaults = {}, api: rem }) {
  const today = todayISO();
  const tomorrow = isoDate(addDays(parseISO(today), 1));
  const [f, setF] = useState(null);
  const [toGoogle, setToGoogle] = useState(false);

  useEffect(() => {
    if (!open) return;
    const src = reminder || defaults;
    setF({
      title: src.title || "",
      domain: src.domain || "general",
      date: src.date || today,
      time: src.time ?? "",
      repeat: src.repeat || "none",
      notes: src.notes || "",
    });
    setToGoogle(false);
  }, [open, reminder]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!f) return null;
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(f.date);

  async function save() {
    if (!valid) return;
    const data = { ...f, title: f.title.trim(), notes: f.notes.trim() };
    // Open the Google tab right away (inside the click) so browsers don't block it.
    if (toGoogle) window.open(googleCalendarUrl(data), "_blank", "noopener");
    const ok = reminder ? await rem.update(reminder, data, "Reminder updated") : await rem.create(data);
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={reminder ? "Edit reminder" : "New reminder"}
      footer={
        <>
          {reminder ? (
            <GhostButton className="!px-4 text-fin-danger" aria-label="Delete reminder" onClick={() => { rem.remove(reminder); onClose(); }}>
              <Icon name="trash" size={20} />
            </GhostButton>
          ) : (
            <GhostButton className="flex-1" onClick={onClose}>Cancel</GhostButton>
          )}
          <PrimaryButton className="flex-1 !text-black" disabled={!valid} onClick={save}>
            {reminder ? "Save changes" : "Add reminder"}
          </PrimaryButton>
        </>
      }
    >
      <Label>Reminder</Label>
      <TextField autoFocus={!reminder} value={f.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Pay rent" onKeyDown={(e) => e.key === "Enter" && save()} />

      <Label>Area</Label>
      <div className="flex flex-wrap gap-1.5">
        {DOMAINS.map((d) => (
          <Pill key={d.id} active={f.domain === d.id} color={d.color} onClick={() => set("domain")(d.id)} className="!px-3 !py-1.5 !text-[13px]">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            {d.label}
          </Pill>
        ))}
      </div>

      <Label>When</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={f.date === today} onClick={() => set("date")(today)}>Today</Pill>
        <Pill active={f.date === tomorrow} onClick={() => set("date")(tomorrow)}>Tomorrow</Pill>
        <input type="date" value={f.date} min={reminder ? undefined : today} onChange={(e) => e.target.value && set("date")(e.target.value)} className="rounded-full bg-fin-input px-3 py-2 text-[14px] text-white outline-none [color-scheme:dark]" aria-label="Date" />
        <input type="time" value={f.time} onChange={(e) => set("time")(e.target.value)} className="rounded-full bg-fin-input px-3 py-2 text-[14px] text-white outline-none [color-scheme:dark]" aria-label="Time (optional)" />
        {f.time && <button onClick={() => set("time")("")} className="text-[12.5px] font-semibold text-fin-muted hover:text-white">Any time</button>}
      </div>

      <Label>Repeat</Label>
      <div className="flex flex-wrap gap-1.5">
        {REPEATS.map((r) => (
          <Pill key={r.id} active={f.repeat === r.id} onClick={() => set("repeat")(r.id)} className="!px-3.5">
            {r.label}
          </Pill>
        ))}
      </div>

      <Label>Notes (optional)</Label>
      <TextField value={f.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Anything to remember" />

      <button
        onClick={() => setToGoogle((v) => !v)}
        className={`mt-5 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${toGoogle ? "border-fin-accent/60 bg-fin-accent/10" : "border-fin-line bg-fin-input hover:bg-fin-tile"}`}
      >
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${toGoogle ? "border-fin-accent bg-fin-accent text-black" : "border-white/25 text-transparent"}`}>
          <Icon name="check" size={14} stroke={3} />
        </span>
        <span className="min-w-0">
          <span className="block text-[14.5px] font-semibold">Also add to Google Calendar</span>
          <span className="block text-[12.5px] text-fin-muted">Opens Google Calendar with it filled in — press Save there to get phone notifications.</span>
        </span>
      </button>
    </Sheet>
  );
}

function Label({ children }) {
  return <div className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted first:mt-0">{children}</div>;
}
