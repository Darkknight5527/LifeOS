// Calisthenics skill tree, modelled on the WINGS skill tree and training
// guides (wingssw.com): six families, each a tree from easiest (bottom) to
// hardest (top). Text is our own summary.
// Status levels follow WINGS: locked → unlocked (1 rep / 2 s) → in progress
// (3 reps / 6 s) → mastered (6+ reps / 12+ s).

import hpush from "./families/hpush.js";
import vpush from "./families/vpush.js";
import hpull from "./families/hpull.js";
import vpull from "./families/vpull.js";
import legs from "./families/legs.js";
import core from "./families/core.js";

export const CATEGORIES = [
  { id: "hpush", label: "Horizontal push", short: "H. push", desc: "Pushing with your body parallel to the ground — push-ups through to the planche. Works the chest, shoulders and arms." },
  { id: "vpush", label: "Vertical push", short: "V. push", desc: "Pushing with your body upside down or upright — pike push-ups, handstands and handstand push-ups. Works the shoulders, triceps and upper chest." },
  { id: "hpull", label: "Horizontal pull", short: "H. pull", desc: "Pulling with your body parallel to the ground — rows through to the front lever. Works the lats, upper back and rear shoulders." },
  { id: "vpull", label: "Vertical pull", short: "V. pull", desc: "Pulling with your body hanging straight — hangs, pull-ups, muscle-ups and one-arm pull-ups. Works the lats, biceps and rear shoulders." },
  { id: "core", label: "Core / misc", short: "Core", desc: "Stability and compression — hollow holds, L-sits, flags and beyond. Works the abs, obliques and lower back." },
  { id: "legs", label: "Legs", short: "Legs", desc: "Squats and their variations plus curls. Works the quads, hamstrings, glutes and calves." },
];

export const DIFFICULTY = ["F", "E", "D", "C", "B", "A", "S"]; // easiest → hardest

export const LEVELS = [
  { id: "locked", label: "Locked", color: "#4b4b55", reps: 0, hold: 0 },
  { id: "unlocked", label: "Unlocked", color: "#f4f4f5", reps: 1, hold: 2 },
  { id: "progress", label: "In progress", color: "#c084b8", reps: 3, hold: 6 },
  { id: "mastered", label: "Mastered", color: "#c5d68f", reps: 6, hold: 12 },
];

// The skills themselves live in ./families/*.js (85 skills, matching WINGS'
// tutorial list: 20 + 15 + 15 + 15 + 10 + 10).
export const SKILLS = [...hpush, ...vpush, ...hpull, ...vpull, ...legs, ...core];

export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const childrenOf = (id) => SKILLS.filter((s) => s.pre.includes(id));
export const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;

// Status from your best set: reps for movement skills, seconds for holds.
export function levelFor(skill, best) {
  if (!best) return LEVELS[0];
  const v = skill.hold ? best.hold : best.reps;
  let lv = LEVELS[0];
  for (const L of LEVELS) if (v >= (skill.hold ? L.hold : L.reps) && (skill.hold ? L.hold : L.reps) > 0) lv = L;
  return lv;
}

// Next goal for a skill at a given level.
export function nextTarget(skill, level) {
  const i = LEVELS.findIndex((l) => l.id === level.id);
  const next = LEVELS[Math.min(LEVELS.length - 1, i + 1)];
  if (level.id === "mastered") return null;
  return skill.hold ? `${next.hold} s hold` : `${next.reps} rep${next.reps === 1 ? "" : "s"}`;
}

// Base (start of the chain) and target (hardest skill this one leads to),
// like the WINGS progressions row.
const rank = (s) => DIFFICULTY.indexOf(s.diff);
const reachCache = {};
function reach(s) {
  // Hardest difficulty reachable from s (s itself or anything after it).
  if (reachCache[s.id] != null) return reachCache[s.id];
  return (reachCache[s.id] = Math.max(rank(s), ...childrenOf(s.id).map(reach)));
}
const depthCache = {};
const depth = (s) => (depthCache[s.id] ??= 1 + Math.max(0, ...childrenOf(s.id).map(depth)));
// Next step on the main line: the child that leads furthest / hardest.
const bestChild = (s) => childrenOf(s.id).sort((a, b) => reach(b) - reach(a) || depth(b) - depth(a) || rank(a) - rank(b))[0] || null;
// Push-up / row / touch versions of a hold aren't shown as the "target skill".
const isVariant = (s) => /(Push-up|PU|Row|Touch)$/.test(s.name) && s.pre.length > 0 && s.hold === false && s.cat !== "vpull";
// Each family's headline goal (from the WINGS guides) — shown as the target
// skill whenever the current skill leads to it.
const GOAL = { hpush: "fullpl", vpush: "hspu", hpull: "fullfl", vpull: "oapullup", core: "vsit", legs: "pistol" };
const leadsTo = (from, to) => from.id !== to && childrenOf(from.id).some((c) => c.id === to || leadsTo(c, to));
export function chain(skill) {
  const reg = skill.pre[0] ? SKILL[skill.pre[0]] : null;
  let base = reg;
  while (base?.pre[0]) base = SKILL[base.pre[0]];
  const prog = bestChild(skill);
  // Walk the main line, then pick its first non-variant skill at the hardest level reached.
  const path = [];
  for (let n = prog, guard = 0; n && guard < 30; n = bestChild(n), guard++) path.push(n);
  const top = Math.max(-1, ...path.map(rank));
  const goal = GOAL[skill.cat];
  const target = leadsTo(skill, goal) ? SKILL[goal] : path.find((n) => rank(n) === top && !isVariant(n)) || path[path.length - 1] || null;
  return { base: base && base.id !== reg?.id ? base : null, reg, prog, target: target && target.id !== prog?.id ? target : null };
}

// Tree layout per category: row = longest prerequisite chain (0 = easiest),
// x = average of the prerequisites' x, then pushed apart so nodes never overlap.
export function layout(cat) {
  const list = SKILLS.filter((s) => s.cat === cat);
  const depth = {};
  const d = (s) => (depth[s.id] ??= s.pre.length ? 1 + Math.max(...s.pre.map((p) => d(SKILL[p]))) : 0);
  list.forEach(d);
  const rows = [];
  for (const s of list) (rows[depth[s.id]] ||= []).push(s);
  const x = {};
  rows.forEach((row, r) => {
    if (r === 0) {
      // Roots: spread out, ordered so that roots sharing children sit together.
      row.forEach((s, i) => (x[s.id] = i * 1.6));
      return;
    }
    const want = (s) => s.pre.reduce((a, p) => a + x[p], 0) / s.pre.length;
    row.sort((a, b) => want(a) - want(b));
    let prev = -Infinity;
    const placed = row.map((s) => {
      const v = Math.max(want(s), prev + 1);
      prev = v;
      return v;
    });
    // Re-centre the row on what it wanted.
    const shift = (row.reduce((a, s) => a + want(s), 0) - placed.reduce((a, v) => a + v, 0)) / row.length;
    row.forEach((s, i) => (x[s.id] = placed[i] + shift));
  });
  const xs = Object.values(x);
  const min = Math.min(...xs);
  for (const k in x) x[k] -= min;
  return { rows, depth, x, width: Math.max(...xs) - min + 1, height: rows.length };
}
