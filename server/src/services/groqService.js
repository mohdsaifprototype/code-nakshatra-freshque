import Groq from "groq-sdk";

let client;
function getClient() {
	if (!process.env.GROQ_API_KEY)
		throw new Error("GROQ_API_KEY is not configured");
	if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
	return client;
}

const RECEIPT_PROMPT = `You are an expert grocery receipt parser.
From this receipt text, extract every food/grocery line item.
For each item, return:
- name: cleaned product name
- quantity: numeric quantity
- unit: one of kg, g, L, ml, pcs, pack, dozen
- pricePerUnit: price per single unit
- category: one of dairy, produce, grains, protein, spices, bakery, snacks, beverages, other
Return ONLY valid JSON: { "items": [ ... ] }`;

function stripCodeFence(s) {
	return s
		.replace(/^```(?:json)?/i, "")
		.replace(/```$/, "")
		.trim();
}

function safeParseJSON(text, fallback) {
	try {
		return JSON.parse(stripCodeFence(text));
	} catch {
		const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
		if (m) {
			try {
				return JSON.parse(m[1]);
			} catch {
				/* noop */
			}
		}
		return fallback;
	}
}

const REMIX_FALLBACK = {
	substitutions: [
		{
			missing: "ingredient",
			use: "pantry alternative",
			note: "Groq had trouble parsing the response.",
		},
	],
	instructions: "Please try again.",
};

const GENERATE_FALLBACK = {
	title: "Quick Pantry Surprise",
	readyInMinutes: 25,
	servings: 2,
	usedIngredients: ["Pantry staples"],
	missedIngredients: [],
	nutrition: { calories: 350, protein: 12, carbs: 40, fat: 10, fiber: 5 },
	instructions: "Failed to generate a real recipe. Please try again.",
};

export async function extractItemsFromReceipt({ buffer, mimeType }) {
	const model = process.env.GROQ_VISION_MODEL || "llama-3.2-11b-vision-preview";
	const base64Image = buffer.toString("base64");

	const response = await getClient().chat.completions.create({
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: RECEIPT_PROMPT },
					{
						type: "image_url",
						image_url: { url: `data:${mimeType};base64,${base64Image}` },
					},
				],
			},
		],
		model,
		response_format: { type: "json_object" },
	});

	const parsed = safeParseJSON(response.choices[0].message.content, { items: [] });
	return Array.isArray(parsed.items) ? parsed.items : [];
}

export async function remixRecipe({
	pantryNames,
	recipeId,
	title,
	vegetarian,
}) {
	const model = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
	const prompt = `You are a creative Indian home cook. Pantry: ${pantryNames.join(", ")}.
Target recipe: ${title || `Spoonacular id ${recipeId}`}. ${vegetarian ? "Output must be strictly vegetarian." : ""}
For each ingredient the user is missing, suggest a substitution using ONLY items already in their pantry.
Return JSON: { "substitutions": [{ "missing": "...", "use": "...", "note": "..." }], "instructions": "short cooking steps" }`;

	const response = await getClient().chat.completions.create({
		messages: [{ role: "user", content: prompt }],
		model,
		response_format: { type: "json_object" },
	});

	return safeParseJSON(response.choices[0].message.content, REMIX_FALLBACK);
}

export async function generateRecipe({ pantryNames, vegetarian }) {
	const STYLES = [
		"North Indian curry",
		"South Indian style",
		"Indo-Chinese fusion",
		"Indian street food",
		"homestyle comfort food",
		"quick stir-fry",
		"spicy and tangy",
		"rich and creamy",
		"light and healthy",
	];
	const randomStyle = STYLES[Math.floor(Math.random() * STYLES.length)];
	const model = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";

	const prompt = `You are a creative Indian home cook. Pantry: ${pantryNames.length > 0 ? pantryNames.join(", ") : "basic Indian pantry staples"}.
Invent a brand new, highly creative, and UNIQUE delicious recipe using primarily items currently in the pantry.
Make the dish in this style: ${randomStyle}. ${vegetarian ? "Output must be strictly vegetarian." : ""}
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
ONLY JSON.`;

	const response = await getClient().chat.completions.create({
		messages: [{ role: "user", content: prompt }],
		model,
		response_format: { type: "json_object" },
	});

	const parsed = safeParseJSON(response.choices[0].message.content, GENERATE_FALLBACK);
	// Ensure required fields for frontend
	if (!parsed.title) parsed.title = GENERATE_FALLBACK.title;
	if (!parsed.usedIngredients) parsed.usedIngredients = [];
	if (!parsed.nutrition) parsed.nutrition = GENERATE_FALLBACK.nutrition;
	
	return parsed;
}
