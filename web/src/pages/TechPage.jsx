// Tech & Learning: projects you build and the skills you learn for them, in
// one place. Every skill on a project opens its learning page (courses,
// path topics, notes, flashcards, resources and study time).
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useBackSteps } from "../lib/backSteps.js";
import DomainShell from "../components/DomainShell.jsx";
import { useViewKeys } from "../components/useViewKeys.js";
import { reloadedHere } from "../lib/navigation.js";
import { Segmented } from "./finances/fin-ui.jsx";
import { TechProvider, useTech } from "./tech/TechContext.jsx";
import { NavContext, TimerBar } from "./tech/ui.jsx";
import { ActivityView, BuildLogView, IdeasView, ProjectsBoard } from "./tech/Projects.jsx";
import { ProjectPage } from "./tech/ProjectPage.jsx";
import { PathView, SkillMapView, SkillSheet } from "./tech/Skills.jsx";
import { CourseSheet, CoursesView, LearnToday, ResourcesView } from "./tech/Learn.jsx";
import { CardsView, NotesView } from "./tech/Notes.jsx";

const TABS = [
  { id: "projects", label: "Projects", icon: "code" },
  { id: "skills", label: "Skills", icon: "target" },
  { id: "learn", label: "Learn", icon: "book" },
  { id: "notes", label: "Notes", icon: "list" },
];
const VIEWS = {
  projects: [
    { value: "board", label: "Board" },
    { value: "log", label: "Build log" },
    { value: "ideas", label: "Ideas" },
    { value: "activity", label: "Activity" },
  ],
  skills: [
    { value: "map", label: "Skill map" },
    { value: "path", label: "Learning path" },
  ],
  learn: [
    { value: "today", label: "Today" },
    { value: "courses", label: "Courses" },
    { value: "resources", label: "Resources" },
  ],
  notes: [
    { value: "notes", label: "Notes" },
    { value: "cards", label: "Flashcards" },
  ],
};
const KEY = "lifeos_tech_view";
const FRESH = { tab: "projects", views: { projects: "board", skills: "map", learn: "today", notes: "notes" } };
let restored = false;

function initial() {
  // Arriving from North Star's Learning block (/tech#learn) opens Learn.
  const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  if (VIEWS[hash]) return { ...FRESH, tab: hash };
  if (reloadedHere("/tech") && !restored) {
    restored = true;
    try {
      const v = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (v?.tab && VIEWS[v.tab]) return { ...FRESH, ...v, views: { ...FRESH.views, ...v.views } };
    } catch {
      /* ignore */
    }
  }
  return FRESH;
}

export default function TechPage() {
  return (
    <TechProvider>
      <TechShell />
    </TechProvider>
  );
}

function TechShell() {
  const t = useTech();
  const [state, setState] = useState(initial);
  useBackSteps("techView", state, setState);
  // What's open on top of the page, as a stack: a project, then a skill opened from it…
  const [stack, setStack] = useState([]); // [{ type: skill | project | course, id }]
  const [focus, setFocus] = useState({}); // e.g. { noteId, cardSkill, logProject }
  const { tab } = state;
  const view = VIEWS[tab].some((v) => v.value === state.views[tab]) ? state.views[tab] : FRESH.views[tab];
  const setView = (v) => setState((s) => ({ ...s, views: { ...s.views, [s.tab]: v } }));
  useViewKeys(VIEWS[tab], view, setView);
  const location = useLocation();
  useEffect(() => {
    const want = location.state?.tab;
    if (want && VIEWS[want]) setState((s) => ({ ...s, tab: want }));
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const top = stack[stack.length - 1];
  const nav = useMemo(
    () => ({
      go: (tabId, viewId, extra = {}) => {
        setStack([]);
        setFocus(extra);
        setState((s) => ({ ...s, tab: tabId, views: { ...s.views, [tabId]: viewId || s.views[tabId] } }));
        window.scrollTo({ top: 0 });
      },
      open: (type, id) =>
        setStack((st) => {
          if (!id) return st;
          const at = st.findIndex((x) => x.type === type && x.id === id);
          if (at >= 0) return st.slice(0, at + 1); // already open underneath: go back to it
          const top = st[st.length - 1];
          // A skill/course replaces another skill/course on top; a project starts over.
          if (type === "project") return [{ type, id }];
          return top && top.type !== "project" ? [...st.slice(0, -1), { type, id }] : [...st, { type, id }];
        }),
      close: () => setStack((st) => st.slice(0, -1)),
      focus,
    }),
    [focus]
  );

  return (
    <NavContext.Provider value={nav}>
      <DomainShell
        theme="theme-green"
        title="Tech & Learning"
        subtitle="Build it · learn what it needs"
        logoIcon="code"
        tabs={TABS}
        tab={tab}
        onTab={(id) => {
          setState((s) => ({ ...s, tab: id, views: { ...s.views, [id]: FRESH.views[id] } }));
          window.scrollTo({ top: 0 });
        }}
        views={VIEWS}
        currentViews={state.views}
        onView={(id, v) => {
          setState((s) => ({ ...s, tab: id, views: { ...s.views, [id]: v } }));
          window.scrollTo({ top: 0 });
        }}
        syncing={t.syncing && t.hasData}
        failed={Boolean(t.error) && t.hasData}
        onRetry={t.reload}
      >
        <TimerBar />
        <div className="mb-4 w-full max-w-[520px]" title={`Keys: 1–${VIEWS[tab].length} or Shift + ← →`}>
          <Segmented className="w-full [&_button]:!py-2 [&_button]:!text-[14px]" value={view} onChange={setView} options={VIEWS[tab]} />
        </div>
        {t.loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[260, 320, 320].map((h, i) => <div key={i} className="animate-pulse rounded-[24px] bg-fin-card" style={{ height: h }} />)}
          </div>
        ) : t.error && !t.projects.length && !t.skills.length ? (
          <div className="mt-10 rounded-[28px] bg-fin-card p-8 text-center">
            <div className="text-[18px] font-bold">Couldn't load Tech & Learning</div>
            <div className="mt-2 text-[15px] text-fin-muted">{t.error}</div>
            <button onClick={t.reload} className="mt-5 rounded-2xl bg-fin-tile px-5 py-2.5 font-semibold">Try again</button>
          </div>
        ) : (
          <div key={`${tab}-${view}`} className="animate-fade-in">
            {tab === "projects" && view === "board" && <ProjectsBoard />}
            {tab === "projects" && view === "log" && <BuildLogView />}
            {tab === "projects" && view === "ideas" && <IdeasView />}
            {tab === "projects" && view === "activity" && <ActivityView />}
            {tab === "skills" && view === "map" && <SkillMapView />}
            {tab === "skills" && view === "path" && <PathView />}
            {tab === "learn" && view === "today" && <LearnToday />}
            {tab === "learn" && view === "courses" && <CoursesView />}
            {tab === "learn" && view === "resources" && <ResourcesView />}
            {tab === "notes" && view === "notes" && <NotesView />}
            {tab === "notes" && view === "cards" && <CardsView />}
          </div>
        )}
        <ProjectPage id={stack.find((x) => x.type === "project")?.id} onClose={() => setStack([])} />
        <SkillSheet id={top?.type === "skill" ? top.id : null} />
        <CourseSheet id={top?.type === "course" ? top.id : null} />
      </DomainShell>
    </NavContext.Provider>
  );
}
