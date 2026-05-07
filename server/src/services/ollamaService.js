/**
 * ollamaService.js
 * Replaces geminiService for all LLM tasks:
 *   - remixRecipe  → ingredient substitution suggestions
 *   - generateRecipe → invent a brand new recipe from pantry
 *
 * Uses the Ollama REST API (default: http://localhost:11434).
 * Set OLLAMA_HOST in .env to override.
 * Set OLLAMA_MODEL to choose the model (default: gemma:2b).
 *
 * If Ollama is unavailable, every function returns sensible mock data
 * so the UI never fully breaks.
 */

const OLLAMA_HOST = () => process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || "gemma:2b";

/**
 * Send a prompt to Ollama and return the text response.
 */
async function chat(prompt) {
  const res = await fetch(`${OLLAMA_HOST()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL(),
      prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.8,
        num_predict: 1024,
      },
    }),
    signal: AbortSignal.timeout(60_000), // 60 s max
  });

  if (!res.ok) {
    throw new Error(`Ollama responded with ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  return (json.response || "").trim();
}

/**
 * Strip optional markdown code-fence wrapping that models sometimes add.
 */
function stripCodeFence(s) {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

/**
 * Parse JSON from a raw LLM response, falling back to null on failure.
 */
function safeParseJSON(text) {
  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    // Try to find the first { ... } or [ ... ] block
    const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) {
      try { return JSON.parse(m[1]); } catch { /* noop */ }
    }
    return null;
  }
}

// ─── Recipe Remix ────────────────────────────────────────────────────────────

const REMIX_FALLBACK = {
  substitutions: [
    { missing: "ingredient", use: "pantry alternative", note: "Ollama is offline — start it to get real suggestions." },
  ],
  instructions: "Ollama is not running. Please start Ollama and try again.",
};

export async function remixRecipe({ pantryNames, recipeId, title, vegetarian }) {
  const prompt = `You are a creative Indian home cook.
Pantry items available: ${pantryNames.join(", ")}.
Target recipe: ${title || `recipe id ${recipeId}`}.
${vegetarian ? "The output MUST be strictly vegetarian." : ""}

For every ingredient in the recipe that is NOT in the pantry, suggest the best substitution using ONLY pantry items.
Return ONLY valid JSON (no markdown), exactly in this shape:
{
  "substitutions": [
    { "missing": "...", "use": "...", "note": "..." }
  ],
  "instructions": "Concise step-by-step cooking instructions using the substitutions."
}`;

  try {
    const text = await chat(prompt);
    const parsed = safeParseJSON(text);
    if (!parsed || !Array.isArray(parsed.substitutions)) {
      console.warn("[ollamaService] remixRecipe: unexpected response shape, using fallback");
      return REMIX_FALLBACK;
    }
    return parsed;
  } catch (err) {
    console.warn("[ollamaService] remixRecipe failed:", err.message);
    return REMIX_FALLBACK;
  }
}

// ─── Recipe Generation ────────────────────────────────────────────────────────

const GENERATE_FALLBACK = {
  title: "Quick Pantry Dal Tadka",
  readyInMinutes: 25,
  servings: 2,
  usedIngredients: ["Dal / Lentils", "Onions", "Tomatoes", "Spices"],
  missedIngredients: [],
  nutrition: { calories: 320, protein: 14, carbs: 38, fat: 8, fiber: 6 },
  instructions: "Ollama is not running. This is a sample recipe. Start Ollama and click 'Invent new recipe' again to get a real AI-generated dish.",
};

export async function generateRecipe({ pantryNames, vegetarian }) {
  const STYLES = ["North Indian curry", "South Indian style", "Indo-Chinese fusion", "Indian street food", "homestyle comfort food", "quick stir-fry", "spicy and tangy", "rich and creamy", "light and healthy"];
  const randomStyle = STYLES[Math.floor(Math.random() * STYLES.length)];

  const prompt = `You are a creative Indian home cook.
Pantry items available: ${pantryNames.length > 0 ? pantryNames.join(", ") : "basic Indian pantry staples"}.
${vegetarian ? "The recipe MUST be strictly vegetarian." : ""}

Invent ONE brand-new, highly creative, and UNIQUE delicious recipe that uses primarily these pantry items.
Make the dish in this style: ${randomStyle}. Do not generate the same recipe every time!
Return ONLY valid JSON (no markdown), exactly in this shape:
{
  "title": "Name of the dish",
  "readyInMinutes": 30,
  "servings": 2,
  "usedIngredients": ["item1", "item2"],
  "missedIngredients": [],
  "nutrition": { "calories": 400, "protein": 15, "carbs": 40, "fat": 10, "fiber": 5 },
  "instructions": "Step-by-step cooking instructions."
}`;

  try {
    const text = await chat(prompt);
    const parsed = safeParseJSON(text);
    if (!parsed || !parsed.title) {
      console.warn("[ollamaService] generateRecipe: unexpected response shape, using fallback");
      return GENERATE_FALLBACK;
    }
    return parsed;
  } catch (err) {
    console.warn("[ollamaService] generateRecipe failed:", err.message);
    return GENERATE_FALLBACK;
  }
}
