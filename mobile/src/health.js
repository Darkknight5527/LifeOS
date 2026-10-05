// Reads weigh-ins from Health Connect (Android's health data store). Smart
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
  { accessType: "read", recordType: "ReadHealthDataHistory" }, // older readings, not just the last 30 days
];

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
    return { status: ok ? "connected" : "not-connected", ...prefs.health };
  } catch (e) {
    return { status: "error", error: String(e?.message || e), ...prefs.health };
  }
}

/**
 * Read weigh-ins since the last sync (first time: up to a year back).
 * interactive = may show Health Connect's permission screen.
 * Returns { status, readings: [{ date, weight, bodyFat, source }] }.
 */
export async function readWeighIns({ interactive = false } = {}) {
  const st = await healthStatus();
  if (st.status === "update") {
    if (interactive) Linking.openURL("market://details?id=com.google.android.apps.healthdata").catch(() => {});
    return st;
  }
  if (st.status === "unavailable" || st.status === "error") return st;
  if (st.status === "not-connected") {
    if (!interactive) return st;
    const granted = await requestPermission(WANTED);
    if (!granted.some((p) => p.recordType === "Weight")) return { ...st, status: "not-connected" };
  }

  const prefs = readPrefs();
  const last = prefs.health?.lastSync;
  // Re-read a couple of days before the last sync in case readings arrived late.
  const since = new Date(last ? last - 2 * 86400000 : Date.now() - 365 * 86400000).toISOString();
  const [weights, fats] = await Promise.all([readAll("Weight", since), readAll("BodyFat", since).catch(() => [])]);

  // Latest reading per day.
  const byDate = {};
  for (const r of weights) {
    const date = localDate(r.time);
    const kg = r.weight?.inKilograms;
    if (!kg) continue;
    if (!byDate[date] || r.time > byDate[date].time) byDate[date] = { date, time: r.time, weight: Math.round(kg * 10) / 10, source: sourceName(r.metadata?.dataOrigin) };
  }
  for (const r of fats) {
    const date = localDate(r.time);
    if (byDate[date] && r.percentage) byDate[date].bodyFat = Math.round(r.percentage * 10) / 10;
  }
  const readings = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  const sources = [...new Set(readings.map((r) => r.source))];
  const health = { lastSync: Date.now(), lastCount: readings.length, sources: sources.length ? sources : prefs.health?.sources || [] };
  // Not remembered yet — commitSync() runs once the website confirms it saved them.
  return { status: "connected", readings, pending: health, ...prefs.health };
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
