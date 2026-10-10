// End-to-end test: two accounts can never see or change each other's data.
// Needs a MongoDB (or FerretDB) on 127.0.0.1:27017 — a throwaway database is
// created for the run. Run from the server folder:
//   node test/isolation.test.mjs
// It seeds an old single-user database, starts the real server (which
// migrates it), then checks every data route as the owner and as a friend.
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const SERVER = path.resolve(import.meta.dirname, "..");
const DB = process.env.TEST_MONGO_URI || `mongodb://127.0.0.1:27017/lifeos_test_${Date.now()}`;
const PORT = 4287;
const API = `http://127.0.0.1:${PORT}/api`;

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.log("  ✗ FAIL:", msg);
  }
};

// ---------- 1. a legacy single-user database ----------
await mongoose.connect(DB);
const db = mongoose.connection.db;
const legacyUser = await db.collection("users").insertOne({ email: "akhil@x.com", passwordHash: await bcrypt.hash("owner-password-1", 4), tokenVersion: 0, createdAt: 1 });
await db.collection("finance_transactions").insertMany([
  { amount: 500, date: "2026-10-01", bucket: "needs", note: "rent share", createdAt: 1 },
  { amount: 120, date: "2026-10-02", bucket: "wants", note: "coffee", createdAt: 2 },
]);
await db.collection("reminders").insertOne({ title: "Owner reminder", date: "2026-10-01", repeat: "none", doneDates: [], createdAt: 1 });
await db.collection("skin_logs").insertOne({ date: "2026-10-01", condition: "4", createdAt: 1 });
const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "books" });
await new Promise((r, j) => bucket.openUploadStream("owner-book.pdf", { metadata: { key: "owner-book" }, contentType: "application/pdf" }).on("finish", r).on("error", j).end(Buffer.from("%PDF-1.4 owner")));
await mongoose.disconnect();

// ---------- fake Gemini ----------
const good = { photoQuality: { usable: true, issues: "" }, scores: { acne: 2, marks: 2, redness: 2, oiliness: 2, dryness: 2, darkCircles: 2, texture: 2, unevenTone: 2 }, overall: 77, headline: "ok", summary: "ok", changes: "", areas: [], tips: [], seeDermatologist: false };
const gem = http.createServer((req, res) => {
  req.resume();
  req.on("end", () => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(good) }] } }] }));
  });
}).listen(4288);

// ---------- 2. start the real server ----------
const logs = [];
const srv = spawn("node", ["index.js"], {
  cwd: SERVER,
  env: { ...process.env, MONGO_URI: DB, JWT_SECRET: "test-secret-0123456789", PORT: String(PORT), CLIENT_ORIGIN: "http://localhost", GEMINI_API_KEY: "fake", GEMINI_API_URL: "http://127.0.0.1:4288/models", CALENDAR_ICS_URL: "" },
});
srv.stdout.on("data", (d) => logs.push(String(d)));
srv.stderr.on("data", (d) => logs.push(String(d)));
for (let i = 0; i < 60 && !logs.join("").includes("listening"); i++) await new Promise((r) => setTimeout(r, 250));
console.log(logs.join("").trim().split("\n").map((l) => "  server: " + l).join("\n"));
ok(logs.join("").includes("is now the owner"), "oldest account became owner");
ok(logs.join("").includes("gave existing data"), "legacy data handed to owner");

