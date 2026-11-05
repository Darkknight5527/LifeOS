// Learning: the Senior-Level (L4) Mastery Plan. 4 parts, 29 weeks, 174
// lessons, 2 hours a day Monday–Saturday. Replaces Technical & Projects.
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useBackSteps } from "../lib/backSteps.js";
import DomainShell from "../components/DomainShell.jsx";
import { reloadedHere } from "../lib/navigation.js";
import { LearnProvider, useLearn } from "./learning/LearnContext.jsx";
import { LearnToday } from "./learning/Today.jsx";
import { LearnRoadmap, LessonSheet } from "./learning/Roadmap.jsx";
import { LearnQuizzes, LearnStats, LearnWeak, PauseSheet } from "./learning/Track.jsx";
import { pretty } from "./learning/schedule.js";

const TABS = [
  { id: "today", label: "Today", icon: "sun" },
  { id: "roadmap", label: "Roadmap", icon: "list" },
  { id: "weak", label: "Weak list", icon: "target" },
  { id: "quizzes", label: "Quizzes", icon: "clipboard" },
  { id: "stats", label: "Stats", icon: "chart" },
];
const KEY = "lifeos_learning_tab";
let restored = false;

function initial() {
  const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  if (TABS.some((t) => t.id === hash)) return { tab: hash };
  if (reloadedHere("/learning") && !restored) {
    restored = true;
    try {
      const v = sessionStorage.getItem(KEY);
      if (TABS.some((t) => t.id === v)) return { tab: v };
    } catch {
      /* ignore */
    }
  }
  return { tab: "today" };
}

export default function LearningPage() {
  return (
    <LearnProvider>
      <LearningShell />
    </LearnProvider>
  );
}

function LearningShell() {
  const L = useLearn();
  const [state, setState] = useState(initial);
  useBackSteps("learningTab", state, setState);
  const [lesson, setLesson] = useState(null);
  const [pause, setPause] = useState(false);
  const { tab } = state;
  const go = (id) => {
    setState({ tab: id });
    window.scrollTo({ top: 0 });
  };
  const location = useLocation();
  useEffect(() => {
    const want = location.state?.tab;
    if (want && TABS.some((t) => t.id === want)) setState({ tab: want });
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  const cur = L.schedule.current;
  const subtitle = !cur
    ? "L4 Mastery Plan · complete"
    : L.today < L.startDate
      ? `L4 Mastery Plan · starts ${pretty(L.startDate, { day: "numeric", month: "short" })}`
      : `${L.stats.full}/174 at L4 · finish ${pretty(L.schedule.finish, { day: "numeric", month: "short", year: "numeric" })}`;
  const hasData = L.progress && Object.keys(L.progress).length + L.sessions.length > 0;

  return (
    <DomainShell
      theme="theme-pink"
      title="Learning"
      subtitle={subtitle}
      logoIcon="book"
      tabs={TABS}
      tab={tab}
      onTab={go}
      action={{ label: "Pause", icon: "pause", onClick: () => setPause(true) }}
      syncing={L.syncing && hasData}
      failed={Boolean(L.error) && hasData}
      onRetry={L.reload}
    >
      {L.loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[300, 340, 300].map((h, i) => <div key={i} className="animate-pulse rounded-[24px] bg-fin-card" style={{ height: h }} />)}
        </div>
      ) : L.error && !hasData && !L.settings._id ? (
        <div className="mt-10 rounded-[28px] bg-fin-card p-8 text-center">
          <div className="text-[18px] font-bold">Couldn't load Learning</div>
          <div className="mt-2 text-[15px] text-fin-muted">{L.error}</div>
          <button onClick={L.reload} className="mt-5 rounded-2xl bg-fin-tile px-5 py-2.5 font-semibold">Try again</button>
        </div>
      ) : (
        <div key={tab} className="animate-fade-in">
          {tab === "today" && <LearnToday go={go} openLesson={setLesson} />}
          {tab === "roadmap" && <LearnRoadmap openLesson={setLesson} />}
          {tab === "weak" && <LearnWeak openLesson={setLesson} />}
          {tab === "quizzes" && <LearnQuizzes />}
          {tab === "stats" && <LearnStats onPause={() => setPause(true)} />}
        </div>
      )}
      <LessonSheet id={lesson} onClose={() => setLesson(null)} />
      <PauseSheet open={pause} onClose={() => setPause(false)} />
    </DomainShell>
  );
}
