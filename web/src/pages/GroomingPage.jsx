import { useEffect, useState } from "react";
import DomainShell from "../components/DomainShell.jsx";
import { useViewKeys } from "../components/useViewKeys.js";
import { reloadedHere } from "../lib/navigation.js";
import { Segmented } from "./finances/fin-ui.jsx";
import { SkinProvider, useSkin } from "./grooming/skin/SkinContext.jsx";
import TodayView from "./grooming/skin/TodayView.jsx";
import HistoryView from "./grooming/skin/HistoryView.jsx";
import InsightsView, { RANGES } from "./grooming/skin/InsightsView.jsx";
import RoutineView from "./grooming/skin/RoutineView.jsx";
import { CareProvider, useCare } from "./grooming/care/CareContext.jsx";
import { CareHistory, CareInsights, CareRoutine, CareToday } from "./grooming/care/CareViews.jsx";

const TABS = [
  { id: "skin", label: "Skin", icon: "drop" },
  { id: "hair", label: "Hair", icon: "hair" },
  { id: "body", label: "Body care", icon: "scissors" },
];
const VIEWS = [
  { value: "today", label: "Today" },
  { value: "history", label: "History" },
  { value: "insights", label: "Insights" },
  { value: "routine", label: "Routine" },
];
const KEY = "lifeos_groom_view";
let restored = false;

const FRESH = { tab: "skin", views: { skin: "today", hair: "today", body: "today" } };

// Skin › Today when you come in; after a refresh, wherever you were.
function initial() {
  if (reloadedHere("/grooming") && !restored) {
    restored = true;
    try {
      const v = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (v?.tab && v?.views) return { ...FRESH, ...v, views: { ...FRESH.views, ...v.views } };
    } catch {
      /* ignore */
    }
  }
  return FRESH;
}

export default function GroomingPage() {
  return (
    <SkinProvider>
      <CareProvider>
        <GroomingShell />
      </CareProvider>
    </SkinProvider>
  );
}

function GroomingShell() {
  const skin = useSkin();
  const care = useCare();
  const [state, setState] = useState(initial);
  const [range, setRange] = useState(30);
  const { tab } = state;
  const view = state.views[tab];
  const setView = (v) => setState((s) => ({ ...s, views: { ...s.views, [s.tab]: v } }));
  useViewKeys(VIEWS, view, setView); // 1–4 / Shift+← → switch views
  const src = tab === "skin" ? skin : care;

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const subtitle = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <DomainShell
      theme="theme-teal"
      title="Grooming"
      subtitle={subtitle}
      logoIcon="drop"
      tabs={TABS}
      tab={tab}
      onTab={(t) => {
        // Each tab opens on its first view (Today, Skill tree, Diary…).
        setState((s) => ({ ...s, tab: t, views: { ...s.views, [t]: FRESH.views[t] } }));
        window.scrollTo({ top: 0 });
      }}
      syncing={src.syncing && src.hasData}
      failed={Boolean(src.error) && src.hasData}
      onRetry={src.reload}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-[460px]" title="Keys: 1–4 or Shift + ← →"><Segmented className="w-full [&_button]:!py-2 [&_button]:!text-[14px]" value={view} onChange={setView} options={VIEWS} /></div>
        {view === "insights" && (
          <Segmented className="w-full sm:w-[260px] sm:shrink-0 [&_button]:!py-1.5 [&_button]:!text-[13px]" value={range} onChange={setRange} options={RANGES} />
        )}
      </div>
      {src.loading ? (
        <Loading />
      ) : src.error && !src.hasData ? (
        <div className="mt-10 rounded-[28px] bg-fin-card p-8 text-center">
          <div className="text-[18px] font-bold">Couldn't load your {tab === "skin" ? "skincare" : tab === "hair" ? "hair care" : "body care"}</div>
          <div className="mt-2 text-[15px] text-fin-muted">{src.error}</div>
          <button onClick={src.reload} className="mt-5 rounded-2xl bg-fin-tile px-5 py-2.5 font-semibold">Try again</button>
        </div>
      ) : tab === "skin" ? (
        <div key={`skin-${view}`} className="animate-fade-in">
          {view === "today" && <TodayView />}
          {view === "history" && <HistoryView />}
          {view === "insights" && <InsightsView range={range} />}
          {view === "routine" && <RoutineView />}
        </div>
      ) : (
        <div key={`${tab}-${view}`} className="animate-fade-in">
          {view === "today" && <CareToday area={tab} />}
          {view === "history" && <CareHistory area={tab} />}
          {view === "insights" && <CareInsights area={tab} range={range} />}
          {view === "routine" && <CareRoutine area={tab} />}
        </div>
      )}
    </DomainShell>
  );
}

function Loading() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[260, 320, 320].map((h, i) => (
        <div key={i} className="animate-pulse rounded-[24px] bg-fin-card" style={{ height: h, animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}