const call = async (method, p, token, body) => {
  const r = await fetch(API + p, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try {
    data = await r.json();
  } catch {
    /* empty */
  }
  return { status: r.status, data };
};

try {
  // ---------- 3. owner ----------
  const login = await call("POST", "/auth/login", null, { email: "akhil@x.com", password: "owner-password-1" });
  ok(login.status === 200 && login.data.user.role === "admin", "owner logs in as admin");
  const OWNER = login.data.token;
  const me = await call("GET", "/auth/me", OWNER);
  ok(me.data.role === "admin", "/me says admin");
  const ownerTx = await call("GET", "/finance-transactions", OWNER);
  ok(ownerTx.data.length === 2, `owner sees legacy transactions (${ownerTx.data.length})`);

  // ---------- 4. sign-up needs an invite ----------
  let r = await call("POST", "/auth/register", null, { email: "rahul@x.com", password: "friend-password-1", name: "Rahul" });
  ok(r.status === 403, "sign-up without a code is refused");
  r = await call("POST", "/auth/register", null, { email: "rahul@x.com", password: "friend-password-1", name: "Rahul", code: "AAAA-BBBB" });
  ok(r.status === 403, "made-up code is refused");
  const inv = await call("POST", "/admin/invites", OWNER, { note: "Rahul" });
  ok(inv.status === 201 && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(inv.data.code), `owner makes an invite (${inv.data?.code})`);
  r = await call("POST", "/auth/register", null, { email: "rahul@x.com", password: "friend-password-1", name: "Rahul", code: inv.data.code.toLowerCase() });
  ok(r.status === 201 && r.data.user.role === "user", "friend signs up with the code (any case)");
  let FRIEND = r.data.token;
  const friendId = r.data.user.id;
  r = await call("POST", "/auth/register", null, { email: "other@x.com", password: "friend-password-1", code: inv.data.code });
  ok(r.status === 403, "a used code can't be used again");

  // ---------- 5. every collection is private ----------
  const idx = fs.readFileSync(path.join(SERVER, "routes/index.js"), "utf8");
  const crud = [...idx.matchAll(/router\.use\("\/([\w-]+)", createCrudRouter\((\w+)/g)].map((m) => ({ ep: m[1], model: m[2] }));
  await mongoose.connect(DB);
  await import(path.join(SERVER, "routes/index.js")); // registers every model
  const sample = (modelName) => {
    const M = mongoose.model(modelName);
    const doc = {};
    M.schema.eachPath((p, t) => {
      if (p.includes(".") || ["_id", "__v", "userId"].includes(p) || !t.isRequired) return;
      const ev = t.enumValues?.length ? t.enumValues[0] : null;
      doc[p] = ev ?? (t.instance === "Number" ? 1 : t.instance === "Boolean" ? true : t.instance === "Array" ? [] : p === "date" ? "2026-10-05" : p === "month" ? "2026-10" : "x");
    });
    return doc;
  };
  const ownerIds = {};
  for (const { ep, model } of crud) {
    const body = sample(model);
    const a = await call("POST", `/${ep}`, OWNER, body);
    const b = await call("POST", `/${ep}`, FRIEND, { ...body, userId: login.data.user.id }); // tries to write into the owner's account
    if (a.status !== 201 || b.status !== 201) {
      ok(false, `${ep}: create failed (${a.status}/${b.status}) ${JSON.stringify(a.data || b.data)}`);
      continue;
    }
    ownerIds[ep] = a.data._id;
    const fl = await call("GET", `/${ep}`, FRIEND);
    const ol = await call("GET", `/${ep}`, OWNER);
    ok(fl.data.every((d) => String(d.userId) === friendId) && fl.data.some((d) => d._id === b.data._id) && !fl.data.some((d) => d._id === a.data._id), `${ep}: friend sees only their own`);
    ok(!ol.data.some((d) => d._id === b.data._id), `${ep}: owner doesn't see friend's (even with spoofed userId)`);
    ok((await call("GET", `/${ep}/${a.data._id}`, FRIEND)).status === 404, `${ep}: friend can't read owner's by id`);
    ok((await call("PATCH", `/${ep}/${a.data._id}`, FRIEND, { note: "hacked" })).status === 404, `${ep}: friend can't edit owner's`);
    ok((await call("DELETE", `/${ep}/${a.data._id}`, FRIEND)).status === 404, `${ep}: friend can't delete owner's`);
    ok((await call("GET", `/${ep}/${a.data._id}`, OWNER)).status === 200, `${ep}: owner's doc still there`);
    const bulk = await call("POST", `/${ep}/bulk`, FRIEND, { items: [{ ...body, userId: login.data.user.id }] });
    ok(bulk.status === 201 && String(bulk.data[0].userId) === friendId, `${ep}: bulk import lands in friend's account`);
  }
  console.log(`  checked ${crud.length} collections`);

  // ---------- 6. finances: backup / reset / restore points ----------
  const fb = await call("GET", "/finance/backup", FRIEND);
  ok(!fb.data.data.transactions.some((t) => t.note === "rent share"), "friend's finance backup has none of owner's data");
  const reset = await call("POST", "/finance/reset", FRIEND, { password: "friend-password-1" });
  ok(reset.status === 200, "friend resets their finances");
  ok((await call("GET", "/finance-transactions", OWNER)).data.length >= 2, "owner's finances untouched by friend's reset");
  await call("POST", "/finance/reset", OWNER, { password: "owner-password-1" }); // owner gets a restore point
  const osnaps = await call("GET", "/finance/snapshots", OWNER);
  const fsnaps = await call("GET", "/finance/snapshots", FRIEND);
  ok(osnaps.data.length >= 1 && !fsnaps.data.some((s) => osnaps.data.some((o) => o._id === s._id)), "restore points are separate");
  ok((await call("POST", `/finance/snapshots/${osnaps.data[0]._id}/restore`, FRIEND, { password: "friend-password-1" })).status === 404, "friend can't restore owner's restore point");
  const rr = await call("POST", `/finance/snapshots/${osnaps.data[0]._id}/restore`, OWNER, { password: "owner-password-1" });
  ok(rr.status === 200, "owner restores own restore point");
  ok((await call("GET", "/finance-transactions", OWNER)).data.some((t) => t.note === "rent share"), "owner's data back after restore");
  const restoreOther = await call("POST", "/finance/restore", FRIEND, { password: "friend-password-1", backup: { app: "LifeOS", section: "finances", data: { categories: [{ name: "Imported", bucket: "needs", userId: login.data.user.id }] } } });
  ok(restoreOther.status === 200 || restoreOther.status === 400, `friend restore runs (${restoreOther.status} ${JSON.stringify(restoreOther.data).slice(0, 80)})`);

  // ---------- 7. books ----------
  ok((await call("GET", "/books", OWNER)).data.some((b) => b.key === "owner-book"), "owner still has their uploaded book");
  ok((await call("GET", "/books", FRIEND)).data.length === 0, "friend sees no books");
  ok((await fetch(`${API}/books/owner-book`, { headers: { Authorization: `Bearer ${FRIEND}` } })).status === 404, "friend can't download owner's book");

  // ---------- 8. calendar + admin are owner-only ----------
  const cal = await call("GET", `/paper/calendar?from=2026-10-01T00:00:00Z&to=2026-10-03T00:00:00Z&days=2026-10-01`, FRIEND);
  ok(cal.data.ownerOnly === true && cal.data.events.length === 0, "friend gets no calendar");
  ok((await call("GET", "/admin/users", FRIEND)).status === 403, "friend can't open admin");
  ok((await call("POST", "/admin/invites", FRIEND, {})).status === 403, "friend can't make invites");
  const users = await call("GET", "/admin/users", OWNER);
  ok(users.data.length === 2 && !JSON.stringify(users.data).includes("passwordHash"), "owner lists users (no password hashes)");

  // ---------- 9. AI skin check: 1/day for friends ----------
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString("base64");
  const s1 = await call("POST", "/skin-scans", FRIEND, { date: "2026-10-10", photos: [{ angle: "front", data: jpeg }] });
  ok(s1.status === 201 && s1.data.status === "done", `friend's first check of the day works (${s1.status} ${s1.data?.status} ${s1.data?.error || ""})`);
  const s2 = await call("POST", "/skin-scans", FRIEND, { date: "2026-10-10", photos: [{ angle: "front", data: jpeg }] });
  ok(s2.status === 429, "friend's second check the same day is refused");
  ok((await call("GET", "/skin-scans/allowance", FRIEND)).data.ok === false, "allowance says none left");
  ok((await call("POST", `/skin-scans/${s1.data._id}/analyze`, FRIEND)).status === 400, "friend can't re-run a finished check");
  const o1 = await call("POST", "/skin-scans", OWNER, { date: "2026-10-10", photos: [{ angle: "front", data: jpeg }] });
  const o2 = await call("POST", "/skin-scans", OWNER, { date: "2026-10-10", photos: [{ angle: "front", data: jpeg }] });
  ok(o1.status === 201 && o2.status === 201, "owner isn't limited");
  ok(!(await call("GET", "/skin-scans", FRIEND)).data.some((s) => s._id === o2.data._id), "friend can't see owner's checks");
  ok((await fetch(`${API}/skin-scans/${o2.data._id}/photo/front`, { headers: { Authorization: `Bearer ${FRIEND}` } })).status === 404, "friend can't load owner's face photo");
  ok((await fetch(`${API}/skin-scans/${o2.data._id}/photo/front`, { headers: { Authorization: `Bearer ${OWNER}` } })).status === 200, "owner loads own photo");

  // ---------- 10. passwords ----------
  const rp = await call("POST", `/admin/users/${friendId}/reset-password`, OWNER);
  ok(rp.status === 200 && rp.data.password.length >= 12, "owner makes a temporary password");
  await new Promise((r) => setTimeout(r, 50));
  ok((await call("GET", "/auth/me", FRIEND)).status === 401, "friend's old sessions are signed out");
  const relog = await call("POST", "/auth/login", null, { email: "rahul@x.com", password: rp.data.password });
  ok(relog.status === 200, "friend logs in with the temporary password");
  FRIEND = relog.data.token;
  const cp = await call("POST", "/auth/password", FRIEND, { current: rp.data.password, password: "my-new-password-9" });
  ok(cp.status === 200, "friend changes their password");
  FRIEND = cp.data.token;
  ok((await call("PATCH", "/auth/me", FRIEND, { name: "Rahul K" })).data.name === "Rahul K", "friend renames themselves");

  // ---------- 11. removing an account ----------
  ok((await call("DELETE", `/admin/users/${friendId}`, OWNER, { confirm: "wrong@x.com" })).status === 400, "remove needs their email typed");
  const del = await call("DELETE", `/admin/users/${friendId}`, OWNER, { confirm: "rahul@x.com" });
  ok(del.status === 200 && Object.keys(del.data.removed).length > 5, `friend removed with their data (${Object.keys(del.data.removed || {}).length} kinds)`);
  ok((await call("GET", "/auth/me", FRIEND)).status === 401, "removed friend is logged out");
  const left = {};
  for (const M of mongoose.modelNames().map((n) => mongoose.model(n)).filter((M) => M.schema.path("userId") && M.modelName !== "Invite")) {
    left[M.modelName] = await M.countDocuments({ userId: new mongoose.Types.ObjectId(friendId) });
  }
  ok(Object.values(left).every((n) => n === 0), `no friend data left ${JSON.stringify(left)}`);
  for (const ep of Object.keys(ownerIds)) ok((await call("GET", `/${ep}/${ownerIds[ep]}`, OWNER)).status === 200, `${ep}: owner's data survives removal`);

  // ---------- 12. the safety net ----------
  let threw = false;
  try {
    await mongoose.model("Reminder").find({});
  } catch (e) {
    threw = e.name === "OwnerMissingError";
  }
  ok(threw, "a query without an owner is refused");
} finally {
  await mongoose.disconnect().catch(() => {});
  srv.kill();
  gem.close();
}
const errs = logs.join("").split("\n").filter((l) => /error|refused/i.test(l));
if (errs.length) console.log("  server errors:\n   " + errs.slice(0, 10).join("\n   "));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
