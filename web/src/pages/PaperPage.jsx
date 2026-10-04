import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import DomainShell from "../components/DomainShell.jsx";
import { DOMAIN, ReminderSheet, occursOn, repeatLabel, useReminders } from "../components/reminders.jsx";
import { FinanceProvider, useFinance } from "./finances/FinanceContext.jsx";
import { useMonthStats } from "./finances/stats.js";
import { BUCKETS, daysInMonth, formatMoney, isoDate, addDays, todayISO, parseISO } from "./finances/lib";
import { FinCard, Icon, ProgressBar, Ring } from "./finances/fin-ui.jsx";
import { SkinProvider, useSkin } from "./grooming/skin/SkinContext.jsx";
import { PERIOD, completion, isScheduled, streak } from "./grooming/skin/lib";
import { SPLIT_LABEL, defaultSplitForToday } from "./physical/workouts/constants.js";
import NewsCard, { useNews } from "./paper/NewsCard.jsx";
import FactCard from "./paper/FactCard.jsx";

const CAL_CACHE = "lifeos_paper_cache_v1";

export default function PaperPage() {
  return (
    <FinanceProvider>
      <SkinProvider>
        <Paper />
      </SkinProvider>
    </FinanceProvider>
  );
}

function Paper() {
  const cal = useCalendar();
  const news = useNews();
  const reminders = useReminders();
  const fin = useFinance();
  const skin = useSkin();
  const today = todayISO();
  const syncing = cal.syncing || news.syncing || fin.syncing || skin.syncing;
  const [sheet, setSheet] = useState({ open: false, reminder: null });

  return (
    <DomainShell
      theme="theme-gold"
      title="Morning Paper"
      subtitle="Your day at a glance"
      logoIcon="news"
      syncing={syncing && (fin.settings || skin.hasData)}
      failed={Boolean(cal.error || fin.error || skin.error) && !syncing}
      onRetry={() => {
        cal.reload();
        news.reload();
        reminders.reload();
        fin.reload();
        skin.reload();
      }}
    >
      <Masthead today={today} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        {/* Left: your schedule */}
        <div className="space-y-5 lg:space-y-3 xl:col-span-3">
          <AgendaCard cal={cal} reminders={reminders} today={today} onOpen={(r) => setSheet({ open: true, reminder: r })} onAdd={() => setSheet({ open: true, reminder: null })} />
          <GmailCard />
        </div>
        {/* Centre: the news and today's lesson */}
        <div className="space-y-5 lg:space-y-3 xl:col-span-6 xl:flex xl:flex-col xl:gap-3 xl:space-y-0 xl:self-stretch xl:[contain:size]">
          <NewsCard news={news} />
          <FactCard today={today} />
        </div>
        {/* Right: your LifeOS at a glance */}
        <div className="space-y-3 lg:col-span-2 lg:grid lg:grid-cols-4 lg:gap-3 lg:space-y-0 xl:col-span-3 xl:block xl:space-y-3">
          <MoneyMini />
          <SkinMini today={today} />
          <TrainingMini today={today} />
          <GoalsMini />
        </div>
      </div>
      <ReminderSheet open={sheet.open} reminder={sheet.reminder} api={reminders} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </DomainShell>
  );
}

