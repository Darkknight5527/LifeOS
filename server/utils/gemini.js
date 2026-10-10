// Skin analysis with Google's Gemini vision models (Google AI Studio key).
// Set GEMINI_API_KEY on the server; GEMINI_MODEL is optional.
// GEMINI_API_URL is only for tests (a stand-in server); normally Google.
const API = process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_MODEL = () => process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Tried in order when the main model is busy or out of free quota (each model
// has its own free limit). GEMINI_FALLBACKS can override, comma-separated.
const FALLBACKS = () =>
  (process.env.GEMINI_FALLBACKS || "gemini-3.7-flash,gemini-3.5-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Busy / overloaded / temporarily failing: worth waiting and trying again.
const BUSY = new Set([429, 500, 502, 503, 504]);

export const METRICS = ["acne", "marks", "redness", "oiliness", "dryness", "darkCircles", "texture", "unevenTone"];

// Every score uses the same fixed meaning, so numbers are comparable over
// time and the AI can't drift towards "nice".
const RUBRIC = `Severity scale (use the whole range — this is a tracking tool, not a compliment):
0 = none at all, like retouched skin in an advert
1–2 = barely there; you have to look closely
3–4 = mild but clearly visible on close look (a few spots / a small patch)
5–6 = moderate: obvious at normal viewing distance, or spread over a large part of the face
7–8 = marked: many lesions / strong and widespread
9–10 = severe: covers most of the visible skin, inflamed, or scarring everywhere`;

const sev = (description) => ({ type: "NUMBER", description: `${description}. 0–10 on the severity scale in the instructions.` });
const SCHEMA = {
  type: "OBJECT",
  properties: {
    photoQuality: {
      type: "OBJECT",
      properties: {
        usable: { type: "BOOLEAN", description: "False if the photos are too dark, blurry, filtered, partly covered or too far away to judge skin." },
        issues: { type: "STRING", description: "Short note on lighting / focus problems, empty if fine." },
      },
      required: ["usable", "issues"],
    },
    scores: {
      type: "OBJECT",
      properties: {
        acne: sev("Active acne: pimples, pustules, papules, whiteheads, blackheads, cysts"),
        marks: sev("Post-acne marks: dark spots, red marks, pitted or raised scars"),
        redness: sev("Redness, inflammation or irritation"),
        oiliness: sev("Visible oil / shine (T-zone and cheeks)"),
        dryness: sev("Dry, flaky, rough-looking or tight skin"),
        darkCircles: sev("Dark circles, hollows or puffiness under the eyes"),
        texture: sev("Uneven texture: bumps, enlarged / clogged pores, roughness"),
        unevenTone: sev("Uneven tone: pigmentation, patches, tan lines, dullness"),
      },
      required: METRICS,
    },
    hidden: { type: "STRING", description: "Areas you could NOT judge (covered by beard, hair, glasses, shadow, out of frame). Empty if none." },
    headline: { type: "STRING", description: "One blunt, specific sentence on today's skin (max 16 words). No praise words unless the skin really is clear." },
    summary: { type: "STRING", description: "3–4 plain sentences: the main problems first, where they are, how widespread. Factual, not reassuring." },
    changes: { type: "STRING", description: "If a previous check is given: 1–2 sentences on what improved or got worse, honestly. Otherwise empty." },
    areas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          area: { type: "STRING", description: "One of: Forehead, Nose, Left cheek, Right cheek, Chin & jaw, Under eyes" },
          note: { type: "STRING", description: "Exactly what is visible there (counts and types where you can, e.g. '5–6 red papules, 2 dark marks'). Say 'hidden by beard' if you can't see it." },
        },
        required: ["area", "note"],
      },
    },
    tips: { type: "ARRAY", items: { type: "STRING" }, description: "2–3 concrete, everyday skincare steps aimed at the worst problems (no prescription drugs)." },
    seeDermatologist: { type: "BOOLEAN", description: "True if anything looks like it needs a doctor: moderate-or-worse inflamed or cystic acne, scarring, a changing mole, infection, rash." },
  },
  required: ["photoQuality", "scores", "hidden", "headline", "summary", "changes", "areas", "tips", "seeDermatologist"],
};

function prompt(previous, routine, reported) {
  const lines = [
    "You are a strict, objective skin assessor (not a doctor). The person uses these checks to track and fix their skin problems, so under-scoring a problem actively harms them.",
    "You get photos of the same face: front, left side, right side. Examine every visible area closely, zooming in mentally on cheeks, jawline, forehead and nose.",
    "Rules:",
    "- Accuracy over kindness. Never soften, reassure or compliment. Do not call skin 'good', 'healthy' or 'clear' unless the scores are all 0–2.",
    "- Count what you see. Every visible pimple, mark or patch counts.",
    "- If you're unsure between two scores, pick the higher (worse) one.",
    "- Skin hidden by a beard, hair or shadow is UNKNOWN, not clear: score only what you can see, and list hidden areas in `hidden`.",
    "- Never diagnose a disease; describe what is visible in plain words.",
    RUBRIC,
  ];
  if (reported) lines.push(`What the person themselves reported about their skin recently: ${reported}. Look specifically for these.`);
  if (previous) {
    lines.push(
      `Previous check on ${previous.date}: scores ${JSON.stringify(previous.scores)}; summary: "${previous.summary}".`,
      "Compare against it in `changes`. Keep the same scale, but don't copy old scores — score today's photos on their own."
    );
  }
  if (routine) lines.push(`Their current routine: ${routine}.`);
  return lines.join("\n");
}

