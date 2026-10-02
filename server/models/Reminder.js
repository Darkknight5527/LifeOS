import mongoose from "mongoose";

// A LifeOS reminder that shows in the Morning Paper agenda.
const ReminderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  domain: { type: String, default: "general" }, // finances, grooming, fitness, ...
  date: { type: String, required: true }, // YYYY-MM-DD (first occurrence)
  time: { type: String, default: "" }, // "HH:MM" local, or "" for all day
  repeat: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
  until: { type: String, default: "" }, // optional last date for repeats
  notes: { type: String, default: "" },
  doneDates: { type: [String], default: [] }, // occurrences ticked off
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("Reminder", ReminderSchema, "reminders");
