// Lightweight fetch wrapper — points at your deployed Node/Express + Mongo API.
// Set VITE_API_BASE_URL in Lovable project settings (e.g. https://freshque-api.onrender.com).

// In local development, always use Vite proxy so auth cookies remain first-party.
// Note: Vite dev server proxies `/api/*` → backend.
const BASE = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_BASE_URL || "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const j = await res.json(); if (j?.error) msg = typeof j.error === "string" ? j.error : JSON.stringify(j.error); } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  // Auth
  signup: (body: { name: string; email: string; password: string }) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  updatePreferences: (body: { vegetarianOnly: boolean }) =>
    request("/auth/preferences", { method: "PATCH", body: JSON.stringify(body) }),

  // Pantry
  listPantry: () => request("/pantry"),
  createItem: (item: unknown) => request("/pantry", { method: "POST", body: JSON.stringify(item) }),
  bulkAdd: (items: unknown[]) => request("/pantry/bulk", { method: "POST", body: JSON.stringify({ items }) }),
  consumeItem: (id: string) => request(`/pantry/${id}/consume`, { method: "POST" }),
  deleteItem: (id: string) => request(`/pantry/${id}`, { method: "DELETE" }),

  // Receipt scan (multipart, sent without JSON content-type)
  scanReceipt: async (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(`${BASE}/scan/receipt`, { method: "POST", credentials: "include", body: fd });
    if (!res.ok) throw new Error(`Scan failed (${res.status})`);
    return res.json();
  },

  // Recipes
  searchRecipes: (vegetarian: boolean) =>
    request(`/recipes/search?vegetarian=${vegetarian}`),
  searchRecipesWithPantry: (pantryNames: string[], vegetarian: boolean) =>
    request("/recipes/search", { method: "POST", body: JSON.stringify({ pantryNames, vegetarian }) }),
  generateRecipe: (pantryNames: string[], vegetarian: boolean) =>
    request("/recipes/generate", { method: "POST", body: JSON.stringify({ pantryNames, vegetarian }) }),
  remixRecipe: (recipeId: string, targetTitle?: string) =>
    request("/recipes/remix", { method: "POST", body: JSON.stringify({ recipeId, targetTitle }) }),
  getRecipeInfo: (recipeId: string) => request(`/recipes/${recipeId}`),

  // Push
  getVapidKey: () => request<{ key: string }>("/push/vapid-key"),
  subscribePush: (sub: PushSubscriptionJSON) =>
    request("/push/subscribe", { method: "POST", body: JSON.stringify(sub) }),

  // Stats
  snapshot: () => request("/stats/snapshot"),
  thirtyDay: () => request("/stats/30d"),
};
