// Shared bits for the AI skin check: what each score means, photo
// processing (shrink + quality checks) and small helpers.

export const ANGLES = [
  { id: "front", label: "Front", hint: "Look straight at the camera" },
  { id: "left", label: "Left side", hint: "Turn your head right to show your left cheek" },
  { id: "right", label: "Right side", hint: "Turn your head left to show your right cheek" },
];

// Severity 0–10, lower is better.
export const METRICS = [
  { id: "acne", label: "Acne", info: "Active pimples, whiteheads, blackheads" },
  { id: "marks", label: "Marks", info: "Post-acne marks, dark spots, scars" },
  { id: "redness", label: "Redness", info: "Redness or irritation" },
  { id: "oiliness", label: "Oiliness", info: "Visible shine" },
  { id: "dryness", label: "Dryness", info: "Dry or flaky patches" },
  { id: "darkCircles", label: "Dark circles", info: "Under-eye darkness or puffiness" },
  { id: "texture", label: "Texture", info: "Bumps, visible pores, roughness" },
  { id: "unevenTone", label: "Uneven tone", info: "Tan lines and patchiness" },
];

export const sevColor = (v) => (v <= 2 ? "#34d399" : v <= 4 ? "#a3e635" : v <= 6 ? "#fbbf24" : v <= 8 ? "#fb923c" : "#f87171");
export const overallColor = (v) => (v >= 80 ? "#34d399" : v >= 65 ? "#a3e635" : v >= 50 ? "#fbbf24" : "#fb923c");
export const sevWord = (v) => (v <= 1 ? "None" : v <= 3 ? "Mild" : v <= 6 ? "Moderate" : "Strong");

// Big enough for small spots and pores to stay visible to the AI.
const MAX_SIDE = 1600;

/** Draw a video frame or image into a canvas no larger than MAX_SIDE, optionally mirrored. */
function toCanvas(src, w, h, mirror = false) {
  const s = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  const g = c.getContext("2d");
  if (mirror) {
    g.translate(c.width, 0);
    g.scale(-1, 1);
  }
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Brightness (0–255) and sharpness of the middle of the photo, where the face is. */
function quality(canvas) {
  const W = 160;
  const H = Math.round((canvas.height / canvas.width) * W);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(canvas, 0, 0, W, H);
  const { data } = g.getImageData(0, 0, W, H);
  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  let sum = 0;
  let n = 0;
  let lap = 0;
  let lap2 = 0;
  for (let y = Math.floor(H * 0.2); y < Math.floor(H * 0.8); y++) {
    for (let x = Math.floor(W * 0.25); x < Math.floor(W * 0.75); x++) {
      const i = y * W + x;
      sum += gray[i];
      const l = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - W] - gray[i + W];
      lap += l;
      lap2 += l * l;
      n++;
    }
  }
  const mean = sum / n;
  const sharp = lap2 / n - (lap / n) ** 2;
  const issues = [];
  if (mean < 70) issues.push("Too dark — face a window or turn on a light");
  else if (mean > 215) issues.push("Too bright — move away from direct light");
  if (sharp < 25) issues.push("Looks blurry — hold still and tap the focus");
  return { brightness: Math.round(mean), sharpness: Math.round(sharp), issues };
}

/** Turn a captured frame / chosen photo into { url, data (base64), issues }. */
export async function processPhoto(src, w, h, { mirror = false } = {}) {
  const canvas = toCanvas(src, w, h, mirror);
  const q = quality(canvas);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  const data = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
  return { url: URL.createObjectURL(blob), data, size: blob.size, ...q };
}

/** A photo picked from the gallery / file chooser. */
export async function processFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't open that photo"));
      i.src = url;
    });
    return await processPhoto(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const fmtDay = (iso, opts = { day: "numeric", month: "short" }) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", opts);
