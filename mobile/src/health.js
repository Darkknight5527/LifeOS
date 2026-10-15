// Reads weigh-ins (weight plus whatever body readings the scale shares:
// body fat, fat-free mass, bone, body water, BMR, heart rate) from Health Connect (Android's health data store). Smart
// scale apps like FitDays reach it through Google Fit or Samsung Health; LifeOS
// then picks the readings up from there. Only reads — never writes.
import {
  SdkAvailabilityStatus,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
} from "react-native-health-connect";
import { Linking } from "react-native";
import { readPrefs, writePrefs } from "./prefs";

const WANTED = [
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "BodyFat" },
  { accessType: "read", recordType: "LeanBodyMass" },
  { accessType: "read", recordType: "BoneMass" },
  { accessType: "read", recordType: "BodyWaterMass" },
  { accessType: "read", recordType: "BasalMetabolicRate" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "RestingHeartRate" },
  { accessType: "read", recordType: "ReadHealthDataHistory" }, // older readings, not just the last 30 days
];
// Bumped when new kinds of reading are added, so the next sync re-reads the past year once.
const FIELDS_VERSION = 2;

const pad = (n) => String(n).padStart(2, "0");
const localDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Friendly names for where readings came from.
const SOURCES = {
  "com.google.android.apps.fitness": "Google Fit",
  "com.sec.android.app.shealth": "Samsung Health",
  "com.fitbit.FitbitMobile": "Fitbit",
  "cn.fitdays.fitdays": "FitDays",
  "com.google.android.apps.healthdata": "Health Connect",
};
const sourceName = (pkg) => SOURCES[pkg] || (/fitdays/i.test(pkg || "") ? "FitDays" : pkg || "another app");

async function readAll(type, startTime) {
  const out = [];
  let pageToken;
  for (let i = 0; i < 20; i++) {
    const res = await readRecords(type, { timeRangeFilter: { operator: "after", startTime }, pageSize: 1000, pageToken });
    out.push(...(res.records || []));
    pageToken = res.pageToken;
    if (!pageToken) break;
  }
  return out;
}

export async function healthStatus() {
  const prefs = readPrefs();
  try {
    const sdk = await getSdkStatus();
    if (sdk !== SdkAvailabilityStatus.SDK_AVAILABLE) return { status: sdk === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ? "update" : "unavailable", ...prefs.health };
    await initialize();
    const granted = await getGrantedPermissions();
    const ok = granted.some((p) => p.recordType === "Weight");
    // Readings added in a newer app version that haven't been allowed yet.
    const missing = WANTED.filter((w) => w.recordType !== "ReadHealthDataHistory" && !granted.some((p) => p.recordType === w.recordType)).map((w) => w.recordType);
    return { status: ok ? "connected" : "not-connected", missing, ...prefs.health };
  } catch (e) {
    return { status: "error", error: String(e?.message || e), ...prefs.health };
  }
}

/**
 * Read weigh-ins since the last sync (first time: up to a year back).
 * interactive = may show Health Connect's permission screen.
 * Returns { status, readings: [{ date, weight, bodyFat?, leanMass?, boneMass?, waterMass?, bmr?, heartRate?, source }] }.
 */
export async function readWeighIns({ interactive = false } = {}) {
  const st = await healthStatus();
  if (st.status === "update") {
    if (interactive) Linking.openURL("market://details?id=com.google.android.apps.healthdata").catch(() => {});
    return st;
  }
  if (st.status === "unavailable" || st.status === "error") return st;
  if (st.status === "not-connected" || (interactive && st.missing?.length)) {
    if (!interactive) return st;
    const granted = await requestPermission(WANTED);
    if (!granted.some((p) => p.recordType === "Weight")) return { ...st, status: "not-connected" };
  }

  const prefs = readPrefs();
  // Re-read a couple of days before the last sync in case readings arrived late
  // (or the past year, the first time / after new kinds of reading were added).
  const last = (prefs.health?.fields || 1) >= FIELDS_VERSION ? prefs.health?.lastSync : null;
  const since = new Date(last ? last - 2 * 86400000 : Date.now() - 365 * 86400000).toISOString();
  const opt = (type) => readAll(type, since).catch(() => []); // not allowed / none: skip quietly
  const [weights, fats, lean, bone, water, bmr, hr, rhr] = await Promise.all([
    readAll("Weight", since),
    opt("BodyFat"),
    opt("LeanBodyMass"),
    opt("BoneMass"),
    opt("BodyWaterMass"),
    opt("BasalMetabolicRate"),
    opt("HeartRate"),
    opt("RestingHeartRate"),
  ]);

  // Latest reading per day.
  const byDate = {};
  for (const r of weights) {
    const date = localDate(r.time);
    const kg = r.weight?.inKilograms;
    if (!kg) continue;
    if (!byDate[date] || r.time > byDate[date].time) byDate[date] = { date, time: r.time, weight: Math.round(kg * 10) / 10, source: sourceName(r.metadata?.dataOrigin) };
  }
  // Other readings belong to the weigh-in they were taken with: same day, and
  // the one closest in time (scales write them all at once).
  const r1 = (n) => Math.round(n * 10) / 10;
  const attach = (records, key, value, maxGapMin = 24 * 60) => {
    for (const r of records) {
      const time = r.time || r.startTime;
      const date = localDate(time);
      const w = byDate[date];
      const v = value(r);
      if (!w || !(v > 0)) continue;
      const gap = Math.abs(new Date(time) - new Date(w.time)) / 60000;
      if (gap > maxGapMin || (w[`${key}Gap`] != null && w[`${key}Gap`] <= gap)) continue;
      w[key] = v;
      w[`${key}Gap`] = gap;
    }
  };
  attach(fats, "bodyFat", (r) => r1(r.percentage));
  attach(lean, "leanMass", (r) => r1(r.mass?.inKilograms));
  attach(bone, "boneMass", (r) => r1(r.mass?.inKilograms));
  attach(water, "waterMass", (r) => r1(r.mass?.inKilograms));
  attach(bmr, "bmr", (r) => Math.round(r.basalMetabolicRate?.inKilocaloriesPerDay));
  // Heart rate only when it was measured by the scale, i.e. within 10 min of the weigh-in.
  attach(hr.map((r) => ({ time: r.samples?.[0]?.time || r.startTime, bpm: r.samples?.[0]?.beatsPerMinute })), "heartRate", (r) => Math.round(r.bpm), 10);
  attach(rhr, "heartRate", (r) => Math.round(r.beatsPerMinute), 10);
  for (const w of Object.values(byDate)) for (const k of Object.keys(w)) if (k.endsWith("Gap")) delete w[k];
  const readings = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  const sources = [...new Set(readings.map((r) => r.source))];
  const health = { lastSync: Date.now(), lastCount: readings.length, fields: FIELDS_VERSION, sources: sources.length ? sources : prefs.health?.sources || [] };
  // Not remembered yet — commitSync() runs once the website confirms it saved them.
  const now = await healthStatus().catch(() => ({}));
  return { status: "connected", readings, pending: health, ...prefs.health, missing: now.missing || [] };
}

export function commitSync(health) {
  if (health) writePrefs({ health });
}

export function openHealthSettings() {
  try {
    openHealthConnectSettings();
  } catch {
    Linking.openSettings();
  }
}
