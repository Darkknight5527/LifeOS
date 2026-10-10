import mongoose from "mongoose";

// A one-time sign-up code the owner makes for a friend.
const InviteSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  note: { type: String, default: "", maxlength: 60 }, // who it's for, e.g. "Rahul"
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  usedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  usedAt: { type: Number, default: 0 },
  expiresAt: { type: Number, required: true },
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("Invite", InviteSchema, "invites");
