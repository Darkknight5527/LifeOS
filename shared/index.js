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
  };
}
