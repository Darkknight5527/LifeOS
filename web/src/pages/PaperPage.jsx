import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import DomainShell from "../components/DomainShell.jsx";
import { FinanceProvider, useFinance } from "./finances/FinanceContext.jsx";
import { useMonthStats, useNowTotals } from "./finances/stats.js";
import { BUCKETS, daysInMonth, formatMoney, isoDate, addDays, todayISO, parseISO } from "./finances/lib";
import { FinCard, Icon, ProgressBar, Ring } from "./finances/fin-ui.jsx";
import { SkinProvider, useSkin } from "./grooming/skin/SkinContext.jsx";
import { PERIOD, completion, isScheduled, streak } from "./grooming/skin/lib";
import { SPLIT_LABEL, defaultSplitForToday } from "./physical/workouts/constants.js";

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
  const fin = useFinance();
  const skin = useSkin();
  const today = todayISO();
  const syncing = cal.syncing || fin.syncing || skin.syncing;

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
        fin.reload();
        skin.reload();
      }}
    >
      <Masthead today={today} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 [&>*]:min-w-0">
        <AgendaCard cal={cal} today={today} />
        <div className="space-y-5 lg:space-y-4">
          <MoneyCard />
          <SkinCard today={today} />
        </div>
        <div className="space-y-5 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 xl:col-span-1 xl:block xl:space-y-4">
          <GmailCard today={today} />
          <FitnessCard today={today} />
          <GoalsCard />
        </div>
      </div>
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
    <div className="mb-4 animate-fade-up border-y-2 border-double border-white/15 py-2 text-center lg:mb-3">
      <div className="flex items-center justify-between gap-3 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-fin-muted">
        <span className="hidden sm:inline">Vol. {d.getFullYear() - 2025} · No. {dayOfYear}</span>
        <span className="mx-auto sm:mx-0">{d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        <span className="hidden sm:inline">Bengaluru Edition</span>
      </div>
      <h1 className="font-paper text-[34px] font-black leading-none tracking-tight text-[#f3e6c4] sm:text-[44px] lg:text-[40px]">The LifeOS Times</h1>
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

function AgendaCard({ cal, today }) {
  const tomorrow = isoDate(addDays(parseISO(today), 1));
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000); // keep "now" marker fresh
    return () => clearInterval(t);
  }, []);
  const now = Date.now();
  const forDay = (d) =>
    cal.events.filter((e) => (e.allDay ? e.date === d : isoDate(new Date(e.start)) === d || (new Date(e.start) < parseISO(d) && new Date(e.end) > parseISO(d))));
  const todays = forDay(today);
  const tomorrows = forDay(tomorrow);
  const timedLeft = todays.filter((e) => !e.allDay && new Date(e.end).getTime() > now);

  return (
    <FinCard
      title={
        <span className="flex items-center gap-2">
          <Icon name="calendar" size={16} /> Today's agenda
        </span>
      }
      action={cal.configured && <span className="text-[12.5px] text-fin-muted">{timedLeft.length ? `${timedLeft.length} still to come` : todays.length ? "All done" : ""}</span>}
      className="lg:flex lg:h-[calc(100dvh-208px)] lg:min-h-[300px] lg:flex-col"
    >
      {!cal.configured ? (
        <div className="space-y-2 text-[14px] text-fin-muted">
          <p className="text-white">Calendar not connected yet.</p>
          <p>Add your Google Calendar's secret iCal address as <code className="rounded bg-fin-input px-1.5 text-fin-accent">CALENDAR_ICS_URL</code> in the LifeOS backend's Environment settings on Render.</p>
        </div>
      ) : cal.loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-fin-input" />)}</div>
      ) : (
        <div className="fin-scroll -mr-2 space-y-4 pr-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <EventList events={todays} now={now} empty="Nothing on the calendar today — a clear day." />
          <div>
            <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Tomorrow</div>
            <EventList events={tomorrows} now={now} compact empty="Nothing scheduled yet." />
          </div>
        </div>
      )}
    </FinCard>
  );
}

