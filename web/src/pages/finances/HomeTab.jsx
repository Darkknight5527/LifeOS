import { useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { useMonthStats, useNowTotals } from "./stats.js";
import { BUCKETS, daysInMonth, dayHeading, formatMoney, greeting, monthLabel, weekRangeLabel } from "./lib";
import { BucketBadge, FinCard, GhostButton, Icon, Money, MoneyField, PrimaryButton, ProgressBar, Tile } from "./fin-ui.jsx";
import ExpenseRow from "./ExpenseRow.jsx";
import SalarySheet from "./SalarySheet.jsx";

export default function HomeTab({ onEdit, onGoTo }) {
  const { currentMonth, previousRecord, setSalary, ratio, expenses, prevMonthKey } = useFinance();
  const stats = useMonthStats(currentMonth);
  const last = useMonthStats(prevMonthKey(currentMonth));
  const now = useNowTotals();
  const [salaryInput, setSalaryInput] = useState("");
  const [salaryOpen, setSalaryOpen] = useState(false);

  const hasSalary = stats.salary > 0;
  const prev = previousRecord(currentMonth);
  const remaining = stats.salary - stats.total;
  const daysLeft = daysInMonth(currentMonth) - new Date().getDate() + 1;
  // What's left in Needs + Wants, spread over the remaining days (savings are not for spending).
  const spendable = hasSalary
    ? Math.max(0, stats.alloc.needs - stats.spent.needs) + Math.max(0, stats.alloc.wants - stats.spent.wants)
    : 0;
  const perDay = daysLeft > 0 ? spendable / daysLeft : 0;

  async function submitSalary(value) {
    const n = parseFloat(value);
    if (n > 0) {
      const ok = await setSalary(currentMonth, Math.round(n));
      if (ok) setSalaryInput("");
    }
  }

  return (
    // Phones: one column. Laptops: 2–3 columns so the whole overview fits on screen.
    <div className="grid grid-cols-1 items-start gap-5 lg:gap-4 lg:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
      <div className="space-y-5 lg:space-y-4">
      {/* Hero */}
      <section className="relative animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#ff9447] via-[#f47a2c] to-[#e2580e] p-6 shadow-glow sm:p-7">
        <div className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/[0.06]" />
        <div className="relative">
          <div className="text-[16px] font-semibold text-white/90">{greeting()}</div>
          {hasSalary ? (
            <>
              <div className="mt-1 text-[15px] text-white/85">Left this month</div>
              <div className="text-[40px] font-extrabold leading-tight tracking-tight sm:text-[46px]">
                <Money value={remaining} />
              </div>
              <div className="mt-1 text-[15px] text-white/90">
                of {formatMoney(stats.salary)} · {daysLeft} day{daysLeft === 1 ? "" : "s"} to go
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/15 px-3.5 py-1.5 text-[14px] font-semibold backdrop-blur-sm">
                <Icon name="sparkle" size={16} />
                You can spend about {formatMoney(Math.floor(perDay))}/day on needs & wants
              </div>
            </>
          ) : (
            <>
              <div className="mt-1 text-[30px] font-extrabold leading-tight sm:text-[34px]">Welcome to Finances</div>
              <div className="mt-2 text-[16px] text-white/90">Set your salary below to get started.</div>
            </>
          )}
        </div>
      </section>

      {/* Salary */}
      <FinCard title="Monthly salary" delay={40} action={hasSalary && (
        <button onClick={() => setSalaryOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-fin-tile px-3 py-1.5 text-[14px] font-semibold text-white/90 transition hover:bg-[#30303a]">
          <Icon name="edit" size={15} /> Edit
        </button>
      )}>
        {hasSalary ? (
          <div>
            <div className="text-[14px] text-fin-muted">Take-home · {monthLabel(currentMonth)}</div>
            <div className="mt-1 text-[32px] font-extrabold tracking-tight"><Money value={stats.salary} /></div>
            {/* Split bar */}
            <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full">
              {BUCKETS.map((b) => (
                <div key={b.id} className="h-full transition-all duration-700" style={{ width: `${(stats.alloc[b.id] / stats.salary) * 100}%`, background: b.color }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-fin-muted">
              {BUCKETS.map((b) => (
                <span key={b.id} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                  {b.label} <span className="tabular font-semibold text-white">{formatMoney(stats.alloc[b.id])}</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[16px] font-medium text-white/80">Enter your monthly take-home to begin</div>
            <div className="mt-3 flex gap-3">
              <MoneyField className="flex-1" value={salaryInput} onChange={setSalaryInput} placeholder="e.g. 60000" onEnter={() => submitSalary(salaryInput)} />
              <PrimaryButton onClick={() => submitSalary(salaryInput)} disabled={!(parseFloat(salaryInput) > 0)}>Set</PrimaryButton>
            </div>
            {prev && (
              <GhostButton className="mt-3 w-full !py-2.5 text-[15px]" onClick={() => submitSalary(prev.salary)}>
                Same as {monthLabel(prev.month, { short: true })} · {formatMoney(prev.salary)}
              </GhostButton>
            )}
            <p className="mt-3 text-[15px] leading-relaxed text-fin-muted">
              We'll split it {ratio.needs}% Needs · {ratio.wants}% Wants · {ratio.savings}% Savings — you can change the ratio or the exact amounts anytime in Settings.
            </p>
          </div>
        )}
      </FinCard>

      </div>
      <div className="space-y-5 lg:space-y-4">
      {/* Remaining per bucket */}
      {hasSalary && (
        <FinCard title="Remaining · this month" delay={80}>
          <div className="space-y-2">
            {BUCKETS.map((b) => {
              const alloc = stats.alloc[b.id];
              const spent = stats.spent[b.id];
              const left = alloc - spent;
              const pct = alloc > 0 ? Math.round((spent / alloc) * 100) : 0;
              return (
                <button key={b.id} onClick={() => onGoTo("expenses", { bucket: b.id })} className="w-full rounded-2xl p-2 text-left transition hover:bg-fin-tile/60">
                  <div className="flex items-center gap-3">
                    <BucketBadge bucket={b} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[16px] font-semibold">{b.label}</span>
                        <span className={`tabular text-[17px] font-bold ${left < 0 ? "text-fin-danger" : ""}`}>
                          {left < 0 ? `Over by ${formatMoney(-left)}` : <><Money value={left} /> <span className="text-[13px] font-medium text-fin-muted">left</span></>}
                        </span>
                      </div>
                      <div className="mt-0.5 flex justify-between text-[13px] text-fin-muted">
                        <span className="tabular">{formatMoney(spent)} of {formatMoney(alloc)}</span>
                        <span className="tabular">{pct}% used</span>
                      </div>
                    </div>
                  </div>
                  <ProgressBar className="ml-[54px] mt-2" value={spent} max={alloc} color={b.color} />
                </button>
              );
            })}
          </div>
        </FinCard>
      )}

      {/* Spending */}
      <FinCard title="Spending" delay={120}>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Today", now.today],
            ["This week", now.week],
            ["This month", now.month],
          ].map(([label, v]) => (
            <Tile key={label} className="text-center lg:!px-2">
              <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-fin-muted sm:text-[13px]">{label}</div>
              <div className="mt-1 whitespace-nowrap text-[20px] font-extrabold sm:text-[24px] lg:text-[clamp(16px,1.35vw,24px)]"><Money value={v} compact={v >= 100000} /></div>
            </Tile>
          ))}
        </div>
        <div className="mt-3 text-[14px] text-fin-muted">This week: {weekRangeLabel(now.weekStart)}</div>
      </FinCard>

      </div>
      <div className="space-y-5 lg:col-span-2 xl:col-span-1">
      {/* Last month leftover */}
      {last.salary > 0 && (
        <FinCard title="Last month leftover" delay={160}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[14px] text-fin-muted">{monthLabel(last.rec.month)}</div>
              <div className={`mt-1 text-[30px] font-extrabold ${last.salary - last.total < 0 ? "text-fin-danger" : "text-fin-savings"}`}>
                <Money value={last.salary - last.total} />
              </div>
            </div>
            <div className="text-right text-[14px] text-fin-muted">
              Spent {formatMoney(last.total)}
              <br />of {formatMoney(last.salary)}
            </div>
          </div>
        </FinCard>
      )}

      {/* Recent */}
      <FinCard
        title="Recent expenses"
        delay={200}
        action={expenses.length > 0 && (
          <button onClick={() => onGoTo("expenses")} className="text-[14px] font-semibold text-fin-accent hover:brightness-125">See all</button>
        )}
      >
        {expenses.length ? (
          <div className="-mx-2">
            {expenses.slice(0, 5).map((t) => (
              <ExpenseRow key={t._id} tx={t} onClick={() => onEdit(t)} showDate dateLabel={dayHeading(t.date)} />
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-[15px] text-fin-muted">No expenses yet. Tap + to log your first one.</div>
        )}
      </FinCard>

      </div>
      <SalarySheet open={salaryOpen} onClose={() => setSalaryOpen(false)} monthKeyValue={currentMonth} />
    </div>
  );
}
