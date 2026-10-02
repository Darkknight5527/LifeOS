import { useEffect, useState } from "react";
import DomainShell from "../components/DomainShell.jsx";
import { IS_RELOAD } from "../lib/navigation.js";
import { Segmented } from "./finances/fin-ui.jsx";
import { SkinProvider, useSkin } from "./grooming/skin/SkinContext.jsx";
import TodayView from "./grooming/skin/TodayView.jsx";
import HistoryView from "./grooming/skin/HistoryView.jsx";
import InsightsView, { RANGES } from "./grooming/skin/InsightsView.jsx";
import RoutineView from "./grooming/skin/RoutineView.jsx";
import HairSection from "./physical/HairSection.jsx";
import GroomingSection from "./physical/GroomingSection.jsx";

const TABS = [
  { id: "skin", label: "Skin", icon: "drop" },
  { id: "hair", label: "Hair", icon: "hair" },
  { id: "body", label: "Body care", icon: "scissors" },
];
const SKIN_VIEWS = [
  { value: "today", label: "Today" },
  { value: "history", label: "History" },
  { value: "insights", label: "Insights" },
  { value: "routine", label: "Routine" },
];
const KEY = "lifeos_groom_view";
let restored = false;

// Skin › Today when you come in; after a refresh, wherever you were.
function initial() {
  if (IS_RELOAD && !restored) {
    restored = true;
    try {
      const v = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (v?.tab && v?.view) return v;
    } catch {
      /* ignore */
    }
  }
  return { tab: "skin", view: "today" };
}

export default function GroomingPage() {
  return (
    <SkinProvider>
      <GroomingShell />
    </SkinProvider>
  );
}

function GroomingShell() {
  const skin = useSkin();
  const [state, setState] = useState(initial);
  const [range, setRange] = useState(30);
  const { tab, view } = state;

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
        setState((s) => ({ ...s, tab: t }));
        window.scrollTo({ top: 0 });
      }}
      syncing={tab === "skin" && skin.syncing && skin.hasData}
      failed={tab === "skin" && Boolean(skin.error) && skin.hasData}
      onRetry={skin.reload}
    >
      {tab === "skin" && (
        <div key="skin">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              className="w-full max-w-[460px] [&_button]:!py-2 [&_button]:!text-[14px]"
              value={view}
              onChange={(v) => setState((s) => ({ ...s, view: v }))}
              options={SKIN_VIEWS}
            />
            {view === "insights" && (
              <Segmented className="w-full sm:w-[260px] sm:shrink-0 [&_button]:!py-1.5 [&_button]:!text-[13px]" value={range} onChange={setRange} options={RANGES} />
            )}
          </div>
          {skin.loading ? (
            <Loading />
          ) : skin.error && !skin.hasData ? (
            <div className="mt-10 rounded-[28px] bg-fin-card p-8 text-center">
              <div className="text-[18px] font-bold">Couldn't load your skincare</div>
              <div className="mt-2 text-[15px] text-fin-muted">{skin.error}</div>
              <button onClick={skin.reload} className="mt-5 rounded-2xl bg-fin-tile px-5 py-2.5 font-semibold">Try again</button>
            </div>
          ) : (
            <div key={view} className="animate-fade-in">
              {view === "today" && <TodayView />}
              {view === "history" && <HistoryView />}
              {view === "insights" && <InsightsView range={range} />}
              {view === "routine" && <RoutineView />}
            </div>
          )}
        </div>
      )}
      {/* Hair and Body care keep their current forms for now, in dark colours */}
      {tab !== "skin" && (
        <div key={tab} className="dark legacy-dark animate-fade-in rounded-[24px] bg-fin-card p-5 sm:p-6">
          {tab === "hair" ? <HairSection /> : <GroomingSection />}
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
