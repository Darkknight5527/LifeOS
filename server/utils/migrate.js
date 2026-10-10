// Start-up migration from single-user to multi-user LifeOS.
// Safe to run on every start: it only touches things that still need it.
//   1. If nobody is the owner yet, the oldest account becomes the owner (admin).
//   2. Every saved item without an owner is given to the owner.
//   3. Uploaded books without an owner are given to the owner.
import mongoose from "mongoose";
import User from "../models/User.js";

/** Every model whose documents belong to an account. */
export function ownedModels() {
  return mongoose
    .modelNames()
    .map((n) => mongoose.model(n))
    .filter((M) => M.schema.path("userId") && M.modelName !== "Invite");
}

export async function migrateToMultiUser({ log = console.log } = {}) {
  let owner = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  if (!owner) {
    owner = await User.findOne({}).sort({ createdAt: 1, _id: 1 });
    if (!owner) return { owner: null, moved: {} }; // fresh install: first sign-up becomes the owner
    owner.role = "admin";
    await owner.save();
    log(`[migrate] ${owner.email} is now the owner (admin)`);
  }
  // Older accounts created before roles existed.
  await User.updateMany({ role: { $exists: false } }, { $set: { role: "user" } });

  const moved = {};
  for (const Model of ownedModels()) {
    const r = await Model.updateMany({ userId: null }, { $set: { userId: owner._id } }).setOptions({ allUsers: true });
    if (r.modifiedCount) moved[Model.modelName] = r.modifiedCount;
  }
  const books = await mongoose.connection.db
    .collection("books.files")
    .updateMany({ $or: [{ "metadata.userId": { $exists: false } }, { "metadata.userId": null }] }, { $set: { "metadata.userId": String(owner._id) } });
  if (books.modifiedCount) moved.books = books.modifiedCount;
  if (Object.keys(moved).length) log(`[migrate] gave existing data to ${owner.email}: ${JSON.stringify(moved)}`);
  return { owner, moved };
}
