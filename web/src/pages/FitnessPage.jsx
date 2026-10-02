import { useState } from "react";
import SubTabs from "../components/SubTabs.jsx";
import StrengthSection from "./physical/workouts/StrengthSection.jsx";
import CardioSection from "./physical/workouts/CardioSection.jsx";
import FlexSection from "./physical/workouts/FlexSection.jsx";

const TABS = [
  { id: "strength", label: "Strength" },
  { id: "cardio", label: "Cardio" },
  { id: "flex", label: "Flexibility & Sport" },
  { id: "nutrition", label: "Nutrition" },
];

export default function FitnessPage() {
  const [tab, setTab] = useState("strength");
  return (
    <div>
      <h1 className="text-2xl font-semibold">Fitness &amp; Nutrition</h1>
      <p className="mb-5 text-sm text-slate-500">Workouts and what you eat</p>
      <SubTabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "strength" && <StrengthSection />}
      {tab === "cardio" && <CardioSection />}
      {tab === "flex" && <FlexSection />}
      {tab === "nutrition" && (
        <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
          <div className="text-lg font-semibold">Nutrition — coming soon</div>
          <p className="mt-1 text-sm text-slate-500">This is where meals, protein, water and calories will be tracked.</p>
        </div>
      )}
    </div>
  );
}