// The 0–100 skin score is CALCULATED from the eight severities (not the AI's
// impression): the biggest problems count most, and one bad concern can't be
// hidden by several good ones.
const WEIGHTS = { acne: 1.6, marks: 1.3, texture: 1.2, redness: 1.1, unevenTone: 1, darkCircles: 0.7, oiliness: 0.7, dryness: 0.7 };
export const SCORING_VERSION = 2;
export function skinScore(scores) {
  let sum = 0;
  let wsum = 0;
  let worst = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    const v = Math.min(10, Math.max(0, Number(scores?.[k]) || 0));
    sum += v * w;
    wsum += w;
    worst = Math.max(worst, v);
  }
  const penalty = 0.6 * (sum / wsum) + 0.4 * worst; // 0–10
  return Math.round(Math.max(0, 100 - penalty * 10));
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+n) ? +n : lo));

/**
 * photos: [{ angle, mime, data: Buffer }]
 * Returns the parsed analysis, or throws an Error with a readable message.
 */
export async function analyzeSkin(photos, { previous, routine, reported, fetchImpl = fetch, wait = true } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI isn't set up yet: add GEMINI_API_KEY on the server.");
  const parts = [{ text: prompt(previous, routine, reported) }];
  for (const p of photos) {
    parts.push({ text: `Photo: ${p.angle}` });
    parts.push({ inline_data: { mime_type: p.mime, data: p.data.toString("base64") } });
  }
  const request = (model) =>
    fetchImpl(`${API}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: SCHEMA },
      }),
      signal: AbortSignal.timeout(60_000),
    });

  // Main model first (with two short retries when it's busy), then the fallbacks.
  const models = [...new Set([GEMINI_MODEL(), ...FALLBACKS()])];
  let lastErr = null;
  let out = null;
  let used = null;
  outer: for (const model of models) {
    for (let attempt = 0; attempt < (model === models[0] ? 3 : 2); attempt++) {
      if (attempt) await sleep(attempt * 2500 * (wait ? 1 : 0));
      let res;
      try {
        res = await request(model);
      } catch (e) {
        lastErr = new Error(e?.name === "TimeoutError" ? "The AI took too long to answer." : "Couldn't reach the AI.");
        continue;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body?.error?.message || `status ${res.status}`;
        if (res.status === 404) {
          lastErr = new Error(`AI model "${model}" not found.`);
          continue outer; // renamed / retired: try the next model
        }
        if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error(`AI request failed: ${msg}`.slice(0, 300));
        lastErr = new Error(
          res.status === 429 ? "The free AI limit was reached for now. Try again later." : "Google's AI is very busy right now. Try again in a few minutes."
        );
        if (!BUSY.has(res.status)) throw new Error(`AI request failed: ${msg}`.slice(0, 300));
        if (res.status === 429) continue outer; // out of quota on this model: the next has its own
        continue;
      }
      const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      try {
        out = JSON.parse(text);
        used = model;
        break outer;
      } catch {
        const reason = body?.candidates?.[0]?.finishReason || body?.promptFeedback?.blockReason;
        lastErr = new Error(`The AI didn't return a result${reason ? ` (${reason})` : ""}. Try again.`);
      }
    }
  }
  if (!out) throw lastErr || new Error("The AI didn't answer. Try again.");
  const scores = {};
  for (const m of METRICS) scores[m] = Math.round(clamp(out?.scores?.[m], 0, 10) * 10) / 10;
  return {
    scores,
    overall: skinScore(scores),
    scoring: SCORING_VERSION,
    hidden: String(out.hidden || "").slice(0, 300),
    headline: String(out.headline || "").slice(0, 200),
    summary: String(out.summary || "").slice(0, 1200),
    changes: String(out.changes || "").slice(0, 800),
    areas: (Array.isArray(out.areas) ? out.areas : []).slice(0, 8).map((a) => ({ area: String(a.area || "").slice(0, 40), note: String(a.note || "").slice(0, 300) })),
    tips: (Array.isArray(out.tips) ? out.tips : []).slice(0, 4).map((t) => String(t).slice(0, 300)),
    photoQuality: { usable: out?.photoQuality?.usable !== false, issues: String(out?.photoQuality?.issues || "").slice(0, 300) },
    seeDermatologist: Boolean(out.seeDermatologist),
    model: used,
  };
}
