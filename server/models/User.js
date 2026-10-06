import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  tokenVersion: { type: Number, default: 0 }, // bumped by "sign out everywhere"
  createdAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("User", UserSchema);
