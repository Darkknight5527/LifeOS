// Small card on Skin › Today: today's AI check at a glance, or a nudge to take one.
import { Icon } from "../../finances/fin-ui.jsx";
import { todayISO } from "../skin/lib";
import { overallColor } from "./lib.js";
import { useSkinScans } from "./useSkinScans.js";

export default function ScanTodayCard({ onOpen }) {
  const { scans } = useSkinScans();
  const today = scans.find((s) => s.date === todayISO());
  const last = scans.find((s) => s.status === "done");
  return (
    <button onClick={onOpen} className="flex w-full animate-fade-up items-center gap-4 rounded-[24px] bg-fin-card p-4 text-left shadow-card transition hover:bg-fin-tile active:scale-[0.99] lg:p-4">
      {today?.status === "done" ? (
        <span className="tabular grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[19px] font-extrabold" style={{ background: `${overallColor(today.overall)}22`, color: overallColor(today.overall) }}>
          {today.overall}
        </span>
      ) : (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-fin-accent/15 text-fin-accent"><Icon name="sparkle" size={24} stroke={2} /></span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted">AI skin check</span>
        <span className="block truncate text-[15px] font-semibold">
          {today?.status === "done" ? today.headline : today ? "Couldn't be read — tap to retry" : last ? `Last: ${last.overall}/100 · take today's` : "Take three selfies to start tracking"}
        </span>
      </span>
      <Icon name="right" size={20} className="shrink-0 text-fin-muted" />
    </button>
  );
}
