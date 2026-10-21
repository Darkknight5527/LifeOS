// Meal photos → calories and macros, with Gemini. Photos are only sent to the
// AI for this estimate; they are never saved.
//
// Accuracy, in layers:
//  1. Up to three photos (e.g. top view + side view) so the AI can judge depth.
//  2. Your own plate / katori size as a measuring reference.
//  3. A reference food list (LifeOS's Indian food table + your own foods):
//     the AI names the matching entry and how many servings it sees, and the
//     numbers then come from that table, not the AI's memory.
//  4. Follow-up questions (oil, filling, recipe) you can answer to refine it.
import { geminiJSON } from "./gemini.js";

const num = (description) => ({ type: "NUMBER", description });
const SCHEMA = {
  type: "OBJECT",
  properties: {
    isFood: { type: "BOOLEAN", description: "False if the photos don't show food or drink." },
    photoQuality: { type: "STRING", description: "Short note if the photos are too dark, blurry or cut off to judge portions. Empty if fine." },
    items: {
      type: "ARRAY",
      description: "Each separate food or drink visible, one entry each (rice, dal, chapati, curry, salad, curd…).",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "Plain everyday name, e.g. 'Chapati', 'Chicken curry', 'Steamed rice'." },
          portion: { type: "STRING", description: "Visible amount in household terms, e.g. '2 medium', '1 katori (150 g)', '1 cup cooked'." },
          grams: num("Estimated weight in grams for the whole portion"),
          match: { type: "STRING", description: "The EXACT name of the matching entry from the reference food list, or empty if nothing in the list is the same food." },
          servings: num("If matched: how many of that list entry's servings are on the plate (e.g. 2.5). 0 if not matched."),
          cal: num("Your own kcal estimate for the whole portion, including oil/ghee/butter"),
          p: num("Protein in grams for the whole portion"),
          c: num("Carbohydrate in grams for the whole portion"),
          f: num("Fat in grams for the whole portion"),
        },
        required: ["name", "portion", "grams", "match", "servings", "cal", "p", "c", "f"],
      },
    },
    questions: {
      type: "ARRAY",
      description: "Up to 3 short questions whose answers would change the estimate a lot (hidden oil, filling, recipe, whether something was shared). Empty if not needed.",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING", description: "One short plain question." },
          options: { type: "ARRAY", items: { type: "STRING" }, description: "2–4 short answer choices." },
        },
        required: ["question", "options"],
      },
    },
    confidence: { type: "STRING", enum: ["low", "medium", "high"], description: "How sure you are about the portions overall." },
    notes: { type: "STRING", description: "One or two short plain sentences: what was hard to judge and anything to double-check. Empty if nothing." },
  },
  required: ["isFood", "photoQuality", "items", "questions", "confidence", "notes"],
};

function prompt({ hint, reference, plateCm, katoriMl, answers, count }) {
  const lines = [
    "You estimate the calories and macros of a meal from photos, for someone tracking food to lose fat. They are in India and mostly eat Indian home, canteen and restaurant food (often Kerala).",
    count > 1 ? `There are ${count} photos of the SAME plate from different angles. Use them together to judge depth and portion size — do not count food twice.` : "There is one photo.",
    "Method:",
    "1. List every separate food or drink as its own item. Don't merge rice and curry.",
    "2. Judge portions from visual cues and the reference sizes below. A teaspoon is about 5 ml; a chapati is about 15–18 cm across.",
    "3. For each item, find the same food in the reference list. If it's there, set `match` to that entry's exact name and `servings` to how many of its servings you see (fractions are fine). Only match if it really is the same dish — a dry chicken fry is not chicken curry.",
    "4. Still give your own grams/kcal/macros for every item, matched or not.",
    "5. Oil: Indian cooking often uses a lot. If an item looks glossier or oilier than a normal home recipe, or there's visible oil/ghee/butter on top, add it as a separate item (e.g. 'Extra ghee on rice, ~1 tsp').",
    "6. Be realistic, not optimistic: when unsure between two portion sizes, pick the larger one.",
    "7. If a fact you can't see would change the total by more than ~15% (oil quantity, filling, coconut-based or not, whether the plate was shared), ask it in `questions` with short answer options. Don't ask about things you can see.",
    "8. Only count what's in the photos. If nothing edible is visible, set isFood to false and return no items.",
  ];
  const refs = [];
  if (plateCm > 0) refs.push(`their dinner plate is about ${plateCm} cm across`);
  if (katoriMl > 0) refs.push(`their katori/bowl holds about ${katoriMl} ml`);
  lines.push(refs.length ? `Reference sizes: ${refs.join("; ")}.` : "Reference sizes: assume a 25–27 cm dinner plate and a 150 ml steel katori unless the photo clearly shows otherwise.");
  if (hint) lines.push(`What the person says about this meal (trust it for quantities and hidden ingredients): "${hint}"`);
  if (answers?.length) lines.push(`Their answers to your earlier questions (use them; don't ask these again): ${answers.map((a) => `${a.question} → ${a.answer}`).join("; ")}`);
  if (reference?.length) {
    lines.push("Reference food list (name | serving | kcal | protein g | carbs g | fat g, per ONE serving):");
    for (const r of reference) lines.push(`${r.name} | ${r.serving} | ${r.cal} | ${r.p} | ${r.c} | ${r.f}`);
  }
  return lines.join("\n");
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+n) ? +n : lo));
const r1 = (n) => Math.round(n * 10) / 10;
const str = (v, max) => String(v ?? "").slice(0, max);