function EventList({ events, now, compact = false, empty }) {
  if (!events.length) return <div className="py-2 text-[14px] text-fin-muted">{empty}</div>;
  const allDay = events.filter((e) => e.allDay);
  const timed = events.filter((e) => !e.allDay);
  return (
    <div className="space-y-1.5">
      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allDay.map((e) => (
            <span key={e.title + e.date} className="rounded-full bg-fin-accent/15 px-3 py-1 text-[12.5px] font-semibold text-fin-accent">
              {e.title}
            </span>
          ))}
        </div>
      )}
      {timed.map((e) => {
        const s = new Date(e.start).getTime();
        const en = new Date(e.end).getTime();
        const past = en <= now;
        const live = s <= now && now < en;
        return (
          <div key={e.title + e.start} className={`flex gap-3 rounded-2xl px-3 ${compact ? "py-1.5" : "py-2.5"} ${live ? "bg-fin-accent/10 ring-1 ring-fin-accent/40" : "bg-fin-input"} ${past ? "opacity-45" : ""}`}>
            <div className="w-[70px] shrink-0 pt-0.5 text-right">
              <div className="tabular text-[13.5px] font-bold">{fmtTime(e.start)}</div>
              {!compact && <div className="tabular text-[11.5px] text-fin-faint">{fmtTime(e.end)}</div>}
            </div>
            <div className="min-w-0 flex-1 border-l border-white/10 pl-3">
              <div className="truncate text-[14.5px] font-semibold">
                {live && <span className="mr-2 rounded bg-fin-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">Now</span>}
                {e.title}
              </div>
              {e.location && !compact && (
                <div className="flex items-center gap-1 truncate text-[12.5px] text-fin-muted">
                  <Icon name="pin" size={12} /> {e.location}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Gmail reminder ----------
function GmailCard({ today }) {
  const key = `lifeos_paper_gmail_${today}`;
  const [checked, setChecked] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const mark = (v) => {
    setChecked(v);
    try {
      v ? localStorage.setItem(key, "1") : localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  };
  return (
    <FinCard delay={40}>
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition ${checked ? "bg-emerald-400/15 text-emerald-300" : "bg-fin-accent/15 text-fin-accent"}`}>
          <Icon name={checked ? "check" : "mail"} size={22} stroke={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-bold">{checked ? "Inbox checked" : "Check your Gmail"}</div>
          <div className="text-[13px] text-fin-muted">{checked ? "Nice — one less thing on your mind." : "Clear anything urgent before the day starts."}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href="https://mail.google.com/mail/u/0/#inbox"
          target="_blank"
          rel="noreferrer"
          onClick={() => mark(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[color:var(--fin-grad-from)] to-[color:var(--fin-grad-to)] px-4 py-2.5 text-[15px] font-bold text-black shadow-glow transition hover:brightness-110"
        >
          Open Gmail <Icon name="external" size={16} stroke={2.2} />
        </a>
        <button onClick={() => mark(!checked)} className="rounded-2xl border border-fin-line bg-fin-input px-4 py-2.5 text-[14px] font-semibold text-white/85 hover:bg-fin-tile">
          {checked ? "Undo" : "Mark done"}
        </button>
      </div>
    </FinCard>
  );
}

// ---------- money ----------
function MoneyCard() {
  const { currentMonth, settings } = useFinance();
  const stats = useMonthStats(currentMonth);
  const now = useNowTotals();
  const yesterday = isoDate(addDays(new Date(), -1));
  const { expenses } = useFinance();
  const spentYesterday = expenses.filter((t) => t.date === yesterday).reduce((s, t) => s + t.amount, 0);

  if (!settings) return <SkeletonCard title="Money" />;
  if (!stats.salary) {
    return (
      <FinCard title={<Title icon="wallet">Money</Title>} delay={60}>
        <div className="text-[14px] text-fin-muted">Set this month's salary in Finances to see your budget here.</div>
      </FinCard>
    );
  }
  const daysLeft = daysInMonth(currentMonth) - new Date().getDate() + 1;
  const spendable = Math.max(0, stats.alloc.needs - stats.spent.needs) + Math.max(0, stats.alloc.wants - stats.spent.wants);
  const alerts = BUCKETS.filter((b) => b.id !== "savings" && stats.alloc[b.id] > 0 && stats.spent[b.id] / stats.alloc[b.id] >= 0.8);

  return (
    <FinCard title={<Title icon="wallet">Money</Title>} delay={60}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-fin-muted">Safe to spend today</div>
          <div className="tabular text-[30px] font-extrabold leading-tight">{formatMoney(Math.floor(spendable / Math.max(1, daysLeft)))}</div>
        </div>
        <div className="text-right text-[13px] text-fin-muted">
          <div>
            <span className="tabular font-semibold text-white">{formatMoney(stats.salary - stats.total)}</span> left this month
          </div>
          <div>
            Yesterday <span className="tabular font-semibold text-white">{formatMoney(spentYesterday)}</span> · week <span className="tabular font-semibold text-white">{formatMoney(now.week)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {BUCKETS.map((b) => (
          <div key={b.id} className="flex items-center gap-3 text-[13px]">
            <span className="w-16 shrink-0 font-semibold" style={{ color: b.color }}>{b.label}</span>
            <ProgressBar className="flex-1 !h-2" value={stats.spent[b.id]} max={stats.alloc[b.id]} color={b.color} />
            <span className="tabular w-[92px] shrink-0 text-right text-fin-muted">{formatMoney(Math.max(0, stats.alloc[b.id] - stats.spent[b.id]))} left</span>
          </div>
        ))}
      </div>
      {alerts.length > 0 && (
        <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
          Heads up: {alerts.map((b) => `${b.label} is ${Math.round((stats.spent[b.id] / stats.alloc[b.id]) * 100)}% used`).join(" · ")}
        </div>
      )}
    </FinCard>
  );
}

// ---------- skin ----------
function SkinCard({ today }) {
  const { steps, byDate, hasData } = useSkin();
  if (!hasData) return <SkeletonCard title="Skincare" />;
  const c = completion(steps, byDate[today], today);
  const run = streak(steps, byDate);
  const special = steps.filter((s) => s.days?.length > 0 && s.days.length < 7 && isScheduled(s, today));
  return (
    <FinCard title={<Title icon="drop">Skincare</Title>} delay={80} action={<span className="flex items-center gap-1 text-[12.5px] font-semibold text-fin-muted"><Icon name="flame" size={14} /> {run}-day streak</span>}>
      <div className="flex items-center gap-5">
        {["am", "pm"].map((id) => (
          <div key={id} className="flex items-center gap-2">
            <Ring value={c[id].done} max={c[id].total || 1} color={PERIOD[id].color} size={46} stroke={5}>
              <Icon name={PERIOD[id].icon} size={15} stroke={2} />
            </Ring>
            <div className="leading-tight">
              <div className="tabular text-[15px] font-bold">{c[id].done}/{c[id].total}</div>
              <div className="text-[12px] text-fin-muted">{PERIOD[id].label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[13px] text-fin-muted">
        {c.full ? "Routine complete for today ✓" : special.length ? `Tonight's extra: ${special.map((s) => s.name).join(", ")}` : "Regular routine today — no extra steps."}
      </div>
    </FinCard>
  );
}

// ---------- fitness ----------
function FitnessCard({ today }) {
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
    <FinCard title={<Title icon="dumbbell">Training</Title>} delay={100}>
      <div className="text-[13px] text-fin-muted">Today's plan</div>
      <div className="font-paper text-[30px] font-black leading-tight text-[#f3e6c4]">{split === "rest" ? "Rest day" : `${SPLIT_LABEL[split]} day`}</div>
      <div className="mt-1 text-[13px] text-fin-muted">
        {last === null
          ? "Checking your log…"
          : last.doneToday
          ? "Logged today ✓"
          : last.entry
          ? `Last session: ${last.entry.kind}, ${daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}`
          : "No workouts logged yet."}
      </div>
    </FinCard>
  );
}

// ---------- goals ----------
function GoalsCard() {
  const { goals, settings } = useFinance();
  if (!settings) return <SkeletonCard title="Goals" />;
  const list = [...goals].filter((g) => g.currentAmount < g.targetAmount).sort((a, b) => (a.targetDate || "9999").localeCompare(b.targetDate || "9999")).slice(0, 3);
  return (
    <FinCard title={<Title icon="target">Savings goals</Title>} delay={120}>
      {list.length ? (
        <div className="space-y-3">
          {list.map((g) => (
            <div key={g._id}>
              <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
                <span className="truncate font-semibold">{g.title}</span>
                <span className="tabular whitespace-nowrap text-fin-muted">
                  {Math.round((g.currentAmount / g.targetAmount) * 100)}% · {formatMoney(g.targetAmount - g.currentAmount, { compact: true })} to go
                </span>
              </div>
              <ProgressBar className="mt-1.5 !h-2" value={g.currentAmount} max={g.targetAmount} color="rgb(var(--fin-accent))" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[14px] text-fin-muted">No open savings goals.</div>
      )}
    </FinCard>
  );
}

function Title({ icon, children }) {
  return (
    <span className="flex items-center gap-2">
      <Icon name={icon} size={16} /> {children}
    </span>
  );
}

function SkeletonCard({ title }) {
  return (
    <FinCard title={title}>
      <div className="space-y-2">
        <div className="h-8 w-1/2 animate-pulse rounded-xl bg-fin-input" />
        <div className="h-3 animate-pulse rounded-full bg-fin-input" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-fin-input" />
      </div>
    </FinCard>
  );
}
