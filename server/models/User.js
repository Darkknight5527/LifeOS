import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: "", trim: true, maxlength: 60 },
  // "admin" = the owner (Akhil): North Star, Google Calendar, manage friends.
  role: { type: String, enum: ["admin", "user"], default: "user" },
  passwordHash: { type: String, required: true },
  tokenVersion: { type: Number, default: 0 }, // bumped by "sign out everywhere"
  // AI skin checks used today (friends get one a day).
  aiDay: { type: String, default: "" },
  aiCount: { type: Number, default: 0 },
  lastSeenAt: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("User", UserSchema);
