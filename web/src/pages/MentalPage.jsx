// Mental & Psych: Journal (PIN-locked), Mind (breathing, meditation, sleep,
// focus — Headspace-style), Skills (people, communication, English,
// hobbies) and Library (books).
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DomainShell from "../components/DomainShell.jsx";
import { useViewKeys } from "../components/useViewKeys.js";
import { reloadedHere } from "../lib/navigation.js";
import { EmptyState, FinCard, Icon, IconButton, Segmented } from "./finances/fin-ui.jsx";
import { addDays, isoDate, parseISO, todayISO } from "./finances/lib";
import { JournalProvider, useJournal } from "./mental/journal/JournalContext.jsx";
import JournalLock from "./mental/journal/Lock.jsx";
import TodayView from "./mental/journal/TodayView.jsx";
import WeekView from "./mental/journal/WeekView.jsx";
import HistoryView from "./mental/journal/HistoryView.jsx";
import PatternsView from "./mental/journal/PatternsView.jsx";
import { MindProvider, useMind } from "./mental/mind/MindContext.jsx";
import SessionHost from "./mental/mind/Sessions.jsx";
import { SkillsProvider } from "./mental/skills/SkillsContext.jsx";
import { HobbiesView, PeopleView, SkillsToday, WordsView } from "./mental/skills/SkillsViews.jsx";
import { MindBreathe, MindFocus, MindMeditate, MindSleep, MindToday } from "./mental/mind/MindViews.jsx";

const TABS = [
  { id: "journal", label: "Journal", icon: "edit" },
  { id: "mind", label: "Mind", icon: "brain" },
  { id: "skills", label: "Skills", icon: "sparkle" },
  { id: "library", label: "Library", icon: "book" },
];
export const VIEWS = {
  journal: [
    { value: "today", label: "Today" },
    { value: "week", label: "Week" },
    { value: "history", label: "History" },
    { value: "patterns", label: "Patterns" },
  ],
  mind: [
    { value: "today", label: "Today" },
    { value: "breathe", label: "Breathe" },
    { value: "meditate", label: "Meditate" },
    { value: "sleep", label: "Sleep" },
    { value: "focus", label: "Focus" },
  ],
  skills: [
    { value: "today", label: "Today" },
    { value: "people", label: "People" },
    { value: "words", label: "Words" },
    { value: "hobbies", label: "Hobbies" },
  ],
  library: [],
};
const KEY = "lifeos_mental_view";
const FRESH = { tab: "journal", views: { journal: "today", mind: "today", skills: "today", library: "" } };
let restored = false;

function initial() {
  if (reloadedHere("/mental") && !restored) {
    restored = true;
    try {
      const v = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (v?.tab && v?.views && TABS.some((t) => t.id === v.tab)) return { ...FRESH, ...v, views: { ...FRESH.views, ...v.views } };
    } catch {
      /* ignore */
    }
  }
  return FRESH;
}

export default function MentalPage() {
  return (
    <JournalProvider>
      <MindProvider>
        <SkillsProvider>
          <MentalShell />
        </SkillsProvider>
      </MindProvider>
    </JournalProvider>
  );
}

