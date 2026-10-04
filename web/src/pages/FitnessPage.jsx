import { useEffect, useState } from "react";
import DomainShell from "../components/DomainShell.jsx";
import { IS_RELOAD } from "../lib/navigation.js";
import { Segmented } from "./finances/fin-ui.jsx";
import { FitProvider, useFit } from "./fitness/FitContext.jsx";
import { TrainHistory, TrainProgram, TrainProgress, TrainToday } from "./fitness/Train.jsx";
import { NutritionInsights, NutritionTargets, NutritionToday } from "./fitness/Nutrition.jsx";
import { BodyView } from "./fitness/Body.jsx";

const TABS = [
  { id: "train", label: "Train", icon: "dumbbell" },
  { id: "nutrition", label: "Nutrition", icon: "flame" },
  { id: "body", label: "Body", icon: "chart" },
];
const VIEWS = {
  train: [
    { value: "today", label: "Today" },
    { value: "history", label: "History" },
    { value: "progress", label: "Progress" },
    { value: "program", label: "Program" },
  ],
  nutrition: [
    { value: "today", label: "Diary" },
    { value: "insights", label: "Insights" },
    { value: "targets", label: "Targets & foods" },
  ],
  body: [],
};
const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
];
const KEY = "lifeos_fit_view";
const FRESH = { tab: "train", views: { train: "today", nutrition: "today", body: "" } };
let restored = false;

// Train › Today when you come in; after a refresh, wherever you were.
function initial() {
  if (IS_RELOAD && !restored) {
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

export default function FitnessPage() {
  return (
    <FitProvider>
      <FitnessShell />
    </FitProvider>
  );
}

function FitnessShell() {
  const fit = useFit();
  const [state, setState] = useState(initial);
  const [range, setRange] = useState(7);
  const { tab } = state;
  const view = state.views[tab];
  const setView = (v) => setState((s) => ({ ...s, views: { ...s.views, [s.tab]: v } }));

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  return (
    <DomainShell
      theme="theme-blue"
      title="Fitness & Nutrition"
      subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      logoIcon="dumbbell"
      tabs={TABS}
      tab={tab}
      onTab={(t) => {
        setState((s) => ({ ...s, tab: t }));
        window.scrollTo({ top: 0 });
      }}
      syncing={fit.syncing && fit.hasData}
      failed={Boolean(fit.error) && fit.hasData}
      onRetry={fit.reload}
    >
      {VIEWS[tab].length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented className="w-full max-w-[480px] [&_button]:!py-2 [&_button]:!text-[14px]" value={view} onChange={setView} options={VIEWS[tab]} />
          {tab === "nutrition" && view === "insights" && (
            <Segmented className="w-full sm:w-[200px] sm:shrink-0 [&_button]:!py-1.5 [&_button]:!text-[13px]" value={range} onChange={setRange} options={RANGES} />
          )}
        </div>
      )}
      {fit.loading ? (
        <Loading />
      ) : fit.error && !fit.hasData ? (
        <div className="mt-10 rounded-[28px] bg-fin-card p-8 text-center">
          <div className="text-[18px] font-bold">Couldn't load your fitness data</div>
          <div className="mt-2 text-[15px] text-fin-muted">{fit.error}</div>
          <button onClick={fit.reload} className="mt-5 rounded-2xl bg-fin-tile px-5 py-2.5 font-semibold">Try again</button>
        </div>
      ) : (
        <div key={`${tab}-${view}`} className="animate-fade-in">
          {tab === "train" && view === "today" && <TrainToday />}
          {tab === "train" && view === "history" && <TrainHistory onOpenSession={() => setView("today")} />}
          {tab === "train" && view === "progress" && <TrainProgress />}
          {tab === "train" && view === "program" && <TrainProgram />}
          {tab === "nutrition" && view === "today" && <NutritionToday onTargets={() => setView("targets")} />}
          {tab === "nutrition" && view === "insights" && <NutritionInsights range={range} />}
          {tab === "nutrition" && view === "targets" && <NutritionTargets />}
          {tab === "body" && <BodyView />}
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
