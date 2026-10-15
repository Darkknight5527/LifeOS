// Meal photo → rough calories and macros, with Gemini. The photo is only
// sent to the AI for this estimate; it is never saved.
import { geminiJSON } from "./gemini.js";

const num = (description) => ({ type: "NUMBER", description });
const SCHEMA = {
  type: "OBJECT",
  properties: {
    isFood: { type: "BOOLEAN", description: "False if the photo doesn't show food or drink." },
    photoQuality: { type: "STRING", description: "Short note if the photo is too dark, blurry or cut off to judge portions. Empty if fine." },
    items: {
      type: "ARRAY",
      description: "Each separate food or drink visible, one entry each (e.g. rice, dal, chapati, curry, salad, curd).",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "Plain everyday name, e.g. 'Chapati', 'Chicken curry', 'Steamed rice'." },
          portion: { type: "STRING", description: "Visible amount in household terms, e.g. '2 medium', '1 katori (150 g)', '1 cup cooked'." },
          grams: num("Estimated weight in grams for the whole portion"),
          cal: num("kcal for the whole portion, including visible oil/ghee/butter"),
          p: num("Protein in grams for the whole portion"),
          c: num("Carbohydrate in grams for the whole portion"),
          f: num("Fat in grams for the whole portion"),
        },
        required: ["name", "portion", "grams", "cal", "p", "c", "f"],
      },
    },
    confidence: { type: "STRING", enum: ["low", "medium", "high"], description: "How sure you are about the portions overall." },
    notes: { type: "STRING", description: "One or two short plain sentences: what was hard to judge (hidden oil, plate size, mixed dish) and anything to double-check. Empty if nothing." },
  },
  required: ["isFood", "photoQuality", "items", "confidence", "notes"],
};

function prompt(hint) {
  const lines = [
    "You estimate the calories and macros of a meal from one photo, for someone tracking food to lose fat. They are in India and mostly eat Indian home, canteen and restaurant food.",
    "Rules:",
    "- List every separate food or drink you can see as its own item. Don't merge rice and curry into one item.",
    "- Judge portions from visual cues: a dinner plate is about 25–27 cm, a steel katori holds about 150 ml, a chapati is about 15–18 cm, a teaspoon is about 5 ml.",
    "- Indian cooking often uses a lot of oil or ghee. Include it in the item's calories and fat when the food looks glossy, fried or has an oil layer — don't leave it out to make the number look nicer.",
    "- Be realistic, not optimistic: when unsure between two portion sizes, pick the larger one. Under-counting hurts their progress more than over-counting.",
    "- Use typical Indian recipe values (IFCT-style) rather than Western versions of a dish.",
    "- Only count what is in the photo. If nothing edible is visible, set isFood to false and return no items.",
  ];
  if (hint) lines.push(`What the person says about this meal (trust it for quantities and hidden ingredients): "${hint}"`);
  return lines.join("\n");
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+n) ? +n : lo));
const r1 = (n) => Math.round(n * 10) / 10;

/** photo: { mime, data: Buffer }. Returns { isFood, items, total, confidence, notes, photoQuality, model }. */
export async function analyzeMeal(photo, { hint = "", fetchImpl = fetch, wait = true } = {}) {
  const parts = [{ text: prompt(String(hint).trim().slice(0, 300)) }, { inline_data: { mime_type: photo.mime, data: photo.data.toString("base64") } }];
  const { out, model } = await geminiJSON(parts, SCHEMA, { temperature: 0.2, fetchImpl, wait });
  const items = (Array.isArray(out.items) ? out.items : [])
    .slice(0, 12)
    .map((i) => ({
      name: String(i.name || "Food").slice(0, 60),
      portion: String(i.portion || "").slice(0, 60),
      grams: Math.round(clamp(i.grams, 0, 3000)),
      cal: Math.round(clamp(i.cal, 0, 4000)),
      p: r1(clamp(i.p, 0, 300)),
      c: r1(clamp(i.c, 0, 600)),
      f: r1(clamp(i.f, 0, 300)),
    }))
    .filter((i) => i.name);
  const total = items.reduce((t, i) => ({ cal: t.cal + i.cal, p: r1(t.p + i.p), c: r1(t.c + i.c), f: r1(t.f + i.f) }), { cal: 0, p: 0, c: 0, f: 0 });
  return {
    isFood: out.isFood !== false && items.length > 0,
    items,
    total,
    confidence: ["low", "medium", "high"].includes(out.confidence) ? out.confidence : "low",
    notes: String(out.notes || "").slice(0, 400),
    photoQuality: String(out.photoQuality || "").slice(0, 200),
    model,
  };
}
