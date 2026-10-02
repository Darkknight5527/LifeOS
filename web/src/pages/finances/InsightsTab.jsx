import { useMemo, useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { useMonthStats } from "./stats.js";
import { BUCKET, BUCKETS, addDays, daysInMonth, formatMoney, isoDate, monthLabel, monthShort, parseISO, shiftMonth, sum, weekStart } from "./lib";
import { BucketDot, EmptyState, FinCard, MonthNav, Segmented } from "./fin-ui.jsx";

export default function InsightsTab() {
  const { currentMonth } = useFinance();
  const [month, setMonth] = useState(currentMonth);
  const stats = useMonthStats(month);

  return (
    <div className="space-y-5">
      <MonthNav
        label={monthLabel(month)}
        sub={month === currentMonth ? "This month" : "Past month"}
        onPrev={() => setMonth((m) => shiftMonth(m, -1))}
        onNext={() => setMonth((m) => shiftMonth(m, 1))}
        canNext={month < currentMonth}
      />
      {/* Two cards per row on wide screens, one per row on phones */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <SpendByCategory stats={stats} month={month} />
        <BudgetVsSpent stats={stats} />
        <SpendingTrend stats={stats} month={month} />
        <TopSubcategories stats={stats} />
      </div>
    </div>
  );
}

// Small tooltip bubble shown above a hovered mark.
function Tip({ children, align = "center" }) {
  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <div className={`pointer-events-none absolute bottom-full z-20 mb-2 ${pos} animate-pop-in whitespace-nowrap rounded-xl bg-[#2e2e36] px-3 py-2 text-[13px] shadow-xl ring-1 ring-white/10`}>
      {children}
    </div>
  );
}

// ---------- 1. donut by bucket ----------
function SpendByCategory({ stats, month }) {
  const [active, setActive] = useState(null);
  const total = stats.total;
  const size = 200;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && BUCKETS.filter((b) => stats.spent[b.id] > 0).length > 1 ? 3 : 0;

  let offset = 0;
  const arcs = BUCKETS.map((b) => {
    const v = stats.spent[b.id];
    const len = total > 0 ? (v / total) * c : 0;
    const arc = { b, v, len: Math.max(0, len - gap), offset };
    offset += len;
    return arc;
  });
  const shown = active ? arcs.find((a) => a.b.id === active) : null;

  return (
    <FinCard title="Spend by category" delay={40}>
      {total > 0 ? (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" role="img" aria-label="Spending split by bucket">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#121215" strokeWidth={stroke} />
              {arcs.map((a) =>
                a.len > 0 ? (
                  <circle
                    key={a.b.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={a.b.color}
                    strokeWidth={active === a.b.id ? stroke + 6 : stroke}
                    strokeDasharray={`${a.len} ${c - a.len}`}
                    strokeDashoffset={-a.offset}
                    opacity={active && active !== a.b.id ? 0.35 : 1}
                    className="cursor-pointer transition-all duration-300"
                    onPointerEnter={() => setActive(a.b.id)}
                    onPointerLeave={() => setActive(null)}
                    onClick={() => setActive((x) => (x === a.b.id ? null : a.b.id))}
                  />
                ) : null
              )}
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="text-[13px] text-fin-muted">{shown ? shown.b.label : "Total spent"}</div>
                <div className="tabular text-[24px] font-extrabold">{formatMoney(shown ? shown.v : total)}</div>
                {shown && <div className="tabular text-[13px] text-fin-muted">{Math.round((shown.v / total) * 100)}%</div>}
              </div>
            </div>
          </div>
          <div className="w-full space-y-2">
            {arcs.map((a) => (
              <button
                key={a.b.id}
                onPointerEnter={() => setActive(a.b.id)}
                onPointerLeave={() => setActive(null)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${active === a.b.id ? "bg-fin-tile" : ""}`}
              >
                <BucketDot bucket={a.b} size={12} />
                <span className="flex-1 text-left text-[15px] font-semibold">{a.b.label}</span>
                <span className="tabular text-[14px] text-fin-muted">{total ? Math.round((a.v / total) * 100) : 0}%</span>
                <span className="tabular w-24 text-right text-[15px] font-bold">{formatMoney(a.v)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon="pie">No spending logged in {monthLabel(month)}.</EmptyState>
      )}
    </FinCard>
  );
}

// ---------- 2. budget vs spent ----------
function BudgetVsSpent({ stats }) {
  const { categories } = useFinance();
  const limited = categories.filter((c) => c.limit > 0);
  const spentByCat = useMemo(() => {
    const m = {};
    stats.list.forEach((t) => (m[t.category] = (m[t.category] || 0) + t.amount));
    return m;
  }, [stats.list]);

  if (!stats.alloc) {
    return (
      <FinCard title="Budget vs spent" delay={80}>
        <EmptyState icon="chart">Set your salary to compare budget vs spending.</EmptyState>
      </FinCard>
    );
  }

  const Row = ({ label, color, spent, budget }) => {
    const max = Math.max(budget, spent) || 1;
    const over = spent > budget;
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2 text-[15px]">
          <span className="flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>
          <span className="tabular text-[14px]">
            <span className={`font-bold ${over ? "text-fin-danger" : ""}`}>{formatMoney(spent)}</span>
            <span className="text-fin-muted"> / {formatMoney(budget)}</span>
          </span>
        </div>
        <div className="relative mt-2 h-3 rounded-full bg-fin-input">
          <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `${(Math.min(spent, budget) / max) * 100}%`, background: color }} />
          {over && (
            <div
              className="absolute inset-y-0 rounded-r-full bg-fin-danger transition-[width] duration-700"
              style={{ left: `calc(${(budget / max) * 100}% + 2px)`, width: `calc(${((spent - budget) / max) * 100}% - 2px)` }}
            />
          )}
          {over && <div className="absolute -bottom-1 -top-1 w-0.5 rounded bg-white/80" style={{ left: `${(budget / max) * 100}%` }} title="Budget" />}
        </div>
        <div className="mt-1 text-[13px] text-fin-muted">
          {over ? <span className="text-fin-danger">Over by {formatMoney(spent - budget)}</span> : `${formatMoney(budget - spent)} left`}
        </div>
      </div>
    );
  };

  return (
    <FinCard title="Budget vs spent" delay={80}>
      <div className="space-y-5">
        {BUCKETS.map((b) => (
          <Row key={b.id} label={b.label} color={b.color} spent={stats.spent[b.id]} budget={stats.alloc[b.id]} />
        ))}
      </div>
      {limited.length > 0 && (
        <>
          <div className="mb-3 mt-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Subcategory limits</div>
          <div className="space-y-5">
            {limited.map((c) => (
              <Row key={c._id} label={c.name} color={BUCKET[c.bucket]?.color || "#9b9ba5"} spent={spentByCat[c.name] || 0} budget={c.limit} />
            ))}
          </div>
        </>
      )}
    </FinCard>
  );
}

// Vertical bar chart with hover tooltips; bars anchored to a shared baseline.
function Bars({ data, height = 180, renderTip, highlight }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.marker || 0)));
  return (
    <div>
      <div className="relative flex items-end gap-2 border-b border-white/10 pl-10 sm:gap-3" style={{ height }}>
        {/* recessive gridlines */}
        {[0.5, 1].map((g) => (
          <div key={g} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/[0.06]" style={{ bottom: `${g * 100}%` }}>
            <span className="tabular absolute -top-2 left-0 text-[11px] text-fin-faint">{formatMoney(max * g, { compact: true })}</span>
          </div>
        ))}
        {data.map((d, i) => (
          <div
            key={d.key}
            className="relative flex h-full flex-1 cursor-pointer items-end justify-center"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onClick={() => setHover((h) => (h === i ? null : i))}
          >
            {hover === i && <Tip align={i === 0 ? "left" : i === data.length - 1 ? "right" : "center"}>{renderTip(d)}</Tip>}
            {d.marker > 0 && (
              <div className="absolute left-1/2 z-10 h-0.5 w-[70%] max-w-[46px] -translate-x-1/2 rounded bg-white/70" style={{ bottom: `${(d.marker / max) * 100}%` }} />
            )}
            <div
              className="w-[70%] max-w-[46px] rounded-t-[4px] transition-all duration-500"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? 3 : 0,
                background: d.key === highlight ? "#fb8a3c" : "#7a5236",
                opacity: hover === null || hover === i ? 1 : 0.55,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 pl-10 sm:gap-3">
        {data.map((d) => (
          <div key={d.key} className={`flex-1 text-center text-[12px] ${d.key === highlight ? "font-bold text-white" : "text-fin-muted"}`}>{d.label}</div>
        ))}
      </div>
    </div>
  );
}

// ---------- 3. spending trend: one card, Week / Month switch ----------
function SpendingTrend({ stats, month }) {
  const [view, setView] = useState("week");
  return (
    <FinCard
      title={view === "week" ? "Week by week" : "Month by month"}
      delay={120}
      action={
        <Segmented
          className="w-[170px] !p-0.5 [&_button]:!py-1.5 [&_button]:!text-[13px]"
          value={view}
          onChange={setView}
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
        />
      }
    >
      <div key={view} className="animate-fade-in">
        {view === "week" ? <WeekBars stats={stats} month={month} /> : <MonthBars month={month} />}
      </div>
    </FinCard>
  );
}

// Weeks of the selected month
function WeekBars({ stats, month }) {
  const weeks = useMemo(() => {
    const first = parseISO(`${month}-01`);
    const last = parseISO(`${month}-${String(daysInMonth(month)).padStart(2, "0")}`);
    const out = [];
    for (let ws = weekStart(first); ws <= last; ws = addDays(ws, 7)) {
      const from = isoDate(ws < first ? first : ws);
      const we = addDays(ws, 6);
      const to = isoDate(we > last ? last : we);
      const v = sum(stats.list.filter((t) => t.date >= from && t.date <= to), (t) => t.amount);
      out.push({ key: from, from, to, value: v, label: `W${out.length + 1}` });
    }
    return out;
  }, [stats.list, month]);

  const today = isoDate(new Date());
  const current = weeks.find((w) => today >= w.from && today <= w.to)?.key;
  const fmt = (iso) => parseISO(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  return (
    <>
      {stats.total > 0 ? (
        <>
          <Bars
            data={weeks}
            highlight={current}
            renderTip={(d) => (
              <>
                <div className="text-fin-muted">{fmt(d.from)} – {fmt(d.to)}</div>
                <div className="tabular font-bold">{formatMoney(d.value)}</div>
              </>
            )}
          />
          <div className="mt-3 text-[13px] text-fin-muted">Weeks start Monday{current ? " · current week highlighted" : ""}. Tap a bar for details.</div>
        </>
      ) : (
        <EmptyState icon="chart">No spending to compare yet.</EmptyState>
      )}
    </>
  );
}

// Last 6 months up to the selected month
function MonthBars({ month }) {
  const { expenses, monthRecord } = useFinance();
  const data = useMemo(() => {
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const key = shiftMonth(month, -i);
      const spent = sum(expenses.filter((t) => (t.date || "").slice(0, 7) === key), (t) => t.amount);
      out.push({ key, value: spent, marker: monthRecord(key)?.salary || 0, label: monthShort(key) });
    }
    return out;
  }, [expenses, monthRecord, month]);
  const any = data.some((d) => d.value > 0 || d.marker > 0);

  return (
    <>
      {any ? (
        <>
          <Bars
            data={data}
            highlight={month}
            renderTip={(d) => (
              <>
                <div className="text-fin-muted">{monthLabel(d.key)}</div>
                <div className="tabular font-bold">Spent {formatMoney(d.value)}</div>
                {d.marker > 0 && (
                  <div className={`tabular ${d.marker - d.value >= 0 ? "text-fin-savings" : "text-fin-danger"}`}>
                    {d.marker - d.value >= 0 ? "Left " : "Over "}{formatMoney(Math.abs(d.marker - d.value))}
                  </div>
                )}
              </>
            )}
          />
          <div className="mt-3 flex items-center gap-4 text-[13px] text-fin-muted">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-fin-accent" /> Spent</span>
            <span className="flex items-center gap-2"><span className="h-0.5 w-3 rounded bg-white/70" /> Salary</span>
          </div>
        </>
      ) : (
        <EmptyState icon="chart">History will appear as you log expenses.</EmptyState>
      )}
    </>
  );
}

// ---------- 5. top subcategories ----------
function TopSubcategories({ stats }) {
  const rows = useMemo(() => {
    const m = new Map();
    stats.list.forEach((t) => {
      const k = t.category;
      const cur = m.get(k) || { name: k, bucket: t.bucket, value: 0, count: 0 };
      cur.value += t.amount;
      cur.count += 1;
      m.set(k, cur);
    });
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 6);
  }, [stats.list]);
  const max = rows[0]?.value || 1;

  return (
    <FinCard title="Top subcategories" delay={160}>
      {rows.length ? (
        <div className="space-y-4">
          {rows.map((r, i) => {
            const b = BUCKET[r.bucket] || BUCKET.wants;
            return (
              <div key={r.name} className="flex items-center gap-3">
                <div className="tabular w-5 text-center text-[14px] font-bold text-fin-faint">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold">{r.name}</span>
                    <span className="tabular text-[15px] font-bold">{formatMoney(r.value)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-fin-input">
                      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(r.value / max) * 100}%`, background: b.color }} />
                    </div>
                    <span className="w-20 shrink-0 text-right text-[12px] text-fin-muted">{b.label} · {r.count}×</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="receipt">Your biggest spending areas will show here.</EmptyState>
      )}
    </FinCard>
  );
}
