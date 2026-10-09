import { useSkin } from "./SkinContext.jsx";
import { PERIOD, completion, prettyDate, streak, todayISO } from "./lib";
import { Icon, Ring } from "../../finances/fin-ui.jsx";
import { RoutineChecklist, SkinCheckIn } from "./skin-ui.jsx";
import ScanTodayCard from "../scan/ScanTodayCard.jsx";

export default function TodayView({ onScan }) {
  const { steps, byDate } = useSkin();
  const today = todayISO();
  const c = completion(steps, byDate[today], today);
  const run = streak(steps, byDate);
  const h = new Date().getHours();
  const nudge = c.full
    ? "All done for today — nice work."
    : h < 15
    ? c.am.done < c.am.total
      ? "Start with your morning routine."
      : "Morning done. Evening routine later."
    : c.pm.done < c.pm.total
    ? "Time for your evening routine."
    : "Almost there.";

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
        {/* Hero: overall ring + count on top, morning / evening bars below */}
        <section className="relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#36d6c2] via-[#1fb5a6] to-[#0e7f77] p-6 shadow-glow lg:rounded-[24px] lg:p-5">
          <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[15px] font-semibold text-white/90">{prettyDate(today, { weekday: "long", day: "numeric", month: "long" })}</div>
              <div className="flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-[13px] font-bold" title="Days in a row with every step done">
                <Icon name="flame" size={15} stroke={2.2} />
                {run} day{run === 1 ? "" : "s"} streak
              </div>
            </div>
            <div className="mt-3 flex items-center gap-5">
              <Ring value={c.done} max={c.total || 1} color="#ffffff" track="rgba(255,255,255,0.22)" size={92} stroke={9}>
                <span className="tabular text-[22px] font-extrabold">{c.total ? Math.round((c.done / c.total) * 100) : 0}%</span>
              </Ring>
              <div className="min-w-0">
                <div className="text-[34px] font-extrabold leading-none tracking-tight">
                  {c.done}
                  <span className="text-white/60">/{c.total}</span> <span className="text-[19px] font-bold text-white/85">steps done</span>
                </div>
                <div className="mt-1.5 text-[14px] text-white/85">{nudge}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-3">
              {["am", "pm"].map((id) => {
                const part = c[id];
                const pct = part.total ? part.done / part.total : 0;
                return (
                  <div key={id} className="rounded-2xl bg-black/15 px-3 py-2.5">
                    <div className="flex items-center justify-between text-[13px] font-semibold">
                      <span className="flex items-center gap-1.5 text-white/90">
                        <Icon name={PERIOD[id].icon} size={15} stroke={2.2} />
                        {PERIOD[id].label}
                      </span>
                      <span className="tabular">{part.done}/{part.total}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <SkinCheckIn date={today} delay={60} />
      </div>
      {/* Morning above evening (kept to a comfortable width) */}
      <div className="w-full space-y-5 lg:max-w-[560px] lg:space-y-4">
        <RoutineChecklist date={today} period="am" delay={40} />
        <RoutineChecklist date={today} period="pm" delay={80} />
        {onScan && <ScanTodayCard onOpen={onScan} />}
      </div>
    </div>
  );
}
