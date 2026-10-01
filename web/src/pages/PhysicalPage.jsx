import { useState } from "react";
import SkinSection from "./physical/SkinSection.jsx";
import HairSection from "./physical/HairSection.jsx";
import GroomingSection from "./physical/GroomingSection.jsx";
import WorkoutsSection from "./physical/WorkoutsSection.jsx";

const PHYSICAL_SUB = [
  { id: "skin", label: "Skin" },
  { id: "hair", label: "Hair" },
  { id: "grooming", label: "Grooming" },
  { id: "workouts", label: "Workouts" },
];

export default function PhysicalPage() {
  const [sub, setSub] = useState("skin");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Physical</h1>
      <p className="mb-5 text-sm text-slate-500">Skin, hair, grooming, workouts</p>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {PHYSICAL_SUB.map((s) => (
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

      {sub === "skin" && <SkinSection />}
      {sub === "hair" && <HairSection />}
      {sub === "grooming" && <GroomingSection />}
      {sub === "workouts" && <WorkoutsSection />}
    </div>
  );
}