/** Clean the reference list from the browser: [{ name, serving, cal, p, c, f }]. */
export function cleanReference(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const r of list.slice(0, 500)) {
    const name = str(r?.name, 60).replace(/[|\n\r]/g, " ").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, serving: str(r.serving, 40).replace(/[|\n\r]/g, " "), cal: Math.round(clamp(r.cal, 0, 3000)), p: r1(clamp(r.p, 0, 300)), c: r1(clamp(r.c, 0, 500)), f: r1(clamp(r.f, 0, 300)) });
  }
  return out;
}

/**
 * photos: [{ mime, data: Buffer }] (1–3, same plate)
 * Returns { isFood, items, total, questions, confidence, notes, photoQuality, model }.
 * Items matched to the reference list take their numbers from it (source "list").
 */
export async function analyzeMeal(photos, { hint = "", reference = [], plateCm = 0, katoriMl = 0, answers = [], fetchImpl = fetch, wait = true } = {}) {
  const list = Array.isArray(photos) ? photos : [photos];
  const ref = cleanReference(reference);
  const ans = (Array.isArray(answers) ? answers : []).slice(0, 5).map((a) => ({ question: str(a?.question, 160), answer: str(a?.answer, 80) })).filter((a) => a.question && a.answer);
  const parts = [{ text: prompt({ hint: str(hint, 300).trim(), reference: ref, plateCm: clamp(plateCm, 0, 60), katoriMl: clamp(katoriMl, 0, 1000), answers: ans, count: list.length }) }];
  list.forEach((p, i) => {
    if (list.length > 1) parts.push({ text: `Photo ${i + 1}` });
    parts.push({ inline_data: { mime_type: p.mime, data: p.data.toString("base64") } });
  });
  const { out, model } = await geminiJSON(parts, SCHEMA, { temperature: 0.1, fetchImpl, wait });

  const byName = Object.fromEntries(ref.map((r) => [r.name.toLowerCase(), r]));
  const items = (Array.isArray(out.items) ? out.items : [])
    .slice(0, 14)
    .map((i) => {
      const own = { cal: Math.round(clamp(i.cal, 0, 4000)), p: r1(clamp(i.p, 0, 300)), c: r1(clamp(i.c, 0, 600)), f: r1(clamp(i.f, 0, 300)) };
      const hit = byName[str(i.match, 60).trim().toLowerCase()];
      const servings = clamp(i.servings, 0, 20);
      const base = {
        name: str(i.name || "Food", 60),
        portion: str(i.portion, 60),
        grams: Math.round(clamp(i.grams, 0, 3000)),
      };
      if (hit && servings > 0) {
        const fromList = { cal: Math.round(hit.cal * servings), p: r1(hit.p * servings), c: r1(hit.c * servings), f: r1(hit.f * servings) };
        // If the table and the AI disagree wildly, the match is probably wrong: keep the AI's own numbers.
        const far = own.cal > 0 && (fromList.cal > own.cal * 2.5 || fromList.cal < own.cal / 2.5);
        if (!far) return { ...base, ...fromList, source: "list", match: hit.name, servings: r1(servings), serving: hit.serving };
      }
      return { ...base, ...own, source: "estimate" };
    })
    .filter((i) => i.name);
  const total = items.reduce((t, i) => ({ cal: t.cal + i.cal, p: r1(t.p + i.p), c: r1(t.c + i.c), f: r1(t.f + i.f) }), { cal: 0, p: 0, c: 0, f: 0 });
  const asked = new Set(ans.map((a) => a.question.toLowerCase()));
  const questions = (Array.isArray(out.questions) ? out.questions : [])
    .map((q) => ({ question: str(q?.question, 160).trim(), options: (Array.isArray(q?.options) ? q.options : []).slice(0, 4).map((o) => str(o, 60).trim()).filter(Boolean) }))
    .filter((q) => q.question && q.options.length >= 2 && !asked.has(q.question.toLowerCase()))
    .slice(0, 3);
  return {
    isFood: out.isFood !== false && items.length > 0,
    items,
    total,
    questions,
    confidence: ["low", "medium", "high"].includes(out.confidence) ? out.confidence : "low",
    notes: str(out.notes, 400),
    photoQuality: str(out.photoQuality, 200),
    model,
  };
}
