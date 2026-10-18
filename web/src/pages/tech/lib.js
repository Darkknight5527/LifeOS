// Tech & Learning: statuses, starter skills, the starter learning path and
// small helpers. Nothing here is personal — you add your own projects.
import { addDays, isoDate, parseISO, todayISO } from "../finances/lib";

export { addDays, isoDate, parseISO, todayISO };

export const STATUSES = [
  { id: "building", label: "Building", color: "#4ade80" },
  { id: "planned", label: "Planned", color: "#60a5fa" },
  { id: "shipped", label: "Shipped", color: "#f2c14e" },
  { id: "paused", label: "Paused", color: "#9b9ba5" },
  { id: "idea", label: "Idea", color: "#c084fc" },
];
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.id, s]));

// The way you like to build: plan first, then code.
export const DEFAULT_STAGES = ["Architecture", "Pseudocode", "Code", "Test", "Polish & document"];

// What makes a project ready to show a recruiter.
export const SHOWCASE = [
  { id: "readme", label: "README written", hint: "What it does, why, how to run it, a picture" },
  { id: "demo", label: "Demo or photos", hint: "A short video, GIF, live link or photos" },
  { id: "bullet", label: "Resume bullet", hint: "One line with a number in it" },
  { id: "pinned", label: "Pinned on GitHub", hint: "Shows on your profile" },
];
export const showcaseScore = (p) => SHOWCASE.filter((s) => p.showcase?.[s.id]).length;

export const RESOURCE_KINDS = [
  { value: "video", label: "Video", icon: "play" },
  { value: "article", label: "Article", icon: "news" },
  { value: "pdf", label: "PDF", icon: "book" },
  { value: "course", label: "Course", icon: "list" },
  { value: "docs", label: "Docs", icon: "code" },
  { value: "other", label: "Other", icon: "external" },
];

// Skill levels in plain words.
export const LEVELS = ["Not started", "Beginner", "Basics", "Can use it", "Strong", "Expert"];

// Starter skills to pick from (you can type your own too).
export const SKILL_PRESETS = [
  { area: "Test & ATE", names: ["ATE test programs", "Digital test (scan, ATPG)", "JTAG / boundary scan", "Test data analysis (STDF, yield)", "Device characterisation"] },
  { area: "Hardware", names: ["Digital design", "Electronics fundamentals", "Verilog / SystemVerilog", "Embedded C", "PCB design", "Microcontrollers (STM32)"] },
  { area: "Verification", names: ["Silicon validation", "Design verification", "UVM", "Lab equipment (scope, analyser)"] },
  { area: "Software", names: ["Python", "C / C++", "JavaScript / React", "Node.js / Express", "Git & GitHub", "Linux & shell"] },
];
export const AREAS = [...SKILL_PRESETS.map((a) => a.area), "Other"];

// A starter learning path: semiconductor test → silicon validation → design verification.
// `skill` is matched to a skill on your map by name, when you have it.
export const STARTER_PATH = [
  ["Semiconductor test", [
    ["Test flow: wafer sort, final test, burn-in", "ATE test programs"],
    ["DC tests: continuity, leakage, IDD", "ATE test programs"],
    ["Functional & AC tests, timing and levels", "ATE test programs"],
    ["Scan chains, ATPG and fault models", "Digital test (scan, ATPG)"],
    ["JTAG and boundary scan", "JTAG / boundary scan"],
    ["Datalogs, STDF and yield analysis", "Test data analysis (STDF, yield)"],
    ["Shmoo plots and characterisation", "Device characterisation"],
  ]],
  ["Silicon validation", [
    ["Electronics refresher: op-amps, power, signal integrity", "Electronics fundamentals"],
    ["Embedded C: registers, interrupts, peripherals", "Embedded C"],
    ["Bring-up on a microcontroller board", "Microcontrollers (STM32)"],
    ["Lab automation with Python (instruments over SCPI)", "Python"],
    ["Using a scope and logic analyser to debug", "Lab equipment (scope, analyser)"],
    ["Validation plans and bug reports", "Silicon validation"],
  ]],
  ["Design verification", [
    ["Verilog: combinational and sequential logic", "Verilog / SystemVerilog"],
    ["FSMs and testbenches", "Verilog / SystemVerilog"],
    ["SystemVerilog: classes, constraints, assertions", "Verilog / SystemVerilog"],
    ["Coverage-driven verification", "Design verification"],
    ["UVM basics: agents, sequences, scoreboards", "UVM"],
  ]],
];

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const prettyDate = (iso, opts = { weekday: "short", day: "numeric", month: "short" }) => parseISO(iso).toLocaleDateString("en-IN", opts);
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
export const hours = (min) => (min >= 60 ? `${Math.round((min / 60) * 10) / 10} h` : `${Math.round(min)} min`);
export const mondayOf = (iso = todayISO()) => {
  const d = parseISO(iso);
  return isoDate(addDays(d, -((d.getDay() + 6) % 7)));
};

/** A gap is a skill at least two levels below where you want it. */
export const isGap = (s) => (s.target || 0) - (s.level || 0) >= 2;

/** Make a URL safe to open (adds https:// if it's missing). */
export function safeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  const url = /^[a-z]+:\/\//i.test(s) ? s : `https://${s}`;
  return /^https?:\/\//i.test(url) ? url : "";
}
