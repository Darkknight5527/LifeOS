// Sunday check-in maths: a Monday–Sunday week's numbers from what you already
// log (weigh-ins, workouts, cardio, food, water), a plain-language verdict for
// each area, and a suggested focus for next week.
import { addDays, dayTotals, daysBetween, isoDate, parseISO, r1, todayISO, weightTrend } from "./lib";

/** The Sunday (YYYY-MM-DD) that ends the week containing `iso`. */
export function weekSunday(iso = todayISO()) {
  const d = parseISO(iso);
  return isoDate(addDays(d, (7 - d.getDay()) % 7));
}
export const weekMonday = (sunday) => isoDate(addDays(parseISO(sunday), -6));
export const shiftWeek = (sunday, n) => isoDate(addDays(parseISO(sunday), 7 * n));

export function weekLabel(sunday) {
  const mon = parseISO(weekMonday(sunday));
  const sun = parseISO(sunday);
  const f = (d, o) => d.toLocaleDateString("en-IN", o);
  return mon.getMonth() === sun.getMonth()
    ? `${mon.getDate()}–${f(sun, { day: "numeric", month: "short" })}`
    : `${f(mon, { day: "numeric", month: "short" })} – ${f(sun, { day: "numeric", month: "short" })}`;
}

/** Which week the check-in screen should open on. Monday still offers last week if it wasn't done. */
export function defaultWeek(checkins, today = todayISO()) {
  const thisWeek = weekSunday(today);
  const done = new Set(checkins.map((c) => c.week));
  if (parseISO(today).getDay() === 1 && !done.has(shiftWeek(thisWeek, -1))) return shiftWeek(thisWeek, -1);
  return thisWeek;
}

/** Is a check-in due right now? (Sunday for this week, Monday for last week.) Returns the week or null. */
export function checkinDue(checkins, today = todayISO()) {
  const day = parseISO(today).getDay();
  if (day !== 0 && day !== 1) return null;
  const week = day === 0 ? weekSunday(today) : shiftWeek(weekSunday(today), -1);
  return checkins.some((c) => c.week === week) ? null : week;
}

const trendOn = (trend, iso) => {
  let last = null;
  for (const t of trend) {
    if (t.date > iso) break;
    last = t;
  }
  return last;
};

/**
 * Numbers for the week ending `sunday`, counting only days up to today.
 * fit: the Fitness context (body, sessions, cali, cardio, foodByDate, settings, targets).
 */
export function weekStats(fit, sunday, today = todayISO()) {
  const mon = weekMonday(sunday);
  const end = sunday < today ? sunday : today;
  const days = [];
  for (let d = mon; d <= end; d = isoDate(addDays(parseISO(d), 1))) days.push(d);
  const n = days.length;
  const inWeek = (iso) => iso >= mon && iso <= end;

  // Weight: trend at the end of this week vs the end of last week.
  const trend = weightTrend(fit.body);
  const endT = trendOn(trend, end);
  const startT = trendOn(trend, isoDate(addDays(parseISO(mon), -1)));
  const weighIns = fit.body.filter((b) => b.weight > 0 && inWeek(b.date)).length;
  const change = endT && startT && endT.date >= mon ? r1(endT.trend - startT.trend) : null;
  const pct = change != null && startT.trend ? r1((change / startT.trend) * 100) : null;

  // Training: strength sessions vs the days your schedule says to train.
  const schedule = fit.settings?.schedule || [];
  const planned = days.filter((d) => (schedule[parseISO(d).getDay()] || "rest") !== "rest").length;
  const strength = fit.sessions.filter((s) => inWeek(s.date)).length;
  const caliDays = new Set((fit.cali || []).filter((c) => inWeek(c.date)).map((c) => c.date)).size;
  const cardio = fit.cardio.filter((c) => inWeek(c.date));
  const cardioMin = cardio.reduce((a, c) => a + (c.duration || 0), 0);
  const trained = new Set([...fit.sessions, ...(fit.cali || []), ...fit.cardio].filter((x) => inWeek(x.date)).map((x) => x.date)).size;

  // Food & water.
  const tg = fit.targets || {};
  const logged = days.map((d) => fit.foodByDate[d]).filter((l) => (l?.entries || []).length);
  const totals = logged.map(dayTotals);
  const avg = (k) => (totals.length ? Math.round(totals.reduce((a, t) => a + t[k], 0) / totals.length) : 0);
  const onTarget = tg.calories ? totals.filter((t) => Math.abs(t.cal - tg.calories) <= tg.calories * 0.1).length : 0;
  const under = tg.calories ? totals.filter((t) => t.cal <= tg.calories * 1.1).length : 0;
  const proteinDays = tg.protein ? totals.filter((t) => t.p >= tg.protein * 0.9).length : 0;
  const water = days.map((d) => fit.foodByDate[d]?.water || 0);
  const waterAvg = n ? Math.round(water.reduce((a, b) => a + b, 0) / n) : 0;

  return {
    week: sunday,
    days: n,
    complete: sunday <= today,
    weight: endT ? r1(endT.trend) : null,
    change,
    pct,
    weighIns,
    planned,
    strength,
    caliDays,
    cardio: cardio.length,
    cardioMin,
    trained,
    foodDays: logged.length,
    avgCal: avg("cal"),
    avgProtein: avg("p"),
    calTarget: tg.calories || 0,
    proteinTarget: tg.protein || 0,
    onTarget,
    under,
    proteinDays,
    waterAvg,
    waterTarget: tg.water || 3000,
    goal: fit.settings?.profile?.goal || "",
  };
}

