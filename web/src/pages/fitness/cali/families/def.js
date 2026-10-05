// Shared helper for the skill lists. Videos are YouTube searches, so links never go stale.
const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const S = (id, name, cat, diff, o) => ({
  id,
  name,
  cat,
  diff,
  pre: o.pre || [],
  hold: Boolean(o.hold),
  ttl: o.ttl,
  muscles: o.muscles,
  strain: o.strain || "—",
  desc: o.desc,
  steps: o.steps,
  good: o.good,
  bad: o.bad,
  main: o.main,
  acc: o.acc,
  videos: (o.yt || []).map(([title, q]) => ({ title, url: yt(q || title) })),
});
