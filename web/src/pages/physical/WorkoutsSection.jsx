import { useState } from "react";
import StrengthSection from "./workouts/StrengthSection.jsx";
import CardioSection from "./workouts/CardioSection.jsx";
import FlexSection from "./workouts/FlexSection.jsx";

const WORKOUT_SUB = [
  { id: "strength", label: "Strength" },
  { id: "cardio", label: "Cardio" },
  { id: "flex", label: "Flexibility & Sport" },
];

export default function WorkoutsSection() {
  const [sub, setSub] = useState("strength");

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {WORKOUT_SUB.map((s) => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
              sub === s.id
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {sub === "strength" && <StrengthSection />}
      {sub === "cardio" && <CardioSection />}
      {sub === "flex" && <FlexSection />}
    </div>
  );
}