// good | ok | poor | none for each area, with a one-line plain verdict.
export function verdicts(s) {
  const out = [];
  const share = (a, b) => (b ? a / b : 0);
  const losing = s.goal === "lose" || !s.goal;

  // Weigh-ins
  out.push({
    id: "weighins",
    label: "Weigh-ins",
    value: `${s.weighIns} of ${s.days} days`,
    level: s.weighIns >= Math.min(4, s.days) ? "good" : s.weighIns >= 2 ? "ok" : "poor",
    text: s.weighIns >= Math.min(4, s.days) ? "Enough weigh-ins for a reliable trend." : s.weighIns ? "A few more weigh-ins would make the trend more reliable." : "No weigh-ins — the trend can't tell how the week went.",
  });

  // Weight change / pace
  if (s.change != null) {
    const lossPct = -s.pct;
    let level = "ok";
    let text = "";
    if (losing) {
      if (lossPct > 1) {
        level = "warn";
        text = `Down ${Math.abs(s.change)} kg (${r1(lossPct)}% of your weight) — faster than the safe ~1% a week. Normal in your first week or two (water); after that, eat a little more and keep protein high so you lose fat, not muscle.`;
      } else if (lossPct >= 0.25) {
        level = "good";
        text = `Down ${Math.abs(s.change)} kg — a healthy, steady pace.`;
      } else if (lossPct > -0.25) {
        text = "About the same as last week. One flat week is normal; two or three in a row means it's time to eat a bit less or move more.";
      } else {
        level = "poor";
        text = `Up ${s.change} kg on the trend. Check the food log — usually it's weekends, snacks or untracked oil.`;
      }
    } else {
      text = `${s.change > 0 ? "Up" : "Down"} ${Math.abs(s.change)} kg on the trend.`;
    }
    out.push({ id: "weight", label: "Weight trend", value: `${s.change > 0 ? "+" : ""}${s.change} kg`, level, text });
  } else {
    out.push({ id: "weight", label: "Weight trend", value: "—", level: "none", text: "Weigh in this week and last week to see the change." });
  }

  // Training
  if (s.planned) {
    const r = share(s.strength, s.planned);
    out.push({
      id: "training",
      label: "Workouts",
      value: `${s.strength} of ${s.planned} planned`,
      level: r >= 0.8 ? "good" : r >= 0.5 ? "ok" : "poor",
      text: r >= 1 ? "Every planned workout done." : r >= 0.8 ? "Almost every planned workout done." : r >= 0.5 ? `${s.planned - s.strength} planned workout${s.planned - s.strength === 1 ? "" : "s"} missed. Shorter sessions still count.` : "Most workouts were missed. Even 20 minutes on a busy day keeps the habit alive.",
    });
  }
  if (s.cardio || s.caliDays) {
    out.push({ id: "extra", label: "Cardio & calisthenics", value: [s.cardio && `${s.cardio} cardio · ${s.cardioMin} min`, s.caliDays && `${s.caliDays} cali days`].filter(Boolean).join(" · "), level: "good", text: "Extra movement on top of your workouts — it all adds up." });
  }

  // Food logging
  const fr = share(s.foodDays, s.days);
  out.push({
    id: "logging",
    label: "Food logged",
    value: `${s.foodDays} of ${s.days} days`,
    level: fr >= 0.85 ? "good" : fr >= 0.5 ? "ok" : "poor",
    text: fr >= 0.85 ? "Consistent logging — this is what makes the numbers trustworthy." : fr ? "Gaps in the log make it hard to see what's working. Log even the messy days." : "No food logged this week.",
  });

  // Calories and protein (only when there's food and a target)
  if (s.foodDays && s.calTarget) {
    const r = share(s.under, s.foodDays);
    out.push({
      id: "calories",
      label: "Calories",
      value: `avg ${s.avgCal} / ${s.calTarget}`,
      level: r >= 0.7 ? "good" : r >= 0.4 ? "ok" : "poor",
      text: r >= 0.7 ? `At or under target on ${s.under} of ${s.foodDays} logged days.` : `Over target on ${s.foodDays - s.under} of ${s.foodDays} logged days.`,
    });
  }
  if (s.foodDays && s.proteinTarget) {
    const r = share(s.proteinDays, s.foodDays);
    out.push({
      id: "protein",
      label: "Protein",
      value: `avg ${s.avgProtein} / ${s.proteinTarget} g`,
      level: r >= 0.7 ? "good" : r >= 0.4 ? "ok" : "poor",
      text: r >= 0.7 ? "Protein target hit most days — good for keeping muscle while you lose fat." : "Protein was low on most days. Add an egg, paneer, dal, curd or chicken to each meal.",
    });
  }

  // Water
  const wr = share(s.waterAvg, s.waterTarget);
  out.push({
    id: "water",
    label: "Water",
    value: `${r1(s.waterAvg / 1000)} / ${r1(s.waterTarget / 1000)} L a day`,
    level: wr >= 0.85 ? "good" : wr >= 0.5 ? "ok" : "poor",
    text: wr >= 0.85 ? "Well hydrated." : "Below your water target — keep a bottle on your desk.",
  });
  return out;
}

