// Shared constants and helpers used by both the web app and (later) the mobile app.

export const PHYSICAL_CONCERN_TAGS = [
  "Acne",
  "Dryness",
  "Oiliness",
  "Redness",
  "Dark circles",
  "Sensitivity",
];

export const GOAL_CATEGORIES = ["all", "career", "personal", "health", "financial"];

export const PROJECT_CATEGORIES = ["work", "side", "personal"];

export const LEARNING_CATEGORIES = ["course", "self-directed", "reading"];

export const GROOMING_TASKS = [
  "Facial hair trimming",
  "Underarm hair",
  "Pubic hair",
  "Nails trimming",
];

/**
 * Creates a small fetch-based API client bound to a base URL and a
 * token getter. Used identically from the web app and (later) the
 * React Native app.
 *
 * @param {string} baseUrl e.g. "https://lifeos-api.onrender.com/api"
 * @param {() => string | null} getToken
 */
export function createApiClient(baseUrl, getToken) {
  async function request(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      let message = `Request failed: ${res.status}`;
      try {
        const data = await res.json();
        message = data.error || message;
      } catch {
        // ignore parse errors
      }
      throw new Error(message);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  return {
    login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
    register: (email, password) => request("/auth/register", { method: "POST", body: { email, password } }),

    list: (collection) => request(`/${collection}`),
    get: (collection, id) => request(`/${collection}/${id}`),
    create: (collection, data) => request(`/${collection}`, { method: "POST", body: data }),
    update: (collection, id, data) => request(`/${collection}/${id}`, { method: "PATCH", body: data }),
    remove: (collection, id) => request(`/${collection}/${id}`, { method: "DELETE" }),

    // Finances: whole-section backup / restore / reset
    financeBackup: () => request("/finance/backup"),
    financeRestore: (data) => request("/finance/restore", { method: "POST", body: { data } }),
    financeReset: () => request("/finance/reset", { method: "POST" }),

    // Morning Paper
    paperCalendar: ({ from, to, days }) =>
      request(`/paper/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&days=${days.join(",")}`),
    paperNews: () => request("/paper/news"),

    // Reference books (private PDFs)
    books: () => request("/books"),
    // Raw download — returns the fetch Response so the caller can stream/cache it.
    bookFile: (key) => {
      const token = getToken();
      return fetch(`${baseUrl}/books/${encodeURIComponent(key)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    },
    // Upload with progress (XHR, since fetch has no upload progress).
    uploadBook: (key, file, onProgress) =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", `${baseUrl}/books/${encodeURIComponent(key)}`);
        const token = getToken();
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Content-Type", "application/pdf");
        xhr.setRequestHeader("X-File-Name", file.name.replace(/[^\x20-\x7e]/g, "_"));
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
        xhr.onload = () => {
          let data = null;
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            /* ignore */
          }
          xhr.status < 300 ? resolve(data) : reject(new Error(data?.error || `Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed — check your connection"));
        xhr.send(file);
      }),
  };
}
