// Skin analysis with Google's Gemini vision models (Google AI Studio key).
// Set GEMINI_API_KEY on the server; GEMINI_MODEL is optional.
const API = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_MODEL = () => process.env.GEMINI_MODEL || "gemini-3.8-flash";

export const METRICS = ["acne", "marks", "redness", "oiliness", "dryness", "darkCircles", "texture", "unevenTone"];

const sev = (description) => ({ type: "NUMBER", description: `${description}. 0 = none, 10 = severe.` });
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
        acne: sev("Active pimples, whiteheads, blackheads"),
        marks: sev("Post-acne marks, dark spots, scars"),
        redness: sev("Redness or irritation"),
        oiliness: sev("Visible shine / oil"),
        dryness: sev("Dry, flaky or tight-looking skin"),
        darkCircles: sev("Dark circles or puffiness under the eyes"),
        texture: sev("Bumpy texture, visible pores, roughness"),
        unevenTone: sev("Tan lines, patchiness, uneven tone"),
      },
      required: METRICS,
    },
    overall: { type: "NUMBER", description: "Overall skin score 0–100, higher is healthier and clearer." },
    headline: { type: "STRING", description: "One short sentence on today's skin, plain words, max 14 words." },
    summary: { type: "STRING", description: "2–3 plain-language sentences describing what is visible today." },
    changes: { type: "STRING", description: "If a previous check is given: 1–2 sentences on what improved or got worse. Otherwise empty." },
    areas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          area: { type: "STRING", description: "One of: Forehead, Nose, Left cheek, Right cheek, Chin & jaw, Under eyes" },
          note: { type: "STRING", description: "What is visible there, short." },
        },
        required: ["area", "note"],
      },
    },
    tips: { type: "ARRAY", items: { type: "STRING" }, description: "2–3 gentle, everyday skincare tips for what is visible (no prescription drugs)." },
    seeDermatologist: { type: "BOOLEAN", description: "True only if something looks like it needs a doctor (painful cystic acne, a changing mole, infection, rash)." },
  },
  required: ["photoQuality", "scores", "overall", "headline", "summary", "changes", "areas", "tips", "seeDermatologist"],
};

function prompt(previous, routine) {
  const lines = [
    "You are a careful skincare assistant (not a doctor) tracking one person's facial skin over time.",
    "You get three photos of the same face: front, left side, right side.",
    "Score each concern consistently from what is actually visible. Ignore makeup-free shine from the camera flash only if obvious.",
    "Be steady: small lighting changes alone should not move a score by more than 1.",
    "Never diagnose diseases; describe what you see in plain words.",
  ];
  if (previous) {
    lines.push(
      `Previous check on ${previous.date}: overall ${previous.overall}/100; scores ${JSON.stringify(previous.scores)}; summary: "${previous.summary}".`,
      "Compare against it in `changes`, and keep the scale consistent with it."
    );
  }
  if (routine) lines.push(`Their current routine: ${routine}.`);
  return lines.join("\n");
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+n) ? +n : lo));

/**
 * photos: [{ angle, mime, data: Buffer }]
 * Returns the parsed analysis, or throws an Error with a readable message.
 */
export async function analyzeSkin(photos, { previous, routine, fetchImpl = fetch } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI isn't set up yet: add GEMINI_API_KEY on the server.");
  const parts = [{ text: prompt(previous, routine) }];
  for (const p of photos) {
    parts.push({ text: `Photo: ${p.angle}` });
    parts.push({ inline_data: { mime_type: p.mime, data: p.data.toString("base64") } });
  }
  const res = await fetchImpl(`${API}/${encodeURIComponent(GEMINI_MODEL())}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: SCHEMA },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || `status ${res.status}`;
    if (res.status === 429) throw new Error("The free AI limit was reached for now. Try again later.");
    throw new Error(`AI request failed: ${msg}`.slice(0, 300));
  }
  const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    const reason = body?.candidates?.[0]?.finishReason || body?.promptFeedback?.blockReason;
    throw new Error(`The AI didn't return a result${reason ? ` (${reason})` : ""}. Try again.`);
  }
  const scores = {};
  for (const m of METRICS) scores[m] = Math.round(clamp(out?.scores?.[m], 0, 10) * 10) / 10;
  return {
    scores,
    overall: Math.round(clamp(out.overall, 0, 100)),
    headline: String(out.headline || "").slice(0, 200),
    summary: String(out.summary || "").slice(0, 1200),
    changes: String(out.changes || "").slice(0, 800),
    areas: (Array.isArray(out.areas) ? out.areas : []).slice(0, 8).map((a) => ({ area: String(a.area || "").slice(0, 40), note: String(a.note || "").slice(0, 300) })),
    tips: (Array.isArray(out.tips) ? out.tips : []).slice(0, 4).map((t) => String(t).slice(0, 300)),
    photoQuality: { usable: out?.photoQuality?.usable !== false, issues: String(out?.photoQuality?.issues || "").slice(0, 300) },
    seeDermatologist: Boolean(out.seeDermatologist),
    model: GEMINI_MODEL(),
  };
}