// A suggested focus for next week, from the weakest area (most important first).
const ADVICE = {
  logging: "Log every meal for all 7 days — even the messy ones.",
  calories: "Stay at or under my calorie target on at least 5 days.",
  protein: "Get some protein in every meal (eggs, paneer, dal, curd, chicken).",
  training: "Do every planned workout, even if some are short.",
  weight: "Find where the extra calories come from — log weekends and oil honestly.",
  weighins: "Weigh in every morning after the toilet, before eating.",
  water: "Drink my full water target every day.",
};
export function suggestions(list) {
  const order = ["logging", "calories", "protein", "training", "weight", "weighins", "water"];
  const rank = { poor: 0, warn: 0, ok: 1 };
  const weak = list.filter((v) => v.level in rank && ADVICE[v.id]).sort((a, b) => rank[a.level] - rank[b.level] || order.indexOf(a.id) - order.indexOf(b.id));
  const warn = list.find((v) => v.id === "weight" && v.level === "warn");
  const out = weak.map((v) => (v === warn ? "Eat a little more (about +200 kcal) and keep protein high — slow the loss to ~1% a week." : ADVICE[v.id]));
  if (!out.length) out.push("Keep doing exactly what I did this week.", "Add one extra walk on a rest day.");
  return [...new Set(out)].slice(0, 3);
}

export const LEVEL = {
  good: { color: "#34d399", label: "On track" },
  ok: { color: "#fbbf24", label: "Could be better" },
  poor: { color: "#f87171", label: "Needs work" },
  warn: { color: "#fb923c", label: "Too fast" },
  none: { color: "#6b6b75", label: "No data" },
};

export const daysAgo = (iso) => daysBetween(iso, todayISO());
