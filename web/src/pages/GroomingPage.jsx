import { useState } from "react";
import SubTabs from "../components/SubTabs.jsx";
import SkinSection from "./physical/SkinSection.jsx";
import HairSection from "./physical/HairSection.jsx";
import GroomingSection from "./physical/GroomingSection.jsx";

const TABS = [
  { id: "skin", label: "Skin" },
  { id: "hair", label: "Hair" },
  { id: "body", label: "Body care" },
];

export default function GroomingPage() {
  const [tab, setTab] = useState("skin");
  return (
    <div>
      <h1 className="text-2xl font-semibold">Grooming</h1>
      <p className="mb-5 text-sm text-slate-500">Skin, hair and periodic body care</p>
      <SubTabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "skin" && <SkinSection />}
      {tab === "hair" && <HairSection />}
      {tab === "body" && <GroomingSection />}
    </div>
  );
}
