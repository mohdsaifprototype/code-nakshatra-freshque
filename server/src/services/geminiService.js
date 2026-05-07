import { GoogleGenerativeAI } from "@google/generative-ai";

let client;
function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
}

const RECEIPT_PROMPT = `You are an expert grocery receipt parser for Indian retailers
(BigBasket, DMart, Reliance Fresh, local kirana, Blinkit/Zepto/Instamart).
From this receipt image, extract every food/grocery line item.

For each item, return:
- name: cleaned product name (remove SKU codes, expand abbreviations)
- quantity: numeric quantity purchased (e.g. 2, 0.5)
- unit: one of kg, g, L, ml, pcs, pack, dozen
- pricePerUnit: price IN RUPEES per single unit (line total ÷ quantity)
- category: one of dairy, produce, grains, protein, spices, bakery, snacks, beverages, other

Skip non-food items (bags, taxes, discounts).
Return ONLY valid JSON, no markdown:
{ "items": [ ... ] }`;

export async function extractItemsFromReceipt({ buffer, mimeType }) {
  const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
  const imagePart = {
    inlineData: { data: buffer.toString("base64"), mimeType },
  };
  const result = await model.generateContent([RECEIPT_PROMPT, imagePart]);
  const text = result.response.text().trim();
  const json = stripCodeFence(text);
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }
  return Array.isArray(parsed.items) ? parsed.items : [];
}

export async function remixRecipe({ pantryNames, recipeId, title, vegetarian }) {
  const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `You are a creative Indian home cook. Pantry: ${pantryNames.join(", ")}.
Target recipe: ${title || `Spoonacular id ${recipeId}`}. ${vegetarian ? "Output must be strictly vegetarian." : ""}
For each ingredient the user is missing, suggest a substitution using ONLY items already in their pantry.
Return JSON: { "substitutions": [{ "missing": "...", "use": "...", "note": "..." }], "instructions": "short cooking steps" }
ONLY JSON, no markdown.`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(stripCodeFence(text));
}

export async function generateRecipe({ pantryNames, vegetarian }) {
  const STYLES = ["North Indian curry", "South Indian style", "Indo-Chinese fusion", "Indian street food", "homestyle comfort food", "quick stir-fry", "spicy and tangy", "rich and creamy", "light and healthy"];
  const randomStyle = STYLES[Math.floor(Math.random() * STYLES.length)];

  const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { temperature: 0.9 } });
  const prompt = `You are a creative Indian home cook. Pantry: ${pantryNames.length > 0 ? pantryNames.join(", ") : "basic Indian pantry staples"}.
Invent a brand new, highly creative, and UNIQUE delicious recipe using primarily items currently in the pantry.
Make the dish in this style: ${randomStyle}. Do not generate the same recipe every time! ${vegetarian ? "Output must be strictly vegetarian." : ""}
Return JSON:
{
  "title": "Recipe Name",
  "readyInMinutes": 30,
  "servings": 2,
  "usedIngredients": ["...", "..."],
  "missedIngredients": [],
  "nutrition": { "calories": 400, "protein": 15, "carbs": 40, "fat": 10, "fiber": 5 },
  "instructions": "short cooking steps"
}
ONLY JSON, no markdown.`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(stripCodeFence(text));
}

function stripCodeFence(s) {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}
