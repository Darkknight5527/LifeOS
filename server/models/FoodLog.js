import mongoose from "mongoose";

// One per day: everything eaten (by meal) and water drunk.
const EntrySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    meal: { type: String, default: "breakfast" }, // breakfast | lunch | snacks | dinner
    name: { type: String, required: true },
    qty: { type: Number, default: 1 }, // number of servings
    unit: { type: String, default: "" }, // e.g. "1 roti"
    cal: { type: Number, default: 0 }, // totals for qty
    p: { type: Number, default: 0 },
    c: { type: Number, default: 0 },
    f: { type: Number, default: 0 },
  },
  { _id: false }
);

const FoodLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  entries: { type: [EntrySchema], default: [] },
  water: { type: Number, default: 0 }, // ml
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.model("FoodLog", FoodLogSchema, "food_logs");
