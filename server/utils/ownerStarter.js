// One-time setup for the owner's Tech & Learning: adds his current projects
// and the skills they use. Runs on server start, only for the owner account,
// each batch only once (a version number in his settings), and never replaces anything he has
// already entered — it adds what's missing by name and links skills to a
// project only if that project has none yet. Friends' accounts are untouched.
import User from "../models/User.js";
import TechSettings from "../models/TechSettings.js";
import TechSkill from "../models/TechSkill.js";
import TechProject from "../models/TechProject.js";

// [name, area, level, target] — levels are a starting guess; edit them on the skill map.
const SKILLS = [
  ["ATE test programs", "Test & ATE", 3, 4],
  ["Test data analysis (STDF, yield)", "Test & ATE", 2, 4],
  ["Python", "Software", 2, 4],
  ["Git & GitHub", "Software", 3, 4],
  ["JavaScript / React", "Software", 3, 4],
  ["Node.js / Express", "Software", 3, 4],
  ["Microcontrollers (STM32)", "Hardware", 3, 4],
  ["Embedded C", "Hardware", 1, 4],
  ["PCB design", "Hardware", 3, 4],
  ["Electronics fundamentals", "Hardware", 2, 4],
];

const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const stages = (list, doneCount = 0) => list.map((title, i) => ({ id: id(), title, done: i < doneCount }));

const PROJECTS = [
  {
    name: "ATE log parser",
    summary: "Python tool that reads ATE test datalogs, finds failing tests and limit issues, and writes a report.",
    status: "planned",
    stages: stages(["Architecture", "Pseudocode", "Parser: read datalogs", "Analyser: pass/fail, limits, failing tests", "Reporter", "Charts", "Outlier detection", "Test-time optimisation", "README & demo"]),
    skills: ["Python", "Test data analysis (STDF, yield)", "ATE test programs", "Git & GitHub"],
  },
  {
    name: "VX-01",
    summary: "Autonomous hexapod-drone robot. Final-year project I co-led, published in IJSDR (March 2026).",
    status: "shipped",
    repo: "github.com/Darkknight5527/VX-01-Autonomous-Robot",
    stages: [],
    skills: ["Microcontrollers (STM32)", "Embedded C", "PCB design", "Electronics fundamentals"],
    showcase: { readme: true, pinned: true },
  },
  {
    name: "LifeOS",
    summary: "My self-development app: web app plus Android app (React, Node/Express, MongoDB), shared with a few friends.",
    status: "building",
    repo: "github.com/Darkknight5527/LifeOS",
    live: "lifeos-web-qjrj.onrender.com",
    stages: stages(["Core domains (Finances, Mind, Grooming, Fitness, Paper)", "Tech & Learning", "Goals", "Polish & document"], 1),
    skills: ["JavaScript / React", "Node.js / Express", "Git & GitHub"],
  },
];

// Batch 2 (Oct 2026): the DDC drone and a placeholder for the embedded project.
const SKILLS_2 = [["Drones / UAV (ArduPilot, Betaflight)", "Hardware", 3, 4]];
const PROJECTS_2 = [
  {
    name: "DDC drone design 2025",
    summary: "Drone designed and built for the DDC 2025 drone design challenge. Completed.",
    status: "shipped",
    stages: [],
    skills: ["Drones / UAV (ArduPilot, Betaflight)", "Electronics fundamentals", "PCB design"],
  },
  { name: "Embedded project", summary: "To plan — details to come.", status: "idea", stages: [], skills: [] },
];
const LATEST = 2;

async function addMissing(userId, SKILLS, PROJECTS) {
  const now = Date.now();
  const skills = await TechSkill.find({ userId });
  const skillId = Object.fromEntries(skills.map((s) => [s.name.toLowerCase(), String(s._id)]));
  let order = skills.length;
  let addedSkills = 0;
  for (const [name, area, level, target] of SKILLS) {
    if (skillId[name.toLowerCase()]) continue;
    const s = await TechSkill.create({ userId, name, area, level, target, order: order++, createdAt: now, updatedAt: now });
    skillId[name.toLowerCase()] = String(s._id);
    addedSkills++;
  }

  const projects = await TechProject.find({ userId });
  let addedProjects = 0;
  let linked = 0;
  for (const p of PROJECTS) {
    const ids = p.skills.map((n) => skillId[n.toLowerCase()]).filter(Boolean);
    const have = projects.find((x) => x.name.trim().toLowerCase() === p.name.toLowerCase());
    if (have) {
      // Already entered by hand: only fill in what's empty.
      const fill = {};
      if (!have.skills?.length) fill.skills = ids;
      if (!have.summary) fill.summary = p.summary;
      if (!have.repo && p.repo) fill.repo = p.repo;
      if (!have.live && p.live) fill.live = p.live;
      if (!have.stages?.length && p.stages.length) fill.stages = p.stages;
      if (Object.keys(fill).length) {
        await TechProject.updateOne({ userId, _id: have._id }, { $set: { ...fill, updatedAt: now } });
        linked++;
      }
      continue;
    }
    await TechProject.create({ userId, name: p.name, summary: p.summary, status: p.status, repo: p.repo || "", live: p.live || "", stages: p.stages, skills: ids, showcase: p.showcase || {}, createdAt: now, updatedAt: now });
    addedProjects++;
  }

  return { addedSkills, addedProjects, linked };
}

export async function addOwnerStarter({ log = console.log } = {}) {
  const owner = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  if (!owner) return;
  const userId = owner._id;
  const settings = await TechSettings.findOne({ userId }).sort({ updatedAt: -1 });
  const done = settings?.starterVersion || (settings?.starterAdded ? 1 : 0);
  if (done >= LATEST) return;
  const r = { addedSkills: 0, addedProjects: 0, linked: 0 };
  const add = (x) => Object.keys(r).forEach((k) => (r[k] += x[k]));
  if (done < 1) add(await addMissing(userId, SKILLS, PROJECTS));
  if (done < 2) add(await addMissing(userId, SKILLS_2, PROJECTS_2));
  const now = Date.now();

  if (settings) await TechSettings.updateOne({ userId, _id: settings._id }, { $set: { starterAdded: true, starterVersion: LATEST, githubUser: settings.githubUser || "Darkknight5527", updatedAt: now } });
  else await TechSettings.create({ userId, starterAdded: true, starterVersion: LATEST, githubUser: "Darkknight5527", createdAt: now, updatedAt: now });
  log(`[starter] Tech & Learning for ${owner.email} (batches ${done + 1}–${LATEST}): ${r.addedSkills} skills, ${r.addedProjects} projects added, ${r.linked} filled in`);
}