function MentalShell() {
  const j = useJournal();
  const mind = useMind();
  const [state, setState] = useState(initial);
  const [date, setDate] = useState(todayISO());
  const { tab } = state;
  const view = state.views[tab];
  const setView = (v) => setState((s) => ({ ...s, views: { ...s.views, [s.tab]: v } }));
  useViewKeys(VIEWS[tab], view, setView);
  const location = useLocation();

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);
  // A notification can ask for a tab.
  useEffect(() => {
    const t = location.state?.tab;
    if (t && VIEWS[t]) setState((s) => ({ ...s, tab: t }));
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = todayISO();
  const openDay = (d) => {
    setDate(d);
    setState((s) => ({ ...s, tab: "journal", views: { ...s.views, journal: "today" } }));
    window.scrollTo({ top: 0 });
  };
  const step = (n) => {
    const next = isoDate(addDays(parseISO(date), n));
    if (next <= today) setDate(next);
  };
  const views = VIEWS[tab];
  const goMind = (v) => {
    setState((s) => ({ ...s, tab: "mind", views: { ...s.views, mind: v } }));
    window.scrollTo({ top: 0 });
  };
  const openJournal = () => openDay(today);
  const goSkills = (v) => {
    setState((s) => ({ ...s, tab: "skills", views: { ...s.views, skills: v } }));
    window.scrollTo({ top: 0 });
  };
  const unlocked = j.lock === "open";

  return (
    <DomainShell
      theme="theme-violet"
      title="Mental & Psych"
      subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      logoIcon="brain"
      tabs={TABS}
      tab={tab}
      onTab={(t) => {
        setState((s) => ({ ...s, tab: t, views: { ...s.views, [t]: FRESH.views[t] } }));
        window.scrollTo({ top: 0 });
      }}
      views={VIEWS}
      currentViews={state.views}
      onView={(t, v) => {
        setState((s) => ({ ...s, tab: t, views: { ...s.views, [t]: v } }));
        window.scrollTo({ top: 0 });
      }}
    >
      {tab === "journal" && unlocked && views.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="w-full max-w-[460px]" title="Keys: 1–4 or Shift + ← →">
            <Segmented className="w-full [&_button]:!py-2 [&_button]:!text-[14px]" value={view} onChange={setView} options={views} />
          </div>
          <div className="flex items-center gap-1.5">
            {(view === "today" || view === "week") && (
              <>
                <IconButton icon="left" label={view === "week" ? "Previous week" : "Previous day"} onClick={() => step(view === "week" ? -7 : -1)} />
                <span className="min-w-[132px] text-center text-[14px] font-semibold">
                  {date === today ? "Today" : parseISO(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <IconButton icon="right" label={view === "week" ? "Next week" : "Next day"} disabled={date >= today} onClick={() => step(view === "week" ? 7 : 1)} />
                {date !== today && (
                  <button onClick={() => setDate(today)} className="rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold">
                    Today
                  </button>
                )}
              </>
            )}
            <IconButton icon="lock" label="Lock journal" onClick={j.relock} />
          </div>
        </div>
      )}

      {tab === "journal" &&
        (j.lock === "loading" ? (
          <div className="h-[420px] animate-pulse rounded-[24px] bg-fin-card" />
        ) : j.lock === "error" ? (
          <FinCard>
            <EmptyState icon="info">
              Couldn't reach the server. <button className="underline" onClick={j.recheck}>Try again</button>
            </EmptyState>
          </FinCard>
        ) : !unlocked ? (
          <JournalLock />
        ) : (
          <div key={`${view}`} className="animate-fade-in">
            {view === "today" && <TodayView date={date} />}
            {view === "week" && <WeekView date={date} onOpenDay={openDay} />}
            {view === "history" && <HistoryView onOpenDay={openDay} />}
            {view === "patterns" && <PatternsView />}
          </div>
        ))}

      {tab === "mind" && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="w-full max-w-[560px]" title="Keys: 1–5 or Shift + ← →">
              <Segmented className="w-full [&_button]:!py-2 [&_button]:!text-[14px]" value={view} onChange={setView} options={views} />
            </div>
            <button
              onClick={() => mind.start({ type: "sos" })}
              className="hidden items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-[14px] font-bold text-rose-200 transition hover:bg-rose-500/15 lg:flex"
            >
              🆘 SOS
            </button>
          </div>
          <div key={view} className="animate-fade-in">
            {view === "today" && <MindToday go={goMind} />}
            {view === "breathe" && <MindBreathe />}
            {view === "meditate" && <MindMeditate />}
            {view === "sleep" && <MindSleep openJournal={openJournal} />}
            {view === "focus" && <MindFocus />}
          </div>
        </>
      )}
      <SessionHost onJournal={openJournal} />

      {tab === "skills" && (
        <>
          <div className="mb-4 w-full max-w-[460px]" title="Keys: 1–4 or Shift + ← →">
            <Segmented className="w-full [&_button]:!py-2 [&_button]:!text-[14px]" value={view} onChange={setView} options={views} />
          </div>
          <div key={view} className="animate-fade-in">
            {view === "today" && <SkillsToday go={goSkills} />}
            {view === "people" && <PeopleView />}
            {view === "words" && <WordsView />}
            {view === "hobbies" && <HobbiesView />}
          </div>
        </>
      )}

      {tab === "library" && <ComingNext tab={tab} />}
    </DomainShell>
  );
}

function ComingNext({ tab }) {
  const text = {
    library: "Your bookshelf with reading progress, highlights and lessons, and reading inside the app.",
  }[tab];
  return (
    <FinCard>
      <div className="mx-auto max-w-[460px] py-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-fin-accent/15 text-fin-accent">
          <Icon name={TABS.find((t) => t.id === tab)?.icon} size={26} />
        </span>
        <div className="mt-4 text-[19px] font-bold">Coming next</div>
        <p className="mt-2 text-[14.5px] leading-relaxed text-fin-muted">{text}</p>
      </div>
    </FinCard>
  );
}
