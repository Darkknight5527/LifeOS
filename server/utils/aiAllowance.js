// Daily AI allowances for friends (the owner isn't limited). Each kind of AI
// feature has its own counter on the User, reset each day (India time). A
// failed AI call doesn't count, so "Try again" always works.
import User from "../models/User.js";

export const KINDS = {
  skin: { day: "aiDay", count: "aiCount", limit: 1 },
  meal: { day: "mealAiDay", count: "mealAiCount", limit: 3 },
};
export const istDay = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

export async function aiAllowance(userId, kind) {
  const k = KINDS[kind];
  const u = await User.findById(userId).select(`role ${k.day} ${k.count}`).lean();
  if (!u) return { ok: false };
  if (u.role === "admin") return { ok: true, unlimited: true };
  const used = u[k.day] === istDay() ? u[k.count] || 0 : 0;
  return { ok: used < k.limit, used, limit: k.limit };
}

export async function countAiUse(userId, kind) {
  const k = KINDS[kind];
  const day = istDay();
  const u = await User.findById(userId).select(`${k.day} ${k.count}`);
  if (!u) return;
  if (u[k.day] !== day) {
    u[k.day] = day;
    u[k.count] = 0;
  }
  u[k.count] += 1;
  await u.save();
}