// ---------- masthead ----------
function Masthead({ today }) {
  const d = parseISO(today);
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.round((d - start) / 86400000);
  const h = new Date().getHours();
  const hello = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="mb-4 animate-fade-up border-y-2 border-double border-white/15 py-2 text-center lg:mb-3 lg:py-1.5">
      {/* Equal side columns keep the date exactly centred; the small left padding
          balances the trailing letter-spacing on the last character. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-fin-muted">
        <span className="hidden text-left sm:block">Vol. {d.getFullYear() - 2025} · No. {dayOfYear}</span>
        <span className="col-start-2 pl-[0.18em]">{d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        <span className="hidden text-right sm:block">Bengaluru Edition</span>
      </div>
      <h1 className="font-paper text-[34px] font-black leading-none tracking-tight text-[#f3e6c4] sm:text-[44px] lg:text-[38px]">The LifeOS Times</h1>
      <div className="text-[13px] italic text-fin-muted">{hello}, Akhil — here's what today holds.</div>
    </div>
  );
}

// ---------- calendar ----------
function localWindow() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  return { from, to, days: [isoDate(from), isoDate(addDays(from, 1))] };
}

function useCalendar() {
  const [state, setState] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem(CAL_CACHE) || "null");
      if (c?.days?.[0] === localWindow().days[0]) return { ...c, loading: false, syncing: true, error: null };
    } catch {
      /* ignore */
    }
    return { loading: true, syncing: true, error: null, configured: true, events: [] };
  });

  const load = useCallback(async () => {
    const w = localWindow();
    setState((s) => ({ ...s, syncing: true, error: null }));
    try {
      const res = await api.paperCalendar({ from: w.from.toISOString(), to: w.to.toISOString(), days: w.days });
      const next = { configured: res.configured, events: res.events || [], days: w.days };
      setState({ ...next, loading: false, syncing: false, error: null });
      try {
        localStorage.setItem(CAL_CACHE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    } catch (err) {
      setState((s) => ({ ...s, loading: false, syncing: false, error: err.message || "Couldn't load calendar" }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).replace(" ", " ");
const fmtHM = (date, hm) => {
  const [h, m] = hm.split(":").map(Number);
  return fmtTime(new Date(parseISO(date).getTime() + (h * 60 + m) * 60000).toISOString());
};

function AgendaCard({ cal, reminders, today, onOpen, onAdd }) {
  const tomorrow = isoDate(addDays(parseISO(today), 1));
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000); // keep "now" marker fresh
    return () => clearInterval(t);
  }, []);
  const now = Date.now();
  const eventsFor = (d) =>
    cal.events.filter((e) => (e.allDay ? e.date === d : isoDate(new Date(e.start)) === d || (new Date(e.start) < parseISO(d) && new Date(e.end) > parseISO(d))));
  const remsFor = (d) => reminders.items.filter((r) => occursOn(r, d)).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const todayRems = remsFor(today);
  const left = todayRems.filter((r) => !(r.doneDates || []).includes(today)).length + eventsFor(today).filter((e) => !e.allDay && new Date(e.end).getTime() > now).length;

  return (
    <FinCard
      title={
        <span className="flex items-center gap-2">
          <Icon name="calendar" size={16} /> Today
        </span>
      }
      action={
        <button onClick={onAdd} className="flex items-center gap-1 rounded-xl bg-fin-tile px-2.5 py-1 text-[13px] font-semibold transition hover:bg-[#30303a]" title="Add a reminder">
          <Icon name="plus" size={14} stroke={2.4} /> Reminder
        </button>
      }
      className="lg:flex lg:h-[calc(100dvh-372px)] lg:min-h-[280px] lg:flex-col"
    >
      <div className="fin-scroll -mr-2 space-y-4 pr-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <DayList events={eventsFor(today)} rems={todayRems} date={today} now={now} reminders={reminders} onOpen={onOpen} empty="Nothing planned — add a reminder with +." />
        <div>
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Tomorrow</div>
          <DayList events={eventsFor(tomorrow)} rems={remsFor(tomorrow)} date={tomorrow} now={now} reminders={reminders} onOpen={onOpen} compact empty="Nothing yet." />
        </div>
        {!cal.configured && <p className="text-[12px] text-fin-faint">Google Calendar isn't connected (set CALENDAR_ICS_URL on the backend to show its events here).</p>}
      </div>
      {left > 0 && <div className="mt-2 text-[12px] text-fin-muted">{left} still to do today</div>}
    </FinCard>
  );
}

function DayList({ events, rems, date, now, reminders, onOpen, compact = false, empty }) {
  if (!events.length && !rems.length) return <div className="py-1 text-[13.5px] text-fin-muted">{empty}</div>;
  const allDay = events.filter((e) => e.allDay);
  const timed = events.filter((e) => !e.allDay).map((e) => ({ kind: "event", sort: new Date(e.start).toTimeString().slice(0, 5), e }));
  const rows = [...timed, ...rems.map((r) => ({ kind: "rem", sort: r.time || "99:99", r }))].sort((a, b) => a.sort.localeCompare(b.sort));

  return (
    <div className="space-y-1.5">
      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allDay.map((e) => (
            <span key={e.title + e.date} className="rounded-full bg-fin-accent/15 px-2.5 py-0.5 text-[12px] font-semibold text-fin-accent">
              {e.title}
            </span>
          ))}
        </div>
      )}
      {rows.map((row) => {
        if (row.kind === "event") {
          const e = row.e;
          const s = new Date(e.start).getTime();
          const en = new Date(e.end).getTime();
          const past = en <= now;
          const live = s <= now && now < en;
          return (
            <div key={e.title + e.start} className={`flex gap-2.5 rounded-xl px-2.5 ${compact ? "py-1.5" : "py-2"} ${live ? "bg-fin-accent/10 ring-1 ring-fin-accent/40" : "bg-fin-input"} ${past ? "opacity-45" : ""}`}>
              <div className="tabular w-[58px] shrink-0 pt-px text-right text-[12.5px] font-bold">{fmtTime(e.start)}</div>
              <div className="min-w-0 flex-1 border-l border-white/10 pl-2.5">
                <div className="truncate text-[13.5px] font-semibold">
                  {live && <span className="mr-1.5 rounded bg-fin-accent px-1 py-px text-[9.5px] font-bold uppercase text-black">Now</span>}
                  {e.title}
                </div>
                {e.location && !compact && <div className="truncate text-[11.5px] text-fin-muted">{e.location}</div>}
              </div>
            </div>
          );
        }
        const r = row.r;
        const done = (r.doneDates || []).includes(date);
        const d = DOMAIN[r.domain] || DOMAIN.general;
        return (
          <div key={r._id} className={`flex items-center gap-2.5 rounded-xl bg-fin-input px-2.5 ${compact ? "py-1.5" : "py-2"} ${done ? "opacity-50" : ""}`}>
            <button
              onClick={() => reminders.toggleDone(r, date)}
              aria-pressed={done}
              title={done ? "Mark as not done" : "Mark done"}
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${done ? "border-transparent text-black" : "border-white/25 text-transparent hover:border-white/50"}`}
              style={done ? { background: d.color } : undefined}
            >
              <Icon name="check" size={11} stroke={3.2} />
            </button>
            <button onClick={() => onOpen(r)} className="min-w-0 flex-1 text-left">
              <div className={`truncate text-[13.5px] font-semibold ${done ? "line-through decoration-white/40" : ""}`}>{r.title}</div>
              <div className="flex items-center gap-1.5 truncate text-[11.5px] text-fin-muted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: d.color }} />
                {[r.time ? fmtHM(date, r.time) : "Any time", d.label, repeatLabel(r)].filter(Boolean).join(" · ")}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Gmail reminder ----------
// One card that switches itself: morning check 5 am – 4 pm, night check
// 4 pm – 5 am (after midnight still belongs to the previous night).
function gmailSlot(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 16) return { slot: "am", date: isoDate(now) };
  return { slot: "pm", date: isoDate(h < 5 ? addDays(now, -1) : now) };
}
const GMAIL_COPY = {
  am: { todo: "Check your Gmail", hint: "Clear anything urgent before the day starts.", done: "Morning inbox checked" },
  pm: { todo: "Check your Gmail", hint: "Reply to anything you missed today.", done: "Evening inbox checked" },
};

function GmailCard() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000); // flips to the next reminder on its own
    return () => clearInterval(t);
  }, []);
  const { slot, date } = gmailSlot(now);
  const key = `lifeos_paper_gmail_${date}_${slot}`;
  const read = () => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  };
  const [checked, setChecked] = useState(read);
  useEffect(() => setChecked(read()), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const mark = (v) => {
    setChecked(v);
    try {
      v ? localStorage.setItem(key, "1") : localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  };
  const copy = GMAIL_COPY[slot];
  const p = PERIOD[slot];

  return (
    <section className="animate-fade-up rounded-[22px] bg-fin-card p-4">
      <div className="flex items-center gap-3">
        <div className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${checked ? "bg-emerald-400/15 text-emerald-300" : "bg-fin-accent/15 text-fin-accent"}`}>
          <Icon name={checked ? "check" : "mail"} size={19} stroke={2} />
          <span className="absolute -bottom-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full ring-2 ring-fin-card" style={{ background: p.color, color: "#14141a" }} title={slot === "am" ? "Morning reminder" : "Night reminder"}>
            <Icon name={p.icon} size={11} stroke={2.6} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-bold">{checked ? copy.done : copy.todo}</div>
          <div className="truncate text-[12px] text-fin-muted">{checked ? "Nice — one less thing on your mind." : copy.hint}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href="https://mail.google.com/mail/u/0/#inbox"
          target="_blank"
          rel="noreferrer"
          onClick={() => mark(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] px-3 py-2 text-[14px] font-bold text-black shadow-glow transition hover:brightness-110"
        >
          Open Gmail <Icon name="external" size={15} stroke={2.2} />
        </a>
        <button onClick={() => mark(!checked)} className="rounded-xl border border-fin-line bg-fin-input px-3 py-2 text-[13px] font-semibold text-white/85 hover:bg-fin-tile">
          {checked ? "Undo" : "Done"}
        </button>
      </div>
    </section>
  );
}

// ---------- compact "your day" cards ----------
function Mini({ icon, title, meta, children, delay = 0 }) {
  return (
    <section className="animate-fade-up rounded-[20px] bg-fin-card px-4 py-3.5" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted">
          <Icon name={icon} size={14} /> {title}
        </span>
        {meta && <span className="truncate text-[12px] text-fin-muted">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function MoneyMini() {
  const { currentMonth, settings, expenses } = useFinance();
  const stats = useMonthStats(currentMonth);
  if (!settings) return <Mini icon="wallet" title="Money"><div className="h-10 animate-pulse rounded-xl bg-fin-input" /></Mini>;
  if (!stats.salary) return <Mini icon="wallet" title="Money"><div className="text-[13px] text-fin-muted">Set this month's salary in Finances.</div></Mini>;
  const daysLeft = daysInMonth(currentMonth) - new Date().getDate() + 1;
  const spendable = Math.max(0, stats.alloc.needs - stats.spent.needs) + Math.max(0, stats.alloc.wants - stats.spent.wants);
  const yesterday = isoDate(addDays(new Date(), -1));
  const spentY = expenses.filter((t) => t.date === yesterday).reduce((s, t) => s + t.amount, 0);
  return (
    <Mini icon="wallet" title="Money" meta={`${formatMoney(stats.left, { compact: true })} left`} delay={60}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="tabular text-[24px] font-extrabold leading-none">{formatMoney(Math.floor(spendable / Math.max(1, daysLeft)))}</div>
        <div className="text-right text-[12px] text-fin-muted">safe to spend today</div>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {BUCKETS.map((b) => {
          const pct = stats.alloc[b.id] ? stats.spent[b.id] / stats.alloc[b.id] : 0;
          return (
            <div key={b.id} title={`${b.label}: ${formatMoney(stats.spent[b.id])} of ${formatMoney(stats.alloc[b.id])}`}>
              <div className="flex justify-between text-[11px]">
                <span style={{ color: b.color }}>{b.label}</span>
                <span className={`tabular ${pct >= 0.8 && b.id !== "savings" ? "text-red-300" : "text-fin-faint"}`}>{Math.round(pct * 100)}%</span>
              </div>
              <ProgressBar className="mt-1 !h-1.5" value={stats.spent[b.id]} max={stats.alloc[b.id]} color={b.color} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[11.5px] text-fin-faint">Yesterday: {formatMoney(spentY)}</div>
    </Mini>
  );
}

function SkinMini({ today }) {
  const { steps, byDate, hasData } = useSkin();
  if (!hasData) return <Mini icon="drop" title="Skincare"><div className="h-9 animate-pulse rounded-xl bg-fin-input" /></Mini>;
  const c = completion(steps, byDate[today], today);
  const run = streak(steps, byDate);
  const special = steps.filter((s) => s.days?.length > 0 && s.days.length < 7 && isScheduled(s, today));
  return (
    <Mini icon="drop" title="Skincare" meta={`🔥 ${run}-day streak`} delay={90}>
      <div className="flex items-center gap-4">
        {["am", "pm"].map((id) => (
          <div key={id} className="flex items-center gap-2">
            <Ring value={c[id].done} max={c[id].total || 1} color={PERIOD[id].color} size={34} stroke={4}>
              <Icon name={PERIOD[id].icon} size={13} stroke={2} />
            </Ring>
            <span className="tabular text-[14px] font-bold">
              {c[id].done}/{c[id].total}
            </span>
          </div>
        ))}
        <span className="min-w-0 flex-1 truncate text-right text-[12px] text-fin-muted">
          {c.full ? "All done ✓" : special.length ? `Extra: ${special.map((s) => s.name).join(", ")}` : ""}
        </span>
      </div>
    </Mini>
  );
}

function TrainingMini({ today }) {
  const [last, setLast] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all([api.list("workout-strength").catch(() => []), api.list("workout-cardio").catch(() => [])]).then(([s, c]) => {
      if (!alive) return;
      const all = [...s.map((x) => ({ ...x, kind: x.splitDay || "Strength" })), ...c.map((x) => ({ ...x, kind: x.activity }))].sort((a, b) => b.date.localeCompare(a.date));
      setLast({ entry: all[0] || null, doneToday: all.some((x) => x.date === today) });
    });
    return () => {
      alive = false;
    };
  }, [today]);
  const split = defaultSplitForToday();
  const daysAgo = last?.entry ? Math.round((parseISO(today) - parseISO(last.entry.date)) / 86400000) : null;
  return (
    <Mini icon="dumbbell" title="Training" delay={120} meta={last?.doneToday ? "Logged today ✓" : ""}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-paper text-[22px] font-black leading-none text-[#f3e6c4]">{split === "rest" ? "Rest day" : `${SPLIT_LABEL[split]} day`}</div>
        <div className="truncate text-[12px] text-fin-muted">
          {last === null ? "…" : last.entry ? `Last: ${last.entry.kind}, ${daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`}` : "No sessions yet"}
        </div>
      </div>
    </Mini>
  );
}

function GoalsMini() {
  const { goals, settings } = useFinance();
  if (!settings) return <Mini icon="target" title="Goals"><div className="h-8 animate-pulse rounded-xl bg-fin-input" /></Mini>;
  const list = [...goals].filter((g) => g.currentAmount < g.targetAmount).sort((a, b) => (a.targetDate || "9999").localeCompare(b.targetDate || "9999")).slice(0, 2);
  return (
    <Mini icon="target" title="Savings goals" delay={150}>
      {list.length ? (
        <div className="space-y-2">
          {list.map((g) => (
            <div key={g._id}>
              <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className="truncate font-semibold">{g.title}</span>
                <span className="tabular whitespace-nowrap text-fin-muted">{Math.round((g.currentAmount / g.targetAmount) * 100)}%</span>
              </div>
              <ProgressBar className="mt-1 !h-1.5" value={g.currentAmount} max={g.targetAmount} color="rgb(var(--fin-accent))" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[13px] text-fin-muted">No open savings goals.</div>
      )}
    </Mini>
  );
}
