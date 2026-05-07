import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

let client;
const GEMINI_MODEL = "gemini-2.5-flash-lite";
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
  const model = getClient().getGenerativeModel({ model: GEMINI_MODEL });
  const imagePart = {
    inlineData: { data: buffer.toString("base64"), mimeType },
  };
  const result = await model.generateContent([RECEIPT_PROMPT, imagePart]);
  const parsed = safeParseJSON(result.response.text().trim());
  if (!parsed) {
    throw new Error("Gemini returned invalid JSON");
  }
  const receiptSchema = z.object({
    items: z.array(z.any()).default([]),
  });
  const validated = receiptSchema.safeParse(parsed);
  return validated.success ? validated.data.items : [];
}

export async function remixRecipe({ pantryNames, recipeId, title, vegetarian }) {
  const model = getClient().getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = `You are a creative Indian home cook. Pantry: ${pantryNames.join(", ")}.
Target recipe: ${title || `Spoonacular id ${recipeId}`}. ${vegetarian ? "Output must be strictly vegetarian." : ""}
For each ingredient the user is missing, suggest a substitution using ONLY items already in their pantry.
Return JSON: { "substitutions": [{ "missing": "...", "use": "...", "note": "..." }], "instructions": "short cooking steps" }
ONLY JSON, no markdown.`;
  const result = await model.generateContent(prompt);
  const parsed = safeParseJSON(result.response.text().trim());
  const remixSchema = z.object({
    substitutions: z.array(
      z.object({
        missing: z.string().default("ingredient"),
        use: z.string().default("pantry alternative"),
        note: z.string().default(""),
      }),
    ).default([]),
    instructions: z.string().default(""),
  });
  const validated = remixSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      substitutions: [],
      instructions: "Unable to generate substitution instructions right now. Please retry.",
    };
  }
  return validated.data;
}

export async function generateRecipe({ pantryNames, vegetarian }) {
  const STYLES = ["North Indian curry", "South Indian style", "Indo-Chinese fusion", "Indian street food", "homestyle comfort food", "quick stir-fry", "spicy and tangy", "rich and creamy", "light and healthy"];
  const randomStyle = STYLES[Math.floor(Math.random() * STYLES.length)];
  const model = getClient().getGenerativeModel({ model: GEMINI_MODEL, generationConfig: { temperature: 0.9 } });
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
  "instructions": "short cooking steps",
  "imageSearchTerm": "a descriptive 2-3 word search term for the dish"
}
ONLY JSON, no markdown.`;
  const result = await model.generateContent(prompt);
  const parsed = safeParseJSON(result.response.text().trim());
  const recipeSchema = z.object({
    title: z.string().min(1),
    readyInMinutes: z.number().int().positive().default(30),
    servings: z.number().int().positive().default(2),
    usedIngredients: z.array(z.string()).default([]),
    missedIngredients: z.array(z.string()).default([]),
    nutrition: z.object({
      calories: z.number().nonnegative().default(0),
      protein: z.number().nonnegative().default(0),
      carbs: z.number().nonnegative().default(0),
      fat: z.number().nonnegative().default(0),
      fiber: z.number().nonnegative().default(0),
    }).default({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }),
    instructions: z.string().default(""),
    imageSearchTerm: z.string().default("Indian food"),
  });
  const validated = recipeSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      title: "Quick Pantry Stir Fry",
      readyInMinutes: 20,
      servings: 2,
      usedIngredients: pantryNames.slice(0, 4),
      missedIngredients: [],
      nutrition: { calories: 320, protein: 12, carbs: 36, fat: 10, fiber: 6 },
      instructions: "AI recipe output was invalid. Please try generating again.",
    };
  }
  return validated.data;
}

function stripCodeFence(s) {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

function safeParseJSON(text) {
  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
}
