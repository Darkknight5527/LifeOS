// Photo helpers for Fitness: shrink a chosen photo before upload, and load
// private photos from the server as blob URLs (kept for the session).
import { api } from "../../api";

/** Shrink an image file to fit `maxSide` and re-encode as JPEG. Returns { url, data (base64) }. */
export async function shrinkPhoto(file, maxSide = 1280, quality = 0.85) {
  if (!file || !/^image\//.test(file.type || "image/")) throw new Error("That isn't a photo.");
  let img;
  try {
    img = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't open that photo. Try a JPEG or PNG."));
      el.src = URL.createObjectURL(file);
    });
  }
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  const s = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  let q = quality;
  let url = c.toDataURL("image/jpeg", q);
  // Stay well under the server's 1.5 MB limit.
  while (url.length > 1.8e6 && q > 0.4) {
    q -= 0.1;
    url = c.toDataURL("image/jpeg", q);
  }
  return { url, data: url.slice(url.indexOf(",") + 1) };
}

const cache = new Map(); // photo id → Promise<blob URL>
/** Blob URL for a saved progress photo (fetched once per session). */
export function progressImage(id) {
  if (!cache.has(id)) {
    const p = api
      .progressPhotoImage(id)
      .then((r) => {
        if (!r.ok) throw new Error("Couldn't load photo");
        return r.blob();
      })
      .then((b) => URL.createObjectURL(b));
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id);
}
export function forgetImage(id) {
  const p = cache.get(id);
  cache.delete(id);
  p?.then((u) => URL.revokeObjectURL(u)).catch(() => {});
}
